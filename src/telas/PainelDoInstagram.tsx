import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Card,
  Button,
  Badge,
  Icon,
  Modal,
  MetricBarList,
  ProgressBar,
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import { useInstagram, type Instagram } from '../dados/instagram';
import {
  dividirPorPeriodo,
  anteriorCompleto,
  variacao,
  resumir,
  porFormato,
  recomendar,
  legendaCurta,
  funil,
  hoje,
  rankear,
  vezes,
  NOME_DO_FORMATO,
  type DadosDoInstagram,
  type Funil,
  type MetricaDoRanking,
  type PerfilDoInstagram,
  type PosicaoNoRanking,
  type FormatoDoPost,
  type Periodo,
  type PostDoInstagram,
  type Recomendacao,
  type Resumo,
} from '../dominio/instagram';
import { diaLocalDe } from '../dominio/rotina';
import { formatarNumero, formatarDataRelativa, formatarData } from '../formato';
import { useLarguraDesktop } from '../casca/useLarguraDesktop';
import { TRILHO_DE_TILES, ITEM_TRILHO } from '../casca/trilho';

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

type Vista = 'geral' | 'ranking' | 'galeria';

const PERIODOS: { valor: Periodo; rotulo: string }[] = [
  { valor: 7, rotulo: '7 dias' },
  { valor: 30, rotulo: '30 dias' },
  { valor: 90, rotulo: '90 dias' },
  { valor: 'tudo', rotulo: 'Tudo' },
];

const VISTAS: { valor: Vista; rotulo: string; icone: string }[] = [
  { valor: 'geral', rotulo: 'Visão geral', icone: 'layout-dashboard' },
  { valor: 'ranking', rotulo: 'Ranking', icone: 'trophy' },
  { valor: 'galeria', rotulo: 'Galeria', icone: 'layout-grid' },
];

const METRICAS: { valor: MetricaDoRanking; rotulo: string; unidade: string }[] = [
  { valor: 'alcance', rotulo: 'Alcance', unidade: 'de alcance' },
  { valor: 'guardados', rotulo: 'Salvos', unidade: 'salvos e compart.' },
  { valor: 'visitas', rotulo: 'Visitas', unidade: 'visitas ao perfil' },
  { valor: 'seguidores', rotulo: 'Seguidores', unidade: 'seguidores' },
];

const NOME_CURTO: Record<FormatoDoPost, string> = { reels: 'Reel', carrossel: 'Carrossel', imagem: 'Imagem' };
const ICONE_DO_FORMATO: Record<FormatoDoPost, string> = {
  reels: 'clapperboard',
  carrossel: 'gallery-horizontal',
  imagem: 'image',
};

function lerVista(v: string | null): Vista {
  return v === 'ranking' || v === 'galeria' ? v : 'geral';
}

/** O tom da razão sobre a mediana: verde quando dobra, laranja quando fica bem abaixo. */
const tomDaRazao = (r: number) => (r >= 2 ? 'delivered' : r < 0.7 ? 'delay' : 'neutral') as 'delivered' | 'delay' | 'neutral';

/** Uma fileira de pílulas: a escolhida em roxo cheio, as outras discretas. */
function Pilulas<T extends string | number>({
  rotulo,
  opcoes,
  valor,
  aoEscolher,
}: {
  rotulo: string;
  opcoes: { valor: T; rotulo: string; icone?: string }[];
  valor: T;
  aoEscolher: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={rotulo} style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
      {opcoes.map((o) => (
        <Button
          key={String(o.valor)}
          size="sm"
          variant={o.valor === valor ? 'primary' : 'ghost'}
          iconLeft={o.icone}
          onClick={() => aoEscolher(o.valor)}
          style={{ borderRadius: 'var(--r-pill)' }}
        >
          {o.rotulo}
        </Button>
      ))}
    </div>
  );
}

