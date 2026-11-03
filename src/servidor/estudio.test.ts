import { describe, it, expect } from 'vitest';
import { lerReferencia, gerar, ErroDoEstudio, LIMITE_DIARIO } from './estudio';
import { rotaEstudioReferencia, rotaEstudioGerar } from './rotasEstudio';
import { ArmazemMemoria } from './armazem';
import { cadastrar } from './contas';
import { montarPedido, type Pedido } from '../dominio/estudio';

const CONTA = '17841400224855713';
const DIA = '2026-11-03';

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

const REEL_OK = JSON.stringify({ ganchos: ['a', 'b', 'c'], blocos: [{ fala: 'f', tela: 't' }], cta: 'x' });
const claude = (texto: string) => ({ corpo: { content: [{ type: 'text', text: texto }] } });
const PEDIDO: Pedido = { formato: 'reel', tema: 'honorários', referencias: [] };
const AMBIENTE = { ANTHROPIC_API_KEY: 'sk-teste' };

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

describe('gerar', () => {
  it('sem chave não chama ninguém', async () => {
    const { buscar, chamadas } = falso(() => claude(REEL_OK));
    const erro = await gerar(PEDIDO, null, DIA, 'u1', new ArmazemMemoria(), {}, buscar).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroDoEstudio);
    expect(erro.codigo).toBe('sem-chave');
    expect(chamadas).toHaveLength(0);
  });

  it('chama a Messages API com o pedido montado e devolve o gerado', async () => {
    const { buscar, chamadas } = falso(() => claude(REEL_OK));
    const g = await gerar(PEDIDO, null, DIA, 'u1', new ArmazemMemoria(), AMBIENTE, buscar);
    expect(g.ganchos).toEqual(['a', 'b', 'c']);
    const c = chamadas[0];
    expect(c.url.toString()).toBe('https://api.anthropic.com/v1/messages');
    const cabecalhos = new Headers(c.init?.headers);
    expect(cabecalhos.get('x-api-key')).toBe('sk-teste');
    expect(cabecalhos.get('anthropic-version')).toBe('2023-06-01');
    const corpo = JSON.parse(String(c.init?.body));
    expect(corpo.model).toBe('claude-sonnet-5-5');
    expect(corpo.system).toBe(montarPedido(PEDIDO, null, DIA).sistema);
    expect(corpo.messages[0].content).toBe(montarPedido(PEDIDO, null, DIA).mensagem);
  });

  it('ESTUDIO_MODELO troca o modelo', async () => {
    const { buscar, chamadas } = falso(() => claude(REEL_OK));
    await gerar(PEDIDO, null, DIA, 'u1', new ArmazemMemoria(), { ...AMBIENTE, ESTUDIO_MODELO: 'outro' }, buscar);
    expect(JSON.parse(String(chamadas[0].init?.body)).model).toBe('outro');
  });

  it('JSON inválido na primeira, válido na segunda: sucesso', async () => {
    let n = 0;
    const { buscar, chamadas } = falso(() => claude(n++ === 0 ? 'não sei' : REEL_OK));
    const g = await gerar(PEDIDO, null, DIA, 'u1', new ArmazemMemoria(), AMBIENTE, buscar);
    expect(g.formato).toBe('reel');
    expect(chamadas).toHaveLength(2);
  });

  it('inválido duas vezes ou erro do servidor: ia-falhou', async () => {
    const duas = falso(() => claude('nada'));
    expect((await gerar(PEDIDO, null, DIA, 'u1', new ArmazemMemoria(), AMBIENTE, duas.buscar).catch((e) => e)).codigo).toBe('ia-falhou');
    const quinhentos = falso(() => ({ status: 500, corpo: { error: { message: 'x' } } }));
    expect((await gerar(PEDIDO, null, DIA, 'u1', new ArmazemMemoria(), AMBIENTE, quinhentos.buscar).catch((e) => e)).codigo).toBe('ia-falhou');
  });

  it('a geração além do limite do dia não chama o Claude', async () => {
    const armazem = new ArmazemMemoria();
    await armazem.gravar(`estudio:${DIA}:u1`, String(LIMITE_DIARIO));
    const { buscar, chamadas } = falso(() => claude(REEL_OK));
    const erro = await gerar(PEDIDO, null, DIA, 'u1', armazem, AMBIENTE, buscar).catch((e) => e);
    expect(erro.codigo).toBe('limite-do-dia');
    expect(chamadas).toHaveLength(0);
  });

  it('conta as gerações do dia', async () => {
    const armazem = new ArmazemMemoria();
    const { buscar } = falso(() => claude(REEL_OK));
    await gerar(PEDIDO, null, DIA, 'u1', armazem, AMBIENTE, buscar);
    await gerar(PEDIDO, null, DIA, 'u1', armazem, AMBIENTE, buscar);
    expect(await armazem.ler(`estudio:${DIA}:u1`)).toBe('2');
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
    expect((await rotaEstudioGerar(pedir('/api/instagram-gerar', undefined, PEDIDO), armazem, AMBIENTE)).status).toBe(401);
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

  it('pedido de geração fora da forma: 400', async () => {
    const { armazem, token } = await comSessao();
    const ref = { usuario: 'u', legenda: 'l', formato: 'carrossel', curtidas: 1, comentarios: 1, porQue: 'p' };
    const quatro = { ...PEDIDO, referencias: [ref, ref, ref, ref] };
    expect((await rotaEstudioGerar(pedir('/api/instagram-gerar', token, quatro), armazem, AMBIENTE)).status).toBe(400);
    expect((await rotaEstudioGerar(pedir('/api/instagram-gerar', token, { ...PEDIDO, formato: 'story' }), armazem, AMBIENTE)).status).toBe(400);
    expect((await rotaEstudioGerar(pedir('/api/instagram-gerar', token, { ...PEDIDO, tema: '' }), armazem, AMBIENTE)).status).toBe(400);
  });

  it('gera mesmo sem conseguir ler o Instagram', async () => {
    const { armazem, token } = await comSessao();
    const { buscar } = falso((c) =>
      c.url.hostname === 'api.anthropic.com' ? claude(REEL_OK) : { status: 400, corpo: { error: { message: 'x', code: 1 } } },
    );
    const r = await rotaEstudioGerar(pedir('/api/instagram-gerar', token, PEDIDO), armazem, AMBIENTE, buscar);
    expect(r.status).toBe(200);
    expect((await r.json()).ganchos).toEqual(['a', 'b', 'c']);
  });

  it('sem chave: 503 sem-chave', async () => {
    const { armazem, token } = await comSessao();
    const r = await rotaEstudioGerar(pedir('/api/instagram-gerar', token, PEDIDO), armazem, {});
    expect(r.status).toBe(503);
    expect((await r.json()).erro).toBe('sem-chave');
  });
});

describe('ajuste', () => {
  it('ajuste com anterior fora da forma: 400', async () => {
    const armazem = new ArmazemMemoria();
    const entrada = await cadastrar(armazem, { email: 'eu@exemplo.com', senha: 'uma senha longa' }, { EMAILS_PERMITIDOS: 'eu@exemplo.com' });
    if (!entrada.ok) throw new Error('cadastro');
    const pedido = new Request('https://msl-delta.vercel.app/api/instagram-gerar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${entrada.valor.token}` },
      body: JSON.stringify({ ...PEDIDO, ajuste: { pedido: 'mais curto', anterior: { lixo: true } } }),
    });
    expect((await rotaEstudioGerar(pedido, armazem, AMBIENTE)).status).toBe(400);
  });
});
