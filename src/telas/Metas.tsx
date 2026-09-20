import React from 'react';
import {
  Card,
  Button,
  Badge,
  Field,
  TextInput,
  Select,
  ProgressBar,
  StatCard,
  IconButton,
  Icon,
  Modal,
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import {
  CONTEXTOS,
  ROTULO_CONTEXTO,
  PERIODOS_DA_META,
  ROTULO_PERIODO_META,
  ROTULO_DIRECAO,
  CATEGORIAS,
  ROTULO_CATEGORIA,
  type Contexto,
  type Meta,
  type FonteDaMeta,
  type PeriodoDaMeta,
  type DirecaoDaMeta,
  type Categoria,
  type TipoLancamento,
} from '../dados/esquema';
import {
  metasEmCurso,
  resumoDeMetas,
  emDinheiro,
  type MedidaDaMeta,
} from '../dominio/meta';
import { diaValido } from '../dominio/rotina';
import { formatarMoeda, formatarNumero, lerMoeda, ordenarPor } from '../formato';
import { useLarguraDesktop } from '../casca/useLarguraDesktop';
import { GRADE_DE_TILES, TRILHO_DE_TILES, ITEM_TRILHO } from '../casca/trilho';

/**
 * Metas — o alvo, e a distância até ele.
 *
 * A tela não calcula nada: `medirMeta` devolve o número, o ritmo e se estou
 * atrasado, e aqui só se escolhe a cor e a palavra. Toda a decisão sobre o que
 * "no alvo" significa mora no domínio, testada.
 */

/** Vezes ou dinheiro — a mesma meta, dois jeitos de ler o número. */
const escrever = (meta: Meta, valor: number): string =>
  emDinheiro(meta) ? formatarMoeda(valor) : formatarNumero(valor);

/**
 * A cor da barra.
 *
 * Verde é "onde eu quero estar", laranja é "precisa de mim". Uma meta de
 * limite que estourou fica laranja mesmo com a barra cheia — cheia ali é o
 * contrário de bom.
 */
function tomDa(medida: MedidaDaMeta): 'green' | 'orange' | 'purple' {
  if (medida.estourou || medida.atrasada) return 'orange';
  if (medida.noAlvo) return 'green';
  return 'purple';
}

/**
 * A linha embaixo da barra: o que este número quer de mim hoje.
 *
 * "18 de 20" sozinho não diz nada — no dia 3 do mês é ótimo, no dia 30 é quase
 * falhar. O que transforma em informação é o ritmo e o que resta.
 */
function recado(medida: MedidaDaMeta): string {
  const { meta, feito, alvo, diasRestantes, porDia } = medida;

  if (medida.janela.vazia) return `Começa em ${meta.inicioEm.split('-').reverse().join('/')}`;

  if (meta.direcao === 'limitar') {
    const sobra = alvo - feito;
    if (sobra < 0) return `Passou ${escrever(meta, -sobra)} do limite`;
    const resta = `Ainda cabem ${escrever(meta, sobra)}`;
    return diasRestantes ? `${resta} · ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}` : resta;
  }

  if (medida.noAlvo) {
    const sobra = feito - alvo;
    return sobra > 0 ? `Cumprida, com ${escrever(meta, sobra)} a mais` : 'Cumprida';
  }

  const falta = `Faltam ${escrever(meta, medida.falta)}`;
  if (!diasRestantes) return falta;
  if (porDia === undefined) return `${falta} · ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`;

  // Menos de um por dia vira "a cada N dias": "0,4 por dia" não é instrução.
  const ritmo = emDinheiro(meta)
    ? `${formatarMoeda(Math.ceil(porDia))} por dia`
    : porDia >= 1
      ? `${formatarNumero(Math.ceil(porDia * 10) / 10)} por dia`
      : `1 a cada ${formatarNumero(Math.floor(1 / porDia))} dias`;

  return `${falta} em ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'} · ${ritmo}`;
}

/** O que a fonte lê, em uma linha, para eu lembrar por que o número mexe. */
function descreverFonte(meta: Meta, nomeDaRotina: (id: string) => string, nomeDoProjeto: (id: string) => string): string {
  const f = meta.fonte;
  switch (f.tipo) {
    case 'manual':
      return 'Marcado por mim';
    case 'rotina':
      return `Conta a rotina "${nomeDaRotina(f.rotinaId)}"`;
    case 'tarefas':
      return f.projetoId
        ? `Tarefas concluídas em "${nomeDoProjeto(f.projetoId)}"`
        : f.contexto
          ? `Tarefas concluídas · ${ROTULO_CONTEXTO[f.contexto]}`
          : 'Tarefas concluídas';
    case 'dinheiro':
      return f.categoria
        ? `${f.movimento === 'entrada' ? 'Entradas' : 'Saídas'} em ${ROTULO_CATEGORIA[f.categoria]}`
        : f.movimento === 'entrada'
          ? 'Tudo que entra'
          : 'Tudo que sai';
  }
}

export function Metas() {
  const { banco, hoje, criarMeta, editarMeta, arquivarMeta, removerMeta, marcarMeta, desmarcarMeta } =
    useBanco();
  const [criando, setCriando] = React.useState(false);
  const [corrigindo, setCorrigindo] = React.useState<Meta | null>(null);
  const [contextoFiltrado, setContextoFiltrado] = React.useState<Contexto | 'tudo'>('tudo');
  const desktop = useLarguraDesktop() !== false;

  const medidas = metasEmCurso(banco, hoje, contextoFiltrado === 'tudo' ? undefined : contextoFiltrado);
  const resumo = resumoDeMetas(medidas);

  const nomeDaRotina = (id: string) => banco.rotinas.find((r) => r.id === id)?.titulo ?? 'rotina apagada';
  const nomeDoProjeto = (id: string) => banco.projetos.find((p) => p.id === id)?.titulo ?? 'projeto apagado';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-8)', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 190, flex: '1 1 var(--grid-min)' }}>
            <Select
              id="meta-contexto"
              value={contextoFiltrado}
              onChange={(v) => setContextoFiltrado(v as Contexto | 'tudo')}
              options={[
                { value: 'tudo', label: 'Pessoal e profissional' },
                ...CONTEXTOS.map((c) => ({ value: c, label: ROTULO_CONTEXTO[c] })),
              ]}
            />
          </div>
          <Button variant="primary" iconRight="plus" onClick={() => setCriando(true)}>
            Nova meta
          </Button>
        </div>
      </Card>

      {resumo.total > 0 && (
        // Trilho no telefone, grade no desktop — a mesma escolha do Início, e
        // pelo mesmo motivo medido: empilhados, os três tiles comiam a primeira
        // tela inteira e a primeira meta só aparecia depois de rolar.
        <div style={desktop ? GRADE_DE_TILES : TRILHO_DE_TILES}>
          <StatCard
            glow
            style={ITEM_TRILHO}
            icon="target"
            value={`${resumo.noAlvo}/${resumo.total}`}
            label="No alvo agora"
          />
          <StatCard
            style={ITEM_TRILHO}
            icon="trending-down"
            value={formatarNumero(resumo.atrasadas)}
            label={resumo.atrasadas === 1 ? 'Meta atrasada' : 'Metas atrasadas'}
          />
          <StatCard
            style={ITEM_TRILHO}
            icon="alert-triangle"
            value={formatarNumero(resumo.estouradas)}
            label={resumo.estouradas === 1 ? 'Limite estourado' : 'Limites estourados'}
          />
        </div>
      )}

      <Card
        title="Em curso"
        subtitle={
          resumo.total === 0
            ? 'Nenhuma meta ainda'
            : `${resumo.total} ${resumo.total === 1 ? 'meta' : 'metas'}`
        }
      >
        {medidas.length === 0 ? (
          <Vazio temFiltro={contextoFiltrado !== 'tudo'} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-10)' }}>
            {medidas.map((medida) => (
              <LinhaDaMeta
                key={medida.meta.id}
                medida={medida}
                fonte={descreverFonte(medida.meta, nomeDaRotina, nomeDoProjeto)}
                aoMarcar={(quanto) => marcarMeta(medida.meta.id, hoje, quanto)}
                aoDesmarcar={() => desmarcarMeta(medida.meta.id, hoje)}
                aoCorrigir={() => setCorrigindo(medida.meta)}
                aoArquivar={() => arquivarMeta(medida.meta.id)}
                aoRemover={() => removerMeta(medida.meta.id)}
              />
            ))}
          </div>
        )}
      </Card>

      {banco.metas.some((m) => m.arquivada) && (
        <Card title="Arquivadas" subtitle="Ficam guardadas; não entram em nenhuma conta">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {ordenarPor(
              banco.metas.filter((m) => m.arquivada),
              (m) => m.titulo,
            ).map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--sp-6)',
                  flexWrap: 'wrap',
                  minHeight: 'var(--tap-min)',
                  padding: 'var(--sp-4) var(--sp-5)',
                  borderRadius: 'var(--r-nav)',
                  background: 'var(--surface-hover)',
                }}
              >
                <span
                  style={{
                    flex: '1 1 var(--grid-min)',
                    minWidth: 0,
                    font: 'var(--type-body)',
                    color: 'var(--text-muted)',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {m.titulo}
                </span>
                <span style={{ display: 'flex', gap: 'var(--sp-3)', flex: '0 0 auto' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => editarMeta(m.id, { arquivada: false })}
                  >
                    Reativar
                  </Button>
                  <IconButton
                    icon="trash-2"
                    label={`Apagar ${m.titulo}`}
                    variant="ghost"
                    size={34}
                    onClick={() => removerMeta(m.id)}
                  />
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Montado só enquanto aberto: um formulário preenchido por efeito depois
          de o diálogo aparecer perde o que eu digitar na brecha. */}
      {(criando || corrigindo) && (
        <FormularioDeMeta
          aberto
          meta={corrigindo}
          hoje={hoje}
          rotinas={banco.rotinas.filter((r) => !r.arquivada)}
          projetos={banco.projetos.filter((p) => !p.arquivadoEm)}
          aoFechar={() => {
            setCriando(false);
            setCorrigindo(null);
          }}
          aoEnviar={async (dados) => {
            if (corrigindo) await editarMeta(corrigindo.id, dados);
            else await criarMeta({ ...dados, arquivada: false });
            setCriando(false);
            setCorrigindo(null);
          }}
        />
      )}
    </div>
  );
}

