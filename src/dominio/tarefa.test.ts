import { describe, it, expect } from 'vitest';
import {
  situacao,
  diasDeAtraso,
  ordenarTarefas,
  resumoTarefas,
  tarefasDoDia,
  descreverPrazo,
  ROTULO_SITUACAO,
  estadoDe,
  quadro,
  aoMoverPara,
  semanaDeTarefas,
  concluidasPorDia,
  quadroPor,
  SEM_PROJETO,
} from './tarefa';
import { bancoVazio, type Tarefa } from '../dados/esquema';

/**
 * Um instante que cai naquele dia **no fuso desta máquina**.
 *
 * Escrever `'2026-01-15T23:00:00.000Z'` à mão amarraria o teste ao UTC: em São
 * Paulo esse instante é dia 15 às 20h, mas em Tóquio já é dia 16.
 */
function instanteLocal(dia: string, hora = 12): string {
  const [ano, mes, data] = dia.split('-').map(Number);
  return new Date(ano, mes - 1, data, hora).toISOString();
}

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

describe('o quadro', () => {
  it('sem estado gravado, a tarefa começa em "a fazer"', () => {
    // O campo é opcional: tudo que existia antes do quadro precisa cair em
    // algum lugar, e a primeira coluna é onde trabalho ainda não começou.
    expect(estadoDe(tarefa())).toBe('a-fazer');
  });

  it('"fazendo" é uma declaração minha, e é respeitada', () => {
    expect(estadoDe(tarefa({ estado: 'fazendo' }))).toBe('fazendo');
  });

  it('concluída está em "feito", tenha o estado que tiver', () => {
    expect(estadoDe(tarefa({ concluidaEm: instanteLocal(HOJE), estado: 'fazendo' }))).toBe('feito');
  });

  it('estado "feito" sem conclusão não promove ninguém', () => {
    // Se houvesse duas fontes para "feito", elas divergiriam. `concluidaEm`
    // continua sendo a única.
    expect(estadoDe(tarefa({ estado: 'feito' }))).toBe('a-fazer');
  });

  it('as três colunas existem sempre, mesmo vazias', () => {
    const colunas = quadro([], HOJE);
    expect(colunas.map((c) => c.estado)).toEqual(['a-fazer', 'fazendo', 'feito']);
    expect(colunas.every((c) => c.tarefas.length === 0)).toBe(true);
    expect(colunas.map((c) => c.rotulo)).toEqual(['A fazer', 'Fazendo', 'Feito']);
  });

  it('cada tarefa aparece em exatamente uma coluna', () => {
    const tarefas = [
      tarefa({ id: 'a' }),
      tarefa({ id: 'b', estado: 'fazendo' }),
      tarefa({ id: 'c', concluidaEm: instanteLocal(HOJE) }),
      tarefa({ id: 'd', prazo: '2026-01-01' }),
    ];
    const colunas = quadro(tarefas, HOJE);
    const todas = colunas.flatMap((c) => c.tarefas.map((t) => t.id));
    expect(todas).toHaveLength(4);
    expect(new Set(todas).size).toBe(4);
    expect(colunas[0].tarefas.map((t) => t.id)).toEqual(['d', 'a']); // atrasada antes
    expect(colunas[1].tarefas.map((t) => t.id)).toEqual(['b']);
    expect(colunas[2].tarefas.map((t) => t.id)).toEqual(['c']);
  });

  it('em "feito" o que acabei de concluir fica no topo', () => {
    const colunas = quadro(
      [
        tarefa({ id: 'antiga', concluidaEm: instanteLocal('2026-01-02') }),
        tarefa({ id: 'agora', concluidaEm: instanteLocal('2026-01-14') }),
        tarefa({ id: 'meio', concluidaEm: instanteLocal('2026-01-10') }),
      ],
      HOJE,
    );
    expect(colunas[2].tarefas.map((t) => t.id)).toEqual(['agora', 'meio', 'antiga']);
  });
});

