import React from 'react';
import {
  Card,
  StatCard,
  Modal,
  Switch,
  IconButton,
  LineChart,
  Button,
  Badge,
  ProgressBar,
  Checkbox,
  Icon,
  DonutChart,
  BarChart,
  MetricBarList,
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import { CONTEXTOS, ROTULO_CONTEXTO, type Contexto } from '../dados/esquema';
import {
  tarefasDoDia,
  resumoTarefas,
  semanaDeTarefas,
  concluidasPorDia,
} from '../dominio/tarefa';
import { resumoProjetos, projetosQuePedemAtencao } from '../dominio/projeto';
import {
  BLOCOS_DO_INICIO,
  blocoPorId,
  blocosVisiveis,
  alternarBloco,
  moverBloco,
  ordemDeFabrica,
} from '../dominio/preferencias';
import { LinhaTarefa } from './Tarefas';
import {
  agendaDoDia,
  progressoDoDia,
  sequencia,
  somarDias,
  descreverRotina,
  diaDaSemana,
} from '../dominio/rotina';
import {
  inicioDaSemana,
  semanaDe,
  agendaDeIntervalo,
  resumirDia,
  anoMesDe,
  CABECALHO_SEMANA,
} from '../dominio/calendario';
import { ocorrenciasDoMes, resumoFinanceiro, evolucaoMensal } from '../dominio/financeiro';
import { precisaDeVoce, saudacao, comoEstaODia, type ItemDoFoco } from '../dominio/foco';
import { montarODia, resumirPlano, duracao, JORNADA_PADRAO } from '../dominio/plano';
import { oQueAsRegrasQuerem } from '../dominio/regra';
import { useAgendaExterna } from '../dados/agendaExterna';
import { itensDoDia } from '../dominio/calendario';
import { metasEmCurso, resumoDeMetas, emDinheiro } from '../dominio/meta';
import {
  formatarDataLonga,
  formatarDiaDaSemana,
  formatarPorcento,
  formatarNumero,
  formatarMoeda,
  formatarMoedaCompacta,
} from '../formato';
import { Link } from 'react-router-dom';
import { useLarguraDesktop } from '../casca/useLarguraDesktop';
import { GRADE_DE_TILES, TRILHO_DE_TILES, ITEM_TRILHO } from '../casca/trilho';

/**
 * Início — a parte central.
 *
 * O dia de hoje em uma tela: quanto já foi cumprido, o que falta, como as duas
 * últimas semanas se comportaram, e como pessoal e profissional se dividem.
 *
 * Só usa componentes da biblioteca. Nenhum valor de cor, fonte, espaçamento ou
 * raio escrito à mão.
 */
/**
 * O dia do mês sob cada ponto, alternado.
 *
 * Catorze números seguidos num cartão de meia largura se encostam; um sim, um
 * não, a linha do eixo continua legível e ainda dá para se localizar no tempo.
 */
function rotulosDaQuinzena(dias: string[]): string[] {
  return dias.map((dia, i) => (i % 2 === dias.length % 2 ? String(Number(dia.slice(8))) : ''));
}

const MESES_CURTOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** Três marcas no eixo, compactas: o valor inteiro encosta na borda. */
function ticksDeDinheiro(pontos: { entradas: number; saidas: number }[]): string[] {
  const teto = Math.max(...pontos.flatMap((p) => [p.entradas, p.saidas]), 100);
  return [
    formatarMoedaCompacta(teto),
    formatarMoedaCompacta(Math.round(teto / 2)),
    formatarMoedaCompacta(0),
  ];
}

function Legenda({ cor, texto, tracejada }: { cor: string; texto: string; tracejada?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
      <span
        style={{
          width: 14,
          height: 3,
          borderRadius: 'var(--r-pill)',
          // A tracejada precisa se distinguir da cheia na própria legenda, ou
          // duas entradas da mesma cor viram a mesma coisa escrita duas vezes.
          background: tracejada ? undefined : cor,
          backgroundImage: tracejada
            ? `repeating-linear-gradient(to right, ${cor} 0 4px, transparent 4px 7px)`
            : undefined,
          opacity: tracejada ? 0.8 : 1,
        }}
      />
      <span style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>{texto}</span>
    </span>
  );
}

/**
 * "média 62% · +8 pontos sobre as duas semanas anteriores".
 *
 * Em pontos percentuais, e não em "+13%": subir de 50% para 58% não é um
 * aumento de 8%, e chamar assim é o erro que faz o número mentir para o lado
 * bom. Sem quinzena anterior nenhuma, não há comparação para fazer.
 */
function compararQuinzenas(agora: number[], antes: number[]): string {
  const media = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((t, x) => t + x, 0) / xs.length);
  const a = Math.round(media(agora));
  const b = Math.round(media(antes));
  const base = `média ${a}%`;

  // Quinzena anterior toda zerada quase sempre quer dizer "eu ainda não usava
  // o sistema", e comparar com isso daria um "+62 pontos" que não é mérito.
  if (antes.every((x) => x === 0)) return base;

  const diferenca = a - b;
  if (diferenca === 0) return `${base} · igual às duas semanas anteriores`;
  const sinal = diferenca > 0 ? '+' : '−';
  return `${base} · ${sinal}${Math.abs(diferenca)} ${
    Math.abs(diferenca) === 1 ? 'ponto' : 'pontos'
  } sobre as duas semanas anteriores`;
}


