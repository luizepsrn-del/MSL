import React from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  Button,
  Badge,
  Select,
  StatCard,
  Icon,
  Modal,
  MetricBarList,
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import { useInstagram, type Instagram } from '../dados/instagram';
import {
  dividirPorPeriodo,
  resumir,
  porFormato,
  recomendar,
  legendaCurta,
  NOME_DO_FORMATO,
  type DadosDoInstagram,
  type FormatoDoPost,
  type Periodo,
  type PostDoInstagram,
  type Recomendacao,
  type Resumo,
} from '../dominio/instagram';
import { diaLocalDe } from '../dominio/rotina';
import { formatarNumero, formatarDataRelativa, formatarData } from '../formato';
import { useLarguraDesktop } from '../casca/useLarguraDesktop';
import { GRADE_DE_TILES, TRILHO_DE_TILES, ITEM_TRILHO } from '../casca/trilho';

/**
 * A aba Instagram da Criação.
 *
 * Tudo aqui é calculado sobre a resposta do momento (`useInstagram`) e nada
 * vai para o banco — com uma exceção, que passa pelo caminho de sempre: ligar
 * uma peça publicada ao post em que ela virou (`editarPeca`).
 */

const TEXTO: React.CSSProperties = {
  font: 'var(--type-body)',
  color: 'var(--text-muted)',
  lineHeight: 'var(--lh-normal)',
};

const COLUNA: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' };

const fmt = (v: number | null, casas = 0) =>
  v === null ? '—' : formatarNumero(casas ? Math.round(v * 10 ** casas) / 10 ** casas : Math.round(v));

/** A variação contra o período anterior, em valor; some quando não há anterior. */
function variacao(atual: number | null, anterior: number | null, temAnterior: boolean): string | undefined {
  if (!temAnterior || atual === null || anterior === null) return undefined;
  const d = Math.round(atual - anterior);
  if (d === 0) return 'igual ao anterior';
  return `${d > 0 ? '+' : '−'}${formatarNumero(Math.abs(d))} vs anterior`;
}

type Ordem = 'data' | 'alcance' | 'guardados' | 'visitas';

const VALOR_DA_ORDEM: Record<Ordem, (p: PostDoInstagram) => number> = {
  data: (p) => Date.parse(p.publicadoEm),
  alcance: (p) => p.alcance ?? -1,
  guardados: (p) =>
    p.salvamentos === undefined && p.compartilhamentos === undefined
      ? -1
      : (p.salvamentos ?? 0) + (p.compartilhamentos ?? 0),
  visitas: (p) => p.visitasAoPerfil ?? -1,
};

export function PainelDoInstagram() {
  const instagram = useInstagram();

  if (instagram.estado === 'carregando' && !instagram.dados) {
    return (
      <Card title="Instagram" subtitle="Lendo os números…">
        <p style={TEXTO}>Um instante.</p>
      </Card>
    );
  }
  if (instagram.estado !== 'pronto' || !instagram.dados) return <SemDados instagram={instagram} />;
  return <Painel instagram={instagram} dados={instagram.dados} />;
}