describe('mover de coluna', () => {
  it('soltar em "feito" conclui', () => {
    const mudanca = aoMoverPara(tarefa(), 'feito', '2026-01-15T12:00:00.000Z');
    expect(mudanca).toEqual({ estado: 'feito', concluidaEm: '2026-01-15T12:00:00.000Z' });
  });

  it('mover dentro de "feito" não reescreve a data da conclusão', () => {
    const feita = tarefa({ concluidaEm: '2026-01-02T10:00:00.000Z' });
    expect(aoMoverPara(feita, 'feito', '2026-01-15T12:00:00.000Z').concluidaEm).toBe(
      '2026-01-02T10:00:00.000Z',
    );
  });

  it('tirar de "feito" reabre de verdade', () => {
    // Sem apagar `concluidaEm`, a tarefa voltaria para a coluna e continuaria
    // contando como concluída em todo o resto do sistema.
    const feita = tarefa({ estado: 'feito', concluidaEm: '2026-01-02T10:00:00.000Z' });
    const mudanca = aoMoverPara(feita, 'fazendo', '2026-01-15T12:00:00.000Z');
    expect(mudanca).toEqual({ estado: 'fazendo', concluidaEm: undefined });
    expect(estadoDe({ ...feita, ...mudanca })).toBe('fazendo');
  });
});

describe('a semana', () => {
  const banco = {
    ...bancoVazio(),
    tarefas: [
      tarefa({ id: 'hoje', prazo: HOJE }),
      tarefa({ id: 'quinta', prazo: '2026-01-16' }),
      tarefa({ id: 'fora', prazo: '2026-02-20' }),
      tarefa({ id: 'velha', prazo: '2026-01-05' }),
      tarefa({ id: 'feita', prazo: '2026-01-16', concluidaEm: instanteLocal('2026-01-16') }),
    ],
  };

  it('tem sete dias, começando no que eu pedi', () => {
    const semana = semanaDeTarefas(banco, HOJE);
    expect(semana).toHaveLength(7);
    expect(semana[0].dia).toBe(HOJE);
    expect(semana[6].dia).toBe('2026-01-21');
  });

  it('coloca cada tarefa no dia do prazo dela', () => {
    const semana = semanaDeTarefas(banco, HOJE);
    expect(semana[0].pendentes.map((t) => t.id)).toEqual(['hoje']);
    expect(semana[1].pendentes.map((t) => t.id)).toEqual(['quinta']);
  });

  it('não arrasta o atraso para dentro da semana', () => {
    // A tarefa que venceu dia 5 continua vencida no dia 5. Empurrá-la para
    // hoje faria a semana mentir sobre quando o compromisso era.
    const semana = semanaDeTarefas(banco, HOJE);
    expect(semana.flatMap((d) => d.pendentes.map((t) => t.id))).not.toContain('velha');
  });

  it('separa o que foi concluído do que ainda vence', () => {
    const semana = semanaDeTarefas(banco, HOJE);
    expect(semana[1].concluidas.map((t) => t.id)).toEqual(['feita']);
    expect(semana[1].pendentes.map((t) => t.id)).not.toContain('feita');
  });

  it('dia sem nada vem vazio, e não ausente', () => {
    const semana = semanaDeTarefas(banco, HOJE);
    expect(semana[5]).toEqual({ dia: '2026-01-20', pendentes: [], concluidas: [] });
  });
});

