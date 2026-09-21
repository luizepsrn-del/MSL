import React from 'react';
import {
  Card,
  Button,
  Badge,
  Checkbox,
  Icon,
  IconButton,
  ProgressBar,
  Field,
  TextInput,
  Select,
  Modal,
  SuccessDialog,
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import {
  CONTEXTOS,
  ROTULO_CONTEXTO,
  type Contexto,
  type Projeto,
  type Modelo,
  type EstadoTarefa,
} from '../dados/esquema';
import {
  painelDosProjetos,
  tarefasDoProjeto,
  tarefasSoltas,
  resumoProjetos,
  ROTULO_SITUACAO_PROJETO,
  type SituacaoProjeto,
  type PainelProjeto,
} from '../dominio/projeto';
import { situacao, descreverPrazo, quadroPor } from '../dominio/tarefa';
import { diaValido, distanciaEmDias } from '../dominio/rotina';
import { formatarPorcento, formatarDataMedia, formatarNumero, ordenarPor } from '../formato';
import { aplicarModelo, descreverModelo } from '../dominio/modelo';
import { FormularioTarefa, QuadroTarefas } from './Tarefas';

const TOM: Record<SituacaoProjeto, 'delay' | 'ontime' | 'delivered' | 'neutral'> = {
  atrasado: 'delay',
  'em-andamento': 'ontime',
  concluido: 'delivered',
  vazio: 'neutral',
  arquivado: 'neutral',
};

/** Projetos — trabalho maior que uma tarefa. */
export function Projetos() {
  const {
    banco,
    hoje,
    criarProjeto,
    editarProjeto,
    arquivarProjeto,
    removerProjeto,
    alternarTarefa,
    criarTarefa,
    moverTarefa,
    mudarEstadoTarefa,
    criarModelo,
    removerModelo,
    aplicarModeloDeProjeto,
    guardarComoModelo,
  } = useBanco();
  const [criando, setCriando] = React.useState(false);
  const [aRemover, setARemover] = React.useState<Projeto | null>(null);
  /** o projeto aberto para correção, ou null */
  const [corrigindo, setCorrigindo] = React.useState<Projeto | null>(null);
  const [aberto, setAberto] = React.useState<string | null>(null);
  /** id do projeto ao qual estou acrescentando uma tarefa, ou null */
  const [acrescentandoEm, setAcrescentandoEm] = React.useState<string | null>(null);
  /** o modelo que estou prestes a usar, ou null */
  const [usando, setUsando] = React.useState<Modelo | null>(null);
  const [criandoModelo, setCriandoModelo] = React.useState(false);
  /** o aviso de que um projeto não pôde virar modelo */
  const [recusa, setRecusa] = React.useState<string | null>(null);
  const rotulosVivos = banco.rotulos.filter((r) => !r.arquivado);

  const resumo = resumoProjetos(banco, hoje);
  const paineis = painelDosProjetos(banco, hoje);
  const projetosAtivos = banco.projetos.filter((p) => !p.arquivadoEm);
  const soltas = tarefasSoltas(banco).filter((t) => !t.concluidaEm);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <Card>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-8)',
            flexWrap: 'wrap',
          }}
        >
          <strong
            style={{
              font: 'var(--fw-medium) var(--fs-lg)/1 var(--font-core)',
              color: 'var(--text-heading)',
            }}
          >
            {resumo.ativos} {resumo.ativos === 1 ? 'projeto ativo' : 'projetos ativos'}
          </strong>
          {resumo.atrasados > 0 && (
            <Badge tone="delay">
              {resumo.atrasados} {resumo.atrasados === 1 ? 'atrasado' : 'atrasados'}
            </Badge>
          )}
          {resumo.concluidos > 0 && (
            <Badge tone="delivered">
              {resumo.concluidos} {resumo.concluidos === 1 ? 'concluído' : 'concluídos'}
            </Badge>
          )}
          <Button
            variant="primary"
            iconRight="plus"
            onClick={() => setCriando(true)}
            style={{ marginLeft: 'auto' }}
          >
            Novo projeto
          </Button>
        </div>
      </Card>

      <Modelos
        modelos={banco.modelos}
        aoUsar={setUsando}
        aoCriar={() => setCriandoModelo(true)}
        aoRemover={removerModelo}
      />

      {recusa && (
        <Card>
          <p style={{ font: 'var(--type-body)', color: 'var(--orange-500)' }}>{recusa}</p>
        </Card>
      )}

      {paineis.length === 0 ? (
        <Card>
          <p
            style={{
              padding: 'var(--sp-14) var(--sp-8)',
              textAlign: 'center',
              font: 'var(--type-body)',
              color: 'var(--text-subtle)',
            }}
          >
            Nenhum projeto ainda. Um projeto agrupa tarefas que terminam juntas.
          </p>
        </Card>
      ) : (
        paineis.map((painel) => (
          <CartaoProjeto
            key={painel.projeto.id}
            painel={painel}
            hoje={hoje}
            expandido={aberto === painel.projeto.id}
            aoExpandir={() => setAberto(aberto === painel.projeto.id ? null : painel.projeto.id)}
            aoArquivar={() => arquivarProjeto(painel.projeto.id)}
            aoCorrigir={() => setCorrigindo(painel.projeto)}
            aoRemover={() => setARemover(painel.projeto)}
            aoAlternarTarefa={alternarTarefa}
            aoMoverEstado={mudarEstadoTarefa}
            aoAcrescentar={() => setAcrescentandoEm(painel.projeto.id)}
          />
        ))
      )}

      {soltas.length > 0 && (
        <Card
          title="Tarefas sem projeto"
          subtitle={`${soltas.length} ${soltas.length === 1 ? 'pendente' : 'pendentes'}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {soltas.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--sp-6)',
                  minHeight: 'var(--tap-min)',
                  padding: 'var(--sp-4) var(--sp-5)',
                }}
              >
                <span style={{ color: 'var(--text-muted)', display: 'flex' }}>
                  <Icon name="clipboard-check" size={16} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
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
                    {t.titulo}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      font: 'var(--type-body)',
                      color:
                        situacao(t, hoje) === 'atrasada'
                          ? 'var(--orange-500)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {descreverPrazo(t, hoje)}
                  </span>
                </span>
                <Badge tone={t.contexto === 'pessoal' ? 'ontime' : 'delivered'} dot={false}>
                  {ROTULO_CONTEXTO[t.contexto]}
                </Badge>

                {/* Estas tarefas existiam sem caminho de volta para um projeto:
                    dava para soltar, nunca para guardar. */}
                {projetosAtivos.length > 0 && (
                  <div style={{ minWidth: 190, flex: '0 0 auto' }}>
                    <Select
                      id={`solta-${t.id}`}
                      value=""
                      placeholder="Pôr num projeto"
                      size="sm"
                      onChange={(id) => moverTarefa(t.id, id)}
                      options={projetosAtivos.map((p) => ({ value: p.id, label: p.titulo }))}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {acrescentandoEm !== null && (
        <FormularioTarefa
          aberto
          rotulos={rotulosVivos}
          projetos={projetosAtivos}
          projetoFixo={acrescentandoEm}
          aoFechar={() => setAcrescentandoEm(null)}
          aoEnviar={async (dados) => {
            await criarTarefa(dados);
            setAcrescentandoEm(null);
          }}
        />
      )}

      {criando && (
        <FormularioProjeto
          aberto
          aoFechar={() => setCriando(false)}
          aoEnviar={async (dados) => {
            await criarProjeto(dados);
            setCriando(false);
          }}
        />
      )}

      {corrigindo && (
        <FormularioProjeto
          aberto
          projeto={corrigindo}
          aoFechar={() => setCorrigindo(null)}
          aoEnviar={async (dados) => {
            await editarProjeto(corrigindo.id, dados);
            setCorrigindo(null);
          }}
        />
      )}

      {usando && (
        <UsarModelo
          modelo={usando}
          hoje={hoje}
          aoFechar={() => setUsando(null)}
          aoAplicar={async (entrega, titulo) => {
            await aplicarModeloDeProjeto(usando.id, entrega, titulo);
            setUsando(null);
          }}
        />
      )}

      {criandoModelo && (
        <FormularioDeModelo
          projetos={projetosAtivos}
          aoFechar={() => setCriandoModelo(false)}
          aoCriar={async (dados) => {
            await criarModelo(dados);
            setCriandoModelo(false);
          }}
          aoGuardarProjeto={async (projetoId) => {
            const deu = await guardarComoModelo(projetoId);
            setCriandoModelo(false);
            if (!deu) {
              setRecusa(
                'Esse projeto não vira modelo ainda: ele precisa de uma data de entrega e de pelo menos uma tarefa, para eu ter de onde contar os dias.',
              );
            }
          }}
        />
      )}

      <SuccessDialog
        open={!!aRemover}
        tone="danger"
        onClose={() => setARemover(null)}
        title={`Remover "${aRemover?.titulo}"?`}
        message="As tarefas dele não são apagadas — ficam soltas na lista de tarefas."
        actionLabel="Remover projeto"
        onAction={async () => {
          if (aRemover) await removerProjeto(aRemover.id);
          setARemover(null);
        }}
      />
    </div>
  );
}

function CartaoProjeto({
  painel,
  hoje,
  expandido,
  aoExpandir,
  aoArquivar,
  aoCorrigir,
  aoRemover,
  aoAlternarTarefa,
  aoMoverEstado,
  aoAcrescentar,
}: {
  painel: PainelProjeto;
  hoje: string;
  expandido: boolean;
  aoExpandir: () => void;
  aoArquivar: () => void;
  aoCorrigir: () => void;
  aoRemover: () => void;
  aoAlternarTarefa: (id: string) => void;
  aoMoverEstado: (id: string, estado: EstadoTarefa) => Promise<void>;
  aoAcrescentar: () => void;
}) {
  const { banco } = useBanco();
  const { projeto, progresso, situacao: s } = painel;
  const tarefas = tarefasDoProjeto(banco, projeto.id);
  const [vista, setVista] = React.useState<'lista' | 'quadro'>('lista');

  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--sp-6)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-5)',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  font: 'var(--fw-medium) var(--fs-lg)/1.2 var(--font-core)',
                  color: 'var(--text-heading)',
                }}
              >
                {projeto.titulo}
              </span>
              <Badge tone={TOM[s]}>{ROTULO_SITUACAO_PROJETO[s]}</Badge>
              <Badge
                tone={projeto.contexto === 'pessoal' ? 'ontime' : 'delivered'}
                dot={false}
              >
                {ROTULO_CONTEXTO[projeto.contexto]}
              </Badge>
            </span>
            {projeto.descricao && (
              <span
                style={{
                  display: 'block',
                  font: 'var(--type-body)',
                  color: 'var(--text-muted)',
                  marginTop: 'var(--sp-3)',
                  lineHeight: 'var(--lh-normal)',
                }}
              >
                {projeto.descricao}
              </span>
            )}
          </span>

          <span style={{ display: 'flex', gap: 'var(--sp-4)', flex: '0 0 auto' }}>
            <IconButton
              icon="plus"
              label={`Nova tarefa em ${projeto.titulo}`}
              variant="ghost"
              size={34}
              onClick={aoAcrescentar}
            />
            <IconButton
              icon="pencil"
              label={`Corrigir ${projeto.titulo}`}
              variant="ghost"
              size={34}
              onClick={aoCorrigir}
            />
            <IconButton
              icon="archive"
              label={`Arquivar ${projeto.titulo}`}
              variant="ghost"
              size={34}
              onClick={aoArquivar}
            />
            <IconButton
              icon="trash-2"
              label={`Remover ${projeto.titulo}`}
              variant="ghost"
              size={34}
              onClick={aoRemover}
            />
          </span>
        </div>

        <ProgressBar
          value={Math.round(progresso.fracao * 100)}
          valueLabel={`${progresso.concluidas}/${progresso.total}`}
          tone={s === 'concluido' ? 'green' : s === 'atrasado' ? 'orange' : 'purple'}
          label={progresso.total === 0 ? 'Sem tarefas ainda' : formatarPorcento(progresso.fracao)}
        />

        <Sinais painel={painel} hoje={hoje} aoAlternarTarefa={aoAlternarTarefa} />

        {tarefas.length > 0 && (
          <div>
            <button
              type="button"
              onClick={aoExpandir}
              aria-expanded={expandido}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--sp-4)',
                minHeight: 'var(--control-h)',
                padding: 0,
                background: 'none',
                border: 0,
                cursor: 'pointer',
                font: 'var(--type-body)',
                color: 'var(--text-muted)',
              }}
            >
              <Icon name={expandido ? 'chevron-down' : 'chevron-right'} size={15} />
              {tarefas.length} {tarefas.length === 1 ? 'tarefa' : 'tarefas'}
            </button>

            {expandido && (
              <div style={{ display: 'inline-block', minWidth: 140, marginLeft: 'var(--sp-6)' }}>
                <Select
                  id={`vista-${projeto.id}`}
                  value={vista}
                  onChange={(v) => setVista(v as 'lista' | 'quadro')}
                  size="sm"
                  options={[
                    { value: 'lista', label: 'Lista' },
                    { value: 'quadro', label: 'Quadro' },
                  ]}
                />
              </div>
            )}

            {expandido && vista === 'quadro' && (
              <div style={{ marginTop: 'var(--sp-6)' }}>
                {/* O mesmo quadro da tela de Tarefas, com as tarefas deste
                    projeto — sem duplicar componente nem regra. */}
                <QuadroTarefas
                  colunas={quadroPor(banco, 'estado', hoje, tarefas)}
                  hoje={hoje}
                  aoMover={aoMoverEstado}
                />
              </div>
            )}

            {expandido && vista === 'lista' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--sp-2)',
                  marginTop: 'var(--sp-5)',
                }}
              >
                {tarefas.map((t) => {
                  const feita = !!t.concluidaEm;
                  return (
                    <div
                      key={t.id}
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
                      <Checkbox
                        checked={feita}
                        onChange={() => aoAlternarTarefa(t.id)}
                        style={{ flex: 1, minWidth: 0, alignItems: 'center' }}
                        label={
                          <span style={{ minWidth: 0, display: 'block' }}>
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
                              {t.titulo}
                            </span>
                            <span
                              style={{
                                display: 'block',
                                font: 'var(--type-body)',
                                color:
                                  situacao(t, hoje) === 'atrasada'
                                    ? 'var(--orange-500)'
                                    : 'var(--text-muted)',
                              }}
                            >
                              {descreverPrazo(t, hoje)}
                            </span>
                          </span>
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

interface DadosNovos {
  titulo: string;
  contexto: Contexto;
  descricao?: string;
  prazo?: string;
}

/**
 * O formulário de projeto, nos dois modos.
 *
 * Com `projeto` ele corrige em vez de criar. O estado nasce do registro, e
 * quem o monta só o monta quando aberto — cada abertura é uma montagem nova.
 */
function FormularioProjeto({
  aberto,
  projeto,
  aoFechar,
  aoEnviar,
}: {
  aberto: boolean;
  projeto?: Projeto;
  aoFechar: () => void;
  aoEnviar: (dados: DadosNovos) => Promise<void>;
}) {
  const corrigindo = !!projeto;
  const [titulo, setTitulo] = React.useState(projeto?.titulo ?? '');
  const [contexto, setContexto] = React.useState<Contexto>(projeto?.contexto ?? 'profissional');
  const [descricao, setDescricao] = React.useState(projeto?.descricao ?? '');
  const [prazo, setPrazo] = React.useState(projeto?.prazo ?? '');
  const [tentou, setTentou] = React.useState(false);

  const erroTitulo = tentou && titulo.trim() === '' ? 'Dê um nome ao projeto' : undefined;
  const erroPrazo = tentou && prazo !== '' && !diaValido(prazo) ? 'Data inválida' : undefined;

  const enviar = async () => {
    setTentou(true);
    if (titulo.trim() === '') return;
    if (prazo !== '' && !diaValido(prazo)) return;
    await aoEnviar({
      titulo: titulo.trim(),
      contexto,
      descricao: descricao.trim() === '' ? undefined : descricao.trim(),
      prazo: prazo === '' ? undefined : prazo,
    });
  };

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
            {corrigindo ? 'Corrigir projeto' : 'Novo projeto'}
          </h2>
          <p
            style={{
              font: 'var(--type-page-subtitle)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
            }}
          >
            {corrigindo
              ? 'O que estiver errado. Apagar um campo o deixa em branco'
              : 'Trabalho maior que uma tarefa, que termina quando as tarefas terminam'}
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={aoFechar}>
            Cancelar
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={enviar}>
            {corrigindo ? 'Salvar' : 'Criar projeto'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
        <Field label="Nome do projeto" htmlFor="proj-titulo" required error={erroTitulo}>
          <TextInput
            id="proj-titulo"
            value={titulo}
            onChange={setTitulo}
            placeholder="Reforma do escritório"
            invalid={!!erroTitulo}
            size="lg"
            fullWidth
          />
        </Field>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min), 1fr))',
            gap: 'var(--sp-8)',
          }}
        >
          <Field label="Contexto" htmlFor="proj-contexto">
            <Select
              id="proj-contexto"
              value={contexto}
              onChange={(v) => setContexto(v as Contexto)}
              size="lg"
              fullWidth
              options={CONTEXTOS.map((c) => ({ value: c, label: ROTULO_CONTEXTO[c] }))}
            />
          </Field>

          <Field label="Prazo" htmlFor="proj-prazo" help="Opcional" error={erroPrazo}>
            <TextInput
              id="proj-prazo"
              type="date"
              value={prazo}
              onChange={setPrazo}
              invalid={!!erroPrazo}
              size="lg"
              fullWidth
            />
          </Field>
        </div>

        <Field label="Descrição" htmlFor="proj-desc" help="Opcional">
          <TextInput
            id="proj-desc"
            type="multiline"
            value={descricao}
            onChange={setDescricao}
            placeholder="O que este projeto entrega quando terminar"
            fullWidth
          />
        </Field>
      </div>
    </Modal>
  );
}

/**
 * O que o projeto sabe dizer sozinho.
 *
 * Nada aqui foi digitado por mim: próxima tarefa, parado, ritmo e previsão
 * saem das tarefas que já existem. É a diferença entre uma lista de projetos e
 * um projeto que me cobra.
 */
function Sinais({
  painel,
  hoje,
  aoAlternarTarefa,
}: {
  painel: PainelProjeto;
  hoje: string;
  aoAlternarTarefa: (id: string) => void;
}) {
  const { proxima, parado, paradoHa, emAndamento, atrasadas, ritmo, previsao } = painel;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
        {/* O prazo do projeto não aparecia em lugar nenhum: eu preenchia no
            formulário e ele sumia. */}
        {painel.projeto.prazo && (
          <Badge tone={painel.situacao === 'atrasado' ? 'delay' : 'neutral'} dot={false}>
            {descreverPrazoDoProjeto(painel.projeto.prazo, hoje)}
          </Badge>
        )}
        {atrasadas > 0 && (
          <Badge tone="delay">
            {atrasadas} {atrasadas === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}
          </Badge>
        )}
        {emAndamento > 0 && (
          <Badge tone="ontime" dot={false}>
            {emAndamento} em andamento
          </Badge>
        )}
        {parado && (
          <Badge tone="delay" dot={false}>
            Parado há {paradoHa} dias
          </Badge>
        )}
      </div>

      {proxima && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-6)',
            minHeight: 'var(--tap-min)',
            padding: 'var(--sp-4) var(--sp-5)',
            borderRadius: 'var(--r-nav)',
            background: 'var(--surface-raised)',
          }}
        >
          <Checkbox
            checked={false}
            onChange={() => aoAlternarTarefa(proxima.id)}
            style={{ flex: 1, minWidth: 0, alignItems: 'center' }}
            label={
              <span style={{ minWidth: 0, display: 'block' }}>
                <span
                  style={{
                    display: 'block',
                    font: 'var(--fw-regular) var(--fs-micro)/1 var(--font-core)',
                    color: 'var(--text-subtle)',
                    letterSpacing: 'var(--ls-caps)',
                    textTransform: 'uppercase',
                    marginBottom: 'var(--sp-3)',
                  }}
                >
                  Próxima
                </span>
                <span
                  style={{
                    display: 'block',
                    font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                    color: 'var(--text-body)',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {proxima.titulo}
                </span>
                <span
                  style={{
                    display: 'block',
                    font: 'var(--type-body)',
                    color:
                      situacao(proxima, hoje) === 'atrasada'
                        ? 'var(--orange-500)'
                        : 'var(--text-muted)',
                  }}
                >
                  {descreverPrazo(proxima, hoje)}
                </span>
              </span>
            }
          />
        </div>
      )}

      {ritmo > 0 && (
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>
          {formatarNumero(Math.round(ritmo * 10) / 10)}{' '}
          {ritmo === 1 ? 'tarefa concluída por semana' : 'tarefas concluídas por semana'}
          {previsao && ` · neste ritmo, termina em ${formatarDataMedia(comoData(previsao))}`}
        </p>
      )}
    </div>
  );
}

/**
 * O prazo do projeto por extenso, relativo quando está perto.
 *
 * Diferente do prazo de tarefa: aqui não existe "atrasado há três dias" — a
 * situação do projeto já diz isso, e repetir seria dizer duas vezes.
 */
function descreverPrazoDoProjeto(prazo: string, hoje: string): string {
  const dias = distanciaEmDias(hoje, prazo);
  if (dias < 0) return `Prazo era ${formatarDataMedia(comoData(prazo))}`;
  if (dias === 0) return 'Prazo é hoje';
  if (dias === 1) return 'Prazo é amanhã';
  if (dias <= 14) return `Prazo em ${dias} dias`;
  return `Prazo em ${formatarDataMedia(comoData(prazo))}`;
}

/** `AAAA-MM-DD` → Date no meio-dia UTC, longe de qualquer virada de fuso. */
function comoData(dia: string): Date {
  return new Date(`${dia}T12:00:00Z`);
}

/* ── Modelos ─────────────────────────────────────────────────────────────── */

/**
 * Os modelos, acima da lista de projetos.
 *
 * Some inteiro quando não há nenhum e o botão de criar vive dentro — um cartão
 * permanente vazio ocupa a primeira tela com nada.
 */
function Modelos({
  modelos,
  aoUsar,
  aoCriar,
  aoRemover,
}: {
  modelos: Modelo[];
  aoUsar: (m: Modelo) => void;
  aoCriar: () => void;
  aoRemover: (id: string) => void;
}) {
  return (
    <Card
      title="Modelos"
      subtitle={
        modelos.length === 0
          ? 'Um projeto que você já sabe fazer, pronto para repetir'
          : `${modelos.length} ${modelos.length === 1 ? 'modelo' : 'modelos'}`
      }
      action={
        <Button variant="secondary" size="sm" iconRight="plus" onClick={aoCriar}>
          Novo modelo
        </Button>
      }
    >
      {modelos.length === 0 ? (
        <p
          style={{
            padding: 'var(--sp-10) 0',
            font: 'var(--type-body)',
            color: 'var(--text-subtle)',
            lineHeight: 'var(--lh-normal)',
          }}
        >
          Monte a lista uma vez — "escrever a página, 14 dias antes; revisar, 3 dias antes;
          publicar, no dia" — e toda entrega nova nasce com os prazos já contados. Um projeto que
          você já tem também vira modelo num clique.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {ordenarPor<Modelo>(modelos, (m) => m.titulo).map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                // Quebra em vez de espremer: com dois botões à direita, o nome
                // do modelo ia a zero no telefone, como já aconteceu na linha
                // de tarefa e na do financeiro.
                flexWrap: 'wrap',
                gap: 'var(--sp-6)',
                minHeight: 'var(--tap-min)',
                padding: 'var(--sp-4) var(--sp-5)',
                borderRadius: 'var(--r-nav)',
                background: 'var(--surface-raised)',
              }}
            >
              <span style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                    color: 'var(--text-body)',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {m.titulo}
                </span>
                <span
                  style={{ display: 'block', font: 'var(--type-body)', color: 'var(--text-muted)' }}
                >
                  {descreverModelo(m)} · {ROTULO_CONTEXTO[m.contexto]}
                </span>
              </span>

              <span style={{ display: 'flex', gap: 'var(--sp-3)', flex: '0 0 auto' }}>
                <Button variant="secondary" size="sm" onClick={() => aoUsar(m)}>
                  Usar
                </Button>
                <IconButton
                  icon="trash-2"
                  label={`Apagar o modelo ${m.titulo}`}
                  variant="ghost"
                  size={34}
                  onClick={() => aoRemover(m.id)}
                />
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/**
 * Usar um modelo: só a entrega e o nome desta vez.
 *
 * A prévia mostra os prazos já calculados antes de criar nada. Um modelo que
 * cria oito tarefas sem mostrar quais é uma surpresa, não uma automação.
 */
function UsarModelo({
  modelo,
  hoje,
  aoFechar,
  aoAplicar,
}: {
  modelo: Modelo;
  hoje: string;
  aoFechar: () => void;
  aoAplicar: (entrega: string, titulo: string) => Promise<void>;
}) {
  const [entrega, setEntrega] = React.useState(hoje);
  const [titulo, setTitulo] = React.useState(modelo.titulo);
  const [tentou, setTentou] = React.useState(false);

  const erroEntrega = tentou && !diaValido(entrega) ? 'Data inválida' : undefined;
  const previa = diaValido(entrega) ? aplicarModelo(modelo, entrega, titulo).tarefas : [];

  return (
    <Modal
      open
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
            Usar "{modelo.titulo}"
          </h2>
          <p
            style={{
              font: 'var(--type-page-subtitle)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
            }}
          >
            Diga a entrega e eu conto os prazos para trás
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => {
              setTentou(true);
              if (!diaValido(entrega)) return;
              void aoAplicar(entrega, titulo);
            }}
          >
            Criar o projeto
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
        <Field label="Nome desta vez" htmlFor="mod-titulo" help="O modelo é a receita; isto é o prato">
          <TextInput id="mod-titulo" value={titulo} onChange={setTitulo} size="lg" fullWidth />
        </Field>

        <Field label="Entrega" htmlFor="mod-entrega" required error={erroEntrega}>
          <TextInput
            id="mod-entrega"
            type="date"
            value={entrega}
            onChange={setEntrega}
            invalid={!!erroEntrega}
            size="lg"
            fullWidth
          />
        </Field>

        {previa.length > 0 && (
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
              O que vai ser criado
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {previa.map((t) => (
                <span
                  key={t.titulo}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 'var(--sp-6)',
                    font: 'var(--type-body)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{t.titulo}</span>
                  <span style={{ flex: '0 0 auto', color: 'var(--text-subtle)' }}>
                    {formatarDataMedia(new Date(`${t.prazo}T12:00:00`))}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * Criar um modelo: do zero, ou a partir de um projeto que já existe.
 *
 * O caminho do projeto vem primeiro porque é como um modelo bom nasce —
 * primeiro eu faço, depois percebo que vou repetir.
 */
function FormularioDeModelo({
  projetos,
  aoFechar,
  aoCriar,
  aoGuardarProjeto,
}: {
  projetos: Projeto[];
  aoFechar: () => void;
  aoCriar: (dados: Omit<Modelo, 'id' | 'criadoEm' | 'alteradoEm'>) => Promise<void>;
  aoGuardarProjeto: (projetoId: string) => Promise<void>;
}) {
  const [titulo, setTitulo] = React.useState('');
  const [contexto, setContexto] = React.useState<Contexto>('profissional');
  const [linhas, setLinhas] = React.useState<{ titulo: string; diasAntes: string }[]>([
    { titulo: '', diasAntes: '0' },
  ]);
  const [deProjeto, setDeProjeto] = React.useState('');
  const [tentou, setTentou] = React.useState(false);

  const itens = linhas
    .filter((l) => l.titulo.trim() !== '')
    .map((l) => ({ titulo: l.titulo.trim(), diasAntes: Math.trunc(Number(l.diasAntes)) || 0 }));

  const erroTitulo = tentou && titulo.trim() === '' ? 'Dê um nome ao modelo' : undefined;
  const erroItens = tentou && itens.length === 0 ? 'Um modelo sem tarefa não cria nada' : undefined;

  return (
    <Modal
      open
      onClose={aoFechar}
      closeLabel="Fechar"
      width={620}
      header={
        <div>
          <h2
            style={{
              font: 'var(--fw-semibold) var(--fs-heading)/1.25 var(--font-core)',
              color: 'var(--text-heading)',
            }}
          >
            Novo modelo
          </h2>
          <p
            style={{
              font: 'var(--type-page-subtitle)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
            }}
          >
            Os prazos são contados a partir da entrega, nunca datas fixas
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => {
              setTentou(true);
              if (titulo.trim() === '' || itens.length === 0) return;
              void aoCriar({ titulo: titulo.trim(), contexto, itens });
            }}
          >
            Criar modelo
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
        {projetos.length > 0 && (
          <Field
            label="A partir de um projeto que já existe"
            htmlFor="mod-de-projeto"
            help="Os prazos dele viram distâncias até a entrega"
          >
            <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
                <Select
                  id="mod-de-projeto"
                  value={deProjeto}
                  onChange={setDeProjeto}
                  size="lg"
                  fullWidth
                  options={[
                    { value: '', label: 'Escolha um projeto' },
                    ...projetos.map((p) => ({ value: p.id, label: p.titulo })),
                  ]}
                />
              </div>
              <Button
                variant="secondary"
                size="lg"
                disabled={deProjeto === ''}
                onClick={() => void aoGuardarProjeto(deProjeto)}
              >
                Guardar como modelo
              </Button>
            </div>
          </Field>
        )}

        <Field label="Nome do modelo" htmlFor="mod-nome" required error={erroTitulo}>
          <TextInput
            id="mod-nome"
            value={titulo}
            onChange={setTitulo}
            placeholder="Lançar um produto"
            invalid={!!erroTitulo}
            size="lg"
            fullWidth
          />
        </Field>

        <Field label="Contexto" htmlFor="mod-contexto">
          <Select
            id="mod-contexto"
            value={contexto}
            onChange={(v) => setContexto(v as Contexto)}
            size="lg"
            fullWidth
            options={CONTEXTOS.map((c) => ({ value: c, label: ROTULO_CONTEXTO[c] }))}
          />
        </Field>

        <Field label="As tarefas" htmlFor="mod-item-0" error={erroItens}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
            {linhas.map((linha, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--sp-5)', flexWrap: 'wrap' }}>
                {/* Três para um: no desktop o título fica com o triplo do
                    espaço extra, e no telefone os dois quebram. A largura
                    mínima é o mesmo token de sempre — número cru de pixel é o
                    que o lint da biblioteca recusa, e com razão. */}
                <div style={{ flex: '3 1 var(--grid-min)', minWidth: 0 }}>
                  <TextInput
                    id={`mod-item-${i}`}
                    value={linha.titulo}
                    onChange={(v) =>
                      setLinhas((ls) => ls.map((l, j) => (i === j ? { ...l, titulo: v } : l)))
                    }
                    placeholder="Escrever a página"
                    size="lg"
                    fullWidth
                  />
                </div>
                <div style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
                  <TextInput
                    id={`mod-dias-${i}`}
                    type="number"
                    value={linha.diasAntes}
                    onChange={(v) =>
                      setLinhas((ls) => ls.map((l, j) => (i === j ? { ...l, diasAntes: v } : l)))
                    }
                    size="lg"
                    fullWidth
                  />
                </div>
                <IconButton
                  icon="trash-2"
                  label={`Tirar a linha ${i + 1}`}
                  variant="ghost"
                  size={40}
                  disabled={linhas.length === 1}
                  onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}
                />
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              iconLeft="plus"
              onClick={() => setLinhas((ls) => [...ls, { titulo: '', diasAntes: '0' }])}
            >
              Mais uma tarefa
            </Button>
            <p style={{ font: 'var(--type-body)', color: 'var(--text-subtle)' }}>
              O número é quantos dias <strong>antes</strong> da entrega. Zero é no dia; negativo é
              depois, para o que só acontece com a coisa no ar.
            </p>
          </div>
        </Field>
      </div>
    </Modal>
  );
}
