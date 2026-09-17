import { describe, it, expect } from 'vitest';
import {
  tarefasDoProjeto,
  tarefasSoltas,
  progressoProjeto,
  situacaoProjeto,
  ordenarProjetos,
  removerProjeto,
  resumoProjetos,
  ROTULO_SITUACAO_PROJETO,
  painelProjeto,
  painelDosProjetos,
  projetosQuePedemAtencao,
  DIAS_PARA_PARADO,
} from './projeto';
import { bancoVazio, type Banco, type Projeto, type Tarefa } from '../dados/esquema';

const HOJE = '2026-01-15';
const AGORA = '2026-01-15T12:00:00.000Z';

function projeto(extras: Partial<Projeto> = {}): Projeto {
  return {
    id: 'p1',
    criadoEm: '2026-01-01T09:00:00.000Z',
    alteradoEm: '2026-01-01T09:00:00.000Z',
    titulo: 'Projeto',
    contexto: 'profissional',
    ...extras,
  };
}

function tarefa(extras: Partial<Tarefa> = {}): Tarefa {
  return {
    id: 't1',
    criadoEm: '2026-01-02T09:00:00.000Z',
    alteradoEm: '2026-01-02T09:00:00.000Z',
    titulo: 'Tarefa',
    contexto: 'profissional',
    ...extras,
  };
}

function banco(projetos: Projeto[], tarefas: Tarefa[]): Banco {
  return { ...bancoVazio(), projetos, tarefas };
}

describe('tarefas do projeto', () => {
  const b = banco(
    [projeto({ id: 'p1' }), projeto({ id: 'p2' })],
    [
      tarefa({ id: 'a', projetoId: 'p1' }),
      tarefa({ id: 'b', projetoId: 'p1' }),
      tarefa({ id: 'c', projetoId: 'p2' }),
      tarefa({ id: 'd' }),
    ],
  );

  it('agrupa pelo projeto', () => {
    expect(tarefasDoProjeto(b, 'p1').map((t) => t.id)).toEqual(['a', 'b']);
    expect(tarefasDoProjeto(b, 'p2').map((t) => t.id)).toEqual(['c']);
  });

  it('lista as soltas', () => {
    expect(tarefasSoltas(b).map((t) => t.id)).toEqual(['d']);
  });

  it('tarefa apontando para projeto inexistente conta como solta', () => {
    // Acontece com arquivo importado ou editado à mão. Esconder num projeto
    // fantasma seria perder a tarefa de vista sem apagá-la.
    const orfa = banco([], [tarefa({ id: 'x', projetoId: 'projeto-que-sumiu' })]);
    expect(tarefasSoltas(orfa).map((t) => t.id)).toEqual(['x']);
  });
});

describe('progresso', () => {
  it('conta as concluídas sobre o total', () => {
    const b = banco(
      [projeto()],
      [
        tarefa({ id: 'a', projetoId: 'p1', concluidaEm: AGORA }),
        tarefa({ id: 'b', projetoId: 'p1' }),
        tarefa({ id: 'c', projetoId: 'p1' }),
      ],
    );
    expect(progressoProjeto(b, 'p1')).toEqual({ total: 3, concluidas: 1, fracao: 1 / 3 });
  });

  it('projeto sem tarefa é zero, não cem por cento', () => {
    // Ao contrário do dia, em que "nada a fazer" é dia cumprido: um projeto
    // sem tarefa não está pronto, está por começar.
    expect(progressoProjeto(banco([projeto()], []), 'p1').fracao).toBe(0);
  });

  it('tudo concluído é cem por cento', () => {
    const b = banco([projeto()], [tarefa({ projetoId: 'p1', concluidaEm: AGORA })]);
    expect(progressoProjeto(b, 'p1').fracao).toBe(1);
  });
});

