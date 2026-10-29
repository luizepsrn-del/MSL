import React from 'react';
import type { Banco } from './esquema';
import {
  eventosParaTela,
  lerChave,
  type EventoDoGoogle,
  type ItemParaEspelhar,
  type EventoParaTela,
} from '../dominio/google';
import { somarDias, distanciaEmDias } from '../dominio/rotina';
import { relogioEm, FUSO_PADRAO } from '../dominio/ical';
import type { CompromissoExterno, Efeito, ResultadoDoEfeito } from '../dominio/agente';
import { useBanco } from './BancoContexto';

/**
 * O Google Agenda, do lado do cliente.
 *
 * **Quem decide o que vai para lá é aqui, e não o servidor.** O servidor recebe
 * uma lista de título, dia e hora, e não sabe o que é tarefa nem o que é peça.
 * Isso mantém a carga pequena e deixa a regra de negócio num lugar só.
 *
 * O que sai:
 *
 * - tarefa com prazo, concluída ou não... **não**: só a pendente. Uma tarefa
 *   feita vira ruído na agenda, e como o plano apaga o espelho sem dono, ela
 *   some de lá sozinha quando eu marco aqui.
 * - peça com data de publicar, enquanto não publicada, e nunca semente.
 *
 * Rotina fica de fora de propósito: a agenda viraria a rotina inteira.
 */

const CHAVE_CACHE = 'msl-google-eventos';

/** A janela espelhada: o que já passou pouco, e o que vem por um bom tempo. */
export const DIAS_PARA_TRAS = 30;
export const DIAS_PARA_FRENTE = 180;

/** De quanto em quanto tempo vale sincronizar sozinho. */
export const MINUTOS_ATE_RESSINCRONIZAR = 10;

const dd = (n: number) => String(n).padStart(2, '0');

const paraLocal = (iso: string) => {
  const r = relogioEm(new Date(iso), FUSO_PADRAO);
  return { dia: `${r.ano}-${dd(r.mes)}-${dd(r.dia)}`, hora: `${dd(r.hora)}:${dd(r.minuto)}` };
};

/* ── O que o MSL manda para fora ─────────────────────────────────────────── */

/**
 * Os itens do banco que devem existir no Google, dentro da janela.
 *
 * Exportada e pura, para poder ser provada sem React: é a regra que decide o
 * que aparece na agenda de quem usa, e errar aqui polui a agenda dele.
 */
export function paraEspelhar(banco: Banco, de: string, ate: string): ItemParaEspelhar[] {
  const dentro = (dia: string) => dia >= de && dia <= ate;

  const tarefas = banco.tarefas
    .filter((t) => !t.concluidaEm && t.prazo && dentro(t.prazo))
    .map((t) => ({
      chave: `tarefa:${t.id}`,
      titulo: t.titulo,
      dia: t.prazo!,
      hora: t.hora,
      alteradoEm: t.alteradoEm,
    }));

  const pecas = banco.pecas
    .filter(
      (p) => !p.publicadoEm && p.estado !== 'semente' && p.publicarEm && dentro(p.publicarEm),
    )
    .map((p) => ({
      chave: `peca:${p.id}`,
      titulo: p.titulo,
      dia: p.publicarEm!,
      alteradoEm: p.alteradoEm,
    }));

  // Ordem estável: o servidor corta no teto de passos, e sem ordem fixa o que
  // fica de fora muda a cada chamada — a mesma tarefa nunca seria espelhada.
  return [...tarefas, ...pecas].sort((a, b) =>
    a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0,
  );
}

/* ── Cache ───────────────────────────────────────────────────────────────── */

interface Guardado {
  eventos: EventoDoGoogle[];
  /** ISO UTC da última sincronização bem-sucedida */
  em: string;
}

export function lerCache(guarda: Storage): Guardado | null {
  try {
    const cru = guarda.getItem(CHAVE_CACHE);
    return cru ? (JSON.parse(cru) as Guardado) : null;
  } catch {
    // Janela privada, cota estourada, JSON corrompido. Nada disso impede o
    // calendário de abrir.
    return null;
  }
}

