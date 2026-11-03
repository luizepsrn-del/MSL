import { describe, it, expect } from 'vitest';
import {
  dividirPorPeriodo,
  resumir,
  porFormato,
  recomendar,
  LIMITE_DE_RECOMENDACOES,
  anteriorCompleto,
  variacao,
  funil,
  rankear,
  hoje,
  itemDoInstagram,
  type PostDoInstagram,
} from './instagram';

/**
 * Dez posts reais do @_luizpereira_, lidos da Meta em 2026-11-03.
 *
 * Reels não têm visitas nem seguidores: a Meta não entrega essas métricas
 * para esse formato, e a ausência fica `undefined` — nunca zero.
 */
const post = (p: Partial<PostDoInstagram> & Pick<PostDoInstagram, 'id' | 'formato' | 'publicadoEm'>): PostDoInstagram => ({
  legenda: p.id,
  link: `https://www.instagram.com/p/${p.id}/`,
  curtidas: 0,
  comentarios: 0,
  ...p,
});

const POSTS_REAIS: PostDoInstagram[] = [
  post({ id: 'concorda', formato: 'carrossel', publicadoEm: '2026-11-03T15:20:54Z', alcance: 182, salvamentos: 3, compartilhamentos: 0, visitasAoPerfil: 6, seguidoresGanhos: 0 }),
  post({ id: 'sozinho', formato: 'reels', publicadoEm: '2026-11-01T16:00:42Z', alcance: 331, salvamentos: 3, compartilhamentos: 0, tempoMedioMs: 8821 }),
  post({ id: 'seguimos', formato: 'reels', publicadoEm: '2026-10-31T20:35:28Z', alcance: 1487, salvamentos: 12, compartilhamentos: 5, tempoMedioMs: 6231 }),
  post({ id: 'reel-28', formato: 'reels', publicadoEm: '2026-10-28T15:00:00Z', alcance: 1593, salvamentos: 5, compartilhamentos: 11, tempoMedioMs: 5858 }),
  post({ id: 'por-aqui', formato: 'reels', publicadoEm: '2026-10-22T15:00:00Z', alcance: 3391, salvamentos: 7, compartilhamentos: 26, tempoMedioMs: 8007 }),
  post({ id: 'silencio', formato: 'carrossel', publicadoEm: '2026-10-08T15:00:00Z', alcance: 224, salvamentos: 3, compartilhamentos: 0, visitasAoPerfil: 0, seguidoresGanhos: 0 }),
  post({ id: 'amentoria', formato: 'carrossel', publicadoEm: '2026-10-01T15:00:00Z', alcance: 4307, salvamentos: 2, compartilhamentos: 7, visitasAoPerfil: 429, seguidoresGanhos: 14 }),
  post({ id: 'reel-24', formato: 'reels', publicadoEm: '2026-09-24T15:00:00Z', alcance: 928, salvamentos: 6, compartilhamentos: 7, tempoMedioMs: 5270 }),
  post({ id: 'reclama', formato: 'carrossel', publicadoEm: '2026-08-25T15:00:00Z', alcance: 1442, salvamentos: 10, compartilhamentos: 18, visitasAoPerfil: 45, seguidoresGanhos: 1 }),
  post({ id: 'mentalista', formato: 'carrossel', publicadoEm: '2026-08-21T15:00:00Z', alcance: 2373, salvamentos: 52, compartilhamentos: 30, visitasAoPerfil: 46, seguidoresGanhos: 2 }),
];

/** Carrosséis comuns, para dar volume aos formatos. */
const carrosseis = (n: number, alcance: number): PostDoInstagram[] =>
  Array.from({ length: n }, (_, i) =>
    post({
      id: `c${i}`,
      formato: 'carrossel',
      publicadoEm: `2026-10-${String(10 + i).padStart(2, '0')}T15:00:00Z`,
      alcance,
      salvamentos: 3,
      compartilhamentos: 2,
      visitasAoPerfil: 6,
      seguidoresGanhos: 0,
    }),
  );

