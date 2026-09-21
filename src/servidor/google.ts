import type { Armazem } from './armazem.ts';
import { segredo } from './senha.ts';
import type { EventoDoGoogle, CorpoDoEvento } from '../dominio/google.ts';

/**
 * Falar com o Google: OAuth e a API do Calendário.
 *
 * ## Onde a credencial mora
 *
 * No Redis, presa à conta — **nunca** no banco do aplicativo e nunca no
 * navegador. É o mesmo tratamento que o token de sessão recebe, e pelo mesmo
 * motivo: o banco viaja no arquivo exportado e na sincronização, e restaurar
 * um backup num aparelho emprestado não pode entregar o acesso à agenda de
 * ninguém.
 *
 * ## O que é guardado
 *
 * O `refresh_token`, que é o que dura, e o `access_token` com a hora em que ele
 * expira, para não pedir um novo a cada chamada. O Google só manda o
 * `refresh_token` na **primeira** autorização, então perdê-lo custa uma
 * reconexão inteira — por isso ele é preservado quando uma renovação vem sem
 * ele, que é o caso normal.
 *
 * ## Nada de SDK
 *
 * `fetch` e mais nada, como no `ArmazemRedis`. Uma dependência a menos para
 * atualizar e auditar num caminho que carrega a credencial da agenda.
 */

const AUTORIZAR = 'https://accounts.google.com/o/oauth2/v2/auth';
const TROCAR = 'https://oauth2.googleapis.com/token';
const CALENDARIO = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/**
 * O escopo, e só ele.
 *
 * `calendar.events` permite ver e editar eventos. Não peço a lista de agendas
 * nem nada além disso: um escopo a mais é uma permissão que eu teria que
 * justificar para sempre.
 */
export const ESCOPO = 'https://www.googleapis.com/auth/calendar.events';

/** Quantos segundos antes do vencimento já vale renovar. */
const FOLGA_DE_RENOVACAO = 120;

/** A autorização pendente morre rápido: ela é um convite de uso único. */
export const SEGUNDOS_DO_ESTADO = 600;

export interface Credencial {
  refreshToken: string;
  accessToken?: string;
  /** ISO UTC do vencimento do `accessToken` */
  expiraEm?: string;
  /** ISO UTC da conexão */
  conectadoEm: string;
}

export interface AmbienteDoGoogle {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /**
   * O ambiente é um saco de textos, e eu só me importo com dois.
   *
   * Sem esta linha, um objeto literal com qualquer outra variável — como o
   * `process.env` de verdade, ou o ambiente de um teste que também precisa de
   * `EMAILS_PERMITIDOS` — é recusado pelo TypeScript.
   */
  [outra: string]: string | undefined;
}

export class GoogleNaoConfigurado extends Error {
  constructor() {
    super(
      'faltam as variáveis do Google: esperava GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET. ' +
        'Veja docs/google-agenda.md, e lembre do Redeploy depois de criá-las.',
    );
    this.name = 'GoogleNaoConfigurado';
  }
}

function credenciaisDo(ambiente: AmbienteDoGoogle): { id: string; segredo: string } {
  const id = ambiente.GOOGLE_CLIENT_ID;
  const chave = ambiente.GOOGLE_CLIENT_SECRET;
  if (!id || !chave) throw new GoogleNaoConfigurado();
  return { id, segredo: chave };
}

const chaveCredencial = (usuarioId: string) => `google:${usuarioId}`;
const chaveEstado = (estado: string) => `google-estado:${estado}`;

/* ── O convite ───────────────────────────────────────────────────────────── */

/**
 * O endereço para onde mandar quem quer conectar.
 *
 * O `state` é gerado aqui, guardado preso ao usuário e devolvido junto. Sem
 * ele, qualquer pessoa poderia fazer o meu navegador terminar um fluxo de
 * autorização que ela começou — e a agenda dela ficaria ligada à minha conta.
 */
export async function convitePara(
  armazem: Armazem,
  usuarioId: string,
  redirecionarPara: string,
  ambiente: AmbienteDoGoogle,
): Promise<string> {
  const { id } = credenciaisDo(ambiente);
  const estado = segredo(24);
  await armazem.gravar(chaveEstado(estado), usuarioId, SEGUNDOS_DO_ESTADO);

  const parametros = new URLSearchParams({
    client_id: id,
    redirect_uri: redirecionarPara,
    response_type: 'code',
    scope: ESCOPO,
    // `offline` é o que faz o Google mandar o refresh_token; sem ele o acesso
    // morre em uma hora e nunca mais volta sem nova autorização.
    access_type: 'offline',
    // `consent` força a tela mesmo em reconexão. Sem isto, quem já autorizou
    // uma vez recebe um código **sem** refresh_token, e a reconexão que
    // deveria consertar o acesso o deixa pela metade.
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: estado,
  });

  return `${AUTORIZAR}?${parametros.toString()}`;
}