function Painel({ instagram, dados }: { instagram: Instagram; dados: DadosDoInstagram }) {
  const { banco, hoje: dia, criarPeca, editarPeca } = useBanco();
  const desktop = useLarguraDesktop() !== false;
  const [parametros, setParametros] = useSearchParams();
  const vista = lerVista(parametros.get('vista'));
  const [periodo, setPeriodo] = React.useState<Periodo>(30);
  const [metrica, setMetrica] = React.useState<MetricaDoRanking>('alcance');
  const [ligando, setLigando] = React.useState<PostDoInstagram | null>(null);
  const [aviso, setAviso] = React.useState<string | null>(null);

  function escolherVista(v: Vista) {
    const proximos = new URLSearchParams(parametros);
    if (v === 'geral') proximos.delete('vista');
    else proximos.set('vista', v);
    setParametros(proximos, { replace: true });
  }

  const divisao = dividirPorPeriodo(dados.posts, periodo, dia);
  const atual = divisao.atual;
  // Anterior lido pela metade não entra em comparação nenhuma: nem nos
  // números, nem no funil, nem no ritmo. Melhor não comparar do que comparar a favor.
  const anterior = anteriorCompleto(dados, periodo, dia) ? divisao.anterior : [];
  const pecaDoPost = new Map(
    banco.pecas.filter((p) => p.instagramPostId).map((p) => [p.instagramPostId!, p]),
  );
  const posicoes = rankear(atual, metrica);

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
      <CabecalhoDoPerfil instagram={instagram} dados={dados} desktop={desktop} />

      <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Pilulas rotulo="Vista" opcoes={VISTAS} valor={vista} aoEscolher={escolherVista} />
        <Pilulas rotulo="Período" opcoes={PERIODOS} valor={periodo} aoEscolher={setPeriodo} />
      </div>

      {aviso && (
        <Card>
          <p style={TEXTO}>{aviso}</p>
        </Card>
      )}

      {vista === 'geral' && <BlocoHoje dados={dados} dia={dia} />}

      {atual.length === 0 ? (
        <Card title="Nenhum post neste período">
          <p style={TEXTO}>Escolha um período maior para ver os números.</p>
        </Card>
      ) : vista === 'geral' ? (
        <VisaoGeral
          atual={atual}
          anterior={anterior}
          dados={dados}
          dia={dia}
          periodo={periodo}
          desktop={desktop}
          aoCriarSemente={(rec) => void criarSemente(rec)}
        />
      ) : (
        <>
          <Pilulas rotulo="Ordenar por" opcoes={METRICAS} valor={metrica} aoEscolher={setMetrica} />
          {vista === 'ranking' ? (
            <Ranking
              posicoes={posicoes}
              metrica={metrica}
              pecaDoPost={(id) => pecaDoPost.get(id)?.titulo}
              aoLigar={setLigando}
            />
          ) : (
            <Galeria posicoes={posicoes} metrica={metrica} perfil={dados.perfil} desktop={desktop} />
          )}
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

/* ── Cabeçalho de perfil ─────────────────────────────────────────────────── */

/** Bio com mais que isto, ou mais de três linhas, abre recolhida. */
const BIO_CURTA = 220;

const NEGRITO = (tamanho: string, cor = 'var(--text-heading)'): React.CSSProperties => ({
  font: `var(--fw-semibold) ${tamanho}/1.2 var(--font-core)`,
  color: cor,
});

function Foto({ perfil, tamanho }: { perfil: PerfilDoInstagram; tamanho: number }) {
  // A URL da foto expira em alguns dias; se falhar, a inicial assume.
  const [falhou, setFalhou] = React.useState(false);
  // O @ costuma começar por sublinhado ou ponto: a inicial é a primeira letra.
  const inicial = (perfil.usuario.replace(/[^\p{L}\p{N}]/gu, '').charAt(0) || '?').toUpperCase();
  const anel = tamanho >= 60 ? 3 : 2;
  return (
    <span
      style={{
        flex: '0 0 auto',
        width: tamanho,
        height: tamanho,
        padding: anel,
        borderRadius: '50%',
        background: 'var(--gradient-primary)',
        boxShadow: tamanho >= 60 ? 'var(--glow-accent-strong)' : undefined,
        display: 'inline-flex',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          flex: 1,
          borderRadius: '50%',
          border: `${anel}px solid var(--surface-card)`,
          background: 'var(--surface-raised)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          font: `var(--fw-semibold) ${Math.round(tamanho / 2.6)}px/1 var(--font-core)`,
          color: 'var(--text-heading)',
        }}
      >
        {perfil.foto && !falhou ? (
          <img
            src={perfil.foto}
            alt={`Foto de ${perfil.usuario}`}
            onError={() => setFalhou(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span aria-hidden="true">{inicial}</span>
        )}
      </span>
    </span>
  );
}

function NumeroDoPerfil({ valor, rotulo, desktop }: { valor: number; rotulo: string; desktop: boolean }) {
  return (
    <span
      style={{
        display: 'flex',
        flexDirection: desktop ? 'row' : 'column',
        alignItems: desktop ? 'baseline' : 'center',
        gap: desktop ? 'var(--sp-2)' : 0,
        minWidth: 0,
      }}
    >
      <strong style={NEGRITO('var(--fs-lg)')}>{formatarNumero(valor)}</strong>
      <span style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>{rotulo}</span>
    </span>
  );
}

function CabecalhoDoPerfil({
  instagram,
  dados,
  desktop,
}: {
  instagram: Instagram;
  dados: DadosDoInstagram;
  desktop: boolean;
}) {
  const perfil = dados.perfil;
  const [aberta, setAberta] = React.useState(false);
  const bio = perfil.bio ?? '';
  const longa = bio.length > BIO_CURTA || bio.split('\n').length > 3;
  const site = perfil.site?.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const numeros = (
    <div
      style={{
        display: 'flex',
        gap: desktop ? 'var(--sp-10)' : 'var(--sp-4)',
        justifyContent: desktop ? 'flex-start' : 'space-around',
        flex: desktop ? undefined : 1,
      }}
    >
      <NumeroDoPerfil valor={perfil.totalDePosts} rotulo="posts" desktop={desktop} />
      <NumeroDoPerfil valor={perfil.seguidores} rotulo="seguidores" desktop={desktop} />
      {perfil.seguindo !== undefined && <NumeroDoPerfil valor={perfil.seguindo} rotulo="seguindo" desktop={desktop} />}
    </div>
  );

  const textos = (perfil.nome || bio || site) && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', minWidth: 0 }}>
      {perfil.nome && <span style={NEGRITO('var(--fs-md)')}>{perfil.nome}</span>}
      {bio && (
        <p
          style={{
            font: 'var(--fw-regular) var(--fs-md)/1.45 var(--font-core)',
            color: 'var(--text-body)',
            whiteSpace: 'pre-line',
            overflowWrap: 'anywhere',
            maxWidth: '62ch',
            ...(longa && !aberta
              ? { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
              : {}),
          }}
        >
          {bio}
        </p>
      )}
      {longa && (
        <button
          type="button"
          onClick={() => setAberta((a) => !a)}
          style={{
            alignSelf: 'flex-start',
            background: 'none',
            border: 0,
            padding: 0,
            cursor: 'pointer',
            font: 'var(--type-body)',
            color: 'var(--text-muted)',
          }}
        >
          {aberta ? 'menos' : 'mais'}
        </button>
      )}
      {site && (
        <a
          href={perfil.site}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 'var(--sp-2)',
            color: 'var(--text-link)',
            font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
          }}
        >
          <Icon name="link" size={14} />
          {site}
        </a>
      )}
    </div>
  );

  const acoes = (
    <div style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'center' }}>
      <Button
        variant="secondary"
        iconLeft="refresh-cw"
        disabled={instagram.atualizando}
        onClick={() => void instagram.atualizar()}
        style={desktop ? undefined : { flex: 1 }}
      >
        Atualizar
      </Button>
      <a
        href={`https://www.instagram.com/${perfil.usuario}/`}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--sp-2)',
          // Mesma altura e pele do botão secundário ao lado: é um link, mas
          // lado a lado com o Atualizar tem de parecer o mesmo tipo de coisa.
          height: 'var(--control-h)',
          padding: '0 var(--sp-8)',
          borderRadius: 'var(--r-control)',
          border: 'var(--bw-hairline) solid var(--border-default)',
          background: 'var(--surface-card)',
          color: 'var(--text-body)',
          font: 'var(--fw-medium) var(--fs-sm)/1 var(--font-core)',
          whiteSpace: 'nowrap',
          flex: desktop ? undefined : 1,
        }}
      >
        Abrir no Instagram
        <Icon name="external-link" size={14} />
      </a>
    </div>
  );

  const atualizado = (
    <span style={{ font: 'var(--type-body)', color: 'var(--text-subtle)' }}>
      Atualizado {formatarDataRelativa(new Date(dados.lidoEm))}
    </span>
  );

  return (
    <section
      aria-label="Perfil do Instagram"
      style={{
        borderRadius: 'var(--r-panel)',
        border: 'var(--bw-hairline) solid var(--border-hairline)',
        background: 'var(--surface-card)',
        backgroundImage: 'var(--gradient-kpi-glow)',
        padding: desktop ? 'var(--sp-12)' : 'var(--sp-8)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {desktop ? (
        <div style={{ display: 'flex', gap: 'var(--sp-12)', alignItems: 'flex-start' }}>
          <Foto perfil={perfil} tamanho={120} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
            <div
              style={{
                display: 'flex',
                gap: 'var(--sp-6)',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ font: 'var(--type-page-title)', color: 'var(--text-heading)', overflowWrap: 'anywhere' }}>
                @{perfil.usuario}
              </span>
              {acoes}
            </div>
            {numeros}
            {textos}
            {atualizado}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          <span style={{ ...NEGRITO('var(--fs-subheading)'), overflowWrap: 'anywhere' }}>@{perfil.usuario}</span>
          <div style={{ display: 'flex', gap: 'var(--sp-6)', alignItems: 'center' }}>
            <Foto perfil={perfil} tamanho={84} />
            {numeros}
          </div>
          {textos}
          {acoes}
          {atualizado}
        </div>
      )}
    </section>
  );
}

