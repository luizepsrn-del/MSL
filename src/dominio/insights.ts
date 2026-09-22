import type { Banco, Rotulo, Tarefa, Rotina, Peca } from '../dados/esquema';
import { somarDias, distanciaEmDias, deveOcorrerEm, foiFeita, diaLocalDe } from './rotina';
import { inicioDaSemana } from './calendario';
import { JORNADA_PADRAO, emMinutos, type Jornada } from './plano';

/**
 * Para onde foi o meu tempo.
 *
 * Tudo aqui é função pura sobre um banco e uma lista de compromissos externos.
 * Nada de rede, nada de relógio escondido.
 *
 * ## A regra que sustenta todos os números
 *
 * **Compromisso sem duração declarada vale o bloco padrão da jornada.** É uma
 * estimativa, e ela é dita na tela — mas é uma estimativa honesta: sem ela,
 * "2h de reunião" e "15 min de e-mail" pesariam igual, e qualquer conta de
 * carga horária mentiria para o lado confortável.
 *
 * ## O que conta como tempo
 *
 * O que tem **hora marcada**, mais o que tem duração declarada. Uma tarefa
 * solta com prazo mas sem hora nem duração não vira carga horária: ela é uma
 * intenção, não um compromisso, e enfiá-la na conta encheria a semana de
 * tempo que ninguém marcou.
 */

/** Um balde de tempo, com de onde ele veio. */
export interface FatiaDeTempo {
  /** o id do rótulo, ou `null` para o que não tem nenhum */
  rotuloId: string | null;
  minutos: number;
  /** quantos compromissos formaram esta fatia */
  itens: number;
}

/** O que o MSL sabe de um compromisso externo, para as contas. */
export interface CompromissoExterno {
  /**
   * A identidade do evento — **a mesma em todas as ocorrências dele**.
   *
   * É a chave do rótulo quando não há série. Usar a ocorrência aqui faria uma
   * viagem de três dias virar três eventos distintos, e marcar um deles
   * deixaria os outros dois sem rótulo.
   */
  id: string;
  /** a série, quando o evento se repete; é por ela que o rótulo é guardado */
  serie?: string;
  dia: string;
  /** `HH:MM`; sem ela o evento é de dia inteiro e não entra na conta de horas */
  hora?: string;
  fim?: string;
  diaInteiro: boolean;
}

/* ── Quanto tempo cada coisa toma ────────────────────────────────────────── */

/**
 * Os minutos de um item do MSL.
 *
 * `null` quando ele não é um compromisso no tempo — sem hora e sem duração,
 * não há o que medir, e chutar um bloco para ele inflaria a semana inteira.
 */
export function minutosDoItem(
  item: { hora?: string; duracao?: number },
  jornada: Jornada,
): number | null {
  if (item.duracao !== undefined && item.duracao > 0) return Math.trunc(item.duracao);
  if (item.hora) return Math.max(Math.trunc(jornada.minutosPorItem) || 1, 1);
  return null;
}

/**
 * Os minutos de um compromisso externo.
 *
 * Evento de dia inteiro não vira horas: ele marca o dia, não o ocupa. Contar
 * um feriado como oito horas de compromisso seria o tipo de número que faz a
 * tela inteira perder a credibilidade.
 */
export function minutosDoEvento(evento: CompromissoExterno, jornada: Jornada): number | null {
  if (evento.diaInteiro || !evento.hora) return null;
  const comeco = emMinutos(evento.hora);
  if (comeco === null) return null;

  const fim = evento.fim ? emMinutos(evento.fim) : null;
  if (fim === null || fim <= comeco) {
    return Math.max(Math.trunc(jornada.minutosPorItem) || 1, 1);
  }
  return fim - comeco;
}

/* ── Onde foi o meu tempo ────────────────────────────────────────────────── */

const dentro = (dia: string, de: string, ate: string) => dia >= de && dia <= ate;