/** De quem era o convite, e gasta-o. Uso único de propósito. */
export async function donoDoEstado(armazem: Armazem, estado: string): Promise<string | null> {
  if (!estado) return null;
  const usuarioId = await armazem.ler(chaveEstado(estado));
  if (usuarioId) await armazem.apagar(chaveEstado(estado));
  return usuarioId;
}

/* ── Os tokens ───────────────────────────────────────────────────────────── */

interface RespostaDeToken {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

export class ErroDoGoogle extends Error {
  readonly estado: number;
  constructor(mensagem: string, estado = 502) {
    super(mensagem);
    this.name = 'ErroDoGoogle';
    this.estado = estado;
  }
}

async function pedirToken(
  corpo: Record<string, string>,
  buscar: typeof fetch,
): Promise<RespostaDeToken> {
  const resposta = await buscar(TROCAR, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(corpo).toString(),
    signal: AbortSignal.timeout(10_000),
  });

  const dados = (await resposta.json().catch(() => ({}))) as RespostaDeToken;
  if (!resposta.ok || dados.error) {
    throw new ErroDoGoogle(
      dados.error_description ?? dados.error ?? `o Google respondeu ${resposta.status}`,
    );
  }
  return dados;
}

/** Troca o código da autorização pela credencial, e guarda. */
export async function guardarCredencial(
  armazem: Armazem,
  usuarioId: string,
  codigo: string,
  redirecionarPara: string,
  ambiente: AmbienteDoGoogle,
  buscar: typeof fetch = fetch,
  agora = new Date(),
): Promise<Credencial> {
  const { id, segredo: chave } = credenciaisDo(ambiente);

  const dados = await pedirToken(
    {
      code: codigo,
      client_id: id,
      client_secret: chave,
      redirect_uri: redirecionarPara,
      grant_type: 'authorization_code',
    },
    buscar,
  );

  if (!dados.refresh_token) {
    // Sem ele o acesso morre em uma hora e não volta. Melhor recusar a conexão
    // inteira do que guardar uma credencial que vai falhar amanhã.
    throw new ErroDoGoogle(
      'o Google não mandou a credencial que dura. Desconecte o app em ' +
        'myaccount.google.com/permissions e conecte de novo.',
    );
  }

  const credencial: Credencial = {
    refreshToken: dados.refresh_token,
    accessToken: dados.access_token,
    expiraEm: dados.expires_in
      ? new Date(agora.getTime() + dados.expires_in * 1000).toISOString()
      : undefined,
    conectadoEm: agora.toISOString(),
  };

  await armazem.gravar(chaveCredencial(usuarioId), JSON.stringify(credencial));
  return credencial;
}

export async function credencialDe(
  armazem: Armazem,
  usuarioId: string,
): Promise<Credencial | null> {
  const guardada = await armazem.ler(chaveCredencial(usuarioId));
  if (!guardada) return null;
  try {
    return JSON.parse(guardada) as Credencial;
  } catch {
    return null;
  }
}

export async function desconectar(armazem: Armazem, usuarioId: string): Promise<void> {
  await armazem.apagar(chaveCredencial(usuarioId));
}

/**
 * Um `access_token` válido, renovando quando falta pouco.
 *
 * O `refresh_token` é preservado quando a renovação vem sem ele — que é o caso
 * normal, porque o Google só o manda na primeira autorização. Sobrescrever com
 * `undefined` custaria a conexão inteira na próxima hora.
 */
