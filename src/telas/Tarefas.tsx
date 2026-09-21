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
  type RepeticaoDaTarefa,
  type Rotulo,
  type PeriodoRecorrencia,
  ROTULO_PERIODO,
} from '../dados/esquema';
import {
  ordenarTarefas,
  situacao,
  descreverPrazo,
  resumoTarefas,
  quadroPor,
  estadoDe,
  ROTULO_AGRUPAMENTO,
  type Situacao,
  type Agrupamento,
  type ColunaAgrupada,
} from '../dominio/tarefa';
import { diaValido } from '../dominio/rotina';
import { horaValida } from '../dominio/calendario';
import { descreverRepeticao, ehAUltima } from '../dominio/repeticao';
import { useLarguraDesktop } from '../casca/useLarguraDesktop';

type Filtro = 'pendentes' | 'todas' | 'concluidas';
type Visao = 'lista' | 'quadro';

const AGRUPAMENTOS: Agrupamento[] = ['estado', 'prazo', 'projeto', 'contexto'];

/** Tarefa — o que tem fim, com prazo quando faz sentido ter. */
export function Tarefas() {
  const {
    banco,
    hoje,
    criarTarefa,
    editarTarefa,
    alternarTarefa,
    pularTarefa,
    removerTarefa,
    mudarEstadoTarefa,
  } =
    useBanco();
  const projetosAtivos = banco.projetos.filter((p) => !p.arquivadoEm);
  const [criando, setCriando] = React.useState(false);
  /** a tarefa aberta para correção, ou null */
  const [corrigindo, setCorrigindo] = React.useState<Tarefa | null>(null);
  const [filtro, setFiltro] = React.useState<Filtro>('pendentes');
  const rotulosVivos = banco.rotulos.filter((r) => !r.arquivado);
  const [visao, setVisao] = React.useState<Visao>('lista');
  const [agrupamento, setAgrupamento] = React.useState<Agrupamento>('estado');

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

          {/* No quadro o filtro dá lugar ao eixo: a coluna já é o filtro. */}
          {visao === 'quadro' && (
            <div style={{ minWidth: 170 }}>
              <Select
                id="tar-agrupar"
                value={agrupamento}
                onChange={(v) => setAgrupamento(v as Agrupamento)}
                options={AGRUPAMENTOS.map((a) => ({ value: a, label: ROTULO_AGRUPAMENTO[a] }))}
              />
            </div>
          )}

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
          colunas={quadroPor(banco, agrupamento, hoje)}
          hoje={hoje}
          aoMover={mudarEstadoTarefa}
          aoCorrigir={setCorrigindo}
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
                aoPular={() => pularTarefa(t.id)}
                aoCorrigir={() => setCorrigindo(t)}
                aoRemover={() => removerTarefa(t.id)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Montado só quando aberto: cada abertura começa do zero, sem efeito
          de limpeza correndo atrás. */}
      {criando && (
        <FormularioTarefa
          aberto
          rotulos={rotulosVivos}
          projetos={projetosAtivos}
          aoFechar={() => setCriando(false)}
          aoEnviar={async (dados) => {
            await criarTarefa(dados);
            setCriando(false);
          }}
        />
      )}

      {corrigindo && (
        <FormularioTarefa
          aberto
          rotulos={rotulosVivos}
          projetos={projetosAtivos}
          tarefa={corrigindo}
          aoFechar={() => setCorrigindo(null)}
          aoEnviar={async (dados) => {
            await editarTarefa(corrigindo.id, dados);
            setCorrigindo(null);
          }}
        />
      )}
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
  aoCorrigir,
  aoRemover,
  aoPular: aoPularTarefa,
}: {
  tarefa: Tarefa;
  hoje: string;
  aoAlternar: () => void;
  aoCorrigir?: () => void;
  aoRemover?: () => void;
  /** empurra a ocorrência sem marcá-la como feita; só para as que repetem */
  aoPular?: () => void;
}) {
  const s = situacao(tarefa, hoje);
  const feita = s === 'concluida';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        // Quebra, e não uma linha só.
        //
        // Com duas etiquetas e até três botões à direita, `flex: 1` no título
        // o espremia até zero e o texto descia uma letra por linha no iPhone —
        // fotografado. É o mesmo defeito que a linha do Financeiro teve quando
        // ganhou o lápis, e a correção é a mesma: a coluna do texto pede
        // `--grid-min` e a linha quebra quando não cabe.
        flexWrap: 'wrap',
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
        style={{ flex: '1 1 var(--grid-min)', minWidth: 0, alignItems: 'center' }}
        label={
          <span style={{ minWidth: 0, display: 'block' }}>
            <span
              style={{
                display: 'block',
                font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                color: feita ? 'var(--text-muted)' : 'var(--text-body)',
                textDecoration: feita ? 'line-through' : 'none',
                // Quebra, não corta: no telefone sobram uns 100px para o
                // título, e "Pagar o boleto…" não diz qual boleto.
                overflowWrap: 'anywhere',
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
              {tarefa.repeticao ? ` · ${descreverRepeticao(tarefa.repeticao).toLowerCase()}` : ''}
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

      {/* Pular empurra a ocorrência sem fingir que ela foi feita: marcar como
          concluído o que não aconteceu estragaria sequência, meta e gráfico. */}
      {aoPularTarefa && tarefa.repeticao && !feita && !ehAUltima(tarefa) && (
        <IconButton
          icon="skip-forward"
          label={`Pular esta ocorrência de ${tarefa.titulo}`}
          variant="ghost"
          size={34}
          onClick={aoPularTarefa}
        />
      )}

      {aoCorrigir && (
        <IconButton
          icon="pencil"
          label={`Corrigir ${tarefa.titulo}`}
          variant="ghost"
          size={34}
          onClick={aoCorrigir}
        />
      )}

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
  hora?: string;
  anotacao?: string;
  projetoId?: string;
  repeticao?: RepeticaoDaTarefa;
  duracao?: number;
  rotuloId?: string;
}

/**
 * Minutos de um campo de texto.
 *
 * Vazio, zero e lixo viram `undefined` — que é "não declarei", e não "declarei
 * zero". A diferença importa: sem declaração o sistema usa o bloco padrão da
 * jornada; com zero declarado, o compromisso não ocuparia tempo nenhum.
 */
export function lerMinutos(texto: string): number | undefined {
  const n = Math.trunc(Number(texto.trim()));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Valor do Select quando a tarefa não pertence a projeto nenhum. */
const SEM_PROJETO = '';

/**
 * O formulário de tarefa, reusado pela tela de Projetos.
 *
 * Com `projetoFixo` o seletor de projeto some: quem abriu o formulário de
 * dentro de um projeto já disse a qual projeto a tarefa pertence, e oferecer a
 * escolha de novo seria convidar a contradizê-la.
 *
 * Com `tarefa` ele corrige em vez de criar. É o mesmo formulário de propósito:
 * dois formulários para o mesmo registro divergem na primeira regra nova que
 * só um dos dois receber.
 */
export function FormularioTarefa({
  aberto,
  projetos,
  projetoFixo,
  tarefa,
  rotulos,
  diaInicial,
  aoFechar,
  aoEnviar,
}: {
  aberto: boolean;
  projetos: Projeto[];
  projetoFixo?: string;
  /** quando presente, o formulário corrige esta tarefa */
  tarefa?: Tarefa;
  /** o catálogo de rótulos vivos, para o seletor */
  rotulos: Rotulo[];
  /**
   * O prazo com que uma tarefa **nova** nasce.
   *
   * Existe para o calendário: clicar no dia 23 e criar uma tarefa tem que
   * criá-la para o dia 23. Não vale na correção — ali o prazo gravado manda.
   */
  diaInicial?: string;
  aoFechar: () => void;
  aoEnviar: (dados: DadosNovos) => Promise<void>;
}) {
  const corrigindo = !!tarefa;

  // O estado nasce do que já está gravado, e não de um efeito que corre depois
  // de a janela abrir: assim era possível digitar no intervalo e ver o texto
  // ser sobrescrito. Quem monta este formulário o monta só quando aberto, e
  // cada abertura é uma montagem nova.
  const [titulo, setTitulo] = React.useState(tarefa?.titulo ?? '');
  const [contexto, setContexto] = React.useState<Contexto>(tarefa?.contexto ?? 'pessoal');
  const [prazo, setPrazo] = React.useState(tarefa?.prazo ?? diaInicial ?? '');
  const [hora, setHora] = React.useState(tarefa?.hora ?? '');
  const [anotacao, setAnotacao] = React.useState(tarefa?.anotacao ?? '');
  const [projetoId, setProjetoId] = React.useState(tarefa?.projetoId ?? SEM_PROJETO);
  const [repete, setRepete] = React.useState<PeriodoRecorrencia | ''>(
    tarefa?.repeticao?.periodo ?? '',
  );
  const [aCada, setACada] = React.useState(String(tarefa?.repeticao?.intervalo ?? 1));
  const [repeteAte, setRepeteAte] = React.useState(tarefa?.repeticao?.ate ?? '');
  const [duracao, setDuracao] = React.useState(
    tarefa?.duracao === undefined ? '' : String(tarefa.duracao),
  );
  const [rotuloId, setRotuloId] = React.useState(tarefa?.rotuloId ?? '');
  const [tentou, setTentou] = React.useState(false);

  const erroTitulo = tentou && titulo.trim() === '' ? 'Dê um nome à tarefa' : undefined;
  const erroPrazo =
    tentou && prazo !== '' && !diaValido(prazo) ? 'Data inválida' : undefined;
  const erroHora =
    tentou && hora !== '' && !horaValida(hora) ? 'Hora inválida' : undefined;
  // "Todo mês" sem data não quer dizer nada: a repetição anda a partir do prazo.
  const erroRepete =
    tentou && repete !== '' && prazo === ''
      ? 'Para repetir, a tarefa precisa de um prazo'
      : undefined;
  const erroAte =
    tentou && repeteAte !== '' && !diaValido(repeteAte)
      ? 'Data inválida'
      : tentou && repeteAte !== '' && prazo !== '' && repeteAte < prazo
        ? 'O fim não pode vir antes do primeiro prazo'
        : undefined;

  const enviar = async () => {
    setTentou(true);
    if (titulo.trim() === '') return;
    if (prazo !== '' && !diaValido(prazo)) return;
    if (hora !== '' && !horaValida(hora)) return;
    if (repete !== '' && prazo === '') return;
    if (repeteAte !== '' && (!diaValido(repeteAte) || (prazo !== '' && repeteAte < prazo))) return;

    await aoEnviar({
      titulo: titulo.trim(),
      contexto,
      prazo: prazo === '' ? undefined : prazo,
      // Hora sem data não tem onde acontecer: a agenda do dia é a do prazo.
      hora: prazo === '' || hora === '' ? undefined : hora,
      anotacao: anotacao.trim() === '' ? undefined : anotacao.trim(),
      projetoId: projetoFixo ?? (projetoId === SEM_PROJETO ? undefined : projetoId),
      duracao: lerMinutos(duracao),
      rotuloId: rotuloId === '' ? undefined : rotuloId,
      // `undefined` apaga o campo na correção — é assim que se para de repetir.
      repeticao:
        repete === '' || prazo === ''
          ? undefined
          : {
              periodo: repete,
              intervalo: Math.max(Math.trunc(Number(aCada)) || 1, 1),
              ate: repeteAte === '' ? undefined : repeteAte,
            },
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
            {corrigindo ? 'Corrigir tarefa' : 'Nova tarefa'}
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
              : 'O que tem fim. Prazo só quando faz sentido ter um'}
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={aoFechar}>
            Cancelar
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={enviar}>
            {corrigindo ? 'Salvar' : 'Criar tarefa'}
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

          <Field
            label="Hora"
            htmlFor="tar-hora"
            help={prazo === '' ? 'Precisa de um prazo antes' : 'Opcional — entra na agenda do dia'}
            error={erroHora}
          >
            <TextInput
              id="tar-hora"
              type="time"
              value={hora}
              onChange={setHora}
              disabled={prazo === ''}
              invalid={!!erroHora}
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

        {/* Repetir.
            A próxima ocorrência nasce ao concluir esta, e não antes: o futuro
            não enche de tarefas que ninguém pediu, e pular três semanas deixa
            uma pendência atrasada em vez de três. */}
        <Field
          label="Repete"
          htmlFor="tar-repete"
          error={erroRepete}
          help={
            repete === ''
              ? 'Opcional — uma tarefa que volta, como pagar o IPVA'
              : 'A próxima nasce quando você concluir esta'
          }
        >
          <Select
            id="tar-repete"
            value={repete}
            onChange={(v) => setRepete(v as PeriodoRecorrencia | '')}
            size="lg"
            fullWidth
            options={[
              { value: '', label: 'Não repete' },
              ...(['semanal', 'mensal', 'anual'] as PeriodoRecorrencia[]).map((p) => ({
                value: p,
                label: ROTULO_PERIODO[p],
              })),
            ]}
          />
        </Field>

        {repete !== '' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min), 1fr))',
              gap: 'var(--sp-8)',
            }}
          >
            <Field label="A cada quantos" htmlFor="tar-acada">
              <TextInput
                id="tar-acada"
                type="number"
                value={aCada}
                onChange={setACada}
                size="lg"
                fullWidth
              />
            </Field>
            <Field label="Até" htmlFor="tar-ate" error={erroAte} help="Opcional — em branco, sem fim">
              <TextInput
                id="tar-ate"
                type="date"
                value={repeteAte}
                onChange={setRepeteAte}
                invalid={!!erroAte}
                size="lg"
                fullWidth
              />
            </Field>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min), 1fr))',
            gap: 'var(--sp-8)',
          }}
        >
          <Field
            label="Quanto tempo toma"
            htmlFor="tar-duracao"
            help="Em minutos, opcional"
          >
            <TextInput
              id="tar-duracao"
              type="number"
              value={duracao}
              onChange={setDuracao}
              placeholder="30"
              size="lg"
              fullWidth
            />
          </Field>

          <Field label="Rótulo" htmlFor="tar-rotulo" help="Opcional — é o que o Calendário mede">
            <Select
              id="tar-rotulo"
              value={rotuloId}
              onChange={setRotuloId}
              size="lg"
              fullWidth
              options={[
                { value: '', label: 'Sem rótulo' },
                ...rotulos.map((r) => ({ value: r.id, label: r.nome })),
              ]}
            />
          </Field>
        </div>

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
export function QuadroTarefas({
  colunas,
  hoje,
  aoMover,
  aoCorrigir,
  aoRemover,
  colunasNaTela = 3,
}: {
  colunas: ColunaAgrupada[];
  hoje: string;
  aoMover: (id: string, estado: EstadoTarefa) => Promise<void>;
  aoCorrigir?: (tarefa: Tarefa) => void;
  aoRemover?: (id: string) => Promise<void>;
  /** quantas colunas cabem lado a lado no desktop */
  colunasNaTela?: number;
}) {
  const desktop = useLarguraDesktop() !== false;
  const [sobre, setSobre] = React.useState<string | null>(null);

  return (
    <div
      style={
        desktop
          ? {
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(colunas.length, colunasNaTela)}, minmax(0, 1fr))`,
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
          key={coluna.chave}
          style={desktop ? { minWidth: 0 } : { flex: '1 0 var(--grid-min)', scrollSnapAlign: 'start' }}
          onDragOver={(e) => {
            // Só o corte por etapa recebe: soltar em "Atrasadas" não teria
            // sentido, e soltar em "Hoje" reescreveria o prazo por baixo.
            if (!desktop || !coluna.soltavel) return;
            e.preventDefault();
            setSobre(coluna.chave);
          }}
          onDragLeave={() => setSobre((s) => (s === coluna.chave ? null : s))}
          onDrop={(e) => {
            if (!coluna.soltavel) return;
            e.preventDefault();
            setSobre(null);
            const id = e.dataTransfer.getData('text/plain');
            if (id) void aoMover(id, coluna.chave as EstadoTarefa);
          }}
        >
          <Card
            title={coluna.rotulo}
            action={
              <Badge tone={coluna.chave === 'feito' ? 'delivered' : 'neutral'} dot={false}>
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
                sobre === coluna.chave
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
                  arrastavel={desktop && coluna.soltavel}
                  aoMover={aoMover}
                  aoCorrigir={aoCorrigir ? () => aoCorrigir(t) : undefined}
                  aoRemover={aoRemover ? () => aoRemover(t.id) : undefined}
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
  aoCorrigir,
  aoRemover,
}: {
  tarefa: Tarefa;
  hoje: string;
  arrastavel: boolean;
  aoMover: (id: string, estado: EstadoTarefa) => Promise<void>;
  aoCorrigir?: () => void;
  aoRemover?: () => void;
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
          {aoCorrigir && (
            <IconButton
              icon="pencil"
              label={`Corrigir ${tarefa.titulo}`}
              variant="ghost"
              size={34}
              onClick={aoCorrigir}
            />
          )}

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
      </div>
    </div>
  );
}