/**
 * Onde o rótulo de um evento fica guardado.
 *
 * A série quando ela existe, senão o evento. É o que faz marcar a reunião de
 * segunda marcar todas as segundas — que é o que "esta reunião" quer dizer.
 */
export function chaveDeRotulo(evento: { id: string; serie?: string }): string {
  return evento.serie ?? evento.id;
}

/** O rótulo guardado sob uma chave, ou nenhum. */
export function rotuloMarcado(banco: Banco, chave: string): string | null {
  return banco.marcacoes.find((m) => m.chaveDoEvento === chave)?.rotuloId ?? null;
}

/** O rótulo de um evento externo, pela série quando ela existe. */
export function rotuloDoEvento(banco: Banco, evento: CompromissoExterno): string | null {
  return rotuloMarcado(banco, chaveDeRotulo(evento));
}

/**
 * O tempo da janela, repartido por rótulo.
 *
 * Ordenado do maior para o menor, com o sem-rótulo sempre no fim — ele não é
 * uma categoria, é a ausência de uma, e deixá-lo competir por posição faria a
 * lista mudar de ordem conforme eu fosse marcando as coisas.
 */
export function tempoPorRotulo(
  banco: Banco,
  externos: readonly CompromissoExterno[],
  de: string,
  ate: string,
  jornada: Jornada = JORNADA_PADRAO,
): FatiaDeTempo[] {
  const baldes = new Map<string | null, FatiaDeTempo>();

  const somar = (rotuloId: string | null, minutos: number) => {
    const atual = baldes.get(rotuloId) ?? { rotuloId, minutos: 0, itens: 0 };
    baldes.set(rotuloId, { rotuloId, minutos: atual.minutos + minutos, itens: atual.itens + 1 });
  };

  for (const tarefa of banco.tarefas) {
    if (!tarefa.prazo || !dentro(tarefa.prazo, de, ate)) continue;
    const minutos = minutosDoItem(tarefa, jornada);
    if (minutos !== null) somar(tarefa.rotuloId ?? null, minutos);
  }

  // A rotina conta em cada dia em que ela de fato ocorre na janela — é assim
  // que "treinar uma hora, cinco vezes por semana" vira cinco horas, e não uma.
  for (const rotina of banco.rotinas) {
    if (rotina.arquivada) continue;
    const minutos = minutosDoItem(rotina, jornada);
    if (minutos === null) continue;
    for (let dia = de; dia <= ate; dia = somarDias(dia, 1)) {
      if (deveOcorrerEm(rotina, dia)) somar(rotina.rotuloId ?? null, minutos);
    }
  }

  for (const peca of banco.pecas) {
    if (!peca.publicarEm || !dentro(peca.publicarEm, de, ate)) continue;
    // Peça não tem hora nem duração: ela vale o bloco padrão, como qualquer
    // compromisso que eu marquei para um dia sem dizer quanto toma.
    somar(peca.rotuloId ?? null, Math.max(Math.trunc(jornada.minutosPorItem) || 1, 1));
  }

  for (const evento of externos) {
    if (!dentro(evento.dia, de, ate)) continue;
    const minutos = minutosDoEvento(evento, jornada);
    if (minutos !== null) somar(rotuloDoEvento(banco, evento), minutos);
  }

  return [...baldes.values()].sort((a, b) => {
    // O sem-rótulo vai para o fim, sempre.
    if ((a.rotuloId === null) !== (b.rotuloId === null)) return a.rotuloId === null ? 1 : -1;
    if (a.minutos !== b.minutos) return b.minutos - a.minutos;
    return (a.rotuloId ?? '') < (b.rotuloId ?? '') ? -1 : 1;
  });
}

/* ── Reuniões, semana a semana ───────────────────────────────────────────── */

export interface SemanaDeReunioes {
  /** domingo da semana */
  de: string;
  ate: string;
  minutosRecorrentes: number;
  minutosUnicos: number;
  total: number;
}