export function Inicio() {
  const { banco, hoje, alternarExecucao, alternarTarefa, definirPreferencias } = useBanco();
  const [personalizando, setPersonalizando] = React.useState(false);
  // A mesma decisão que a casca toma, pela mesma fonte: onde a casca serve o
  // telefone, o conteúdo é de uma coluna só. Duas colunas em 393px espremiam
  // a data a uma palavra por linha e faziam o Badge cavalgar o título.
  const desktop = useLarguraDesktop() !== false;

  const itens = agendaDoDia(banco, hoje);
  const feitas = itens.filter((i) => i.feita).length;
  const progresso = progressoDoDia(banco, hoje);
  const pendentes = itens.filter((i) => !i.feita);

  // Quatorze dias, do mais antigo para o mais novo, como o gráfico lê.
  const quinzena = Array.from({ length: 14 }, (_, i) => somarDias(hoje, i - 13));
  const serie = quinzena.map((d) => Math.round(progressoDoDia(banco, d) * 100));
  // Os catorze dias antes destes, para a linha tracejada de comparação.
  const serieAnterior = Array.from({ length: 14 }, (_, i) =>
    Math.round(progressoDoDia(banco, somarDias(hoje, i - 27)) * 100),
  );

  const tarefas = tarefasDoDia(banco, hoje);
  const resumo = resumoTarefas(banco, hoje);
  const projetos = resumoProjetos(banco, hoje);

  // A semana: os sete dias a partir do domingo desta semana.
  const diasDaSemana = semanaDe(hoje);
  const agendaDaSemana = agendaDeIntervalo(banco, diasDaSemana[0], diasDaSemana[6]);
  const tarefasDaSemana = semanaDeTarefas(banco, inicioDaSemana(hoje));
  const concluidas = concluidasPorDia(banco, hoje, 14);
  const atencao = projetosQuePedemAtencao(banco, hoje);

  const [anoAtual, mesAtual] = anoMesDe(hoje);
  const doMes = ocorrenciasDoMes(banco, anoAtual, mesAtual).map((o) => ({
    ...o.lancamento,
    data: o.data,
  }));
  const dinheiro = resumoFinanceiro(doMes, hoje);
  const evolucao = evolucaoMensal(banco, anoAtual, mesAtual, 6);

  const fila = precisaDeVoce(banco, hoje);
  const regrasQuerem = oQueAsRegrasQuerem(banco, hoje);

  // O dia montado: o que tem hora vira compromisso, o resto vai para a fila.
  // A agenda externa entra junto — um plano que ignora a reunião do Google
  // encaixaria trabalho em cima dela.
  const externa = useAgendaExterna(hoje, hoje);
  const doDia = itensDoDia(banco, hoje);
  const compromissos = [
    ...(externa.agenda?.eventos ?? [])
      .filter((e) => e.hora)
      .map((e) => ({ chave: e.chave, titulo: e.titulo, inicio: e.hora!, fim: e.fim })),
    ...doDia.rotinas
      .filter(({ rotina, feita }) => rotina.hora && !feita)
      .map(({ rotina }) => ({ chave: `rotina:${rotina.id}`, titulo: rotina.titulo, inicio: rotina.hora! })),
    ...doDia.tarefas
      .filter((t) => t.hora && !t.concluidaEm)
      .map((t) => ({ chave: `tarefa:${t.id}`, titulo: t.titulo, inicio: t.hora! })),
  ];
  const semHora = fila
    .filter((i) => !i.hora && i.marcavel)
    .map((i) => ({ chave: i.chave, titulo: i.titulo }));
  const agoraNoRelogio = `${String(new Date().getHours()).padStart(2, '0')}:${String(
    new Date().getMinutes(),
  ).padStart(2, '0')}`;
  const plano = montarODia(
    compromissos,
    semHora,
    banco.preferencias?.jornada ?? JORNADA_PADRAO,
    agoraNoRelogio,
  );
  const metas = metasEmCurso(banco, hoje);
  const resumoMetas = resumoDeMetas(metas);

  const melhorSequencia = banco.rotinas
    .filter((r) => !r.arquivada)
    .reduce((maior, r) => Math.max(maior, sequencia(banco, r, hoje)), 0);

  // Rotinas e tarefas juntas: o donut diz como o dia se divide entre pessoal e
  // profissional, e um dia com tarefa e sem rotina não pode aparecer vazio.
  const porContexto = CONTEXTOS.map((c: Contexto) => {
    const rotinasDoContexto = itens.filter((i) => i.rotina.contexto === c);
    const tarefasDoContexto = tarefas.filter((t) => t.contexto === c);
    return {
      contexto: c,
      total: rotinasDoContexto.length + tarefasDoContexto.length,
      feitas: rotinasDoContexto.filter((i) => i.feita).length,
    };
  });

  const temRotina = banco.rotinas.some((r) => !r.arquivada);
  const temTarefa = banco.tarefas.length > 0;
  const temProjeto = banco.projetos.length > 0;

  /*
   * "Nada cadastrado ainda" tem que ser verdade.
   *
   * A checagem olhava só rotina, tarefa e projeto, e ficou para trás quando o
   * sistema ganhou metas, lançamentos e peças: quem só escrevesse abriria o
   * Início vendo que não havia nada, com o seu texto guardado do lado. Percebi
   * por um teste de ponta a ponta que criou só uma peça.
   */
  const bancoVazioDeVerdade =
    !temRotina &&
    !temTarefa &&
    !temProjeto &&
    banco.metas.length === 0 &&
    banco.lancamentos.length === 0 &&
    banco.pecas.length === 0;

  if (bancoVazioDeVerdade) {
    return <PrimeiroUso />;
  }

  const visiveis = blocosVisiveis(banco.preferencias);

  // Cada bloco é uma entrada nomeada: a ordem e o que aparece vêm da
  // preferência, e não da posição em que o JSX foi escrito.
  const blocos: Record<string, React.ReactNode> = {
    indicadores: (
      <>
      {/*
        Indicadores do dia.

        Um trilho, não uma grade. Cada tile pede --grid-min e cresce para
        preencher: no desktop os quatro cabem lado a lado e nada rola; no
        telefone eles transbordam e viram o trilho com snap que o DESIGN.md
        prescreve, em vez de empilharem e empurrarem o "Hoje" para fora da
        primeira tela. Sem media query e sem JavaScript — o próprio flex
        decide.
      */}
      <div style={desktop ? GRADE_DE_TILES : TRILHO_DE_TILES}>
        <StatCard
          glow
          style={ITEM_TRILHO}
          icon="circle-check"
          value={`${feitas}/${itens.length}`}
          label="Rotinas cumpridas hoje"
        />
        <StatCard
          style={ITEM_TRILHO}
          icon="trending-up"
          value={formatarPorcento(progresso)}
          label="Do dia concluído"
          delta={progresso === 1 ? 'completo' : undefined}
        />
        <StatCard
          style={ITEM_TRILHO}
          icon="flame"
          value={formatarNumero(melhorSequencia)}
          label="Maior sequência em dias"
        />
        <StatCard
          style={ITEM_TRILHO}
          icon="clipboard-check"
          value={formatarNumero(resumo.pendentes)}
          label="Tarefas pendentes"
          delta={
            resumo.atrasadas > 0
              ? `${resumo.atrasadas} atrasada${resumo.atrasadas > 1 ? 's' : ''}`
              : undefined
          }
          deltaTone="delay"
        />
        <StatCard
          style={ITEM_TRILHO}
          icon="layers"
          value={formatarNumero(projetos.ativos)}
          label={projetos.ativos === 1 ? 'Projeto ativo' : 'Projetos ativos'}
          delta={
            projetos.atrasados > 0
              ? `${projetos.atrasados} atrasado${projetos.atrasados > 1 ? 's' : ''}`
              : undefined
          }
          deltaTone="delay"
        />
        {banco.lancamentos.length > 0 && (
          <StatCard
            style={ITEM_TRILHO}
            icon="wallet"
            value={formatarMoeda(dinheiro.saldoRealizado)}
            label="Saldo do mês até hoje"
            delta={
              dinheiro.saldoPrevisto !== dinheiro.saldoRealizado
                ? `${formatarMoeda(dinheiro.saldoPrevisto)} previsto`
                : undefined
            }
            deltaTone={dinheiro.saldoPrevisto < 0 ? 'danger' : 'delivered'}
          />
        )}
      </div>

      </>
    ),
    foco: (
      <>
      {/* A fila única: tudo que cobra, na ordem em que cobra.
          É a diferença entre painel e instrução — seis cartões, cada um com a
          sua lista, me fazem decidir de novo toda manhã. */}
      <Card
        title="Precisa de você hoje"
        subtitle={
          fila.length === 0
            ? 'Nada pendente'
            : 'Na ordem em que cobra · o atrasado primeiro, depois o que tem hora'
        }
        action={
          <Link to="/app/rotina" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm" iconRight="arrow-right">
              Ver rotinas
            </Button>
          </Link>
        }
      >
        {/* A barra do dia mora aqui desde que a fila engoliu o cartão "Hoje":
            ela era a única coisa daquele cartão que esta lista não dizia. */}
        {itens.length > 0 && (
          <ProgressBar
            value={Math.round(progresso * 100)}
            valueLabel={`${feitas}/${itens.length}`}
            tone={progresso === 1 ? 'green' : 'purple'}
            label="Rotinas do dia"
            style={{ marginBottom: 'var(--sp-9)' }}
          />
        )}

        {fila.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--sp-5)',
              padding: 'var(--sp-12) 0',
              textAlign: 'center',
            }}
          >
            <span style={{ color: 'var(--green-500)' }}>
              <Icon name="circle-check" size={28} />
            </span>
            <span style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>
              Nada atrasado, nada vencendo, nada marcado. O dia está seu.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {fila.map((item) => (
              <LinhaDoFoco
                key={item.chave}
                item={item}
                aoMarcar={(i) =>
                  i.tipo === 'rotina' ? alternarExecucao(i.id, hoje) : alternarTarefa(i.id)
                }
              />
            ))}
          </div>
        )}
      </Card>
      </>
    ),
    plano: (
      <>
      {/* O dia montado.
          É uma **proposta**, e nada aqui é gravado: um horário sugerido que
          virasse dado seria compromisso onde havia palpite. */}
      <Card
        style={{ height: '100%' }}
        title="O dia montado"
        subtitle={resumirPlano(plano)}
        action={
          <Link to="/app/calendario" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm" iconRight="arrow-right">
              Ver o dia
            </Button>
          </Link>
        }
      >
        {plano.blocos.length === 0 ? (
          <p
            style={{
              padding: 'var(--sp-12) 0',
              textAlign: 'center',
              font: 'var(--type-body)',
              color: 'var(--text-subtle)',
            }}
          >
            Nada marcado e nada pendente. O dia é seu para preencher.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {plano.blocos.map((b) => (
              <LinhaDoPlano key={b.chave} bloco={b} />
            ))}
          </div>
        )}

        {plano.naoCoube.length > 0 && (
          <p
            style={{
              marginTop: 'var(--sp-8)',
              font: 'var(--type-body)',
              color: 'var(--text-subtle)',
              lineHeight: 'var(--lh-normal)',
            }}
          >
            Não coube hoje: {plano.naoCoube.map((i) => i.titulo).join(', ')}.
          </p>
        )}
      </Card>
      </>
    ),
    metas: (
      <>
      <Card
        style={{ height: '100%' }}
        title="Metas em curso"
        subtitle={
          resumoMetas.total === 0
            ? 'Nenhuma meta ainda'
            : `${resumoMetas.noAlvo} de ${resumoMetas.total} no alvo`
        }
        action={
          <Link to="/app/metas" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm" iconRight="arrow-right">
              Ver metas
            </Button>
          </Link>
        }
      >
        {resumoMetas.total === 0 ? (
          <p
            style={{
              padding: 'var(--sp-12) 0',
              textAlign: 'center',
              font: 'var(--type-body)',
              color: 'var(--text-subtle)',
            }}
          >
            Uma meta é um alvo com prazo. Três das quatro fontes contam sozinhas o que você
            já registra.
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--sp-10)',
            }}
          >
            <DonutChart
              size={150}
              thickness={24}
              centerValue={`${resumoMetas.noAlvo}`}
              centerLabel={`de ${resumoMetas.total}`}
              segments={[
                { value: Math.max(resumoMetas.noAlvo, 0.0001), color: 'var(--chart-2)' },
                {
                  value: Math.max(resumoMetas.total - resumoMetas.noAlvo, 0.0001),
                  color: 'var(--chart-3)',
                },
              ]}
            />
            {/* Só as que cabem: `metasEmCurso` já traz as que pedem atenção na
                frente, então cortar o fim corta o que menos importa. */}
            <MetricBarList
              style={{ width: '100%' }}
              items={metas.slice(0, 5).map((m) => ({
                label: m.meta.titulo,
                value: Math.round(m.fracao * 100),
                valueLabel: emDinheiro(m.meta)
                  ? `${formatarMoedaCompacta(m.feito)}/${formatarMoedaCompacta(m.alvo)}`
                  : `${m.feito}/${m.alvo}`,
                tone: m.estourou || m.atrasada ? 'orange' : m.noAlvo ? 'green' : 'purple',
              }))}
            />
          </div>
        )}
      </Card>
      </>
    ),
    hoje: (
      <>
      {/* O que falta hoje */}
      <Card
        style={{ height: '100%' }}
        title="Hoje"
        subtitle={`${formatarDiaDaSemana(new Date())}, ${formatarDataLonga(new Date())}`}
        action={
          <Link to="/app/rotina" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm" iconRight="arrow-right">
              Ver rotinas
            </Button>
          </Link>
        }
      >
        <ProgressBar
          value={Math.round(progresso * 100)}
          valueLabel={formatarPorcento(progresso)}
          tone={progresso === 1 ? 'green' : 'purple'}
          style={{ marginBottom: 'var(--sp-9)' }}
        />

        {pendentes.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--sp-5)',
              padding: 'var(--sp-12) 0',
              textAlign: 'center',
            }}
          >
            <span style={{ color: 'var(--green-500)' }}>
              <Icon name="circle-check" size={28} />
            </span>
            <span
              style={{
                font: 'var(--fw-medium) var(--fs-lg)/1.3 var(--font-core)',
                color: 'var(--text-heading)',
              }}
            >
              Dia cumprido
            </span>
            <span style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>
              Nada pendente para hoje.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {pendentes.map(({ rotina }) => (
              <LinhaRotina
                key={rotina.id}
                titulo={rotina.titulo}
                icone={rotina.icone}
                detalhe={descreverRotina(rotina)}
                contexto={rotina.contexto}
                feita={false}
                aoAlternar={() => alternarExecucao(rotina.id, hoje)}
              />
            ))}
          </div>
        )}

        {feitas > 0 && (
          <details style={{ marginTop: 'var(--sp-9)' }}>
            <summary
              style={{
                font: 'var(--type-body)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {feitas} já {feitas === 1 ? 'cumprida' : 'cumpridas'}
            </summary>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--sp-2)',
                marginTop: 'var(--sp-5)',
              }}
            >
              {itens
                .filter((i) => i.feita)
                .map(({ rotina }) => (
                  <LinhaRotina
                    key={rotina.id}
                    titulo={rotina.titulo}
                    icone={rotina.icone}
                    detalhe={descreverRotina(rotina)}
                    contexto={rotina.contexto}
                    feita
                    aoAlternar={() => alternarExecucao(rotina.id, hoje)}
                  />
                ))}
            </div>
          </details>
        )}
      </Card>
      </>
    ),
    vencendo: (
      <>
      {/* O que vence — atrasado e de hoje, nada além disso */}
      {tarefas.length > 0 && (
        <Card
          style={{ height: '100%' }}
          title="Vencendo"
          subtitle={`${tarefas.length} ${tarefas.length === 1 ? 'tarefa' : 'tarefas'}`}
          action={
            <Link to="/app/tarefas" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" size="sm" iconRight="arrow-right">
                Ver tarefas
              </Button>
            </Link>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {tarefas.map((t) => (
              <LinhaTarefa
                key={t.id}
                tarefa={t}
                hoje={hoje}
                aoAlternar={() => alternarTarefa(t.id)}
              />
            ))}
          </div>
        </Card>
      )}

      </>
    ),
    contexto: (
      <>
      <Card
        style={{ height: '100%' }}
        title="Pessoal e profissional"
        subtitle="Rotinas e tarefas de hoje"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--sp-10)',
          }}
        >
          <DonutChart
            size={150}
            thickness={24}
            centerValue={`${feitas}/${itens.length + tarefas.length}`}
            centerLabel="hoje"
            segments={porContexto.map((p, i) => ({
              value: Math.max(p.total, 0.0001),
              color: i === 0 ? 'var(--chart-1)' : 'var(--chart-2)',
            }))}
          />
          <MetricBarList
            style={{ width: '100%' }}
            items={porContexto.map((p, i) => ({
              label: ROTULO_CONTEXTO[p.contexto],
              value: p.total === 0 ? 0 : Math.round((p.feitas / p.total) * 100),
              valueLabel: `${p.feitas}/${p.total}`,
              tone: i === 0 ? 'purple' : 'green',
            }))}
          />
        </div>
      </Card>
      </>
    ),
    quinzena: (
      <>
      {/* Últimas duas semanas */}
      {/* O número fica no subtítulo, e não no balão sobre a última barra:
          no iPhone esse balão saía pela borda do cartão, medido. */}
      <Card
        style={{ height: '100%' }}
        title="Últimos 14 dias"
        subtitle={`Quanto do dia foi cumprido · ${compararQuinzenas(serie, serieAnterior)}`}
      >
        {/* Linha, e não barra: dois cartões de barras cinzas lado a lado, sem
            eixo nenhum, eram dois gráficos que não diziam nada. A linha tem
            grade, marca de eixo e a faixa do dia de hoje.

            A tracejada é a quinzena anterior. Um número sozinho não diz se
            estou melhorando — a comparação com o próprio passado diz, e é a
            coisa mais útil que a referência mostrava. */}
        <LineChart
          height={180}
          series={[
            { data: serie, color: 'var(--chart-1)' },
            { data: serieAnterior, color: 'var(--chart-1)', width: 1.5, dashed: true },
          ]}
          labels={rotulosDaQuinzena(quinzena)}
          yTicks={['100%', '50%', '0%']}
          highlightIndex={13}
        />
        <div
          style={{ display: 'flex', gap: 'var(--sp-8)', flexWrap: 'wrap', marginTop: 'var(--sp-8)' }}
        >
          <Legenda cor="var(--chart-1)" texto="Estes 14 dias" />
          <Legenda cor="var(--chart-1)" texto="Os 14 antes" tracejada />
        </div>
      </Card>
      </>
    ),
    semana: (
      <>
      {/* A semana inteira, para eu ver o que vem antes de ele chegar. */}
      <Card
        title="Esta semana"
        subtitle="Rotinas, o que vence e o que já concluí"
        action={
          <Link to="/app/calendario" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm" iconRight="arrow-right">
              Ver calendário
            </Button>
          </Link>
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: 'var(--sp-3)',
          }}
        >
          {diasDaSemana.map((dia, i) => (
            <DiaDaSemana
              key={dia}
              dia={dia}
              hoje={hoje}
              resumo={resumirDia(agendaDaSemana.get(dia)!, hoje)}
              concluidas={tarefasDaSemana[i].concluidas.length}
            />
          ))}
        </div>

        {/* Sem esta linha a coluna estreita vira charada: "1 ✓1" não se explica
            sozinho, e parar o ponteiro em cima não existe no telefone. */}
        <p
          style={{
            marginTop: 'var(--sp-6)',
            font: 'var(--type-body)',
            color: 'var(--text-subtle)',
            lineHeight: 'var(--lh-normal)',
          }}
        >
          A barra é a rotina do dia · o número é o que vence · ✓ é o que já concluí
        </p>
      </Card>

      </>
    ),
    dinheiro: (
      <>
      {/* O dinheiro no Início como gráfico, e não só como número: o tile diz
          quanto, a linha diz para onde. */}
      <Card
        style={{ height: '100%' }}
        title="Dinheiro"
        subtitle={
          banco.lancamentos.length === 0
            ? 'Nada lançado ainda'
            : `Seis meses · saldo de ${MESES_CURTOS[mesAtual - 1]}: ${formatarMoeda(dinheiro.saldoRealizado)}`
        }
        action={
          <Link to="/app/financeiro" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm" iconRight="arrow-right">
              Ver financeiro
            </Button>
          </Link>
        }
      >
        {banco.lancamentos.length === 0 ? (
          <p
            style={{
              padding: 'var(--sp-12) 0',
              textAlign: 'center',
              font: 'var(--type-body)',
              color: 'var(--text-subtle)',
            }}
          >
            Lance uma entrada ou uma saída e o mês aparece aqui.
          </p>
        ) : (
          <>
            <LineChart
              height={180}
              labels={evolucao.map((p) => MESES_CURTOS[p.mes - 1])}
              yTicks={ticksDeDinheiro(evolucao)}
              highlightIndex={evolucao.length - 1}
              series={[
                { data: evolucao.map((p) => p.entradas), color: 'var(--chart-2)' },
                { data: evolucao.map((p) => p.saidas), color: 'var(--chart-3)' },
              ]}
            />
            <div
              style={{
                display: 'flex',
                gap: 'var(--sp-8)',
                flexWrap: 'wrap',
                marginTop: 'var(--sp-8)',
              }}
            >
              <Legenda cor="var(--chart-2)" texto="Entradas" />
              <Legenda cor="var(--chart-3)" texto="Saídas" />
            </div>
          </>
        )}
      </Card>
      </>
    ),
    atencao: (
      <>
      <Card
        style={{ height: '100%' }}
        title="Projetos que pedem atenção"
        subtitle={
          atencao.length === 0
            ? temProjeto
              ? 'Nenhum, no momento'
              : 'Nenhum projeto ainda'
            : `${atencao.length} de ${projetos.ativos}`
        }
        action={
          <Link to="/app/projetos" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm" iconRight="arrow-right">
              Ver projetos
            </Button>
          </Link>
        }
      >
        {atencao.length === 0 ? (
          <p
            style={{
              padding: 'var(--sp-12) 0',
              textAlign: 'center',
              font: 'var(--type-body)',
              color: 'var(--text-subtle)',
            }}
          >
            {temProjeto
              ? 'Nada atrasado nem parado. Bom sinal.'
              : 'Um projeto agrupa tarefas que terminam juntas.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
            {atencao.map((p) => (
              <div key={p.projeto.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--sp-5)',
                    flexWrap: 'wrap',
                    marginBottom: 'var(--sp-4)',
                  }}
                >
                  <span
                    style={{
                      font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                      color: 'var(--text-heading)',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {p.projeto.titulo}
                  </span>
                  {p.atrasadas > 0 && (
                    <Badge tone="delay">
                      {p.atrasadas} {p.atrasadas === 1 ? 'atrasada' : 'atrasadas'}
                    </Badge>
                  )}
                  {p.parado && (
                    <Badge tone="delay" dot={false}>
                      Parado há {p.paradoHa} dias
                    </Badge>
                  )}
                </div>
                <ProgressBar
                  value={Math.round(p.progresso.fracao * 100)}
                  valueLabel={`${p.progresso.concluidas}/${p.progresso.total}`}
                  tone={p.situacao === 'atrasado' ? 'orange' : 'purple'}
                  label={p.proxima ? `Próxima: ${p.proxima.titulo}` : 'Sem tarefas ainda'}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
      </>
    ),
    concluidas: (
      <>
      <Card
        style={{ height: '100%' }}
        title="Tarefas concluídas"
        subtitle={`Uma barra por dia, nos últimos 14 · hoje: ${formatarNumero(
          concluidas[13].total,
        )}`}
      >
        {/* Sem rótulo, catorze barras cinzas não dizem de quando são. */}
        <BarChart
          height={180}
          data={concluidas.map((c) => c.total)}
          labels={rotulosDaQuinzena(concluidas.map((c) => c.dia))}
          highlightIndex={13}
        />
      </Card>
      </>
    ),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <Saudacao
        nome={banco.preferencias?.nome}
        recado={comoEstaODia(banco, hoje)}
        aoPersonalizar={() => setPersonalizando(true)}
      />

      {/* As regras não escrevem sozinhas — elas esperam aqui.
          Uma linha só, e só quando há o que propor: um aviso permanente
          dizendo "nada por enquanto" é ruído que se aprende a não ler. */}
      {regrasQuerem.length > 0 && (
        <Card>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-6)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: 'var(--purple-300)', display: 'flex', flex: '0 0 auto' }}>
              <Icon name="zap" size={20} />
            </span>
            <span
              style={{
                flex: '1 1 var(--grid-min)',
                minWidth: 0,
                font: 'var(--type-body)',
                color: 'var(--text-body)',
              }}
            >
              {regrasQuerem.length === 1
                ? 'Uma regra sua quer fazer algo.'
                : `${regrasQuerem.length} regras suas querem fazer algo.`}{' '}
              Nada acontece até você olhar.
            </span>
            <Link to="/app/regras" style={{ textDecoration: 'none', flex: '0 0 auto' }}>
              <Button variant="secondary" size="sm" iconRight="arrow-right">
                Ver
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {visiveis.length === 0 ? (
        <Card>
          <p
            style={{
              padding: 'var(--sp-14) var(--sp-8)',
              textAlign: 'center',
              font: 'var(--type-body)',
              color: 'var(--text-subtle)',
            }}
          >
            Você escondeu todos os blocos. Abra "Personalizar" para trazer algum de volta.
          </p>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: desktop ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)',
            gap: 'var(--card-gap)',
            // Esticado, e não alinhado ao topo: com `start`, o cartão mais
            // curto da linha deixava um buraco do tamanho da diferença.
            alignItems: 'stretch',
          }}
        >
          {visiveis.map((id) => (
            <div
              key={id}
              style={{
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                // Os blocos largos ocupam as duas colunas; os outros, uma.
                gridColumn: desktop && blocoPorId(id)?.largura === 'inteira' ? 'span 2' : 'auto',
              }}
            >
              {blocos[id]}
            </div>
          ))}
        </div>
      )}

      <Personalizar
        aberto={personalizando}
        visiveis={visiveis}
        aoFechar={() => setPersonalizando(false)}
        aoMudar={(lista) => definirPreferencias({ blocosDoInicio: lista })}
      />
    </div>
  );
}


