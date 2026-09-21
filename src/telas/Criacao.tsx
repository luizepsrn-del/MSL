import React from 'react';
import {
  Card,
  Button,
  Badge,
  Field,
  TextInput,
  Select,
  SearchInput,
  StatCard,
  Icon,
  IconButton,
  Modal,
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import {
  CONTEXTOS,
  ROTULO_CONTEXTO,
  TIPOS_DE_PECA,
  ROTULO_TIPO_PECA,
  ESTADOS_DA_PECA,
  ROTULO_ESTADO_PECA,
  type Contexto,
  type Peca,
  type TipoDePeca,
  type EstadoDaPeca,
} from '../dados/esquema';
import {
  contar,
  ondeNaoCabe,
  slidesDe,
  slideMaisLongo,
  resumirCriacao,
  descreverPublicacao,
  estaAtrasada,
  filtrarPecas,
  lerEtiquetas,
  comoHtml,
  comoTexto,
  nomeDeArquivo,
  SEPARADOR,
} from '../dominio/criacao';
import { diaValido } from '../dominio/rotina';
import { formatarNumero } from '../formato';
import { useLarguraDesktop } from '../casca/useLarguraDesktop';
import { GRADE_DE_TILES, TRILHO_DE_TILES, ITEM_TRILHO } from '../casca/trilho';

/**
 * Criação — onde o que eu escrevo mora.
 *
 * Documento, post, carrossel, prompt, ideia. Um editor só para todos: o que
 * muda é o que a tela mostra ao lado, não o formato do que fica guardado.
 *
 * Tudo que é conta ou texto vem do domínio, provado. Aqui só fica o que
 * depende do navegador de verdade: baixar um arquivo, copiar para a área de
 * transferência e abrir a janela de impressão — que é de onde sai o PDF.
 */

const ICONE_DO_TIPO: Record<TipoDePeca, string> = {
  ideia: 'lightbulb',
  post: 'message-square',
  carrossel: 'layers',
  documento: 'file-text',
  prompt: 'sparkles',
  roteiro: 'clapperboard',
};

const TOM_DO_ESTADO: Record<EstadoDaPeca, 'neutral' | 'ontime' | 'delivered'> = {
  semente: 'neutral',
  rascunho: 'neutral',
  pronto: 'ontime',
  publicado: 'delivered',
};

/* ── O que só o navegador faz ────────────────────────────────────────────── */

/** Baixa um texto como arquivo. */
function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * O PDF sai da impressão do navegador, e não de uma biblioteca.
 *
 * É uma escolha: gerar PDF em JavaScript custa uma dependência grande, fontes
 * embutidas e uma renderização que nunca bate com o que se vê. A janela de
 * impressão usa o motor do próprio sistema, e "Salvar como PDF" está lá em
 * todo Mac e todo iPhone. O arquivo sai melhor e não entra dependência nenhuma.
 */
function imprimir(html: string) {
  const janela = window.open('', '_blank');
  if (!janela) return false;
  janela.document.write(html);
  janela.document.close();
  // Sem o atraso, o Safari imprime antes de o estilo ser aplicado e o PDF sai
  // sem formatação nenhuma.
  janela.setTimeout(() => janela.print(), 250);
  return true;
}

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

/* ── A tela ──────────────────────────────────────────────────────────────── */

export function Criacao() {
  const { banco, hoje, criarPeca, editarPeca, removerPeca, publicarPeca } = useBanco();
  const desktop = useLarguraDesktop() !== false;

  const [criando, setCriando] = React.useState(false);
  const [editando, setEditando] = React.useState<Peca | null>(null);
  const [busca, setBusca] = React.useState('');
  const [tipo, setTipo] = React.useState<TipoDePeca | 'tudo'>('tudo');
  const [estado, setEstado] = React.useState<EstadoDaPeca | 'tudo'>('tudo');
  const [aviso, setAviso] = React.useState<string | null>(null);

  const resumo = resumirCriacao(banco.pecas, hoje);
  const visiveis = filtrarPecas(banco.pecas, {
    busca,
    tipo: tipo === 'tudo' ? undefined : tipo,
    estado: estado === 'tudo' ? undefined : estado,
  }).sort((a, b) => {
    // O que pede data primeiro, depois o mais mexido recentemente. Ordem
    // alfabética esconderia justo o que está para sair.
    const pesoA = estaAtrasada(a, hoje) ? 0 : a.publicarEm ? 1 : 2;
    const pesoB = estaAtrasada(b, hoje) ? 0 : b.publicarEm ? 1 : 2;
    if (pesoA !== pesoB) return pesoA - pesoB;
    if (a.publicarEm && b.publicarEm && a.publicarEm !== b.publicarEm) {
      return a.publicarEm < b.publicarEm ? -1 : 1;
    }
    return a.alteradoEm > b.alteradoEm ? -1 : a.alteradoEm < b.alteradoEm ? 1 : 0;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
          <SearchInput
            value={busca}
            onChange={setBusca}
            placeholder="Procurar no título, no texto e nas etiquetas"
            size="lg"
            fullWidth
          />
          <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
              <Select
                id="cri-tipo"
                value={tipo}
                onChange={(v) => setTipo(v as TipoDePeca | 'tudo')}
                options={[
                  { value: 'tudo', label: 'Todos os tipos' },
                  ...TIPOS_DE_PECA.map((t) => ({ value: t, label: ROTULO_TIPO_PECA[t] })),
                ]}
              />
            </div>
            <div style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
              <Select
                id="cri-estado"
                value={estado}
                onChange={(v) => setEstado(v as EstadoDaPeca | 'tudo')}
                options={[
                  { value: 'tudo', label: 'Em qualquer pé' },
                  ...ESTADOS_DA_PECA.map((e) => ({ value: e, label: ROTULO_ESTADO_PECA[e] })),
                ]}
              />
            </div>
            <Button variant="primary" iconRight="plus" onClick={() => setCriando(true)}>
              Criar
            </Button>
          </div>
        </div>
      </Card>

      {banco.pecas.length > 0 && (
        <div style={desktop ? GRADE_DE_TILES : TRILHO_DE_TILES}>
          <StatCard
            glow
            style={ITEM_TRILHO}
            icon="lightbulb"
            value={formatarNumero(resumo.porEstado.semente)}
            label="Sementes"
          />
          <StatCard
            style={ITEM_TRILHO}
            icon="pencil"
            value={formatarNumero(resumo.porEstado.rascunho)}
            label="Rascunhos"
          />
          <StatCard
            style={ITEM_TRILHO}
            icon="circle-check"
            value={formatarNumero(resumo.porEstado.pronto)}
            label="Prontos"
            delta={resumo.prontasSemData > 0 ? `${resumo.prontasSemData} sem data` : undefined}
          />
          <StatCard
            style={ITEM_TRILHO}
            icon="send"
            value={formatarNumero(resumo.porEstado.publicado)}
            label="Publicados"
            delta={resumo.atrasadas > 0 ? `${resumo.atrasadas} atrasada${resumo.atrasadas > 1 ? 's' : ''}` : undefined}
            deltaTone="delay"
          />
        </div>
      )}

      {aviso && (
        <Card>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>{aviso}</p>
        </Card>
      )}

      <Card
        title="O que eu escrevi"
        subtitle={
          banco.pecas.length === 0
            ? 'Nada ainda'
            : `${visiveis.length} de ${banco.pecas.length}`
        }
      >
        {visiveis.length === 0 ? (
          <Vazio temFiltro={banco.pecas.length > 0} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {visiveis.map((p) => (
              <LinhaDaPeca
                key={p.id}
                peca={p}
                hoje={hoje}
                aoAbrir={() => setEditando(p)}
                aoPublicar={() => publicarPeca(p.id)}
                aoRemover={() => removerPeca(p.id)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Montado só enquanto aberto: um editor preenchido por efeito depois de
          o diálogo aparecer perde o que eu digitar na brecha. */}
      {(criando || editando) && (
        <Editor
          peca={editando}
          projetos={banco.projetos.filter((p) => !p.arquivadoEm)}
          aoFechar={() => {
            setCriando(false);
            setEditando(null);
          }}
          aoAvisar={setAviso}
          aoEnviar={async (dados) => {
            if (editando) await editarPeca(editando.id, dados);
            else await criarPeca({ ...dados, publicadoEm: undefined });
            setCriando(false);
            setEditando(null);
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
        <Icon name="pen-line" size={28} />
      </span>
      <p
        style={{
          font: 'var(--type-body)',
          color: 'var(--text-subtle)',
          maxWidth: 480,
          lineHeight: 'var(--lh-normal)',
        }}
      >
        {temFiltro
          ? 'Nada com esse recorte.'
          : 'Aqui mora o que você escreve: ideia solta, post, carrossel, documento, prompt. Uma peça com data de publicar aparece no calendário e na fila do dia — é o que separa isto de mais um caderno de anotações.'}
      </p>
    </div>
  );
}

function LinhaDaPeca({
  peca,
  hoje,
  aoAbrir,
  aoPublicar,
  aoRemover,
}: {
  peca: Peca;
  hoje: string;
  aoAbrir: () => void;
  aoPublicar: () => void;
  aoRemover: () => void;
}) {
  const atrasada = estaAtrasada(peca, hoje);
  const c = contar(peca);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        // Quebra em vez de espremer: duas etiquetas e três botões já
        // esmagaram o texto a uma letra por linha noutra tela deste projeto.
        flexWrap: 'wrap',
        gap: 'var(--sp-6)',
        minHeight: 'var(--tap-min)',
        padding: 'var(--sp-4) var(--sp-5)',
        borderRadius: 'var(--r-nav)',
        background: peca.publicadoEm ? 'transparent' : 'var(--surface-raised)',
        opacity: peca.publicadoEm ? 0.65 : 1,
      }}
    >
      <span style={{ color: 'var(--text-muted)', display: 'flex', flex: '0 0 auto' }}>
        <Icon name={ICONE_DO_TIPO[peca.tipo]} size={18} />
      </span>

      <button
        type="button"
        onClick={aoAbrir}
        style={{
          flex: '1 1 var(--grid-min)',
          minWidth: 0,
          textAlign: 'left',
          background: 'none',
          border: 0,
          padding: 0,
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            display: 'block',
            font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
            color: 'var(--text-body)',
            overflowWrap: 'anywhere',
          }}
        >
          {peca.titulo}
        </span>
        <span
          style={{
            display: 'block',
            font: 'var(--type-body)',
            color: atrasada ? 'var(--orange-500)' : 'var(--text-muted)',
          }}
        >
          {descreverPublicacao(peca, hoje)}
          {c.palavras > 0 && ` · ${formatarNumero(c.palavras)} palavras`}
          {c.slides > 0 && ` · ${c.slides} slides`}
        </span>
      </button>

      <Badge tone={TOM_DO_ESTADO[peca.estado]} dot={false}>
        {ROTULO_ESTADO_PECA[peca.estado]}
      </Badge>

      <span style={{ display: 'flex', gap: 'var(--sp-3)', flex: '0 0 auto' }}>
        {!peca.publicadoEm && peca.estado === 'pronto' && (
          <IconButton
            icon="send"
            label={`Marcar ${peca.titulo} como publicado`}
            variant="ghost"
            size={34}
            onClick={aoPublicar}
          />
        )}
        <IconButton
          icon="pencil"
          label={`Abrir ${peca.titulo}`}
          variant="ghost"
          size={34}
          onClick={aoAbrir}
        />
        <IconButton
          icon="trash-2"
          label={`Apagar ${peca.titulo}`}
          variant="ghost"
          size={34}
          onClick={aoRemover}
        />
      </span>
    </div>
  );
}

/* ── O editor ────────────────────────────────────────────────────────────── */

type DadosDaPeca = Omit<Peca, 'id' | 'criadoEm' | 'alteradoEm' | 'publicadoEm'>;

function Editor({
  peca,
  projetos,
  aoFechar,
  aoEnviar,
  aoAvisar,
}: {
  peca: Peca | null;
  projetos: { id: string; titulo: string }[];
  aoFechar: () => void;
  aoEnviar: (dados: DadosDaPeca) => Promise<void>;
  aoAvisar: (texto: string | null) => void;
}) {
  const [titulo, setTitulo] = React.useState(peca?.titulo ?? '');
  const [tipo, setTipo] = React.useState<TipoDePeca>(peca?.tipo ?? 'ideia');
  const [estado, setEstado] = React.useState<EstadoDaPeca>(peca?.estado ?? 'semente');
  const [contexto, setContexto] = React.useState<Contexto>(peca?.contexto ?? 'profissional');
  const [corpo, setCorpo] = React.useState(peca?.corpo ?? '');
  const [etiquetas, setEtiquetas] = React.useState((peca?.etiquetas ?? []).join(', '));
  const [publicarEm, setPublicarEm] = React.useState(peca?.publicarEm ?? '');
  const [projetoId, setProjetoId] = React.useState(peca?.projetoId ?? '');
  const [tentou, setTentou] = React.useState(false);

  const c = contar({ corpo, tipo });
  const apertos = ondeNaoCabe(tipo === 'carrossel' ? slideMaisLongo(corpo) : c.caracteres);
  const paraExportar = { titulo: titulo.trim() || 'Sem título', corpo, tipo };

  const erroTitulo = tentou && titulo.trim() === '' ? 'Dê um nome à peça' : undefined;
  const erroData =
    tentou && publicarEm !== '' && !diaValido(publicarEm) ? 'Data inválida' : undefined;

  const enviar = async () => {
    setTentou(true);
    if (titulo.trim() === '') return;
    if (publicarEm !== '' && !diaValido(publicarEm)) return;

    await aoEnviar({
      titulo: titulo.trim(),
      tipo,
      estado,
      contexto,
      corpo,
      etiquetas: lerEtiquetas(etiquetas),
      publicarEm: publicarEm === '' ? undefined : publicarEm,
      projetoId: projetoId === '' ? undefined : projetoId,
    });
  };

  return (
    <Modal
      open
      onClose={aoFechar}
      closeLabel="Fechar"
      width={720}
      header={
        <div>
          <h2
            style={{
              font: 'var(--fw-semibold) var(--fs-heading)/1.25 var(--font-core)',
              color: 'var(--text-heading)',
            }}
          >
            {peca ? 'Editar' : 'Criar'}
          </h2>
          <p
            style={{
              font: 'var(--type-page-subtitle)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
            }}
          >
            {formatarNumero(c.palavras)} palavras · {formatarNumero(c.caracteres)} caracteres
            {c.slides > 0 && ` · ${c.slides} slides`}
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={aoFechar}>
            Cancelar
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={enviar}>
            Salvar
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
        <Field label="Título" htmlFor="cri-titulo" required error={erroTitulo}>
          <TextInput
            id="cri-titulo"
            value={titulo}
            onChange={setTitulo}
            placeholder="Três coisas que eu aprendi este mês"
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
          <Field label="Tipo" htmlFor="cri-tipo-form">
            <Select
              id="cri-tipo-form"
              value={tipo}
              onChange={(v) => setTipo(v as TipoDePeca)}
              size="lg"
              fullWidth
              options={TIPOS_DE_PECA.map((t) => ({ value: t, label: ROTULO_TIPO_PECA[t] }))}
            />
          </Field>
          <Field label="Em que pé" htmlFor="cri-estado-form">
            <Select
              id="cri-estado-form"
              value={estado}
              onChange={(v) => setEstado(v as EstadoDaPeca)}
              size="lg"
              fullWidth
              options={ESTADOS_DA_PECA.map((e) => ({ value: e, label: ROTULO_ESTADO_PECA[e] }))}
            />
          </Field>
          <Field label="Contexto" htmlFor="cri-contexto">
            <Select
              id="cri-contexto"
              value={contexto}
              onChange={(v) => setContexto(v as Contexto)}
              size="lg"
              fullWidth
              options={CONTEXTOS.map((x) => ({ value: x, label: ROTULO_CONTEXTO[x] }))}
            />
          </Field>
        </div>

        <Field
          label="O texto"
          htmlFor="cri-corpo"
          help={
            tipo === 'carrossel'
              ? `Uma linha com ${SEPARADOR} separa um slide do outro`
              : 'Uma linha em branco separa parágrafo'
          }
        >
          <TextInput
            id="cri-corpo"
            type="multiline"
            rows={12}
            value={corpo}
            onChange={setCorpo}
            size="lg"
            fullWidth
          />
        </Field>

        {/* Só aparece onde estourou: mostrar os três limites sempre viraria
            decoração, e o número que importa é o que já está errado. */}
        {apertos.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--sp-5)', flexWrap: 'wrap' }}>
            {apertos.map((a) => (
              <Badge key={a.nome} tone="delay">
                {a.nome}: {formatarNumero(a.excedeu)} a mais
                {tipo === 'carrossel' ? ' no maior slide' : ''}
              </Badge>
            ))}
          </div>
        )}

        {tipo === 'carrossel' && slidesDe(corpo).length > 0 && (
          <PreviaDoCarrossel slides={slidesDe(corpo)} />
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min), 1fr))',
            gap: 'var(--sp-8)',
          }}
        >
          <Field
            label="Publicar em"
            htmlFor="cri-data"
            error={erroData}
            help="Com data, ela entra no calendário e na fila do dia"
          >
            <TextInput
              id="cri-data"
              type="date"
              value={publicarEm}
              onChange={setPublicarEm}
              invalid={!!erroData}
              size="lg"
              fullWidth
            />
          </Field>
          <Field label="Etiquetas" htmlFor="cri-etiquetas" help="Separadas por vírgula">
            <TextInput
              id="cri-etiquetas"
              value={etiquetas}
              onChange={setEtiquetas}
              placeholder="lançamento, bastidores"
              size="lg"
              fullWidth
            />
          </Field>
        </div>

        {projetos.length > 0 && (
          <Field label="Projeto" htmlFor="cri-projeto" help="Opcional">
            <Select
              id="cri-projeto"
              value={projetoId}
              onChange={setProjetoId}
              size="lg"
              fullWidth
              options={[
                { value: '', label: 'Sem projeto' },
                ...projetos.map((p) => ({ value: p.id, label: p.titulo })),
              ]}
            />
          </Field>
        )}

        {/* Sem `htmlFor`: aqui não há um controle para o rótulo apontar, são
            quatro botões. O `Field` continua servindo pelo título e pelo
            espaçamento. */}
        <Field label="Levar para fora">
          <div style={{ display: 'flex', gap: 'var(--sp-5)', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              iconLeft="copy"
              onClick={async () =>
                aoAvisar(
                  (await copiar(comoTexto(paraExportar)))
                    ? 'Copiado.'
                    : 'O navegador não deixou copiar. Selecione o texto e copie à mão.',
                )
              }
            >
              Copiar
            </Button>
            <Button
              variant="secondary"
              iconLeft="file-text"
              onClick={() =>
                baixar(
                  nomeDeArquivo(paraExportar.titulo, 'md'),
                  comoTexto(paraExportar),
                  'text/markdown;charset=utf-8',
                )
              }
            >
              Baixar .md
            </Button>
            <Button
              variant="secondary"
              iconLeft="code"
              onClick={() =>
                baixar(
                  nomeDeArquivo(paraExportar.titulo, 'html'),
                  comoHtml(paraExportar),
                  'text/html;charset=utf-8',
                )
              }
            >
              Baixar .html
            </Button>
            <Button
              variant="secondary"
              iconLeft="printer"
              onClick={() =>
                aoAvisar(
                  imprimir(comoHtml(paraExportar))
                    ? null
                    : 'O navegador bloqueou a janela de impressão. Permita janelas deste site e tente de novo.',
                )
              }
            >
              PDF
            </Button>
          </div>
        </Field>

        <p
          style={{
            font: 'var(--type-body)',
            color: 'var(--text-subtle)',
            lineHeight: 'var(--lh-normal)',
          }}
        >
          O PDF sai pela janela de impressão do navegador — "Salvar como PDF", que existe no Mac e
          no iPhone. O arquivo sai melhor do que uma biblioteca faria, e o sistema não carrega mais
          uma dependência por causa disso.
        </p>
      </div>
    </Modal>
  );
}

/** Os slides como cartões, para eu ver onde cada um corta. */
function PreviaDoCarrossel({ slides }: { slides: string[] }) {
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
        Como vai ficar
      </p>
      <div
        style={{
          display: 'flex',
          gap: 'var(--sp-6)',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          paddingBottom: 'var(--sp-4)',
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            style={{
              flex: '0 0 var(--grid-min)',
              scrollSnapAlign: 'start',
              position: 'relative',
              padding: 'var(--sp-8)',
              borderRadius: 'var(--r-card)',
              border: 'var(--bw-hairline) solid var(--border-hairline)',
              background: 'var(--surface-raised)',
              font: 'var(--type-body)',
              color: 'var(--text-body)',
              // Preserva as quebras que eu escrevi: num slide elas são o ritmo.
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              lineHeight: 'var(--lh-normal)',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 'var(--sp-4)',
                right: 'var(--sp-5)',
                font: 'var(--type-body)',
                color: 'var(--text-subtle)',
              }}
            >
              {i + 1}/{slides.length}
            </span>
            {slide}
          </div>
        ))}
      </div>
    </div>
  );
}