describe('resumir', () => {
  it('sem posts, nada é inventado: tudo nulo', () => {
    expect(resumir([])).toEqual({
      posts: 0,
      alcanceMedio: null,
      alcanceMediano: null,
      salvamentosMedios: null,
      compartilhamentosMedios: null,
      visitasAoPerfil: null,
      seguidoresGanhos: null,
    });
  });

  it('métrica ausente fica fora da conta, e não puxa a média para baixo', () => {
    const r = resumir([
      post({ id: 'a', formato: 'carrossel', publicadoEm: '2026-10-01T15:00:00Z', alcance: 100, visitasAoPerfil: 10 }),
      post({ id: 'b', formato: 'reels', publicadoEm: '2026-10-02T15:00:00Z', alcance: 300 }),
    ]);
    expect(r.visitasAoPerfil).toBe(10);
    expect(r.alcanceMedio).toBe(200);
    expect(r.salvamentosMedios).toBeNull();
  });
});

describe('porFormato', () => {
  it('conta os Reels e tira a média só de quem tem alcance', () => {
    const f = porFormato(POSTS_REAIS);
    expect(f.reels.posts).toBe(5);
    expect(f.carrossel.posts).toBe(5);
    expect(f.imagem).toEqual({ posts: 0, alcanceMedio: null });
  });
});

describe('dividirPorPeriodo', () => {
  const hoje = '2026-11-03';
  const p = (id: string, publicadoEm: string) => post({ id, formato: 'imagem', publicadoEm });

  it('a janela de 30 dias começa 30 dias antes de hoje, pelo dia local', () => {
    const { atual, anterior } = dividirPorPeriodo(
      [
        p('dentro', '2026-10-04T12:00:00Z'),
        p('fora', '2026-10-03T12:00:00Z'),
        // 22h30 do dia 3 em São Paulo: o dia local é 3, não 4.
        p('noite', '2026-10-04T01:30:00Z'),
        p('muito-antes', '2026-08-01T12:00:00Z'),
      ],
      30,
      hoje,
    );
    expect(atual.map((x) => x.id)).toEqual(['dentro']);
    expect(anterior.map((x) => x.id).sort()).toEqual(['fora', 'noite']);
  });

  it("'tudo' não tem período anterior", () => {
    const { atual, anterior } = dividirPorPeriodo(POSTS_REAIS, 'tudo', hoje);
    expect(atual).toHaveLength(POSTS_REAIS.length);
    expect(anterior).toEqual([]);
  });
});

describe('recomendar', () => {
  const hoje = '2026-11-03';
  const atual = [...POSTS_REAIS, ...carrosseis(12, 500)];

  it('acha o formato sub-usado, o post que trouxe gente e o post que foi guardado', () => {
    const recs = recomendar(atual, [], hoje, 90);
    const tipos = recs.map((r) => r.tipo);
    expect(tipos).toContain('formato');
    expect(recs.find((r) => r.tipo === 'formato')!.evidencia).toMatch(/Reels/);
    expect(recs.find((r) => r.tipo === 'guardados')!.postId).toBe('mentalista');
    expect(recs.find((r) => r.tipo === 'seguidores')!.postId).toBe('amentoria');
  });

  it('formato com menos de 3 posts não vira recomendação', () => {
    const doisReels = [
      ...carrosseis(10, 300),
      post({ id: 'r1', formato: 'reels', publicadoEm: '2026-10-01T15:00:00Z', alcance: 5000 }),
      post({ id: 'r2', formato: 'reels', publicadoEm: '2026-10-02T15:00:00Z', alcance: 5000 }),
    ];
    expect(recomendar(doisReels, [], hoje, 90).some((r) => r.tipo === 'formato')).toBe(false);
  });

  it('sem posts, nenhuma recomendação', () => {
    expect(recomendar([], [], hoje, 30)).toEqual([]);
  });

  it(`nunca passa de ${LIMITE_DE_RECOMENDACOES}, e vem do maior efeito para o menor`, () => {
    const recs = recomendar(atual, carrosseis(3, 400), hoje, 90);
    expect(recs.length).toBeLessThanOrEqual(LIMITE_DE_RECOMENDACOES);
    const pesos = recs.map((r) => r.peso);
    expect([...pesos].sort((a, b) => b - a)).toEqual(pesos);
  });

  it('o Reel que mais segurou o público é citado pelo tempo assistido', () => {
    const r = recomendar(atual, [], hoje, 90).find((x) => x.tipo === 'retencao');
    expect(r?.postId).toBe('sozinho');
  });

  it('ritmo compara posts por semana com o período anterior', () => {
    const anterior = carrosseis(2, 400);
    const r = recomendar(carrosseis(8, 400), anterior, hoje, 30).find((x) => x.tipo === 'ritmo');
    expect(r).toBeDefined();
    expect(r!.evidencia).toMatch(/semana/);
  });
});