/**
 * O cabeçalho do Início: quem, quando, e como está o dia.
 *
 * A data vem por cima em caixa alta e a saudação embaixo, grande — é o que
 * orienta antes de qualquer número. O nome é opcional de propósito: sem ele a
 * linha diz só a data, o que é verdade, em vez de um "Bom dia," pendurado.
 */
function Saudacao({
  nome,
  recado,
  aoPersonalizar,
}: {
  nome?: string;
  recado: string;
  aoPersonalizar: () => void;
}) {
  const agora = new Date();
  const limpo = nome?.trim();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 'var(--sp-8)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 var(--grid-min)' }}>
        <span
          style={{
            display: 'block',
            font: 'var(--fw-medium) var(--fs-xs)/1.2 var(--font-core)',
            color: 'var(--text-subtle)',
            letterSpacing: '.08em',
            textTransform: 'uppercase',
          }}
        >
          {formatarDiaDaSemana(agora)}, {formatarDataLonga(agora)}
        </span>
        <h2
          style={{
            font: 'var(--fw-semibold) var(--fs-heading)/1.2 var(--font-core)',
            color: 'var(--text-heading)',
            marginTop: 'var(--sp-3)',
            overflowWrap: 'anywhere',
          }}
        >
          {limpo ? `${saudacao(agora.getHours())}, ${limpo}.` : saudacao(agora.getHours())}
        </h2>
        <p
          style={{
            font: 'var(--type-page-subtitle)',
            color: 'var(--text-muted)',
            marginTop: 'var(--sp-3)',
          }}
        >
          {recado}
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        iconLeft="sliders-horizontal"
        onClick={aoPersonalizar}
      >
        Personalizar
      </Button>
    </div>
  );
}

