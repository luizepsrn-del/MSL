import type { Banco, Rotina, Tarefa } from '../dados/esquema';
import {
  deveOcorrerEm,
  diaDaSemana,
  diasNoMes,
  somarDias,
  foiFeita,
  distanciaEmDias,
} from './rotina';
import { situacao } from './tarefa';
import { ocorrenciasEntre, efeitoDaOcorrencia, type Ocorrencia } from './financeiro';

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
  /** lançamentos com data neste dia, já incluindo as repetições dos recorrentes */
  lancamentos: Ocorrencia[];
}

const DIA_VAZIO = (): ItensDoDia => ({ rotinas: [], tarefas: [], lancamentos: [] });

/**
 * O que acontece em cada dia de um intervalo, num passo só.
 *
 * A grade de um mês tem 42 dias. Perguntar dia a dia obrigaria a reexpandir a
 * série de cada lançamento recorrente 42 vezes; aqui a expansão acontece uma
 * vez e cai nos baldes.
 *
 * Os dias sem nada continuam no mapa, vazios: quem desenha a grade precisa de
 * uma resposta para todo dia, não de uma ausência para interpretar.
 */
export function agendaDeIntervalo(banco: Banco, de: string, ate: string): Map<string, ItensDoDia> {
  const mapa = new Map<string, ItensDoDia>();
  const total = distanciaEmDias(de, ate);
  if (total < 0) return mapa;

  for (let i = 0; i <= total; i++) {
    const dia = somarDias(de, i);
    mapa.set(dia, {
      rotinas: banco.rotinas
        .filter((r) => deveOcorrerEm(r, dia))
        .map((rotina) => ({ rotina, feita: foiFeita(banco.execucoes, rotina.id, dia) })),
      tarefas: [],
      lancamentos: [],
    });
  }

  for (const t of banco.tarefas) {
    if (t.prazo) mapa.get(t.prazo)?.tarefas.push(t);
  }
  for (const o of ocorrenciasEntre(banco, de, ate)) {
    mapa.get(o.data)?.lancamentos.push(o);
  }

  return mapa;
}

export function itensDoDia(banco: Banco, dia: string): ItensDoDia {
  return agendaDeIntervalo(banco, dia, dia).get(dia) ?? DIA_VAZIO();
}

export interface ResumoDoDia {
  rotinas: number;
  rotinasFeitas: number;
  tarefas: number;
  lancamentos: number;
  /** soma dos lançamentos do dia, em centavos, com sinal */
  saldo: number;
  /** alguma tarefa com prazo neste dia continua pendente e o dia já passou */
  temAtraso: boolean;
  vazio: boolean;
}

/** Resume um dia já apurado, sem voltar ao banco. */
export function resumirDia(itens: ItensDoDia, hoje: string): ResumoDoDia {
  const { rotinas, tarefas, lancamentos } = itens;
  return {
    rotinas: rotinas.length,
    rotinasFeitas: rotinas.filter((r) => r.feita).length,
    tarefas: tarefas.length,
    lancamentos: lancamentos.length,
    saldo: lancamentos.reduce((t, o) => t + efeitoDaOcorrencia(o), 0),
    temAtraso: tarefas.some((t) => situacao(t, hoje) === 'atrasada'),
    vazio: rotinas.length === 0 && tarefas.length === 0 && lancamentos.length === 0,
  };
}

export function resumoDoDia(banco: Banco, dia: string, hoje: string): ResumoDoDia {
  return resumirDia(itensDoDia(banco, dia), hoje);
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

/**
 * O domingo da semana em que o dia cai.
 *
 * Domingo porque é onde a semana começa no calendário brasileiro, e o resto do
 * sistema já assume isso — `PRIMEIRO_DIA` e `CABECALHO_SEMANA` vêm daqui.
 */
export function inicioDaSemana(dia: string): string {
  return somarDias(dia, -((diaDaSemana(dia) - PRIMEIRO_DIA + 7) % 7));
}

/** Os sete dias da semana em que o dia cai, de domingo a sábado. */
export function semanaDe(dia: string): string[] {
  const inicio = inicioDaSemana(dia);
  return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
}

/** `1 a 7 de fevereiro` · `26 de jan. a 1 de fev.` — o título da semana. */
export function nomeDaSemana(dia: string): string {
  const dias = semanaDe(dia);
  const primeiro = dias[0];
  const ultimo = dias[6];
  const [, mesA] = anoMesDe(primeiro);
  const [, mesB] = anoMesDe(ultimo);
  const diaDe = (d: string) => Number(d.slice(8, 10));

  if (mesA === mesB) return `${diaDe(primeiro)} a ${diaDe(ultimo)} de ${MESES[mesA - 1]}`;
  return `${diaDe(primeiro)} de ${MESES[mesA - 1]} a ${diaDe(ultimo)} de ${MESES[mesB - 1]}`;
}
