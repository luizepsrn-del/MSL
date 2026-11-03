import type { Armazem } from './armazem.ts';
import { graph, formatoDe, instante, ErroDoInstagram, type Midia } from './instagram.ts';
import {
  montarPedido,
  lerGerado,
  type Gerado,
  type Pedido,
  type PerfilLido,
} from '../dominio/estudio.ts';
import type { DadosDoInstagram } from '../dominio/instagram.ts';

/**
 * O Estúdio no servidor: ler perfis de outros criadores na Meta e gerar posts
 * com o Claude.
 *
 * A chave do Claude mora só aqui, em variável de ambiente. Prompt e resposta
 * não são guardados: o que fica é a peça que eu salvar.
 */

export const LIMITE_DIARIO = 30;
const MODELO_PADRAO = 'claude-sonnet-5-5';
const LIMITE_DO_CLAUDE_MS = 45_000;
const CACHE_DA_REFERENCIA_S = 6 * 60 * 60;
const CONTADOR_S = 2 * 24 * 60 * 60;
const POSTS_POR_PERFIL = 25;

export type CodigoDoEstudio =
  | 'sem-chave'
  | 'limite-do-dia'
  | 'ia-falhou'
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

export interface AmbienteDoEstudio {
  ANTHROPIC_API_KEY?: string;
  ESTUDIO_MODELO?: string;
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

/* ── Geração ─────────────────────────────────────────────────────────────── */

/**
 * Gera um post com o Claude.
 *
 * O contador do dia é ler-somar-gravar, não atômico: duas abas no limite
 * podem passar dele por uma geração. É limite de segurança contra conta
 * disparada, não de cobrança — a corrida não vale uma trava.
 */
export async function gerar(
  pedido: Pedido,
  dados: DadosDoInstagram | null,
  dia: string,
  usuarioId: string,
  armazem: Armazem,
  ambiente: AmbienteDoEstudio,
  buscar: typeof fetch = fetch,
): Promise<Gerado> {
  const chave = ambiente.ANTHROPIC_API_KEY;
  if (!chave) {
    throw new ErroDoEstudio('A geração precisa da chave do Claude na Vercel (ANTHROPIC_API_KEY).', 503, 'sem-chave');
  }
  const contador = `estudio:${dia}:${usuarioId}`;
  const feitas = Number((await armazem.ler(contador)) ?? 0) || 0;
  if (feitas >= LIMITE_DIARIO) {
    throw new ErroDoEstudio(`Você chegou às ${LIMITE_DIARIO} gerações de hoje.`, 429, 'limite-do-dia');
  }
  await armazem.gravar(contador, String(feitas + 1), CONTADOR_S);

  const { sistema, mensagem } = montarPedido(pedido, dados, dia);
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const texto = await chamarClaude(sistema, mensagem, chave, ambiente.ESTUDIO_MODELO || MODELO_PADRAO, buscar);
    const gerado = lerGerado(texto, pedido.formato);
    if (gerado) return gerado;
  }
  throw new ErroDoEstudio('O Claude não devolveu um post no formato esperado. Tente de novo.', 502, 'ia-falhou');
}

async function chamarClaude(
  sistema: string,
  mensagem: string,
  chave: string,
  modelo: string,
  buscar: typeof fetch,
): Promise<string> {
  let resposta: Response;
  try {
    resposta = await buscar('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': chave,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 2000,
        system: sistema,
        messages: [{ role: 'user', content: mensagem }],
      }),
      signal: AbortSignal.timeout(LIMITE_DO_CLAUDE_MS),
    });
  } catch {
    throw new ErroDoEstudio('O Claude não respondeu a tempo. Tente de novo.', 504, 'ia-falhou');
  }
  if (!resposta.ok) {
    throw new ErroDoEstudio(`O Claude respondeu ${resposta.status}. Tente de novo.`, 502, 'ia-falhou');
  }
  const corpo = (await resposta.json().catch(() => ({}))) as { content?: { type?: string; text?: string }[] };
  return (corpo.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('');
}