/**
 * Uma linha do dia montado.
 *
 * O compromisso é fato e vem sólido; o trabalho é proposta e vem apagado; o
 * vago é o espaço que sobra. A diferença precisa ser visível, ou a sugestão
 * passa a parecer agenda.
 */
function LinhaDoPlano({ bloco }: { bloco: ReturnType<typeof montarODia>['blocos'][number] }) {
  const proposta = bloco.tipo !== 'compromisso';
  const vago = bloco.tipo === 'vago';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-6)',
        minHeight: 'var(--tap-min)',
        padding: 'var(--sp-3) var(--sp-5)',
        borderRadius: 'var(--r-nav)',
        background: vago ? 'transparent' : 'var(--surface-raised)',
        border: vago
          ? 'var(--bw-hairline) dashed var(--border-hairline)'
          : 'var(--bw-hairline) solid transparent',
        opacity: vago ? 0.7 : 1,
      }}
    >
      <span
        style={{
          flex: '0 0 auto',
          font: 'var(--fw-medium) var(--fs-body)/1 var(--font-mono)',
          color: proposta ? 'var(--text-subtle)' : 'var(--text-muted)',
        }}
      >
        {bloco.inicio}
      </span>

      <span
        style={{
          flex: 1,
          minWidth: 0,
          font: `${proposta ? 'var(--fw-regular)' : 'var(--fw-medium)'} var(--fs-md)/1.3 var(--font-core)`,
          color: proposta ? 'var(--text-muted)' : 'var(--text-body)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {bloco.titulo}
      </span>

      <span
        style={{
          flex: '0 0 auto',
          font: 'var(--type-body)',
          color: 'var(--text-subtle)',
        }}
      >
        {vago
          ? duracao(
              Number(bloco.fim.slice(0, 2)) * 60 +
                Number(bloco.fim.slice(3)) -
                (Number(bloco.inicio.slice(0, 2)) * 60 + Number(bloco.inicio.slice(3))),
            )
          : bloco.fim}
      </span>
    </div>
  );
}