function Vazio({ temFiltro }: { temFiltro: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--sp-6)',
        padding: 'var(--sp-14) var(--sp-8)',
        textAlign: 'center',
      }}
    >
      <span style={{ color: 'var(--text-subtle)' }}>
        <Icon name="target" size={28} />
      </span>
      <p
        style={{
          font: 'var(--type-body)',
          color: 'var(--text-subtle)',
          maxWidth: 460,
          lineHeight: 'var(--lh-normal)',
        }}
      >
        {temFiltro
          ? 'Nenhuma meta neste contexto.'
          : 'Uma meta é um alvo com prazo: "20 treinos neste mês", "R$ 2.000 guardados neste ano", "não passar de R$ 800 em lazer". Três das quatro fontes contam sozinhas o que você já registra — a meta se preenche enquanto você usa o sistema.'}
      </p>
    </div>
  );
}

function LinhaDaMeta({
  medida,
  fonte,
  aoMarcar,
  aoDesmarcar,
  aoCorrigir,
  aoArquivar,
  aoRemover,
}: {
  medida: MedidaDaMeta;
  fonte: string;
  aoMarcar: (quanto: number) => void;
  aoDesmarcar: () => void;
  aoCorrigir: () => void;
  aoArquivar: () => void;
  aoRemover: () => void;
}) {
  const { meta } = medida;
  const manual = meta.fonte.tipo === 'manual';

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-5)',
          flexWrap: 'wrap',
          marginBottom: 'var(--sp-5)',
        }}
      >
        {/* Sem `flex: 1 1 var(--grid-min)` a descrição some para 0 de largura
            quando os botões entram, medido antes numa linha igual a esta. */}
        <span
          style={{
            flex: '1 1 var(--grid-min)',
            minWidth: 0,
            font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
            color: 'var(--text-heading)',
            overflowWrap: 'anywhere',
          }}
        >
          {meta.titulo}
        </span>

        {medida.estourou && <Badge tone="danger">Estourou</Badge>}
        {medida.atrasada && <Badge tone="delay">Atrasada</Badge>}
        {medida.noAlvo && !medida.estourou && <Badge tone="delivered">No alvo</Badge>}

        <span style={{ display: 'flex', gap: 'var(--sp-3)', flex: '0 0 auto' }}>
          {manual && (
            <>
              <IconButton
                icon="minus"
                label={`Tirar um de ${meta.titulo}`}
                variant="ghost"
                size={34}
                onClick={aoDesmarcar}
              />
              <IconButton
                icon="plus"
                label={`Somar um em ${meta.titulo}`}
                variant="ghost"
                size={34}
                onClick={() => aoMarcar(1)}
              />
            </>
          )}
          <IconButton
            icon="pencil"
            label={`Corrigir ${meta.titulo}`}
            variant="ghost"
            size={34}
            onClick={aoCorrigir}
          />
          <IconButton
            icon="archive"
            label={`Arquivar ${meta.titulo}`}
            variant="ghost"
            size={34}
            onClick={aoArquivar}
          />
          <IconButton
            icon="trash-2"
            label={`Apagar ${meta.titulo}`}
            variant="ghost"
            size={34}
            onClick={aoRemover}
          />
        </span>
      </div>

      <ProgressBar
        value={Math.round(medida.fracao * 100)}
        valueLabel={`${escrever(meta, medida.feito)} / ${escrever(meta, medida.alvo)}`}
        tone={tomDa(medida)}
        label={recado(medida)}
      />

      <p
        style={{
          marginTop: 'var(--sp-4)',
          font: 'var(--type-body)',
          color: 'var(--text-subtle)',
        }}
      >
        {ROTULO_PERIODO_META[meta.periodo]} · {ROTULO_CONTEXTO[meta.contexto]} · {fonte}
      </p>
    </div>
  );
}