describe('anteriorCompleto', () => {
  const hoje = '2026-11-03';
  const perfil = (totalDePosts: number) => ({ usuario: 'x', seguidores: 1, totalDePosts });
  const p = (dia: string) => post({ id: dia, formato: 'imagem', publicadoEm: `${dia}T15:00:00Z` });

  it('com todos os posts lidos, o anterior vale', () => {
    expect(anteriorCompleto({ perfil: perfil(2), posts: [p('2026-10-30'), p('2026-10-01')], lidoEm: 'x' }, 30, hoje)).toBe(true);
  });

  it('se a leitura parou no teto antes de cobrir o anterior, o anterior não vale', () => {
    // 200 posts no perfil, e o mais antigo lido é de 20 dias atrás: o período
    // anterior de 30 dias (de 60 a 30 dias atrás) não foi lido.
    expect(anteriorCompleto({ perfil: perfil(200), posts: [p('2026-10-30'), p('2026-10-14')], lidoEm: 'x' }, 30, hoje)).toBe(false);
  });

  it('se a leitura parou no teto mas já passou do início do anterior, vale', () => {
    expect(anteriorCompleto({ perfil: perfil(200), posts: [p('2026-10-30'), p('2026-08-01')], lidoEm: 'x' }, 30, hoje)).toBe(true);
  });

  it("'tudo' não tem anterior", () => {
    expect(anteriorCompleto({ perfil: perfil(1), posts: [p('2026-10-30')], lidoEm: 'x' }, 'tudo', hoje)).toBe(false);
  });
});

describe('variacao', () => {
  it('queda é queda: o tom diz caiu', () => {
    expect(variacao(800, 2000, true)).toEqual({ texto: '−1.200 vs anterior', tom: 'caiu' });
  });
  it('alta é alta', () => {
    expect(variacao(2000, 800, true)).toEqual({ texto: '+1.200 vs anterior', tom: 'subiu' });
  });
  it('sem anterior ou sem dado, não há variação', () => {
    expect(variacao(800, 2000, false)).toBeUndefined();
    expect(variacao(null, 2000, true)).toBeUndefined();
  });
});

describe('período de 7 dias', () => {
  it('a janela começa 7 dias antes de hoje', () => {
    const p = (id: string, dia: string) => post({ id, formato: 'imagem', publicadoEm: `${dia}T15:00:00Z` });
    const { atual, anterior } = dividirPorPeriodo([p('a', '2026-10-28'), p('b', '2026-10-25')], 7, '2026-11-03');
    expect(atual.map((x) => x.id)).toEqual(['a']);
    expect(anterior.map((x) => x.id)).toEqual(['b']);
  });
});

describe('funil', () => {
  const feed = (id: string, alcance: number, visitas: number, seguidores: number) =>
    post({
      id, formato: 'carrossel', publicadoEm: '2026-10-20T15:00:00Z',
      alcance, curtidas: 50, comentarios: 10, salvamentos: 5, compartilhamentos: 5,
      visitasAoPerfil: visitas, seguidoresGanhos: seguidores,
    });

  it('soma os degraus dos posts de feed e aponta o gargalo', () => {
    const f = funil([feed('a', 1000, 20, 1), feed('b', 1000, 20, 1), feed('c', 1000, 20, 1)])!;
    expect(f.posts).toBe(3);
    expect(f.degraus.map((d) => d.total)).toEqual([3000, 210, 30, 60, 3]);
    expect(f.degraus[0].taxa).toBeNull();
    expect(f.degraus[1].taxa).toBeCloseTo(0.07);
    // seguiram / visitaram = 3/60 = 5%: a menor taxa
    expect(f.gargalo).toBe(4);
  });

  it('Reels ficam de fora: a Meta não informa visitas para eles', () => {
    const reel = post({ id: 'r', formato: 'reels', publicadoEm: '2026-10-20T15:00:00Z', alcance: 99999 });
    const f = funil([feed('a', 1000, 20, 1), feed('b', 1000, 20, 1), feed('c', 1000, 20, 1), reel])!;
    expect(f.degraus[0].total).toBe(3000);
  });

  it('com menos de 3 posts com dado, não há funil', () => {
    expect(funil([feed('a', 1000, 20, 1), feed('b', 1000, 20, 1)])).toBeNull();
    expect(funil([])).toBeNull();
  });
});

