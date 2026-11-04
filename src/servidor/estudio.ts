import type { Armazem } from './armazem.ts';
import { graph, formatoDe, instante, ErroDoInstagram, type Midia } from './instagram.ts';
import type { PerfilLido } from '../dominio/estudio.ts';

/**
 * O Estúdio no servidor: ler perfis de outros criadores na Meta.
 *
 * O MSL não fala com modelo de IA nenhum (DECISOES.md, d): o prompt é montado
 * no navegador e eu levo para a IA que quiser.
 */

const CACHE_DA_REFERENCIA_S = 6 * 60 * 60;
const POSTS_POR_PERFIL = 25;

export type CodigoDoEstudio =
  | 'perfil-nao-encontrado'
  | 'perfil-nao-profissional'
  | 'permissao-faltando'
  | 'pedido-invalido';

export class ErroDoEstudio extends Error {
  readonly estado: number;
  readonly codigo: CodigoDoEstudio;
  constructor(mensagem: string, estado: number, codigo: CodigoDoEstudio) {
    super(mensagem);
    this.name = 'ErroDoEstudio';
    this.estado = estado;
    this.codigo = codigo;
  }
}


/* ── Referências ─────────────────────────────────────────────────────────── */

interface Descoberta {
  business_discovery?: {
    username?: string;
    name?: string;
    profile_picture_url?: string;
    followers_count?: number;
    media?: { data?: Midia[] };
  };
}

/**
 * Um perfil profissional de outra pessoa, pela `business_discovery`.
 *
 * Só funciona para conta Comercial ou Criador; a Meta não abre perfil pessoal
 * para ninguém. Fica 6 h em cache: posts de referência não mudam de hora em
 * hora, e cada leitura gasta cota da Meta.
 */
export async function lerReferencia(
  token: string,
  contaId: string,
  usuario: string,
  armazem: Armazem,
  buscar: typeof fetch = fetch,
): Promise<PerfilLido> {
  const chave = `estudio-ref:${usuario}`;
  const guardado = await armazem.ler(chave);
  if (guardado) {
    try {
      return JSON.parse(guardado) as PerfilLido;
    } catch {
      /* cache estragado: lê de novo */
    }
  }

  const campos =
    `business_discovery.username(${usuario}){username,name,profile_picture_url,followers_count,` +
    `media.limit(${POSTS_POR_PERFIL}){id,caption,media_type,media_product_type,timestamp,permalink,` +
    'thumbnail_url,media_url,like_count,comments_count}}';

  let resposta: Descoberta;
  try {
    resposta = await graph<Descoberta>(`/${contaId}`, { fields: campos }, token, buscar);
  } catch (erro) {
    throw traduzir(erro);
  }
  const d = resposta.business_discovery;
  if (!d) throw new ErroDoEstudio('Esse perfil não é conta profissional; a Meta não deixa ler.', 422, 'perfil-nao-profissional');

  const perfil: PerfilLido = {
    usuario: d.username ?? usuario,
    ...(d.name ? { nome: d.name } : {}),
    ...(d.profile_picture_url ? { foto: d.profile_picture_url } : {}),
    seguidores: d.followers_count ?? 0,
    posts: (d.media?.data ?? []).map((m) => ({
      id: m.id,
      legenda: m.caption ?? '',
      formato: formatoDe(m),
      publicadoEm: instante(m.timestamp),
      link: m.permalink ?? '',
      ...(m.thumbnail_url || m.media_url ? { miniatura: m.thumbnail_url ?? m.media_url } : {}),
      curtidas: m.like_count ?? 0,
      comentarios: m.comments_count ?? 0,
    })),
  };
  await armazem.gravar(chave, JSON.stringify(perfil), CACHE_DA_REFERENCIA_S);
  return perfil;
}

function traduzir(erro: unknown): unknown {
  if (!(erro instanceof ErroDoInstagram)) return erro;
  const c = erro.codigoDaGraph;
  if (c === 110 || /cannot find user|invalid user/i.test(erro.message)) {
    return new ErroDoEstudio('Não achei esse perfil no Instagram.', 404, 'perfil-nao-encontrado');
  }
  if (c === 10 || c === 200) {
    return new ErroDoEstudio(
      'Falta a permissão pages_read_engagement na Meta. Adicione na configuração e reconecte em Ajustes.',
      403,
      'permissao-faltando',
    );
  }
  return erro;
}
