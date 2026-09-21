import { describe, it, expect } from 'vitest';
import {
  slidesDe,
  corpoDeSlides,
  contar,
  ondeNaoCabe,
  slideMaisLongo,
  resumirCriacao,
  estaAtrasada,
  pecasDeHoje,
  descreverPublicacao,
  escaparHtml,
  comoHtml,
  comoTexto,
  nomeDeArquivo,
  validarPeca,
  filtrarPecas,
  etiquetasUsadas,
  lerEtiquetas,
  PecaInvalida,
} from './criacao';
import { bancoVazio, type Peca, type Banco } from '../dados/esquema';

const HOJE = '2026-09-17';

const peca = (dados: Partial<Peca> = {}): Peca => ({
  id: 'p1',
  criadoEm: '2026-01-01T00:00:00.000Z',
  alteradoEm: '2026-01-01T00:00:00.000Z',
  titulo: 'Uma peça',
  tipo: 'post',
  estado: 'rascunho',
  contexto: 'profissional',
  corpo: '',
  ...dados,
});

describe('o carrossel', () => {
  it('fatia nos separadores', () => {
    expect(slidesDe('Um\n---\nDois\n---\nTrês')).toEqual(['Um', 'Dois', 'Três']);
  });

  it('sem separador nenhum é um slide, e não zero', () => {
    expect(slidesDe('Só isto')).toEqual(['Só isto']);
  });

  it('corpo vazio não tem slide', () => {
    expect(slidesDe('')).toEqual([]);
    expect(slidesDe('   \n  ')).toEqual([]);
  });

  it('separadores dobrados não criam slide em branco', () => {
    // Acontece enquanto se escreve, e um slide vazio no meio é sempre engano.
    expect(slidesDe('Um\n---\n---\nDois')).toEqual(['Um', 'Dois']);
  });

  it('tolera espaço em volta do separador', () => {
    expect(slidesDe('Um\n  ---  \nDois')).toEqual(['Um', 'Dois']);
  });

  it('três traços dentro de uma linha de texto não separam', () => {
    // O separador é uma linha inteira. "a --- b" é uma frase.
    expect(slidesDe('antes a --- b depois')).toEqual(['antes a --- b depois']);
  });

  it('a volta é fiel', () => {
    const slides = ['Primeiro', 'Segundo', 'Terceiro'];
    expect(slidesDe(corpoDeSlides(slides))).toEqual(slides);
  });

  it('o slide mais longo é o que decide se cabe', () => {
    // A média não ajuda: quem estoura é sempre um slide só.
    expect(slideMaisLongo('abc\n---\nabcdefghij\n---\nab')).toBe(10);
    expect(slideMaisLongo('')).toBe(0);
  });
});

describe('a contagem', () => {
  it('conta caracteres, palavras e linhas', () => {
    const c = contar(peca({ corpo: 'Uma frase curta\nem duas linhas' }));
    expect(c.palavras).toBe(6);
    expect(c.linhas).toBe(2);
    expect(c.caracteres).toBe('Uma frase curta\nem duas linhas'.length);
  });

  it('quebra de linha também separa palavra', () => {
    // `split(' ')` contaria uma palavra fantasma em "a\nb".
    expect(contar(peca({ corpo: 'a\nb' })).palavras).toBe(2);
    expect(contar(peca({ corpo: 'a   b' })).palavras).toBe(2);
  });

  it('corpo vazio é zero de tudo, e não um', () => {
    expect(contar(peca({ corpo: '' }))).toMatchObject({ palavras: 0, linhas: 0 });
    expect(contar(peca({ corpo: '   ' }))).toMatchObject({ palavras: 0, linhas: 0 });
  });

  it('só conta slides quando é carrossel', () => {
    expect(contar(peca({ tipo: 'post', corpo: 'a\n---\nb' })).slides).toBe(0);
    expect(contar(peca({ tipo: 'carrossel', corpo: 'a\n---\nb' })).slides).toBe(2);
  });
});

describe('os limites de plataforma', () => {
  it('só devolve onde estourou', () => {
    // Mostrar os três sempre viraria decoração.
    expect(ondeNaoCabe(100)).toEqual([]);
    expect(ondeNaoCabe(300).map((a) => a.nome)).toEqual(['X']);
    expect(ondeNaoCabe(2500).map((a) => a.nome)).toEqual(['X', 'Instagram']);
    expect(ondeNaoCabe(5000)).toHaveLength(3);
  });

  it('diz quanto passou', () => {
    expect(ondeNaoCabe(300)[0].excedeu).toBe(20);
  });

  it('exatamente no limite ainda cabe', () => {
    expect(ondeNaoCabe(280)).toEqual([]);
    expect(ondeNaoCabe(281).map((a) => a.nome)).toEqual(['X']);
  });
});

