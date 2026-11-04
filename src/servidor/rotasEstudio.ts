import type { Armazem } from './armazem.ts';
import { validarSessao } from './contas.ts';
import { credencialDe } from './instagram.ts';
import { lerReferencia, ErroDoEstudio } from './estudio.ts';
import { normalizarUsuario } from '../dominio/estudio.ts';

/**
 * A rota do Estúdio, pendurada na função do Instagram
 * (`/api/instagram-referencia`): função nova na Vercel custaria uma das 12 do
 * plano Hobby.
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
