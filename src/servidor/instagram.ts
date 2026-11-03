import type { Armazem } from './armazem.ts';
import { segredo } from './senha.ts';
import type {
  DadosDoInstagram,
  FormatoDoPost,
  PostDoInstagram,
} from '../dominio/instagram.ts';

/**
 * O Instagram pelo lado do servidor: o convite da Meta, a troca do código pelo
 * token, e a leitura do perfil, dos posts e das métricas.
 *
 * Mesmo molde do Google (`./google.ts`): o token mora no `Armazem`, nunca no
 * navegador nem no backup. A diferença é que aqui não há escrita nenhuma — o
 * MSL só lê.
 *
 * O app da Meta usa o *login unificado* (Facebook Login for Business), e o que
 * define as permissões pedidas é a configuração (`config_id`) criada no painel,
 * não um escopo na URL.
 */

export const GRAPH = 'https://graph.facebook.com/v25.0';
export const DIALOGO = 'https://www.facebook.com/v25.0/dialog/oauth';

/** O convite é de uso único e morre rápido, como o do Google. */
export const SEGUNDOS_DO_ESTADO = 600;
/** Uma hora: o bastante para navegar pela tela sem martelar a Meta. */
export const SEGUNDOS_DO_CACHE = 3600;
/** Só os posts recentes pedem métricas: os antigos já disseram o que tinham. */
export const DIAS_COM_INSIGHTS = 90;
/** Teto de posts lidos, para a função caber no tempo da Vercel. */
export const TETO_DE_POSTS = 60;

/** Uma métrica por chamada: a Meta recusa a lista inteira se uma não couber. */
const METRICAS = [
  'reach',
  'views',
  'saved',
  'shares',
  'profile_visits',
  'follows',
  'ig_reels_avg_watch_time',
] as const;

const LIMITE_DA_CHAMADA_MS = 15_000;
/** Quantos posts pedem métricas ao mesmo tempo. */
const POSTS_EM_PARALELO = 10;

export interface AmbienteDoInstagram {
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  META_CONFIG_ID?: string;
  [outra: string]: string | undefined;
}

export interface CredencialDoInstagram {
  token: string;
  /** o ID da conta profissional do Instagram; ausente até ser descoberto ou informado */
  contaId?: string;
  /** ISO UTC da conexão */
  conectadoEm: string;
}

export class InstagramNaoConfigurado extends Error {
  constructor() {
    super(
      'faltam as variáveis da Meta: esperava META_APP_ID, META_APP_SECRET e META_CONFIG_ID. ' +
        'Veja docs/instagram.md, e lembre do Redeploy depois de criá-las.',
    );
    this.name = 'InstagramNaoConfigurado';
  }
}

/**
 * Um erro vindo da Meta.
 *
 * `token-recusado` (código 190 da Graph) é o único que quer dizer "conecte de
 * novo". Todo o resto é falha do momento, e pedir reconexão por ela faria a
 * pessoa refazer o login à toa.
 */
export class ErroDoInstagram extends Error {
  readonly estado: number;
  readonly codigo?: 'token-recusado' | 'meta';
  constructor(mensagem: string, estado = 502, codigo: 'token-recusado' | 'meta' = 'meta') {
    super(mensagem);
    this.name = 'ErroDoInstagram';
    this.estado = estado;
    this.codigo = codigo;
  }
}

function credenciaisDo(ambiente: AmbienteDoInstagram) {
  const { META_APP_ID: id, META_APP_SECRET: chave, META_CONFIG_ID: configuracao } = ambiente;
  if (!id || !chave || !configuracao) throw new InstagramNaoConfigurado();
  return { id, chave, configuracao };
}

const chaveCredencial = (usuarioId: string) => `instagram:${usuarioId}`;
const chaveEstado = (estado: string) => `instagram-estado:${estado}`;
const chaveCache = (usuarioId: string) => `instagram-cache:${usuarioId}`;

/* ── A Graph ─────────────────────────────────────────────────────────────── */

interface ErroDaGraph {
  error?: { message?: string; code?: number };
}

/** Uma chamada GET à Graph. Aceita um caminho ou um endereço inteiro (a paginação). */
async function graph<T>(
  caminhoOuUrl: string,
  parametros: Record<string, string>,
  token: string | undefined,
  buscar: typeof fetch,
): Promise<T> {
  const url = new URL(caminhoOuUrl.startsWith('http') ? caminhoOuUrl : `${GRAPH}${caminhoOuUrl}`);
  for (const [k, v] of Object.entries(parametros)) url.searchParams.set(k, v);
  if (token && !url.searchParams.has('access_token')) url.searchParams.set('access_token', token);

  let resposta: Response;
  try {
    resposta = await buscar(url.toString(), { signal: AbortSignal.timeout(LIMITE_DA_CHAMADA_MS) });
  } catch {
    throw new ErroDoInstagram('A Meta não respondeu a tempo.');
  }
  const dados = (await resposta.json().catch(() => ({}))) as T & ErroDaGraph;
  if (!resposta.ok || dados.error) {
    const codigo = dados.error?.code;
    const mensagem = dados.error?.message ?? `A Meta respondeu ${resposta.status}.`;
    if (codigo === 190) throw new ErroDoInstagram(mensagem, 401, 'token-recusado');
    throw new ErroDoInstagram(mensagem);
  }
  return dados;
}

