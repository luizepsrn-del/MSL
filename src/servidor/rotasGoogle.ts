import type { Armazem } from './armazem.ts';
import { validarSessao } from './contas.ts';
import {
  convitePara,
  donoDoEstado,
  guardarCredencial,
  credencialDe,
  desconectar,
  acessoValido,
  clienteDoCalendario,
  ErroDoGoogle,
  GoogleNaoConfigurado,
  type AmbienteDoGoogle,
  type ClienteDoCalendario,
} from './google.ts';
import { planejar, type ItemParaEspelhar, type EventoDoGoogle } from '../dominio/google.ts';
import { somarDias, diaValido } from '../dominio/rotina.ts';
import { relogioEm, FUSO_PADRAO } from '../dominio/ical.ts';

/**
 * As rotas do Google.
 *
 * Quatro: pedir o convite, voltar dele, sincronizar e desconectar. Todas
 * exigem sessão, menos a volta — que se identifica pelo `state`, gasto na
 * primeira conferência.
 *
 * **O MSL manda a lista do que quer espelhar, e não o banco inteiro.** Quem
 * sabe o que é tarefa com prazo e o que é peça com data é o cliente; o
 * servidor só precisa de título, dia, hora e `alteradoEm`. Isso mantém a carga
 * pequena e deixa o servidor sem opinião sobre o formato do banco.
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

/** O endereço de volta, montado a partir do próprio pedido. */
export function voltaPara(pedido: Request): string {
  return new URL('/api/google-callback', pedido.url).toString();
}

function comoErro(erro: unknown): Response {
  if (erro instanceof GoogleNaoConfigurado) {
    return json({ erro: 'google-nao-configurado', mensagem: erro.message }, 500);
  }
  if (erro instanceof ErroDoGoogle) {
    return json({ erro: 'google', mensagem: erro.message }, erro.estado);
  }
  throw erro;
}

/* ── Conectar ────────────────────────────────────────────────────────────── */

export async function rotaGoogleConectar(
  pedido: Request,
  armazem: Armazem,
  ambiente: AmbienteDoGoogle,
): Promise<Response> {
  if (pedido.method !== 'POST') return json({ erro: 'metodo' }, 405);

  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return json({ erro: 'sessao-invalida', mensagem: 'Entre de novo.' }, 401);

  try {
    // Devolvo o endereço em vez de redirecionar: o navegador precisa mandar o
    // cabeçalho da sessão para chegar até aqui, e um redirecionamento não
    // carrega cabeçalho nenhum.
    const url = await convitePara(armazem, sessao.valor.usuarioId, voltaPara(pedido), ambiente);
    return json({ url });
  } catch (erro) {
    return comoErro(erro);
  }
}

/**
 * A volta do Google.
 *
 * Responde com uma página, e não com JSON: quem chega aqui é o navegador
 * seguindo um redirecionamento, e uma tela de JSON cru seria o fim da jornada
 * para quem está olhando.
 */
export async function rotaGoogleCallback(
  pedido: Request,
  armazem: Armazem,
  ambiente: AmbienteDoGoogle,
  buscar: typeof fetch = fetch,
): Promise<Response> {
  const parametros = new URL(pedido.url).searchParams;
  const erroDoGoogle = parametros.get('error');
  const codigo = parametros.get('code') ?? '';
  const estado = parametros.get('state') ?? '';

  if (erroDoGoogle) return paginaDeVolta(false, mensagemDoErro(erroDoGoogle));

  const usuarioId = await donoDoEstado(armazem, estado);
  if (!usuarioId) {
    // Sem dono: o convite expirou, já foi usado, ou veio de outro lugar.
    return paginaDeVolta(false, 'Esse convite de conexão não vale mais. Tente conectar de novo.');
  }
  if (!codigo) return paginaDeVolta(false, 'O Google não devolveu o código da autorização.');

  try {
    await guardarCredencial(armazem, usuarioId, codigo, voltaPara(pedido), ambiente, buscar);
    return paginaDeVolta(true, 'Agenda conectada.');
  } catch (erro) {
    const mensagem =
      erro instanceof ErroDoGoogle || erro instanceof GoogleNaoConfigurado
        ? erro.message
        : 'Não deu para conectar.';
    return paginaDeVolta(false, mensagem);
  }
}

