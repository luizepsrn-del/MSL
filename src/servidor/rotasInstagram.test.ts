import { describe, it, expect } from 'vitest';
import {
  rotaInstagramConectar,
  rotaInstagramCallback,
  rotaInstagramEstado,
  rotaInstagram,
  rotaInstagramConta,
  rotaInstagramDesconectar,
} from './rotasInstagram';
import { ArmazemMemoria } from './armazem';
import { cadastrar } from './contas';
import { convitePara } from './instagram';

const AMBIENTE = {
  EMAILS_PERMITIDOS: 'eu@exemplo.com',
  META_APP_ID: '1619333876341872',
  META_APP_SECRET: 'segredo',
  META_CONFIG_ID: '1675370737517616',
};
const BASE = 'https://msl-delta.vercel.app';
const CONTA = '17841400224855713';
const AGORA = () => new Date('2026-11-03T18:00:00.000Z');

async function comSessao() {
  const armazem = new ArmazemMemoria();
  const entrada = await cadastrar(armazem, { email: 'eu@exemplo.com', senha: 'uma senha longa' }, AMBIENTE);
  if (!entrada.ok) throw new Error('não deu para cadastrar');
  return { armazem, token: entrada.valor.token, usuarioId: entrada.valor.usuario.id };
}

async function jaConectado(armazem: ArmazemMemoria, usuarioId: string, contaId: string | null = CONTA) {
  await armazem.gravar(
    `instagram:${usuarioId}`,
    JSON.stringify({ token: 'tk', ...(contaId ? { contaId } : {}), conectadoEm: '2026-11-03T12:00:00.000Z' }),
  );
}

