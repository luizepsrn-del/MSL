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