describe('hoje', () => {
  const dados = (posts: PostDoInstagram[]) => ({
    perfil: { usuario: '_luizpereira_', seguidores: 2242, totalDePosts: posts.length },
    posts,
    lidoEm: '2026-11-03T18:00:00Z',
  });
  const reel = (id: string, dia: string, alcance: number, hora = '15:00:00Z') =>
    post({ id, formato: 'reels', publicadoEm: `${dia}T${hora}`, alcance });
  const base = [reel('r1', '2026-10-10', 1000), reel('r2', '2026-10-15', 1200), reel('r3', '2026-10-20', 1100)];

  it('post de ontem com 2× a mediana do formato vira ação', () => {
    const h = hoje(dados([reel('novo', '2026-11-02', 2500), ...base]), '2026-11-03');
    expect(h.novos).toHaveLength(1);
    expect(h.novos[0].razao).toBeCloseTo(2500 / 1100);
    expect(h.diasSemPostar).toBe(1);
    expect(h.acoes[0]).toMatch(/Reel de ontem está com 2,3× o alcance normal/);
  });

  it('6 dias sem postar vira ação', () => {
    const h = hoje(dados([reel('ultimo', '2026-10-28', 900), ...base]), '2026-11-03');
    expect(h.novos).toEqual([]);
    expect(h.diasSemPostar).toBe(6);
    expect(h.acoes).toEqual(['6 dias sem postar no Instagram.']);
  });

  it('formato com menos de 3 posts: post novo sem razão e sem ação forte', () => {
    const h = hoje(dados([reel('novo', '2026-11-03', 5000), reel('r1', '2026-10-10', 100)]), '2026-11-03');
    expect(h.novos[0].razao).toBeNull();
    expect(h.acoes).toEqual([]);
  });

  it('23h de São Paulo ainda é hoje', () => {
    // 02:00 UTC do dia 4 = 23:00 do dia 3 em São Paulo
    const h = hoje(dados([reel('noite', '2026-11-04', 900, '02:00:00Z'), ...base]), '2026-11-03');
    expect(h.diasSemPostar).toBe(0);
  });

  it('item da fila: a primeira ação, tipo instagram, faixa 6, não marcável', () => {
    const item = itemDoInstagram(dados([reel('ultimo', '2026-10-28', 900), ...base]), '2026-11-03');
    expect(item).toMatchObject({
      chave: 'instagram:hoje',
      tipo: 'instagram',
      titulo: '6 dias sem postar no Instagram.',
      faixa: 6,
      marcavel: false,
    });
    expect(itemDoInstagram(dados(base.map((p, i) => ({ ...p, publicadoEm: `2026-11-0${i + 1}T15:00:00Z` }))), '2026-11-03')).toBeNull();
  });
});

describe('rankear', () => {
  const p = (id: string, alcance?: number, extra: Partial<PostDoInstagram> = {}): PostDoInstagram => ({
    id,
    legenda: id,
    formato: 'carrossel',
    publicadoEm: '2026-10-20T12:00:00Z',
    link: '',
    curtidas: 0,
    comentarios: 0,
    alcance,
    ...extra,
  });

  it('ordena do maior para o menor, sem dado por último, com a razão sobre a mediana', () => {
    const r = rankear([p('a', 100), p('b'), p('c', 300), p('d', 200)], 'alcance');
    expect(r.map((x) => x.post.id)).toEqual(['c', 'd', 'a', 'b']);
    expect(r[0].razao).toBeCloseTo(1.5);
    expect(r[3]).toMatchObject({ valor: undefined, razao: null });
  });

  it('menos de três com dado ou mediana zero: sem razão', () => {
    expect(rankear([p('a', 100), p('b', 50)], 'alcance')[0].razao).toBeNull();
    expect(rankear([p('a', 0), p('b', 0), p('c', 5)], 'alcance')[0].razao).toBeNull();
  });

  it('guardados soma salvos e compartilhamentos', () => {
    const r = rankear([p('a', 1, { salvamentos: 2, compartilhamentos: 3 }), p('b', 1, { salvamentos: 9 })], 'guardados');
    expect(r.map((x) => [x.post.id, x.valor])).toEqual([['b', 9], ['a', 5]]);
  });
});