const pedir = (caminho: string, token?: string, corpo?: unknown, metodo = 'POST') =>
  new Request(`${BASE}${caminho}`, {
    method: metodo,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

const volta = (busca: string) => new Request(`${BASE}/api/instagram-callback?${busca}`, { method: 'GET' });

/** A Meta de mentira: responde pelo caminho e conta as chamadas. */
function meta(resposta: (url: URL) => { status?: number; corpo: unknown }) {
  const pedidos: URL[] = [];
  const buscar = (async (endereco: string) => {
    const url = new URL(endereco);
    pedidos.push(url);
    const r = resposta(url);
    return new Response(JSON.stringify(r.corpo), { status: r.status ?? 200 });
  }) as unknown as typeof fetch;
  return { buscar, pedidos };
}

const metaQueFunciona = () =>
  meta((url) => {
    if (url.pathname.endsWith('/oauth/access_token')) return { corpo: { access_token: 'novo' } };
    if (url.pathname.endsWith('/me/accounts'))
      return { corpo: { data: [{ instagram_business_account: { id: CONTA } }] } };
    if (url.pathname.endsWith('/media')) return { corpo: { data: [] } };
    return { corpo: { username: '_luizpereira_', followers_count: 2242, media_count: 0 } };
  });

describe('conectar', () => {
  it('sem sessão, 401', async () => {
    const { armazem } = await comSessao();
    const r = await rotaInstagramConectar(pedir('/api/instagram-conectar'), armazem, AMBIENTE);
    expect(r.status).toBe(401);
  });

  it('com sessão, devolve o convite com o config_id e a volta certa', async () => {
    const { armazem, token } = await comSessao();
    const r = await rotaInstagramConectar(pedir('/api/instagram-conectar', token), armazem, AMBIENTE);
    expect(r.status).toBe(200);
    const url = new URL(((await r.json()) as { url: string }).url);
    expect(url.searchParams.get('config_id')).toBe('1675370737517616');
    expect(url.searchParams.get('redirect_uri')).toBe(`${BASE}/api/instagram-callback`);
  });

  it('sem as variáveis da Meta, 500 e diz quais', async () => {
    const { armazem, token } = await comSessao();
    const r = await rotaInstagramConectar(pedir('/api/instagram-conectar', token), armazem, {});
    expect(r.status).toBe(500);
    expect(((await r.json()) as { erro: string }).erro).toBe('instagram-nao-configurado');
  });
});

describe('a volta da Meta', () => {
  it('state desconhecido: recusa e não grava nada', async () => {
    const { armazem, usuarioId } = await comSessao();
    const r = await rotaInstagramCallback(volta('code=c&state=inventado'), armazem, AMBIENTE, metaQueFunciona().buscar);
    expect(r.status).toBe(400);
    expect(r.headers.get('Content-Type')).toMatch(/text\/html/);
    expect(await armazem.ler(`instagram:${usuarioId}`)).toBeNull();
  });

  it('state já gasto: a segunda volta é recusada', async () => {
    const { armazem, usuarioId } = await comSessao();
    const estado = new URL(await convitePara(armazem, usuarioId, `${BASE}/api/instagram-callback`, AMBIENTE)).searchParams.get('state');
    const { buscar } = metaQueFunciona();
    expect((await rotaInstagramCallback(volta(`code=c&state=${estado}`), armazem, AMBIENTE, buscar)).status).toBe(200);
    expect((await rotaInstagramCallback(volta(`code=c&state=${estado}`), armazem, AMBIENTE, buscar)).status).toBe(400);
  });

  it('autorização negada: diz que não foi autorizado', async () => {
    const { armazem } = await comSessao();
    const r = await rotaInstagramCallback(volta('error=access_denied'), armazem, AMBIENTE);
    expect(r.status).toBe(400);
    expect(await r.text()).toMatch(/não autorizou/);
  });

  it('volta válida: guarda a credencial com a conta', async () => {
    const { armazem, usuarioId } = await comSessao();
    const estado = new URL(await convitePara(armazem, usuarioId, `${BASE}/api/instagram-callback`, AMBIENTE)).searchParams.get('state');
    const r = await rotaInstagramCallback(volta(`code=c&state=${estado}`), armazem, AMBIENTE, metaQueFunciona().buscar);
    expect(r.status).toBe(200);
    expect(JSON.parse((await armazem.ler(`instagram:${usuarioId}`))!).contaId).toBe(CONTA);
  });
});

describe('estado e leitura', () => {
  it('estado diz se está conectado e qual conta', async () => {
    const { armazem, token, usuarioId } = await comSessao();
    const antes = await rotaInstagramEstado(pedir('/api/instagram-estado', token, undefined, 'GET'), armazem);
    expect(await antes.json()).toEqual({ conectado: false, conectadoEm: null, contaId: null });
    await jaConectado(armazem, usuarioId);
    const depois = await rotaInstagramEstado(pedir('/api/instagram-estado', token, undefined, 'GET'), armazem);
    expect(((await depois.json()) as { contaId: string }).contaId).toBe(CONTA);
  });

  it('sem credencial: 409 nao-conectado', async () => {
    const { armazem, token } = await comSessao();
    const r = await rotaInstagram(pedir('/api/instagram', token, undefined, 'GET'), armazem, metaQueFunciona().buscar, AGORA);
    expect(r.status).toBe(409);
    expect(((await r.json()) as { erro: string }).erro).toBe('nao-conectado');
  });

  it('sem conta: 409 sem-conta', async () => {
    const { armazem, token, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId, null);
    const r = await rotaInstagram(pedir('/api/instagram', token, undefined, 'GET'), armazem, metaQueFunciona().buscar, AGORA);
    expect(((await r.json()) as { erro: string }).erro).toBe('sem-conta');
  });

  it('Meta com 190: 401 token-recusado', async () => {
    const { armazem, token, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId);
    const { buscar } = meta(() => ({ status: 400, corpo: { error: { message: 'expirou', code: 190 } } }));
    const r = await rotaInstagram(pedir('/api/instagram', token, undefined, 'GET'), armazem, buscar, AGORA);
    expect(r.status).toBe(401);
    expect(((await r.json()) as { erro: string }).erro).toBe('token-recusado');
  });

  it('Meta fora do ar: 502 meta, e a conexão continua', async () => {
    const { armazem, token, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId);
    const { buscar } = meta(() => ({ status: 500, corpo: { error: { message: 'x', code: 2 } } }));
    const r = await rotaInstagram(pedir('/api/instagram', token, undefined, 'GET'), armazem, buscar, AGORA);
    expect(r.status).toBe(502);
    expect(((await r.json()) as { erro: string }).erro).toBe('meta');
    expect(await armazem.ler(`instagram:${usuarioId}`)).not.toBeNull();
  });

  it('conectado: devolve perfil e posts, e ?atualizar=1 passa por cima do cache', async () => {
    const { armazem, token, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId);
    const { buscar, pedidos } = metaQueFunciona();
    const r = await rotaInstagram(pedir('/api/instagram', token, undefined, 'GET'), armazem, buscar, AGORA);
    expect(r.status).toBe(200);
    expect(((await r.json()) as { perfil: { usuario: string } }).perfil.usuario).toBe('_luizpereira_');
    const n = pedidos.length;
    await rotaInstagram(pedir('/api/instagram', token, undefined, 'GET'), armazem, buscar, AGORA);
    expect(pedidos.length).toBe(n);
    await rotaInstagram(pedir('/api/instagram?atualizar=1', token, undefined, 'GET'), armazem, buscar, AGORA);
    expect(pedidos.length).toBeGreaterThan(n);
  });
});

describe('a conta informada na mão', () => {
  it('recusa o que não é um ID', async () => {
    const { armazem, token, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId, null);
    const r = await rotaInstagramConta(pedir('/api/instagram-conta', token, { contaId: 'abc' }), armazem);
    expect(r.status).toBe(400);
    expect(((await r.json()) as { erro: string }).erro).toBe('conta-invalida');
  });

  it('aceita o ID, e a próxima leitura usa ele', async () => {
    const { armazem, token, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId, null);
    const r = await rotaInstagramConta(pedir('/api/instagram-conta', token, { contaId: CONTA }), armazem);
    expect(r.status).toBe(200);
    const { buscar, pedidos } = metaQueFunciona();
    await rotaInstagram(pedir('/api/instagram', token, undefined, 'GET'), armazem, buscar, AGORA);
    expect(pedidos.some((p) => p.pathname.endsWith(`/${CONTA}`))).toBe(true);
  });

  it('sem conexão, 409', async () => {
    const { armazem, token } = await comSessao();
    const r = await rotaInstagramConta(pedir('/api/instagram-conta', token, { contaId: CONTA }), armazem);
    expect(r.status).toBe(409);
  });
});

describe('desconectar', () => {
  it('apaga credencial e cache', async () => {
    const { armazem, token, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId);
    await armazem.gravar(`instagram-cache:${usuarioId}`, '{}');
    const r = await rotaInstagramDesconectar(pedir('/api/instagram-desconectar', token), armazem);
    expect(await r.json()).toEqual({ conectado: false });
    expect(await armazem.ler(`instagram:${usuarioId}`)).toBeNull();
    expect(await armazem.ler(`instagram-cache:${usuarioId}`)).toBeNull();
  });
});
