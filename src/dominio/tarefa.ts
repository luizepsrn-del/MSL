import {
  ESTADOS_TAREFA,
  ROTULO_ESTADO,
  type Tarefa,
  type Banco,
  type Contexto,
  type EstadoTarefa,
} from '../dados/esquema';
import { distanciaEmDias, diaValido, diaLocalDe, somarDias } from './rotina';

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
      if (t.concluidaEm && diaLocalDe(t.concluidaEm) === hoje) concluidasHoje++;
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

/**
 * O quadro: em que coluna a tarefa está.
 *
 * `concluidaEm` continua sendo a única verdade sobre "feito" — o campo
 * `estado` só distingue o que ainda está pendente entre parado e em andamento.
 * Por isso um `estado: 'feito'` sem conclusão não promove ninguém: se houvesse
 * duas fontes para a mesma resposta, elas divergiriam.
 */
export function estadoDe(tarefa: Tarefa): EstadoTarefa {
  if (tarefa.concluidaEm) return 'feito';
  return tarefa.estado === 'fazendo' ? 'fazendo' : 'a-fazer';
}

export interface ColunaDoQuadro {
  estado: EstadoTarefa;
  rotulo: string;
  tarefas: Tarefa[];
}

/**
 * As três colunas, sempre as três, mesmo vazias.
 *
 * Coluna que some quando esvazia tira o lugar de soltar a tarefa e faz o
 * quadro mudar de forma enquanto eu arrasto.
 *
 * Em "feito" a ordem é a da conclusão, do mais recente para o mais antigo: o
 * que acabei de terminar aparece no topo, e não afundado sob o de semanas
 * atrás. Nas outras duas vale a ordem de urgência de `ordenarTarefas`.
 */
export function quadro(tarefas: readonly Tarefa[], hoje: string): ColunaDoQuadro[] {
  return ESTADOS_TAREFA.map((estado) => {
    const daColuna = tarefas.filter((t) => estadoDe(t) === estado);
    return {
      estado,
      rotulo: ROTULO_ESTADO[estado],
      tarefas:
        estado === 'feito'
          ? [...daColuna].sort((a, b) => (a.concluidaEm! < b.concluidaEm! ? 1 : -1))
          : ordenarTarefas(daColuna, hoje),
    };
  });
}

/**
 * O que muda no registro ao mover a tarefa para uma coluna.
 *
 * Mover para "feito" conclui; tirar de "feito" reabre, apagando a conclusão.
 * A regra mora aqui, e não no clique, para o arrastar e o marcar caixinha
 * nunca discordarem sobre o que aconteceu.
 */
export function aoMoverPara(tarefa: Tarefa, estado: EstadoTarefa, agora: string): Partial<Tarefa> {
  if (estado === 'feito') {
    return { estado: 'feito', concluidaEm: tarefa.concluidaEm ?? agora };
  }
  return { estado, concluidaEm: undefined };
}

export interface DiaDaSemanaDeTarefas {
  dia: string;
  /** tarefas com prazo neste dia, ainda pendentes */
  pendentes: Tarefa[];
  /** tarefas concluídas neste dia */
  concluidas: Tarefa[];
}

/**
 * Sete dias a partir de `de`, com o que vence e o que foi concluído em cada um.
 *
 * O atraso não é redistribuído pelos dias: uma tarefa que venceu na semana
 * passada continua com o prazo dela, fora desta janela. Quem mostra atraso é o
 * resumo, não a semana.
 */
export function semanaDeTarefas(banco: Banco, de: string, dias = 7): DiaDaSemanaDeTarefas[] {
  const janela: DiaDaSemanaDeTarefas[] = [];
  for (let i = 0; i < dias; i++) {
    const dia = somarDias(de, i);
    janela.push({
      dia,
      pendentes: banco.tarefas.filter((t) => !t.concluidaEm && t.prazo === dia),
      concluidas: banco.tarefas.filter((t) => t.concluidaEm && diaLocalDe(t.concluidaEm) === dia),
    });
  }
  return janela;
}

/**
 * Quantas tarefas concluí por dia, olhando para trás.
 *
 * Serve ao gráfico do Início. O dia sem nenhuma conclusão entra como zero, e
 * não some: buraco na série mentiria sobre o ritmo.
 */
export function concluidasPorDia(
  banco: Banco,
  ate: string,
  dias = 14,
): { dia: string; total: number }[] {
  const inicio = somarDias(ate, -(dias - 1));
  const contagem = new Map<string, number>();
  for (const t of banco.tarefas) {
    if (!t.concluidaEm) continue;
    const dia = diaLocalDe(t.concluidaEm);
    if (dia < inicio || dia > ate) continue;
    contagem.set(dia, (contagem.get(dia) ?? 0) + 1);
  }
  return Array.from({ length: dias }, (_, i) => {
    const dia = somarDias(inicio, i);
    return { dia, total: contagem.get(dia) ?? 0 };
  });
}