export function gravarCache(guarda: Storage, guardado: Guardado): void {
  try {
    guarda.setItem(CHAVE_CACHE, JSON.stringify(guardado));
  } catch {
    /* sem cache o sistema funciona, só rebusca mais */
  }
}

export function limparCache(guarda: Storage): void {
  try {
    guarda.removeItem(CHAVE_CACHE);
  } catch {
    /* idem */
  }
}

export function estaVelho(guardado: Guardado | null, agora: Date): boolean {
  if (!guardado) return true;
  const idade = agora.getTime() - new Date(guardado.em).getTime();
  return !(idade < MINUTOS_ATE_RESSINCRONIZAR * 60_000);
}

/* ── A conversa com o servidor ───────────────────────────────────────────── */

export class ErroDoGoogle extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDoGoogle';
  }
}

const token = () => window.localStorage.getItem('msl-sessao');

/**
 * O método de cada rota, num lugar só.
 *
 * Existe porque o contrário já custou: o cliente mandava `POST` em
 * `/api/google-estado`, que só exporta `GET`, e a resposta era 405. Os testes
 * de ponta a ponta não pegaram porque a interceptação do Playwright responde a
 * qualquer método — quem pegou foi a chamada ao endereço publicado.
 *
 * `src/servidor/api.test.ts` cobra o outro lado desta tabela: que cada função
 * em `api/` exporte exatamente estes métodos.
 */
export const METODO: Record<string, 'GET' | 'POST'> = {
  '/api/google-estado': 'GET',
  '/api/google-conectar': 'POST',
  '/api/google-sincronizar': 'POST',
  '/api/google-desconectar': 'POST',
  '/api/google-evento': 'POST',
};

export async function falar<T>(
  caminho: string,
  corpo?: unknown,
  buscar: typeof fetch = fetch,
): Promise<T> {
  const acesso = token();
  const metodo = METODO[caminho] ?? 'POST';
  // `GET` com corpo é recusado pelo próprio `fetch`, e a rota de estado não
  // precisa de nenhum.
  const temCorpo = metodo !== 'GET';

  const resposta = await buscar(caminho, {
    method: metodo,
    headers: {
      ...(temCorpo ? { 'Content-Type': 'application/json' } : {}),
      ...(acesso ? { Authorization: `Bearer ${acesso}` } : {}),
    },
    body: temCorpo ? JSON.stringify(corpo ?? {}) : undefined,
  });

  const dados = (await resposta.json().catch(() => ({}))) as T & { mensagem?: string };
  if (!resposta.ok) throw new ErroDoGoogle(dados.mensagem ?? 'Não consegui falar com o Google.');
  return dados;
}

export interface ResultadoDaSincronia {
  conectado: boolean;
  deles: EventoDoGoogle[];
  puxar: { chave: string; dia: string; hora?: string }[];
  escritos: { criados: number; atualizados: number; apagados: number };
  faltou: number;
}

/* ── Mexer num evento que não é nosso ────────────────────────────────────── */

type EfeitoNoGoogle = Extract<Efeito, { tipo: 'evento-do-google' }>;

/**
 * O corpo do pedido para `/api/google-evento`.
 *
 * O fuso vai sempre: o servidor entende "sexta, 15:00" no relógio de quem
 * pediu, e o dele não é o meu.
 */
export function corpoDoEvento(efeito: EfeitoNoGoogle): Record<string, unknown> {
  const { acao, uid } = efeito;
  switch (acao.tipo) {
    case 'apagar':
      return { acao: 'apagar', uid };
    case 'renomear':
      return { acao: 'renomear', uid, novo: acao.novo };
    case 'mover':
      return { acao: 'mover', uid, dia: acao.dia, hora: acao.hora, fuso: FUSO_PADRAO };
    default: {
      // Ação nova sem corpo viraria um pedido vazio, e o servidor o recusaria
      // com um erro que não diz de quem é a culpa.
      const naoTratada: never = acao;
      throw new Error(`ação sem corpo: ${JSON.stringify(naoTratada)}`);
    }
  }
}