function mensagemDoErro(erro: string): string {
  if (erro === 'access_denied') return 'Você não autorizou o acesso à agenda.';
  return `O Google recusou: ${erro}.`;
}

/**
 * A página que fecha o ciclo.
 *
 * Sem folha externa e sem script de terceiro — ela roda no meu domínio logo
 * depois de um fluxo de credencial, e não é lugar para carregar nada de fora.
 */
function paginaDeVolta(deuCerto: boolean, mensagem: string): Response {
  const escapar = (t: string) =>
    t.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

  return new Response(
    `<!doctype html>
<html lang="pt-BR">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${deuCerto ? 'Agenda conectada' : 'Não deu para conectar'}</title>
<style>
  body { margin:0; min-height:100dvh; display:grid; place-items:center; padding:24px;
    font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    background:#08060F; color:#EDEAF5; }
  main { max-width:26rem; text-align:center; }
  h1 { font-size:1.4rem; margin:0 0 .5rem; }
  p { color:#A79FC0; margin:0 0 1.5rem; }
  a { display:inline-block; padding:12px 20px; border-radius:12px; text-decoration:none;
    background:#682EC7; color:#fff; font-weight:600; }
</style>
<main>
  <h1>${deuCerto ? 'Pronto' : 'Não deu'}</h1>
  <p>${escapar(mensagem)}</p>
  <a href="/app/ajustes">Voltar ao My System Life</a>
</main>
</html>`,
    {
      status: deuCerto ? 200 : 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    },
  );
}

/* ── Sincronizar ─────────────────────────────────────────────────────────── */

/** Quantos passos de escrita por chamada, para a função não estourar o tempo. */
export const TETO_DE_PASSOS = 40;

/** O que o cliente manda, conferido antes de virar plano. */
function lerItens(cru: unknown): ItemParaEspelhar[] {
  if (!Array.isArray(cru)) return [];
  return cru.flatMap((x): ItemParaEspelhar[] => {
    if (typeof x !== 'object' || x === null) return [];
    const item = x as Record<string, unknown>;
    const chave = typeof item.chave === 'string' ? item.chave : '';
    const titulo = typeof item.titulo === 'string' ? item.titulo.trim() : '';
    const dia = typeof item.dia === 'string' ? item.dia : '';
    // Título vazio viraria um evento sem nome na agenda dele; dia inválido
    // viraria um evento que o Google recusa e uma sincronização que nunca passa.
    if (chave === '' || titulo === '' || !diaValido(dia)) return [];
    return [
      {
        chave,
        titulo,
        dia,
        hora: typeof item.hora === 'string' && /^\d{2}:\d{2}$/.test(item.hora) ? item.hora : undefined,
        alteradoEm: typeof item.alteradoEm === 'string' ? item.alteradoEm : '',
      },
    ];
  });
}

export interface ResultadoDaSincronia {
  conectado: boolean;
  /** os eventos que são do Google, para o calendário mostrar */
  deles: EventoDoGoogle[];
  /** as mudanças que vieram do Google e o cliente precisa aplicar */
  puxar: { chave: string; dia: string; hora?: string }[];
  /** quantos eventos foram criados, atualizados e apagados lá */
  escritos: { criados: number; atualizados: number; apagados: number };
  /** ficou passo de fora por causa do teto */
  faltou: number;
}

