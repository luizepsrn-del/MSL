import React from 'react';
import {
  Card,
  Button,
  Badge,
  Checkbox,
  IconButton,
  Field,
  TextInput,
  Select,
  Modal,
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import {
  CONTEXTOS,
  ROTULO_CONTEXTO,
  ESTADOS_TAREFA,
  ROTULO_ESTADO,
  type Contexto,
  type Tarefa,
  type Projeto,
  type EstadoTarefa,
} from '../dados/esquema';
import {
  ordenarTarefas,
  situacao,
  descreverPrazo,
  resumoTarefas,
  quadro,
  estadoDe,
  type Situacao,
} from '../dominio/tarefa';
import { diaValido } from '../dominio/rotina';
import { useLarguraDesktop } from '../casca/useLarguraDesktop';

type Filtro = 'pendentes' | 'todas' | 'concluidas';
type Visao = 'lista' | 'quadro';

/** Tarefa — o que tem fim, com prazo quando faz sentido ter. */
export function Tarefas() {
  const { banco, hoje, criarTarefa, alternarTarefa, removerTarefa, mudarEstadoTarefa } = useBanco();
  const projetosAtivos = banco.projetos.filter((p) => !p.arquivadoEm);
  const [criando, setCriando] = React.useState(false);
  const [filtro, setFiltro] = React.useState<Filtro>('pendentes');
  const [visao, setVisao] = React.useState<Visao>('lista');

  const resumo = resumoTarefas(banco, hoje);

  const visiveis = ordenarTarefas(
    banco.tarefas.filter((t) => {
      if (filtro === 'pendentes') return !t.concluidaEm;
      if (filtro === 'concluidas') return !!t.concluidaEm;
      return true;
    }),
    hoje,
  );

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
            {resumo.pendentes} {resumo.pendentes === 1 ? 'pendente' : 'pendentes'}
          </strong>

          {resumo.atrasadas > 0 && (
            <Badge tone="delay">
              {resumo.atrasadas} {resumo.atrasadas === 1 ? 'atrasada' : 'atrasadas'}
            </Badge>
          )}
          {resumo.paraHoje > 0 && <Badge tone="ontime">{resumo.paraHoje} para hoje</Badge>}

          <div style={{ minWidth: 150 }}>
            <Select
              id="tar-visao"
              value={visao}
              onChange={(v) => setVisao(v as Visao)}
              options={[
                { value: 'lista', label: 'Lista' },
                { value: 'quadro', label: 'Quadro' },
              ]}
            />
          </div>

          {/* No quadro o filtro não se aplica: a coluna já é o filtro. */}
          {visao === 'lista' && (
            <div style={{ minWidth: 170 }}>
              <Select
                id="tar-filtro"
                value={filtro}
                onChange={(v) => setFiltro(v as Filtro)}
                options={[
                  { value: 'pendentes', label: 'Pendentes' },
                  { value: 'todas', label: 'Todas' },
                  { value: 'concluidas', label: 'Concluídas' },
                ]}
              />
            </div>
          )}

          <Button
            variant="primary"
            iconRight="plus"
            onClick={() => setCriando(true)}
            style={{ marginLeft: 'auto' }}
          >
            Nova tarefa
          </Button>
        </div>
      </Card>

      {visao === 'quadro' ? (
        <QuadroTarefas
          tarefas={banco.tarefas}
          hoje={hoje}
          aoMover={mudarEstadoTarefa}
          aoRemover={removerTarefa}
        />
      ) : visiveis.length === 0 ? (
        <Card>
          <p
            style={{
              padding: 'var(--sp-14) var(--sp-8)',
              textAlign: 'center',
              font: 'var(--type-body)',
              color: 'var(--text-subtle)',
            }}
          >
            {filtro === 'pendentes' && banco.tarefas.length > 0
              ? 'Nada pendente. Bom sinal.'
              : filtro === 'concluidas'
                ? 'Nada concluído ainda.'
                : 'Nenhuma tarefa ainda. Crie a primeira.'}
          </p>
        </Card>
      ) : (
        <Card flush bodyStyle={{ padding: 'var(--card-pad-lg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {visiveis.map((t) => (
              <LinhaTarefa
                key={t.id}
                tarefa={t}
                hoje={hoje}
                aoAlternar={() => alternarTarefa(t.id)}
                aoRemover={() => removerTarefa(t.id)}
              />
            ))}
          </div>
        </Card>
      )}

      <FormularioTarefa
        aberto={criando}
        projetos={projetosAtivos}
        aoFechar={() => setCriando(false)}
        aoCriar={async (dados) => {
          await criarTarefa(dados);
          setCriando(false);
        }}
      />
    </div>
  );
}

