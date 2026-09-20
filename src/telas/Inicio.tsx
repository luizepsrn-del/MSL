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

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
      <span style={{ width: 10, height: 3, borderRadius: 'var(--r-pill)', background: cor }} />
      <span style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>{texto}</span>
    </span>
  );
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

  if (!temRotina && !temTarefa && !temProjeto) {
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
        subtitle={`Quanto do dia foi cumprido · hoje: ${formatarPorcento(progresso)}`}
      >
        {/* Linha, e não barra: dois cartões de barras cinzas lado a lado, sem
            eixo nenhum, eram dois gráficos que não diziam nada. A linha tem
            grade, marca de eixo e a faixa do dia de hoje. */}
        <LineChart
          height={180}
          series={[{ data: serie, color: 'var(--chart-1)' }]}
          labels={rotulosDaQuinzena(quinzena)}
          yTicks={['100%', '50%', '0%']}
          highlightIndex={13}
        />
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
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="ghost"
          size="sm"
          iconLeft="sliders-horizontal"
          onClick={() => setPersonalizando(true)}
        >
          Personalizar
        </Button>
      </div>

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
