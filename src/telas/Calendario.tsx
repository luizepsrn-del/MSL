import React from 'react';
import {
  Card,
  Button,
  Badge,
  Icon,
  IconButton,
  Checkbox,
  Select,
  Switch,
  Modal,
  OptionCard,
} from '../../design-system';
import { FormularioTarefa } from './Tarefas';
import { FormularioRotina } from './Rotinas';
import { FormularioLancamento } from './Financeiro';
import { useBanco } from '../dados/BancoContexto';
import { CONTEXTOS, ROTULO_CONTEXTO, type Contexto } from '../dados/esquema';
import {
  gradeDoMes,
  mesVizinho,
  itensDoDia,
  resumirDia,
  agendaDeIntervalo,
  semanaDe,
  nomeDaSemana,
  nomeDoMes,
  anoMesDe,
  CABECALHO_SEMANA,
  agendaEmLinha,
  filtrarDia,
  linhaDoTempo,
  type ItensDoDia,
  type FiltroCalendario,
  type ItemDaAgenda,
} from '../dominio/calendario';
import { descreverRotina, somarDias, diaDaSemana, distanciaEmDias } from '../dominio/rotina';
import { descreverPrazo, situacao } from '../dominio/tarefa';
import { efeitoDaOcorrencia } from '../dominio/financeiro';
import {
  formatarDataLonga,
  formatarDataMedia,
  formatarDataRelativa,
  formatarDiaDaSemana,
  formatarMoeda,
} from '../formato';
import { useLarguraDesktop } from '../casca/useLarguraDesktop';
import { useAgendaExterna } from '../dados/agendaExterna';
import { useGoogle } from '../dados/google';
import { eventosDoDia } from '../dominio/ical';

/**
 * Calendário — rotina e tarefa no tempo.
 *
 * Não tem dado próprio: lê a recorrência das rotinas, o prazo das tarefas e a
 * data dos lançamentos. Por isso mudar uma recorrência muda o passado e o
 * futuro na hora, sem nada para regenerar.
 */
type Visao = 'mes' | 'semana' | 'dia' | 'linha';

const ROTULO_ANTERIOR: Record<Visao, string> = {
  mes: 'Mês anterior',
  semana: 'Semana anterior',
  dia: 'Dia anterior',
  linha: 'Anterior',
};

const ROTULO_PROXIMO: Record<Visao, string> = {
  mes: 'Próximo mês',
  semana: 'Próxima semana',
  dia: 'Próximo dia',
  linha: 'Próximo',
};

/** O que dá para criar a partir de um dia do calendário. */
type OQueCriar = 'tarefa' | 'rotina' | 'lancamento';

