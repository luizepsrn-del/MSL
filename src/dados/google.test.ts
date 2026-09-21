import { describe, it, expect } from 'vitest';
import {
  paraEspelhar,
  lerCache,
  gravarCache,
  limparCache,
  estaVelho,
  MINUTOS_ATE_RESSINCRONIZAR,
} from './google';
import { bancoVazio, type Banco, type Tarefa, type Peca } from './esquema';

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
