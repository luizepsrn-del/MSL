import type { Rotina, Recorrencia, Execucao, Banco } from '../dados/esquema';

/**
 * Recorrência de rotina.
 *
 * Tudo aqui trabalha em **dia local** no formato `AAAA-MM-DD`, nunca em
 * `Date`. É de propósito: recorrência é uma pergunta de calendário, não de
 * instante. Misturar as duas coisas é como nascem os erros de "a rotina pulou
 * um dia no horário de verão".
 */

/** Dias da semana, 0 = domingo, como `Date.getDay` e como o calendário daqui. */
export const DIAS_DA_SEMANA = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
] as const;

export const DIAS_CURTOS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

/** `AAAA-MM-DD` → partes numéricas, sem passar por `Date` e sem fuso. */
function partes(dia: string): { ano: number; mes: number; data: number } {
  const [ano, mes, data] = dia.split('-').map(Number);
  return { ano, mes, data };
}

/** Valida o formato e a existência do dia — 2026-02-30 não existe. */
export function diaValido(dia: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  const { ano, mes, data } = partes(dia);
  if (mes < 1 || mes > 12 || data < 1) return false;
  return data <= diasNoMes(ano, mes);
}

export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Dia da semana de um `AAAA-MM-DD`, 0 = domingo. */
export function diaDaSemana(dia: string): number {
  const { ano, mes, data } = partes(dia);
  return new Date(Date.UTC(ano, mes - 1, data)).getUTCDay();
}

/** Distância em dias entre dois `AAAA-MM-DD`. Positiva quando `b` é depois. */
export function distanciaEmDias(a: string, b: string): number {
  const pa = partes(a);
  const pb = partes(b);
  const ua = Date.UTC(pa.ano, pa.mes - 1, pa.data);
  const ub = Date.UTC(pb.ano, pb.mes - 1, pb.data);
  return Math.round((ub - ua) / 86_400_000);
}

/** Soma dias a um `AAAA-MM-DD`, atravessando mês e ano. */
export function somarDias(dia: string, dias: number): string {
  const { ano, mes, data } = partes(dia);
  const d = new Date(Date.UTC(ano, mes - 1, data + dias));
  return d.toISOString().slice(0, 10);
}

/**
 * O dia local de um instante ISO (`criadoEm`, `concluidaEm`).
 *
 * Instante é ponto no tempo e pode virar `Date`; o que nunca pode virar `Date`
 * é um dia `AAAA-MM-DD`. Cortar os dez primeiros caracteres do ISO devolve o
 * dia em UTC: às 21h em São Paulo isso já é o dia seguinte, e a tarefa que
 * concluí hoje à noite apareceria concluída amanhã.
 */