/**
 * A cópia local de eventos deixou de valer?
 *
 * Depois de mexer, claro. Mas também depois das recusas que dizem que o Google
 * está diferente do que eu tinha: o evento sumiu, alguém o alterou, ou perdi o
 * acesso. Mostrar a lista antiga depois de ouvir isso é repetir o engano que
 * acabou de ser corrigido. Nas outras recusas nada mudou lá, e o cache serve.
 */
export function cacheFicouVelho(resultado: ResultadoDoEfeito): boolean {
  if (resultado.feito) return true;
  return ['inexistente', 'mudou-enquanto-isso', 'desconectado'].includes(resultado.motivo);
}

export type DepoisDeMexer = 'nada' | 'ressincronizar' | 'desconectar';

/**
 * O que a memória do hook faz depois de mexer.
 *
 * Separada do hook para ter prova: é a decisão em que um erro deixa o agente
 * listando o evento que acabou de ser apagado. `limparCache` só mexe no disco;
 * quem responde é o estado em memória, e ele precisa sair junto.
 * - perdi o acesso: a lista é de uma conta que já não vale, e buscar de novo
 *   com a credencial caída só repetiria o erro;
 * - o cache ficou velho: esvazia a memória e busca de novo;
 * - nada mudou lá: nada se toca.
 */
export function depoisDeMexer(resultado: ResultadoDoEfeito): DepoisDeMexer {
  if (!cacheFicouVelho(resultado)) return 'nada';
  return !resultado.feito && resultado.motivo === 'desconectado' ? 'desconectar' : 'ressincronizar';
}

/**
 * Lê o que o servidor respondeu. Só `feito: true` é sucesso, e uma recusa só
 * vale com motivo; qualquer outra forma é "sem resposta", porque dizer que
 * deu certo com base numa resposta que não entendo seria inventar.
 */
function lerResultado(dados: unknown): ResultadoDoEfeito {
  const d = dados as { feito?: unknown; motivo?: unknown } | null;
  if (d?.feito === true) return { feito: true };
  if (d?.feito === false && typeof d.motivo === 'string') return { feito: false, motivo: d.motivo };
  return { feito: false, motivo: SEM_RESPOSTA };
}

/** O motivo de quando o servidor não respondeu o que se esperava. */
const SEM_RESPOSTA = 'indisponivel';

/**
 * Apaga, move ou renomeia um evento do Google e diz o que aconteceu.
 *
 * Nunca lança: rede caída, erro do servidor e sessão vencida viram "sem
 * resposta", e a tela decide o que dizer. Lançar aqui deixaria o turno preso
 * em "enviando" ou, pior, o faria cair no "Feito" de quem não espera falha.
 */
export async function mexerNoEventoDoGoogle(
  efeito: EfeitoNoGoogle,
  guarda: Storage,
  buscar: typeof fetch = fetch,
): Promise<ResultadoDoEfeito> {
  let resultado: ResultadoDoEfeito;
  try {
    resultado = lerResultado(await falar<unknown>('/api/google-evento', corpoDoEvento(efeito), buscar));
  } catch {
    resultado = { feito: false, motivo: SEM_RESPOSTA };
  }
  if (cacheFicouVelho(resultado)) limparCache(guarda);
  return resultado;
}

/* ── De onde vêm os compromissos do agente ───────────────────────────────── */

/**
 * Os compromissos que o agente enxerga: a mesma regra do calendário. Conectado
 * ao Google, ele manda; senão vale a agenda assinada. Duas fontes ao mesmo
 * tempo mostrariam tudo em dobro.
 *
 * Só o Google tem caminho de escrita, e por isso só os dele são `mexivel`. O
 * campo diz "dá para apontar este evento": ter id. A diferença entre apagar e
 * alterar **não** mora aqui: convidado também apaga (o DELETE tira só a cópia
 * dele), e mover e renomear pedem `souOrganizador`, que o domínio confere por
 * conta própria. Fazer `mexivel` valer `souOrganizador` tiraria do convidado o
 * apagar, que o dono decidiu manter. A assinatura iCal passa sem o campo, e
 * ausente vale não.
 */
