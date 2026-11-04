import { describe, it, expect } from 'vitest';
import {
  normalizarUsuario,
  ordenarReferencia,
  instrucaoDoGargalo,
  montarPedido,
  textoDoPrompt,
  lerGerado,
  corpoDaPeca,
  REGRAS_DE_ESCRITA,
  type PerfilLido,
  type PostDeReferencia,
  type GeradoReel,
  type GeradoCarrossel,
} from './estudio';
import type { DadosDoInstagram, PostDoInstagram } from './instagram';

const HOJE = '2026-11-03';

const post = (p: Partial<PostDoInstagram> & Pick<PostDoInstagram, 'id' | 'formato' | 'publicadoEm'>): PostDoInstagram => ({
  legenda: `legenda ${p.id}`,
  link: `https://www.instagram.com/p/${p.id}/`,
  curtidas: 0,
  comentarios: 0,
  ...p,
});

const reels = [1000, 3000, 1500, 1200, 900, 800, 2500].map((alcance, i) =>
  post({ id: `r${i}`, formato: 'reels', publicadoEm: `2026-10-${String(10 + i).padStart(2, '0')}T15:00:00Z`, alcance, salvamentos: 5, compartilhamentos: 2 }),
);
const carrosseis = [1, 2, 3].map((i) =>
  post({
    id: `c${i}`, formato: 'carrossel', publicadoEm: `2026-10-2${i}T15:00:00Z`,
    alcance: 1000, curtidas: 50, comentarios: 10, salvamentos: 5, compartilhamentos: 5,
    visitasAoPerfil: 10, seguidoresGanhos: 1,
  }),
);

const DADOS: DadosDoInstagram = {
  perfil: { usuario: '_luizpereira_', nome: 'Luiz Eduardo', bio: 'Marketing e Vendas para advogados', seguidores: 2243, totalDePosts: 69 },
  posts: [...reels, ...carrosseis],
  lidoEm: '2026-11-03T12:00:00Z',
};

const ref = (id: string, curtidas: number, comentarios: number): PostDeReferencia => ({
  id, legenda: `ref ${id}`, formato: 'carrossel', publicadoEm: '2026-10-20T12:00:00Z',
  link: `https://www.instagram.com/p/${id}/`, curtidas, comentarios,
});

const REEL: GeradoReel = {
  formato: 'reel',
  ganchos: ['G1', 'G2', 'G3'],
  blocos: [{ fala: 'F1', tela: 'T1' }, { fala: 'F2', tela: 'T2' }],
  cta: 'Siga',
};
const CARROSSEL: GeradoCarrossel = { formato: 'carrossel', ganchos: ['A', 'B', 'C'], cards: ['card1', 'card2'], cta: 'Salve' };

describe('normalizarUsuario', () => {
  it('limpa @, espaços, maiúsculas e URL', () => {
    expect(normalizarUsuario('@Fulano.Adv ')).toBe('fulano.adv');
    expect(normalizarUsuario('https://www.instagram.com/fulano_adv/')).toBe('fulano_adv');
    expect(normalizarUsuario('instagram.com/fulano_adv?igsh=abc')).toBe('fulano_adv');
  });
  it('recusa vazio e caracteres inválidos', () => {
    expect(normalizarUsuario('')).toBeNull();
    expect(normalizarUsuario('a b')).toBeNull();
    expect(normalizarUsuario('x'.repeat(31))).toBeNull();
  });
});