export async function acessoValido(
  armazem: Armazem,
  usuarioId: string,
  ambiente: AmbienteDoGoogle,
  buscar: typeof fetch = fetch,
  agora = new Date(),
): Promise<string> {
  const credencial = await credencialDe(armazem, usuarioId);
  if (!credencial) throw new ErroDoGoogle('não há agenda do Google conectada.', 409);

  const vence = credencial.expiraEm ? new Date(credencial.expiraEm).getTime() : 0;
  const aindaVale =
    !!credencial.accessToken && vence - agora.getTime() > FOLGA_DE_RENOVACAO * 1000;
  if (aindaVale) return credencial.accessToken!;

  const { id, segredo: chave } = credenciaisDo(ambiente);
  const dados = await pedirToken(
    {
      refresh_token: credencial.refreshToken,
      client_id: id,
      client_secret: chave,
      grant_type: 'refresh_token',
    },
    buscar,
  );

  if (!dados.access_token) throw new ErroDoGoogle('o Google não renovou o acesso.');

  const renovada: Credencial = {
    ...credencial,
    refreshToken: dados.refresh_token ?? credencial.refreshToken,
    accessToken: dados.access_token,
    expiraEm: dados.expires_in
      ? new Date(agora.getTime() + dados.expires_in * 1000).toISOString()
      : undefined,
  };
  await armazem.gravar(chaveCredencial(usuarioId), JSON.stringify(renovada));

  return dados.access_token;
}

/* ── A API do calendário ─────────────────────────────────────────────────── */

async function chamar<T>(
  caminho: string,
  opcoes: { metodo?: string; corpo?: unknown; acesso: string; buscar: typeof fetch },
): Promise<T | null> {
  const resposta = await opcoes.buscar(caminho, {
    method: opcoes.metodo ?? 'GET',
    headers: {
      Authorization: `Bearer ${opcoes.acesso}`,
      ...(opcoes.corpo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
    signal: AbortSignal.timeout(15_000),
  });

  // 204 e 404 no apagar: o evento já não estava lá, e isso é sucesso, não erro
  // — apagar duas vezes tem que dar o mesmo que apagar uma.
  if (resposta.status === 204 || resposta.status === 404) return null;

  if (resposta.status === 401 || resposta.status === 403) {
    throw new ErroDoGoogle(
      'o Google recusou o acesso. Reconecte a agenda em Ajustes.',
      resposta.status,
    );
  }

  if (!resposta.ok) {
    const texto = await resposta.text().catch(() => '');
    throw new ErroDoGoogle(`o Google respondeu ${resposta.status}: ${texto.slice(0, 200)}`);
  }

  return (await resposta.json().catch(() => null)) as T | null;
}

export interface ClienteDoCalendario {
  listar(de: string, ate: string): Promise<EventoDoGoogle[]>;
  criar(corpo: CorpoDoEvento): Promise<EventoDoGoogle | null>;
  atualizar(eventoId: string, corpo: CorpoDoEvento): Promise<EventoDoGoogle | null>;
  apagar(eventoId: string): Promise<void>;
}

/** Quantos eventos por página; o laço para aqui para não varrer a vida inteira. */
export const TETO_DE_PAGINAS = 10;

export function clienteDoCalendario(acesso: string, buscar: typeof fetch = fetch): ClienteDoCalendario {
  return {
    async listar(de, ate) {
      const eventos: EventoDoGoogle[] = [];
      let pagina: string | undefined;

      for (let n = 0; n < TETO_DE_PAGINAS; n++) {
        const parametros = new URLSearchParams({
          // Dia inteiro em UTC nas pontas: a janela é generosa de propósito, e
          // um evento a mais na borda é melhor que um a menos.
          timeMin: `${de}T00:00:00Z`,
          timeMax: `${ate}T23:59:59Z`,
          // Expande as séries: uma reunião semanal chega como as ocorrências
          // dela, e não como a regra — que eu teria que reimplementar aqui.
          singleEvents: 'true',
          maxResults: '250',
          ...(pagina ? { pageToken: pagina } : {}),
        });

        const dados = await chamar<{ items?: EventoDoGoogle[]; nextPageToken?: string }>(
          `${CALENDARIO}?${parametros.toString()}`,
          { acesso, buscar },
        );

        eventos.push(...(dados?.items ?? []));
        pagina = dados?.nextPageToken;
        if (!pagina) break;
      }

      return eventos;
    },

    criar: (corpo) =>
      chamar<EventoDoGoogle>(CALENDARIO, { metodo: 'POST', corpo, acesso, buscar }),

    atualizar: (eventoId, corpo) =>
      chamar<EventoDoGoogle>(`${CALENDARIO}/${encodeURIComponent(eventoId)}`, {
        metodo: 'PATCH',
        corpo,
        acesso,
        buscar,
      }),

    async apagar(eventoId) {
      await chamar(`${CALENDARIO}/${encodeURIComponent(eventoId)}`, {
        metodo: 'DELETE',
        acesso,
        buscar,
      });
    },
  };
}
