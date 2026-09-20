import { describe, it, expect } from 'vitest';
import { ClienteSincronia, ErroDaSincronia, nomeDoAparelho, type Guarda } from './sincronia';
import { bancoVazio, type Banco, type Tarefa } from './esquema';

class GuardaMemoria implements Guarda {
  dados = new Map<string, string>();
  getItem(c: string) {
    return this.dados.get(c) ?? null;
  }
  setItem(c: string, v: string) {
    this.dados.set(c, v);
  }
  removeItem(c: string) {
    this.dados.delete(c);
  }
}

const CONTA = { id: 'u1', email: 'dono@exemplo.com', criadoEm: '2026-09-01T00:00:00.000Z' };

/** Um `fetch` de mentira que anota o que recebeu. */
function fingir(respostas: (() => Response)[] | (() => Response)) {
  const chamadas: { url: string; opcoes: RequestInit }[] = [];
  let i = 0;
  const buscar = (async (url: string, opcoes: RequestInit = {}) => {
    chamadas.push({ url, opcoes });
    const proxima = Array.isArray(respostas) ? respostas[Math.min(i++, respostas.length - 1)] : respostas;
    return proxima();
  }) as unknown as typeof fetch;
  return { buscar, chamadas };
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

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

describe('entrar e sair', () => {
  it('entrar guarda o token e a conta', async () => {
    const guarda = new GuardaMemoria();
    const { buscar } = fingir(() => json({ token: 'abc123', usuario: CONTA }));
    const cliente = new ClienteSincronia(guarda, buscar);

    expect(await cliente.entrar('dono@exemplo.com', 'uma senha comprida')).toEqual(CONTA);
    expect(cliente.token).toBe('abc123');
    expect(cliente.conta).toEqual(CONTA);
  });

  it('o token vai no cabeçalho, nunca no endereço', async () => {
    // Endereço vai parar em registro de servidor e em histórico de navegador.
    const guarda = new GuardaMemoria();
    guarda.setItem('msl-sessao', 'abc123');
    const { buscar, chamadas } = fingir(() => json({ sessoes: [] }));

    await new ClienteSincronia(guarda, buscar).sessoes();
    expect(chamadas[0].url).not.toContain('abc123');
    expect((chamadas[0].opcoes.headers as Record<string, string>).Authorization).toBe('Bearer abc123');
  });

  it('a senha errada vira a mensagem do servidor', async () => {
    const { buscar } = fingir(() => json({ mensagem: 'E-mail ou senha não conferem.' }, 401));
    const cliente = new ClienteSincronia(new GuardaMemoria(), buscar);
    await expect(cliente.entrar('dono@exemplo.com', 'errada')).rejects.toThrow('sessão terminou');
  });

  it('sair esquece tudo mesmo se o servidor não responder', async () => {
    const guarda = new GuardaMemoria();
    guarda.setItem('msl-sessao', 'abc');
    guarda.setItem('msl-conta', JSON.stringify(CONTA));
    const buscar = (async () => {
      throw new Error('rede caiu');
    }) as unknown as typeof fetch;

    await new ClienteSincronia(guarda, buscar).sair();
    expect(guarda.getItem('msl-sessao')).toBeNull();
    expect(guarda.getItem('msl-conta')).toBeNull();
  });

  it('conta guardada ilegível não derruba a tela', async () => {
    const guarda = new GuardaMemoria();
    guarda.setItem('msl-conta', 'isto não é json');
    expect(new ClienteSincronia(guarda).conta).toBeNull();
  });
});

describe('sincronizar', () => {
  const comTarefa: Banco = { ...bancoVazio(), tarefas: [tarefa('a')] };

  it('sem conta, devolve nulo e não chama o servidor', async () => {
    // Não é erro: é o estado normal de quem nunca entrou.
    const { buscar, chamadas } = fingir(() => json({}));
    const cliente = new ClienteSincronia(new GuardaMemoria(), buscar);
    expect(await cliente.sincronizar(comTarefa)).toBeNull();
    expect(chamadas).toHaveLength(0);
  });

  it('manda o banco e devolve o que voltou junto', async () => {
    const guarda = new GuardaMemoria();
    guarda.setItem('msl-sessao', 'abc');
    const devolvido: Banco = { ...bancoVazio(), tarefas: [tarefa('a'), tarefa('b')] };
    const { buscar, chamadas } = fingir(() => json({ banco: devolvido }));

    const junto = await new ClienteSincronia(guarda, buscar).sincronizar(comTarefa);
    expect(junto?.tarefas.map((t) => t.id)).toEqual(['a', 'b']);

    const enviado = JSON.parse(chamadas[0].opcoes.body as string) as { banco: Banco };
    expect(enviado.banco.tarefas.map((t) => t.id)).toEqual(['a']);
  });

  it('anota quando sincronizou', async () => {
    const guarda = new GuardaMemoria();
    guarda.setItem('msl-sessao', 'abc');
    const { buscar } = fingir(() => json({ banco: bancoVazio() }));

    const quando = new Date('2026-09-20T15:00:00.000Z');
    await new ClienteSincronia(guarda, buscar).sincronizar(bancoVazio(), quando);
    expect(guarda.getItem('msl-sincronizado-em')).toBe('2026-09-20T15:00:00.000Z');
  });

  it('sem rede, a mensagem acalma em vez de assustar', async () => {
    // É o avião, o metrô, o elevador — e o dado local continua lá.
    const guarda = new GuardaMemoria();
    guarda.setItem('msl-sessao', 'abc');
    const buscar = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    const cliente = new ClienteSincronia(guarda, buscar);
    await expect(cliente.sincronizar(comTarefa)).rejects.toThrow('está salvo aqui');
    // E a sessão continua, porque não foi ela que falhou.
    expect(cliente.token).toBe('abc');
  });

  it('sessão revogada no outro aparelho apaga a sessão daqui', async () => {
    const guarda = new GuardaMemoria();
    guarda.setItem('msl-sessao', 'abc');
    guarda.setItem('msl-conta', JSON.stringify(CONTA));
    const { buscar } = fingir(() => json({ mensagem: 'terminou' }, 401));

    const cliente = new ClienteSincronia(guarda, buscar);
    await expect(cliente.sincronizar(comTarefa)).rejects.toMatchObject({ sessaoMorreu: true });
    expect(cliente.token).toBeNull();
    expect(cliente.conta).toBeNull();
  });

  it('409 do servidor ocupado vira mensagem, não sessão perdida', async () => {
    const guarda = new GuardaMemoria();
    guarda.setItem('msl-sessao', 'abc');
    const { buscar } = fingir(() => json({ mensagem: 'Outro aparelho está sincronizando.' }, 409));

    const cliente = new ClienteSincronia(guarda, buscar);
    await expect(cliente.sincronizar(comTarefa)).rejects.toThrow('Outro aparelho');
    expect(cliente.token).toBe('abc');
  });

  it('o que volta passa pela migração de entrada', async () => {
    // O servidor pode estar à frente ou atrás; quem entra no aparelho tem de
    // estar no formato que este código sabe ler.
    const guarda = new GuardaMemoria();
    guarda.setItem('msl-sessao', 'abc');
    const antigo = { versao: 1, rotinas: [], execucoes: [], tarefas: [tarefa('a')] };
    const { buscar } = fingir(() => json({ banco: antigo }));

    const junto = await new ClienteSincronia(guarda, buscar).sincronizar(bancoVazio());
    expect(junto?.versao).toBeGreaterThan(1);
    expect(junto?.tarefas).toHaveLength(1);
  });
});

describe('revogar aparelho', () => {
  it('manda o token do aparelho a cortar', async () => {
    const guarda = new GuardaMemoria();
    guarda.setItem('msl-sessao', 'meu-token');
    const { buscar, chamadas } = fingir(() => new Response(null, { status: 204 }));

    await new ClienteSincronia(guarda, buscar).revogar('token-do-outro');
    expect(chamadas[0].opcoes.method).toBe('DELETE');
    expect(JSON.parse(chamadas[0].opcoes.body as string)).toEqual({ token: 'token-do-outro' });
  });
});

describe('nome do aparelho', () => {
  it('reconhece os que eu uso', () => {
    expect(nomeDoAparelho('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)')).toBe('iPhone');
    expect(nomeDoAparelho('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)')).toBe('Mac');
    expect(nomeDoAparelho('Mozilla/5.0 (Windows NT 10.0)')).toBe('Windows');
  });

  it('o que não reconhece vira um nome genérico, não vazio', () => {
    expect(nomeDoAparelho('algo estranho')).toBe('Aparelho');
    expect(nomeDoAparelho('')).toBe('Aparelho');
  });
});

describe('o erro carrega se a sessão morreu', () => {
  it('distingue sessão perdida de problema passageiro', () => {
    expect(new ErroDaSincronia('x').sessaoMorreu).toBe(false);
    expect(new ErroDaSincronia('x', true).sessaoMorreu).toBe(true);
  });
});
