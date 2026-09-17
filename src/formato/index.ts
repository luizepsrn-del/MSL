/**
 * Formatação pt-BR.
 *
 * Tudo que o sistema mostra de data, hora, dinheiro e número passa por aqui.
 * Nenhuma tela chama `Intl` direto — assim o dia em que a regra mudar, muda
 * num lugar só, e o teste pega.
 *
 * Duas decisões de domínio que valem para o sistema inteiro:
 *
 *   1. Dinheiro é inteiro em centavos, nunca ponto flutuante.
 *      0.1 + 0.2 === 0.30000000000000004. Num sistema que guarda o meu
 *      financeiro isso não é curiosidade, é erro de saldo.
 *
 *   2. Instante é guardado em UTC e exibido em America/Sao_Paulo.
 *      O fuso entra na exibição, não no armazenamento.
 */

export const LOCALE = 'pt-BR';
export const FUSO = 'America/Sao_Paulo';
export const MOEDA = 'BRL';

/** Domingo. É o padrão brasileiro de calendário. */
export const PRIMEIRO_DIA_DA_SEMANA = 0;

/* ── Data e hora ─────────────────────────────────────────────────────────── */

const dataCurta = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: FUSO,
});

const dataMedia = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: FUSO,
});

const dataLonga = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: FUSO,
});

const horaFmt = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: FUSO,
});

const diaDaSemanaFmt = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  timeZone: FUSO,
});

const mesFmt = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
  timeZone: FUSO,
});

/** `03/01/2026` */
export const formatarData = (d: Date) => dataCurta.format(d);

/** `3 de jan. de 2026` */
export const formatarDataMedia = (d: Date) => dataMedia.format(d);

/** `3 de janeiro de 2026` */
export const formatarDataLonga = (d: Date) => dataLonga.format(d);

/** `14:30` — 24h, sempre. */
export const formatarHora = (d: Date) => horaFmt.format(d);

/** `03/01/2026 14:30` */
export const formatarDataHora = (d: Date) => `${formatarData(d)} ${formatarHora(d)}`;

/** `sábado` */
export const formatarDiaDaSemana = (d: Date) => diaDaSemanaFmt.format(d);

/** `janeiro de 2026` */
export const formatarMes = (d: Date) => mesFmt.format(d);

/* ── Data relativa ───────────────────────────────────────────────────────── */

const relativo = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

/** Meia-noite no fuso de exibição, para comparar dias e não instantes. */
function inicioDoDia(d: Date): number {
  const partes = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: FUSO,
  }).format(d);
  return Date.parse(`${partes}T00:00:00Z`);
}

/**
 * `hoje`, `ontem`, `amanhã`, `em 3 dias`, `há 2 dias`.
 *
 * Compara dias no calendário, não intervalos de 24h: às 23h de hoje, amanhã
 * às 1h é "amanhã", não "em 2 horas".
 */
export function formatarDataRelativa(d: Date, agora: Date = new Date()): string {
  const dias = Math.round((inicioDoDia(d) - inicioDoDia(agora)) / 86_400_000);
  return relativo.format(dias, 'day');
}

/* ── Dinheiro ────────────────────────────────────────────────────────────── */

const moedaFmt = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: MOEDA,
});

/**
 * `R$ 1.234,56` — recebe **centavos**, inteiro.
 *
 * formatarMoeda(123456) → "R$ 1.234,56"
 */
export function formatarMoeda(centavos: number): string {
  if (!Number.isInteger(centavos)) {
    throw new TypeError(`dinheiro precisa ser inteiro em centavos, recebi ${centavos}`);
  }
  return moedaFmt.format(centavos / 100);
}

/**
 * Lê `"1.234,56"`, `"R$ 1.234,56"`, `"1234,56"` ou `"1234.56"` e devolve
 * centavos. Devolve `null` quando não dá para ler — entrada de usuário falha,
 * e falhar explicitamente é melhor que virar NaN silencioso.
 */
export function lerMoeda(texto: string): number | null {
  const limpo = texto
    .replace(/\s/g, '') // \s já cobre o U+00A0 do Intl
    .replace(/R\$/gi, '')
    .trim();
  if (limpo === '') return null;

  // No formato brasileiro a vírgula é decimal e o ponto é milhar.
  const temVirgula = limpo.includes(',');
  const normalizado = temVirgula ? limpo.replace(/\./g, '').replace(',', '.') : limpo;

  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return null;

  return Math.round(Number(normalizado) * 100);
}

const moedaCompactaFmt = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: MOEDA,
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * `R$ 11,3 mil` — para eixo de gráfico, onde não cabe o valor inteiro.
 *
 * Existe porque `R$ 11.300,00` escrito na marca do eixo encosta na borda do
 * cartão e invade a área do desenho. Só para eixo e rótulo apertado: em
 * qualquer lugar onde o número é o assunto, use `formatarMoeda`.
 */
export function formatarMoedaCompacta(centavos: number): string {
  if (!Number.isInteger(centavos)) {
    throw new TypeError(`dinheiro precisa ser inteiro em centavos, recebi ${centavos}`);
  }
  return moedaCompactaFmt.format(centavos / 100);
}

/* ── Números ─────────────────────────────────────────────────────────────── */

const numeroFmt = new Intl.NumberFormat(LOCALE);
const porcentoFmt = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  maximumFractionDigits: 0,
});

/** `1.234.567` */
export const formatarNumero = (n: number) => numeroFmt.format(n);

/** `57%` — recebe a fração, não o inteiro: 0.57 → "57%" */
export const formatarPorcento = (fracao: number) => porcentoFmt.format(fracao);

/* ── Ordenação ───────────────────────────────────────────────────────────── */

const colator = new Intl.Collator(LOCALE, { sensitivity: 'base', numeric: true });

/**
 * Comparação que entende acento e número.
 *
 * Sem isso, `"Ágata"` cai depois de `"Zulu"` e `"item 10"` vem antes de
 * `"item 9"`.
 */
export const compararTexto = (a: string, b: string) => colator.compare(a, b);

/** Ordena uma lista por uma chave de texto, respeitando acento. */
export function ordenarPor<T>(itens: readonly T[], chave: (item: T) => string): T[] {
  return [...itens].sort((a, b) => compararTexto(chave(a), chave(b)));
}
