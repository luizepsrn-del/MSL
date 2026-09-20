import React from 'react';
import { lerAgenda, type AgendaLida } from '../dominio/ical';
import { useBanco } from './BancoContexto';

/**
 * A agenda externa, do lado do cliente.
 *
 * Busca o texto iCal pela função `/api/agenda` — o navegador não pode buscar
 * direto, porque o Google não manda `Access-Control-Allow-Origin` no endereço
 * secreto.
 *
 * **O texto fica em `localStorage`, e não no banco.** É cache, não dado meu:
 * pode sumir sem perda, não precisa viajar para o outro aparelho, e não tem o
 * que sincronizar. O que viaja é só o endereço, que mora nas preferências.
 *
 * Sem rede, o cache continua valendo — o calendário abre com os compromissos
 * da última busca em vez de abrir vazio, que é a diferença entre um sistema
 * que funciona no avião e um que só parece funcionar.
 */

const CHAVE = 'msl-agenda-externa';

/** De quanto em quanto tempo vale rebuscar. O Google atualiza devagar. */
export const MINUTOS_ATE_REBUSCAR = 30;

export interface AgendaGuardada {
  /** o endereço de onde este texto veio, para o cache não servir a agenda errada */
  url: string;
  texto: string;
  /** ISO UTC da busca */
  buscadoEm: string;
}

export function lerCache(guarda: Storage, url: string): AgendaGuardada | null {
  try {
    const cru = guarda.getItem(CHAVE);
    if (!cru) return null;
    const guardada = JSON.parse(cru) as AgendaGuardada;
    // Trocar o endereço invalida o cache na hora. Sem esta conferência, colar
    // a agenda do trabalho mostraria a da casa até o próximo rebusque.
    return guardada.url === url ? guardada : null;
  } catch {
    // Janela privada, cota estourada, JSON corrompido. Nada disso é motivo
    // para o calendário não abrir.
    return null;
  }
}

export function gravarCache(guarda: Storage, guardada: AgendaGuardada): void {
  try {
    guarda.setItem(CHAVE, JSON.stringify(guardada));
  } catch {
    /* sem cache o sistema funciona, só rebusca mais */
  }
}

export function limparCache(guarda: Storage): void {
  try {
    guarda.removeItem(CHAVE);
  } catch {
    /* idem */
  }
}

export function estaVelha(guardada: AgendaGuardada | null, agora: Date): boolean {
  if (!guardada) return true;
  const idade = agora.getTime() - new Date(guardada.buscadoEm).getTime();
  // `NaN` de um instante ilegível também conta como velha: rebuscar é barato,
  // mostrar dado de origem desconhecida não é.
  return !(idade < MINUTOS_ATE_REBUSCAR * 60_000);
}

export class ErroDaAgenda extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDaAgenda';
  }
}

/** Busca o texto pela função, com a sessão no cabeçalho. */
export async function buscarAgenda(
  url: string,
  token: string | null,
  buscar: typeof fetch = fetch,
): Promise<AgendaGuardada> {
  const resposta = await buscar('/api/agenda', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ url }),
  });

  const corpo = (await resposta.json().catch(() => ({}))) as {
    texto?: string;
    buscadoEm?: string;
    mensagem?: string;
  };

  if (!resposta.ok || typeof corpo.texto !== 'string') {
    throw new ErroDaAgenda(corpo.mensagem ?? 'Não consegui buscar a agenda.');
  }

  return { url, texto: corpo.texto, buscadoEm: corpo.buscadoEm ?? new Date().toISOString() };
}

/* ── O gancho ────────────────────────────────────────────────────────────── */

export interface AgendaExterna {
  /** os eventos da janela pedida, ou null quando não há agenda assinada */
  agenda: AgendaLida | null;
  buscando: boolean;
  /** ISO UTC da última busca bem-sucedida */
  buscadoEm: string | null;
  erro: string | null;
  atualizarAgora: () => void;
}

/**
 * Os eventos da agenda externa, na janela pedida.
 *
 * A janela entra aqui e não no cache: o texto é buscado uma vez e relido a
 * cada mudança de mês, o que é barato e evita uma busca de rede por navegação.
 */
export function useAgendaExterna(de: string, ate: string): AgendaExterna {
  const { banco } = useBanco();
  const url = banco.preferencias?.agendaExterna?.url ?? null;

  const [guardada, setGuardada] = React.useState<AgendaGuardada | null>(() =>
    url ? lerCache(window.localStorage, url) : null,
  );
  const [buscando, setBuscando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  // Uma busca por vez. Sem isto, trocar de mês três vezes rápido dispara três.
  const emVoo = React.useRef(false);

  const atualizar = React.useCallback(
    async (forcar: boolean) => {
      if (!url || emVoo.current) return;
      const doCache = lerCache(window.localStorage, url);
      if (!forcar && !estaVelha(doCache, new Date())) {
        setGuardada(doCache);
        return;
      }

      emVoo.current = true;
      setBuscando(true);
      try {
        const nova = await buscarAgenda(url, window.localStorage.getItem('msl-sessao'));
        gravarCache(window.localStorage, nova);
        setGuardada(nova);
        setErro(null);
      } catch (e) {
        setErro(e instanceof ErroDaAgenda ? e.message : 'Não consegui buscar a agenda.');
        // O cache velho continua valendo: um erro de rede não é motivo para
        // esvaziar o calendário do que já estava lá.
        if (doCache) setGuardada(doCache);
      } finally {
        emVoo.current = false;
        setBuscando(false);
      }
    },
    [url],
  );

  React.useEffect(() => {
    if (!url) {
      setGuardada(null);
      setErro(null);
      return;
    }
    void atualizar(false);
  }, [url, atualizar]);

  const agenda = React.useMemo(
    () => (guardada ? lerAgenda(guardada.texto, de, ate) : null),
    [guardada, de, ate],
  );

  return {
    agenda: url ? agenda : null,
    buscando,
    buscadoEm: guardada?.buscadoEm ?? null,
    erro,
    atualizarAgora: () => void atualizar(true),
  };
}