/* ── O convite ───────────────────────────────────────────────────────────── */

export async function convitePara(
  armazem: Armazem,
  usuarioId: string,
  voltaPara: string,
  ambiente: AmbienteDoInstagram,
): Promise<string> {
  const { id, configuracao } = credenciaisDo(ambiente);
  const estado = segredo(24);
  await armazem.gravar(chaveEstado(estado), usuarioId, SEGUNDOS_DO_ESTADO);

  const parametros = new URLSearchParams({
    client_id: id,
    config_id: configuracao,
    redirect_uri: voltaPara,
    response_type: 'code',
    // Sem isto o login unificado devolve o token no fragmento da URL, que o
    // servidor nunca vê.
    override_default_response_type: 'true',
    state: estado,
  });
  return `${DIALOGO}?${parametros.toString()}`;
}

/** De quem era o convite, e gasta-o. Uso único de propósito. */
export async function donoDoEstado(armazem: Armazem, estado: string): Promise<string | null> {
  if (!estado) return null;
  const usuarioId = await armazem.ler(chaveEstado(estado));
  if (usuarioId) await armazem.apagar(chaveEstado(estado));
  return usuarioId;
}

/* ── A credencial ────────────────────────────────────────────────────────── */

/**
 * Qual conta do Instagram o token alcança.
 *
 * Caminho a confirmar com a conta real: as Páginas concedidas e a conta
 * profissional ligada a cada uma. A conta pessoal do Luiz não tem Página, e é
 * possível que nada volte por aqui — por isso `null` não é erro: a tela de
 * Ajustes pede o ID, que não é segredo nenhum.
 */
export async function descobrirConta(
  token: string,
  buscar: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const r = await graph<{ data?: { instagram_business_account?: { id?: string } }[] }>(
      '/me/accounts',
      { fields: 'instagram_business_account' },
      token,
      buscar,
    );
    return r.data?.find((p) => p.instagram_business_account?.id)?.instagram_business_account?.id ?? null;
  } catch (erro) {
    if (erro instanceof ErroDoInstagram && erro.codigo === 'token-recusado') throw erro;
    return null;
  }
}

/** Troca o código da autorização pelo token, descobre a conta e guarda. */
export async function guardarCredencial(
  armazem: Armazem,
  usuarioId: string,
  codigo: string,
  voltaPara: string,
  ambiente: AmbienteDoInstagram,
  buscar: typeof fetch = fetch,
  agora = new Date(),
): Promise<CredencialDoInstagram> {
  const { id, chave } = credenciaisDo(ambiente);
  const { access_token: token } = await graph<{ access_token?: string }>(
    '/oauth/access_token',
    { client_id: id, client_secret: chave, redirect_uri: voltaPara, code: codigo },
    undefined,
    buscar,
  );
  if (!token) throw new ErroDoInstagram('A Meta não devolveu o token.');

  const contaId = await descobrirConta(token, buscar);
  const credencial: CredencialDoInstagram = {
    token,
    ...(contaId ? { contaId } : {}),
    conectadoEm: agora.toISOString(),
  };
  await armazem.gravar(chaveCredencial(usuarioId), JSON.stringify(credencial));
  await armazem.apagar(chaveCache(usuarioId));
  return credencial;
}

export async function credencialDe(
  armazem: Armazem,
  usuarioId: string,
): Promise<CredencialDoInstagram | null> {
  const guardada = await armazem.ler(chaveCredencial(usuarioId));
  if (!guardada) return null;
  try {
    return JSON.parse(guardada) as CredencialDoInstagram;
  } catch {
    return null;
  }
}

/** Grava o ID da conta informado na mão. Trocar a conta invalida o cache. */
export async function definirConta(armazem: Armazem, usuarioId: string, contaId: string): Promise<void> {
  const credencial = await credencialDe(armazem, usuarioId);
  if (!credencial) return;
  await armazem.gravar(chaveCredencial(usuarioId), JSON.stringify({ ...credencial, contaId }));
  await armazem.apagar(chaveCache(usuarioId));
}

/** Só apaga daqui. O app continua autorizado na Meta até a pessoa tirá-lo lá. */
export async function desconectar(armazem: Armazem, usuarioId: string): Promise<void> {
  await armazem.apagar(chaveCredencial(usuarioId));
  await armazem.apagar(chaveCache(usuarioId));
}

/* ── A leitura ───────────────────────────────────────────────────────────── */

interface Midia {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  timestamp: string;
  permalink?: string;
  thumbnail_url?: string;
  media_url?: string;
  like_count?: number;
  comments_count?: number;
}