/**
 * Uma linha da fila do foco.
 *
 * O que dá para marcar tem caixinha; o que não dá é um link para onde aquilo
 * mora. Uma caixinha que não marca nada seria pior que nenhuma.
 */
function LinhaDoFoco({
  item,
  aoMarcar,
}: {
  item: ItemDoFoco;
  aoMarcar: (item: ItemDoFoco) => void;
}) {
  const DESTINO: Record<ItemDoFoco['tipo'], string> = {
    tarefa: '/app/tarefas',
    rotina: '/app/rotina',
    lancamento: '/app/financeiro',
    meta: '/app/metas',
    projeto: '/app/projetos',
    peca: '/app/criacao',
  };

  /** O ícone do tipo, para quem não tem caixinha. */
  const ICONE: Record<ItemDoFoco['tipo'], string> = {
    tarefa: 'clipboard-check',
    rotina: 'repeat',
    lancamento: 'wallet',
    meta: 'target',
    projeto: 'layers',
    peca: 'pen-line',
  };

  const corpo = (
    <span style={{ minWidth: 0, flex: 1 }}>
      <span
        style={{
          display: 'block',
          font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
          color: 'var(--text-body)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.titulo}
      </span>
      <span
        style={{
          display: 'block',
          font: 'var(--type-body)',
          color: item.faixa < 1 ? 'var(--orange-500)' : 'var(--text-muted)',
        }}
      >
        {item.motivo}
      </span>
    </span>
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-6)',
        minHeight: 'var(--tap-min)',
        padding: 'var(--sp-4) var(--sp-5)',
        borderRadius: 'var(--r-nav)',
        background: item.faixa < 1 ? 'var(--surface-hover)' : 'transparent',
      }}
    >
      {item.marcavel ? (
        <Checkbox
          checked={false}
          onChange={() => aoMarcar(item)}
          style={{ flex: 1, minWidth: 0, alignItems: 'center' }}
          label={corpo}
        />
      ) : (
        <Link
          to={DESTINO[item.tipo]}
          style={{
            display: 'flex',
            alignItems: 'center',
            // A mesma medida que o Checkbox usa entre a caixa e o rótulo. Sem
            // isto, as linhas sem caixinha começavam 18px à esquerda das
            // outras e a coluna de títulos ficava serrilhada — visto na foto.
            gap: 'var(--sp-4)',
            flex: 1,
            minWidth: 0,
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              display: 'flex',
              flex: '0 0 auto',
              width: 18,
              justifyContent: 'center',
              color: 'var(--text-subtle)',
            }}
          >
            <Icon name={ICONE[item.tipo]} size={18} />
          </span>
          {corpo}
        </Link>
      )}

      {item.hora && (
        <Badge tone="neutral" dot={false}>
          {item.hora}
        </Badge>
      )}
    </div>
  );
}

