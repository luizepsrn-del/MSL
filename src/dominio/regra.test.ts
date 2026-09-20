import { describe, it, expect } from 'vitest';
import {
  oQueAsRegrasQuerem,
  aplicarEfeitos,
  validarRegra,
  descreverRegra,
  RegraInvalida,
} from './regra';
import { bancoVazio, type Banco, type Regra, type Tarefa, type Projeto } from '../dados/esquema';

const HOJE = '2026-09-17';
const base = (id: string) => ({ id, criadoEm: '2026-01-01T00:00:00.000Z', alteradoEm: '2026-01-01T00:00:00.000Z' });

const regra = (dados: Partial<Regra> & Pick<Regra, 'gatilho' | 'acao'>): Regra => ({
  ...base('r1'),
  titulo: 'Uma regra',
  ativa: true,
  ...dados,
});

const projeto = (id: string, dados: Partial<Projeto> = {}): Projeto => ({
  ...base(id),
  titulo: id,
  contexto: 'profissional',
  ...dados,
});

const tarefa = (id: string, dados: Partial<Tarefa> = {}): Tarefa => ({
  ...base(id),
  titulo: id,
  contexto: 'profissional',
  ...dados,
});

const banco = (partes: Partial<Banco> = {}): Banco => ({ ...bancoVazio(), ...partes });

/** Um projeto parado há muito: criado há tempo e sem conclusão recente. */
const paradoDesde = (id: string, quando: string): Projeto => ({
  ...projeto(id),
  criadoEm: `${quando}T12:00:00.000Z`,
  alteradoEm: `${quando}T12:00:00.000Z`,
});

describe('nada acontece sozinho', () => {
  it('a lista é uma proposta: o banco não muda ao perguntar', () => {
    const b = banco({
      projetos: [paradoDesde('p1', '2026-08-01')],
      tarefas: [tarefa('t1', { projetoId: 'p1', prazo: '2026-08-10' })],
      regras: [
        regra({
          gatilho: { tipo: 'projeto-parado', dias: 7 },
          acao: { tipo: 'criar-tarefa', titulo: 'Retomar {projeto}', contexto: 'profissional' },
        }),
      ],
    });
    const antes = JSON.stringify(b);

    const efeitos = oQueAsRegrasQuerem(b, HOJE);

    expect(efeitos.length).toBeGreaterThan(0);
    expect(JSON.stringify(b), 'perguntar não escreve').toBe(antes);
  });

  it('regra desligada não propõe nada', () => {
    const b = banco({
      projetos: [paradoDesde('p1', '2026-08-01')],
      tarefas: [tarefa('t1', { projetoId: 'p1', prazo: '2026-08-10' })],
      regras: [
        regra({
          ativa: false,
          gatilho: { tipo: 'projeto-parado', dias: 7 },
          acao: { tipo: 'criar-tarefa', titulo: 'Retomar', contexto: 'profissional' },
        }),
      ],
    });
    expect(oQueAsRegrasQuerem(b, HOJE)).toEqual([]);
  });
});

