import type {
  Banco,
  Lancamento,
  Categoria,
  Contexto,
  PeriodoRecorrencia,
} from '../dados/esquema';
import { distanciaEmDias, somarDias, diasNoMes } from './rotina';

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

/* ── Recorrência ─────────────────────────────────────────────────────────── */

/**
 * Uma ocorrência de lançamento no tempo.
 *
 * Não é um registro: é o cruzamento de um lançamento com uma data. A primeira
 * ocorrência é a do próprio lançamento; as demais são repetições calculadas.
 * Por isso o tipo é explícito em vez de fabricar `Lancamento` com id inventado
 * — um objeto que parece registro e não é acaba gravado por engano.
 */
export interface Ocorrencia {
  lancamento: Lancamento;
  /** data local `AAAA-MM-DD` desta ocorrência */
  data: string;
  /** false na primeira, true nas repetições */
  repeticao: boolean;
}

/** Chave estável para lista e para React. */
export const chaveDaOcorrencia = (o: Ocorrencia) => `${o.lancamento.id}@${o.data}`;

/** O efeito de uma ocorrência é o do lançamento que a gerou. */
export const efeitoDaOcorrencia = (o: Ocorrencia) => efeito(o.lancamento);

/** Avança uma data local pelo período, respeitando o fim do mês. */
function proxima(data: string, periodo: PeriodoRecorrencia): string {
  const [ano, mes, dia] = data.split('-').map(Number);

  if (periodo === 'semanal') return somarDias(data, 7);

  const alvoAno = periodo === 'anual' ? ano + 1 : mes === 12 ? ano + 1 : ano;
  const alvoMes = periodo === 'anual' ? mes : mes === 12 ? 1 : mes + 1;

  // Dia 31 num mês de 30 cai no último dia, como na rotina mensal. Sem isto
  // um aluguel marcado no 31 sumiria em fevereiro.
  const ultimo = diasNoMes(alvoAno, alvoMes);
  const alvoDia = Math.min(dia, ultimo);

  return `${alvoAno}-${String(alvoMes).padStart(2, '0')}-${String(alvoDia).padStart(2, '0')}`;
}

/** Teto de segurança: ~10 anos de repetição semanal. */
const MAX_REPETICOES = 520;

/**
 * As ocorrências de um lançamento dentro de uma janela, inclusive nas pontas.
 *
 * Lançamento sem recorrência tem no máximo uma. Com recorrência, caminha a
 * partir da data original — nunca a partir da janela — para que a série não
 * escorregue conforme o mês que estou olhando.
 */
export function ocorrenciasDe(l: Lancamento, de: string, ate: string): Ocorrencia[] {
  if (!l.recorrencia) {
    return l.data >= de && l.data <= ate
      ? [{ lancamento: l, data: l.data, repeticao: false }]
      : [];
  }

  const fim = l.recorrencia.ate && l.recorrencia.ate < ate ? l.recorrencia.ate : ate;
  const saida: Ocorrencia[] = [];
  let data = l.data;

  for (let i = 0; i < MAX_REPETICOES && data <= fim; i++) {
    if (data >= de) saida.push({ lancamento: l, data, repeticao: i > 0 });
    data = proxima(data, l.recorrencia.periodo);
  }

  return saida;
}

/** Todas as ocorrências do banco numa janela, já ordenadas. */
export function ocorrenciasEntre(banco: Banco, de: string, ate: string): Ocorrencia[] {
  return banco.lancamentos
    .flatMap((l) => ocorrenciasDe(l, de, ate))
    .sort((a, b) => {
      if (a.data !== b.data) return a.data < b.data ? 1 : -1;
      return a.lancamento.criadoEm < b.lancamento.criadoEm ? 1 : -1;
    });
}

/** As ocorrências de um mês — é isto que a tela do Financeiro mostra. */
export function ocorrenciasDoMes(banco: Banco, ano: number, mes: number): Ocorrencia[] {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(diasNoMes(ano, mes)).padStart(2, '0')}`;
  return ocorrenciasEntre(banco, inicio, fim);
}

/** Saldo de uma lista de ocorrências. */
export const saldoDeOcorrencias = (os: readonly Ocorrencia[]) =>
  os.reduce((t, o) => t + efeitoDaOcorrencia(o), 0);

/* ── Evolução ────────────────────────────────────────────────────────────── */

export interface PontoDoMes {
  ano: number;
  mes: number;
  /** `AAAA-MM` */
  chave: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

/**
 * O saldo mês a mês, terminando no mês informado.
 *
 * Inclui as repetições, que é o ponto: sem elas um aluguel lançado uma vez
 * desapareceria do gráfico a partir do mês seguinte.
 */
export function evolucaoMensal(
  banco: Banco,
  ano: number,
  mes: number,
  quantos = 6,
): PontoDoMes[] {
  const pontos: PontoDoMes[] = [];

  for (let i = quantos - 1; i >= 0; i--) {
    const total = ano * 12 + (mes - 1) - i;
    const a = Math.floor(total / 12);
    const m = (total % 12) + 1;

    let entradas = 0;
    let saidas = 0;
    for (const o of ocorrenciasDoMes(banco, a, m)) {
      if (o.lancamento.tipo === 'entrada') entradas += o.lancamento.valor;
      else saidas += o.lancamento.valor;
    }

    pontos.push({
      ano: a,
      mes: m,
      chave: `${a}-${String(m).padStart(2, '0')}`,
      entradas,
      saidas,
      saldo: entradas - saidas,
    });
  }

  return pontos;
}

/** O que se repete todo mês, para a tela poder listar os compromissos fixos. */
export function lancamentosRecorrentes(banco: Banco): Lancamento[] {
  return banco.lancamentos
    .filter((l) => l.recorrencia)
    .sort((a, b) => b.valor - a.valor);
}

/** Quanto já está comprometido por mês antes de eu gastar qualquer coisa. */
export function comprometidoPorMes(banco: Banco): { entradas: number; saidas: number } {
  let entradas = 0;
  let saidas = 0;
  for (const l of banco.lancamentos) {
    if (l.recorrencia?.periodo !== 'mensal') continue;
    if (l.tipo === 'entrada') entradas += l.valor;
    else saidas += l.valor;
  }
  return { entradas, saidas };
}

/**
 * A ordem das ocorrências na lista do mês: a mais recente primeiro.
 *
 * Mesma regra de `ordenarLancamentos`, mas pela data da ocorrência, e não pela
 * data original — senão a repetição de setembro apareceria ordenada por
 * janeiro, onde o lançamento nasceu.
 */
export function ordenarOcorrencias(ocorrencias: readonly Ocorrencia[]): Ocorrencia[] {
  return [...ocorrencias].sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? 1 : -1;
    const ca = a.lancamento.criadoEm;
    const cb = b.lancamento.criadoEm;
    return ca < cb ? 1 : ca > cb ? -1 : 0;
  });
}
