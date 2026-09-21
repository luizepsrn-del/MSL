import { describe, it, expect } from 'vitest';
import {
  paraEspelhar,
  lerCache,
  gravarCache,
  limparCache,
  estaVelho,
  falar,
  METODO,
  MINUTOS_ATE_RESSINCRONIZAR,
} from './google';
import { bancoVazio, type Banco, type Tarefa, type Peca } from './esquema';
import { readFileSync } from 'node:fs';

const JANELA = { de: '2026-09-01', ate: '2026-12-31' };

const tarefa = (dados: Partial<Tarefa> & { id: string }): Tarefa => ({
  criadoEm: 'c',
  alteradoEm: 'a',
  titulo: dados.id,
  contexto: 'profissional',
  ...dados,
});

const peca = (dados: Partial<Peca> & { id: string }): Peca => ({
  criadoEm: 'c',
  alteradoEm: 'a',
  titulo: dados.id,
  tipo: 'post',
  estado: 'rascunho',
  contexto: 'profissional',
  corpo: '',
  ...dados,
});

const banco = (partes: Partial<Banco>): Banco => ({ ...bancoVazio(), ...partes });

function guardaFalsa(inicial: Record<string, string> = {}): Storage {
  const dados = new Map(Object.entries(inicial));
  return {
    get length() {
      return dados.size;
    },
    clear: () => dados.clear(),
    getItem: (c: string) => dados.get(c) ?? null,
    key: (i: number) => [...dados.keys()][i] ?? null,
    removeItem: (c: string) => void dados.delete(c),
    setItem: (c: string, v: string) => void dados.set(c, v),
  } as Storage;
}

function guardaQuebrada(): Storage {
  const lancar = () => {
    throw new Error('janela privada');
  };
  return { length: 0, clear: lancar, getItem: lancar, key: lancar, removeItem: lancar, setItem: lancar } as unknown as Storage;
}

describe('o que vai para o Google', () => {
  it('tarefa com prazo, com e sem hora', () => {
    const b = banco({
      tarefas: [
        tarefa({ id: 'comHora', prazo: '2026-09-17', hora: '14:00' }),
        tarefa({ id: 'semHora', prazo: '2026-09-18' }),
      ],
    });
    expect(paraEspelhar(b, JANELA.de, JANELA.ate)).toEqual([
      { chave: 'tarefa:comHora', titulo: 'comHora', dia: '2026-09-17', hora: '14:00', alteradoEm: 'a' },
      { chave: 'tarefa:semHora', titulo: 'semHora', dia: '2026-09-18', hora: undefined, alteradoEm: 'a' },
    ]);
  });

  it('tarefa sem prazo não vai: não tem onde cair na agenda', () => {
    expect(paraEspelhar(banco({ tarefas: [tarefa({ id: 'solta' })] }), JANELA.de, JANELA.ate)).toEqual([]);
  });

  it('tarefa concluída sai do Google sozinha', () => {
    // Ela deixa de ser espelhada, e o plano apaga o espelho sem dono. Uma
    // tarefa feita na agenda é ruído.
    const b = banco({
      tarefas: [tarefa({ id: 'feita', prazo: '2026-09-17', concluidaEm: '2026-09-17T12:00:00Z' })],
    });
    expect(paraEspelhar(b, JANELA.de, JANELA.ate)).toEqual([]);
  });

  it('peça com data vai; semente e publicada não', () => {
    const b = banco({
      pecas: [
        peca({ id: 'pronta', publicarEm: '2026-09-20' }),
        peca({ id: 'semente', estado: 'semente', publicarEm: '2026-09-20' }),
        peca({ id: 'saiu', publicarEm: '2026-09-20', publicadoEm: '2026-09-20T12:00:00Z' }),
        peca({ id: 'semData' }),
      ],
    });
    expect(paraEspelhar(b, JANELA.de, JANELA.ate).map((i) => i.chave)).toEqual(['peca:pronta']);
  });

  it('rotina nunca vai — a agenda viraria a rotina inteira', () => {
    const b = banco({
      rotinas: [
        {
          id: 'r1',
          criadoEm: 'c',
          alteradoEm: 'a',
          titulo: 'Treinar',
          contexto: 'pessoal',
          icone: 'dumbbell',
          inicioEm: '2026-01-01',
          arquivada: false,
          recorrencia: { tipo: 'diaria' },
          hora: '07:00',
        },
      ],
    });
    expect(paraEspelhar(b, JANELA.de, JANELA.ate)).toEqual([]);
  });

  it('o que está fora da janela fica de fora', () => {
    const b = banco({
      tarefas: [
        tarefa({ id: 'antes', prazo: '2026-08-01' }),
        tarefa({ id: 'dentro', prazo: '2026-09-17' }),
        tarefa({ id: 'depois', prazo: '2027-06-01' }),
      ],
    });
    expect(paraEspelhar(b, JANELA.de, JANELA.ate).map((i) => i.chave)).toEqual(['tarefa:dentro']);
  });

  it('as bordas da janela contam', () => {
    const b = banco({
      tarefas: [tarefa({ id: 'inicio', prazo: JANELA.de }), tarefa({ id: 'fim', prazo: JANELA.ate })],
    });
    expect(paraEspelhar(b, JANELA.de, JANELA.ate)).toHaveLength(2);
  });

  it('a ordem é estável, porque o servidor corta no teto', () => {
    // Sem ordem fixa, o que fica de fora do teto muda a cada chamada e a mesma
    // tarefa nunca chegaria a ser espelhada.
    const tarefas = [
      tarefa({ id: 'c', prazo: '2026-09-17' }),
      tarefa({ id: 'a', prazo: '2026-09-17' }),
      tarefa({ id: 'b', prazo: '2026-09-17' }),
    ];
    const uma = paraEspelhar(banco({ tarefas }), JANELA.de, JANELA.ate);
    const outra = paraEspelhar(banco({ tarefas: [...tarefas].reverse() }), JANELA.de, JANELA.ate);
    expect(uma).toEqual(outra);
  });
});