/* ── O formulário ────────────────────────────────────────────────────────── */

type DadosDaMeta = Omit<Meta, 'id' | 'criadoEm' | 'alteradoEm' | 'arquivada'>;

function FormularioDeMeta({
  aberto,
  meta,
  hoje,
  rotinas,
  projetos,
  aoFechar,
  aoEnviar,
}: {
  aberto: boolean;
  /** a meta em correção, ou null para uma nova */
  meta: Meta | null;
  hoje: string;
  rotinas: { id: string; titulo: string }[];
  projetos: { id: string; titulo: string }[];
  aoFechar: () => void;
  aoEnviar: (dados: DadosDaMeta) => Promise<void>;
}) {
  // O estado nasce do registro. Preencher por efeito depois de o diálogo abrir
  // sobrescreve o que for digitado na brecha — já aconteceu neste projeto.
  const [titulo, setTitulo] = React.useState(meta?.titulo ?? '');
  const [contexto, setContexto] = React.useState<Contexto>(meta?.contexto ?? 'pessoal');
  const [periodo, setPeriodo] = React.useState<PeriodoDaMeta>(meta?.periodo ?? 'mes');
  const [direcao, setDirecao] = React.useState<DirecaoDaMeta>(meta?.direcao ?? 'atingir');
  const [inicioEm, setInicioEm] = React.useState(meta?.inicioEm ?? hoje);
  const [tipoDeFonte, setTipoDeFonte] = React.useState<FonteDaMeta['tipo']>(meta?.fonte.tipo ?? 'manual');

  const fonte = meta?.fonte;
  const [rotinaId, setRotinaId] = React.useState(
    fonte?.tipo === 'rotina' ? fonte.rotinaId : (rotinas[0]?.id ?? ''),
  );
  const [projetoId, setProjetoId] = React.useState(
    fonte?.tipo === 'tarefas' ? (fonte.projetoId ?? '') : '',
  );
  const [movimento, setMovimento] = React.useState<TipoLancamento>(
    fonte?.tipo === 'dinheiro' ? fonte.movimento : 'entrada',
  );
  const [categoria, setCategoria] = React.useState<Categoria | ''>(
    fonte?.tipo === 'dinheiro' ? (fonte.categoria ?? '') : '',
  );

  const dinheiro = tipoDeFonte === 'dinheiro';
  const [alvo, setAlvo] = React.useState(() => {
    if (!meta) return '';
    return meta.fonte.tipo === 'dinheiro' ? (meta.alvo / 100).toFixed(2).replace('.', ',') : String(meta.alvo);
  });
  const [tentou, setTentou] = React.useState(false);

  // Dinheiro passa por `lerMoeda`, que devolve centavos inteiros; vezes é um
  // inteiro cru. Misturar os dois é como um alvo de "R$ 20" virar 20 centavos.
  const alvoEmNumero = dinheiro ? lerMoeda(alvo) : /^\d+$/.test(alvo.trim()) ? Number(alvo.trim()) : null;

  const erroTitulo = tentou && titulo.trim() === '' ? 'Dê um nome à meta' : undefined;
  const erroAlvo =
    tentou && alvoEmNumero === null
      ? dinheiro
        ? 'Informe um valor'
        : 'Informe um número inteiro'
      : tentou && alvoEmNumero !== null && alvoEmNumero <= 0
        ? 'O alvo precisa ser maior que zero'
        : undefined;
  const erroInicio = tentou && !diaValido(inicioEm) ? 'Data inválida' : undefined;
  const erroRotina =
    tentou && tipoDeFonte === 'rotina' && rotinaId === '' ? 'Escolha uma rotina' : undefined;

  const montarFonte = (): FonteDaMeta => {
    switch (tipoDeFonte) {
      case 'rotina':
        return { tipo: 'rotina', rotinaId };
      case 'tarefas':
        return projetoId === ''
          ? { tipo: 'tarefas', contexto }
          : { tipo: 'tarefas', projetoId };
      case 'dinheiro':
        return categoria === ''
          ? { tipo: 'dinheiro', movimento }
          : { tipo: 'dinheiro', movimento, categoria };
      default:
        return { tipo: 'manual' };
    }
  };

  const enviar = async () => {
    setTentou(true);
    if (titulo.trim() === '' || !diaValido(inicioEm)) return;
    if (alvoEmNumero === null || alvoEmNumero <= 0) return;
    if (tipoDeFonte === 'rotina' && rotinaId === '') return;

    await aoEnviar({
      titulo: titulo.trim(),
      contexto,
      alvo: alvoEmNumero,
      periodo,
      direcao,
      fonte: montarFonte(),
      inicioEm,
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
            {meta ? 'Corrigir meta' : 'Nova meta'}
          </h2>
          <p
            style={{
              font: 'var(--type-page-subtitle)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
            }}
          >
            Um alvo, uma janela, e de onde o número sai
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={aoFechar}>
            Cancelar
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={enviar}>
            {meta ? 'Salvar' : 'Criar meta'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
        <Field label="O que você quer" htmlFor="meta-titulo" required error={erroTitulo}>
          <TextInput
            id="meta-titulo"
            value={titulo}
            onChange={setTitulo}
            placeholder="Treinar 20 vezes"
            invalid={!!erroTitulo}
            size="lg"
            fullWidth
          />
        </Field>

        <Field label="De onde vem o número" htmlFor="meta-fonte" error={erroRotina}>
          <Select
            id="meta-fonte"
            value={tipoDeFonte}
            onChange={(v) => setTipoDeFonte(v as FonteDaMeta['tipo'])}
            size="lg"
            fullWidth
            options={[
              { value: 'rotina', label: 'Conta uma rotina que eu já tenho' },
              { value: 'tarefas', label: 'Conta tarefas concluídas' },
              { value: 'dinheiro', label: 'Soma lançamentos do financeiro' },
              { value: 'manual', label: 'Eu marco à mão' },
            ]}
          />
        </Field>

        {tipoDeFonte === 'rotina' && (
          <Field label="Qual rotina" htmlFor="meta-rotina" required>
            {rotinas.length === 0 ? (
              <p style={{ font: 'var(--type-body)', color: 'var(--text-subtle)' }}>
                Você ainda não tem rotina ativa. Crie uma em Rotina, ou escolha outra fonte.
              </p>
            ) : (
              <Select
                id="meta-rotina"
                value={rotinaId}
                onChange={setRotinaId}
                size="lg"
                fullWidth
                options={rotinas.map((r) => ({ value: r.id, label: r.titulo }))}
              />
            )}
          </Field>
        )}

        {tipoDeFonte === 'tarefas' && (
          <Field label="De qual projeto" htmlFor="meta-projeto">
            <Select
              id="meta-projeto"
              value={projetoId}
              onChange={setProjetoId}
              size="lg"
              fullWidth
              options={[
                { value: '', label: 'Qualquer tarefa do contexto' },
                ...projetos.map((p) => ({ value: p.id, label: p.titulo })),
              ]}
            />
          </Field>
        )}

        {tipoDeFonte === 'dinheiro' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min), 1fr))',
              gap: 'var(--sp-8)',
            }}
          >
            <Field label="O que somar" htmlFor="meta-movimento">
              <Select
                id="meta-movimento"
                value={movimento}
                onChange={(v) => setMovimento(v as TipoLancamento)}
                size="lg"
                fullWidth
                options={[
                  { value: 'entrada', label: 'O que entra' },
                  { value: 'saida', label: 'O que sai' },
                ]}
              />
            </Field>
            <Field label="Categoria" htmlFor="meta-categoria">
              <Select
                id="meta-categoria"
                value={categoria}
                onChange={(v) => setCategoria(v as Categoria | '')}
                size="lg"
                fullWidth
                options={[
                  { value: '', label: 'Todas' },
                  ...CATEGORIAS.map((c) => ({ value: c, label: ROTULO_CATEGORIA[c] })),
                ]}
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
          <Field label="Direção" htmlFor="meta-direcao">
            <Select
              id="meta-direcao"
              value={direcao}
              onChange={(v) => setDirecao(v as DirecaoDaMeta)}
              size="lg"
              fullWidth
              options={(['atingir', 'limitar'] as DirecaoDaMeta[]).map((d) => ({
                value: d,
                label: ROTULO_DIRECAO[d],
              }))}
            />
          </Field>

          <Field
            label={dinheiro ? 'Quanto' : 'Quantas vezes'}
            htmlFor="meta-alvo"
            required
            error={erroAlvo}
          >
            <TextInput
              id="meta-alvo"
              type={dinheiro ? 'money' : 'number'}
              value={alvo}
              onChange={setAlvo}
              placeholder={dinheiro ? '0,00' : '20'}
              invalid={!!erroAlvo}
              size="lg"
              fullWidth
            />
          </Field>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min), 1fr))',
            gap: 'var(--sp-8)',
          }}
        >
          <Field label="Janela" htmlFor="meta-periodo">
            <Select
              id="meta-periodo"
              value={periodo}
              onChange={(v) => setPeriodo(v as PeriodoDaMeta)}
              size="lg"
              fullWidth
              options={PERIODOS_DA_META.map((p) => ({ value: p, label: ROTULO_PERIODO_META[p] }))}
            />
          </Field>

          <Field label="Contexto" htmlFor="meta-contexto-form">
            <Select
              id="meta-contexto-form"
              value={contexto}
              onChange={(v) => setContexto(v as Contexto)}
              size="lg"
              fullWidth
              options={CONTEXTOS.map((c) => ({ value: c, label: ROTULO_CONTEXTO[c] }))}
            />
          </Field>
        </div>

        <Field
          label="Vale a partir de"
          htmlFor="meta-inicio"
          error={erroInicio}
          help="O que aconteceu antes desta data não conta"
        >
          <TextInput
            id="meta-inicio"
            type="date"
            value={inicioEm}
            onChange={setInicioEm}
            invalid={!!erroInicio}
            size="lg"
            fullWidth
          />
        </Field>
      </div>
    </Modal>
  );
}