export function Calendario() {
  const { banco, hoje, alternarExecucao, alternarTarefa, criarTarefa, criarRotina, criarLancamento } =
    useBanco();
  const desktop = useLarguraDesktop() !== false;
  /** o dia para o qual estou criando algo, e o quê; null quando não estou */
  const [criando, setCriando] = React.useState<{ dia: string; o?: OQueCriar } | null>(null);

  const [anoHoje, mesHoje] = anoMesDe(hoje);
  const [[ano, mes], setMes] = React.useState<[number, number]>([anoHoje, mesHoje]);
  const [selecionado, setSelecionado] = React.useState(hoje);
  const [visao, setVisao] = React.useState<Visao>('mes');
  const [contextoFiltrado, setContextoFiltrado] = React.useState<Contexto | 'tudo'>('tudo');
  const [esconderFeitos, setEsconderFeitos] = React.useState(false);
  // Só vale para "o que vem": a rotina diária repetida sessenta vezes afoga o
  // que é único. Nas outras visões a rotina é o assunto.
  const [rotinasNaLinha, setRotinasNaLinha] = React.useState(false);
  const rotulosVivos = banco.rotulos.filter((r) => !r.arquivado);

  const filtro: FiltroCalendario = {
    contexto: contextoFiltrado === 'tudo' ? undefined : contextoFiltrado,
    esconderFeitos,
  };

  const grade = gradeDoMes(ano, mes);
  const diasDaSemana = semanaDe(selecionado);

  // Uma apuração por janela, não uma por célula. A grade tem 42 dias, e
  // perguntar dia a dia reexpandiria a série de cada recorrente 42 vezes.
  const janela =
    visao === 'mes'
      ? [grade[0][0].dia, grade[grade.length - 1][6].dia]
      : visao === 'dia'
        ? [selecionado, selecionado]
        : [diasDaSemana[0], diasDaSemana[6]];
  const agenda = React.useMemo(
    () => agendaDeIntervalo(banco, janela[0], janela[1]),
    [banco, janela[0], janela[1]],
  );

  // A agenda do Google, na mesma janela. Ela não entra no banco: é de outro
  // sistema, e guardá-la criaria uma cópia que envelhece.
  //
  // Dois caminhos, e o com login ganha: quem conectou não deve ver os mesmos
  // compromissos duas vezes só porque a assinatura antiga continuava ligada.
  const google = useGoogle(janela[0], janela[1]);
  const assinatura = useAgendaExterna(janela[0], janela[1]);
  const eventosDe = (dia: string) =>
    google.conectado
      ? google.eventos.filter((e) => e.dia === dia)
      : assinatura.agenda
        ? eventosDoDia(assinatura.agenda, dia)
        : [];

  // O dia escolhido pode cair fora da janela enquanto eu navego; aí vale
  // perguntar direto, em vez de mostrar um dia vazio que não é vazio.
  const detalhe = filtrarDia(agenda.get(selecionado) ?? itensDoDia(banco, selecionado), filtro);
  const paraOlho = (dia: string) =>
    filtrarDia(agenda.get(dia) ?? itensDoDia(banco, dia), filtro);
  const noPresente =
    visao === 'mes'
      ? ano === anoHoje && mes === mesHoje
      : visao === 'dia'
        ? selecionado === hoje
        : diasDaSemana.includes(hoje);

  const andar = (passo: number) => {
    if (visao === 'semana' || visao === 'dia') {
      const novo = somarDias(selecionado, passo * (visao === 'dia' ? 1 : 7));
      setSelecionado(novo);
      const [a, m] = anoMesDe(novo);
      if (a !== ano || m !== mes) setMes([a, m]);
      return;
    }
    const [a, m] = mesVizinho(ano, mes, passo);
    setMes([a, m]);
  };

  const irParaHoje = () => {
    setMes([anoHoje, mesHoje]);
    setSelecionado(hoje);
  };

  const escolher = (dia: string) => {
    setSelecionado(dia);
    const [a, m] = anoMesDe(dia);
    if (a !== ano || m !== mes) setMes([a, m]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      {/* O filtro vale para todas as visões: trocar de visão não pode desfazer
          o recorte que eu acabei de escolher. */}
      <Card>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-8)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 190 }}>
            <Select
              id="cal-contexto"
              value={contextoFiltrado}
              onChange={(v) => setContextoFiltrado(v as Contexto | 'tudo')}
              options={[
                { value: 'tudo', label: 'Pessoal e profissional' },
                ...CONTEXTOS.map((c) => ({ value: c, label: ROTULO_CONTEXTO[c] })),
              ]}
            />
          </div>

          <Switch
            checked={esconderFeitos}
            onChange={setEsconderFeitos}
            label="Esconder o que já foi feito"
          />

          {visao === 'linha' && (
            <Switch
              checked={rotinasNaLinha}
              onChange={setRotinasNaLinha}
              label="Incluir as rotinas"
            />
          )}

          {(contextoFiltrado !== 'tudo' || esconderFeitos) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setContextoFiltrado('tudo');
                setEsconderFeitos(false);
              }}
            >
              Limpar filtro
            </Button>
          )}
        </div>
      </Card>

      <EstadoDaAgenda
        assinada={!!banco.preferencias?.agendaExterna?.url}
        externa={assinatura}
        google={google}
      />

      <div
        style={{
          display: 'grid',
          // Na semana as sete colunas precisam da largura inteira: espremidas
          // ao lado do painel, o título de cada item virava reticência.
          gridTemplateColumns:
            desktop && visao === 'mes' ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
          gap: 'var(--card-gap)',
          alignItems: 'start',
        }}
      >
        <Card
          title={
            visao === 'mes'
              ? nomeDoMes(ano, mes)
              : visao === 'semana'
                ? nomeDaSemana(selecionado)
                : visao === 'dia'
                  ? selecionado === hoje
                    ? 'Hoje'
                    : formatarDataLonga(comoData(selecionado))
                  : 'O que vem pela frente'
          }
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
              <div style={{ minWidth: 130 }}>
                <Select
                  id="cal-visao"
                  value={visao}
                  onChange={(v) => setVisao(v as Visao)}
                  size="sm"
                  options={[
                    { value: 'mes', label: 'Mês' },
                    { value: 'semana', label: 'Semana' },
                    { value: 'dia', label: 'Dia' },
                    { value: 'linha', label: 'O que vem' },
                  ]}
                />
              </div>
              {/* Na visão de dia o painel lateral não existe, e sem isto o
                  botão de adicionar sumiria justo onde o dia está aberto. */}
              {visao === 'dia' && (
                <Button
                  variant="primary"
                  size="sm"
                  iconRight="plus"
                  onClick={() => setCriando({ dia: selecionado })}
                >
                  Adicionar
                </Button>
              )}
              {!noPresente && visao !== 'linha' && (
                <Button variant="secondary" size="sm" onClick={irParaHoje}>
                  Hoje
                </Button>
              )}
              {/* A linha do tempo parte sempre de hoje: não há para onde andar. */}
              {visao !== 'linha' && (
                <>
                  <IconButton
                    icon="chevron-left"
                    label={ROTULO_ANTERIOR[visao]}
                    variant="ghost"
                    size={34}
                    onClick={() => andar(-1)}
                  />
                  <IconButton
                    icon="chevron-right"
                    label={ROTULO_PROXIMO[visao]}
                    variant="ghost"
                    size={34}
                    onClick={() => andar(1)}
                  />
                </>
              )}
            </div>
          }
        >
          {visao === 'linha' ? (
            <VistaLinha
              linha={linhaDoTempo(banco, hoje, 60, filtro, rotinasNaLinha)}
              hoje={hoje}
              aoEscolher={(dia) => {
                escolher(dia);
                setVisao('dia');
              }}
            />
          ) : visao === 'dia' ? (
            <VistaDia
              itens={agendaEmLinha(detalhe, eventosDe(selecionado))}
              podeMarcar={selecionado === hoje}
              aoAlternarRotina={(id) => alternarExecucao(id, selecionado)}
              aoAlternarTarefa={alternarTarefa}
            />
          ) : visao === 'semana' ? (
            <VistaSemana
              dias={diasDaSemana}
              itensDe={paraOlho}
              eventosDe={eventosDe}
              hoje={hoje}
              selecionado={selecionado}
              desktop={desktop}
              aoEscolher={escolher}
            />
          ) : (
            <>
              {/* Cabeçalho da semana */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: 'var(--sp-2)',
                  marginBottom: 'var(--sp-4)',
                }}
              >
                {CABECALHO_SEMANA.map((d, i) => (
                  <span
                    key={d}
                    style={{
                      textAlign: 'center',
                      font: 'var(--type-body)',
                      color: i === 0 || i === 6 ? 'var(--text-subtle)' : 'var(--text-muted)',
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {grade.map((semana) => (
                  <div
                    key={semana[0].dia}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                      gap: 'var(--sp-2)',
                    }}
                  >
                    {semana.map(({ dia, doMes }) => (
                      <Celula
                        key={dia}
                        dia={dia}
                        doMes={doMes}
                        hoje={hoje}
                        selecionado={dia === selecionado}
                        resumo={resumirDia(paraOlho(dia), hoje)}
                        eventos={eventosDe(dia).length}
                        aoEscolher={() => escolher(dia)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

      {/* O dia escolhido, por extenso — a visão de dia já é isto. */}
      {(visao === 'mes' || visao === 'semana') && (
        <Card
          title={selecionado === hoje ? 'Hoje' : formatarDiaDaSemana(comoData(selecionado))}
          subtitle={formatarDataLonga(comoData(selecionado))}
          action={
            <Button
              variant="primary"
              size="sm"
              iconRight="plus"
              onClick={() => setCriando({ dia: selecionado })}
            >
              Adicionar
            </Button>
          }
        >
          {eventosDe(selecionado).length === 0 &&
          detalhe.rotinas.length === 0 &&
          detalhe.tarefas.length === 0 &&
          detalhe.pecas.length === 0 &&
          detalhe.lancamentos.length === 0 ? (
            <p
              style={{
                padding: 'var(--sp-12) 0',
                textAlign: 'center',
                font: 'var(--type-body)',
                color: 'var(--text-subtle)',
              }}
            >
              Nada neste dia.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
              {eventosDe(selecionado).length > 0 && (
                <Secao titulo="Da agenda do Google">
                  {eventosDe(selecionado).map((e) => (
                    <Linha
                      key={e.chave}
                      icone="calendar"
                      titulo={e.titulo}
                      detalhe={
                        [
                          e.diaInteiro ? 'dia inteiro' : e.fim ? `${e.hora} às ${e.fim}` : e.hora,
                          e.local,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      }
                      feita={false}
                    />
                  ))}
                </Secao>
              )}

              {detalhe.rotinas.length > 0 && (
                <Secao titulo="Rotinas">
                  {detalhe.rotinas.map(({ rotina, feita }) => (
                    <Linha
                      key={rotina.id}
                      icone={rotina.icone}
                      titulo={rotina.titulo}
                      detalhe={descreverRotina(rotina)}
                      contexto={rotina.contexto}
                      feita={feita}
                      // Só dá para marcar o dia de hoje: marcar o passado ou o
                      // futuro registraria algo que não aconteceu.
                      aoAlternar={
                        selecionado === hoje
                          ? () => alternarExecucao(rotina.id, selecionado)
                          : undefined
                      }
                    />
                  ))}
                </Secao>
              )}

              {detalhe.tarefas.length > 0 && (
                <Secao titulo="Vencem neste dia">
                  {detalhe.tarefas.map((t) => (
                    <Linha
                      key={t.id}
                      icone="clipboard-check"
                      titulo={t.titulo}
                      detalhe={descreverPrazo(t, hoje)}
                      contexto={t.contexto}
                      feita={situacao(t, hoje) === 'concluida'}
                      atrasada={situacao(t, hoje) === 'atrasada'}
                      aoAlternar={() => alternarTarefa(t.id)}
                    />
                  ))}
                </Secao>
              )}

              {detalhe.pecas.length > 0 && (
                <Secao titulo="Para publicar">
                  {detalhe.pecas.map((p) => (
                    <Linha
                      key={p.id}
                      icone="pen-line"
                      titulo={p.titulo}
                      detalhe={p.publicadoEm ? 'publicado' : 'ainda não saiu'}
                      contexto={p.contexto}
                      feita={!!p.publicadoEm}
                    />
                  ))}
                </Secao>
              )}

              {detalhe.lancamentos.length > 0 && (
                <Secao titulo="Dinheiro">
                  {detalhe.lancamentos.map((o) => (
                    <Linha
                      key={`${o.lancamento.id}@${o.data}`}
                      icone={o.lancamento.tipo === 'entrada' ? 'arrow-down-left' : 'arrow-up-right'}
                      titulo={o.lancamento.descricao}
                      detalhe={
                        formatarMoeda(efeitoDaOcorrencia(o)) +
                        (o.repeticao ? ' · se repete' : '')
                      }
                      contexto={o.lancamento.contexto}
                      feita={false}
                    />
                  ))}
                </Secao>
              )}
            </div>
          )}
        </Card>
      )}
      </div>

      {/* Escolher o quê, antes de abrir o formulário.
          Três botões soltos no cabeçalho do cartão não cabiam no telefone, e
          um `Select` para uma escolha que acontece uma vez é pior que três
          cartões que dizem o que cada coisa é. */}
      <Modal
        open={criando !== null && criando.o === undefined}
        onClose={() => setCriando(null)}
        closeLabel="Fechar"
        width={480}
        header={
          <div>
            <h2
              style={{
                font: 'var(--fw-semibold) var(--fs-heading)/1.25 var(--font-core)',
                color: 'var(--text-heading)',
              }}
            >
              Adicionar
            </h2>
            <p
              style={{
                font: 'var(--type-page-subtitle)',
                color: 'var(--text-muted)',
                marginTop: 'var(--sp-3)',
              }}
            >
              {criando ? formatarDataLonga(comoData(criando.dia)) : ''}
            </p>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          <OptionCard
            icon="clipboard-check"
            title="Uma tarefa"
            description="Tem fim, e vence neste dia"
            onClick={() => setCriando((c) => (c ? { ...c, o: 'tarefa' } : c))}
          />
          <OptionCard
            icon="repeat"
            title="Uma rotina"
            description="Se repete, e passa a valer a partir deste dia"
            onClick={() => setCriando((c) => (c ? { ...c, o: 'rotina' } : c))}
          />
          <OptionCard
            icon="wallet"
            title="Um lançamento"
            description="Entrada ou saída com data neste dia"
            onClick={() => setCriando((c) => (c ? { ...c, o: 'lancamento' } : c))}
          />
        </div>
      </Modal>

      {/* Os formulários são os mesmos das telas de cada pilar, com `diaInicial`.
          Escrever um formulário de tarefa aqui seria o segundo formulário do
          mesmo registro, e eles divergem na primeira regra que só um receber. */}
      {criando?.o === 'tarefa' && (
        <FormularioTarefa
          aberto
          rotulos={rotulosVivos}
          projetos={banco.projetos.filter((p) => !p.arquivadoEm)}
          diaInicial={criando.dia}
          aoFechar={() => setCriando(null)}
          aoEnviar={async (dados) => {
            await criarTarefa(dados);
            setCriando(null);
          }}
        />
      )}

      {criando?.o === 'rotina' && (
        <FormularioRotina
          aberto
          rotulos={rotulosVivos}
          hoje={hoje}
          diaInicial={criando.dia}
          aoFechar={() => setCriando(null)}
          aoEnviar={async (dados) => {
            await criarRotina(dados);
            setCriando(null);
          }}
        />
      )}

      {criando?.o === 'lancamento' && (
        <FormularioLancamento
          aberto
          hoje={hoje}
          diaInicial={criando.dia}
          aoFechar={() => setCriando(null)}
          aoEnviar={async (dados) => {
            await criarLancamento(dados);
            setCriando(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * A barra da agenda externa.
 *
 * Só aparece quando há agenda assinada, e só diz alguma coisa quando há o que
 * dizer: erro, aviso do que o leitor ignorou, ou a hora da última busca. Uma
 * barra permanente dizendo "tudo certo" é ruído que se aprende a não ler.
 *
 * O erro não esvazia o calendário: o que já tinha sido buscado continua na
 * tela. Sem rede, é melhor mostrar os compromissos de meia hora atrás do que
 * abrir vazio.
 */
function EstadoDaAgenda({
  assinada,
  externa,
  google,
}: {
  assinada: boolean;
  externa: ReturnType<typeof useAgendaExterna>;
  google: ReturnType<typeof useGoogle>;
}) {
  // Conectado pelo login: a barra fala do Google, e a assinatura antiga não
  // aparece mais — ela deixou de ser a fonte.
  if (google.conectado) return <EstadoDoGoogle google={google} />;
  if (!assinada) return null;

  const avisos = externa.agenda?.avisos ?? [];
  const temAlgoADizer = externa.erro !== null || avisos.length > 0;

  return (
    <Card>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--sp-6)',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            color: externa.erro ? 'var(--orange-500)' : 'var(--text-muted)',
            display: 'flex',
            flex: '0 0 auto',
          }}
        >
          <Icon name={externa.erro ? 'alert-triangle' : 'calendar'} size={20} />
        </span>

        <span style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
              color: 'var(--text-heading)',
            }}
          >
            {externa.agenda?.nome ?? 'Agenda do Google'}
          </span>
          <span
            style={{
              display: 'block',
              font: 'var(--type-body)',
              color: externa.erro ? 'var(--orange-500)' : 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
              lineHeight: 'var(--lh-normal)',
            }}
          >
            {externa.erro
              ? `${externa.erro}${externa.buscadoEm ? ' Mostrando o que eu já tinha.' : ''}`
              : externa.buscando
                ? 'Buscando…'
                : externa.buscadoEm
                  ? `Buscada ${formatarDataRelativa(new Date(externa.buscadoEm))}`
                  : 'Ainda não buscada'}
          </span>

          {/* O que o leitor não entendeu, dito em vez de calado: a alternativa
              é o compromisso aparecer no dia errado sem ninguém saber por quê. */}
          {avisos.map((aviso) => (
            <span
              key={aviso}
              style={{
                display: 'block',
                font: 'var(--type-body)',
                color: 'var(--text-subtle)',
                marginTop: 'var(--sp-3)',
              }}
            >
              {aviso}
            </span>
          ))}
        </span>

        <Button
          variant={temAlgoADizer ? 'primary' : 'secondary'}
          size="sm"
          iconLeft="refresh-cw"
          disabled={externa.buscando}
          onClick={externa.atualizarAgora}
        >
          Atualizar
        </Button>
      </div>
    </Card>
  );
}

/**
 * A barra da agenda conectada por login.
 *
 * Diz o que foi escrito no Google na última rodada — criar um evento na agenda
 * de alguém sem contar é o tipo de automação que assusta.
 */
function EstadoDoGoogle({ google }: { google: ReturnType<typeof useGoogle> }) {
  const escritos = google.escritos;
  const mexeu = escritos ? escritos.criados + escritos.atualizados + escritos.apagados : 0;

  const partes: string[] = [];
  if (escritos && escritos.criados > 0) partes.push(`${escritos.criados} criado${escritos.criados > 1 ? 's' : ''}`);
  if (escritos && escritos.atualizados > 0) partes.push(`${escritos.atualizados} atualizado${escritos.atualizados > 1 ? 's' : ''}`);
  if (escritos && escritos.apagados > 0) partes.push(`${escritos.apagados} apagado${escritos.apagados > 1 ? 's' : ''}`);

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
        <span
          style={{
            color: google.erro ? 'var(--orange-500)' : 'var(--green-500)',
            display: 'flex',
            flex: '0 0 auto',
          }}
        >
          <Icon name={google.erro ? 'alert-triangle' : 'refresh-cw'} size={20} />
        </span>

        <span style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
              color: 'var(--text-heading)',
            }}
          >
            Google Agenda, nos dois sentidos
          </span>
          <span
            style={{
              display: 'block',
              font: 'var(--type-body)',
              color: google.erro ? 'var(--orange-500)' : 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
              lineHeight: 'var(--lh-normal)',
            }}
          >
            {google.erro
              ? google.erro
              : google.sincronizando
                ? 'Sincronizando…'
                : google.sincronizadoEm
                  ? `Sincronizado ${formatarDataRelativa(new Date(google.sincronizadoEm))}${
                      mexeu > 0 ? ` · ${partes.join(', ')} lá` : ''
                    }`
                  : 'Ainda não sincronizado'}
          </span>
        </span>

        <Button
          variant={google.erro ? 'primary' : 'secondary'}
          size="sm"
          iconLeft="refresh-cw"
          disabled={google.sincronizando}
          onClick={google.sincronizarAgora}
        >
          Sincronizar
        </Button>
      </div>
    </Card>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        style={{
          font: 'var(--fw-regular) var(--fs-micro)/1 var(--font-core)',
          color: 'var(--text-subtle)',
          letterSpacing: 'var(--ls-caps)',
          textTransform: 'uppercase',
          marginBottom: 'var(--sp-5)',
        }}
      >
        {titulo}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {children}
      </div>
    </div>
  );
}

function Celula({
  dia,
  doMes,
  hoje,
  selecionado,
  resumo,
  eventos,
  aoEscolher,
}: {
  dia: string;
  doMes: boolean;
  hoje: string;
  selecionado: boolean;
  resumo: ReturnType<typeof resumirDia>;
  /** quantos compromissos da agenda externa caem neste dia */
  eventos: number;
  aoEscolher: () => void;
}) {
  const ehHoje = dia === hoje;
  const numero = Number(dia.slice(8));
  const completo = resumo.rotinas > 0 && resumo.rotinasFeitas === resumo.rotinas;

  return (
    <button
      type="button"
      onClick={aoEscolher}
      aria-label={`Dia ${numero}`}
      aria-pressed={selecionado}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--sp-2)',
        minHeight: 'var(--tap-min)',
        padding: 'var(--sp-3) var(--sp-2)',
        cursor: 'pointer',
        borderRadius: 'var(--r-nav)',
        border: `var(--bw-hairline) solid ${
          selecionado ? 'var(--border-accent)' : 'transparent'
        }`,
        background: selecionado
          ? 'var(--accent-soft)'
          : ehHoje
            ? 'var(--surface-raised)'
            : 'transparent',
        opacity: doMes ? 1 : 0.35,
        transition: 'var(--t-hover)',
      }}
    >
      <span
        style={{
          font: `${ehHoje ? 'var(--fw-semibold)' : 'var(--fw-regular)'} var(--fs-md)/1 var(--font-core)`,
          color: ehHoje ? 'var(--purple-200)' : 'var(--text-body)',
        }}
      >
        {numero}
      </span>

      {/* Marcas do dia: uma por tipo, nunca um número que ninguém lê. */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 3, height: 6 }}>
        {eventos > 0 && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--chart-4)',
            }}
          />
        )}
        {resumo.rotinas > 0 && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: completo ? 'var(--green-500)' : 'var(--purple-400)',
            }}
          />
        )}
        {resumo.tarefas > 0 && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: resumo.temAtraso ? 'var(--orange-500)' : 'var(--ink-400)',
            }}
          />
        )}
        {resumo.pecas > 0 && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--chart-5)',
            }}
          />
        )}
        {resumo.lancamentos > 0 && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              // Verde quando o dia entra dinheiro, vermelho quando sai. O
              // empate fica neutro, em vez de escolher um lado à toa.
              background:
                resumo.saldo > 0
                  ? 'var(--green-500)'
                  : resumo.saldo < 0
                    ? 'var(--red-500)'
                    : 'var(--ink-400)',
            }}
          />
        )}
      </span>
    </button>
  );
}