/* ── Hoje ────────────────────────────────────────────────────────────────── */

function BlocoHoje({ dados, dia }: { dados: DadosDoInstagram; dia: string }) {
  const h = hoje(dados, dia);
  if (h.novos.length === 0 && h.acoes.length === 0) return null;
  return (
    <section aria-label="Hoje">
      <Card title="Hoje" subtitle="Desde ontem">
        <div style={COLUNA}>
          {h.acoes.map((acao) => (
            <div key={acao} style={{ display: 'flex', gap: 'var(--sp-5)', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--purple-400)', display: 'flex', flex: '0 0 auto' }}>
                <Icon name="zap" size={18} />
              </span>
              <p style={{ font: 'var(--fw-medium) var(--fs-md)/1.4 var(--font-core)', color: 'var(--text-body)' }}>
                {acao}
              </p>
            </div>
          ))}
          {h.novos.map(({ post, razao }) => (
            <a
              key={post.id}
              href={post.link}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                gap: 'var(--sp-5)',
                alignItems: 'center',
                padding: 'var(--sp-4)',
                borderRadius: 'var(--r-nav)',
                background: 'var(--surface-raised)',
                color: 'var(--text-body)',
              }}
            >
              <Miniatura post={post} tamanho={44} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {legendaCurta(post.legenda, 60)}
                </span>
                <span style={{ display: 'block', ...TEXTO }}>
                  {NOME_CURTO[post.formato]} · alcance{' '}
                  {post.alcance === undefined ? 'sem dado' : formatarNumero(post.alcance)}
                </span>
              </span>
              {razao !== null && (
                <Badge tone={tomDaRazao(razao)} dot={false}>
                  {vezes(razao)}
                </Badge>
              )}
            </a>
          ))}
        </div>
      </Card>
    </section>
  );
}