describe('situação', () => {
  it('sem tarefa é vazio', () => {
    expect(situacaoProjeto(banco([projeto()], []), projeto(), HOJE)).toBe('vazio');
  });

  it('com tarefa pendente e nada vencido é em andamento', () => {
    const b = banco([projeto()], [tarefa({ projetoId: 'p1', prazo: '2026-02-01' })]);
    expect(situacaoProjeto(b, projeto(), HOJE)).toBe('em-andamento');
  });

  it('tudo concluído é concluído', () => {
    const b = banco([projeto()], [tarefa({ projetoId: 'p1', concluidaEm: AGORA })]);
    expect(situacaoProjeto(b, projeto(), HOJE)).toBe('concluido');
  });

  it('uma tarefa atrasada contamina o projeto', () => {
    const b = banco([projeto()], [tarefa({ projetoId: 'p1', prazo: '2026-01-10' })]);
    expect(situacaoProjeto(b, projeto(), HOJE)).toBe('atrasado');
  });

  it('o prazo do próprio projeto vencido também atrasa', () => {
    // Mesmo com toda tarefa dentro do prazo, o projeto pode ter estourado.
    const p = projeto({ prazo: '2026-01-10' });
    const b = banco([p], [tarefa({ projetoId: 'p1', prazo: '2026-03-01' })]);
    expect(situacaoProjeto(b, p, HOJE)).toBe('atrasado');
  });

  it('projeto concluído não vira atrasado pelo prazo vencido', () => {
    // Entregou depois da data, mas entregou. Chamar de atrasado seria mentir.
    const p = projeto({ prazo: '2026-01-10' });
    const b = banco([p], [tarefa({ projetoId: 'p1', concluidaEm: AGORA })]);
    expect(situacaoProjeto(b, p, HOJE)).toBe('concluido');
  });

  it('arquivado vence qualquer outra situação', () => {
    const p = projeto({ arquivadoEm: AGORA, prazo: '2026-01-01' });
    const b = banco([p], [tarefa({ projetoId: 'p1', prazo: '2026-01-01' })]);
    expect(situacaoProjeto(b, p, HOJE)).toBe('arquivado');
  });

  it('toda situação tem rótulo em português', () => {
    for (const s of ['vazio', 'em-andamento', 'atrasado', 'concluido', 'arquivado'] as const) {
      expect(ROTULO_SITUACAO_PROJETO[s]).toBeTruthy();
    }
  });
});

