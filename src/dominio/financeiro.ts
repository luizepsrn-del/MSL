import type { Banco, Lancamento, Categoria, Contexto } from '../dados/esquema';
import { distanciaEmDias } from './rotina';

/**
 * Financeiro.
 *
 * Tudo em **centavos inteiros**. Nenhuma função aqui devolve ponto flutuante,
 * e nenhuma recebe. O motivo já está testado em src/formato: 0.1 + 0.2 não é
 * 0.3, e num sistema que guarda o meu dinheiro isso é erro de saldo.
 *
 * `valor` é sempre positivo; o sinal vem do `tipo`. É `efeito()` que converte
 * um lançamento no número com sinal que entra na soma — em um lugar só, para
 * a regra não se espalhar.
 */

/** O quanto um lançamento move o saldo: positivo para entrada, negativo para saída. */
export function efeito(l: Lancamento): number {
  return l.tipo === 'entrada' ? l.valor : -l.valor;
}

/** Soma o efeito de uma lista. Lista vazia é zero, não nulo. */
export function saldo(lancamentos: readonly Lancamento[]): number {
  return lancamentos.reduce((total, l) => total + efeito(l), 0);
}

export function totalPorTipo(lancamentos: readonly Lancamento[]): {
  entradas: number;
  saidas: number;
} {
  let entradas = 0;
  let saidas = 0;
  for (const l of lancamentos) {
    if (l.tipo === 'entrada') entradas += l.valor;
    else saidas += l.valor;
  }
  return { entradas, saidas };
}

/* ── Recortes no tempo ───────────────────────────────────────────────────── */

/** Lançamentos de um mês, do dia 1 ao último. */
export function lancamentosDoMes(banco: Banco, ano: number, mes: number): Lancamento[] {
  const prefixo = `${ano}-${String(mes).padStart(2, '0')}`;
  return banco.lancamentos.filter((l) => l.data.startsWith(prefixo));
}

/**
 * Realizado: o que já aconteceu, contando hoje.
 *
 * Um lançamento de hoje conta como realizado — o dia não precisa acabar para
 * o dinheiro ter saído.
 */
export function realizados(lancamentos: readonly Lancamento[], hoje: string): Lancamento[] {
  return lancamentos.filter((l) => distanciaEmDias(l.data, hoje) >= 0);
}

/** Previsto: o que ainda vai acontecer. */
export function previstos(lancamentos: readonly Lancamento[], hoje: string): Lancamento[] {
  return lancamentos.filter((l) => distanciaEmDias(l.data, hoje) < 0);
}

export interface ResumoFinanceiro {
  entradas: number;
  saidas: number;
  /** entradas menos saídas do que já aconteceu */
  saldoRealizado: number;
  /** o realizado mais o que ainda está por vir no recorte */
  saldoPrevisto: number;
  /** quanto ainda vai entrar ou sair */
  aReceber: number;
  aPagar: number;
}

/**
 * O resumo de um recorte — normalmente um mês.
 *
 * Separar realizado de previsto é o ponto: um mês que fecha positivo só porque
 * uma entrada futura entrou na conta não fechou positivo ainda.
 */
export function resumoFinanceiro(
  lancamentos: readonly Lancamento[],
  hoje: string,
): ResumoFinanceiro {
  const jaFoi = realizados(lancamentos, hoje);
  const vaiSer = previstos(lancamentos, hoje);

  const { entradas, saidas } = totalPorTipo(jaFoi);
  const futuro = totalPorTipo(vaiSer);

  return {
    entradas,
    saidas,
    saldoRealizado: entradas - saidas,
    saldoPrevisto: entradas - saidas + (futuro.entradas - futuro.saidas),
    aReceber: futuro.entradas,
    aPagar: futuro.saidas,
  };
}

/* ── Por categoria ───────────────────────────────────────────────────────── */

export interface FatiaCategoria {
  categoria: Categoria;
  total: number;
  /** fração do total de saídas, 0 a 1 */
  fracao: number;
}

/**
 * As saídas agrupadas por categoria, da maior para a menor.
 *
 * Só saídas: misturar entrada e saída numa fatia de pizza produz um gráfico
 * que não quer dizer nada.
 */
export function saidasPorCategoria(lancamentos: readonly Lancamento[]): FatiaCategoria[] {
  const soma = new Map<Categoria, number>();
  let total = 0;

  for (const l of lancamentos) {
    if (l.tipo !== 'saida') continue;
    soma.set(l.categoria, (soma.get(l.categoria) ?? 0) + l.valor);
    total += l.valor;
  }

  return [...soma.entries()]
    .map(([categoria, valor]) => ({
      categoria,
      total: valor,
      fracao: total === 0 ? 0 : valor / total,
    }))
    .sort((a, b) => b.total - a.total);
}

export function porContexto(
  lancamentos: readonly Lancamento[],
  contexto: Contexto,
): Lancamento[] {
  return lancamentos.filter((l) => l.contexto === contexto);
}

/* ── Ordenação ───────────────────────────────────────────────────────────── */

/**
 * Do mais recente para o mais antigo; no mesmo dia, o criado por último em
 * cima — que é a ordem em que eu acabei de lançar.
 */
export function ordenarLancamentos(lancamentos: readonly Lancamento[]): Lancamento[] {
  return [...lancamentos].sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? 1 : -1;
    return a.criadoEm < b.criadoEm ? 1 : a.criadoEm > b.criadoEm ? -1 : 0;
  });
}

/* ── Validação ───────────────────────────────────────────────────────────── */

export class ValorInvalido extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ValorInvalido';
  }
}

/**
 * Valida o valor antes de virar lançamento.
 *
 * Zero é recusado: um lançamento de R$ 0,00 não é informação, é ruído que
 * ainda por cima aparece nas listas e nos gráficos. Negativo é recusado porque
 * o sinal é do tipo, não do número.
 */
export function validarValor(centavos: number): void {
  if (!Number.isInteger(centavos)) {
    throw new ValorInvalido('o valor precisa ser inteiro em centavos');
  }
  if (centavos <= 0) {
    throw new ValorInvalido('o valor precisa ser maior que zero');
  }
}
