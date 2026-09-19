import { describe, it, expect } from 'vitest';
import { juntar, podarLapides } from './sincronizacao';
import { bancoVazio, type Banco, type Tarefa } from '../dados/esquema';

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

function banco(extras: Partial<Banco> = {}): Banco {
  return { ...bancoVazio(), ...extras };
}

const ids = (b: Banco) => b.tarefas.map((t) => t.id).sort();

describe('juntar dois aparelhos', () => {
  it('o que existe só de um lado atravessa', () => {
    const mac = banco({ tarefas: [tarefa('a')] });
    const telefone = banco({ tarefas: [tarefa('b')] });
    expect(ids(juntar(mac, telefone))).toEqual(['a', 'b']);
  });

  it('o mesmo registro em dois lados fica com a alteração mais recente', () => {
    const mac = banco({
      tarefas: [tarefa('a', { titulo: 'Do Mac', alteradoEm: '2026-09-10T10:00:00.000Z' })],
    });
    const telefone = banco({
      tarefas: [tarefa('a', { titulo: 'Do telefone', alteradoEm: '2026-09-10T18:00:00.000Z' })],
    });
    expect(juntar(mac, telefone).tarefas[0].titulo).toBe('Do telefone');
    expect(juntar(telefone, mac).tarefas[0].titulo).toBe('Do telefone');
  });

  it('marcar no metrô não é desfeito pelo Mac que sincroniza depois', () => {
    // É o caso que condena "o banco inteiro mais novo vence": eu concluo três
    // tarefas sem sinal, e o Mac, que não sabe delas, apagaria as três.
    const feitas = ['a', 'b', 'c'].map((id) =>
      tarefa(id, {
        concluidaEm: '2026-09-10T18:00:00.000Z',
        alteradoEm: '2026-09-10T18:00:00.000Z',
      }),
    );
    const telefone = banco({ tarefas: feitas });
    const mac = banco({
      tarefas: ['a', 'b', 'c'].map((id) => tarefa(id, { alteradoEm: '2026-09-10T09:00:00.000Z' })),
    });

    const junto = juntar(mac, telefone);
    expect(junto.tarefas.every((t) => t.concluidaEm)).toBe(true);
  });

  it('juntar é comutativo', () => {
    const mac = banco({
      tarefas: [tarefa('a', { alteradoEm: '2026-09-11T00:00:00.000Z' }), tarefa('b')],
    });
    const telefone = banco({
      tarefas: [tarefa('a'), tarefa('c', { alteradoEm: '2026-09-12T00:00:00.000Z' })],
    });
    expect(juntar(mac, telefone)).toEqual(juntar(telefone, mac));
  });

  it('juntar é idempotente', () => {
    // Sem isto, sincronizar duas vezes seguidas daria bancos diferentes.
    const mac = banco({ tarefas: [tarefa('a')] });
    const telefone = banco({ tarefas: [tarefa('b', { alteradoEm: '2026-09-12T00:00:00.000Z' })] });
    const uma = juntar(mac, telefone);
    expect(juntar(uma, telefone)).toEqual(uma);
    expect(juntar(uma, uma)).toEqual(uma);
  });

  it('juntar com um banco vazio devolve o outro', () => {
    const mac = banco({ tarefas: [tarefa('a')] });
    expect(ids(juntar(mac, bancoVazio()))).toEqual(['a']);
    expect(ids(juntar(bancoVazio(), mac))).toEqual(['a']);
  });
});