/**
 * Quanto tempo em compromisso externo, semana a semana.
 *
 * Separa o que se repete do que foi uma vez só, porque são coisas diferentes:
 * a reunião semanal é um custo fixo que eu escolhi uma vez e pago para sempre;
 * a pontual é uma decisão daquela semana.
 */
export function reunioesPorSemana(
  externos: readonly CompromissoExterno[],
  hoje: string,
  semanas = 5,
  jornada: Jornada = JORNADA_PADRAO,
): SemanaDeReunioes[] {
  const quantas = Math.max(Math.trunc(semanas) || 1, 1);
  const saida: SemanaDeReunioes[] = [];

  for (let i = quantas - 1; i >= 0; i--) {
    const de = somarDias(inicioDaSemana(hoje), -7 * i);
    const ate = somarDias(de, 6);

    let recorrentes = 0;
    let unicos = 0;
    for (const evento of externos) {
      if (!dentro(evento.dia, de, ate)) continue;
      const minutos = minutosDoEvento(evento, jornada);
      if (minutos === null) continue;
      if (evento.serie) recorrentes += minutos;
      else unicos += minutos;
    }

    saida.push({ de, ate, minutosRecorrentes: recorrentes, minutosUnicos: unicos, total: recorrentes + unicos });
  }

  return saida;
}

/* ── Quanto da jornada já tem dono ───────────────────────────────────────── */

export interface CargaDoDia {
  dia: string;
  minutosDisponiveis: number;
  minutosComprometidos: number;
  /** passou do que cabe no dia */
  estourou: boolean;
}

export interface Carga {
  minutosDisponiveis: number;
  minutosComprometidos: number;
  /** 0 a 1; passa de 1 quando eu me comprometi com mais do que cabe */
  fracao: number;
  porDia: CargaDoDia[];
  /** os dias em que o comprometido passou do que cabe */
  estourados: string[];
}

/**
 * Quanto do meu tempo de trabalho já está vendido.
 *
 * A jornada é a mesma de todo dia — inclusive sábado e domingo. Descontar o
 * fim de semana exigiria eu declarar em que dias eu trabalho, e o sistema não
 * pergunta isso; inventar a resposta daria uma porcentagem que parece precisa
 * e não é.
 */
export function cargaDaJornada(
  banco: Banco,
  externos: readonly CompromissoExterno[],
  de: string,
  ate: string,
  jornada: Jornada = JORNADA_PADRAO,
): Carga {
  const abertura = emMinutos(jornada.de) ?? 0;
  const fechamento = emMinutos(jornada.ate) ?? 24 * 60;
  const porDiaDisponivel = Math.max(fechamento - abertura, 0);

  const porDia: CargaDoDia[] = [];
  const total = distanciaEmDias(de, ate);

  for (let i = 0; i <= total; i++) {
    const dia = somarDias(de, i);
    const fatias = tempoPorRotulo(banco, externos, dia, dia, jornada);
    const comprometidos = fatias.reduce((t, f) => t + f.minutos, 0);

    porDia.push({
      dia,
      minutosDisponiveis: porDiaDisponivel,
      minutosComprometidos: comprometidos,
      estourou: comprometidos > porDiaDisponivel,
    });
  }

  const disponiveis = porDiaDisponivel * porDia.length;
  const comprometidos = porDia.reduce((t, d) => t + d.minutosComprometidos, 0);

  return {
    minutosDisponiveis: disponiveis,
    minutosComprometidos: comprometidos,
    fracao: disponiveis === 0 ? 0 : comprometidos / disponiveis,
    porDia,
    estourados: porDia.filter((d) => d.estourou).map((d) => d.dia),
  };
}

/* ── O planejado contra o feito ──────────────────────────────────────────── */

export interface PlanejadoEFeito {
  rotuloId: string | null;
  planejados: number;
  feitos: number;
  /** 0 a 1 */
  fracao: number;
}

