import { diaLocalDe, somarDias } from './rotina';
import { formatarNumero } from '../formato';

/**
 * O Instagram, do ponto de vista do que eu faço com os números.
 *
 * **Nada daqui é gravado.** Os números pertencem ao Instagram e são lidos na
 * hora; uma cópia guardada envelheceria como os eventos do Google
 * envelheceriam. Tudo o que sai deste arquivo é calculado sobre a resposta
 * do momento.
 *
 * **Sem dado não é zero.** A Meta não entrega visitas ao perfil nem seguidores
 * ganhos para Reels, e posts antigos não têm visualizações. Uma métrica
 * ausente fica `undefined` e sai da conta — contar como zero diria que o Reel
 * não trouxe ninguém, quando a verdade é que ninguém sabe.
 */

export type FormatoDoPost = 'reels' | 'carrossel' | 'imagem';

export interface PostDoInstagram {
  id: string;
  legenda: string;
  formato: FormatoDoPost;
  /** ISO UTC */
  publicadoEm: string;
  link: string;
  miniatura?: string;
  curtidas: number;
  comentarios: number;
  alcance?: number;
  visualizacoes?: number;
  salvamentos?: number;
  compartilhamentos?: number;
  visitasAoPerfil?: number;
  seguidoresGanhos?: number;
  tempoMedioMs?: number;
}

export interface PerfilDoInstagram {
  usuario: string;
  seguidores: number;
  totalDePosts: number;
}

export interface DadosDoInstagram {
  perfil: PerfilDoInstagram;
  posts: PostDoInstagram[];
  /** ISO UTC da leitura na Meta */
  lidoEm: string;
}

export type Periodo = 30 | 90 | 'tudo';

export const LIMITE_DE_RECOMENDACOES = 5;

/** Com menos que isto, uma média de formato é anedota, não padrão. */
export const MINIMO_POR_FORMATO = 3;

export const NOME_DO_FORMATO: Record<FormatoDoPost, string> = {
  reels: 'Reels',
  carrossel: 'carrosséis',
  imagem: 'imagens',
};

/* ── Contas pequenas ─────────────────────────────────────────────────────── */

const definidos = (valores: (number | undefined)[]): number[] =>
  valores.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

function media(valores: number[]): number | null {
  return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
}

function mediana(valores: number[]): number | null {
  if (!valores.length) return null;
  const o = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(o.length / 2);
  return o.length % 2 ? o[meio] : (o[meio - 1] + o[meio]) / 2;
}

function quantil(valores: number[], q: number): number | null {
  if (!valores.length) return null;
  const o = [...valores].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.floor(q * (o.length - 1)))];
}

const soma = (valores: number[]): number | null =>
  valores.length ? valores.reduce((a, b) => a + b, 0) : null;

const n = (v: number) => formatarNumero(Math.round(v));
const vezes = (r: number) => `${formatarNumero(Math.round(r * 10) / 10)}×`;

/** A primeira linha da legenda, curta o bastante para caber numa frase. */
export function legendaCurta(legenda: string, limite = 60): string {
  const linha = (legenda.split('\n').find((l) => l.trim()) ?? '').trim();
  if (!linha) return 'sem legenda';
  return linha.length > limite ? `${linha.slice(0, limite - 1).trimEnd()}…` : linha;
}

/* ── Período ─────────────────────────────────────────────────────────────── */

/**
 * Separa os posts do período e os do período imediatamente anterior, de
 * mesmo tamanho. O dia do post é o dia local, não os dez primeiros
 * caracteres do instante: um post às 22h30 em São Paulo já é amanhã em UTC.
 */
export function dividirPorPeriodo(
  posts: PostDoInstagram[],
  periodo: Periodo,
  hoje: string,
): { atual: PostDoInstagram[]; anterior: PostDoInstagram[] } {
  if (periodo === 'tudo') return { atual: [...posts], anterior: [] };

  const inicio = somarDias(hoje, -periodo);
  const inicioAnterior = somarDias(hoje, -2 * periodo);
  const atual: PostDoInstagram[] = [];
  const anterior: PostDoInstagram[] = [];
  for (const p of posts) {
    const dia = diaLocalDe(p.publicadoEm);
    if (dia > hoje) continue;
    if (dia >= inicio) atual.push(p);
    else if (dia >= inicioAnterior) anterior.push(p);
  }
  return { atual, anterior };
}