const TOM_SITUACAO: Record<Situacao, 'delay' | 'ontime' | 'delivered' | 'neutral'> = {
  atrasada: 'delay',
  hoje: 'ontime',
  futura: 'neutral',
  'sem-prazo': 'neutral',
  concluida: 'delivered',
};

export function LinhaTarefa({
  tarefa,
  hoje,
  aoAlternar,
  aoRemover,
}: {
  tarefa: Tarefa;
  hoje: string;
  aoAlternar: () => void;
  aoRemover?: () => void;
}) {
  const s = situacao(tarefa, hoje);
  const feita = s === 'concluida';

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
        transition: 'var(--t-hover)',
      }}
    >
      <Checkbox
        checked={feita}
        onChange={aoAlternar}
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
              {tarefa.titulo}
            </span>
            <span
              style={{
                display: 'block',
                font: 'var(--type-body)',
                color: s === 'atrasada' ? 'var(--orange-500)' : 'var(--text-muted)',
              }}
            >
              {descreverPrazo(tarefa, hoje)}
              {tarefa.anotacao ? ` · ${tarefa.anotacao}` : ''}
            </span>
          </span>
        }
      />

      {!feita && s !== 'sem-prazo' && s !== 'futura' && (
        <Badge tone={TOM_SITUACAO[s]}>{s === 'atrasada' ? 'Atrasada' : 'Hoje'}</Badge>
      )}

      <Badge tone={tarefa.contexto === 'pessoal' ? 'ontime' : 'delivered'} dot={false}>
        {ROTULO_CONTEXTO[tarefa.contexto]}
      </Badge>

      {aoRemover && (
        <IconButton
          icon="trash-2"
          label={`Remover ${tarefa.titulo}`}
          variant="ghost"
          size={34}
          onClick={aoRemover}
        />
      )}
    </div>
  );
}

export interface DadosNovos {
  titulo: string;
  contexto: Contexto;
  prazo?: string;
  anotacao?: string;
  projetoId?: string;
}

/** Valor do Select quando a tarefa não pertence a projeto nenhum. */
const SEM_PROJETO = '';

/**
 * O formulário de tarefa, reusado pela tela de Projetos.
 *
 * Com `projetoFixo` o seletor de projeto some: quem abriu o formulário de
 * dentro de um projeto já disse a qual projeto a tarefa pertence, e oferecer a
 * escolha de novo seria convidar a contradizê-la.
 */
