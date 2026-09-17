import { describe, it, expect } from 'vitest';
import {
  situacao,
  diasDeAtraso,
  ordenarTarefas,
  resumoTarefas,
  tarefasDoDia,
  descreverPrazo,
  ROTULO_SITUACAO,
} from './tarefa';
import { bancoVazio, type Tarefa } from '../dados/esquema';

const HOJE = '2026-01-15';

function tarefa(extras: Partial<Tarefa> = {}): Tarefa {
  return {
    id: 't1',
    criadoEm: '2026-01-01T09:00:00.000Z',
    alteradoEm: '2026-01-01T09:00:00.000Z',
    titulo: 'Tarefa',
    contexto: 'pessoal',
    ...extras,
  };
}

describe('situação', () => {
  it('sem prazo é sem prazo, não atrasada', () => {
    // Obrigar prazo inventaria urgência falsa; tratar a falta como atraso
    // seria pior ainda.
    expect(situacao(tarefa(), HOJE)).toBe('sem-prazo');
  });

  it('prazo no passado é atraso', () => {
    expect(situacao(tarefa({ prazo: '2026-01-14' }), HOJE)).toBe('atrasada');
    expect(situacao(tarefa({ prazo: '2025-12-01' }), HOJE)).toBe('atrasada');
  });

  it('prazo hoje é hoje, não atraso', () => {
    // O dia não acabou — a mesma regra da sequência de rotina.
    expect(situacao(tarefa({ prazo: HOJE }), HOJE)).toBe('hoje');
  });

  it('prazo no futuro é agendada', () => {
    expect(situacao(tarefa({ prazo: '2026-01-16' }), HOJE)).toBe('futura');
  });

  it('concluída é concluída, mesmo com prazo vencido', () => {
    const feita = tarefa({ prazo: '2026-01-01', concluidaEm: '2026-01-02T10:00:00.000Z' });
    expect(situacao(feita, HOJE)).toBe('concluida');
  });

  it('prazo inválido cai em sem prazo em vez de quebrar', () => {
    expect(situacao(tarefa({ prazo: '2026-02-30' }), HOJE)).toBe('sem-prazo');
    expect(situacao(tarefa({ prazo: 'qualquer coisa' }), HOJE)).toBe('sem-prazo');
  });

  it('toda situação tem rótulo em português', () => {
    for (const s of ['concluida', 'atrasada', 'hoje', 'futura', 'sem-prazo'] as const) {
      expect(ROTULO_SITUACAO[s]).toBeTruthy();
    }
  });
});

describe('dias de atraso', () => {
  it('conta os dias', () => {
    expect(diasDeAtraso(tarefa({ prazo: '2026-01-14' }), HOJE)).toBe(1);
    expect(diasDeAtraso(tarefa({ prazo: '2026-01-05' }), HOJE)).toBe(10);
  });

  it('nunca é negativo', () => {
    expect(diasDeAtraso(tarefa({ prazo: '2026-01-20' }), HOJE)).toBe(0);
    expect(diasDeAtraso(tarefa({ prazo: HOJE }), HOJE)).toBe(0);
    expect(diasDeAtraso(tarefa(), HOJE)).toBe(0);
  });

  it('atravessa o virar do ano', () => {
    expect(diasDeAtraso(tarefa({ prazo: '2025-12-31' }), '2026-01-02')).toBe(2);
  });
});

