import type { Tarefa, Banco, Contexto } from '../dados/esquema';
import { distanciaEmDias, diaValido } from './rotina';

/**
 * Tarefa: o que tem fim, ao contrário da rotina, que se repete.
 *
 * A situação **não é um campo**, é derivada do prazo e da conclusão. Guardar
 * "atrasada" no banco criaria um estado que envelhece sozinho e que precisaria
 * de alguém varrendo o banco à meia-noite para continuar verdadeiro.
 */

export type Situacao = 'concluida' | 'atrasada' | 'hoje' | 'futura' | 'sem-prazo';

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  concluida: 'Concluída',
  atrasada: 'Atrasada',
  hoje: 'Para hoje',
  futura: 'Agendada',
  'sem-prazo': 'Sem prazo',
};

/** A ordem em que as situações importam. Menor vem primeiro. */
const PESO: Record<Situacao, number> = {
  atrasada: 0,
  hoje: 1,
  futura: 2,
  'sem-prazo': 3,
  concluida: 4,
};

export function situacao(tarefa: Tarefa, hoje: string): Situacao {
  if (tarefa.concluidaEm) return 'concluida';
  if (!tarefa.prazo || !diaValido(tarefa.prazo)) return 'sem-prazo';

  const distancia = distanciaEmDias(hoje, tarefa.prazo);
  if (distancia < 0) return 'atrasada';
  if (distancia === 0) return 'hoje';
  return 'futura';
}

/** Dias de atraso. Zero quando não está atrasada — nunca negativo. */
export function diasDeAtraso(tarefa: Tarefa, hoje: string): number {
  if (situacao(tarefa, hoje) !== 'atrasada') return 0;
  return -distanciaEmDias(hoje, tarefa.prazo!);
}

/**
 * A ordem em que eu quero ver a lista.
 *
 * Atrasada antes de hoje, hoje antes do futuro, sem prazo por último, e o que
 * está concluído no fim. Dentro de cada grupo, o prazo mais próximo primeiro;
 * empatou, a criada antes vem antes — a ordem nunca é aleatória entre dois
 * carregamentos.
 */
export function ordenarTarefas(tarefas: readonly Tarefa[], hoje: string): Tarefa[] {
  return [...tarefas].sort((a, b) => {
    const pa = PESO[situacao(a, hoje)];
    const pb = PESO[situacao(b, hoje)];
    if (pa !== pb) return pa - pb;

    if (a.prazo && b.prazo && a.prazo !== b.prazo) return a.prazo < b.prazo ? -1 : 1;

    return a.criadoEm < b.criadoEm ? -1 : a.criadoEm > b.criadoEm ? 1 : 0;
  });
}

export interface ResumoTarefas {
  pendentes: number;
  atrasadas: number;
  paraHoje: number;
  concluidasHoje: number;
}

/** Os números que o Início mostra. */
export function resumoTarefas(banco: Banco, hoje: string): ResumoTarefas {
  let pendentes = 0;
  let atrasadas = 0;
  let paraHoje = 0;
  let concluidasHoje = 0;

  for (const t of banco.tarefas) {
    const s = situacao(t, hoje);
    if (s === 'concluida') {
      // `concluidaEm` é um instante UTC; o dia local dele é o que interessa
      // para "concluí hoje".
      if (t.concluidaEm && t.concluidaEm.slice(0, 10) >= hoje) concluidasHoje++;
      continue;
    }
    pendentes++;
    if (s === 'atrasada') atrasadas++;
    if (s === 'hoje') paraHoje++;
  }

  return { pendentes, atrasadas, paraHoje, concluidasHoje };
}

/** O que merece aparecer no Início: atrasadas e as de hoje, nessa ordem. */
export function tarefasDoDia(banco: Banco, hoje: string): Tarefa[] {
  return ordenarTarefas(
    banco.tarefas.filter((t) => {
      const s = situacao(t, hoje);
      return s === 'atrasada' || s === 'hoje';
    }),
    hoje,
  );
}

export function tarefasPorContexto(tarefas: readonly Tarefa[], contexto: Contexto): Tarefa[] {
  return tarefas.filter((t) => t.contexto === contexto);
}

/** Texto do prazo, relativo quando está perto e absoluto quando está longe. */
export function descreverPrazo(tarefa: Tarefa, hoje: string): string {
  const s = situacao(tarefa, hoje);

  switch (s) {
    case 'sem-prazo':
      return 'Sem prazo';
    case 'hoje':
      return 'Vence hoje';
    case 'atrasada': {
      const dias = diasDeAtraso(tarefa, hoje);
      return dias === 1 ? 'Venceu ontem' : `Venceu há ${dias} dias`;
    }
    case 'futura': {
      const dias = distanciaEmDias(hoje, tarefa.prazo!);
      if (dias === 1) return 'Vence amanhã';
      if (dias <= 7) return `Vence em ${dias} dias`;
      return `Vence em ${formatarDiaMes(tarefa.prazo!)}`;
    }
    case 'concluida':
      return 'Concluída';
  }
}

const MESES = [
  'jan.',
  'fev.',
  'mar.',
  'abr.',
  'mai.',
  'jun.',
  'jul.',
  'ago.',
  'set.',
  'out.',
  'nov.',
  'dez.',
];

/** `20 de jan.` — sem passar por Date, que traria fuso para dentro. */
function formatarDiaMes(dia: string): string {
  const [, mes, data] = dia.split('-').map(Number);
  return `${data} de ${MESES[mes - 1]}`;
}