export function FormularioTarefa({
  aberto,
  projetos,
  projetoFixo,
  aoFechar,
  aoCriar,
}: {
  aberto: boolean;
  projetos: Projeto[];
  projetoFixo?: string;
  aoFechar: () => void;
  aoCriar: (dados: DadosNovos) => Promise<void>;
}) {
  const [titulo, setTitulo] = React.useState('');
  const [contexto, setContexto] = React.useState<Contexto>('pessoal');
  const [prazo, setPrazo] = React.useState('');
  const [anotacao, setAnotacao] = React.useState('');
  const [projetoId, setProjetoId] = React.useState(SEM_PROJETO);
  const [tentou, setTentou] = React.useState(false);

  React.useEffect(() => {
    if (aberto) {
      setTitulo('');
      setPrazo('');
      setAnotacao('');
      setProjetoId(SEM_PROJETO);
      setTentou(false);
    }
  }, [aberto]);

  const erroTitulo = tentou && titulo.trim() === '' ? 'Dê um nome à tarefa' : undefined;
  const erroPrazo =
    tentou && prazo !== '' && !diaValido(prazo) ? 'Data inválida' : undefined;

  const enviar = async () => {
    setTentou(true);
    if (titulo.trim() === '') return;
    if (prazo !== '' && !diaValido(prazo)) return;

    await aoCriar({
      titulo: titulo.trim(),
      contexto,
      prazo: prazo === '' ? undefined : prazo,
      anotacao: anotacao.trim() === '' ? undefined : anotacao.trim(),
      projetoId: projetoFixo ?? (projetoId === SEM_PROJETO ? undefined : projetoId),
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
            Nova tarefa
          </h2>
          <p
            style={{
              font: 'var(--type-page-subtitle)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
            }}
          >
            O que tem fim. Prazo só quando faz sentido ter um
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={aoFechar}>
            Cancelar
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={enviar}>
            Criar tarefa
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
        <Field label="O que precisa ser feito" htmlFor="tar-titulo" required error={erroTitulo}>
          <TextInput
            id="tar-titulo"
            value={titulo}
            onChange={setTitulo}
            placeholder="Renovar o contrato"
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
          <Field label="Contexto" htmlFor="tar-contexto">
            <Select
              id="tar-contexto"
              value={contexto}
              onChange={(v) => setContexto(v as Contexto)}
              size="lg"
              fullWidth
              options={CONTEXTOS.map((c) => ({ value: c, label: ROTULO_CONTEXTO[c] }))}
            />
          </Field>

          <Field
            label="Prazo"
            htmlFor="tar-prazo"
            help="Opcional — sem prazo é sem prazo, não atraso"
            error={erroPrazo}
          >
            <TextInput
              id="tar-prazo"
              type="date"
              value={prazo}
              onChange={setPrazo}
              invalid={!!erroPrazo}
              size="lg"
              fullWidth
            />
          </Field>
        </div>

        {projetos.length > 0 && !projetoFixo && (
          <Field label="Projeto" htmlFor="tar-projeto" help="Opcional — tarefa solta também vale">
            <Select
              id="tar-projeto"
              value={projetoId}
              onChange={setProjetoId}
              size="lg"
              fullWidth
              options={[
                { value: SEM_PROJETO, label: 'Sem projeto' },
                ...projetos.map((p) => ({ value: p.id, label: p.titulo })),
              ]}
            />
          </Field>
        )}

        <Field label="Anotação" htmlFor="tar-nota" help="Opcional">
          <TextInput
            id="tar-nota"
            type="multiline"
            value={anotacao}
            onChange={setAnotacao}
            placeholder="O que mais eu preciso lembrar sobre isto"
            fullWidth
          />
        </Field>
      </div>
    </Modal>
  );
}

/* ── O quadro ────────────────────────────────────────────────────────────── */

/**
 * O quadro de três colunas.
 *
 * Mover acontece de dois jeitos, de propósito. No Mac dá para arrastar; no
 * iPhone arrastar com HTML5 não existe, então as setas do cartão fazem o mesmo
 * trabalho — e continuam sendo o caminho de teclado no Mac. Um quadro que só
 * responde a arrastar seria um quadro que eu não consigo usar no telefone, que
 * é metade do ponto deste sistema.
 */
function QuadroTarefas({
  tarefas,
  hoje,
  aoMover,
  aoRemover,
}: {
  tarefas: Tarefa[];
  hoje: string;
  aoMover: (id: string, estado: EstadoTarefa) => Promise<void>;
  aoRemover: (id: string) => Promise<void>;
}) {
  const desktop = useLarguraDesktop() !== false;
  const [sobre, setSobre] = React.useState<EstadoTarefa | null>(null);
  const colunas = quadro(tarefas, hoje);

  return (
    <div
      style={
        desktop
          ? {
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 'var(--card-gap)',
              alignItems: 'start',
            }
          : {
              // O mesmo trilho com encaixe dos indicadores do Início: sem media
              // query e sem JavaScript, as três colunas passam a deslizar.
              display: 'flex',
              gap: 'var(--card-gap)',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              margin: '0 calc(-1 * var(--shell-gutter))',
              padding: '0 var(--shell-gutter)',
              // Sem isto o encaixe ignora a goteira e cola a primeira coluna
              // na borda da tela: o WebKit alinha o item ao início da área de
              // rolagem, que fica antes do padding.
              scrollPaddingLeft: 'var(--shell-gutter)',
              scrollbarWidth: 'none',
            }
      }
    >
      {colunas.map((coluna) => (
        <div
          key={coluna.estado}
          style={desktop ? { minWidth: 0 } : { flex: '1 0 var(--grid-min)', scrollSnapAlign: 'start' }}
          onDragOver={(e) => {
            if (!desktop) return;
            e.preventDefault();
            setSobre(coluna.estado);
          }}
          onDragLeave={() => setSobre((s) => (s === coluna.estado ? null : s))}
          onDrop={(e) => {
            e.preventDefault();
            setSobre(null);
            const id = e.dataTransfer.getData('text/plain');
            if (id) void aoMover(id, coluna.estado);
          }}
        >
          <Card
            title={coluna.rotulo}
            action={
              <Badge tone={coluna.estado === 'feito' ? 'delivered' : 'neutral'} dot={false}>
                {coluna.tarefas.length}
              </Badge>
            }
            bodyStyle={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-5)',
              minHeight: 120,
              // O realce só aparece enquanto algo paira sobre a coluna: é o que
              // diz onde a tarefa vai cair antes de eu soltar.
              outline:
                sobre === coluna.estado
                  ? 'var(--bw-focus) solid var(--border-focus)'
                  : 'none',
              outlineOffset: 'calc(var(--sp-2) * -1)',
              borderRadius: 'var(--r-card)',
            }}
          >
            {coluna.tarefas.length === 0 ? (
              <p
                style={{
                  padding: 'var(--sp-9) 0',
                  textAlign: 'center',
                  font: 'var(--type-body)',
                  color: 'var(--text-subtle)',
                }}
              >
                Nada aqui
              </p>
            ) : (
              coluna.tarefas.map((t) => (
                <CartaoTarefa
                  key={t.id}
                  tarefa={t}
                  hoje={hoje}
                  arrastavel={desktop}
                  aoMover={aoMover}
                  aoRemover={() => aoRemover(t.id)}
                />
              ))
            )}
          </Card>
        </div>
      ))}
    </div>
  );
}

