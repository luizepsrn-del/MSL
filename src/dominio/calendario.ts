import type { Banco, Rotina, Tarefa, Contexto } from '../dados/esquema';
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

/* ── Hora ────────────────────────────────────────────────────────────────── */

/** `HH:MM` de 00:00 a 23:59. Qualquer outra coisa é inválida, não corrigida. */
export function horaValida(hora: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(hora)) return false;
  const [h, m] = hora.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/**
 * Ordena por hora, e quem não tem hora vai para o fim.
 *
 * O contrário — sem hora primeiro — colocaria "algum dia hoje" antes de
 * "08:00", e a agenda deixaria de ser uma linha do tempo.
 */
export function compararHora(a?: string, b?: string): number {
  const va = a && horaValida(a) ? a : null;
  const vb = b && horaValida(b) ? b : null;
  if (va === vb) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  return va < vb ? -1 : 1;
}

/* ── Filtro ──────────────────────────────────────────────────────────────── */

export interface FiltroCalendario {
  /** só este contexto, ou ausente para os dois */
  contexto?: Contexto;
  /** esconde rotina já cumprida e tarefa já concluída */
  esconderFeitos: boolean;
}

export const SEM_FILTRO: FiltroCalendario = { esconderFeitos: false };

export function filtrarDia(itens: ItensDoDia, filtro: FiltroCalendario): ItensDoDia {
  const doContexto = <T extends { contexto: Contexto }>(x: T) =>
    !filtro.contexto || x.contexto === filtro.contexto;

  return {
    rotinas: itens.rotinas.filter(
      (r) => doContexto(r.rotina) && (!filtro.esconderFeitos || !r.feita),
    ),
    tarefas: itens.tarefas.filter(
      (t) => doContexto(t) && (!filtro.esconderFeitos || !t.concluidaEm),
    ),
    lancamentos: itens.lancamentos.filter((o) => doContexto(o.lancamento)),
  };
}

/* ── A agenda de um dia, em linha ────────────────────────────────────────── */

export type TipoDeItem = 'rotina' | 'tarefa' | 'lancamento';

export interface ItemDaAgenda {
  /** único dentro do dia */
  chave: string;
  tipo: TipoDeItem;
  /** `HH:MM`, ou ausente para o que não tem hora marcada */
  hora?: string;
  titulo: string;
  contexto: Contexto;
  feito: boolean;
  /** o id do registro, para a tela saber o que alternar */
  id: string;
}

/**
 * Os itens de um dia numa lista só, na ordem do relógio.
 *
 * Rotina, tarefa e dinheiro deixam de ser três seções e viram uma linha do
 * tempo — que é como o dia acontece. O que não tem hora vai para o fim, junto,
 * em vez de ser espalhado como se tivesse.
 */
export function agendaEmLinha(itens: ItensDoDia): ItemDaAgenda[] {
  const lista: ItemDaAgenda[] = [
    ...itens.rotinas.map(({ rotina, feita }) => ({
      chave: `rotina:${rotina.id}`,
      tipo: 'rotina' as const,
      hora: rotina.hora,
      titulo: rotina.titulo,
      contexto: rotina.contexto,
      feito: feita,
      id: rotina.id,
    })),
    ...itens.tarefas.map((t) => ({
      chave: `tarefa:${t.id}`,
      tipo: 'tarefa' as const,
      hora: t.hora,
      titulo: t.titulo,
      contexto: t.contexto,
      feito: !!t.concluidaEm,
      id: t.id,
    })),
    ...itens.lancamentos.map((o) => ({
      chave: `lancamento:${o.lancamento.id}@${o.data}`,
      tipo: 'lancamento' as const,
      titulo: o.lancamento.descricao,
      contexto: o.lancamento.contexto,
      feito: false,
      id: o.lancamento.id,
    })),
  ];

  // Empate de hora desempata pelo tipo e pelo título: a ordem não pode mudar
  // entre dois carregamentos do mesmo dia.
  const peso: Record<TipoDeItem, number> = { rotina: 0, tarefa: 1, lancamento: 2 };
  return lista.sort((a, b) => {
    const porHora = compararHora(a.hora, b.hora);
    if (porHora !== 0) return porHora;
    if (peso[a.tipo] !== peso[b.tipo]) return peso[a.tipo] - peso[b.tipo];
    return a.titulo < b.titulo ? -1 : a.titulo > b.titulo ? 1 : 0;
  });
}

/* ── A linha do tempo ────────────────────────────────────────────────────── */

export interface DiaDaLinha {
  dia: string;
  itens: ItensDoDia;
}

/**
 * O que vem pela frente, dia a dia, pulando os dias vazios.
 *
 * Diferente da grade: aqui não há buraco para interpretar, só o que existe, na
 * ordem em que chega. Pular o dia vazio é o ponto — uma lista com trinta dias
 * em branco esconde os três que importam.
 */
export function linhaDoTempo(
  banco: Banco,
  de: string,
  dias: number,
  filtro: FiltroCalendario = SEM_FILTRO,
): DiaDaLinha[] {
  const ate = somarDias(de, dias - 1);
  const agenda = agendaDeIntervalo(banco, de, ate);

  const linha: DiaDaLinha[] = [];
  for (let i = 0; i < dias; i++) {
    const dia = somarDias(de, i);
    const itens = filtrarDia(agenda.get(dia) ?? { rotinas: [], tarefas: [], lancamentos: [] }, filtro);
    if (itens.rotinas.length + itens.tarefas.length + itens.lancamentos.length > 0) {
      linha.push({ dia, itens });
    }
  }
  return linha;
}