/**
 * Um dia da semana, em coluna estreita.
 *
 * Em 393px sobram uns 50px por dia — não cabe texto. Cabe o número, uma barra
 * fina do quanto da rotina foi cumprida e as contagens. O `title` carrega a
 * leitura por extenso para quem parar o ponteiro em cima.
 */
function DiaDaSemana({
  dia,
  hoje,
  resumo,
  concluidas,
}: {
  dia: string;
  hoje: string;
  resumo: ReturnType<typeof resumirDia>;
  concluidas: number;
}) {
  const ehHoje = dia === hoje;
  const passou = dia < hoje;
  const fracao = resumo.rotinas === 0 ? 0 : resumo.rotinasFeitas / resumo.rotinas;

  const porExtenso = [
    `${resumo.rotinasFeitas} de ${resumo.rotinas} rotinas`,
    `${resumo.tarefas} ${resumo.tarefas === 1 ? 'tarefa vence' : 'tarefas vencem'}`,
    `${concluidas} ${concluidas === 1 ? 'concluída' : 'concluídas'}`,
  ].join(' · ');

  return (
    <div
      title={porExtenso}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--sp-4)',
        padding: 'var(--sp-5) var(--sp-3)',
        borderRadius: 'var(--r-nav)',
        border: `var(--bw-hairline) solid ${ehHoje ? 'var(--border-accent)' : 'transparent'}`,
        background: ehHoje ? 'var(--accent-soft)' : 'var(--surface-raised)',
        opacity: passou ? 0.72 : 1,
      }}
    >
      <span style={{ font: 'var(--type-body)', color: 'var(--text-subtle)' }}>
        {CABECALHO_SEMANA[diaDaSemana(dia)]}
      </span>
      <span
        style={{
          font: `${ehHoje ? 'var(--fw-semibold)' : 'var(--fw-regular)'} var(--fs-md)/1 var(--font-core)`,
          color: ehHoje ? 'var(--purple-200)' : 'var(--text-body)',
        }}
      >
        {Number(dia.slice(8))}
      </span>

      {/* A barra da rotina. Dia sem rotina nenhuma fica com o trilho vazio, e
          não com 100%: não houve nada a cumprir. */}
      <span
        style={{
          display: 'block',
          width: '100%',
          height: 4,
          borderRadius: 'var(--r-pill)',
          background: 'var(--surface-hover)',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            display: 'block',
            width: `${Math.round(fracao * 100)}%`,
            height: '100%',
            borderRadius: 'var(--r-pill)',
            background: fracao === 1 ? 'var(--green-500)' : 'var(--purple-400)',
          }}
        />
      </span>

      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-3)',
          font: 'var(--type-body)',
          color: 'var(--text-muted)',
          minHeight: 'var(--sp-9)',
        }}
      >
        {resumo.tarefas > 0 && (
          <span style={{ color: resumo.temAtraso ? 'var(--orange-500)' : 'var(--text-muted)' }}>
            {resumo.tarefas}
          </span>
        )}
        {concluidas > 0 && <span style={{ color: 'var(--green-500)' }}>✓{concluidas}</span>}
      </span>
    </div>
  );
}