describe('o que foi apagado fica apagado', () => {
  it('a lápide de um lado apaga o registro que o outro ainda tem', () => {
    // Sem lápide, o aparelho que não soube da remoção devolveria a tarefa — e
    // tarefa apagada ressuscitando é pior que tarefa a mais.
    const mac = banco({ tarefas: [tarefa('a')] });
    const telefone = banco({
      removidos: [{ colecao: 'tarefas', id: 'a', em: '2026-09-10T00:00:00.000Z' }],
    });
    expect(juntar(mac, telefone).tarefas).toEqual([]);
    expect(juntar(telefone, mac).tarefas).toEqual([]);
  });

  it('editar depois de apagar traz o registro de volta', () => {
    // Apaguei no telefone e editei no Mac depois: mudei de ideia, e a edição
    // mais recente é a minha vontade mais recente.
    const mac = banco({
      tarefas: [tarefa('a', { titulo: 'Resolvi manter', alteradoEm: '2026-09-11T00:00:00.000Z' })],
    });
    const telefone = banco({
      removidos: [{ colecao: 'tarefas', id: 'a', em: '2026-09-10T00:00:00.000Z' }],
    });
    expect(juntar(mac, telefone).tarefas.map((t) => t.titulo)).toEqual(['Resolvi manter']);
  });

  it('apagar depois de editar mantém apagado', () => {
    const mac = banco({ tarefas: [tarefa('a', { alteradoEm: '2026-09-09T00:00:00.000Z' })] });
    const telefone = banco({
      removidos: [{ colecao: 'tarefas', id: 'a', em: '2026-09-10T00:00:00.000Z' }],
    });
    expect(juntar(mac, telefone).tarefas).toEqual([]);
  });

  it('as lápides dos dois lados sobrevivem à junção', () => {
    // Se a junção perdesse a lápide, um terceiro aparelho atrasado
    // ressuscitaria o registro depois.
    const mac = banco({ removidos: [{ colecao: 'tarefas', id: 'a', em: '2026-09-10T00:00:00.000Z' }] });
    const telefone = banco({
      removidos: [{ colecao: 'lancamentos', id: 'l1', em: '2026-09-11T00:00:00.000Z' }],
    });
    expect(juntar(mac, telefone).removidos).toHaveLength(2);
  });

  it('a mesma lápide nos dois lados não vira duas', () => {
    const lapide = { colecao: 'tarefas' as const, id: 'a', em: '2026-09-10T00:00:00.000Z' };
    const junto = juntar(banco({ removidos: [lapide] }), banco({ removidos: [lapide] }));
    expect(junto.removidos).toHaveLength(1);
  });

  it('desmarcar uma rotina não é desfeito pelo outro aparelho', () => {
    // Desmarcar apaga a execução: sem lápide, o Mac remarcaria o dia.
    const telefone = banco({
      removidos: [{ colecao: 'execucoes', id: 'e1', em: '2026-09-10T12:00:00.000Z' }],
    });
    const mac = banco({
      execucoes: [
        {
          id: 'e1',
          criadoEm: '2026-09-10T08:00:00.000Z',
          alteradoEm: '2026-09-10T08:00:00.000Z',
          rotinaId: 'r1',
          dia: '2026-09-10',
        },
      ],
    });
    expect(juntar(mac, telefone).execucoes).toEqual([]);
  });
});

describe('as preferências', () => {
  it('ficam com o lado que exportou por último', () => {
    // Elas não se juntam registro a registro: são um objeto só.
    const mac = banco({
      preferencias: { blocosDoInicio: ['hoje'], ultimoBackupEm: '2026-09-09T00:00:00.000Z' },
    });
    const telefone = banco({
      preferencias: { blocosDoInicio: ['semana'], ultimoBackupEm: '2026-09-12T00:00:00.000Z' },
    });
    expect(juntar(mac, telefone).preferencias?.blocosDoInicio).toEqual(['semana']);
  });

  it('um lado sem preferência nenhuma fica com a do outro', () => {
    const mac = banco({ preferencias: { blocosDoInicio: ['hoje'] } });
    expect(juntar(mac, bancoVazio()).preferencias?.blocosDoInicio).toEqual(['hoje']);
    expect(juntar(bancoVazio(), mac).preferencias?.blocosDoInicio).toEqual(['hoje']);
  });
});

describe('podar as lápides', () => {
  const agora = '2026-09-19T12:00:00.000Z';

  it('lápide velha sai, recente fica', () => {
    const b = banco({
      removidos: [
        { colecao: 'tarefas', id: 'velha', em: '2026-01-01T00:00:00.000Z' },
        { colecao: 'tarefas', id: 'nova', em: '2026-09-18T00:00:00.000Z' },
      ],
    });
    expect(podarLapides(b, agora).removidos?.map((r) => r.id)).toEqual(['nova']);
  });

  it('o prazo é generoso de propósito', () => {
    // A lápide existe para o aparelho atrasado não ressuscitar nada. Noventa
    // dias cobre uma viagem longa sem abrir o sistema.
    const b = banco({
      removidos: [{ colecao: 'tarefas', id: 'a', em: '2026-07-01T00:00:00.000Z' }],
    });
    expect(podarLapides(b, agora).removidos).toHaveLength(1);
    expect(podarLapides(b, agora, 30).removidos).toHaveLength(0);
  });

  it('não mexe no resto do banco', () => {
    const b = banco({ tarefas: [tarefa('a')] });
    expect(podarLapides(b, agora).tarefas).toHaveLength(1);
  });
});
