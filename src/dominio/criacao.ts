import type { Peca, TipoDePeca, EstadoDaPeca, Banco, Contexto } from '../dados/esquema';
import { distanciaEmDias, diaValido } from './rotina';

/**
 * Criação — o que eu escrevo.
 *
 * Documento, post, carrossel, prompt, ideia. Um registro só para todos, porque
 * o que muda entre eles é como o corpo é lido, não o formato do que fica
 * guardado.
 *
 * Tudo aqui é função pura sobre texto: contar, fatiar em slides, montar o HTML
 * de exportação. Nada toca no DOM nem no navegador — quem baixa o arquivo é a
 * tela, e por isso a geração do HTML pode ser provada linha a linha, inclusive
 * o escape, que é a parte que quebra calada.
 */

/* ── Carrossel ───────────────────────────────────────────────────────────── */

/** A linha que separa um slide do outro, como no Markdown. */
export const SEPARADOR = '---';

/**
 * Os slides de um corpo.
 *
 * Um corpo sem separador nenhum é um slide só — e não zero. Slides vazios no
 * meio são descartados: eles vêm de separadores dobrados enquanto se escreve,
 * e um slide em branco no meio do carrossel é sempre engano.
 */
export function slidesDe(corpo: string): string[] {
  const partes = corpo
    .split(/^\s*---\s*$/m)
    .map((p) => p.trim())
    .filter((p) => p !== '');
  return partes.length === 0 ? [] : partes;
}

/** Junta os slides de volta num corpo. */
export const corpoDeSlides = (slides: readonly string[]) =>
  slides.map((s) => s.trim()).join(`\n\n${SEPARADOR}\n\n`);

/* ── Contagem ────────────────────────────────────────────────────────────── */

export interface Contagem {
  caracteres: number;
  palavras: number;
  linhas: number;
  /** quantos slides, quando é carrossel */
  slides: number;
}

export function contar(peca: Pick<Peca, 'corpo' | 'tipo'>): Contagem {
  const corpo = peca.corpo;
  const limpo = corpo.trim();
  return {
    caracteres: corpo.length,
    // `\s+` e não `split(' ')`: quebra de linha e tabulação também separam
    // palavra, e um texto com duas quebras contaria uma palavra fantasma.
    palavras: limpo === '' ? 0 : limpo.split(/\s+/).length,
    linhas: limpo === '' ? 0 : limpo.split('\n').length,
    slides: peca.tipo === 'carrossel' ? slidesDe(corpo).length : 0,
  };
}

/**
 * Os limites que importam na hora de publicar.
 *
 * São os que as plataformas impõem hoje. Ficam aqui, num lugar só, porque eles
 * mudam — e ter o número espalhado pela tela é como ele passa a mentir.
 */
export const LIMITES: { nome: string; caracteres: number }[] = [
  { nome: 'X', caracteres: 280 },
  { nome: 'Instagram', caracteres: 2200 },
  { nome: 'LinkedIn', caracteres: 3000 },
];

export interface Aperto {
  nome: string;
  caracteres: number;
  /** quanto passou do limite; zero ou menos quando cabe */
  excedeu: number;
}

/**
 * Onde este texto não cabe.
 *
 * Só devolve os que estouraram. Mostrar os três sempre viraria decoração, e o
 * número que importa é o que já está errado.
 */
export function ondeNaoCabe(caracteres: number): Aperto[] {
  return LIMITES.filter((l) => caracteres > l.caracteres).map((l) => ({
    ...l,
    excedeu: caracteres - l.caracteres,
  }));
}

/**
 * O slide mais longo do carrossel.
 *
 * É o número que decide se o carrossel cabe: a média não ajuda, porque quem
 * estoura é sempre um slide só.
 */
export function slideMaisLongo(corpo: string): number {
  const slides = slidesDe(corpo);
  return slides.length === 0 ? 0 : Math.max(...slides.map((s) => s.length));
}