describe('ordenarReferencia', () => {
  const perfil = (seguidores: number, posts: PostDeReferencia[]): PerfilLido => ({ usuario: 'u', seguidores, posts });

  it('ordena por engajamento relativo, com a razão sobre a mediana do perfil', () => {
    const r = ordenarReferencia(perfil(1000, [ref('a', 50, 10), ref('b', 100, 20), ref('c', 10, 0)]));
    expect(r.map((x) => x.post.id)).toEqual(['b', 'a', 'c']);
    expect(r[0].engajamento).toBeCloseTo(0.12);
    expect(r[0].razao).toBeCloseTo(2);
  });
  it('seguidores zero: sem engajamento e sem razão, sem NaN', () => {
    const r = ordenarReferencia(perfil(0, [ref('a', 50, 10), ref('b', 1, 0)]));
    expect(r.every((x) => x.engajamento === null && x.razao === null)).toBe(true);
    expect(r.map((x) => x.post.id)).toEqual(['a', 'b']);
  });
  it('perfil sem posts', () => {
    expect(ordenarReferencia(perfil(1000, []))).toEqual([]);
  });
});

describe('instrucaoDoGargalo', () => {
  it('uma instrução por degrau', () => {
    expect(instrucaoDoGargalo('Visitaram o perfil')).toMatch(/motivo concreto para visitar o perfil/);
    expect(instrucaoDoGargalo('Seguiram')).toMatch(/seguir/);
    expect(instrucaoDoGargalo('Interações')).toMatch(/comentar/);
    expect(instrucaoDoGargalo('Guardaram')).toMatch(/salvar/);
    expect(instrucaoDoGargalo('Outro')).toBe('');
  });
});

describe('montarPedido', () => {
  it('o sistema carrega as regras de escrita', () => {
    const { sistema } = montarPedido({ formato: 'reel', tema: 'honorários', referencias: [] }, DADOS, HOJE);
    for (const regra of REGRAS_DE_ESCRITA) expect(sistema).toContain(regra);
  });

  it('com dados, traz o perfil e os 5 melhores Reels', () => {
    const { mensagem } = montarPedido({ formato: 'reel', tema: 'honorários', referencias: [] }, DADOS, HOJE);
    expect(mensagem).toContain('@_luizpereira_');
    expect(mensagem).toContain('O que funciona com você');
    expect(mensagem).toContain('legenda r1'); // 3000, o maior
    expect(mensagem).toContain('legenda r6'); // 2500
    expect(mensagem).not.toContain('legenda r5'); // 800, fora dos 5
    expect(mensagem).not.toContain('legenda c1'); // carrossel não entra num Reel
    expect(mensagem).toContain('×');
    expect(mensagem).toContain('honorários');
  });

  it('sem dados do Instagram, segue sem a parte dos seus números', () => {
    const { mensagem } = montarPedido({ formato: 'carrossel', tema: 'tema', referencias: [] }, null, HOJE);
    expect(mensagem).not.toContain('O que funciona com você');
    expect(mensagem).toContain('tema');
  });

  it('referências entram com o porquê e o @', () => {
    const { mensagem } = montarPedido(
      {
        formato: 'carrossel',
        tema: 'tema',
        referencias: [{ usuario: 'fulano', legenda: 'Pare de perder clientes', formato: 'carrossel', curtidas: 900, comentarios: 80, porQue: 'gancho com número' }],
      },
      DADOS,
      HOJE,
    );
    expect(mensagem).toContain('@fulano');
    expect(mensagem).toContain('gancho com número');
  });

  it('ajuste leva o pedido e o resultado anterior', () => {
    const { mensagem } = montarPedido({ formato: 'reel', tema: 't', referencias: [], ajuste: { pedido: 'mais curto', anterior: REEL } }, null, HOJE);
    expect(mensagem).toContain('mais curto');
    expect(mensagem).toContain(JSON.stringify(REEL));
  });

  it('corta legendas em 400 e o total em 12 mil caracteres', () => {
    const longo = 'x'.repeat(5000);
    const dados: DadosDoInstagram = { ...DADOS, posts: DADOS.posts.map((p) => ({ ...p, legenda: longo })) };
    const { mensagem } = montarPedido(
      { formato: 'reel', tema: 't', referencias: [1, 2, 3].map(() => ({ usuario: 'u', legenda: longo, formato: 'reels' as const, curtidas: 1, comentarios: 1, porQue: 'p' })) },
      dados,
      HOJE,
    );
    expect(mensagem).not.toContain('x'.repeat(401));
    expect(mensagem.length).toBeLessThanOrEqual(12000);
  });

  it('o porquê também tem limite', () => {
    const { mensagem } = montarPedido(
      { formato: 'reel', tema: 't', referencias: [{ usuario: 'u', legenda: 'l', formato: 'reels', curtidas: 1, comentarios: 1, porQue: 'y'.repeat(20000) }] },
      null,
      HOJE,
    );
    expect(mensagem).not.toContain('y'.repeat(301));
    expect(mensagem.length).toBeLessThanOrEqual(12000);
  });

  it('termina com o esquema do formato', () => {
    expect(montarPedido({ formato: 'reel', tema: 't', referencias: [] }, null, HOJE).mensagem).toMatch(/"blocos"[\s\S]*$/);
    expect(montarPedido({ formato: 'carrossel', tema: 't', referencias: [] }, null, HOJE).mensagem).toMatch(/"cards"[\s\S]*$/);
  });

  it('o gargalo do funil vira instrução, quando há funil', () => {
    const { mensagem } = montarPedido({ formato: 'carrossel', tema: 't', referencias: [] }, DADOS, HOJE);
    expect(mensagem).toMatch(/Ponto fraco do funil/);
  });
});

