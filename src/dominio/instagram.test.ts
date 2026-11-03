import { describe, it, expect } from 'vitest';
import {
  dividirPorPeriodo,
  resumir,
  porFormato,
  recomendar,
  LIMITE_DE_RECOMENDACOES,
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