/* ── Visão geral ─────────────────────────────────────────────────────────── */

function VisaoGeral({
  atual,
  anterior,
  dados,
  dia,
  periodo,
  desktop,
  aoCriarSemente,
}: {
  atual: PostDoInstagram[];
  anterior: PostDoInstagram[];
  dados: DadosDoInstagram;
  dia: string;
  periodo: Periodo;
  desktop: boolean;
  aoCriarSemente: (rec: Recomendacao) => void;
}) {
  const recomendacoes = recomendar(atual, anterior, dia, periodo);
  const f = funil(atual);
  const fAnterior = anterior.length ? funil(anterior) : null;
  return (
    <>
      <FaixaDeNumeros r={resumir(atual)} a={resumir(anterior)} temAnterior={anterior.length > 0} desktop={desktop} />

      {f && <BlocoFunil funil={f} anterior={fAnterior} />}

      <Card title="Formato" subtitle="Alcance médio por formato, no período">
        <Formatos formatos={porFormato(atual)} />
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
              aoCriarSemente={() => aoCriarSemente(rec)}
            />
          ))}
        </div>
      </Card>
    </>
  );
}

interface BlocoDeNumero {
  icone: string;
  valor: string;
  rotulo: string;
  atual: number | null;
  antes: number | null;
  destaque?: boolean;
}