function Linha({
  icone,
  titulo,
  detalhe,
  contexto,
  feita,
  atrasada,
  aoAlternar,
}: {
  icone: string;
  titulo: string;
  detalhe: string;
  /** ausente no evento externo: o eixo é meu, e o compromisso vem de fora */
  contexto?: 'pessoal' | 'profissional';
  feita: boolean;
  atrasada?: boolean;
  aoAlternar?: () => void;
}) {
  const corpo = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-6)', minWidth: 0 }}>
      <span style={{ color: 'var(--text-muted)', display: 'flex', flex: '0 0 auto' }}>
        <Icon name={icone} size={16} />
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
            color: atrasada ? 'var(--orange-500)' : 'var(--text-muted)',
          }}
        >
          {detalhe}
        </span>
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
        background: feita ? 'var(--surface-hover)' : 'transparent',
      }}
    >
      {aoAlternar ? (
        <Checkbox
          checked={feita}
          onChange={aoAlternar}
          style={{ flex: 1, minWidth: 0, alignItems: 'center' }}
          label={corpo}
        />
      ) : (
        <span style={{ flex: 1, minWidth: 0, paddingLeft: 'var(--sp-9)' }}>{corpo}</span>
      )}
      {contexto ? (
        <Badge tone={contexto === 'pessoal' ? 'ontime' : 'delivered'} dot={false}>
          {ROTULO_CONTEXTO[contexto]}
        </Badge>
      ) : (
        <Badge tone="neutral" dot={false}>
          Agenda
        </Badge>
      )}
    </div>
  );
}