describe('o cache dos eventos', () => {
  const guardado = { eventos: [{ id: 'a' }], em: '2026-09-17T12:00:00.000Z' };

  it('guarda e devolve', () => {
    const guarda = guardaFalsa();
    gravarCache(guarda, guardado);
    expect(lerCache(guarda)).toEqual(guardado);
  });

  it('vazio ou corrompido devolve nada', () => {
    expect(lerCache(guardaFalsa())).toBeNull();
    expect(lerCache(guardaFalsa({ 'msl-google-eventos': 'nada disso' }))).toBeNull();
  });

  it('armazenamento que se recusa a funcionar não derruba o calendário', () => {
    expect(() => lerCache(guardaQuebrada())).not.toThrow();
    expect(() => gravarCache(guardaQuebrada(), guardado)).not.toThrow();
    expect(() => limparCache(guardaQuebrada())).not.toThrow();
  });

  it('limpar apaga', () => {
    const guarda = guardaFalsa();
    gravarCache(guarda, guardado);
    limparCache(guarda);
    expect(lerCache(guarda)).toBeNull();
  });

  it('sabe quando está velho', () => {
    const agora = new Date('2026-09-17T12:00:00.000Z');
    const hAtras = (min: number) => new Date(agora.getTime() - min * 60_000).toISOString();

    expect(estaVelho(null, agora)).toBe(true);
    expect(estaVelho({ eventos: [], em: hAtras(1) }, agora)).toBe(false);
    expect(estaVelho({ eventos: [], em: hAtras(MINUTOS_ATE_RESSINCRONIZAR + 1) }, agora)).toBe(true);
    // Instante ilegível conta como velho: ressincronizar é barato.
    expect(estaVelho({ eventos: [], em: 'ontem' }, agora)).toBe(true);
  });
});

describe('o método de cada rota', () => {
  it('bate com o que a função da Vercel exporta', () => {
    // O contrário já custou: o cliente mandava POST em `/api/google-estado`,
    // que só exporta GET, e a resposta era 405. A interceptação do Playwright
    // responde a qualquer método, então quem pegou foi o endereço publicado.
    for (const [caminho, metodo] of Object.entries(METODO)) {
      const arquivo = `api/${caminho.replace('/api/', '')}.ts`;
      const fonte = readFileSync(arquivo, 'utf8');
      expect(fonte, arquivo).toContain(`export const ${metodo} =`);
    }
  });

  it('cobre todas as rotas do Google que existem em api/', () => {
    // Rota nova sem entrada na tabela cairia no POST padrão, calada.
    const daPasta = readFileSync('src/servidor/api.test.ts', 'utf8');
    for (const nome of ['estado', 'conectar', 'sincronizar', 'desconectar']) {
      expect(daPasta).toContain(`'google-${nome}.ts'`);
      expect(METODO).toHaveProperty(`/api/google-${nome}`);
    }
  });
});

describe('o que vai no pedido', () => {
  const guarda = { getItem: () => 'tok' } as unknown as Storage;
  const original = globalThis.window;

  /**
   * Empresta uma `window` ao teste.
   *
   * `async`, e com `await`: a primeira versão era síncrona e o `finally`
   * devolvia a janela antes de a função assíncrona terminar de usá-la.
   */
  async function comJanela(f: () => Promise<void>): Promise<void> {
    (globalThis as { window?: unknown }).window = { localStorage: guarda };
    try {
      await f();
    } finally {
      (globalThis as { window?: unknown }).window = original;
    }
  }

  it('GET não leva corpo, e POST leva', async () => {
    const pedidos: RequestInit[] = [];
    const buscar = (async (_u: string, o: RequestInit) => {
      pedidos.push(o);
      return new Response(JSON.stringify({ conectado: true }));
    }) as unknown as typeof fetch;

    await comJanela(async () => {
      await falar('/api/google-estado', undefined, buscar);
      await falar('/api/google-sincronizar', { de: 'x' }, buscar);
    });

    expect(pedidos[0].method).toBe('GET');
    expect(pedidos[0].body).toBeUndefined();
    expect(pedidos[1].method).toBe('POST');
    expect(JSON.parse(String(pedidos[1].body))).toEqual({ de: 'x' });
  });

  it('a sessão vai no cabeçalho, nos dois', async () => {
    const pedidos: RequestInit[] = [];
    const buscar = (async (_u: string, o: RequestInit) => {
      pedidos.push(o);
      return new Response('{}');
    }) as unknown as typeof fetch;

    await comJanela(async () => {
      await falar('/api/google-estado', undefined, buscar);
      await falar('/api/google-conectar', undefined, buscar);
    });

    for (const pedido of pedidos) {
      expect((pedido.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    }
  });
});