export function compromissosDaAgenda(
  google: Pick<Google, 'conectado' | 'eventos'>,
  assinatura: { agenda: { eventos: readonly CompromissoExterno[] } | null },
): readonly CompromissoExterno[] {
  if (!google.conectado) return assinatura.agenda?.eventos ?? [];
  return google.eventos.map((e) => ({
    titulo: e.titulo,
    dia: e.dia,
    hora: e.hora,
    diaInteiro: e.diaInteiro,
    uid: e.uid,
    mexivel: e.uid !== '',
    souOrganizador: e.souOrganizador,
    desde: e.desde,
    ate: e.ate,
  }));
}

/* ── O gancho ────────────────────────────────────────────────────────────── */

export interface Google {
  conectado: boolean;
  /** os eventos que são do Google, na janela pedida */
  eventos: EventoParaTela[];
  sincronizando: boolean;
  /** ISO UTC da última sincronização */
  sincronizadoEm: string | null;
  erro: string | null;
  /** quantos eventos o servidor escreveu na última vez */
  escritos: { criados: number; atualizados: number; apagados: number } | null;
  conectar: () => void;
  desconectar: () => void;
  sincronizarAgora: () => void;
  /** apaga, move ou renomeia um evento, e diz se o Google fez */
  mexerNoEvento: (efeito: EfeitoNoGoogle) => Promise<ResultadoDoEfeito>;
}

/**
 * Sincroniza com o Google e devolve o que o calendário precisa.
 *
 * `de` e `ate` são a janela **da tela**, e não a do espelhamento: a tela mostra
 * o mês que estou olhando, mas o que vai para o Google é sempre a janela larga
 * — senão passar para o mês seguinte apagaria os eventos do mês anterior, que
 * saíram da vista mas não da vida.
 */
