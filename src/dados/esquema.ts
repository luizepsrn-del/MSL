/**
 * O esquema dos dados, com versão.
 *
 * A versão existe desde antes de haver dado meu para migrar — é o único
 * momento em que dá para acertar isso de graça. Toda mudança de formato daqui
 * em diante sobe `VERSAO_ESQUEMA` e ganha uma migração em `migracoes.ts`.
 */

/** Sobe a cada mudança de formato. Nunca reutilize um número. */
export const VERSAO_ESQUEMA = 2;

/** Todo item do sistema carrega isto. */
export interface Registro {
  id: string;
  /** ISO 8601 em UTC. O fuso entra na exibição, não no armazenamento. */
  criadoEm: string;
  alteradoEm: string;
}

/**
 * O eixo de contexto.
 *
 * Vida pessoal e profissional convivem no mesmo sistema, separadas por este
 * eixo e não por dois aplicativos.
 */
export type Contexto = 'pessoal' | 'profissional';

export const CONTEXTOS: Contexto[] = ['pessoal', 'profissional'];

export const ROTULO_CONTEXTO: Record<Contexto, string> = {
  pessoal: 'Pessoal',
  profissional: 'Profissional',
};

/* ── Rotina ──────────────────────────────────────────────────────────────── */

/**
 * Como uma rotina se repete.
 *
 * `dias` usa 0 = domingo, como `Date.getDay` e como o calendário brasileiro.
 */
export type Recorrencia =
  | { tipo: 'diaria' }
  | { tipo: 'semanal'; dias: number[] }
  | { tipo: 'mensal'; diaDoMes: number }
  | { tipo: 'intervalo'; aCadaDias: number };

export interface Rotina extends Registro {
  titulo: string;
  contexto: Contexto;
  recorrencia: Recorrencia;
  /** kebab-case do Lucide */
  icone: string;
  /** data local `AAAA-MM-DD` a partir da qual a rotina vale */
  inicioEm: string;
  /** arquivada some das listas sem perder o histórico */
  arquivada: boolean;
}

/**
 * Uma ocorrência concluída.
 *
 * Guardo o que foi feito, não o que faltou: a ausência de execução num dia já
 * diz que não foi feito, e assim o banco não cresce com registros vazios.
 */
export interface Execucao extends Registro {
  rotinaId: string;
  /** data local `AAAA-MM-DD` do dia a que a execução se refere */
  dia: string;
}

/* ── Tarefa ──────────────────────────────────────────────────────────────── */

/**
 * Uma tarefa é o que tem fim, ao contrário da rotina, que se repete.
 *
 * `prazo` é opcional de propósito: boa parte do que eu preciso fazer não tem
 * data, e obrigar uma inventa urgência falsa.
 */
export interface Tarefa extends Registro {
  titulo: string;
  contexto: Contexto;
  /** data local `AAAA-MM-DD`, ou ausente quando não há prazo */
  prazo?: string;
  /** ISO UTC do momento em que foi concluída; ausente enquanto pendente */
  concluidaEm?: string;
  anotacao?: string;
}

/* ── O banco ─────────────────────────────────────────────────────────────── */

export interface Banco {
  versao: number;
  rotinas: Rotina[];
  execucoes: Execucao[];
  tarefas: Tarefa[];
}

export const COLECOES = ['rotinas', 'execucoes', 'tarefas'] as const;
export type NomeColecao = (typeof COLECOES)[number];

export function bancoVazio(): Banco {
  return { versao: VERSAO_ESQUEMA, rotinas: [], execucoes: [], tarefas: [] };
}

/** Identificador estável e ordenável por criação. */
export function novoId(): string {
  const aleatorio =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(36)}-${aleatorio}`;
}

/** `AAAA-MM-DD` do dia local, que é a chave usada por rotina e execução. */
export function diaLocal(d: Date, fuso = 'America/Sao_Paulo'): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: fuso,
  }).format(d);
}