describe('ordenação', () => {
  it('atrasado primeiro, arquivado por último', () => {
    const b = banco(
      [
        projeto({ id: 'concluido' }),
        projeto({ id: 'vazio' }),
        projeto({ id: 'atrasado' }),
        projeto({ id: 'andando' }),
        projeto({ id: 'arquivado', arquivadoEm: AGORA }),
      ],
      [
        tarefa({ id: '1', projetoId: 'concluido', concluidaEm: AGORA }),
        tarefa({ id: '2', projetoId: 'atrasado', prazo: '2026-01-01' }),
        tarefa({ id: '3', projetoId: 'andando', prazo: '2026-03-01' }),
      ],
    );
    expect(ordenarProjetos(b, HOJE).map((p) => p.id)).toEqual([
      'atrasado',
      'andando',
      'vazio',
      'concluido',
      'arquivado',
    ]);
  });

  it('com prazo vem antes de sem prazo', () => {
    const b = banco([projeto({ id: 'sem' }), projeto({ id: 'com', prazo: '2026-03-01' })], []);
    expect(ordenarProjetos(b, HOJE).map((p) => p.id)).toEqual(['com', 'sem']);
  });

  it('a ordem é estável entre duas leituras', () => {
    const b = banco(
      [
        projeto({ id: 'b', criadoEm: '2026-01-05T00:00:00.000Z' }),
        projeto({ id: 'a', criadoEm: '2026-01-01T00:00:00.000Z' }),
      ],
      [],
    );
    expect(ordenarProjetos(b, HOJE).map((p) => p.id)).toEqual(['a', 'b']);
    expect(ordenarProjetos(b, HOJE).map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('remover projeto', () => {
  const b = banco(
    [projeto({ id: 'p1' }), projeto({ id: 'p2' })],
    [
      tarefa({ id: 'a', projetoId: 'p1' }),
      tarefa({ id: 'b', projetoId: 'p1', concluidaEm: AGORA }),
      tarefa({ id: 'c', projetoId: 'p2' }),
      tarefa({ id: 'd' }),
    ],
  );

  it('solta as tarefas em vez de apagá-las', () => {
    // A decisão que importa: apagar tarefa junto seria destruir trabalho
    // registrado porque o recipiente saiu, e é o tipo de perda que só se
    // descobre depois.
    const depois = removerProjeto(b, 'p1', AGORA);

    expect(depois.tarefas).toHaveLength(4);
    expect(depois.tarefas.find((t) => t.id === 'a')!.projetoId).toBeUndefined();
    expect(depois.tarefas.find((t) => t.id === 'b')!.projetoId).toBeUndefined();
    expect(tarefasSoltas(depois).map((t) => t.id).sort()).toEqual(['a', 'b', 'd']);
  });

  it('preserva o que a tarefa já era', () => {
    const depois = removerProjeto(b, 'p1', AGORA);
    const concluida = depois.tarefas.find((t) => t.id === 'b')!;
    expect(concluida.concluidaEm).toBe(AGORA);
    expect(concluida.titulo).toBe('Tarefa');
  });

  it('não toca nas tarefas dos outros projetos', () => {
    const depois = removerProjeto(b, 'p1', AGORA);
    expect(depois.tarefas.find((t) => t.id === 'c')!.projetoId).toBe('p2');
    expect(depois.tarefas.find((t) => t.id === 'd')!.projetoId).toBeUndefined();
  });

  it('remove só o projeto pedido', () => {
    expect(removerProjeto(b, 'p1', AGORA).projetos.map((p) => p.id)).toEqual(['p2']);
  });

  it('não muda o banco que recebeu', () => {
    removerProjeto(b, 'p1', AGORA);
    expect(b.projetos).toHaveLength(2);
    expect(b.tarefas.find((t) => t.id === 'a')!.projetoId).toBe('p1');
  });
});

describe('resumo', () => {
  it('conta ativos, atrasados e concluídos, ignorando arquivados', () => {
    const b = banco(
      [
        projeto({ id: 'atrasado' }),
        projeto({ id: 'andando' }),
        projeto({ id: 'vazio' }),
        projeto({ id: 'pronto' }),
        projeto({ id: 'guardado', arquivadoEm: AGORA }),
      ],
      [
        tarefa({ id: '1', projetoId: 'atrasado', prazo: '2026-01-01' }),
        tarefa({ id: '2', projetoId: 'andando', prazo: '2026-03-01' }),
        tarefa({ id: '3', projetoId: 'pronto', concluidaEm: AGORA }),
      ],
    );
    expect(resumoProjetos(b, HOJE)).toEqual({ ativos: 3, atrasados: 1, concluidos: 1 });
  });

  it('banco vazio não quebra', () => {
    expect(resumoProjetos(bancoVazio(), HOJE)).toEqual({
      ativos: 0,
      atrasados: 0,
      concluidos: 0,
    });
  });
});

/** Instante que cai naquele dia no fuso desta máquina. */
function instanteLocal(dia: string, hora = 12): string {
  const [ano, mes, data] = dia.split('-').map(Number);
  return new Date(ano, mes - 1, data, hora).toISOString();
}

describe('o painel do projeto', () => {
  it('aponta a próxima tarefa, que é a mais urgente pendente', () => {
    const b = banco(
      [projeto()],
      [
        tarefa({ id: 'depois', projetoId: 'p1', prazo: '2026-02-01' }),
        tarefa({ id: 'urgente', projetoId: 'p1', prazo: '2026-01-10' }),
        tarefa({ id: 'feita', projetoId: 'p1', prazo: '2026-01-05', concluidaEm: instanteLocal('2026-01-05') }),
      ],
    );
    const painel = painelProjeto(b, b.projetos[0], HOJE);
    expect(painel.proxima?.id).toBe('urgente');
    expect(painel.atrasadas).toBe(1);
    expect(painel.proximoPrazo).toBe('2026-01-10');
  });

  it('projeto sem pendência não tem próxima tarefa nem previsão', () => {
    // Inventar uma data de término para o que já acabou seria ruído.
    const b = banco(
      [projeto()],
      [tarefa({ id: 'a', projetoId: 'p1', concluidaEm: instanteLocal('2026-01-14') })],
    );
    const painel = painelProjeto(b, b.projetos[0], HOJE);
    expect(painel.proxima).toBeUndefined();
    expect(painel.previsao).toBeUndefined();
    expect(painel.situacao).toBe('concluido');
  });

  it('conta o que está declarado como "fazendo"', () => {
    const b = banco(
      [projeto()],
      [
        tarefa({ id: 'a', projetoId: 'p1', estado: 'fazendo' }),
        tarefa({ id: 'b', projetoId: 'p1' }),
      ],
    );
    expect(painelProjeto(b, b.projetos[0], HOJE).emAndamento).toBe(1);
  });

  it('o ritmo é medido, não declarado', () => {
    // Quatro conclusões em 28 dias é uma por semana.
    const b = banco(
      [projeto()],
      [
        tarefa({ id: 'a', projetoId: 'p1', concluidaEm: instanteLocal('2026-01-02') }),
        tarefa({ id: 'b', projetoId: 'p1', concluidaEm: instanteLocal('2026-01-06') }),
        tarefa({ id: 'c', projetoId: 'p1', concluidaEm: instanteLocal('2026-01-10') }),
        tarefa({ id: 'd', projetoId: 'p1', concluidaEm: instanteLocal('2026-01-14') }),
        tarefa({ id: 'e', projetoId: 'p1' }),
        tarefa({ id: 'f', projetoId: 'p1' }),
      ],
    );
    const painel = painelProjeto(b, b.projetos[0], HOJE);
    expect(painel.ritmo).toBe(1);
    // Duas pendentes a uma por semana: duas semanas.
    expect(painel.previsao).toBe('2026-01-29');
  });

  it('conclusão velha demais não conta para o ritmo', () => {
    const b = banco(
      [projeto()],
      [
        tarefa({ id: 'a', projetoId: 'p1', concluidaEm: instanteLocal('2025-10-01') }),
        tarefa({ id: 'b', projetoId: 'p1' }),
      ],
    );
    expect(painelProjeto(b, b.projetos[0], HOJE).ritmo).toBe(0);
  });

  it('sem ritmo não há previsão, em vez de uma data inventada', () => {
    // Dividir por zero daria infinito, e arredondar para "algum dia" seria
    // pior que dizer que não dá para saber.
    const b = banco([projeto()], [tarefa({ id: 'a', projetoId: 'p1' })]);
    expect(painelProjeto(b, b.projetos[0], HOJE).previsao).toBeUndefined();
  });

  it('a última atividade inclui tarefa criada, e não só concluída', () => {
    // Um projeto onde acabei de escrever cinco tarefas não está parado.
    const b = banco(
      [projeto({ criadoEm: instanteLocal('2025-06-01') })],
      [tarefa({ id: 'a', projetoId: 'p1', criadoEm: instanteLocal('2026-01-14') })],
    );
    const painel = painelProjeto(b, b.projetos[0], HOJE);
    expect(painel.ultimaAtividade).toBe('2026-01-14');
    expect(painel.paradoHa).toBe(1);
    expect(painel.parado).toBe(false);
  });

  it('projeto sem nada há duas semanas é apontado como parado', () => {
    const b = banco(
      [projeto({ criadoEm: instanteLocal('2025-06-01') })],
      [tarefa({ id: 'a', projetoId: 'p1', criadoEm: instanteLocal('2025-06-01') })],
    );
    const painel = painelProjeto(b, b.projetos[0], HOJE);
    expect(painel.paradoHa).toBeGreaterThanOrEqual(DIAS_PARA_PARADO);
    expect(painel.parado).toBe(true);
  });

  it('projeto concluído não está parado, está pronto', () => {
    const b = banco(
      [projeto({ criadoEm: instanteLocal('2025-06-01') })],
      [tarefa({ id: 'a', projetoId: 'p1', criadoEm: instanteLocal('2025-06-01'), concluidaEm: instanteLocal('2025-06-02') })],
    );
    expect(painelProjeto(b, b.projetos[0], HOJE).parado).toBe(false);
  });

  it('instante ilegível não vira NaN na tela', () => {
    // Um `criadoEm` estragado num arquivo importado à mão dava `paradoHa: NaN`,
    // e NaN some da interface sem avisar ninguém.
    const b = banco([projeto({ criadoEm: 'qualquer coisa' })], [tarefa({ projetoId: 'p1', criadoEm: 'x' })]);
    const painel = painelProjeto(b, b.projetos[0], HOJE);
    expect(Number.isNaN(painel.paradoHa)).toBe(false);
    expect(painel.paradoHa).toBe(0);
    expect(painel.parado).toBe(false);
  });

  it('projeto vazio fica em 0%, e o painel não quebra', () => {
    const b = banco([projeto()], []);
    const painel = painelProjeto(b, b.projetos[0], HOJE);
    expect(painel.progresso).toEqual({ total: 0, concluidas: 0, fracao: 0 });
    expect(painel.proxima).toBeUndefined();
    expect(painel.ritmo).toBe(0);
  });
});

describe('o que pede atenção', () => {
  const b = banco(
    [
      projeto({ id: 'atrasado', titulo: 'Atrasado' }),
      projeto({ id: 'parado', titulo: 'Parado', criadoEm: instanteLocal('2025-06-01') }),
      projeto({ id: 'perto', titulo: 'Prazo perto', prazo: '2026-01-18' }),
      projeto({ id: 'calmo', titulo: 'Calmo', prazo: '2026-06-01' }),
      projeto({ id: 'guardado', titulo: 'Guardado', arquivadoEm: AGORA }),
    ],
    [
      tarefa({ id: 'ta', projetoId: 'atrasado', prazo: '2026-01-01' }),
      tarefa({ id: 'tp', projetoId: 'parado', criadoEm: instanteLocal('2025-06-01') }),
      tarefa({ id: 'tperto', projetoId: 'perto', criadoEm: instanteLocal('2026-01-14') }),
      tarefa({ id: 'tc', projetoId: 'calmo', criadoEm: instanteLocal('2026-01-14') }),
    ],
  );

  it('lista o atrasado, o parado e o de prazo próximo — e mais nada', () => {
    // A ordem é a de `ordenarProjetos`: atrasado primeiro, e entre os dois em
    // andamento vem antes quem tem prazo marcado.
    expect(projetosQuePedemAtencao(b, HOJE).map((p) => p.projeto.id)).toEqual([
      'atrasado',
      'perto',
      'parado',
    ]);
  });

  it('o projeto calmo fica de fora', () => {
    expect(projetosQuePedemAtencao(b, HOJE).map((p) => p.projeto.id)).not.toContain('calmo');
  });

  it('não lista projeto arquivado', () => {
    // Arquivar é justamente dizer "não me cobre disto".
    expect(painelDosProjetos(b, HOJE).map((p) => p.projeto.id)).not.toContain('guardado');
  });

  it('prazo que já passou entra pelo atraso, não pela janela de sete dias', () => {
    const vencido = banco([projeto({ id: 'v', prazo: '2026-01-01' })], [tarefa({ projetoId: 'v' })]);
    const atencao = projetosQuePedemAtencao(vencido, HOJE);
    expect(atencao.map((p) => p.projeto.id)).toEqual(['v']);
    expect(atencao[0].situacao).toBe('atrasado');
  });
});