describe('a idempotência, que substitui o registro de disparo', () => {
  const comRegra = (extra: Partial<Banco> = {}) =>
    banco({
      projetos: [paradoDesde('p1', '2026-08-01')],
      regras: [
        regra({
          gatilho: { tipo: 'projeto-parado', dias: 7 },
          acao: { tipo: 'criar-tarefa', titulo: 'Retomar {projeto}', contexto: 'profissional' },
        }),
      ],
      ...extra,
    });

  it('a primeira vez propõe', () => {
    const b = comRegra({ tarefas: [tarefa('t1', { projetoId: 'p1', prazo: '2026-08-10' })] });
    expect(oQueAsRegrasQuerem(b, HOJE).map((e) => e.descricao)).toEqual([
      'Criar "Retomar p1" — p1 parado há 47 dias',
    ]);
  });

  it('aplicar e perguntar de novo não propõe a mesma coisa', () => {
    // É isto que troca uma coleção de histórico por uma propriedade do
    // cálculo: a pergunta é sempre sobre o estado de agora.
    let b = comRegra({ tarefas: [tarefa('t1', { projetoId: 'p1', prazo: '2026-08-10' })] });
    let contador = 0;
    b = aplicarEfeitos(b, oQueAsRegrasQuerem(b, HOJE), '2026-09-17T12:00:00.000Z', () => `novo-${++contador}`);

    expect(b.tarefas.some((t) => t.titulo === 'Retomar p1')).toBe(true);
    expect(oQueAsRegrasQuerem(b, HOJE)).toEqual([]);
  });

  it('aplicar duas vezes a mesma lista dá o mesmo banco', () => {
    const b = comRegra({ tarefas: [tarefa('t1', { projetoId: 'p1', prazo: '2026-08-10' })] });
    const efeitos = oQueAsRegrasQuerem(b, HOJE);

    let n = 0;
    const uma = aplicarEfeitos(b, efeitos, 'agora', () => `id-${++n}`);
    n = 0;
    const duas = aplicarEfeitos(uma, oQueAsRegrasQuerem(uma, HOJE), 'agora', () => `id-${++n}`);
    expect(duas).toEqual(uma);
  });

  it('a tarefa já concluída não conta: a regra volta a propor', () => {
    // Retomei uma vez, o projeto parou de novo — é uma situação nova.
    const b = comRegra({
      tarefas: [
        tarefa('t1', { projetoId: 'p1', prazo: '2026-08-10' }),
        tarefa('t2', {
          titulo: 'Retomar p1',
          projetoId: 'p1',
          concluidaEm: '2026-08-15T12:00:00.000Z',
        }),
      ],
    });
    expect(oQueAsRegrasQuerem(b, HOJE)).toHaveLength(1);
  });

  it('a mesma pendente noutro projeto não bloqueia', () => {
    const b = banco({
      projetos: [paradoDesde('p1', '2026-08-01'), paradoDesde('p2', '2026-08-01')],
      tarefas: [
        tarefa('t1', { projetoId: 'p1', prazo: '2026-08-10' }),
        tarefa('t2', { projetoId: 'p2', prazo: '2026-08-10' }),
      ],
      regras: [
        regra({
          gatilho: { tipo: 'projeto-parado', dias: 7 },
          acao: { tipo: 'criar-tarefa', titulo: 'Retomar', contexto: 'profissional' },
        }),
      ],
    });
    expect(oQueAsRegrasQuerem(b, HOJE)).toHaveLength(2);
  });
});

