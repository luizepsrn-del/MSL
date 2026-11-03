import {
  funil,
  rankear,
  mediana,
  vezes,
  legendaCurta,
  dividirPorPeriodo,
  type DadosDoInstagram,
  type FormatoDoPost,
  type PostDoInstagram,
} from './instagram';
import { diaLocalDe, somarDias } from './rotina';
import { formatarNumero } from '../formato';

/**
 * O Estúdio: referências de outros criadores e a geração de posts.
 *
 * Tudo aqui é puro. O servidor chama `montarPedido` para falar com o Claude e
 * `lerGerado` para entender a resposta; a tela chama `corpoDaPeca` para salvar.
 * O pedido carrega os números do próprio perfil porque "o que já funciona com
 * você" é a melhor pista do que vai funcionar de novo — referências de fora
 * dão forma, os seus números dão direção.
 */

export interface PostDeReferencia {
  id: string;
  legenda: string;
  formato: FormatoDoPost;
  publicadoEm: string;
  link: string;
  miniatura?: string;
  curtidas: number;
  comentarios: number;
}

export interface PerfilLido {
  usuario: string;
  nome?: string;
  foto?: string;
  seguidores: number;
  posts: PostDeReferencia[];
}

export interface ReferenciaEscolhida {
  usuario: string;
  legenda: string;
  formato: FormatoDoPost;
  curtidas: number;
  comentarios: number;
  porQue: string;
}

export type FormatoDoEstudio = 'reel' | 'carrossel';

export interface GeradoReel {
  formato: 'reel';
  ganchos: string[];
  blocos: { fala: string; tela: string }[];
  cta: string;
}

export interface GeradoCarrossel {
  formato: 'carrossel';
  ganchos: string[];
  cards: string[];
  cta: string;
}

export type Gerado = GeradoReel | GeradoCarrossel;

export interface Pedido {
  formato: FormatoDoEstudio;
  tema: string;
  referencias: ReferenciaEscolhida[];
  ajuste?: { pedido: string; anterior: Gerado };
}

export const MAXIMO_DE_REFERENCIAS = 3;
const LIMITE_DO_CONTEXTO = 12_000;
const LIMITE_DA_LEGENDA = 400;
const MELHORES = 5;

export const REGRAS_DE_ESCRITA: string[] = [
  'Escreva em primeira pessoa.',
  'Português do Brasil.',
  'Frases curtas, uma ideia por frase.',
  'Não prometa resultado garantido.',
  'Não fale de preço.',
  'Sem hashtags no corpo.',
];