function LinhaRotina({
  titulo,
  icone,
  detalhe,
  contexto,
  feita,
  aoAlternar,
}: {
  titulo: string;
  icone: string;
  detalhe: string;
  contexto: Contexto;
  feita: boolean;
  aoAlternar: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-6)',
        minHeight: 'var(--tap-min)',
        padding: 'var(--sp-4) var(--sp-5)',
        borderRadius: 'var(--r-nav)',
        transition: 'var(--t-hover)',
        background: feita ? 'var(--surface-hover)' : 'transparent',
      }}
    >
      {/* O título é o rótulo do Checkbox, não um irmão dele: assim clicar no
          texto alterna, e um leitor de tela anuncia a caixa com nome. */}
      <Checkbox
        checked={feita}
        onChange={aoAlternar}
        style={{ flex: 1, minWidth: 0, alignItems: 'center' }}
        label={
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-6)',
              minWidth: 0,
            }}
          >
            <span style={{ color: 'var(--text-muted)', display: 'flex', flex: '0 0 auto' }}>
              <Icon name={icone} size={18} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                  color: feita ? 'var(--text-muted)' : 'var(--text-body)',
                  textDecoration: feita ? 'line-through' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {titulo}
              </span>
              <span
                style={{
                  display: 'block',
                  font: 'var(--type-body)',
                  color: 'var(--text-muted)',
                }}
              >
                {detalhe}
              </span>
            </span>
          </span>
        }
      />
      <Badge tone={contexto === 'pessoal' ? 'ontime' : 'delivered'} dot={false}>
        {ROTULO_CONTEXTO[contexto]}
      </Badge>
    </div>
  );
}