/**
 * Quanto eu me comprometi a fazer, e quanto saiu.
 *
 * Conta **itens**, e não minutos, de propósito: o tempo de um compromisso é
 * estimado, e comparar duas estimativas daria uma precisão que nenhum dos dois
 * lados tem. "Cinco de oito" é um número que eu posso conferir.
 *
 * A rotina entra pelas ocorrências do período, e a execução conta pelo dia
 * local — fatiar o instante em UTC poria o que foi feito às 22h no dia
 * seguinte.
 */
export function planejadoContraFeito(
  banco: Banco,
  de: string,
  ate: string,
): PlanejadoEFeito[] {
  const baldes = new Map<string | null, { planejados: number; feitos: number }>();

  const somar = (rotuloId: string | null, feito: boolean) => {
    const atual = baldes.get(rotuloId) ?? { planejados: 0, feitos: 0 };
    baldes.set(rotuloId, {
      planejados: atual.planejados + 1,
      feitos: atual.feitos + (feito ? 1 : 0),
    });
  };

  for (const tarefa of banco.tarefas) {
    if (!tarefa.prazo || !dentro(tarefa.prazo, de, ate)) continue;
    somar(tarefa.rotuloId ?? null, !!tarefa.concluidaEm);
  }

  for (const rotina of banco.rotinas) {
    if (rotina.arquivada) continue;
    for (let dia = de; dia <= ate; dia = somarDias(dia, 1)) {
      if (!deveOcorrerEm(rotina, dia)) continue;
      somar(rotina.rotuloId ?? null, foiFeita(banco.execucoes, rotina.id, dia));
    }
  }

  for (const peca of banco.pecas) {
    if (!peca.publicarEm || !dentro(peca.publicarEm, de, ate)) continue;
    // Publicada dentro da janela conta como feita; publicada fora, não — o que
    // interessa é se ela saiu quando eu disse que sairia.
    const saiuNaJanela = !!peca.publicadoEm && dentro(diaLocalDe(peca.publicadoEm), de, ate);
    somar(peca.rotuloId ?? null, saiuNaJanela);
  }

  return [...baldes.values()]
    .map((b, i) => ({
      rotuloId: [...baldes.keys()][i],
      ...b,
      fracao: b.planejados === 0 ? 0 : b.feitos / b.planejados,
    }))
    .sort((a, b) => {
      if ((a.rotuloId === null) !== (b.rotuloId === null)) return a.rotuloId === null ? 1 : -1;
      if (a.planejados !== b.planejados) return b.planejados - a.planejados;
      return (a.rotuloId ?? '') < (b.rotuloId ?? '') ? -1 : 1;
    });
}

/* ── Texto ───────────────────────────────────────────────────────────────── */

/** `6h30` · `45min` · `0h` */
export function horas(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/** O rótulo pelo id, ou o balde do que não tem nenhum. */
export const SEM_ROTULO = { nome: 'Sem rótulo', cor: 'var(--ink-400)' } as const;

export function acharRotulo(rotulos: readonly Rotulo[], id: string | null) {
  if (id === null) return SEM_ROTULO;
  const achado = rotulos.find((r) => r.id === id);
  // Rótulo apagado com coisas ainda marcadas: o número continua verdadeiro, e
  // some o nome em vez de sumir o tempo.
  return achado ?? { nome: 'Rótulo apagado', cor: 'var(--ink-400)' };
}

/** Os itens do banco que usam um rótulo — para avisar antes de apagá-lo. */
export function quemUsa(banco: Banco, rotuloId: string): (Tarefa | Rotina | Peca)[] {
  return [
    ...banco.tarefas.filter((t) => t.rotuloId === rotuloId),
    ...banco.rotinas.filter((r) => r.rotuloId === rotuloId),
    ...banco.pecas.filter((p) => p.rotuloId === rotuloId),
  ];
}