function SemDados({ instagram }: { instagram: Instagram }) {
  const mensagens: Record<string, { titulo: string; texto: string }> = {
    desconectado: {
      titulo: 'Instagram não conectado',
      texto: 'Conecte o seu Instagram em Ajustes para ver alcance, salvamentos e o que postar a seguir.',
    },
    'sem-conta': {
      titulo: 'Falta a conta',
      texto: 'O Instagram está conectado, mas falta informar o ID da conta, em Ajustes.',
    },
    'acesso-perdido': {
      titulo: 'A Meta deixou de aceitar a conexão',
      texto: 'O token expirou ou foi retirado. Conecte de novo para voltar a ver os números.',
    },
    erro: {
      titulo: 'Não deu para ler o Instagram agora',
      texto: instagram.erro ?? 'A Meta não respondeu. A conexão continua valendo.',
    },
  };
  const m = mensagens[instagram.estado] ?? mensagens.erro;

  return (
    <Card title={m.titulo}>
      <div style={COLUNA}>
        <p style={TEXTO}>{m.texto}</p>
        <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
          {instagram.estado === 'acesso-perdido' ? (
            <Button variant="primary" size="lg" iconRight="arrow-right" onClick={() => void instagram.conectar()}>
              Conectar de novo
            </Button>
          ) : instagram.estado === 'erro' ? (
            <Button variant="secondary" size="lg" iconLeft="refresh-cw" onClick={() => void instagram.atualizar()}>
              Tentar de novo
            </Button>
          ) : (
            <Link to="/app/ajustes" style={{ color: 'var(--purple-400)', font: 'var(--type-body)' }}>
              Ir para Ajustes
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

function Painel({ instagram, dados }: { instagram: Instagram; dados: DadosDoInstagram }) {
  const { banco, hoje, criarPeca, editarPeca } = useBanco();
  const desktop = useLarguraDesktop() !== false;
  const [periodo, setPeriodo] = React.useState<Periodo>(90);
  const [ordem, setOrdem] = React.useState<Ordem>('data');
  const [ligando, setLigando] = React.useState<PostDoInstagram | null>(null);
  const [aviso, setAviso] = React.useState<string | null>(null);

  const { atual, anterior } = dividirPorPeriodo(dados.posts, periodo, hoje);
  const temAnterior = periodo !== 'tudo' && anterior.length > 0;
  const r = resumir(atual);
  const a = resumir(anterior);
  const formatos = porFormato(atual);
  const recomendacoes = recomendar(atual, anterior, hoje, periodo);
  const posts = [...atual].sort((x, y) => VALOR_DA_ORDEM[ordem](y) - VALOR_DA_ORDEM[ordem](x));
  const pecaDoPost = new Map(
    banco.pecas.filter((p) => p.instagramPostId).map((p) => [p.instagramPostId!, p]),
  );

  async function criarSemente(rec: Recomendacao) {
    await criarPeca({
      titulo: rec.texto,
      tipo: 'ideia',
      estado: 'semente',
      contexto: 'profissional',
      corpo: rec.evidencia,
      publicadoEm: undefined,
    });
    setAviso('Semente criada na aba Peças.');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <Card
        title={`@${dados.perfil.usuario}`}
        subtitle={`${formatarNumero(dados.perfil.seguidores)} seguidores · atualizado ${formatarDataRelativa(new Date(dados.lidoEm))}`}
      >
        <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
            <Select
              id="ig-periodo"
              value={String(periodo)}
              onChange={(v) => setPeriodo(v === 'tudo' ? 'tudo' : (Number(v) as 30 | 90))}
              options={[
                { value: '30', label: 'Últimos 30 dias' },
                { value: '90', label: 'Últimos 90 dias' },
                { value: 'tudo', label: 'Tudo o que a Meta trouxe' },
              ]}
            />
          </div>
          <Button
            variant="secondary"
            iconLeft="refresh-cw"
            disabled={instagram.atualizando}
            onClick={() => void instagram.atualizar()}
          >
            Atualizar
          </Button>
        </div>
      </Card>

      {aviso && (
        <Card>
          <p style={TEXTO}>{aviso}</p>
        </Card>
      )}

      {atual.length === 0 ? (
        <Card title="Nenhum post neste período">
          <p style={TEXTO}>Escolha um período maior para ver os números.</p>
        </Card>
      ) : (
        <>
          <Cartoes r={r} a={a} temAnterior={temAnterior} desktop={desktop} />

          <Card title="Formato" subtitle="Alcance médio por formato, no período">
            <Formatos formatos={formatos} />
          </Card>

          <Card
            title="O que fazer"
            subtitle={recomendacoes.length ? 'Calculado sobre os seus números' : 'Nada se destaca o bastante ainda'}
          >
            <div style={COLUNA}>
              {recomendacoes.map((rec) => (
                <LinhaDaRecomendacao
                  key={rec.tipo}
                  rec={rec}
                  post={dados.posts.find((p) => p.id === rec.postId)}
                  aoCriarSemente={() => void criarSemente(rec)}
                />
              ))}
            </div>
          </Card>

          <Card title="Posts" subtitle={`${atual.length} no período`}>
            <div style={COLUNA}>
              <Select
                id="ig-ordem"
                value={ordem}
                onChange={(v) => setOrdem(v as Ordem)}
                options={[
                  { value: 'data', label: 'Mais recentes' },
                  { value: 'alcance', label: 'Maior alcance' },
                  { value: 'guardados', label: 'Mais salvos e compartilhados' },
                  { value: 'visitas', label: 'Mais visitas ao perfil' },
                ]}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {posts.map((p) => (
                  <LinhaDoPost
                    key={p.id}
                    post={p}
                    pecaLigada={pecaDoPost.get(p.id)?.titulo}
                    aoLigar={() => setLigando(p)}
                  />
                ))}
              </div>
            </div>
          </Card>
        </>
      )}

      {ligando && (
        <Ligar
          post={ligando}
          pecas={banco.pecas.filter((p) => p.estado === 'publicado' && !p.instagramPostId)}
          aoFechar={() => setLigando(null)}
          aoEscolher={async (pecaId) => {
            await editarPeca(pecaId, { instagramPostId: ligando.id });
            setLigando(null);
            setAviso('Peça ligada ao post.');
          }}
        />
      )}
    </div>
  );
}

function Cartoes({ r, a, temAnterior, desktop }: { r: Resumo; a: Resumo; temAnterior: boolean; desktop: boolean }) {
  return (
    <div style={desktop ? GRADE_DE_TILES : TRILHO_DE_TILES}>
      <StatCard glow style={ITEM_TRILHO} icon="eye" value={fmt(r.alcanceMedio)} label="Alcance médio por post"
        delta={variacao(r.alcanceMedio, a.alcanceMedio, temAnterior)} />
      <StatCard style={ITEM_TRILHO} icon="image" value={fmt(r.posts)} label="Posts"
        delta={variacao(r.posts, a.posts, temAnterior)} />
      <StatCard style={ITEM_TRILHO} icon="bookmark" value={fmt(r.salvamentosMedios, 1)} label="Salvamentos por post"
        delta={variacao(r.salvamentosMedios, a.salvamentosMedios, temAnterior)} />
      <StatCard style={ITEM_TRILHO} icon="share-2" value={fmt(r.compartilhamentosMedios, 1)} label="Compartilhamentos por post"
        delta={variacao(r.compartilhamentosMedios, a.compartilhamentosMedios, temAnterior)} />
      <StatCard style={ITEM_TRILHO} icon="user-round" value={fmt(r.visitasAoPerfil)} label="Visitas ao perfil"
        delta={variacao(r.visitasAoPerfil, a.visitasAoPerfil, temAnterior)} />
      <StatCard style={ITEM_TRILHO} icon="user-plus" value={fmt(r.seguidoresGanhos)} label="Seguidores ganhos"
        delta={variacao(r.seguidoresGanhos, a.seguidoresGanhos, temAnterior)} />
    </div>
  );
}

function Formatos({ formatos }: { formatos: ReturnType<typeof porFormato> }) {
  const lista = (Object.keys(formatos) as FormatoDoPost[]).filter((f) => formatos[f].posts > 0);
  const teto = Math.max(1, ...lista.map((f) => formatos[f].alcanceMedio ?? 0));
  return (
    <MetricBarList
      items={lista.map((f) => ({
        label: `${NOME_DO_FORMATO[f][0].toUpperCase()}${NOME_DO_FORMATO[f].slice(1)} · ${formatos[f].posts} post${formatos[f].posts > 1 ? 's' : ''}`,
        value: Math.round(((formatos[f].alcanceMedio ?? 0) / teto) * 100),
        valueLabel: fmt(formatos[f].alcanceMedio),
        tone: f === 'reels' ? 'purple' : 'neutral',
      }))}
    />
  );
}

function LinhaDaRecomendacao({
  rec,
  post,
  aoCriarSemente,
}: {
  rec: Recomendacao;
  post?: PostDoInstagram;
  aoCriarSemente: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 'var(--sp-6)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <span style={{ color: 'var(--purple-400)', display: 'flex', flex: '0 0 auto' }}>
        <Icon name="lightbulb" size={20} />
      </span>
      <div style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
        <p style={{ font: 'var(--fw-medium) var(--fs-md)/1.4 var(--font-core)', color: 'var(--text-body)' }}>{rec.texto}</p>
        <p style={TEXTO}>
          {rec.evidencia}
          {post?.link && (
            <>
              {' · '}
              <a href={post.link} target="_blank" rel="noreferrer" style={{ color: 'var(--purple-400)' }}>
                ver post
              </a>
            </>
          )}
        </p>
      </div>
      <Button variant="ghost" iconLeft="plus" onClick={aoCriarSemente}>
        Criar semente
      </Button>
    </div>
  );
}

function LinhaDoPost({
  post,
  pecaLigada,
  aoLigar,
}: {
  post: PostDoInstagram;
  pecaLigada?: string;
  aoLigar: () => void;
}) {
  const numero = (v: number | undefined) => (v === undefined ? 'sem dado' : formatarNumero(v));
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 'var(--sp-6)',
        minHeight: 'var(--tap-min)',
        padding: 'var(--sp-4) var(--sp-5)',
        borderRadius: 'var(--r-nav)',
        background: 'var(--surface-raised)',
      }}
    >
      {post.miniatura && (
        <img
          src={post.miniatura}
          alt=""
          width={44}
          height={44}
          loading="lazy"
          style={{ borderRadius: 'var(--r-nav)', objectFit: 'cover', flex: '0 0 auto' }}
        />
      )}
      <div style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
        <a
          href={post.link}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'block',
            font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
            color: 'var(--text-body)',
            overflowWrap: 'anywhere',
          }}
        >
          {legendaCurta(post.legenda)}
        </a>
        <span style={{ display: 'block', ...TEXTO }}>
          {formatarData(new Date(`${diaLocalDe(post.publicadoEm)}T12:00:00`))} · alcance {numero(post.alcance)} ·
          salvos {numero(post.salvamentos)} · compart. {numero(post.compartilhamentos)} · visitas{' '}
          {numero(post.visitasAoPerfil)}
        </span>
      </div>
      <Badge tone={post.formato === 'reels' ? 'ontime' : 'neutral'} dot={false}>
        {post.formato === 'reels' ? 'Reel' : post.formato === 'carrossel' ? 'Carrossel' : 'Imagem'}
      </Badge>
      {pecaLigada ? (
        <span style={TEXTO}>Peça: {pecaLigada}</span>
      ) : (
        <Button variant="ghost" iconLeft="link" onClick={aoLigar}>
          Ligar a uma peça
        </Button>
      )}
    </div>
  );
}

