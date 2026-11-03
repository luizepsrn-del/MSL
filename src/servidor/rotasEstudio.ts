import type { Armazem } from './armazem.ts';
import { validarSessao } from './contas.ts';
import { credencialDe, dadosComCache } from './instagram.ts';
import { lerReferencia, gerar, ErroDoEstudio, type AmbienteDoEstudio } from './estudio.ts';
import { normalizarUsuario, lerGerado, MAXIMO_DE_REFERENCIAS, type Pedido } from '../dominio/estudio.ts';
import { diaLocalDe } from '../dominio/rotina.ts';

/**
 * As rotas do Estúdio, penduradas na função do Instagram
 * (`/api/instagram-referencia` e `/api/instagram-gerar`): função nova na
 * Vercel custaria uma das 12 do plano Hobby.
 */

const json = (corpo: unknown, estado = 200): Response =>
  new Response(JSON.stringify(corpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

const tokenDe = (pedido: Request) => {
  const c = pedido.headers.get('Authorization') ?? '';
  return c.startsWith('Bearer ') ? c.slice(7) : undefined;
};

const SEM_SESSAO = () => json({ erro: 'sessao-invalida', mensagem: 'Entre de novo.' }, 401);
const INVALIDO = (mensagem: string) => json({ erro: 'pedido-invalido', mensagem }, 400);

function comoErro(erro: unknown): Response {
  if (erro instanceof ErroDoEstudio) return json({ erro: erro.codigo, mensagem: erro.message }, erro.estado);
  if (erro instanceof Error) return json({ erro: 'meta', mensagem: erro.message }, 502);
  throw erro;
}

export async function rotaEstudioReferencia(
  pedido: Request,
  armazem: Armazem,
  buscar: typeof fetch = fetch,
): Promise<Response> {
  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return SEM_SESSAO();
  const usuario = normalizarUsuario(new URL(pedido.url).searchParams.get('usuario') ?? '');
  if (!usuario) return INVALIDO('Esse @ não parece um perfil do Instagram.');
  const credencial = await credencialDe(armazem, sessao.valor.usuarioId);
  if (!credencial?.contaId) {
    return json({ erro: 'nao-conectado', mensagem: 'Conecte o seu Instagram em Ajustes primeiro.' }, 409);
  }
  try {
    return json(await lerReferencia(credencial.token, credencial.contaId, usuario, armazem, buscar));
  } catch (erro) {
    return comoErro(erro);
  }
}

/** O corpo do pedido de geração, conferido campo a campo. */
function lerPedido(corpo: unknown): Pedido | null {
  if (!corpo || typeof corpo !== 'object') return null;
  const c = corpo as Record<string, unknown>;
  if (c.formato !== 'reel' && c.formato !== 'carrossel') return null;
  if (typeof c.tema !== 'string' || !c.tema.trim() || c.tema.length > 2000) return null;
  const refs = c.referencias ?? [];
  if (!Array.isArray(refs) || refs.length > MAXIMO_DE_REFERENCIAS) return null;
  const formatoValido = (f: unknown) => f === 'reels' || f === 'carrossel' || f === 'imagem';
  const referencias = refs.map((r) => r as Record<string, unknown>);
  if (
    !referencias.every(
      (r) =>
        typeof r.usuario === 'string' &&
        typeof r.legenda === 'string' &&
        formatoValido(r.formato) &&
        typeof r.curtidas === 'number' &&
        typeof r.comentarios === 'number' &&
        typeof r.porQue === 'string',
    )
  )
    return null;
  const pedido: Pedido = { formato: c.formato, tema: c.tema.trim(), referencias: referencias as unknown as Pedido['referencias'] };
  if (c.ajuste && typeof c.ajuste === 'object') {
    const a = c.ajuste as Record<string, unknown>;
    // O anterior volta do navegador: passa pela mesma conferência da resposta
    // do Claude, para não entrar no pedido nada fora da forma.
    const anterior = lerGerado(JSON.stringify(a.anterior ?? null), c.formato);
    if (typeof a.pedido !== 'string' || !a.pedido.trim() || !anterior) return null;
    pedido.ajuste = { pedido: a.pedido.trim().slice(0, 300), anterior };
  }
  return pedido;
}

export async function rotaEstudioGerar(
  pedido: Request,
  armazem: Armazem,
  ambiente: AmbienteDoEstudio,
  buscar: typeof fetch = fetch,
  agora: () => Date = () => new Date(),
): Promise<Response> {
  if (pedido.method !== 'POST') return json({ erro: 'metodo' }, 405);
  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return SEM_SESSAO();
  const lido = lerPedido(await pedido.json().catch(() => null));
  if (!lido) return INVALIDO('Pedido fora da forma: formato, tema e até 3 referências.');

  const usuarioId = sessao.valor.usuarioId;
  const momento = agora();
  // Os números do Instagram são um extra: sem conexão ou com a Meta fora, a
  // geração segue sem eles em vez de falhar.
  let dados = null;
  const credencial = await credencialDe(armazem, usuarioId);
  if (credencial?.contaId) {
    try {
      dados = await dadosComCache(armazem, usuarioId, { ...credencial, contaId: credencial.contaId }, false, momento, buscar);
    } catch {
      dados = null;
    }
  }
  try {
    return json(await gerar(lido, dados, diaLocalDe(momento.toISOString()), usuarioId, armazem, ambiente, buscar));
  } catch (erro) {
    return comoErro(erro);
  }
}