describe('concluídas por dia', () => {
  const banco = {
    ...bancoVazio(),
    tarefas: [
      tarefa({ id: 'a', concluidaEm: instanteLocal(HOJE, 9) }),
      tarefa({ id: 'b', concluidaEm: instanteLocal(HOJE, 22) }),
      tarefa({ id: 'c', concluidaEm: instanteLocal('2026-01-13') }),
      tarefa({ id: 'antiga', concluidaEm: instanteLocal('2025-11-01') }),
      tarefa({ id: 'pendente' }),
    ],
  };

  it('a série é contínua e termina no dia pedido', () => {
    const serie = concluidasPorDia(banco, HOJE, 14);
    expect(serie).toHaveLength(14);
    expect(serie[0].dia).toBe('2026-01-02');
    expect(serie[13].dia).toBe(HOJE);
  });

  it('conta as duas de hoje no mesmo ponto', () => {
    // A das 22h é do mesmo dia que a das 9h. Cortar o ISO em UTC jogaria a da
    // noite para amanhã e o gráfico contaria uma a menos hoje.
    const serie = concluidasPorDia(banco, HOJE, 14);
    expect(serie.at(-1)).toEqual({ dia: HOJE, total: 2 });
  });

  it('dia sem conclusão é zero, e não um buraco', () => {
    const serie = concluidasPorDia(banco, HOJE, 14);
    expect(serie.filter((p) => p.total === 0)).toHaveLength(12);
    expect(serie.every((p) => typeof p.total === 'number')).toBe(true);
  });

  it('o que está fora da janela fica fora', () => {
    const total = concluidasPorDia(banco, HOJE, 14).reduce((s, p) => s + p.total, 0);
    expect(total).toBe(3);
  });
});