/** Os seis números em blocos: valor grande, rótulo em caixa alta, variação embaixo. */
function FaixaDeNumeros({ r, a, temAnterior, desktop }: { r: Resumo; a: Resumo; temAnterior: boolean; desktop: boolean }) {
  const blocos: BlocoDeNumero[] = [
    { icone: 'eye', valor: fmt(r.alcanceMedio), rotulo: 'Alcance médio por post', atual: r.alcanceMedio, antes: a.alcanceMedio, destaque: true },
    { icone: 'image', valor: fmt(r.posts), rotulo: 'Posts', atual: r.posts, antes: a.posts },
    { icone: 'bookmark', valor: fmt(r.salvamentosMedios, 1), rotulo: 'Salvamentos por post', atual: r.salvamentosMedios, antes: a.salvamentosMedios },
    { icone: 'share-2', valor: fmt(r.compartilhamentosMedios, 1), rotulo: 'Compartilhamentos por post', atual: r.compartilhamentosMedios, antes: a.compartilhamentosMedios },
    { icone: 'user-round', valor: fmt(r.visitasAoPerfil), rotulo: 'Visitas ao perfil', atual: r.visitasAoPerfil, antes: a.visitasAoPerfil },
    { icone: 'user-plus', valor: fmt(r.seguidoresGanhos), rotulo: 'Seguidores ganhos', atual: r.seguidoresGanhos, antes: a.seguidoresGanhos },
  ];
  return (
    <div
      style={
        desktop
          ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--grid-min) * 0.75), 1fr))', gap: 'var(--card-gap)' }
          : TRILHO_DE_TILES
      }
    >
      {blocos.map((b) => {
        const v = variacao(b.atual, b.antes, temAnterior);
        return (
          <div
            key={b.rotulo}
            style={{
              ...(desktop ? {} : ITEM_TRILHO),
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-4)',
              padding: 'var(--sp-8)',
              borderRadius: 'var(--r-card)',
              border: `var(--bw-hairline) solid ${b.destaque ? 'var(--border-accent)' : 'var(--border-hairline)'}`,
              background: 'var(--surface-card)',
              backgroundImage: b.destaque ? 'var(--gradient-kpi-glow)' : undefined,
              boxShadow: b.destaque ? 'var(--glow-accent)' : 'var(--shadow-card)',
            }}
          >
            <span style={{ color: 'var(--purple-400)', display: 'flex' }}>
              <Icon name={b.icone} size={18} />
            </span>
            <span style={{ font: 'var(--type-metric-lg)', color: 'var(--text-heading)' }}>{b.valor}</span>
            <span
              style={{
                font: 'var(--fw-medium) var(--fs-xs)/1.3 var(--font-core)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              {b.rotulo}
            </span>
            {v && (
              <span
                style={{
                  font: 'var(--fw-medium) var(--fs-body)/1 var(--font-core)',
                  color: v.tom === 'caiu' ? 'var(--orange-500)' : 'var(--green-500)',
                }}
              >
                {v.texto}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const pct = (t: number) => `${formatarNumero(Math.round(t * 1000) / 10)}%`;

function BlocoFunil({ funil: f, anterior }: { funil: Funil; anterior: Funil | null }) {
  return (
    <section aria-label="Funil">
      <Card title="Do alcance ao seguidor" subtitle={`Somado sobre ${f.posts} posts de feed`}>
        <div style={COLUNA}>
          {f.degraus.map((d, i) => {
            const gargalo = i === f.gargalo;
            const antes = anterior?.degraus[i]?.taxa ?? null;
            // Variação de taxa em pontos percentuais, nunca em % de %.
            const pp = d.taxa !== null && antes !== null ? (d.taxa - antes) * 100 : null;
            return (
              <div key={d.nome} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
                  <span style={{ font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)', color: 'var(--text-body)' }}>
                    {d.nome}
                  </span>
                  <span style={NEGRITO('var(--fs-lg)')}>{formatarNumero(d.total)}</span>
                  {d.taxa !== null && (
                    <span style={TEXTO}>
                      {pct(d.taxa)} do degrau de cima
                      {pp !== null &&
                        Math.abs(pp) >= 0.05 &&
                        ` · ${pp > 0 ? '+' : '−'}${formatarNumero(Math.round(Math.abs(pp) * 10) / 10)} p.p.`}
                    </span>
                  )}
                  {gargalo && (
                    <Badge tone="delay" dot={false}>
                      ▲ maior queda
                    </Badge>
                  )}
                </div>
                <ProgressBar
                  value={d.taxa === null ? 100 : Math.max(2, Math.round(d.taxa * 100))}
                  tone={gargalo ? 'orange' : i === 0 ? 'purple' : 'neutral'}
                  height={6}
                />
              </div>
            );
          })}
          <p style={TEXTO}>Reels ficam de fora: a Meta não informa visitas nem seguidores para eles.</p>
        </div>
      </Card>
    </section>
  );
}

/* ── Ranking e galeria ───────────────────────────────────────────────────── */

function Miniatura({ post, tamanho }: { post: PostDoInstagram; tamanho?: number }) {
  const caixa: React.CSSProperties = tamanho
    ? { width: tamanho, height: tamanho, flex: '0 0 auto', borderRadius: 'var(--r-nav)' }
    : { width: '100%', aspectRatio: '4 / 5' };
  return post.miniatura ? (
    <img src={post.miniatura} alt="" loading="lazy" style={{ ...caixa, objectFit: 'cover', display: 'block' }} />
  ) : (
    <span
      style={{
        ...caixa,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-raised)',
        color: 'var(--text-subtle)',
      }}
    >
      <Icon name={ICONE_DO_FORMATO[post.formato]} size={tamanho ? 18 : 32} />
    </span>
  );
}

const valorDaMetrica = (v: number | undefined) => (v === undefined ? 'sem dado' : formatarNumero(v));
const unidadeDa = (m: MetricaDoRanking) => METRICAS.find((x) => x.valor === m)!.unidade;

function Ranking({
  posicoes,
  metrica,
  pecaDoPost,
  aoLigar,
}: {
  posicoes: PosicaoNoRanking[];
  metrica: MetricaDoRanking;
  pecaDoPost: (id: string) => string | undefined;
  aoLigar: (p: PostDoInstagram) => void;
}) {
  return (
    <Card title="Ranking" subtitle={`${posicoes.length} no período`}>
      <ol
        aria-label="Ranking dos posts"
        style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}
      >
        {posicoes.map(({ post, valor, razao }, i) => {
          const peca = pecaDoPost(post.id);
          return (
            <li
              key={post.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'var(--sp-5)',
                minHeight: 'var(--tap-min)',
                padding: 'var(--sp-4) var(--sp-5)',
                borderRadius: 'var(--r-nav)',
                background: 'var(--surface-raised)',
              }}
            >
              <span
                style={{
                  ...NEGRITO('var(--fs-lg)', i === 0 ? 'var(--purple-300)' : 'var(--text-subtle)'),
                  flex: '0 0 auto',
                  width: 24,
                  textAlign: 'center',
                }}
              >
                {i + 1}
              </span>
              <Miniatura post={post} tamanho={44} />
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
                  {NOME_CURTO[post.formato]} · {formatarData(new Date(`${diaLocalDe(post.publicadoEm)}T12:00:00`))}
                  {peca && ` · Peça: ${peca}`}
                </span>
              </div>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flex: '0 0 auto' }}>
                <strong style={NEGRITO('var(--fs-lg)')}>{valorDaMetrica(valor)}</strong>
                {valor !== undefined && <span style={TEXTO}>{unidadeDa(metrica)}</span>}
              </span>
              {razao !== null && (
                <Badge tone={tomDaRazao(razao)} dot={false}>
                  {vezes(razao)} a mediana
                </Badge>
              )}
              {!peca && (
                <Button variant="ghost" size="sm" iconLeft="link" onClick={() => aoLigar(post)}>
                  Ligar a uma peça
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function Galeria({
  posicoes,
  metrica,
  perfil,
  desktop,
}: {
  posicoes: PosicaoNoRanking[];
  metrica: MetricaDoRanking;
  perfil: PerfilDoInstagram;
  desktop: boolean;
}) {
  const melhor = posicoes[0]?.valor !== undefined ? posicoes[0].post.id : null;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: desktop ? 'repeat(auto-fill, minmax(var(--grid-min), 1fr))' : 'repeat(2, minmax(0, 1fr))',
        gap: 'var(--card-gap)',
      }}
    >
      {posicoes.map(({ post, valor, razao }) => {
        const destaque = post.id === melhor;
        return (
          <a
            key={post.id}
            href={post.link}
            target="_blank"
            rel="noreferrer"
            aria-label={`Abrir post: ${legendaCurta(post.legenda, 40)}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minWidth: 0,
              borderRadius: 'var(--r-card)',
              border: `var(--bw-hairline) solid ${destaque ? 'var(--border-accent)' : 'var(--border-hairline)'}`,
              background: 'var(--surface-card)',
              boxShadow: destaque ? 'var(--glow-accent)' : 'var(--shadow-card)',
              color: 'var(--text-body)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-4)' }}>
              <Foto perfil={perfil} tamanho={26} />
              <span
                style={{
                  ...NEGRITO('var(--fs-sm)', 'var(--text-body)'),
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {perfil.usuario}
              </span>
            </span>
            <span style={{ position: 'relative', display: 'block' }}>
              <Miniatura post={post} />
              <span style={{ position: 'absolute', top: 'var(--sp-4)', right: 'var(--sp-4)' }}>
                <Badge tone={post.formato === 'reels' ? 'ontime' : 'neutral'} dot={false}>
                  {NOME_CURTO[post.formato]}
                </Badge>
              </span>
              {destaque && (
                <span style={{ position: 'absolute', top: 'var(--sp-4)', left: 'var(--sp-4)' }}>
                  <Badge tone="ontime" dot={false}>
                    Melhor do período
                  </Badge>
                </span>
              )}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', padding: 'var(--sp-5)' }}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
                <strong style={NEGRITO('var(--fs-lg)')}>{valorDaMetrica(valor)}</strong>
                {valor !== undefined && <span style={TEXTO}>{unidadeDa(metrica)}</span>}
                {razao !== null && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      font: 'var(--fw-medium) var(--fs-body)/1 var(--font-core)',
                      color: razao >= 1 ? 'var(--green-500)' : 'var(--text-muted)',
                    }}
                  >
                    {vezes(razao)}
                  </span>
                )}
              </span>
              <span
                style={{
                  ...TEXTO,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {legendaCurta(post.legenda, 90)}
              </span>
            </span>
          </a>
        );
      })}
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