export function useGoogle(de: string, ate: string): Google {
  const { banco, hoje, carregando, editarTarefa, editarPeca } = useBanco();

  const [conectado, setConectado] = React.useState(false);
  const [guardado, setGuardado] = React.useState<Guardado | null>(() =>
    lerCache(window.localStorage),
  );
  const [sincronizando, setSincronizando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [escritos, setEscritos] = React.useState<Google['escritos']>(null);

  // Uma por vez: trocar de mês três vezes rápido não pode disparar três.
  const emVoo = React.useRef(false);
  // Mexer num evento invalida a lista: uma busca que já estava no ar trouxe a
  // de antes. A geração diz qual busca ainda vale, e `refazer` pede outra
  // quando a que estava em voo terminar.
  const geracaoDaLista = React.useRef(0);
  const refazer = React.useRef(false);
  const sincronizarRef = React.useRef<(forcar: boolean) => Promise<void>>(async () => {});
  // O banco de agora, para a sincronização não mandar um retrato velho.
  const bancoAgora = React.useRef(banco);
  bancoAgora.current = banco;

  const sincronizar = React.useCallback(
    async (forcar: boolean) => {
      // **Nunca antes de o banco terminar de carregar.**
      //
      // O espelhamento manda "isto é tudo o que existe aqui", e o servidor
      // apaga da agenda o que ele criou e não está mais na lista. Com o banco
      // ainda vazio, essa frase vira "não existe nada" — e abrir o calendário
      // rápido demais limparia da agenda de verdade tudo o que o MSL tinha
      // posto lá.
      //
      // A sincronização de conta já esperava por isto; esta não esperava. Quem
      // mostrou foi o WebKit, onde a hidratação chega depois da resposta da
      // rota, e sete testes de ponta a ponta caíam no iPhone e em nenhum outro
      // lugar.
      if (carregando) return;
      if (emVoo.current) return;
      if (!forcar && !estaVelho(lerCache(window.localStorage), new Date())) return;

      emVoo.current = true;
      const geracao = geracaoDaLista.current;
      setSincronizando(true);
      try {
        const janelaDe = somarDias(hoje, -DIAS_PARA_TRAS);
        const janelaAte = somarDias(hoje, DIAS_PARA_FRENTE);

        const resultado = await falar<ResultadoDaSincronia>('/api/google-sincronizar', {
          de: janelaDe,
          ate: janelaAte,
          fuso: FUSO_PADRAO,
          itens: paraEspelhar(bancoAgora.current, janelaDe, janelaAte),
        });

        setConectado(resultado.conectado);
        setErro(null);
        setEscritos(resultado.escritos);

        if (!resultado.conectado) {
          limparCache(window.localStorage);
          setGuardado(null);
          return;
        }

        // O que mudou lá entra aqui. `editarTarefa`/`editarPeca` carimbam
        // `alteradoEm`, então na próxima rodada o MSL é que estará mais novo e
        // nada volta a ser puxado.
        for (const mudanca of resultado.puxar) {
          const alvo = lerChave(mudanca.chave);
          if (!alvo) continue;
          if (alvo.tipo === 'tarefa') {
            await editarTarefa(alvo.id, { prazo: mudanca.dia, hora: mudanca.hora });
          } else {
            await editarPeca(alvo.id, { publicarEm: mudanca.dia });
          }
        }

        // Mexeram num evento enquanto esta busca estava no ar: a lista dela é
        // a de antes, e gravá-la traria de volta o evento que acabou de sumir.
        if (geracao !== geracaoDaLista.current) return;

        const novo = { eventos: resultado.deles, em: new Date().toISOString() };
        gravarCache(window.localStorage, novo);
        setGuardado(novo);
      } catch (e) {
        setErro(e instanceof ErroDoGoogle ? e.message : 'Não consegui falar com o Google.');
        // O cache velho continua valendo: um erro de rede não é motivo para
        // esvaziar o calendário do que já estava lá.
      } finally {
        emVoo.current = false;
        setSincronizando(false);
        if (refazer.current) {
          refazer.current = false;
          void sincronizarRef.current(true);
        }
      }
    },
    [carregando, hoje, editarTarefa, editarPeca],
  );
  sincronizarRef.current = sincronizar;

  // Ao abrir: pergunta se está conectado e sincroniza se fizer sentido.
  React.useEffect(() => {
    // Perguntar antes de o banco carregar só adiantaria a pergunta; o que vem
    // depois dela precisa do banco de qualquer jeito.
    if (carregando) return;
    let vivo = true;
    void (async () => {
      try {
        const estado = await falar<{ conectado: boolean }>('/api/google-estado');
        if (!vivo) return;
        setConectado(estado.conectado);
        if (estado.conectado) void sincronizar(false);
        else {
          limparCache(window.localStorage);
          setGuardado(null);
        }
      } catch {
        // Sem sessão ou sem rede. O calendário abre com o que tiver em cache.
        if (vivo) setConectado(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [carregando, sincronizar]);

  const eventos = React.useMemo(
    () =>
      guardado
        ? eventosParaTela(guardado.eventos, de, ate, { somarDias, distanciaEmDias, paraLocal })
        : [],
    [guardado, de, ate],
  );

  return {
    conectado,
    eventos: conectado ? eventos : [],
    sincronizando,
    sincronizadoEm: guardado?.em ?? null,
    erro,
    escritos,

    conectar: () => {
      void (async () => {
        try {
          const { url } = await falar<{ url: string }>('/api/google-conectar');
          window.location.href = url;
        } catch (e) {
          setErro(e instanceof ErroDoGoogle ? e.message : 'Não consegui pedir a conexão.');
        }
      })();
    },

    desconectar: () => {
      void (async () => {
        try {
          await falar('/api/google-desconectar');
          limparCache(window.localStorage);
          setGuardado(null);
          setConectado(false);
          setErro(null);
        } catch (e) {
          setErro(e instanceof ErroDoGoogle ? e.message : 'Não consegui desconectar.');
        }
      })();
    },

    sincronizarAgora: () => void sincronizar(true),

    mexerNoEvento: async (efeito) => {
      const resultado = await mexerNoEventoDoGoogle(efeito, window.localStorage);
      const depois = depoisDeMexer(resultado);
      if (depois === 'nada') return resultado;

      // O disco já foi limpo; a memória também, ou o agente seguiria listando
      // o evento até a rebusca chegar, e para sempre se ela falhar.
      setGuardado(null);
      if (depois === 'desconectar') setConectado(false);
      else {
        // Uma sincronização em voo trouxe a lista de antes de mexer: a
        // resposta dela é descartada e outra roda quando ela terminar.
        geracaoDaLista.current += 1;
        if (emVoo.current) refazer.current = true;
        else void sincronizar(true);
      }
      return resultado;
    },
  };
}
