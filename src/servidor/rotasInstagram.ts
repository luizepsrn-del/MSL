import type { Armazem } from './armazem.ts';
import { validarSessao } from './contas.ts';
import { paginaDeVolta } from './paginaDeVolta.ts';
import {
  convitePara,
  donoDoEstado,
  guardarCredencial,
  credencialDe,
  definirConta,
  desconectar,
  dadosComCache,
  ErroDoInstagram,
  InstagramNaoConfigurado,
  type AmbienteDoInstagram,
} from './instagram.ts';

/**
 * As rotas do Instagram.
 *
 * Conectar, voltar da Meta, ver o estado, ler os números, informar a conta e
 * desconectar. Todas exigem sessão, menos a volta — que se identifica pelo
 * `state`, gasto na primeira conferência.
 *
 * O servidor devolve os posts inteiros e não filtra período: o filtro é do
 * cliente, sobre a mesma resposta em cache. Trocar de 30 para 90 dias não
 * precisa custar uma ida à Meta.
 */

const json = (corpo: unknown, estado = 200): Response =>
  new Response(JSON.stringify(corpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

function tokenDe(pedido: Request): string | undefined {
  const cabecalho = pedido.headers.get('Authorization') ?? '';
  return cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : undefined;
}

async function corpoDe(pedido: Request): Promise<Record<string, unknown>> {
  try {
    const corpo = await pedido.json();
    return typeof corpo === 'object' && corpo !== null ? (corpo as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const SEM_SESSAO = () => json({ erro: 'sessao-invalida', mensagem: 'Entre de novo.' }, 401);

/** O ID de uma conta profissional do Instagram: só dígitos. */
const CONTA_VALIDA = /^\d{5,30}$/;

/** O endereço de volta, montado a partir do próprio pedido. */
export function voltaDoInstagram(pedido: Request): string {
  return new URL('/api/instagram-callback', pedido.url).toString();
}

function comoErro(erro: unknown): Response {
  if (erro instanceof InstagramNaoConfigurado) {
    return json({ erro: 'instagram-nao-configurado', mensagem: erro.message }, 500);
  }
  if (erro instanceof ErroDoInstagram) {
    return erro.codigo === 'token-recusado'
      ? json({ erro: 'token-recusado', mensagem: 'A Meta deixou de aceitar a conexão.' }, 401)
      : json({ erro: 'meta', mensagem: erro.message }, 502);
  }
  throw erro;
}

/* ── Conectar e voltar ───────────────────────────────────────────────────── */

export async function rotaInstagramConectar(
  pedido: Request,
  armazem: Armazem,
  ambiente: AmbienteDoInstagram,
): Promise<Response> {
  if (pedido.method !== 'POST') return json({ erro: 'metodo' }, 405);
  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return SEM_SESSAO();
  try {
    // Devolvo o endereço em vez de redirecionar: o navegador precisa mandar o
    // cabeçalho da sessão para chegar aqui, e um redirecionamento não leva.
    return json({ url: await convitePara(armazem, sessao.valor.usuarioId, voltaDoInstagram(pedido), ambiente) });
  } catch (erro) {
    return comoErro(erro);
  }
}

const FALHOU = 'Não deu para conectar';

export async function rotaInstagramCallback(
  pedido: Request,
  armazem: Armazem,
  ambiente: AmbienteDoInstagram,
  buscar: typeof fetch = fetch,
): Promise<Response> {
  const parametros = new URL(pedido.url).searchParams;
  const recusa = parametros.get('error');
  const codigo = parametros.get('code') ?? '';
  const estado = parametros.get('state') ?? '';

  if (recusa) {
    const mensagem =
      recusa === 'access_denied'
        ? 'Você não autorizou o acesso ao Instagram.'
        : `A Meta recusou: ${recusa}.`;
    return paginaDeVolta(false, FALHOU, mensagem);
  }

  const usuarioId = await donoDoEstado(armazem, estado);
  if (!usuarioId) {
    return paginaDeVolta(false, FALHOU, 'Esse convite de conexão não vale mais. Tente conectar de novo.');
  }
  if (!codigo) return paginaDeVolta(false, FALHOU, 'A Meta não devolveu o código da autorização.');

  try {
    const credencial = await guardarCredencial(armazem, usuarioId, codigo, voltaDoInstagram(pedido), ambiente, buscar);
    return paginaDeVolta(
      true,
      'Instagram conectado',
      credencial.contaId
        ? 'Instagram conectado.'
        : 'Instagram conectado. Falta informar o ID da conta, em Ajustes.',
    );
  } catch (erro) {
    const mensagem =
      erro instanceof ErroDoInstagram || erro instanceof InstagramNaoConfigurado
        ? erro.message
        : 'Não deu para conectar.';
    return paginaDeVolta(false, FALHOU, mensagem);
  }
}

/* ── Estado e leitura ────────────────────────────────────────────────────── */

export async function rotaInstagramEstado(pedido: Request, armazem: Armazem): Promise<Response> {
  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return SEM_SESSAO();
  const credencial = await credencialDe(armazem, sessao.valor.usuarioId);
  return json({
    conectado: !!credencial,
    conectadoEm: credencial?.conectadoEm ?? null,
    contaId: credencial?.contaId ?? null,
  });
}

export async function rotaInstagram(
  pedido: Request,
  armazem: Armazem,
  buscar: typeof fetch = fetch,
  agora: () => Date = () => new Date(),
): Promise<Response> {
  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return SEM_SESSAO();

  const usuarioId = sessao.valor.usuarioId;
  const credencial = await credencialDe(armazem, usuarioId);
  if (!credencial) return json({ erro: 'nao-conectado', mensagem: 'O Instagram não está conectado.' }, 409);
  if (!credencial.contaId) {
    return json({ erro: 'sem-conta', mensagem: 'Falta informar o ID da conta do Instagram.' }, 409);
  }

  const atualizar = new URL(pedido.url).searchParams.get('atualizar') === '1';
  try {
    const dados = await dadosComCache(
      armazem,
      usuarioId,
      { ...credencial, contaId: credencial.contaId },
      atualizar,
      agora(),
      buscar,
    );
    return json(dados);
  } catch (erro) {
    return comoErro(erro);
  }
}

/* ── Conta e desconexão ──────────────────────────────────────────────────── */

export async function rotaInstagramConta(pedido: Request, armazem: Armazem): Promise<Response> {
  if (pedido.method !== 'POST') return json({ erro: 'metodo' }, 405);
  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return SEM_SESSAO();

  const contaId = String((await corpoDe(pedido)).contaId ?? '').trim();
  if (!CONTA_VALIDA.test(contaId)) {
    return json({ erro: 'conta-invalida', mensagem: 'O ID da conta tem só números.' }, 400);
  }
  if (!(await credencialDe(armazem, sessao.valor.usuarioId))) {
    return json({ erro: 'nao-conectado', mensagem: 'Conecte o Instagram antes.' }, 409);
  }
  await definirConta(armazem, sessao.valor.usuarioId, contaId);
  return json({ contaId });
}

export async function rotaInstagramDesconectar(pedido: Request, armazem: Armazem): Promise<Response> {
  if (pedido.method !== 'POST') return json({ erro: 'metodo' }, 405);
  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return SEM_SESSAO();
  await desconectar(armazem, sessao.valor.usuarioId);
  return json({ conectado: false });
}