function Ligar({
  post,
  pecas,
  aoFechar,
  aoEscolher,
}: {
  post: PostDoInstagram;
  pecas: { id: string; titulo: string }[];
  aoFechar: () => void;
  aoEscolher: (pecaId: string) => Promise<void>;
}) {
  return (
    <Modal
      open
      onClose={aoFechar}
      closeLabel="Fechar"
      header={<strong>Ligar “{legendaCurta(post.legenda, 40)}” a uma peça</strong>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        {pecas.length === 0 ? (
          <p style={TEXTO}>Nenhuma peça publicada sem post. Marque a peça como publicada na aba Peças primeiro.</p>
        ) : (
          pecas.map((p) => (
            <Button key={p.id} variant="secondary" onClick={() => void aoEscolher(p.id)}>
              {p.titulo}
            </Button>
          ))
        )}
      </div>
    </Modal>
  );
}

/**
 * Os números do post ligado a uma peça, para a linha da peça na aba Peças.
 * Lidos da mesma resposta, nunca guardados; se o post não veio, nada aparece.
 */
export function useNumerosDosPosts(): Map<string, PostDoInstagram> {
  const instagram = useInstagram();
  return React.useMemo(
    () => new Map((instagram.dados?.posts ?? []).map((p) => [p.id, p])),
    [instagram.dados],
  );
}
