import type { Banco, Rotina, Tarefa } from '../dados/esquema';
import { deveOcorrerEm, diaDaSemana, diasNoMes, somarDias, foiFeita } from './rotina';
import { situacao } from './tarefa';

/**
 * Calendário.
 *
 * Não tem esquema nem coleção própria: ele lê rotina e tarefa **no tempo**.
 * Um item só existe num dia porque a recorrência diz que existe, ou porque um
 * prazo cai ali. Guardar ocorrências geradas criaria dado derivado que
 * envelhece — mudar a recorrência de uma rotina teria que reescrever o
 * passado.
 *
 * Tudo em dia local `AAAA-MM-DD`, como o resto do domínio.
 */

/** Domingo primeiro, como o calendário brasileiro. */
export const PRIMEIRO_DIA = 0;

export interface DiaDaGrade {
  /** `AAAA-MM-DD` */
  dia: string;
  /** false para os dias que vêm do mês vizinho, só para fechar a semana */
  doMes: boolean;
}

/**
 * A grade de um mês, em semanas completas de domingo a sábado.
 *
 * Inclui os dias do mês anterior e do seguinte que caem nas semanas das
 * pontas — sem eles a primeira e a última linha ficariam tortas.
 *
 * O número de semanas varia: fevereiro de 28 dias começando num domingo cabe
 * em 4; um mês de 31 começando num sábado precisa de 6.
 */
export function gradeDoMes(ano: number, mes: number): DiaDaGrade[][] {
  const primeiroDoMes = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const total = diasNoMes(ano, mes);

  // Quantos dias do mês anterior entram para a semana começar no domingo.
  const recuo = (diaDaSemana(primeiroDoMes) - PRIMEIRO_DIA + 7) % 7;
  const inicio = somarDias(primeiroDoMes, -recuo);
  const semanas = Math.ceil((recuo + total) / 7);

  const grade: DiaDaGrade[][] = [];
  for (let semana = 0; semana < semanas; semana++) {
    const linha: DiaDaGrade[] = [];
    for (let d = 0; d < 7; d++) {
      const dia = somarDias(inicio, semana * 7 + d);
      linha.push({ dia, doMes: dia.slice(0, 7) === primeiroDoMes.slice(0, 7) });
    }
    grade.push(linha);
  }
  return grade;
}

/** Mês seguinte / anterior, atravessando o ano. */
export function mesVizinho(ano: number, mes: number, passo: number): [number, number] {
  const total = ano * 12 + (mes - 1) + passo;
  return [Math.floor(total / 12), (total % 12) + 1];
}

export interface ItensDoDia {
  rotinas: { rotina: Rotina; feita: boolean }[];
  /** tarefas cujo prazo cai neste dia */
  tarefas: Tarefa[];
}

export function itensDoDia(banco: Banco, dia: string): ItensDoDia {
  return {
    rotinas: banco.rotinas
      .filter((r) => deveOcorrerEm(r, dia))
      .map((rotina) => ({ rotina, feita: foiFeita(banco.execucoes, rotina.id, dia) })),
    tarefas: banco.tarefas.filter((t) => t.prazo === dia),
  };
}

export interface ResumoDoDia {
  rotinas: number;
  rotinasFeitas: number;
  tarefas: number;
  /** alguma tarefa com prazo neste dia continua pendente e o dia já passou */
  temAtraso: boolean;
  vazio: boolean;
}

export function resumoDoDia(banco: Banco, dia: string, hoje: string): ResumoDoDia {
  const { rotinas, tarefas } = itensDoDia(banco, dia);
  const feitas = rotinas.filter((r) => r.feita).length;
  const temAtraso = tarefas.some((t) => situacao(t, hoje) === 'atrasada');

  return {
    rotinas: rotinas.length,
    rotinasFeitas: feitas,
    tarefas: tarefas.length,
    temAtraso,
    vazio: rotinas.length === 0 && tarefas.length === 0,
  };
}

/** `2026-09` → `setembro de 2026`, sem passar por Date. */
const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export function nomeDoMes(ano: number, mes: number): string {
  return `${MESES[mes - 1]} de ${ano}`;
}

/** Iniciais de domingo a sábado, para o cabeçalho da grade. */
export const CABECALHO_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

/** Extrai ano e mês de um `AAAA-MM-DD`. */
export function anoMesDe(dia: string): [number, number] {
  const [ano, mes] = dia.split('-').map(Number);
  return [ano, mes];
}