/**
 * O período anterior foi lido inteiro?
 *
 * O servidor para num teto de posts, e não de dias. Com muitos posts, o mais
 * antigo lido pode ser de depois do começo do período anterior — e aí o
 * anterior parece vazio ou magro, e toda comparação sai a favor de agora.
 * Quando não dá para garantir, não se compara.
 */
export function anteriorCompleto(dados: DadosDoInstagram, periodo: Periodo, hoje: string): boolean {
  if (periodo === 'tudo') return false;
  if (dados.posts.length >= dados.perfil.totalDePosts) return true;
  const dias = dados.posts.map((p) => diaLocalDe(p.publicadoEm)).sort();
  const maisAntigo = dias[0];
  return maisAntigo !== undefined && maisAntigo < somarDias(hoje, -2 * periodo);
}

/* ── Resumo ──────────────────────────────────────────────────────────────── */

export interface Resumo {
  posts: number;
  alcanceMedio: number | null;
  alcanceMediano: number | null;
  salvamentosMedios: number | null;
  compartilhamentosMedios: number | null;
  visitasAoPerfil: number | null;
  seguidoresGanhos: number | null;
}

export function resumir(posts: PostDoInstagram[]): Resumo {
  const alcances = definidos(posts.map((p) => p.alcance));
  return {
    posts: posts.length,
    alcanceMedio: media(alcances),
    alcanceMediano: mediana(alcances),
    salvamentosMedios: media(definidos(posts.map((p) => p.salvamentos))),
    compartilhamentosMedios: media(definidos(posts.map((p) => p.compartilhamentos))),
    visitasAoPerfil: soma(definidos(posts.map((p) => p.visitasAoPerfil))),
    seguidoresGanhos: soma(definidos(posts.map((p) => p.seguidoresGanhos))),
  };
}

export function porFormato(
  posts: PostDoInstagram[],
): Record<FormatoDoPost, { posts: number; alcanceMedio: number | null }> {
  const de = (f: FormatoDoPost) => {
    const doFormato = posts.filter((p) => p.formato === f);
    return { posts: doFormato.length, alcanceMedio: media(definidos(doFormato.map((p) => p.alcance))) };
  };
  return { reels: de('reels'), carrossel: de('carrossel'), imagem: de('imagem') };
}

/**
 * A variação contra o período anterior, em valor, com o sentido explícito —
 * para a tela não pintar uma queda com a cor de sucesso.
 */
export function variacao(
  atual: number | null,
  anterior: number | null,
  temAnterior: boolean,
): { texto: string; tom: 'subiu' | 'caiu' | 'igual' } | undefined {
  if (!temAnterior || atual === null || anterior === null) return undefined;
  const d = Math.round(atual - anterior);
  if (d === 0) return { texto: 'igual ao anterior', tom: 'igual' };
  return {
    texto: `${d > 0 ? '+' : '−'}${formatarNumero(Math.abs(d))} vs anterior`,
    tom: d > 0 ? 'subiu' : 'caiu',
  };
}

/* ── Recomendações ───────────────────────────────────────────────────────── */

export type TipoDeRecomendacao =
  | 'formato'
  | 'seguidores'
  | 'guardados'
  | 'fraco'
  | 'ritmo'
  | 'retencao';

export interface Recomendacao {
  tipo: TipoDeRecomendacao;
  /** a frase, o que fazer */
  texto: string;
  /** o número que sustenta a frase */
  evidencia: string;
  /** o post de exemplo, quando há um */
  postId?: string;
  /** o tamanho do efeito; ordena e corta a lista */
  peso: number;
}

