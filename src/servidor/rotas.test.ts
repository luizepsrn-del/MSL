import { describe, it, expect } from 'vitest';
import { ArmazemMemoria } from './armazem';
import { rotaCadastro, rotaEntrar, rotaSair, rotaSessoes, rotaSincronizar } from './rotas';
import { bancoVazio, type Banco, type Tarefa } from '../dados/esquema';

const AMBIENTE = { EMAILS_PERMITIDOS: 'dono@exemplo.com' };
const SENHA = 'uma senha bem comprida';

const post = (corpo: unknown, token?: string) =>
  new Request('https://exemplo.com/api', {
    method: 'POST',
    body: JSON.stringify(corpo),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

function tarefa(id: string, extras: Partial<Tarefa> = {}): Tarefa {
  return {
    id,
    criadoEm: '2026-09-01T09:00:00.000Z',
    alteradoEm: '2026-09-01T09:00:00.000Z',
    titulo: `Tarefa ${id}`,
    contexto: 'pessoal',
    ...extras,
  };
}

const comTarefas = (...tarefas: Tarefa[]): Banco => ({ ...bancoVazio(), tarefas });

async function comSessao() {
  const armazem = new ArmazemMemoria();
  const resposta = await rotaCadastro(
    post({ email: 'dono@exemplo.com', senha: SENHA, aparelho: 'Mac' }),
    armazem,
    AMBIENTE,
  );
  const { token, usuario } = (await resposta.json()) as {
    token: string;
    usuario: { id: string };
  };
  return { armazem, token, usuario };
}

describe('cadastro pela rota', () => {
  it('devolve 201 com sessão', async () => {
    const r = await rotaCadastro(post({ email: 'dono@exemplo.com', senha: SENHA }), new ArmazemMemoria(), AMBIENTE);
    expect(r.status).toBe(201);
    const corpo = (await r.json()) as { token: string };
    expect(corpo.token.length).toBeGreaterThan(20);
  });

  it('e-mail fora da lista dá 403 com mensagem em português', async () => {
    const r = await rotaCadastro(post({ email: 'outro@exemplo.com', senha: SENHA }), new ArmazemMemoria(), AMBIENTE);
    expect(r.status).toBe(403);
    expect((await r.json()).mensagem).toContain('não aceita cadastro');
  });

  it('senha curta dá 400', async () => {
    const r = await rotaCadastro(post({ email: 'dono@exemplo.com', senha: 'curta' }), new ArmazemMemoria(), AMBIENTE);
    expect(r.status).toBe(400);
  });

  it('corpo sem nada não estoura', async () => {
    const r = await rotaCadastro(post({}), new ArmazemMemoria(), AMBIENTE);
    expect(r.status).toBe(400);
  });

  it('corpo que não é JSON não estoura', async () => {
    const pedido = new Request('https://exemplo.com/api', { method: 'POST', body: 'nada disso' });
    const r = await rotaCadastro(pedido, new ArmazemMemoria(), AMBIENTE);
    expect(r.status).toBe(400);
  });

  it('método errado dá 405', async () => {
    const r = await rotaCadastro(new Request('https://exemplo.com/api'), new ArmazemMemoria(), AMBIENTE);
    expect(r.status).toBe(405);
  });
});

describe('entrar pela rota', () => {
  it('senha certa devolve 200 e sessão nova', async () => {
    const { armazem, token } = await comSessao();
    const r = await rotaEntrar(post({ email: 'dono@exemplo.com', senha: SENHA }), armazem);
    expect(r.status).toBe(200);
    expect((await r.json()).token).not.toBe(token);
  });

  it('senha errada dá 401 sem dizer o que estava errado', async () => {
    const { armazem } = await comSessao();
    const r = await rotaEntrar(post({ email: 'dono@exemplo.com', senha: 'outra' }), armazem);
    expect(r.status).toBe(401);
    const mensagem = (await r.json()).mensagem as string;
    expect(mensagem).toContain('não conferem');
    // Nem "e-mail não existe", nem "senha errada": a diferença entregaria
    // quais e-mails têm conta aqui.
    expect(mensagem).not.toMatch(/não existe|não cadastrad/i);
  });

  it('conta inexistente dá exatamente a mesma resposta', async () => {
    const inexistente = await rotaEntrar(
      post({ email: 'ninguem@exemplo.com', senha: SENHA }),
      new ArmazemMemoria(),
    );
    const { armazem } = await comSessao();
    const errada = await rotaEntrar(post({ email: 'dono@exemplo.com', senha: 'x' }), armazem);
    expect(inexistente.status).toBe(errada.status);
    expect(await inexistente.json()).toEqual(await errada.json());
  });
});

describe('sair e sessões', () => {
  it('sair encerra e a sessão deixa de valer', async () => {
    const { armazem, token } = await comSessao();
    expect((await rotaSair(post({}, token), armazem)).status).toBe(204);
    expect((await rotaSessoes(new Request('https://x/api', { headers: { Authorization: `Bearer ${token}` } }), armazem)).status).toBe(401);
  });

  it('sair sem token não é erro', async () => {
    const { armazem } = await comSessao();
    expect((await rotaSair(post({}), armazem)).status).toBe(204);
  });

  it('a lista mostra os aparelhos e marca o atual', async () => {
    const { armazem, token } = await comSessao();
    await rotaEntrar(post({ email: 'dono@exemplo.com', senha: SENHA, aparelho: 'iPhone' }), armazem);

    const r = await rotaSessoes(
      new Request('https://x/api', { headers: { Authorization: `Bearer ${token}` } }),
      armazem,
    );
    const { sessoes } = (await r.json()) as { sessoes: { aparelho: string; atual: boolean }[] };
    expect(sessoes).toHaveLength(2);
    expect(sessoes.filter((s) => s.atual)).toHaveLength(1);
    expect(sessoes.map((s) => s.aparelho)).toContain('iPhone');
  });

  it('revogar derruba o outro aparelho', async () => {
    const { armazem, token } = await comSessao();
    const outra = await rotaEntrar(post({ email: 'dono@exemplo.com', senha: SENHA }), armazem);
    const alvo = (await outra.json()).token as string;

    const r = await rotaSessoes(
      new Request('https://x/api', {
        method: 'DELETE',
        body: JSON.stringify({ token: alvo }),
        headers: { Authorization: `Bearer ${token}` },
      }),
      armazem,
    );
    expect(r.status).toBe(204);

    const depois = await rotaSincronizar(post({ banco: bancoVazio() }, alvo), armazem);
    expect(depois.status).toBe(401);
  });

  it('sem token, 401', async () => {
    const { armazem } = await comSessao();
    expect((await rotaSessoes(new Request('https://x/api'), armazem)).status).toBe(401);
  });
});

describe('sincronizar', () => {
  it('sem sessão, 401 — e nada é gravado', async () => {
    const armazem = new ArmazemMemoria();
    const r = await rotaSincronizar(post({ banco: comTarefas(tarefa('a')) }), armazem);
    expect(r.status).toBe(401);
    expect(await armazem.listar('banco:')).toEqual([]);
  });

  it('a primeira sincronização guarda o que o aparelho mandou', async () => {
    const { armazem, token } = await comSessao();
    const r = await rotaSincronizar(post({ banco: comTarefas(tarefa('a')) }, token), armazem);
    expect(r.status).toBe(200);
    const { banco } = (await r.json()) as { banco: Banco };
    expect(banco.tarefas.map((t) => t.id)).toEqual(['a']);
  });

  it('o segundo aparelho recebe o que o primeiro mandou, e vice-versa', async () => {
    const { armazem, token } = await comSessao();
    await rotaSincronizar(post({ banco: comTarefas(tarefa('do-mac')) }, token), armazem);

    const r = await rotaSincronizar(post({ banco: comTarefas(tarefa('do-telefone')) }, token), armazem);
    const { banco } = (await r.json()) as { banco: Banco };
    expect(banco.tarefas.map((t) => t.id).sort()).toEqual(['do-mac', 'do-telefone']);
  });

  it('o que foi concluído sem sinal não é desfeito pelo outro aparelho', async () => {
    // O caso que condena "o banco inteiro mais novo vence".
    const { armazem, token } = await comSessao();
    await rotaSincronizar(post({ banco: comTarefas(tarefa('a')) }, token), armazem);

    const doTelefone = comTarefas(
      tarefa('a', { concluidaEm: '2026-09-10T18:00:00.000Z', alteradoEm: '2026-09-10T18:00:00.000Z' }),
    );
    await rotaSincronizar(post({ banco: doTelefone }, token), armazem);

    // O Mac, atrasado, manda a versão antiga.
    const r = await rotaSincronizar(post({ banco: comTarefas(tarefa('a')) }, token), armazem);
    const { banco } = (await r.json()) as { banco: Banco };
    expect(banco.tarefas[0].concluidaEm).toBe('2026-09-10T18:00:00.000Z');
  });

  it('sincronizar duas vezes seguidas dá o mesmo banco', async () => {
    const { armazem, token } = await comSessao();
    const primeira = await rotaSincronizar(post({ banco: comTarefas(tarefa('a')) }, token), armazem);
    const uma = ((await primeira.json()) as { banco: Banco }).banco;

    const segunda = await rotaSincronizar(post({ banco: uma }, token), armazem);
    expect(((await segunda.json()) as { banco: Banco }).banco).toEqual(uma);
  });

  it('um aparelho de esquema antigo é migrado, não recusado', async () => {
    // Quem ficou uma versão para trás não pode gravar formato velho por cima
    // do banco, nem ser barrado de sincronizar.
    const { armazem, token } = await comSessao();
    const antigo = { versao: 1, rotinas: [], execucoes: [], tarefas: [tarefa('a')] };
    const r = await rotaSincronizar(post({ banco: antigo }, token), armazem);
    expect(r.status).toBe(200);
    const { banco } = (await r.json()) as { banco: Banco };
    expect(banco.versao).toBeGreaterThan(1);
    expect(banco.tarefas.map((t) => t.id)).toEqual(['a']);
  });

  it('banco ilegível dá 400 e não estraga o que estava guardado', async () => {
    const { armazem, token } = await comSessao();
    await rotaSincronizar(post({ banco: comTarefas(tarefa('a')) }, token), armazem);

    const r = await rotaSincronizar(post({ banco: 'isto não é um banco' }, token), armazem);
    expect(r.status).toBe(400);

    const depois = await rotaSincronizar(post({ banco: bancoVazio() }, token), armazem);
    expect(((await depois.json()) as { banco: Banco }).banco.tarefas).toHaveLength(1);
  });

  it('o apagado de um aparelho não volta pelo outro', async () => {
    const { armazem, token } = await comSessao();
    await rotaSincronizar(post({ banco: comTarefas(tarefa('a')) }, token), armazem);

    const apagou: Banco = {
      ...bancoVazio(),
      removidos: [{ colecao: 'tarefas', id: 'a', em: '2026-09-12T00:00:00.000Z' }],
    };
    await rotaSincronizar(post({ banco: apagou }, token), armazem);

    // O aparelho que não soube da remoção manda a tarefa de novo.
    const r = await rotaSincronizar(post({ banco: comTarefas(tarefa('a')) }, token), armazem);
    expect(((await r.json()) as { banco: Banco }).banco.tarefas).toEqual([]);
  });

  it('quando outro aparelho passa na frente o tempo todo, responde 409 em vez de pendurar', async () => {
    const { armazem, token } = await comSessao();
    // Um armazém que nunca deixa a gravação condicional passar.
    const teimoso = {
      ...armazem,
      ler: (c: string) => armazem.ler(c),
      gravar: (c: string, v: string, s?: number) => armazem.gravar(c, v, s),
      apagar: (c: string) => armazem.apagar(c),
      listar: (p: string) => armazem.listar(p),
      gravarSeIgual: async () => false,
    };
    const r = await rotaSincronizar(post({ banco: bancoVazio() }, token), teimoso);
    expect(r.status).toBe(409);
  });
});