/* ── A esteira ───────────────────────────────────────────────────────────── */

export interface ResumoDaCriacao {
  porEstado: Record<EstadoDaPeca, number>;
  /** peças com data de publicar já vencida e ainda não publicadas */
  atrasadas: number;
  /** peças prontas esperando data */
  prontasSemData: number;
}

export function resumirCriacao(pecas: readonly Peca[], hoje: string): ResumoDaCriacao {
  const porEstado: Record<EstadoDaPeca, number> = {
    semente: 0,
    rascunho: 0,
    pronto: 0,
    publicado: 0,
  };
  for (const p of pecas) porEstado[p.estado] += 1;

  return {
    porEstado,
    atrasadas: pecas.filter((p) => estaAtrasada(p, hoje)).length,
    prontasSemData: pecas.filter((p) => p.estado === 'pronto' && !p.publicarEm).length,
  };
}

/** Tem data marcada, a data passou, e ela não saiu. */
export function estaAtrasada(peca: Peca, hoje: string): boolean {
  return !!peca.publicarEm && peca.publicarEm < hoje && !peca.publicadoEm;
}

/**
 * As peças que pedem atenção hoje, na ordem em que pedem.
 *
 * A que já devia ter saído vem antes da que sai hoje. Uma semente nunca entra:
 * ela é matéria-prima, não compromisso.
 */
export function pecasDeHoje(banco: Banco, hoje: string): Peca[] {
  return banco.pecas
    .filter((p) => !p.publicadoEm && p.publicarEm && p.publicarEm <= hoje && p.estado !== 'semente')
    .sort((a, b) => {
      if (a.publicarEm !== b.publicarEm) return a.publicarEm! < b.publicarEm! ? -1 : 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
}

/** `Vence hoje` · `Devia ter saído há 3 dias` · `Sai em 5 dias` */
export function descreverPublicacao(peca: Peca, hoje: string): string {
  if (peca.publicadoEm) return 'Publicado';
  if (!peca.publicarEm) return 'Sem data';

  const dias = distanciaEmDias(hoje, peca.publicarEm);
  if (dias === 0) return 'Sai hoje';
  if (dias === 1) return 'Sai amanhã';
  if (dias > 1) return `Sai em ${dias} dias`;
  const atraso = -dias;
  return `Devia ter saído há ${atraso} ${atraso === 1 ? 'dia' : 'dias'}`;
}

/* ── Exportar ────────────────────────────────────────────────────────────── */

/**
 * Escapa o que vai para dentro de HTML.
 *
 * Não é paranoia: o corpo é meu, mas ele tem `<`, `&` e aspas o tempo todo —
 * um post sobre "a & b < c" sairia com o texto comido, e um trecho de código
 * viraria marcação. Escapar é o que faz a exportação ser fiel.
 */
export function escaparHtml(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Um HTML inteiro, de pé sozinho.
 *
 * Sem folha de estilo externa e sem fonte remota: o arquivo tem que abrir daqui
 * a cinco anos, num computador que nunca ouviu falar deste sistema. Por isso o
 * estilo vai embutido e a fonte é a do sistema.
 */
export function comoHtml(peca: Pick<Peca, 'titulo' | 'corpo' | 'tipo'>): string {
  const titulo = escaparHtml(peca.titulo.trim() || 'Sem título');

  const corpo =
    peca.tipo === 'carrossel'
      ? slidesDe(peca.corpo)
          .map(
            (slide, i) =>
              `<section class="slide"><span class="n">${i + 1}</span>${paragrafos(slide)}</section>`,
          )
          .join('\n')
      : paragrafos(peca.corpo);

  return `<!doctype html>
<html lang="pt-BR">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0 auto; padding: 48px 24px; max-width: 42rem;
    font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1a1a1a; background: #fff;
  }
  h1 { font-size: 1.75rem; line-height: 1.25; margin: 0 0 1.5rem; }
  p { margin: 0 0 1rem; white-space: pre-wrap; }
  .slide { border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px; margin: 0 0 16px; position: relative; }
  .n { position: absolute; top: 8px; right: 12px; color: #999; font-size: 12px; }
  @media print { .slide { break-inside: avoid; } body { padding: 0; } }
</style>
<h1>${titulo}</h1>
${corpo}
</html>`;
}

/** Cada linha em branco separa um parágrafo; o resto vira quebra dentro dele. */
function paragrafos(texto: string): string {
  const blocos = texto
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b !== '');
  if (blocos.length === 0) return '<p></p>';
  return blocos.map((b) => `<p>${escaparHtml(b)}</p>`).join('\n');
}

/**
 * O texto puro, para colar em qualquer lugar.
 *
 * O carrossel sai numerado: colar um carrossel sem os números vira um bloco
 * único que ninguém consegue separar de novo.
 */
export function comoTexto(peca: Pick<Peca, 'titulo' | 'corpo' | 'tipo'>): string {
  if (peca.tipo !== 'carrossel') {
    return `${peca.titulo}\n\n${peca.corpo}`.trim();
  }
  const slides = slidesDe(peca.corpo);
  // Sem o elemento vazio no meio: `join` já põe a linha em branco entre os
  // itens, e o vazio somava uma quebra a mais entre o título e o primeiro
  // slide. O teste pegou.
  return [peca.titulo, ...slides.map((s, i) => `[${i + 1}/${slides.length}]\n${s}`)]
    .join('\n\n')
    .trim();
}

/** Um nome de arquivo que sobrevive a qualquer sistema. */
export function nomeDeArquivo(titulo: string, extensao: string): string {
  const base =
    titulo
      .normalize('NFD')
      // Tira os acentos, que viram mojibake em sistema de arquivos antigo.
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'sem-titulo';
  return `${base}.${extensao}`;
}

/* ── Validação ───────────────────────────────────────────────────────────── */

export class PecaInvalida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'PecaInvalida';
  }
}