/** O post que mais se destaca numa métrica, em vezes a mediana. */
function destaque(
  posts: PostDoInstagram[],
  valor: (p: PostDoInstagram) => number | undefined,
): { post: PostDoInstagram; valor: number; razao: number; mediana: number } | null {
  const comDado = posts.filter((p) => valor(p) !== undefined);
  if (comDado.length < MINIMO_POR_FORMATO) return null;
  const med = mediana(comDado.map((p) => valor(p)!));
  if (!med) return null;
  let melhor = comDado[0];
  for (const p of comDado) if (valor(p)! > valor(melhor)!) melhor = p;
  return { post: melhor, valor: valor(melhor)!, razao: valor(melhor)! / med, mediana: med };
}

function formatoSubUsado(posts: PostDoInstagram[]): Recomendacao | null {
  let melhor: Recomendacao | null = null;
  for (const f of ['reels', 'carrossel', 'imagem'] as FormatoDoPost[]) {
    const doFormato = posts.filter((p) => p.formato === f);
    const outros = posts.filter((p) => p.formato !== f);
    if (doFormato.length < MINIMO_POR_FORMATO || !outros.length) continue;
    const mf = media(definidos(doFormato.map((p) => p.alcance)));
    const mo = media(definidos(outros.map((p) => p.alcance)));
    if (mf === null || !mo) continue;
    const razao = mf / mo;
    const participacao = doFormato.length / posts.length;
    if (razao < 1.5 || participacao >= 0.3) continue;
    const rec: Recomendacao = {
      tipo: 'formato',
      texto: `Poste mais ${NOME_DO_FORMATO[f]}: alcançam ${vezes(razao)} o que os outros formatos alcançam, e são poucos.`,
      evidencia: `${NOME_DO_FORMATO[f][0].toUpperCase()}${NOME_DO_FORMATO[f].slice(1)}: ${n(mf)} de alcance médio, ${doFormato.length} de ${posts.length} posts`,
      peso: razao,
    };
    if (!melhor || rec.peso > melhor.peso) melhor = rec;
  }
  return melhor;
}

function trouxeSeguidores(posts: PostDoInstagram[]): Recomendacao | null {
  const d = destaque(posts, (p) => p.visitasAoPerfil);
  if (!d || d.razao < 3) return null;
  const seguidores = d.post.seguidoresGanhos;
  return {
    tipo: 'seguidores',
    texto: `Faça mais posts como “${legendaCurta(d.post.legenda)}”: foi o que mais levou gente ao seu perfil.`,
    evidencia:
      `${n(d.valor)} visitas ao perfil, ${vezes(d.razao)} a mediana (${n(d.mediana)})` +
      (seguidores ? `, e ${n(seguidores)} seguidores novos` : ''),
    postId: d.post.id,
    peso: d.razao,
  };
}

function guardados(posts: PostDoInstagram[]): Recomendacao | null {
  const valor = (p: PostDoInstagram) =>
    p.salvamentos === undefined && p.compartilhamentos === undefined
      ? undefined
      : (p.salvamentos ?? 0) + (p.compartilhamentos ?? 0);
  const d = destaque(posts, valor);
  if (!d || d.razao < 3) return null;
  return {
    tipo: 'guardados',
    texto: `Repita o formato de “${legendaCurta(d.post.legenda)}”: é o conteúdo que as pessoas guardam e mandam adiante.`,
    evidencia: `${n(d.valor)} salvamentos e compartilhamentos, ${vezes(d.razao)} a mediana (${n(d.mediana)})`,
    postId: d.post.id,
    peso: d.razao,
  };
}

/** Abaixo disto, "o quarto de menor alcance" é um ou dois posts. */
const MINIMO_PARA_QUARTIL = 8;