export function diaLocalDe(instante: string): string {
  const d = new Date(instante);
  if (Number.isNaN(d.getTime())) return instante.slice(0, 10);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const data = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${data}`;
}

/**
 * A rotina deve acontecer neste dia?
 *
 * Responde só sobre a recorrência e a data de início. Não sabe nada sobre ter
 * sido feita — isso é `foiFeita`.
 */
export function deveOcorrerEm(rotina: Rotina, dia: string): boolean {
  if (rotina.arquivada) return false;
  if (!diaValido(dia)) return false;
  if (distanciaEmDias(rotina.inicioEm, dia) < 0) return false;

  return casaRecorrencia(rotina.recorrencia, rotina.inicioEm, dia);
}

function casaRecorrencia(r: Recorrencia, inicioEm: string, dia: string): boolean {
  switch (r.tipo) {
    case 'diaria':
      return true;

    case 'semanal':
      return r.dias.includes(diaDaSemana(dia));

    case 'mensal': {
      const { ano, mes, data } = partes(dia);
      const ultimo = diasNoMes(ano, mes);
      // Dia 31 num mês de 30 cai no último dia, em vez de sumir. Uma rotina
      // mensal marcada para 31 precisa acontecer em fevereiro também.
      const alvo = Math.min(r.diaDoMes, ultimo);
      return data === alvo;
    }

    case 'intervalo': {
      if (r.aCadaDias < 1) return false;
      // O intervalo conta a partir do início da rotina, não do calendário —
      // "a cada 3 dias" ancorado em outra coisa saltaria ao mudar de mês.
      return distanciaEmDias(inicioEm, dia) % r.aCadaDias === 0;
    }
  }
}

/** Os dias em que a rotina ocorre dentro de um intervalo, inclusive nas pontas. */
export function ocorrenciasEntre(rotina: Rotina, de: string, ate: string): string[] {
  const total = distanciaEmDias(de, ate);
  if (total < 0) return [];

  const dias: string[] = [];
  for (let i = 0; i <= total; i++) {
    const dia = somarDias(de, i);
    if (deveOcorrerEm(rotina, dia)) dias.push(dia);
  }
  return dias;
}

/* ── Execução ────────────────────────────────────────────────────────────── */

export function foiFeita(execucoes: Execucao[], rotinaId: string, dia: string): boolean {
  return execucoes.some((e) => e.rotinaId === rotinaId && e.dia === dia);
}

export interface ItemDoDia {
  rotina: Rotina;
  feita: boolean;
}

/** O que há para fazer num dia, e o que já foi feito. */
export function agendaDoDia(banco: Banco, dia: string): ItemDoDia[] {
  return banco.rotinas
    .filter((r) => deveOcorrerEm(r, dia))
    .map((rotina) => ({ rotina, feita: foiFeita(banco.execucoes, rotina.id, dia) }));
}

/* ── Sequência ───────────────────────────────────────────────────────────── */

/**
 * Há quantos dias seguidos a rotina vem sendo cumprida, contando para trás a
 * partir de `dia`.
 *
 * Só conta dias em que ela **devia** ocorrer: pular um domingo não quebra a
 * sequência de uma rotina de dias úteis. E o dia de hoje ainda não feito não
 * quebra nada — o dia não acabou.
 */
export function sequencia(banco: Banco, rotina: Rotina, dia: string): number {
  let cursor = dia;
  let total = 0;
  let primeiro = true;

  // 366 dias é o teto: mais que isso não cabe na tela e não muda a decisão.
  for (let guarda = 0; guarda < 366; guarda++) {
    if (distanciaEmDias(rotina.inicioEm, cursor) < 0) break;

    if (deveOcorrerEm(rotina, cursor)) {
      if (foiFeita(banco.execucoes, rotina.id, cursor)) {
        total++;
      } else if (!primeiro) {
        break;
      }
      // Cair aqui sem contar significa que é o primeiro dia devido e ele ainda
      // não foi feito — o dia não acabou, então não quebra a sequência.
      primeiro = false;
    }
    cursor = somarDias(cursor, -1);
  }

  return total;
}

/** Quanto do dia já foi cumprido, de 0 a 1. Um dia sem rotina nenhuma é 1. */
export function progressoDoDia(banco: Banco, dia: string): number {
  const itens = agendaDoDia(banco, dia);
  if (itens.length === 0) return 1;
  return itens.filter((i) => i.feita).length / itens.length;
}

/** Texto da recorrência, para a tela não montar frase solta por aí. */
export function descreverRecorrencia(r: Recorrencia): string {
  switch (r.tipo) {
    case 'diaria':
      return 'Todo dia';
    case 'semanal': {
      if (r.dias.length === 0) return 'Nenhum dia';
      if (r.dias.length === 7) return 'Todo dia';
      const uteis = [1, 2, 3, 4, 5];
      const ordenados = [...r.dias].sort((a, b) => a - b);
      if (ordenados.join() === uteis.join()) return 'De segunda a sexta';
      if (ordenados.join() === [0, 6].join()) return 'Fim de semana';
      return ordenados.map((d) => DIAS_DA_SEMANA[d]).join(', ');
    }
    case 'mensal':
      return `Todo dia ${r.diaDoMes} do mês`;
    case 'intervalo':
      return r.aCadaDias === 1 ? 'Todo dia' : `A cada ${r.aCadaDias} dias`;
  }
}

/**
 * A recorrência e a hora juntas, como as telas mostram.
 *
 * Mora aqui porque três telas mostram a mesma linha — Rotina, Início e o
 * painel do dia no Calendário — e a hora entrou no esquema depois delas.
 */
export function descreverRotina(rotina: Rotina): string {
  const quando = descreverRecorrencia(rotina.recorrencia);
  return rotina.hora ? `${quando} · ${rotina.hora}` : quando;
}