describe('ordenação', () => {
  it('põe o que importa primeiro', () => {
    const lista = [
      tarefa({ id: 'sem', titulo: 'Sem prazo' }),
      tarefa({ id: 'fut', titulo: 'Futura', prazo: '2026-02-01' }),
      tarefa({ id: 'atr', titulo: 'Atrasada', prazo: '2026-01-10' }),
      tarefa({ id: 'hoj', titulo: 'Hoje', prazo: HOJE }),
      tarefa({
        id: 'ok',
        titulo: 'Concluída',
        prazo: '2026-01-02',
        concluidaEm: '2026-01-02T10:00:00.000Z',
      }),
    ];
    expect(ordenarTarefas(lista, HOJE).map((t) => t.id)).toEqual([
      'atr',
      'hoj',
      'fut',
      'sem',
      'ok',
    ]);
  });

  it('dentro do grupo, o prazo mais próximo primeiro', () => {
    const lista = [
      tarefa({ id: 'b', prazo: '2026-01-05' }),
      tarefa({ id: 'a', prazo: '2026-01-02' }),
      tarefa({ id: 'c', prazo: '2026-01-10' }),
    ];
    expect(ordenarTarefas(lista, HOJE).map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('empatou, a criada antes vem antes — a ordem nunca é aleatória', () => {
    const lista = [
      tarefa({ id: 'depois', prazo: HOJE, criadoEm: '2026-01-10T00:00:00.000Z' }),
      tarefa({ id: 'antes', prazo: HOJE, criadoEm: '2026-01-01T00:00:00.000Z' }),
    ];
    expect(ordenarTarefas(lista, HOJE).map((t) => t.id)).toEqual(['antes', 'depois']);
    // E de novo, para garantir que não depende da ordem de entrada.
    expect(ordenarTarefas([...lista].reverse(), HOJE).map((t) => t.id)).toEqual([
      'antes',
      'depois',
    ]);
  });

  it('não muda a lista original', () => {
    const lista = [tarefa({ id: 'b', prazo: '2026-01-20' }), tarefa({ id: 'a', prazo: HOJE })];
    ordenarTarefas(lista, HOJE);
    expect(lista.map((t) => t.id)).toEqual(['b', 'a']);
  });
});

describe('resumo', () => {
  const banco = {
    ...bancoVazio(),
    tarefas: [
      tarefa({ id: '1', prazo: '2026-01-10' }), // atrasada
      tarefa({ id: '2', prazo: '2026-01-12' }), // atrasada
      tarefa({ id: '3', prazo: HOJE }), // hoje
      tarefa({ id: '4', prazo: '2026-02-01' }), // futura
      tarefa({ id: '5' }), // sem prazo
      tarefa({ id: '6', concluidaEm: '2026-01-15T08:00:00.000Z' }), // concluída hoje
      tarefa({ id: '7', concluidaEm: '2026-01-02T08:00:00.000Z' }), // concluída antes
    ],
  };

  it('conta o que está pendente', () => {
    const r = resumoTarefas(banco, HOJE);
    expect(r.pendentes).toBe(5);
    expect(r.atrasadas).toBe(2);
    expect(r.paraHoje).toBe(1);
  });

  it('conta o que foi concluído hoje, e só hoje', () => {
    expect(resumoTarefas(banco, HOJE).concluidasHoje).toBe(1);
  });

  it('um banco vazio não quebra nem mente', () => {
    expect(resumoTarefas(bancoVazio(), HOJE)).toEqual({
      pendentes: 0,
      atrasadas: 0,
      paraHoje: 0,
      concluidasHoje: 0,
    });
  });
});

describe('tarefas do dia', () => {
  it('traz atrasadas e as de hoje, nessa ordem, e nada mais', () => {
    const banco = {
      ...bancoVazio(),
      tarefas: [
        tarefa({ id: 'fut', prazo: '2026-03-01' }),
        tarefa({ id: 'hoj', prazo: HOJE }),
        tarefa({ id: 'sem' }),
        tarefa({ id: 'atr', prazo: '2026-01-01' }),
      ],
    };
    expect(tarefasDoDia(banco, HOJE).map((t) => t.id)).toEqual(['atr', 'hoj']);
  });
});

describe('descrição do prazo', () => {
  it('fala em português e em relação a hoje', () => {
    expect(descreverPrazo(tarefa(), HOJE)).toBe('Sem prazo');
    expect(descreverPrazo(tarefa({ prazo: HOJE }), HOJE)).toBe('Vence hoje');
    expect(descreverPrazo(tarefa({ prazo: '2026-01-16' }), HOJE)).toBe('Vence amanhã');
    expect(descreverPrazo(tarefa({ prazo: '2026-01-20' }), HOJE)).toBe('Vence em 5 dias');
    expect(descreverPrazo(tarefa({ prazo: '2026-01-14' }), HOJE)).toBe('Venceu ontem');
    expect(descreverPrazo(tarefa({ prazo: '2026-01-10' }), HOJE)).toBe('Venceu há 5 dias');
  });

  it('prazo distante vira data, não uma contagem sem sentido', () => {
    // "Vence em 47 dias" não diz nada; "vence em 3 de mar." diz.
    expect(descreverPrazo(tarefa({ prazo: '2026-03-03' }), HOJE)).toBe('Vence em 3 de mar.');
    expect(descreverPrazo(tarefa({ prazo: '2026-01-31' }), HOJE)).toBe('Vence em 31 de jan.');
  });

  it('o corte entre contagem e data é uma semana', () => {
    expect(descreverPrazo(tarefa({ prazo: '2026-01-22' }), HOJE)).toBe('Vence em 7 dias');
    expect(descreverPrazo(tarefa({ prazo: '2026-01-23' }), HOJE)).toBe('Vence em 23 de jan.');
  });
});