function CartaoTarefa({
  tarefa,
  hoje,
  arrastavel,
  aoMover,
  aoRemover,
}: {
  tarefa: Tarefa;
  hoje: string;
  arrastavel: boolean;
  aoMover: (id: string, estado: EstadoTarefa) => Promise<void>;
  aoRemover: () => void;
}) {
  const estado = estadoDe(tarefa);
  const indice = ESTADOS_TAREFA.indexOf(estado);
  const anterior = ESTADOS_TAREFA[indice - 1];
  const proximo = ESTADOS_TAREFA[indice + 1];
  const s = situacao(tarefa, hoje);

  return (
    <div
      draggable={arrastavel}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', tarefa.id)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-5)',
        padding: 'var(--sp-6)',
        borderRadius: 'var(--r-nav)',
        background: 'var(--surface-raised)',
        border: 'var(--bw-hairline) solid var(--border-hairline)',
        cursor: arrastavel ? 'grab' : 'default',
      }}
    >
      <span
        style={{
          font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
          color: estado === 'feito' ? 'var(--text-muted)' : 'var(--text-body)',
          textDecoration: estado === 'feito' ? 'line-through' : 'none',
          overflowWrap: 'anywhere',
        }}
      >
        {tarefa.titulo}
      </span>

      <span
        style={{
          font: 'var(--type-body)',
          color: s === 'atrasada' ? 'var(--orange-500)' : 'var(--text-muted)',
        }}
      >
        {descreverPrazo(tarefa, hoje)}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
        <Badge tone={tarefa.contexto === 'pessoal' ? 'ontime' : 'delivered'} dot={false}>
          {ROTULO_CONTEXTO[tarefa.contexto]}
        </Badge>

        <div style={{ display: 'flex', gap: 'var(--sp-3)', marginLeft: 'auto' }}>
          {anterior && (
            <IconButton
              icon="chevron-left"
              label={`Mover ${tarefa.titulo} para ${ROTULO_ESTADO[anterior]}`}
              variant="ghost"
              size={34}
              onClick={() => void aoMover(tarefa.id, anterior)}
            />
          )}
          {proximo && (
            <IconButton
              icon="chevron-right"
              label={`Mover ${tarefa.titulo} para ${ROTULO_ESTADO[proximo]}`}
              variant="ghost"
              size={34}
              onClick={() => void aoMover(tarefa.id, proximo)}
            />
          )}
          <IconButton
            icon="trash-2"
            label={`Remover ${tarefa.titulo}`}
            variant="ghost"
            size={34}
            onClick={aoRemover}
          />
        </div>
      </div>
    </div>
  );
}