export async function rotaGoogleSincronizar(
  pedido: Request,
  armazem: Armazem,
  ambiente: AmbienteDoGoogle,
  buscar: typeof fetch = fetch,
  /** injetável para o teste não precisar de rede nem de token */
  montarCliente: (acesso: string) => ClienteDoCalendario = (acesso) =>
    clienteDoCalendario(acesso, buscar),
): Promise<Response> {
  if (pedido.method !== 'POST') return json({ erro: 'metodo' }, 405);

  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return json({ erro: 'sessao-invalida', mensagem: 'Entre de novo.' }, 401);

  const usuarioId = sessao.valor.usuarioId;
  if (!(await credencialDe(armazem, usuarioId))) {
    // Não é erro: é a resposta honesta de quem nunca conectou.
    return json({ conectado: false, deles: [], puxar: [], escritos: vazio(), faltou: 0 });
  }

  const corpo = await corpoDe(pedido);
  const de = typeof corpo.de === 'string' && diaValido(corpo.de) ? corpo.de : null;
  const ate = typeof corpo.ate === 'string' && diaValido(corpo.ate) ? corpo.ate : null;
  if (!de || !ate || de > ate) {
    return json({ erro: 'janela', mensagem: 'A janela pedida não é válida.' }, 400);
  }

  const itens = lerItens(corpo.itens);
  const fuso = typeof corpo.fuso === 'string' && corpo.fuso !== '' ? corpo.fuso : FUSO_PADRAO;

  try {
    const acesso = await acessoValido(armazem, usuarioId, ambiente, buscar);
    const cliente = montarCliente(acesso);
    const eventos = await cliente.listar(de, ate);

    const plano = planejar(itens, eventos, {
      fuso,
      diaSeguinte: (dia) => somarDias(dia, 1),
      paraLocal: (iso) => {
        const r = relogioEm(new Date(iso), fuso);
        const dd = (n: number) => String(n).padStart(2, '0');
        return { dia: `${r.ano}-${dd(r.mes)}-${dd(r.dia)}`, hora: `${dd(r.hora)}:${dd(r.minuto)}` };
      },
    });

    const escritos = vazio();
    // O teto existe para a função não estourar o tempo da plataforma numa
    // primeira sincronização grande. O que sobrar vai na próxima — o plano é
    // idempotente, então nada se perde por ser adiado.
    const passos = plano.empurrar.slice(0, TETO_DE_PASSOS);

    for (const passo of passos) {
      if (passo.tipo === 'criar') {
        await cliente.criar(passo.corpo);
        escritos.criados += 1;
      } else if (passo.tipo === 'atualizar') {
        await cliente.atualizar(passo.eventoId, passo.corpo);
        escritos.atualizados += 1;
      } else {
        await cliente.apagar(passo.eventoId);
        escritos.apagados += 1;
      }
    }

    const resultado: ResultadoDaSincronia = {
      conectado: true,
      deles: plano.deles,
      puxar: plano.puxar.map(({ chave, dia, hora }) => ({ chave, dia, hora })),
      escritos,
      faltou: Math.max(plano.empurrar.length - passos.length, 0),
    };
    return json(resultado);
  } catch (erro) {
    return comoErro(erro);
  }
}

const vazio = () => ({ criados: 0, atualizados: 0, apagados: 0 });

/* ── Desconectar ─────────────────────────────────────────────────────────── */

export async function rotaGoogleDesconectar(
  pedido: Request,
  armazem: Armazem,
): Promise<Response> {
  if (pedido.method !== 'POST') return json({ erro: 'metodo' }, 405);

  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return json({ erro: 'sessao-invalida', mensagem: 'Entre de novo.' }, 401);

  // Só apaga a credencial daqui. Os eventos que o MSL criou ficam no Google —
  // desconectar não é apagar a agenda de ninguém.
  await desconectar(armazem, sessao.valor.usuarioId);
  return json({ conectado: false });
}

/* ── Estado ──────────────────────────────────────────────────────────────── */

export async function rotaGoogleEstado(pedido: Request, armazem: Armazem): Promise<Response> {
  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return json({ erro: 'sessao-invalida', mensagem: 'Entre de novo.' }, 401);

  const credencial = await credencialDe(armazem, sessao.valor.usuarioId);
  return json({ conectado: !!credencial, conectadoEm: credencial?.conectadoEm ?? null });
}