function PrimeiroUso() {
  return (
    <Card style={{ minHeight: 320 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--sp-8)',
          minHeight: 300,
          textAlign: 'center',
          padding: 'var(--sp-9)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--surface-raised)',
            border: 'var(--bw-hairline) solid var(--border-hairline)',
            color: 'var(--purple-300)',
          }}
        >
          <Icon name="repeat" size={24} />
        </span>
        <div>
          <h3 style={{ font: 'var(--type-card-title)', color: 'var(--text-heading)' }}>
            Nada cadastrado ainda
          </h3>
          <p
            style={{
              font: 'var(--type-body)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
              maxWidth: 420,
              lineHeight: 'var(--lh-normal)',
            }}
          >
            O Início mostra o dia de hoje assim que existir uma rotina ou uma tarefa. Comece
            por uma só — a rotina que você já faz e quer parar de esquecer, ou aquela tarefa
            que está pendurada.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/app/rotina" style={{ textDecoration: 'none' }}>
            <Button variant="primary" iconRight="plus">
              Criar uma rotina
            </Button>
          </Link>
          <Link to="/app/tarefas" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" iconRight="plus">
              Criar uma tarefa
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

/**
 * Escolher quais blocos aparecem, e em que ordem.
 *
 * A escolha vive no banco, e não no navegador: restaurar o backup em outro
 * aparelho devolve o Início do jeito que eu deixei.
 */
function Personalizar({
  aberto,
  visiveis,
  aoFechar,
  aoMudar,
}: {
  aberto: boolean;
  visiveis: string[];
  aoFechar: () => void;
  aoMudar: (lista: string[]) => void;
}) {
  // Os escondidos aparecem no fim da lista, apagados: sem isso não haveria
  // como trazer de volta o que eu desliguei.
  const escondidos = BLOCOS_DO_INICIO.map((b) => b.id).filter((id) => !visiveis.includes(id));

  return (
    <Modal
      open={aberto}
      onClose={aoFechar}
      closeLabel="Fechar"
      width={560}
      header={
        <div>
          <h2
            style={{
              font: 'var(--fw-semibold) var(--fs-heading)/1.25 var(--font-core)',
              color: 'var(--text-heading)',
            }}
          >
            Personalizar o início
          </h2>
          <p
            style={{
              font: 'var(--type-page-subtitle)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
            }}
          >
            O que aparece, e em que ordem
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={() => aoMudar(ordemDeFabrica())}>
            Voltar ao padrão
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={aoFechar}>
            Pronto
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {[...visiveis, ...escondidos].map((id, i) => {
          const bloco = blocoPorId(id)!;
          const ligado = visiveis.includes(id);
          return (
            <div
              key={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-6)',
                minHeight: 'var(--tap-min)',
                padding: 'var(--sp-4) var(--sp-5)',
                borderRadius: 'var(--r-nav)',
                background: ligado ? 'transparent' : 'var(--surface-hover)',
                opacity: ligado ? 1 : 0.62,
              }}
            >
              <Switch
                checked={ligado}
                onChange={() => aoMudar(alternarBloco(visiveis, id))}
                label={
                  <span style={{ display: 'block', minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                        color: 'var(--text-body)',
                      }}
                    >
                      {bloco.rotulo}
                    </span>
                    <span style={{ display: 'block', font: 'var(--type-body)', color: 'var(--text-muted)' }}>
                      {bloco.descricao}
                    </span>
                  </span>
                }
                style={{ flex: 1, minWidth: 0 }}
              />

              {ligado && (
                <span style={{ display: 'flex', gap: 'var(--sp-3)', flex: '0 0 auto' }}>
                  <IconButton
                    icon="chevron-up"
                    label={`Subir ${bloco.rotulo}`}
                    variant="ghost"
                    size={34}
                    disabled={i === 0}
                    onClick={() => aoMudar(moverBloco(visiveis, id, -1))}
                  />
                  <IconButton
                    icon="chevron-down"
                    label={`Descer ${bloco.rotulo}`}
                    variant="ghost"
                    size={34}
                    disabled={i === visiveis.length - 1}
                    onClick={() => aoMudar(moverBloco(visiveis, id, 1))}
                  />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