describe('a esteira', () => {
  const banco = (pecas: Peca[]): Banco => ({ ...bancoVazio(), pecas });

  it('conta por estado', () => {
    const r = resumirCriacao(
      [peca({ estado: 'semente' }), peca({ estado: 'rascunho' }), peca({ estado: 'rascunho' })],
      HOJE,
    );
    expect(r.porEstado).toEqual({ semente: 1, rascunho: 2, pronto: 0, publicado: 0 });
  });

  it('atrasada é: tem data, a data passou, e não saiu', () => {
    expect(estaAtrasada(peca({ publicarEm: '2026-09-10' }), HOJE)).toBe(true);
    expect(estaAtrasada(peca({ publicarEm: HOJE }), HOJE)).toBe(false);
    expect(estaAtrasada(peca({ publicarEm: '2026-09-25' }), HOJE)).toBe(false);
    expect(estaAtrasada(peca({}), HOJE)).toBe(false);
    expect(
      estaAtrasada(peca({ publicarEm: '2026-09-10', publicadoEm: '2026-09-11T12:00:00Z' }), HOJE),
    ).toBe(false);
  });

  it('o que pede hoje: atrasado primeiro, e a semente nunca', () => {
    // A semente é matéria-prima, não compromisso.
    const b = banco([
      peca({ id: 'hoje', publicarEm: HOJE }),
      peca({ id: 'atrasada', publicarEm: '2026-09-10' }),
      peca({ id: 'futura', publicarEm: '2026-09-25' }),
      peca({ id: 'semente', publicarEm: '2026-09-10', estado: 'semente' }),
      peca({ id: 'saiu', publicarEm: '2026-09-10', publicadoEm: '2026-09-10T12:00:00Z' }),
    ]);
    expect(pecasDeHoje(b, HOJE).map((p) => p.id)).toEqual(['atrasada', 'hoje']);
  });

  it('a descrição fala como gente', () => {
    expect(descreverPublicacao(peca({ publicarEm: HOJE }), HOJE)).toBe('Sai hoje');
    expect(descreverPublicacao(peca({ publicarEm: '2026-09-18' }), HOJE)).toBe('Sai amanhã');
    expect(descreverPublicacao(peca({ publicarEm: '2026-09-22' }), HOJE)).toBe('Sai em 5 dias');
    expect(descreverPublicacao(peca({ publicarEm: '2026-09-16' }), HOJE)).toBe(
      'Devia ter saído há 1 dia',
    );
    expect(descreverPublicacao(peca({ publicarEm: '2026-09-10' }), HOJE)).toBe(
      'Devia ter saído há 7 dias',
    );
    expect(descreverPublicacao(peca({}), HOJE)).toBe('Sem data');
    expect(descreverPublicacao(peca({ publicadoEm: '2026-09-10T12:00:00Z' }), HOJE)).toBe(
      'Publicado',
    );
  });
});

