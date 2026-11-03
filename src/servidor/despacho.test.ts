import { describe, it, expect } from 'vitest';
import { qualRota, despachar } from './despacho';

const ok = (nome: string) => async () => new Response(nome);

describe('qualRota', () => {
  it('lê a rota do caminho público, que a reescrita preserva', () => {
    expect(qualRota(new Request('https://x.app/api/google-callback?code=1'), 'google')).toBe('callback');
    expect(qualRota(new Request('https://x.app/api/instagram-estado'), 'instagram')).toBe('estado');
  });

  it('o endereço sem sufixo é a rota vazia', () => {
    expect(qualRota(new Request('https://x.app/api/instagram?atualizar=1'), 'instagram')).toBe('');
  });

  it('se a reescrita entregar o destino, lê o parâmetro rota', () => {
    expect(qualRota(new Request('https://x.app/api/google?rota=sincronizar'), 'google')).toBe('sincronizar');
  });
});

describe('despachar', () => {
  const tabela = { estado: { GET: ok('estado') }, conectar: { POST: ok('conectar') }, '': { GET: ok('dados') } };

  it('chama a rota certa pelo método certo', async () => {
    const r = await despachar(new Request('https://x.app/api/instagram-conectar', { method: 'POST' }), 'instagram', tabela);
    expect(await r.text()).toBe('conectar');
    const d = await despachar(new Request('https://x.app/api/instagram'), 'instagram', tabela);
    expect(await d.text()).toBe('dados');
  });

  it('método errado é 405, como era quando cada rota tinha a sua função', async () => {
    const r = await despachar(new Request('https://x.app/api/instagram-estado', { method: 'POST' }), 'instagram', tabela);
    expect(r.status).toBe(405);
    expect(r.headers.get('Allow')).toBe('GET');
  });

  it('rota que não existe é 404', async () => {
    const r = await despachar(new Request('https://x.app/api/instagram-inventada'), 'instagram', tabela);
    expect(r.status).toBe(404);
  });
});