function fraco(posts: PostDoInstagram[]): Recomendacao | null {
  const comAlcance = posts.filter((p) => p.alcance !== undefined);
  if (comAlcance.length < MINIMO_PARA_QUARTIL) return null;
  const q1 = quantil(comAlcance.map((p) => p.alcance!), 0.25)!;
  const medVisitas = mediana(definidos(posts.map((p) => p.visitasAoPerfil)));
  if (medVisitas === null) return null;
  const fracos = comAlcance.filter(
    (p) => p.alcance! <= q1 && p.visitasAoPerfil !== undefined && p.visitasAoPerfil < medVisitas,
  );
  if (!fracos.length) return null;
  const pior = fracos.reduce((a, b) => (b.alcance! < a.alcance! ? b : a));
  const medAlcance = mediana(comAlcance.map((p) => p.alcance!))!;
  return {
    tipo: 'fraco',
    texto: `Reveja posts como “${legendaCurta(pior.legenda)}”: pouco alcance e quase ninguém foi ao perfil.`,
    evidencia: `${fracos.length} post(s) com alcance até ${n(q1)} e visitas abaixo da mediana; o menor teve ${n(pior.alcance!)} (mediana ${n(medAlcance)})`,
    postId: pior.id,
    peso: medAlcance / Math.max(1, pior.alcance!) / 2,
  };
}

function ritmo(
  atual: PostDoInstagram[],
  anterior: PostDoInstagram[],
  hoje: string,
  periodo: Periodo,
): Recomendacao | null {
  if (periodo === 'tudo') return null;
  const semanas = periodo / 7;
  const porSemana = atual.length / semanas;
  const antes = anterior.length / semanas;

  // Semanas inteiras, de hoje para trás, sem nenhum post.
  const dias = new Set(atual.map((p) => diaLocalDe(p.publicadoEm)));
  let vazias = 0;
  for (let s = 0; s < Math.floor(semanas); s++) {
    let teve = false;
    for (let d = 0; d < 7 && !teve; d++) teve = dias.has(somarDias(hoje, -(s * 7 + d)));
    if (!teve) vazias++;
  }

  const variou = anterior.length > 0 && Math.abs(porSemana - antes) / antes >= 0.25;
  if (!variou && !vazias) return null;

  const fmt = (x: number) => formatarNumero(Math.round(x * 10) / 10);
  const partes = [`${fmt(porSemana)} posts por semana`];
  if (anterior.length) partes.push(`antes eram ${fmt(antes)} por semana`);
  if (vazias) partes.push(`${vazias} semana(s) sem post`);

  return {
    tipo: 'ritmo',
    texto:
      porSemana < antes || vazias
        ? 'Mantenha o ritmo: o volume de posts caiu ou teve semana vazia.'
        : 'O ritmo subiu — veja se o alcance acompanhou.',
    evidencia: partes.join('; '),
    peso: 1 + (antes ? Math.abs(porSemana - antes) / antes : 0) + vazias * 0.25,
  };
}

function retencao(posts: PostDoInstagram[]): Recomendacao | null {
  const reels = posts.filter((p) => p.formato === 'reels' && p.tempoMedioMs !== undefined);
  if (reels.length < MINIMO_POR_FORMATO) return null;
  const med = media(reels.map((p) => p.tempoMedioMs!))!;
  const melhor = reels.reduce((a, b) => (b.tempoMedioMs! > a.tempoMedioMs! ? b : a));
  const s = (ms: number) => `${formatarNumero(Math.round(ms / 100) / 10)} s`;
  return {
    tipo: 'retencao',
    texto: `Estude o começo de “${legendaCurta(melhor.legenda)}”: foi o Reel que mais segurou quem assistiu.`,
    evidencia: `${s(melhor.tempoMedioMs!)} assistidos em média, contra ${s(med)} nos seus Reels`,
    postId: melhor.id,
    peso: melhor.tempoMedioMs! / med,
  };
}

/**
 * O que fazer, a partir dos números do período.
 *
 * Calculado, nunca gravado. No máximo `LIMITE_DE_RECOMENDACOES`, do maior
 * efeito para o menor: uma lista de vinte conselhos é uma lista de nada.
 */
export function recomendar(
  atual: PostDoInstagram[],
  anterior: PostDoInstagram[],
  hoje: string,
  periodo: Periodo,
): Recomendacao[] {
  if (!atual.length) return [];
  return [
    formatoSubUsado(atual),
    trouxeSeguidores(atual),
    guardados(atual),
    fraco(atual),
    ritmo(atual, anterior, hoje, periodo),
    retencao(atual),
  ]
    .filter((r): r is Recomendacao => r !== null)
    .sort((a, b) => b.peso - a.peso)
    .slice(0, LIMITE_DE_RECOMENDACOES);
}