describe('agrupar o quadro por outro eixo', () => {
  const banco = {
    ...bancoVazio(),
    projetos: [
      {
        id: 'p1',
        criadoEm: instanteLocal('2026-01-01'),
        alteradoEm: instanteLocal('2026-01-01'),
        titulo: 'Reforma',
        contexto: 'profissional' as const,
      },
      {
        id: 'p2',
        criadoEm: instanteLocal('2026-01-01'),
        alteradoEm: instanteLocal('2026-01-01'),
        titulo: 'Guardado',
        contexto: 'pessoal' as const,
        arquivadoEm: instanteLocal('2026-01-10'),
      },
    ],
    tarefas: [
      tarefa({ id: 'atrasada', prazo: '2026-01-10' }),
      tarefa({ id: 'hoje', prazo: HOJE }),
      tarefa({ id: 'semana', prazo: '2026-01-20' }),
      tarefa({ id: 'longe', prazo: '2026-03-01' }),
      tarefa({ id: 'solta' }),
      tarefa({ id: 'feita', concluidaEm: instanteLocal('2026-01-14') }),
      tarefa({ id: 'do-projeto', projetoId: 'p1', contexto: 'profissional' }),
      tarefa({ id: 'fantasma', projetoId: 'nao-existe' }),
      tarefa({ id: 'arquivado', projetoId: 'p2' }),
    ],
  };

  const colunas = (a: Parameters<typeof quadroPor>[1]) => quadroPor(banco, a, HOJE);
  const ids = (a: Parameters<typeof quadroPor>[1], chave: string) =>
    colunas(a)
      .find((c) => c.chave === chave)!
      .tarefas.map((t) => t.id);

  it('agrupar não muda nenhuma tarefa: é a mesma lista em outras pilhas', () => {
    for (const eixo of ['estado', 'prazo', 'projeto', 'contexto'] as const) {
      const todas = colunas(eixo).flatMap((c) => c.tarefas.map((t) => t.id));
      expect(todas.sort(), eixo).toEqual(banco.tarefas.map((t) => t.id).sort());
    }
  });

  it('por prazo, cada tarefa cai na faixa certa', () => {
    expect(ids('prazo', 'atrasada')).toEqual(['atrasada']);
    expect(ids('prazo', 'hoje')).toEqual(['hoje']);
    expect(ids('prazo', 'semana')).toEqual(['semana']);
    expect(ids('prazo', 'depois')).toEqual(['longe']);
    expect(ids('prazo', 'concluida')).toEqual(['feita']);
  });

  it('a faixa "próximos 7 dias" para exatamente no sétimo', () => {
    const b = {
      ...bancoVazio(),
      tarefas: [tarefa({ id: 'no-limite', prazo: '2026-01-22' }), tarefa({ id: 'fora', prazo: '2026-01-23' })],
    };
    const sete = quadroPor(b, 'prazo', HOJE).find((c) => c.chave === 'semana')!;
    expect(sete.tarefas.map((t) => t.id)).toEqual(['no-limite']);
  });

  it('por projeto, o arquivado e o fantasma caem em "sem projeto"', () => {
    // A mesma regra de `tarefasSoltas`: esconder a tarefa num projeto que não
    // aparece em lugar nenhum é perdê-la de vista sem apagar.
    expect(ids('projeto', 'p1')).toEqual(['do-projeto']);
    expect(ids('projeto', SEM_PROJETO)).toContain('fantasma');
    expect(ids('projeto', SEM_PROJETO)).toContain('arquivado');
    expect(colunas('projeto').map((c) => c.chave)).not.toContain('p2');
  });

  it('por contexto, separa pessoal de profissional', () => {
    expect(ids('contexto', 'profissional')).toEqual(['do-projeto']);
    expect(ids('contexto', 'pessoal').length).toBe(8);
  });

  it('coluna vazia continua na lista', () => {
    const vazio = quadroPor(bancoVazio(), 'prazo', HOJE);
    expect(vazio).toHaveLength(6);
    expect(vazio.every((c) => c.tarefas.length === 0)).toBe(true);
  });

  it('só a coluna de etapa aceita soltar um cartão', () => {
    // Soltar em "Atrasadas" não teria sentido, e soltar em "Hoje" teria de
    // reescrever o prazo por baixo do pano.
    expect(colunas('estado').every((c) => c.soltavel)).toBe(true);
    for (const eixo of ['prazo', 'projeto', 'contexto'] as const) {
      expect(colunas(eixo).every((c) => !c.soltavel), eixo).toBe(true);
    }
  });

  it('o corte por etapa bate com o quadro de sempre', () => {
    const porEixo = quadroPor(banco, 'estado', HOJE);
    const direto = quadro(banco.tarefas, HOJE);
    expect(porEixo.map((c) => c.chave)).toEqual(direto.map((c) => c.estado));
    expect(porEixo.map((c) => c.tarefas.map((t) => t.id))).toEqual(
      direto.map((c) => c.tarefas.map((t) => t.id)),
    );
  });

  it('dá para agrupar só as tarefas de um projeto', () => {
    // É o que o cartão de projeto usa para ter o próprio quadro.
    const doProjeto = quadroPor(
      banco,
      'estado',
      HOJE,
      banco.tarefas.filter((t) => t.projetoId === 'p1'),
    );
    expect(doProjeto.flatMap((c) => c.tarefas.map((t) => t.id))).toEqual(['do-projeto']);
  });
});

describe('a hora no texto do prazo', () => {
  it('entra no que vence hoje, amanhã e nos próximos dias', () => {
    expect(descreverPrazo(tarefa({ prazo: HOJE, hora: '14:30' }), HOJE)).toBe(
      'Vence hoje às 14:30',
    );
    expect(descreverPrazo(tarefa({ prazo: '2026-01-16', hora: '09:00' }), HOJE)).toBe(
      'Vence amanhã às 09:00',
    );
    expect(descreverPrazo(tarefa({ prazo: '2026-01-20', hora: '08:15' }), HOJE)).toBe(
      'Vence em 5 dias às 08:15',
    );
  });

  it('não entra no que já venceu', () => {
    // "Venceu há três dias às 14:30" é ruído; o que importa é que venceu.
    expect(descreverPrazo(tarefa({ prazo: '2026-01-12', hora: '14:30' }), HOJE)).toBe(
      'Venceu há 3 dias',
    );
  });

  it('sem hora, o texto é o de sempre', () => {
    expect(descreverPrazo(tarefa({ prazo: HOJE }), HOJE)).toBe('Vence hoje');
  });
});