export function validarPeca(peca: Pick<Peca, 'titulo' | 'publicarEm'>): void {
  if (peca.titulo.trim() === '') throw new PecaInvalida('a peça precisa de um título');
  if (peca.publicarEm !== undefined && !diaValido(peca.publicarEm)) {
    throw new PecaInvalida('a data de publicar precisa ser uma data válida');
  }
}

/* ── Filtro ──────────────────────────────────────────────────────────────── */

export interface FiltroDaCriacao {
  tipo?: TipoDePeca;
  estado?: EstadoDaPeca;
  contexto?: Contexto;
  /** procura no título, no corpo e nas etiquetas */
  busca?: string;
}

export function filtrarPecas(pecas: readonly Peca[], filtro: FiltroDaCriacao): Peca[] {
  const termo = filtro.busca?.trim().toLowerCase() ?? '';

  return pecas.filter((p) => {
    if (filtro.tipo && p.tipo !== filtro.tipo) return false;
    if (filtro.estado && p.estado !== filtro.estado) return false;
    if (filtro.contexto && p.contexto !== filtro.contexto) return false;
    if (termo === '') return true;

    // No corpo também: o que eu lembro de um rascunho costuma ser uma frase
    // de dentro dele, não o título que eu nem cheguei a escrever direito.
    const onde = [p.titulo, p.corpo, ...(p.etiquetas ?? [])].join(' ').toLowerCase();
    return onde.includes(termo);
  });
}

/** Todas as etiquetas já usadas, sem repetir, em ordem. */
export function etiquetasUsadas(pecas: readonly Peca[]): string[] {
  return [...new Set(pecas.flatMap((p) => p.etiquetas ?? []))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
}

/** `ideia, post` → `['ideia', 'post']`, sem vazias nem repetidas. */
export function lerEtiquetas(texto: string): string[] {
  return [
    ...new Set(
      texto
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e !== ''),
    ),
  ];
}
