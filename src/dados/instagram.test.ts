import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  falarComInstagram,
  situacaoDoErro,
  ErroDoInstagramNoCliente,
  METODO_INSTAGRAM,
  dadosValidos,
  situacaoDaConexao,
} from './instagram';

const erro = (estado: number, codigo?: string) => new ErroDoInstagramNoCliente('x', estado, codigo);

describe('situacaoDoErro', () => {
  it('separa o que pede conexão, o que pede conta e o que pede reconexão', () => {
    expect(situacaoDoErro(erro(409, 'nao-conectado'))).toBe('desconectado');
    expect(situacaoDoErro(erro(409, 'sem-conta'))).toBe('sem-conta');
    expect(situacaoDoErro(erro(401, 'token-recusado'))).toBe('acesso-perdido');
  });

  it('a sessão do MSL caída não é o Instagram caído', () => {
    // Reconectar a Meta não resolve uma sessão vencida do próprio MSL.
    expect(situacaoDoErro(erro(401, 'sessao-invalida'))).toBe('erro');
  });

  it('falha da Meta ou da rede é só erro, e a conexão continua', () => {
    expect(situacaoDoErro(erro(502, 'meta'))).toBe('erro');
    expect(situacaoDoErro(new Error('rede'))).toBe('erro');
  });
});

describe('falarComInstagram', () => {
  const original = globalThis.window;
  afterEach(() => {
    globalThis.window = original;
  });

  it('as rotas de leitura vão por GET, sem corpo, com a sessão', async () => {
    globalThis.window = { localStorage: { getItem: () => 'sessao-1' } } as unknown as typeof window;
    const vistos: { url: string; init: RequestInit }[] = [];
    const buscar = (async (url: string, init: RequestInit) => {
      vistos.push({ url, init });
      return new Response(JSON.stringify({ conectado: true }), { status: 200 });
    }) as unknown as typeof fetch;

    await falarComInstagram('/api/instagram?atualizar=1', undefined, buscar);
    expect(vistos[0].init.method).toBe('GET');
    expect(vistos[0].init.body).toBeUndefined();
    expect((vistos[0].init.headers as Record<string, string>).Authorization).toBe('Bearer sessao-1');
  });

  it('erro da rota vira ErroDoInstagramNoCliente com estado e código', async () => {
    globalThis.window = { localStorage: { getItem: () => null } } as unknown as typeof window;
    const buscar = (async () =>
      new Response(JSON.stringify({ erro: 'token-recusado', mensagem: 'caiu' }), { status: 401 })) as unknown as typeof fetch;
    const e = (await falarComInstagram('/api/instagram', undefined, buscar).catch((x) => x)) as ErroDoInstagramNoCliente;
    expect(e).toBeInstanceOf(ErroDoInstagramNoCliente);
    expect(e.estado).toBe(401);
    expect(e.codigo).toBe('token-recusado');
  });

  it('resposta que não é JSON (a página do app, por exemplo) é erro, não dado vazio', async () => {
    globalThis.window = { localStorage: { getItem: () => null } } as unknown as typeof window;
    const buscar = (async () =>
      new Response('<!doctype html><html></html>', { status: 200, headers: { 'Content-Type': 'text/html' } })) as unknown as typeof fetch;
    const e = (await falarComInstagram('/api/instagram', undefined, buscar).catch((x) => x)) as ErroDoInstagramNoCliente;
    expect(e).toBeInstanceOf(ErroDoInstagramNoCliente);
    expect(e.codigo).toBe('resposta-invalida');
    expect(situacaoDoErro(e)).toBe('erro');
  });

  it('JSON sem perfil nem posts também não passa por dado', () => {
    expect(dadosValidos({})).toBe(false);
    expect(dadosValidos({ perfil: { usuario: 'x', seguidores: 1, totalDePosts: 1 }, posts: [], lidoEm: 'x' })).toBe(true);
  });

  it('a tabela de métodos bate com as funções em api/', () => {
    expect(METODO_INSTAGRAM).toEqual({
      '/api/instagram': 'GET',
      '/api/instagram-estado': 'GET',
      '/api/instagram-conectar': 'POST',
      '/api/instagram-conta': 'POST',
      '/api/instagram-desconectar': 'POST',
      '/api/instagram-referencia': 'GET',
    });
  });
});

describe('situacaoDaConexao', () => {
  it('lê o estado sem ir à Meta', () => {
    expect(situacaoDaConexao({ conectado: false, contaId: null })).toBe('desconectado');
    expect(situacaoDaConexao({ conectado: true, contaId: null })).toBe('sem-conta');
    expect(situacaoDaConexao({ conectado: true, contaId: '17841400224855713' })).toBe('pronto');
  });
});

describe('o método de cada rota', () => {
  it('bate com a tabela da função da Vercel', () => {
    const fonte = readFileSync('api/instagram.ts', 'utf8');
    for (const [caminho, metodo] of Object.entries(METODO_INSTAGRAM)) {
      const nome = caminho === '/api/instagram' ? "''" : caminho.replace('/api/instagram-', '');
      expect(fonte, caminho).toContain(`${nome}: { ${metodo}:`);
    }
  });
});
