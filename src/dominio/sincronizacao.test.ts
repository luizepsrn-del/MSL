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
  it('ficam com o lado que foi editado por último', () => {
    // Elas não se juntam registro a registro: são um objeto só.
    //
    // Este teste dizia "o lado que **exportou** por último", e era o defeito
    // escrito como regra: exportar não muda uma preferência, e editar uma não
    // mudava o `ultimoBackupEm`. Com os dois lados exportados no mesmo dia,
    // o empate devolvia sempre o servidor e apagava o que eu acabara de
    // escrever. Agora quem decide é `alteradoEm`.
    const mac = banco({
      preferencias: { blocosDoInicio: ['hoje'], alteradoEm: '2026-09-09T00:00:00.000Z' },
    });
    const telefone = banco({
      preferencias: { blocosDoInicio: ['semana'], alteradoEm: '2026-09-12T00:00:00.000Z' },
    });
    expect(juntar(mac, telefone).preferencias?.blocosDoInicio).toEqual(['semana']);
    expect(juntar(telefone, mac).preferencias?.blocosDoInicio).toEqual(['semana']);
  });

  it('exportar não é editar: o backup sozinho não decide nada', () => {
    // O lado que exportou depois, mas editou antes, perde.
    const exportouDepois = banco({
      preferencias: {
        blocosDoInicio: ['hoje'],
        alteradoEm: '2026-09-09T00:00:00.000Z',
        ultimoBackupEm: '2026-09-30T00:00:00.000Z',
      },
    });
    const editouDepois = banco({
      preferencias: {
        blocosDoInicio: ['semana'],
        alteradoEm: '2026-09-12T00:00:00.000Z',
        ultimoBackupEm: '2026-09-01T00:00:00.000Z',
      },
    });
    expect(juntar(exportouDepois, editouDepois).preferencias?.blocosDoInicio).toEqual(['semana']);
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

describe('as preferências entre aparelhos', () => {
  /**
   * O defeito que este bloco existe para impedir.
   *
   * Eu digitava o meu nome em Ajustes, ele aparecia, e três segundos depois a
   * sincronização o apagava. A decisão de qual lado das preferências ganha
   * olhava `ultimoBackupEm` — que **não muda quando eu edito uma preferência**.
   * Com os dois lados exportados no mesmo dia, o empate devolvia sempre as
   * preferências do servidor, e toda edição minha era descartada em silêncio:
   * o nome, os blocos do Início, a jornada e o endereço da agenda.
   */
  const bancoCom = (preferencias: Banco['preferencias']): Banco => ({
    ...bancoVazio(),
    preferencias,
  });

  it('o nome que eu acabei de escrever não é apagado pelo servidor', () => {
    const backup = '2026-09-20T12:00:00.000Z';
    const servidor = bancoCom({ ultimoBackupEm: backup });
    const aparelho = bancoCom({
      ultimoBackupEm: backup,
      nome: 'Luiz Eduardo',
      alteradoEm: '2026-09-21T13:00:00.000Z',
    });

    expect(juntar(servidor, aparelho).preferencias?.nome).toBe('Luiz Eduardo');
    expect(juntar(aparelho, servidor).preferencias?.nome).toBe('Luiz Eduardo');
  });

  it('a edição mais recente ganha, venha de que lado vier', () => {
    const velha = bancoCom({ nome: 'Antigo', alteradoEm: '2026-09-20T10:00:00.000Z' });
    const nova = bancoCom({ nome: 'Novo', alteradoEm: '2026-09-21T10:00:00.000Z' });

    expect(juntar(velha, nova).preferencias?.nome).toBe('Novo');
    expect(juntar(nova, velha).preferencias?.nome).toBe('Novo');
  });

  it('quem nunca editou nada não apaga quem editou', () => {
    const nunca = bancoCom(undefined);
    const editou = bancoCom({ nome: 'Luiz', alteradoEm: '2026-09-21T10:00:00.000Z' });

    expect(juntar(nunca, editou).preferencias?.nome).toBe('Luiz');
    expect(juntar(editou, nunca).preferencias?.nome).toBe('Luiz');
  });

  it('um lado sem carimbo perde para um lado com carimbo', () => {
    // Sem carimbo é um banco que vem de antes desta regra existir. Ele não
    // pode ganhar de uma edição que eu sei quando aconteceu.
    const semCarimbo = bancoCom({ nome: 'Velho' });
    const comCarimbo = bancoCom({ nome: 'Novo', alteradoEm: '2026-09-21T10:00:00.000Z' });

    expect(juntar(semCarimbo, comCarimbo).preferencias?.nome).toBe('Novo');
    expect(juntar(comCarimbo, semCarimbo).preferencias?.nome).toBe('Novo');
  });

  it('empate exato dá o mesmo resultado nas duas ordens', () => {
    // Sem critério estável, os dois aparelhos guardariam preferências
    // diferentes e brigariam para sempre sobre qual é a mais nova.
    const carimbo = '2026-09-21T10:00:00.000Z';
    const um = bancoCom({ nome: 'A', alteradoEm: carimbo });
    const outro = bancoCom({ nome: 'B', alteradoEm: carimbo });

    expect(juntar(um, outro).preferencias).toEqual(juntar(outro, um).preferencias);
  });

  it('juntar duas vezes não muda nada', () => {
    const servidor = bancoCom({ nome: 'A', alteradoEm: '2026-09-20T10:00:00.000Z' });
    const aparelho = bancoCom({ nome: 'B', alteradoEm: '2026-09-21T10:00:00.000Z' });

    const uma = juntar(servidor, aparelho);
    expect(juntar(uma, aparelho).preferencias).toEqual(uma.preferencias);
  });
});