/** `AAAA-MM-DD` → Date no meio-dia UTC, longe de qualquer virada de fuso. */
function comoData(dia: string): Date {
  return new Date(`${dia}T12:00:00Z`);
}

/**
 * A semana, dia a dia.
 *
 * O mês responde "em que dias há coisa"; a semana responde "o que é". Por isso
 * aqui aparece o título de cada item, e não uma bolinha.
 *
 * No Mac são sete colunas lado a lado. No telefone sete colunas de 50px não
 * cabem nem o nome do dia, então viram sete blocos empilhados — que é como eu
 * leio a semana no telefone de qualquer jeito.
 */
function VistaSemana({
  dias,
  itensDe,
  eventosDe,
  hoje,
  selecionado,
  desktop,
  aoEscolher,
}: {
  dias: string[];
  itensDe: (dia: string) => ItensDoDia;
  /** os compromissos da agenda externa daquele dia */
  eventosDe: (dia: string) => { chave: string; titulo: string; hora?: string }[];
  hoje: string;
  selecionado: string;
  desktop: boolean;
  aoEscolher: (dia: string) => void;
}) {
  return (
    <div
      style={
        desktop
          ? {
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 'var(--sp-4)',
              alignItems: 'stretch',
            }
          : { display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }
      }
    >
      {dias.map((dia) => {
        const itens = itensDe(dia);
        const eventos = eventosDe(dia);
        const ehHoje = dia === hoje;
        const escolhido = dia === selecionado;
        const vazio =
          eventos.length === 0 &&
          itens.rotinas.length === 0 &&
          itens.tarefas.length === 0 &&
          itens.lancamentos.length === 0 &&
          itens.pecas.length === 0;

        return (
          <button
            key={dia}
            type="button"
            onClick={() => aoEscolher(dia)}
            aria-pressed={escolhido}
            aria-label={`${CABECALHO_SEMANA[diaDaSemana(dia)]}, dia ${Number(dia.slice(8))}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-4)',
              minHeight: desktop ? 160 : 'var(--tap-min)',
              padding: 'var(--sp-5)',
              textAlign: 'left',
              cursor: 'pointer',
              borderRadius: 'var(--r-nav)',
              border: `var(--bw-hairline) solid ${
                escolhido ? 'var(--border-accent)' : 'var(--border-hairline)'
              }`,
              background: escolhido
                ? 'var(--accent-soft)'
                : ehHoje
                  ? 'var(--surface-raised)'
                  : 'transparent',
              transition: 'var(--t-hover)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-4)' }}>
              <span
                style={{
                  font: 'var(--type-body)',
                  color: 'var(--text-subtle)',
                }}
              >
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
            </span>

            {vazio ? (
              <span style={{ font: 'var(--type-body)', color: 'var(--text-subtle)' }}>—</span>
            ) : (
              <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {/* O compromisso vem primeiro: é o único que tem outra pessoa
                    do outro lado esperando. */}
                {eventos.map((e) => (
                  <ItemDaSemana
                    key={e.chave}
                    texto={e.hora ? `${e.hora} ${e.titulo}` : e.titulo}
                    cor="var(--chart-4)"
                  />
                ))}
                {itens.rotinas.map(({ rotina, feita }) => (
                  <ItemDaSemana
                    key={rotina.id}
                    texto={rotina.titulo}
                    cor={feita ? 'var(--green-500)' : 'var(--purple-400)'}
                    riscado={feita}
                  />
                ))}
                {itens.tarefas.map((t) => (
                  <ItemDaSemana
                    key={t.id}
                    texto={t.titulo}
                    cor={
                      situacao(t, hoje) === 'atrasada'
                        ? 'var(--orange-500)'
                        : 'var(--ink-400)'
                    }
                    riscado={!!t.concluidaEm}
                  />
                ))}
                {itens.pecas.map((p) => (
                  <ItemDaSemana
                    key={p.id}
                    texto={p.titulo}
                    cor="var(--chart-5)"
                    riscado={!!p.publicadoEm}
                  />
                ))}
                {itens.lancamentos.map((o) => (
                  <ItemDaSemana
                    key={`${o.lancamento.id}@${o.data}`}
                    texto={formatarMoeda(efeitoDaOcorrencia(o))}
                    cor={o.lancamento.tipo === 'entrada' ? 'var(--green-500)' : 'var(--red-500)'}
                  />
                ))}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ItemDaSemana({
  texto,
  cor,
  riscado,
}: {
  texto: string;
  cor: string;
  riscado?: boolean;
}) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', minWidth: 0 }}>
      <span
        style={{
          width: 5,
          height: 5,
          flex: '0 0 auto',
          borderRadius: '50%',
          background: cor,
        }}
      />
      <span
        style={{
          font: 'var(--type-body)',
          color: riscado ? 'var(--text-subtle)' : 'var(--text-muted)',
          textDecoration: riscado ? 'line-through' : 'none',
          // Quebra, não corta: "Ler 2…" não diz nada, e a coluna tem altura de
          // sobra para uma segunda linha.
          overflowWrap: 'anywhere',
          minWidth: 0,
        }}
      >
        {texto}
      </span>
    </span>
  );
}

/* ── O dia, hora a hora ──────────────────────────────────────────────────── */

const ICONE_DO_TIPO: Record<ItemDaAgenda['tipo'], string> = {
  evento: 'calendar',
  rotina: 'repeat',
  peca: 'pen-line',
  tarefa: 'clipboard-check',
  lancamento: 'wallet',
};

/**
 * O dia como ele acontece: uma linha só, na ordem do relógio.
 *
 * A hora fica numa coluna à esquerda, alinhada. O que não tem hora marcada vai
 * para o fim com o rótulo dizendo isso — em vez de receber uma hora inventada
 * só para caber na linha.
 */
function VistaDia({
  itens,
  podeMarcar,
  aoAlternarRotina,
  aoAlternarTarefa,
}: {
  itens: ItemDaAgenda[];
  /** só o dia de hoje pode ser marcado: o passado não muda */
  podeMarcar: boolean;
  aoAlternarRotina: (id: string) => void;
  aoAlternarTarefa: (id: string) => void;
}) {
  if (itens.length === 0) {
    return (
      <p
        style={{
          padding: 'var(--sp-14) 0',
          textAlign: 'center',
          font: 'var(--type-body)',
          color: 'var(--text-subtle)',
        }}
      >
        Nada neste dia.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {itens.map((item, i) => {
        const primeiroSemHora = !item.hora && (i === 0 || !!itens[i - 1].hora);
        return (
          <React.Fragment key={item.chave}>
            {primeiroSemHora && (
              <p
                style={{
                  font: 'var(--fw-regular) var(--fs-micro)/1 var(--font-core)',
                  color: 'var(--text-subtle)',
                  letterSpacing: 'var(--ls-caps)',
                  textTransform: 'uppercase',
                  margin: 'var(--sp-6) 0 var(--sp-3)',
                }}
              >
                A qualquer hora
              </p>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-6)',
                minHeight: 'var(--tap-min)',
                padding: 'var(--sp-4) var(--sp-5)',
                borderRadius: 'var(--r-nav)',
                background: item.feito ? 'var(--surface-hover)' : 'transparent',
              }}
            >
              <span
                style={{
                  flex: '0 0 auto',
                  width: 52,
                  textAlign: 'right',
                  font: 'var(--fw-medium) var(--fs-body)/1 var(--font-mono)',
                  color: item.hora ? 'var(--text-muted)' : 'var(--text-subtle)',
                }}
              >
                {item.hora ?? '—'}
              </span>

              <span style={{ color: 'var(--text-muted)', display: 'flex', flex: '0 0 auto' }}>
                <Icon name={ICONE_DO_TIPO[item.tipo]} size={16} />
              </span>

              {item.tipo === 'lancamento' || item.tipo === 'evento' || item.tipo === 'peca' ? (
                <span style={{ flex: 1, minWidth: 0 }}>
                  <TituloDoItem titulo={item.titulo} feito={false} />
                  {item.detalhe && (
                    <span
                      style={{
                        display: 'block',
                        font: 'var(--type-body)',
                        color: 'var(--text-subtle)',
                      }}
                    >
                      {item.detalhe}
                    </span>
                  )}
                </span>
              ) : (
                <Checkbox
                  checked={item.feito}
                  disabled={item.tipo === 'rotina' && !podeMarcar}
                  onChange={() =>
                    item.tipo === 'rotina' ? aoAlternarRotina(item.id) : aoAlternarTarefa(item.id)
                  }
                  style={{ flex: 1, minWidth: 0, alignItems: 'center' }}
                  label={<TituloDoItem titulo={item.titulo} feito={item.feito} />}
                />
              )}

              {/* O evento externo não tem contexto: ele vem da agenda de
                  outro sistema, e escolher um lado por ele seria inventar
                  classificação. Leva a etiqueta de origem no lugar. */}
              {item.contexto ? (
                <Badge tone={item.contexto === 'pessoal' ? 'ontime' : 'delivered'} dot={false}>
                  {ROTULO_CONTEXTO[item.contexto]}
                </Badge>
              ) : (
                <Badge tone="neutral" dot={false}>
                  Agenda
                </Badge>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function TituloDoItem({ titulo, feito }: { titulo: string; feito: boolean }) {
  return (
    <span
      style={{
        display: 'block',
        font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
        color: feito ? 'var(--text-muted)' : 'var(--text-body)',
        textDecoration: feito ? 'line-through' : 'none',
        overflowWrap: 'anywhere',
      }}
    >
      {titulo}
    </span>
  );
}

/* ── O que vem pela frente ───────────────────────────────────────────────── */

/**
 * A lista contínua dos próximos dias que têm alguma coisa.
 *
 * Os dias vazios não aparecem, e é de propósito: sessenta dias em branco
 * escondem os três que importam. Cada dia leva ao próprio dia na visão de dia.
 */
function VistaLinha({
  linha,
  hoje,
  aoEscolher,
}: {
  linha: { dia: string; itens: ItensDoDia }[];
  hoje: string;
  aoEscolher: (dia: string) => void;
}) {
  if (linha.length === 0) {
    return (
      <p
        style={{
          padding: 'var(--sp-14) 0',
          textAlign: 'center',
          font: 'var(--type-body)',
          color: 'var(--text-subtle)',
        }}
      >
        Nada marcado nos próximos dois meses.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
      {linha.map(({ dia, itens }) => {
        const distancia = distanciaEmDias(hoje, dia);
        return (
          <div key={dia}>
            <button
              type="button"
              onClick={() => aoEscolher(dia)}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 'var(--sp-5)',
                minHeight: 'var(--control-h)',
                padding: 0,
                background: 'none',
                border: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  font: 'var(--fw-medium) var(--fs-md)/1.2 var(--font-core)',
                  color: dia === hoje ? 'var(--purple-200)' : 'var(--text-heading)',
                }}
              >
                {distancia === 0
                  ? 'Hoje'
                  : distancia === 1
                    ? 'Amanhã'
                    : formatarDiaDaSemana(comoData(dia))}
              </span>
              <span style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>
                {formatarDataMedia(comoData(dia))}
                {distancia > 1 && ` · em ${distancia} dias`}
              </span>
            </button>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--sp-3)',
                marginTop: 'var(--sp-4)',
                paddingLeft: 'var(--sp-6)',
                borderLeft: 'var(--bw-hairline) solid var(--border-hairline)',
              }}
            >
              {agendaEmLinha(itens).map((item) => (
                <span
                  key={item.chave}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--sp-5)',
                    minWidth: 0,
                  }}
                >
                  <span style={{ color: 'var(--text-subtle)', display: 'flex', flex: '0 0 auto' }}>
                    <Icon name={ICONE_DO_TIPO[item.tipo]} size={14} />
                  </span>
                  {item.hora && (
                    <span
                      style={{
                        font: 'var(--fw-regular) var(--fs-body)/1 var(--font-mono)',
                        color: 'var(--text-subtle)',
                        flex: '0 0 auto',
                      }}
                    >
                      {item.hora}
                    </span>
                  )}
                  <span
                    style={{
                      font: 'var(--type-body)',
                      color: item.feito ? 'var(--text-subtle)' : 'var(--text-muted)',
                      textDecoration: item.feito ? 'line-through' : 'none',
                      overflowWrap: 'anywhere',
                      minWidth: 0,
                    }}
                  >
                    {item.titulo}
                  </span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