describe('exportar como HTML', () => {
  it('escapa o que quebraria a marcação', () => {
    // Um post sobre "a & b < c" sairia com o texto comido.
    expect(escaparHtml('a & b < c > d "aspas" \'simples\'')).toBe(
      'a &amp; b &lt; c &gt; d &quot;aspas&quot; &#39;simples&#39;',
    );
  });

  it('o corpo não vira marcação', () => {
    const html = comoHtml(peca({ titulo: 'Título', corpo: '<script>alert(1)</script>' }));
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('o título também é escapado', () => {
    const html = comoHtml(peca({ titulo: 'A & B', corpo: 'x' }));
    expect(html).toContain('<title>A &amp; B</title>');
    expect(html).toContain('<h1>A &amp; B</h1>');
  });

  it('linha em branco separa parágrafo; quebra simples fica dentro', () => {
    const html = comoHtml(peca({ corpo: 'um\ndois\n\ntrês' }));
    expect(html).toContain('<p>um\ndois</p>');
    expect(html).toContain('<p>três</p>');
  });

  it('o carrossel sai em seções numeradas', () => {
    const html = comoHtml(peca({ tipo: 'carrossel', corpo: 'Um\n---\nDois' }));
    expect((html.match(/class="slide"/g) ?? [])).toHaveLength(2);
    expect(html).toContain('<span class="n">1</span>');
    expect(html).toContain('<span class="n">2</span>');
  });

  it('é um arquivo de pé sozinho: sem folha nem fonte de fora', () => {
    // Ele tem que abrir daqui a cinco anos, num computador que nunca ouviu
    // falar deste sistema.
    const html = comoHtml(peca({ corpo: 'x' }));
    expect(html).not.toContain('<link');
    expect(html).not.toContain('http://');
    expect(html).not.toContain('https://');
    expect(html.startsWith('<!doctype html>')).toBe(true);
  });

  it('peça sem título não sai com o cabeçalho vazio', () => {
    expect(comoHtml(peca({ titulo: '   ', corpo: 'x' }))).toContain('<h1>Sem título</h1>');
  });

  it('corpo vazio não quebra', () => {
    expect(() => comoHtml(peca({ corpo: '' }))).not.toThrow();
  });
});

describe('exportar como texto', () => {
  it('título e corpo, sem enfeite', () => {
    expect(comoTexto(peca({ titulo: 'T', corpo: 'corpo' }))).toBe('T\n\ncorpo');
  });

  it('o carrossel sai numerado', () => {
    // Sem os números vira um bloco único que ninguém separa de novo.
    expect(comoTexto(peca({ titulo: 'T', tipo: 'carrossel', corpo: 'Um\n---\nDois' }))).toBe(
      'T\n\n[1/2]\nUm\n\n[2/2]\nDois',
    );
  });
});

describe('o nome do arquivo', () => {
  it('tira acento, espaço e pontuação', () => {
    expect(nomeDeArquivo('Três ideias para o lançamento!', 'html')).toBe(
      'tres-ideias-para-o-lancamento.html',
    );
  });

  it('não sai vazio nem começa ou termina com traço', () => {
    expect(nomeDeArquivo('...', 'md')).toBe('sem-titulo.md');
    expect(nomeDeArquivo('  olá  ', 'md')).toBe('ola.md');
  });

  it('não fica gigante', () => {
    const nome = nomeDeArquivo('a'.repeat(200), 'html');
    expect(nome.length).toBeLessThanOrEqual(65);
  });
});

describe('o filtro', () => {
  const lista = [
    peca({ id: '1', titulo: 'Post sobre hábitos', tipo: 'post', estado: 'rascunho', corpo: 'rotina diária' }),
    peca({ id: '2', titulo: 'Carrossel de setembro', tipo: 'carrossel', estado: 'pronto', corpo: 'slides' }),
    peca({ id: '3', titulo: 'Ideia solta', tipo: 'ideia', estado: 'semente', etiquetas: ['lançamento'] }),
  ];

  it('recorta por tipo, estado e contexto', () => {
    expect(filtrarPecas(lista, { tipo: 'post' }).map((p) => p.id)).toEqual(['1']);
    expect(filtrarPecas(lista, { estado: 'pronto' }).map((p) => p.id)).toEqual(['2']);
    expect(filtrarPecas(lista, { contexto: 'pessoal' })).toEqual([]);
  });

  it('a busca alcança o corpo, e não só o título', () => {
    // O que eu lembro de um rascunho é uma frase de dentro dele.
    expect(filtrarPecas(lista, { busca: 'rotina' }).map((p) => p.id)).toEqual(['1']);
  });

  it('a busca alcança a etiqueta', () => {
    expect(filtrarPecas(lista, { busca: 'lançamento' }).map((p) => p.id)).toEqual(['3']);
  });

  it('ignora a caixa e os espaços', () => {
    expect(filtrarPecas(lista, { busca: '  HÁBITOS ' }).map((p) => p.id)).toEqual(['1']);
  });

  it('busca vazia não filtra nada', () => {
    expect(filtrarPecas(lista, { busca: '   ' })).toHaveLength(3);
  });

  it('os filtros se somam', () => {
    expect(filtrarPecas(lista, { tipo: 'post', estado: 'pronto' })).toEqual([]);
  });
});

describe('as etiquetas', () => {
  it('lê uma lista separada por vírgula, sem repetir nem deixar vazia', () => {
    expect(lerEtiquetas('post, Ideia ,  post,  , lançamento')).toEqual([
      'post',
      'ideia',
      'lançamento',
    ]);
  });

  it('junta as usadas em ordem do português', () => {
    const lista = [peca({ etiquetas: ['zebra', 'ácaro'] }), peca({ etiquetas: ['banana', 'zebra'] })];
    expect(etiquetasUsadas(lista)).toEqual(['ácaro', 'banana', 'zebra']);
  });
});

describe('o que uma peça não pode ser', () => {
  it('recusa título em branco', () => {
    expect(() => validarPeca({ titulo: '  ' })).toThrow(PecaInvalida);
  });

  it('recusa data de publicar que não existe', () => {
    expect(() => validarPeca({ titulo: 'X', publicarEm: '2026-02-30' })).toThrow(PecaInvalida);
    expect(() => validarPeca({ titulo: 'X', publicarEm: undefined })).not.toThrow();
  });
});
