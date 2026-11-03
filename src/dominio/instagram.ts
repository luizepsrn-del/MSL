import { diaLocalDe, somarDias, distanciaEmDias } from './rotina';
import type { ItemDoFoco } from './foco';
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
  /** nome de exibição */
  nome?: string;
  bio?: string;
  /** URL da foto de perfil; expira em alguns dias, por isso vem do cache e nunca do banco */
  foto?: string;
  seguidores: number;
  seguindo?: number;
  totalDePosts: number;
  site?: string;
}

export interface DadosDoInstagram {
  perfil: PerfilDoInstagram;
  posts: PostDoInstagram[];
  /** ISO UTC da leitura na Meta */
  lidoEm: string;
}

export type Periodo = 7 | 30 | 90 | 'tudo';

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

/* ── Funil ───────────────────────────────────────────────────────────────── */

export interface DegrauDoFunil {
  nome: string;
  total: number;
  /** total sobre o degrau de cima; nulo no primeiro */
  taxa: number | null;
}

export interface Funil {
  degraus: DegrauDoFunil[];
  /** índice do degrau de menor taxa — onde mais gente se perde */
  gargalo: number;
  /** quantos posts entraram na conta */
  posts: number;
}

/**
 * Do alcance ao seguidor, somado sobre os posts de feed que têm visitas.
 *
 * Reels ficam de fora porque a Meta não informa visitas nem seguidores para
 * eles: somá-los poria alcance no topo sem a parte de baixo correspondente, e
 * o funil acusaria uma queda que é só falta de dado.
 */
export function funil(posts: PostDoInstagram[]): Funil | null {
  const comDado = posts.filter(
    (p) => p.formato !== 'reels' && p.alcance !== undefined && p.visitasAoPerfil !== undefined,
  );
  if (comDado.length < MINIMO_POR_FORMATO) return null;

  const somar = (f: (p: PostDoInstagram) => number) => comDado.reduce((t, p) => t + f(p), 0);
  const guardaram = (p: PostDoInstagram) => (p.salvamentos ?? 0) + (p.compartilhamentos ?? 0);
  const totais: [string, number][] = [
    ['Alcance', somar((p) => p.alcance!)],
    ['Interações', somar((p) => p.curtidas + p.comentarios + guardaram(p))],
    ['Guardaram', somar(guardaram)],
    ['Visitaram o perfil', somar((p) => p.visitasAoPerfil!)],
    ['Seguiram', somar((p) => p.seguidoresGanhos ?? 0)],
  ];

  const degraus = totais.map(([nome, total], i) => ({
    nome,
    total,
    taxa: i === 0 ? null : totais[i - 1][1] > 0 ? total / totais[i - 1][1] : null,
  }));
  let gargalo = 1;
  for (let i = 2; i < degraus.length; i++) {
    const t = degraus[i].taxa;
    const g = degraus[gargalo].taxa;
    if (t !== null && (g === null || t < g)) gargalo = i;
  }
  return { degraus, gargalo, posts: comDado.length };
}

/* ── Hoje ────────────────────────────────────────────────────────────────── */

export interface Hoje {
  /** posts de hoje e de ontem, com o alcance em vezes a mediana do formato */
  novos: { post: PostDoInstagram; razao: number | null }[];
  diasSemPostar: number | null;
  /** no máximo duas, da mais forte para a mais fraca */
  acoes: string[];
}

/** Forte o bastante para pedir ação. */
const FORTE = 2;
/** Dias sem postar a partir dos quais a pausa vira aviso. */
const DIAS_PARA_AVISAR = 5;

const NOME_SINGULAR: Record<FormatoDoPost, string> = {
  reels: 'Reel',
  carrossel: 'carrossel',
  imagem: 'post',
};

/**
 * O que aconteceu desde ontem, e o que fazer com isso.
 *
 * A razão de um post novo é contra a mediana do **mesmo formato** nos últimos
 * 90 dias, sem contar ele mesmo — um Reel comparado a carrosséis pareceria
 * sempre um fenômeno.
 */
export function hoje(dados: DadosDoInstagram, dia: string): Hoje {
  const comDia = dados.posts
    .map((post) => ({ post, dia: diaLocalDe(post.publicadoEm) }))
    .filter((x) => x.dia <= dia);

  const ontem = somarDias(dia, -1);
  const inicio90 = somarDias(dia, -90);

  const novos = comDia
    .filter((x) => x.dia >= ontem)
    .map(({ post }) => {
      const pares = comDia
        .filter((x) => x.post.id !== post.id && x.post.formato === post.formato && x.dia >= inicio90)
        .map((x) => x.post.alcance)
        .filter((a): a is number => a !== undefined);
      const med = pares.length >= MINIMO_POR_FORMATO ? mediana(pares) : null;
      const razao = med && post.alcance !== undefined ? post.alcance / med : null;
      return { post, razao };
    });

  const maisRecente = comDia.map((x) => x.dia).sort().at(-1);
  const diasSemPostar = maisRecente ? distanciaEmDias(maisRecente, dia) : null;

  const acoes: string[] = [];
  const forte = [...novos].filter((n) => n.razao !== null && n.razao >= FORTE).sort((a, b) => b.razao! - a.razao!)[0];
  if (forte) {
    const quando = diaLocalDe(forte.post.publicadoEm) === dia ? 'de hoje' : 'de ontem';
    acoes.push(
      `Seu ${NOME_SINGULAR[forte.post.formato]} ${quando} está com ${vezes(forte.razao!)} o alcance normal. ` +
        'Responda os comentários enquanto está quente.',
    );
  }
  if (diasSemPostar !== null && diasSemPostar >= DIAS_PARA_AVISAR) {
    acoes.push(`${diasSemPostar} dias sem postar no Instagram.`);
  }
  return { novos, diasSemPostar, acoes: acoes.slice(0, 2) };
}

/**
 * O Instagram na fila do Início: a primeira ação do dia, e só ela.
 *
 * Um item, nunca mais: a fila é instrução, e o painel inteiro já mora na aba.
 */
export function itemDoInstagram(dados: DadosDoInstagram, dia: string): ItemDoFoco | null {
  const acao = hoje(dados, dia).acoes[0];
  if (!acao) return null;
  return {
    chave: 'instagram:hoje',
    tipo: 'instagram',
    id: 'instagram',
    titulo: acao,
    motivo: 'Instagram',
    faixa: 6,
    marcavel: false,
  };
}
