import { describe, it, expect } from 'vitest';
import { lerReferencia } from './estudio';
import { rotaEstudioReferencia } from './rotasEstudio';
import { ArmazemMemoria } from './armazem';
import { cadastrar } from './contas';

const CONTA = '17841400224855713';

interface Chamada {
  url: URL;
  init?: RequestInit;
}

/** Um `fetch` de mentira para a Meta e para o Claude, que registra cada chamada. */
function falso(responder: (c: Chamada) => { status?: number; corpo: unknown }) {
  const chamadas: Chamada[] = [];
  const buscar = (async (endereco: string, init?: RequestInit) => {
    const c = { url: new URL(endereco), init };
    chamadas.push(c);
    const r = responder(c);
    return new Response(JSON.stringify(r.corpo), { status: r.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { buscar, chamadas };
}

const DESCOBERTA = {
  business_discovery: {
    username: 'fulano.adv',
    name: 'Fulano',
    profile_picture_url: 'https://cdn/f.jpg',
    followers_count: 12000,
    media: {
      data: [
        {
          id: 'm1', caption: 'Pare de perder clientes', media_type: 'CAROUSEL_ALBUM', media_product_type: 'FEED',
          timestamp: '2026-10-30T12:00:00+0000', permalink: 'https://www.instagram.com/p/m1/', media_url: 'https://cdn/m1.jpg',
          like_count: 900, comments_count: 80,
        },
        {
          id: 'm2', caption: 'Reel', media_type: 'VIDEO', media_product_type: 'REELS',
          timestamp: '2026-10-29T12:00:00+0000', permalink: 'https://www.instagram.com/reel/m2/', thumbnail_url: 'https://cdn/m2.jpg',
          like_count: 300, comments_count: 10,
        },
      ],
    },
  },
};

describe('lerReferencia', () => {
  it('lê o perfil pela business_discovery e guarda em cache', async () => {
    const armazem = new ArmazemMemoria();
    const { buscar, chamadas } = falso(() => ({ corpo: DESCOBERTA }));
    const perfil = await lerReferencia('tk', CONTA, 'fulano.adv', armazem, buscar);
    expect(perfil).toMatchObject({ usuario: 'fulano.adv', nome: 'Fulano', seguidores: 12000 });
    expect(perfil.posts).toHaveLength(2);
    expect(perfil.posts[0]).toMatchObject({ id: 'm1', formato: 'carrossel', curtidas: 900, comentarios: 80, miniatura: 'https://cdn/m1.jpg' });
    expect(perfil.posts[1]).toMatchObject({ formato: 'reels', miniatura: 'https://cdn/m2.jpg' });
    expect(chamadas[0].url.pathname).toBe(`/v25.0/${CONTA}`);
    expect(chamadas[0].url.searchParams.get('fields')).toContain('business_discovery.username(fulano.adv)');
    await lerReferencia('tk', CONTA, 'fulano.adv', armazem, buscar);
    expect(chamadas).toHaveLength(1);
  });

  it('erros da Meta viram códigos do Estúdio', async () => {
    const caso = async (corpo: unknown, status = 400) => {
      const { buscar } = falso(() => ({ status, corpo }));
      return lerReferencia('tk', CONTA, 'x', new ArmazemMemoria(), buscar).catch((e) => e);
    };
    expect((await caso({ error: { message: 'Invalid user id', code: 110 } })).codigo).toBe('perfil-nao-encontrado');
    expect((await caso({ error: { message: 'Cannot find User', code: 100 } })).codigo).toBe('perfil-nao-encontrado');
    expect((await caso({ error: { message: 'no permission', code: 10 } })).codigo).toBe('permissao-faltando');
    expect((await caso({ error: { message: 'no permission', code: 200 } })).codigo).toBe('permissao-faltando');
    expect((await caso({ id: CONTA }, 200)).codigo).toBe('perfil-nao-profissional');
  });
});

describe('rotas do Estúdio', () => {
  const BASE = 'https://msl-delta.vercel.app';
  async function comSessao() {
    const armazem = new ArmazemMemoria();
    const entrada = await cadastrar(armazem, { email: 'eu@exemplo.com', senha: 'uma senha longa' }, { EMAILS_PERMITIDOS: 'eu@exemplo.com' });
    if (!entrada.ok) throw new Error('cadastro');
    await armazem.gravar(
      `instagram:${entrada.valor.usuario.id}`,
      JSON.stringify({ token: 'tk', contaId: CONTA, conectadoEm: '2026-11-03T12:00:00.000Z' }),
    );
    return { armazem, token: entrada.valor.token };
  }
  const pedir = (caminho: string, token?: string, corpo?: unknown, metodo = 'POST') =>
    new Request(`${BASE}${caminho}`, {
      method: metodo,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });

  it('sem sessão: 401', async () => {
    const armazem = new ArmazemMemoria();
    expect((await rotaEstudioReferencia(pedir('/api/instagram-referencia?usuario=x', undefined, undefined, 'GET'), armazem)).status).toBe(401);
  });

  it('@ inválido: 400 pedido-invalido', async () => {
    const { armazem, token } = await comSessao();
    const r = await rotaEstudioReferencia(pedir('/api/instagram-referencia?usuario=a%20b', token, undefined, 'GET'), armazem);
    expect(r.status).toBe(400);
    expect((await r.json()).erro).toBe('pedido-invalido');
  });

  it('referência válida devolve o perfil', async () => {
    const { armazem, token } = await comSessao();
    const { buscar } = falso(() => ({ corpo: DESCOBERTA }));
    const r = await rotaEstudioReferencia(pedir('/api/instagram-referencia?usuario=@Fulano.Adv', token, undefined, 'GET'), armazem, buscar);
    expect(r.status).toBe(200);
    expect((await r.json()).usuario).toBe('fulano.adv');
  });

});
