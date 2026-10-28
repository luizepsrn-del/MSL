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
  clienteDoEvento,
  ErroDoGoogle,
  GoogleNaoConfigurado,
  type AmbienteDoGoogle,
  type ClienteDoCalendario,
  type ClienteDoEvento,
  type MudancaDeEvento,
} from './google.ts';
import {
  planejar,
  corpoDoMover,
  type ItemParaEspelhar,
  type EventoDoGoogle,
} from '../dominio/google.ts';
import { somarDias, distanciaEmDias, diaValido } from '../dominio/rotina.ts';
import { relogioEm, FUSO_PADRAO } from '../dominio/ical.ts';

/**
 * As rotas do Google.
 *
 * Pedir o convite, voltar dele, sincronizar, mexer num evento e desconectar.
 * Todas exigem sessão, menos a volta — que se identifica pelo `state`, gasto na
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

/** O dia e a hora da parede, no fuso, de um instante em ISO. */
const paraLocalEm = (fuso: string) => (iso: string) => {
  const r = relogioEm(new Date(iso), fuso);
  const dd = (n: number) => String(n).padStart(2, '0');
  return { dia: `${r.ano}-${dd(r.mes)}-${dd(r.dia)}`, hora: `${dd(r.hora)}:${dd(r.minuto)}` };
};

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
      paraLocal: paraLocalEm(fuso),
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

/* ── Um evento que não é nosso ───────────────────────────────────────────── */

export type MotivoDaRecusa = 'inexistente' | 'sem-permissao' | 'desconectado';

export type RespostaDoEvento = { feito: true } | { feito: false; motivo: MotivoDaRecusa };

type Ordem =
  | { acao: 'apagar'; uid: string }
  | { acao: 'renomear'; uid: string; novo: string }
  | { acao: 'mover'; uid: string; dia: string; hora?: string; fuso: string };

const TAMANHO_MAXIMO_DO_NOME = 1024;

/**
 * Confere o que o cliente mandou. Devolve a ordem pronta, ou o que está errado.
 *
 * Esta é a borda: tudo o que passa daqui vira chamada à agenda de verdade, e o
 * Google aceita com alegria muita coisa torta (uma `hora` sem dois-pontos
 * chegaria ao fim do evento como `NaN`). Por isso a recusa é daqui, e não do
 * domínio, que confia em quem o chama.
 */
function lerOrdem(corpo: Record<string, unknown>): Ordem | string {
  const { acao, uid } = corpo;
  // O id vai parar no endereço. Só entram as letras que um id do Google tem:
  // `..` ou uma barra sairiam do caminho do evento, e `?` acrescentaria
  // parâmetros, entre eles um `sendUpdates` que desfaria a decisão do dono.
  if (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{1,1024}$/.test(uid)) {
    return 'O evento não foi identificado.';
  }

  if (acao === 'apagar') return { acao, uid };

  if (acao === 'renomear') {
    const novo = typeof corpo.novo === 'string' ? corpo.novo.trim() : '';
    // Nome vazio apagaria o título do evento de outra pessoa.
    if (novo === '' || novo.length > TAMANHO_MAXIMO_DO_NOME) return 'O nome novo não é válido.';
    return { acao, uid, novo };
  }

  if (acao === 'mover') {
    const { dia, hora, fuso } = corpo;
    if (typeof dia !== 'string' || !diaValido(dia)) return 'O dia não é válido.';

    // Vazio e ausente querem dizer "sem hora nova": o evento fica no horário
    // que já tinha. Qualquer outra coisa tem que ser HH:MM de verdade.
    const semHora = hora === undefined || hora === null || hora === '';
    if (!semHora && (typeof hora !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora))) {
      return 'A hora não é válida.';
    }

    const fusoFinal = fuso === undefined || fuso === '' ? FUSO_PADRAO : fuso;
    if (typeof fusoFinal !== 'string' || !fusoExiste(fusoFinal)) return 'O fuso não é válido.';

    return { acao, uid, dia, hora: semHora ? undefined : (hora as string), fuso: fusoFinal };
  }

  return 'Essa ação não existe.';
}

function fusoExiste(fuso: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: fuso });
    return true;
  } catch {
    return false;
  }
}

/**
 * Apagar, mover ou renomear um evento do Google.
 *
 * É a porta, com nome, para agir sobre o que não é nosso — o espelho
 * (`planejar`) continua sem saber que ela existe. Age **sempre** pelo id da
 * ocorrência recebido, e nunca toca na série: a listagem expande as séries, e
 * cada ocorrência tem id próprio.
 *
 * `404` e `403` do Google são respostas, e não exceções: o dono precisa ouvir
 * "esse evento já não existe" ou "você não pode mexer nele", e uma exceção só
 * viraria um erro genérico de servidor.
 *
 * Mover e renomear leem o evento antes de escrever. Mover precisa dele para
 * manter a duração; renomear, para não escrever em cima de um evento já
 * apagado — o Google o devolve como `cancelled`, e um PATCH poderia trazê-lo
 * de volta.
 */
export async function rotaGoogleEvento(
  pedido: Request,
  armazem: Armazem,
  ambiente: AmbienteDoGoogle,
  buscar: typeof fetch = fetch,
  /** injetável, como em `rotaGoogleSincronizar` */
  montarCliente: (acesso: string) => ClienteDoEvento = (acesso) => clienteDoEvento(acesso, buscar),
): Promise<Response> {
  if (pedido.method !== 'POST') return json({ erro: 'metodo' }, 405);

  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return json({ erro: 'sessao-invalida', mensagem: 'Entre de novo.' }, 401);

  const ordem = lerOrdem(await corpoDe(pedido));
  if (typeof ordem === 'string') return json({ erro: 'pedido', mensagem: ordem }, 400);

  const usuarioId = sessao.valor.usuarioId;
  const recusa = (motivo: MotivoDaRecusa) => json({ feito: false, motivo } satisfies RespostaDoEvento);
  if (!(await credencialDe(armazem, usuarioId))) return recusa('desconectado');

  try {
    const acesso = await acessoValido(armazem, usuarioId, ambiente, buscar);
    const cliente = montarCliente(acesso);

    let resultado;
    if (ordem.acao === 'apagar') {
      resultado = await cliente.apagar(ordem.uid);
    } else {
      const atual = await cliente.ler(ordem.uid);
      if (!atual.ok) return recusa(atual.motivo);

      const mudanca: MudancaDeEvento =
        ordem.acao === 'renomear'
          ? { summary: ordem.novo }
          : corpoDoMover(atual.valor, ordem.dia, ordem.hora, ordem.fuso, {
              somarDias,
              distanciaEmDias,
              paraLocal: paraLocalEm(ordem.fuso),
            });
      resultado = await cliente.alterar(ordem.uid, mudanca);
    }

    return resultado.ok ? json({ feito: true } satisfies RespostaDoEvento) : recusa(resultado.motivo);
  } catch (erro) {
    // O Google dizer que não aceita mais o acesso é o mesmo caso de quem nunca
    // conectou: a tela já sabe levar a pessoa a reconectar.
    if (erro instanceof ErroDoGoogle && erro.estado === 401) return recusa('desconectado');
    return comoErro(erro);
  }
}

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