describe('os gatilhos', () => {
  it('projeto terminado: todas as tarefas concluídas', () => {
    const b = banco({
      projetos: [projeto('p1')],
      tarefas: [
        tarefa('t1', { projetoId: 'p1', concluidaEm: '2026-09-10T12:00:00.000Z' }),
        tarefa('t2', { projetoId: 'p1', concluidaEm: '2026-09-11T12:00:00.000Z' }),
      ],
      regras: [regra({ gatilho: { tipo: 'projeto-terminado' }, acao: { tipo: 'arquivar-projeto' } })],
    });
    expect(oQueAsRegrasQuerem(b, HOJE).map((e) => e.tipo)).toEqual(['arquivar-projeto']);
  });

  it('projeto sem tarefa nenhuma não é "terminado"', () => {
    // Zero de zero não é terminado: ele nunca começou, e arquivá-lo apagaria
    // o que eu ainda ia planejar.
    const b = banco({
      projetos: [projeto('p1')],
      regras: [regra({ gatilho: { tipo: 'projeto-terminado' }, acao: { tipo: 'arquivar-projeto' } })],
    });
    expect(oQueAsRegrasQuerem(b, HOJE)).toEqual([]);
  });

  it('projeto já arquivado não é proposto de novo', () => {
    const b = banco({
      projetos: [projeto('p1', { arquivadoEm: '2026-09-01T12:00:00.000Z' })],
      tarefas: [tarefa('t1', { projetoId: 'p1', concluidaEm: '2026-09-10T12:00:00.000Z' })],
      regras: [regra({ gatilho: { tipo: 'projeto-terminado' }, acao: { tipo: 'arquivar-projeto' } })],
    });
    expect(oQueAsRegrasQuerem(b, HOJE)).toEqual([]);
  });

  it('tarefa atrasada há N dias ou mais', () => {
    const b = banco({
      tarefas: [
        tarefa('recente', { prazo: '2026-09-16' }), // 1 dia
        tarefa('velha', { prazo: '2026-09-10' }), // 7 dias
      ],
      regras: [
        regra({
          gatilho: { tipo: 'tarefa-atrasada', dias: 5 },
          acao: { tipo: 'trazer-para-hoje' },
        }),
      ],
    });
    expect(oQueAsRegrasQuerem(b, HOJE).map((e) => e.tarefaId)).toEqual(['velha']);
  });

  it('trazer para hoje não aparece para quem já está em hoje', () => {
    const b = banco({
      tarefas: [tarefa('hoje', { prazo: HOJE })],
      regras: [
        regra({ gatilho: { tipo: 'tarefa-atrasada', dias: 1 }, acao: { tipo: 'trazer-para-hoje' } }),
      ],
    });
    expect(oQueAsRegrasQuerem(b, HOJE)).toEqual([]);
  });

  it('meta atrasada', () => {
    const b = banco({
      metas: [
        {
          ...base('m1'),
          titulo: 'Treinar 20 vezes',
          contexto: 'pessoal',
          alvo: 20,
          periodo: 'mes',
          direcao: 'atingir',
          fonte: { tipo: 'manual' },
          inicioEm: '2026-09-01',
          arquivada: false,
        },
      ],
      regras: [
        regra({
          gatilho: { tipo: 'meta-atrasada' },
          acao: { tipo: 'criar-tarefa', titulo: 'Rever a meta', contexto: 'pessoal' },
        }),
      ],
    });
    // 17 de 30 dias decorridos, zero feito: atrasada.
    expect(oQueAsRegrasQuerem(b, HOJE).map((e) => e.descricao)).toEqual([
      'Criar "Rever a meta" — Treinar 20 vezes 0 de 20, andando devagar',
    ]);
  });

  it('dias tortos não travam nem pegam tudo', () => {
    const b = banco({
      tarefas: [tarefa('t', { prazo: '2026-09-16' })],
      regras: [
        regra({ gatilho: { tipo: 'tarefa-atrasada', dias: 0 }, acao: { tipo: 'trazer-para-hoje' } }),
      ],
    });
    expect(() => oQueAsRegrasQuerem(b, HOJE)).not.toThrow();
  });
});

describe('aplicar', () => {
  it('cria a tarefa amarrada ao projeto do gatilho', () => {
    const b = banco({
      projetos: [paradoDesde('p1', '2026-08-01')],
      tarefas: [tarefa('t1', { projetoId: 'p1', prazo: '2026-08-10' })],
      regras: [
        regra({
          gatilho: { tipo: 'projeto-parado', dias: 7 },
          acao: { tipo: 'criar-tarefa', titulo: 'Retomar {projeto}', contexto: 'profissional' },
        }),
      ],
    });

    const depois = aplicarEfeitos(b, oQueAsRegrasQuerem(b, HOJE), 'agora', () => 'nova');
    const criada = depois.tarefas.find((t) => t.id === 'nova')!;
    expect(criada).toMatchObject({ titulo: 'Retomar p1', projetoId: 'p1', prazo: HOJE });
  });

  it('a tarefa de um gatilho sem projeto nasce solta', () => {
    const b = banco({
      tarefas: [tarefa('velha', { prazo: '2026-09-01' })],
      regras: [
        regra({
          gatilho: { tipo: 'tarefa-atrasada', dias: 5 },
          acao: { tipo: 'criar-tarefa', titulo: 'Revisar atrasos', contexto: 'pessoal' },
        }),
      ],
    });
    const depois = aplicarEfeitos(b, oQueAsRegrasQuerem(b, HOJE), 'agora', () => 'nova');
    expect(depois.tarefas.find((t) => t.id === 'nova')?.projetoId).toBeUndefined();
  });

  it('arquivar carimba o instante e não apaga nada', () => {
    const b = banco({
      projetos: [projeto('p1')],
      tarefas: [tarefa('t1', { projetoId: 'p1', concluidaEm: '2026-09-10T12:00:00.000Z' })],
      regras: [regra({ gatilho: { tipo: 'projeto-terminado' }, acao: { tipo: 'arquivar-projeto' } })],
    });

    const depois = aplicarEfeitos(b, oQueAsRegrasQuerem(b, HOJE), 'quando', () => 'x');
    expect(depois.projetos[0].arquivadoEm).toBe('quando');
    expect(depois.tarefas).toHaveLength(1);
  });

  it('aplicar uma lista vazia não muda nada', () => {
    const b = banco({ tarefas: [tarefa('t1')] });
    expect(aplicarEfeitos(b, [], 'agora', () => 'x')).toBe(b);
  });
});

