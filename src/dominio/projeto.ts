import type { Banco, Projeto, Tarefa } from '../dados/esquema';
import { situacao } from './tarefa';

/**
 * Projeto: trabalho maior que uma tarefa.
 *
 * Como em tarefa, nada aqui é guardado — progresso e situação são derivados
 * das tarefas do projeto. Um número gravado envelhece e passa a mentir na
 * primeira tarefa concluída fora desta tela.
 */

export type SituacaoProjeto = 'vazio' | 'em-andamento' | 'atrasado' | 'concluido' | 'arquivado';

export const ROTULO_SITUACAO_PROJETO: Record<SituacaoProjeto, string> = {
  vazio: 'Sem tarefas',
  'em-andamento': 'Em andamento',
  atrasado: 'Atrasado',
  concluido: 'Concluído',
  arquivado: 'Arquivado',
};

/** As tarefas de um projeto, na ordem em que foram criadas. */
export function tarefasDoProjeto(banco: Banco, projetoId: string): Tarefa[] {
  return banco.tarefas.filter((t) => t.projetoId === projetoId);
}

/**
 * Tarefas soltas: sem projeto, **ou** apontando para um projeto que não
 * existe mais.
 *
 * O segundo caso acontece com arquivo importado ou editado à mão. Tratar como
 * solta é melhor que esconder a tarefa num projeto fantasma, que seria perdê-la
 * de vista sem apagar.
 */
export function tarefasSoltas(banco: Banco): Tarefa[] {
  const existentes = new Set(banco.projetos.map((p) => p.id));
  return banco.tarefas.filter((t) => !t.projetoId || !existentes.has(t.projetoId));
}

export interface ProgressoProjeto {
  total: number;
  concluidas: number;
  /** 0 a 1. Um projeto sem tarefa nenhuma é 0, não 1 — ele não começou. */
  fracao: number;
}

export function progressoProjeto(banco: Banco, projetoId: string): ProgressoProjeto {
  const tarefas = tarefasDoProjeto(banco, projetoId);
  const concluidas = tarefas.filter((t) => t.concluidaEm).length;
  return {
    total: tarefas.length,
    concluidas,
    // Diferente do progresso do dia, onde "nada a fazer" é dia cumprido: um
    // projeto sem tarefa não está pronto, está por começar.
    fracao: tarefas.length === 0 ? 0 : concluidas / tarefas.length,
  };
}

export function situacaoProjeto(banco: Banco, projeto: Projeto, hoje: string): SituacaoProjeto {
  if (projeto.arquivadoEm) return 'arquivado';

  const tarefas = tarefasDoProjeto(banco, projeto.id);
  if (tarefas.length === 0) return 'vazio';

  if (tarefas.every((t) => t.concluidaEm)) return 'concluido';

  const temTarefaAtrasada = tarefas.some((t) => situacao(t, hoje) === 'atrasada');
  const prazoEstourado = !!projeto.prazo && projeto.prazo < hoje;
  if (temTarefaAtrasada || prazoEstourado) return 'atrasado';

  return 'em-andamento';
}

/** Projetos ativos, os atrasados primeiro, depois por prazo e por criação. */
export function ordenarProjetos(banco: Banco, hoje: string): Projeto[] {
  const peso: Record<SituacaoProjeto, number> = {
    atrasado: 0,
    'em-andamento': 1,
    vazio: 2,
    concluido: 3,
    arquivado: 4,
  };

  return [...banco.projetos].sort((a, b) => {
    const pa = peso[situacaoProjeto(banco, a, hoje)];
    const pb = peso[situacaoProjeto(banco, b, hoje)];
    if (pa !== pb) return pa - pb;
    if (a.prazo && b.prazo && a.prazo !== b.prazo) return a.prazo < b.prazo ? -1 : 1;
    if (a.prazo && !b.prazo) return -1;
    if (!a.prazo && b.prazo) return 1;
    return a.criadoEm < b.criadoEm ? -1 : a.criadoEm > b.criadoEm ? 1 : 0;
  });
}

/**
 * Remover um projeto **solta** as tarefas dele, não as apaga.
 *
 * A decisão importa: apagar tarefa junto seria destruir trabalho registrado
 * porque o recipiente saiu, e é o tipo de perda que só se descobre depois.
 * Soltar mantém tudo visível na lista de tarefas, de onde dá para reatribuir
 * ou apagar uma a uma, conscientemente.
 *
 * Devolve o banco novo; não muda o que recebeu.
 */
export function removerProjeto(banco: Banco, projetoId: string, agora: string): Banco {
  return {
    ...banco,
    projetos: banco.projetos.filter((p) => p.id !== projetoId),
    tarefas: banco.tarefas.map((t) =>
      t.projetoId === projetoId ? { ...t, projetoId: undefined, alteradoEm: agora } : t,
    ),
  };
}

export interface ResumoProjetos {
  ativos: number;
  atrasados: number;
  concluidos: number;
}

export function resumoProjetos(banco: Banco, hoje: string): ResumoProjetos {
  let ativos = 0;
  let atrasados = 0;
  let concluidos = 0;

  for (const p of banco.projetos) {
    const s = situacaoProjeto(banco, p, hoje);
    if (s === 'arquivado') continue;
    if (s === 'concluido') {
      concluidos++;
      continue;
    }
    ativos++;
    if (s === 'atrasado') atrasados++;
  }

  return { ativos, atrasados, concluidos };
}