function formatoDe(m: Midia): FormatoDoPost {
  if (m.media_product_type === 'REELS') return 'reels';
  if (m.media_type === 'CAROUSEL_ALBUM') return 'carrossel';
  return 'imagem';
}

/** `2026-11-03T15:20:54+0000` → ISO com `Z`. */
const instante = (t: string) => new Date(t.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')).toISOString();

async function metrica(
  midiaId: string,
  nome: (typeof METRICAS)[number],
  token: string,
  buscar: typeof fetch,
): Promise<number | undefined> {
  try {
    const r = await graph<{
      data?: { values?: { value?: number }[]; total_value?: { value?: number } }[];
    }>(`/${midiaId}/insights`, { metric: nome }, token, buscar);
    const item = r.data?.[0];
    const valor = item?.values?.[0]?.value ?? item?.total_value?.value;
    return typeof valor === 'number' ? valor : undefined;
  } catch (erro) {
    // Token caído derruba tudo; qualquer outra recusa é "sem dado" desta
    // métrica — a Meta não entrega visitas para Reels, por exemplo.
    if (erro instanceof ErroDoInstagram && erro.codigo === 'token-recusado') throw erro;
    return undefined;
  }
}

async function comMetricas(m: Midia, token: string, buscar: typeof fetch, recente: boolean): Promise<PostDoInstagram> {
  const post: PostDoInstagram = {
    id: m.id,
    legenda: m.caption ?? '',
    formato: formatoDe(m),
    publicadoEm: instante(m.timestamp),
    link: m.permalink ?? '',
    ...(m.thumbnail_url ?? m.media_url ? { miniatura: m.thumbnail_url ?? m.media_url } : {}),
    curtidas: m.like_count ?? 0,
    comentarios: m.comments_count ?? 0,
  };
  if (!recente) return post;

  const [alcance, visualizacoes, salvamentos, compartilhamentos, visitasAoPerfil, seguidoresGanhos, tempoMedioMs] =
    await Promise.all(METRICAS.map((nome) => metrica(m.id, nome, token, buscar)));
  const valores = { alcance, visualizacoes, salvamentos, compartilhamentos, visitasAoPerfil, seguidoresGanhos, tempoMedioMs };
  for (const [k, v] of Object.entries(valores)) if (v !== undefined) (post as unknown as Record<string, number>)[k] = v;
  return post;
}

export async function lerDados(
  token: string,
  contaId: string,
  agora: Date,
  buscar: typeof fetch = fetch,
): Promise<DadosDoInstagram> {
  const perfil = await graph<{ username?: string; followers_count?: number; media_count?: number }>(
    `/${contaId}`,
    { fields: 'username,followers_count,media_count' },
    token,
    buscar,
  );

  const midias: Midia[] = [];
  let proxima: string | undefined = `/${contaId}/media`;
  let primeira = true;
  while (proxima && midias.length < TETO_DE_POSTS) {
    const pagina: { data?: Midia[]; paging?: { next?: string } } = await graph(
      proxima,
      primeira
        ? {
            fields:
              'id,caption,media_type,media_product_type,timestamp,permalink,thumbnail_url,media_url,like_count,comments_count',
            limit: '50',
          }
        : {},
      token,
      buscar,
    );
    midias.push(...(pagina.data ?? []));
    proxima = pagina.paging?.next;
    primeira = false;
  }

  const limite = agora.getTime() - DIAS_COM_INSIGHTS * 86_400_000;
  const escolhidas = midias.slice(0, TETO_DE_POSTS);
  const posts: PostDoInstagram[] = [];
  for (let i = 0; i < escolhidas.length; i += POSTS_EM_PARALELO) {
    const lote = escolhidas.slice(i, i + POSTS_EM_PARALELO);
    posts.push(
      ...(await Promise.all(
        lote.map((m) => comMetricas(m, token, buscar, new Date(instante(m.timestamp)).getTime() >= limite)),
      )),
    );
  }

  return {
    perfil: {
      usuario: perfil.username ?? '',
      seguidores: perfil.followers_count ?? 0,
      totalDePosts: perfil.media_count ?? escolhidas.length,
    },
    posts,
    lidoEm: agora.toISOString(),
  };
}

/** A leitura, guardada por uma hora. `atualizar` ignora o que estava guardado. */
export async function dadosComCache(
  armazem: Armazem,
  usuarioId: string,
  credencial: CredencialDoInstagram & { contaId: string },
  atualizar: boolean,
  agora: Date,
  buscar: typeof fetch = fetch,
): Promise<DadosDoInstagram> {
  if (!atualizar) {
    const guardado = await armazem.ler(chaveCache(usuarioId));
    if (guardado) {
      try {
        return JSON.parse(guardado) as DadosDoInstagram;
      } catch {
        // cache estragado: lê de novo
      }
    }
  }
  const dados = await lerDados(credencial.token, credencial.contaId, agora, buscar);
  await armazem.gravar(chaveCache(usuarioId), JSON.stringify(dados), SEGUNDOS_DO_CACHE);
  return dados;
}
