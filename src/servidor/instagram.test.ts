import { describe, it, expect } from 'vitest';
import {
  convitePara,
  donoDoEstado,
  guardarCredencial,
  credencialDe,
  definirConta,
  desconectar,
  lerDados,
  dadosComCache,
  InstagramNaoConfigurado,
  ErroDoInstagram,
  TETO_DE_POSTS,
} from './instagram';
import { ArmazemMemoria } from './armazem';

const AMBIENTE = { META_APP_ID: '1619333876341872', META_APP_SECRET: 'segredo', META_CONFIG_ID: '1675370737517616' };
const VOLTA = 'https://msl-delta.vercel.app/api/instagram-callback';
const CONTA = '17841400224855713';
const AGORA = new Date('2026-11-03T18:00:00.000Z');

type Rota = (url: URL) => { status?: number; corpo: unknown } | undefined;

/** Um `fetch` de mentira que responde pela URL e registra o que foi pedido. */
function meta(rota: Rota) {
  const pedidos: URL[] = [];
  const buscar = (async (endereco: string) => {
    const url = new URL(endereco);
    pedidos.push(url);
    const r = rota(url) ?? { status: 404, corpo: { error: { message: 'sem rota', code: 803 } } };
    return new Response(JSON.stringify(r.corpo), {
      status: r.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { buscar, pedidos };
}

const recusa = (code: number) => ({ status: 400, corpo: { error: { message: `recusado ${code}`, code } } });

describe('o convite', () => {
  it('sem as variáveis da Meta, diz o que falta', async () => {
    await expect(
      convitePara(new ArmazemMemoria(), 'u1', VOLTA, { META_APP_ID: 'x' }),
    ).rejects.toBeInstanceOf(InstagramNaoConfigurado);
  });

  it('leva o config_id e um state que aponta para quem pediu, uma vez só', async () => {
    const armazem = new ArmazemMemoria();
    const url = new URL(await convitePara(armazem, 'u1', VOLTA, AMBIENTE));
    expect(url.origin + url.pathname).toBe('https://www.facebook.com/v25.0/dialog/oauth');
    expect(url.searchParams.get('config_id')).toBe('1675370737517616');
    expect(url.searchParams.get('redirect_uri')).toBe(VOLTA);
    expect(url.searchParams.get('response_type')).toBe('code');
    const estado = url.searchParams.get('state')!;
    expect(await donoDoEstado(armazem, estado)).toBe('u1');
    expect(await donoDoEstado(armazem, estado)).toBeNull();
  });
});

describe('a credencial', () => {
  it('troca o código e descobre a conta do Instagram', async () => {
    const armazem = new ArmazemMemoria();
    const { buscar, pedidos } = meta((url) => {
      if (url.pathname.endsWith('/oauth/access_token')) return { corpo: { access_token: 'tk' } };
      if (url.pathname.endsWith('/me/accounts'))
        return { corpo: { data: [{ id: 'pg', instagram_business_account: { id: CONTA } }] } };
    });
    const c = await guardarCredencial(armazem, 'u1', 'codigo', VOLTA, AMBIENTE, buscar, AGORA);
    expect(c).toEqual({ token: 'tk', contaId: CONTA, conectadoEm: AGORA.toISOString() });
    expect(await credencialDe(armazem, 'u1')).toEqual(c);
    const troca = pedidos.find((p) => p.pathname.endsWith('/oauth/access_token'))!;
    expect(troca.searchParams.get('client_secret')).toBe('segredo');
    expect(troca.searchParams.get('code')).toBe('codigo');
  });

  it('sem conta descoberta, guarda o token e deixa a conta para depois', async () => {
    const armazem = new ArmazemMemoria();
    const { buscar } = meta((url) => {
      if (url.pathname.endsWith('/oauth/access_token')) return { corpo: { access_token: 'tk' } };
      if (url.pathname.endsWith('/me/accounts')) return { corpo: { data: [] } };
    });
    const c = await guardarCredencial(armazem, 'u1', 'codigo', VOLTA, AMBIENTE, buscar, AGORA);
    expect(c.contaId).toBeUndefined();
    await definirConta(armazem, 'u1', CONTA);
    expect((await credencialDe(armazem, 'u1'))!.contaId).toBe(CONTA);
  });

  it('desconectar apaga a credencial e o cache', async () => {
    const armazem = new ArmazemMemoria();
    await armazem.gravar('instagram:u1', JSON.stringify({ token: 'tk', contaId: CONTA, conectadoEm: 'x' }));
    await armazem.gravar('instagram-cache:u1', '{}');
    await desconectar(armazem, 'u1');
    expect(await armazem.ler('instagram:u1')).toBeNull();
    expect(await armazem.ler('instagram-cache:u1')).toBeNull();
  });
});

/** Uma conta com `quantos` posts, um por dia a partir de hoje para trás. */
function contaComPosts(quantos: number, extra: Rota = () => undefined) {
  const midias = Array.from({ length: quantos }, (_, i) => ({
    id: `m${i}`,
    caption: `post ${i}`,
    media_type: i === 0 ? 'VIDEO' : 'CAROUSEL_ALBUM',
    media_product_type: i === 0 ? 'REELS' : 'FEED',
    timestamp: new Date(AGORA.getTime() - i * 86_400_000).toISOString().replace('.000Z', '+0000'),
    permalink: `https://www.instagram.com/p/m${i}/`,
    thumbnail_url: i === 0 ? 'https://cdn/thumb0.jpg' : undefined,
    media_url: `https://cdn/m${i}.jpg`,
    like_count: 10,
    comments_count: 2,
  }));
  return meta((url) => {
    const especial = extra(url);
    if (especial) return especial;
    if (url.pathname === `/v25.0/${CONTA}`)
      return { corpo: { username: '_luizpereira_', followers_count: 2242, media_count: quantos } };
    if (url.pathname === `/v25.0/${CONTA}/media`) {
      const depois = Number(url.searchParams.get('after') ?? 0);
      const pagina = midias.slice(depois, depois + 50);
      const proximo = depois + 50 < midias.length
        ? `https://graph.facebook.com/v25.0/${CONTA}/media?after=${depois + 50}`
        : undefined;
      return { corpo: { data: pagina, paging: proximo ? { next: proximo } : {} } };
    }
    const insight = url.pathname.match(/\/v25\.0\/(m\d+)\/insights$/);
    if (insight) {
      const metrica = url.searchParams.get('metric')!;
      if (insight[1] === 'm0' && (metrica === 'profile_visits' || metrica === 'follows')) return recusa(100);
      if (insight[1] !== 'm0' && metrica === 'ig_reels_avg_watch_time') return recusa(100);
      return { corpo: { data: [{ name: metrica, values: [{ value: 7 }] }] } };
    }
  });
}

describe('a leitura', () => {
  it('traz o perfil e mapeia formato e métricas; recusa vira sem dado', async () => {
    const { buscar } = contaComPosts(2);
    const dados = await lerDados('tk', CONTA, AGORA, buscar);
    expect(dados.perfil).toEqual({ usuario: '_luizpereira_', seguidores: 2242, totalDePosts: 2 });
    const [reel, carrossel] = dados.posts;
    expect(reel.formato).toBe('reels');
    expect(reel.miniatura).toBe('https://cdn/thumb0.jpg');
    expect(reel.alcance).toBe(7);
    expect(reel.visitasAoPerfil).toBeUndefined();
    expect(reel.tempoMedioMs).toBe(7);
    expect(carrossel.formato).toBe('carrossel');
    expect(carrossel.visitasAoPerfil).toBe(7);
    expect(carrossel.tempoMedioMs).toBeUndefined();
    expect(dados.lidoEm).toBe(AGORA.toISOString());
  });

  it(`para em ${TETO_DE_POSTS} posts e só pede insights dos últimos 90 dias`, async () => {
    const { buscar, pedidos } = contaComPosts(120);
    const dados = await lerDados('tk', CONTA, AGORA, buscar);
    expect(dados.posts).toHaveLength(TETO_DE_POSTS);
    const comInsights = new Set(
      pedidos.filter((p) => p.pathname.endsWith('/insights')).map((p) => p.pathname.split('/')[2]),
    );
    expect(comInsights.size).toBeLessThanOrEqual(TETO_DE_POSTS);
    expect(comInsights.has('m59')).toBe(true);
  });

  it('post de mais de 90 dias vem sem insights, e nem se pergunta', async () => {
    const { buscar, pedidos } = contaComPosts(1, (url) =>
      url.pathname === `/v25.0/${CONTA}/media`
        ? {
            corpo: {
              data: [{ id: 'velho', caption: 'x', media_type: 'IMAGE', media_product_type: 'FEED',
                timestamp: '2026-06-01T12:00:00+0000', permalink: 'p', like_count: 1, comments_count: 0 }],
            },
          }
        : undefined,
    );
    const dados = await lerDados('tk', CONTA, AGORA, buscar);
    expect(dados.posts[0].formato).toBe('imagem');
    expect(dados.posts[0].alcance).toBeUndefined();
    expect(pedidos.some((p) => p.pathname.includes('/velho/insights'))).toBe(false);
  });

  it('limite de uso da Meta numa métrica derruba a leitura, em vez de virar sem dado e ficar no cache', async () => {
    const { buscar } = contaComPosts(2, (url) =>
      url.pathname.endsWith('/insights') && url.searchParams.get('metric') === 'reach'
        ? { status: 400, corpo: { error: { message: 'limite', code: 4 } } }
        : undefined,
    );
    const erro = await lerDados('tk', CONTA, AGORA, buscar).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroDoInstagram);
    expect(erro.codigo).toBe('meta');
  });

  it('token recusado (190) vira token-recusado com 401', async () => {
    const { buscar } = meta(() => recusa(190));
    const erro = await lerDados('tk', CONTA, AGORA, buscar).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroDoInstagram);
    expect(erro.codigo).toBe('token-recusado');
    expect(erro.estado).toBe(401);
  });

  it('outra falha da Meta é temporária, não perda de acesso', async () => {
    const { buscar } = meta(() => ({ status: 500, corpo: { error: { message: 'fora do ar', code: 2 } } }));
    const erro = await lerDados('tk', CONTA, AGORA, buscar).catch((e) => e);
    expect(erro.codigo).toBe('meta');
    expect(erro.estado).toBe(502);
  });
});

describe('o cache', () => {
  it('duas leituras seguidas falam com a Meta uma vez; atualizar fala de novo', async () => {
    const armazem = new ArmazemMemoria();
    const { buscar, pedidos } = contaComPosts(1);
    const credencial = { token: 'tk', contaId: CONTA, conectadoEm: 'x' };
    await dadosComCache(armazem, 'u1', credencial, false, AGORA, buscar);
    const depoisDaPrimeira = pedidos.length;
    await dadosComCache(armazem, 'u1', credencial, false, AGORA, buscar);
    expect(pedidos.length).toBe(depoisDaPrimeira);
    await dadosComCache(armazem, 'u1', credencial, true, AGORA, buscar);
    expect(pedidos.length).toBe(depoisDaPrimeira * 2);
  });
});
