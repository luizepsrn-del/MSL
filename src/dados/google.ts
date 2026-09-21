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

async function falar<T>(caminho: string, corpo?: unknown): Promise<T> {
  const acesso = token();
  const resposta = await fetch(caminho, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(acesso ? { Authorization: `Bearer ${acesso}` } : {}),
    },
    body: JSON.stringify(corpo ?? {}),
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
  const { banco, hoje, editarTarefa, editarPeca } = useBanco();

  const [conectado, setConectado] = React.useState(false);
  const [guardado, setGuardado] = React.useState<Guardado | null>(() =>
    lerCache(window.localStorage),
  );
  const [sincronizando, setSincronizando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [escritos, setEscritos] = React.useState<Google['escritos']>(null);

  // Uma por vez: trocar de mês três vezes rápido não pode disparar três.
  const emVoo = React.useRef(false);
  // O banco de agora, para a sincronização não mandar um retrato velho.
  const bancoAgora = React.useRef(banco);
  bancoAgora.current = banco;

  const sincronizar = React.useCallback(
    async (forcar: boolean) => {
      if (emVoo.current) return;
      if (!forcar && !estaVelho(lerCache(window.localStorage), new Date())) return;

      emVoo.current = true;
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
      }
    },
    [hoje, editarTarefa, editarPeca],
  );

  // Ao abrir: pergunta se está conectado e sincroniza se fizer sentido.
  React.useEffect(() => {
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
  }, [sincronizar]);

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
  };
}