describe('a ordem', () => {
  it('é estável entre dois desenhos da mesma tela', () => {
    const b = banco({
      projetos: [paradoDesde('p1', '2026-08-01'), paradoDesde('p2', '2026-08-01')],
      tarefas: [
        tarefa('t1', { projetoId: 'p1', prazo: '2026-08-10' }),
        tarefa('t2', { projetoId: 'p2', prazo: '2026-08-10' }),
      ],
      regras: [
        regra({
          gatilho: { tipo: 'projeto-parado', dias: 7 },
          acao: { tipo: 'criar-tarefa', titulo: 'Retomar {projeto}', contexto: 'profissional' },
        }),
      ],
    });
    expect(oQueAsRegrasQuerem(b, HOJE)).toEqual(oQueAsRegrasQuerem(b, HOJE));
  });
});

describe('o que uma regra não pode ser', () => {
  it('recusa o par sem sentido', () => {
    // "Quando uma meta atrasar, arquive o projeto" não tem projeto nenhum
    // para arquivar. Deixar passar criaria uma regra que nunca faz nada.
    expect(() =>
      validarRegra({ titulo: 'X', gatilho: { tipo: 'meta-atrasada' }, acao: { tipo: 'arquivar-projeto' } }),
    ).toThrow(RegraInvalida);

    expect(() =>
      validarRegra({
        titulo: 'X',
        gatilho: { tipo: 'projeto-parado', dias: 7 },
        acao: { tipo: 'trazer-para-hoje' },
      }),
    ).toThrow(RegraInvalida);
  });

  it('aceita os pares que fazem sentido', () => {
    expect(() =>
      validarRegra({
        titulo: 'X',
        gatilho: { tipo: 'projeto-terminado' },
        acao: { tipo: 'arquivar-projeto' },
      }),
    ).not.toThrow();

    expect(() =>
      validarRegra({
        titulo: 'X',
        gatilho: { tipo: 'meta-atrasada' },
        acao: { tipo: 'criar-tarefa', titulo: 'Rever', contexto: 'pessoal' },
      }),
    ).not.toThrow();
  });

  it('recusa nome em branco e tarefa sem título', () => {
    expect(() =>
      validarRegra({ titulo: ' ', gatilho: { tipo: 'meta-atrasada' }, acao: { tipo: 'criar-tarefa', titulo: 'X', contexto: 'pessoal' } }),
    ).toThrow(RegraInvalida);

    expect(() =>
      validarRegra({ titulo: 'X', gatilho: { tipo: 'meta-atrasada' }, acao: { tipo: 'criar-tarefa', titulo: '  ', contexto: 'pessoal' } }),
    ).toThrow(RegraInvalida);
  });
});

describe('a descrição', () => {
  it('se lê como uma frase', () => {
    expect(
      descreverRegra(
        regra({
          gatilho: { tipo: 'projeto-parado', dias: 7 },
          acao: { tipo: 'criar-tarefa', titulo: 'Retomar {projeto}', contexto: 'profissional' },
        }),
      ),
    ).toBe('Quando um projeto ficar 7 dias parado, criar a tarefa "Retomar {projeto}".');
  });

  it('concorda no singular', () => {
    expect(
      descreverRegra(
        regra({ gatilho: { tipo: 'tarefa-atrasada', dias: 1 }, acao: { tipo: 'trazer-para-hoje' } }),
      ),
    ).toBe('Quando uma tarefa atrasar 1 dia, trazer o prazo para hoje.');
  });
});