/** `@Fulano`, `instagram.com/fulano/`, ` fulano ` → `fulano`; inválido → nulo. */
export function normalizarUsuario(entrada: string): string | null {
  let s = entrada.trim().toLowerCase();
  const daUrl = s.match(/instagram\.com\/([^/?#\s]+)/);
  if (daUrl) s = daUrl[1];
  s = s.replace(/^@/, '');
  return /^[a-z0-9._]{1,30}$/.test(s) ? s : null;
}

/**
 * Os posts do perfil de referência, do mais ao menos engajado.
 *
 * Engajamento relativo ao tamanho do perfil: 500 curtidas num perfil de 1
 * milhão é um post fraco; num de 5 mil, um fenômeno. Sem seguidores não há
 * régua, e a ordem fica a de interações cruas.
 */
export function ordenarReferencia(
  perfil: PerfilLido,
): { post: PostDeReferencia; engajamento: number | null; razao: number | null }[] {
  const interacoes = (p: PostDeReferencia) => p.curtidas + p.comentarios;
  const engajamento = (p: PostDeReferencia) => (perfil.seguidores > 0 ? interacoes(p) / perfil.seguidores : null);
  const valores = perfil.posts.map(engajamento).filter((v): v is number => v !== null);
  const med = valores.length ? mediana(valores) : null;
  return perfil.posts
    .map((post) => {
      const e = engajamento(post);
      return { post, engajamento: e, razao: e !== null && med ? e / med : null };
    })
    .sort((a, b) => interacoes(b.post) - interacoes(a.post));
}

const INSTRUCOES: Record<string, string> = {
  Interações: 'Faça uma pergunta direta que dê vontade de comentar.',
  Guardaram: 'Entregue algo prático que valha salvar para consultar depois.',
  'Visitaram o perfil': 'No CTA, dê um motivo concreto para visitar o perfil.',
  Seguiram: 'Deixe claro o que a pessoa ganha ao seguir o perfil.',
};

export function instrucaoDoGargalo(nomeDoDegrau: string): string {
  return INSTRUCOES[nomeDoDegrau] ?? '';
}

const cortar = (s: string, n = LIMITE_DA_LEGENDA) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const ESQUEMA: Record<FormatoDoEstudio, string> = {
  reel:
    'Responda só com JSON, sem texto fora dele, neste formato:\n' +
    '{"ganchos": ["3 opções de frase para os 3 primeiros segundos"], "blocos": [{"fala": "o que eu falo", "tela": "texto curto na tela"}], "cta": "a chamada final"}',
  carrossel:
    'Responda só com JSON, sem texto fora dele, neste formato:\n' +
    '{"ganchos": ["3 opções de capa"], "cards": ["texto de cada card depois da capa, sem a capa e sem o CTA"], "cta": "o card final"}',
};

/**
 * O pedido ao Claude: `sistema` (quem escreve e as regras) e `mensagem` (os
 * números, as referências, o tema e o formato da resposta).
 */
export function montarPedido(
  pedido: Pedido,
  dados: DadosDoInstagram | null,
  dia: string,
): { sistema: string; mensagem: string } {
  const perfil = dados?.perfil;
  const sistema = [
    'Você escreve posts de Instagram para um criador.',
    perfil ? `O perfil é @${perfil.usuario}${perfil.nome ? ` (${perfil.nome})` : ''}.` : '',
    perfil?.bio ? `Bio: ${cortar(perfil.bio)}` : '',
    'Regras de escrita:',
    ...REGRAS_DE_ESCRITA.map((r) => `- ${r}`),
  ]
    .filter(Boolean)
    .join('\n');

  const formatoDoPost: FormatoDoPost = pedido.formato === 'reel' ? 'reels' : 'carrossel';
  const nome = pedido.formato === 'reel' ? 'roteiro de Reel' : 'carrossel';

  const proprios: string[] = [];
  let gargalo = '';
  if (dados) {
    const inicio = somarDias(dia, -90);
    const doFormato = dados.posts.filter(
      (p) => p.formato === formatoDoPost && diaLocalDe(p.publicadoEm) >= inicio && diaLocalDe(p.publicadoEm) <= dia,
    );
    for (const { post, valor, razao } of rankear(doFormato, 'alcance').slice(0, MELHORES)) {
      if (valor === undefined) continue;
      proprios.push(linhaDoProprio(post, valor, razao));
    }
    const f = funil(dividirPorPeriodo(dados.posts, 30, dia).atual);
    if (f) {
      const instrucao = instrucaoDoGargalo(f.degraus[f.gargalo].nome);
      if (instrucao) gargalo = `Ponto fraco do funil agora: "${f.degraus[f.gargalo].nome}". ${instrucao}`;
    }
  }

  const referencias = pedido.referencias.slice(0, MAXIMO_DE_REFERENCIAS).map(
    (r) =>
      `- @${r.usuario} (${r.formato}, ${formatarNumero(r.curtidas)} curtidas, ${formatarNumero(r.comentarios)} comentários). ` +
      `Por que funciona: ${r.porQue}\n  Legenda: ${cortar(r.legenda)}`,
  );

  const montar = (meus: string[]) =>
    [
      `Escreva um ${nome}${perfil ? ` para @${perfil.usuario}` : ''} sobre: ${pedido.tema}`,
      meus.length || gargalo
        ? ['## O que funciona com você', ...meus, gargalo].filter(Boolean).join('\n')
        : '',
      referencias.length
        ? ['## Referências de outros criadores (use a forma, não copie o texto)', ...referencias].join('\n')
        : '',
      pedido.ajuste
        ? `## Ajuste pedido\nVersão anterior: ${JSON.stringify(pedido.ajuste.anterior)}\nMude: ${pedido.ajuste.pedido}. Mantenha o resto.`
        : '',
      ESQUEMA[pedido.formato],
    ]
      .filter(Boolean)
      .join('\n\n');

  // Passou do limite: os próprios posts saem do fim, um a um. O esquema e o
  // tema nunca saem — sem eles não há resposta que sirva.
  let meus = proprios;
  let mensagem = montar(meus);
  while (mensagem.length > LIMITE_DO_CONTEXTO && meus.length) {
    meus = meus.slice(0, -1);
    mensagem = montar(meus);
  }
  return { sistema, mensagem };
}

function linhaDoProprio(post: PostDoInstagram, alcance: number, razao: number | null): string {
  const guardados = (post.salvamentos ?? 0) + (post.compartilhamentos ?? 0);
  return (
    `- "${cortar(legendaCurta(post.legenda, LIMITE_DA_LEGENDA))}" — alcance ${formatarNumero(alcance)}` +
    `${razao !== null ? ` (${vezes(razao)} a mediana)` : ''}, ${formatarNumero(guardados)} salvos e compartilhamentos`
  );
}

const textos = (x: unknown, minimo: number): x is string[] =>
  Array.isArray(x) && x.length >= minimo && x.every((s) => typeof s === 'string' && s.trim() !== '');

/** A resposta do Claude virada objeto; qualquer coisa fora da forma é nula. */
export function lerGerado(texto: string, formato: FormatoDoEstudio): Gerado | null {
  const inicio = texto.indexOf('{');
  const fim = texto.lastIndexOf('}');
  if (inicio < 0 || fim <= inicio) return null;
  let bruto: Record<string, unknown>;
  try {
    bruto = JSON.parse(texto.slice(inicio, fim + 1));
  } catch {
    return null;
  }
  if (!textos(bruto.ganchos, 3) || typeof bruto.cta !== 'string') return null;
  const ganchos = bruto.ganchos.slice(0, 3);
  if (formato === 'reel') {
    const blocos = bruto.blocos;
    if (
      !Array.isArray(blocos) ||
      blocos.length === 0 ||
      !blocos.every((b) => b && typeof b.fala === 'string' && typeof b.tela === 'string')
    )
      return null;
    return { formato, ganchos, blocos: blocos.map((b) => ({ fala: b.fala, tela: b.tela })), cta: bruto.cta };
  }
  if (!textos(bruto.cards, 1)) return null;
  return { formato, ganchos, cards: bruto.cards, cta: bruto.cta };
}

/** O texto da peça no formato do MSL: carrossel com cards separados por `---`. */
export function corpoDaPeca(g: Gerado, gancho: number): string {
  const escolhido = g.ganchos[gancho] ?? g.ganchos[0];
  if (g.formato === 'carrossel') return [escolhido, ...g.cards, g.cta].join('\n---\n');
  return [
    `Gancho (0–3 s): ${escolhido}`,
    ...g.blocos.map((b) => `Fala: ${b.fala}\nTela: ${b.tela}`),
    `CTA: ${g.cta}`,
  ].join('\n\n');
}