describe('textoDoPrompt', () => {
  it('junta as instruções e o pedido num texto só, para colar em qualquer IA', () => {
    const pedido = { formato: 'carrossel' as const, tema: 'honorários', referencias: [] };
    const { sistema, mensagem } = montarPedido(pedido, DADOS, HOJE);
    const texto = textoDoPrompt(pedido, DADOS, HOJE);
    expect(texto.startsWith(sistema)).toBe(true);
    expect(texto.endsWith(mensagem)).toBe(true);
  });
});

describe('lerGerado', () => {
  const reelJson = JSON.stringify({ ganchos: ['a', 'b', 'c'], blocos: [{ fala: 'f', tela: 't' }], cta: 'x' });

  it('lê o JSON limpo', () => {
    const g = lerGerado(reelJson, 'reel');
    expect(g?.formato).toBe('reel');
    expect(g?.ganchos).toHaveLength(3);
  });
  it('lê com texto em volta e cerca de código', () => {
    expect(lerGerado(`Aqui está:\n\`\`\`json\n${reelJson}\n\`\`\`\nBom post!`, 'reel')?.ganchos).toEqual(['a', 'b', 'c']);
  });
  it('recusa forma errada', () => {
    expect(lerGerado(JSON.stringify({ ganchos: ['a', 'b'], blocos: [{ fala: 'f', tela: 't' }], cta: 'x' }), 'reel')).toBeNull();
    expect(lerGerado(JSON.stringify({ ganchos: ['a', 'b', 'c'], blocos: [], cta: 'x' }), 'reel')).toBeNull();
    expect(lerGerado(reelJson, 'carrossel')).toBeNull();
    expect(lerGerado('sem json nenhum', 'reel')).toBeNull();
  });
  it('lê carrossel', () => {
    const g = lerGerado(JSON.stringify({ ganchos: ['a', 'b', 'c'], cards: ['1', '2'], cta: 'x' }), 'carrossel');
    expect(g).toEqual({ formato: 'carrossel', ganchos: ['a', 'b', 'c'], cards: ['1', '2'], cta: 'x' });
  });
});

describe('corpoDaPeca', () => {
  it('carrossel: gancho escolhido na capa, cards e CTA separados por ---', () => {
    expect(corpoDaPeca(CARROSSEL, 1)).toBe('B\n---\ncard1\n---\ncard2\n---\nSalve');
  });
  it('Reel: gancho, blocos de fala e tela, CTA', () => {
    expect(corpoDaPeca(REEL, 0)).toBe('Gancho (0–3 s): G1\n\nFala: F1\nTela: T1\n\nFala: F2\nTela: T2\n\nCTA: Siga');
  });
});
