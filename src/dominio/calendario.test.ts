import { describe, it, expect } from 'vitest';
import {
  gradeDoMes,
  mesVizinho,
  itensDoDia,
  resumoDoDia,
  nomeDoMes,
  anoMesDe,
  CABECALHO_SEMANA,
  agendaDeIntervalo,
  inicioDaSemana,
  semanaDe,
  nomeDaSemana,
} from './calendario';
import { diaDaSemana } from './rotina';
import {
  bancoVazio,
  type Rotina,
  type Tarefa,
  type Execucao,
  type Lancamento,
} from '../dados/esquema';

function lancamento(extras: Partial<Lancamento> = {}): Lancamento {
  return {
    id: 'l1',
    criadoEm: '2026-09-01T09:00:00.000Z',
    alteradoEm: '2026-09-01T09:00:00.000Z',
    descricao: 'Lançamento',
    valor: 10000,
    tipo: 'saida',
    categoria: 'outros',
    contexto: 'pessoal',
    data: '2026-09-10',
    ...extras,
  };
}

function rotina(extras: Partial<Rotina> = {}): Rotina {
  return {
    id: 'r1',
    criadoEm: '2026-01-01T00:00:00.000Z',
    alteradoEm: '2026-01-01T00:00:00.000Z',
    titulo: 'Rotina',
    contexto: 'pessoal',
    icone: 'repeat',
    inicioEm: '2026-01-01',
    arquivada: false,
    recorrencia: { tipo: 'diaria' },
    ...extras,
  };
}

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

function execucao(rotinaId: string, dia: string): Execucao {
  return {
    id: `e-${rotinaId}-${dia}`,
    criadoEm: 'x',
    alteradoEm: 'x',
    rotinaId,
    dia,
  };
}

describe('grade do mês', () => {
  it('toda semana tem sete dias e começa no domingo', () => {
    for (const [ano, mes] of [
      [2026, 1],
      [2026, 2],
      [2026, 9],
      [2028, 2],
    ] as [number, number][]) {
      for (const semana of gradeDoMes(ano, mes)) {
        expect(semana, `${ano}-${mes}`).toHaveLength(7);
        expect(diaDaSemana(semana[0].dia), `${ano}-${mes} começa no domingo`).toBe(0);
        expect(diaDaSemana(semana[6].dia)).toBe(6);
      }
    }
  });

  it('contém cada dia do mês exatamente uma vez', () => {
    const grade = gradeDoMes(2026, 9);
    const doMes = grade.flat().filter((d) => d.doMes).map((d) => d.dia);
    expect(doMes).toHaveLength(30);
    expect(new Set(doMes).size).toBe(30);
    expect(doMes[0]).toBe('2026-09-01');
    expect(doMes[29]).toBe('2026-09-30');
  });

  it('completa as pontas com o mês vizinho, marcado como de fora', () => {
    // Setembro de 2026 começa numa terça: domingo e segunda vêm de agosto.
    const primeira = gradeDoMes(2026, 9)[0];
    expect(primeira[0]).toEqual({ dia: '2026-08-30', doMes: false });
    expect(primeira[1]).toEqual({ dia: '2026-08-31', doMes: false });
    expect(primeira[2]).toEqual({ dia: '2026-09-01', doMes: true });
  });

  it('os dias são contínuos, sem buraco nem repetição', () => {
    const dias = gradeDoMes(2026, 3).flat().map((d) => d.dia);
    for (let i = 1; i < dias.length; i++) {
      const anterior = new Date(`${dias[i - 1]}T00:00:00Z`).getTime();
      const atual = new Date(`${dias[i]}T00:00:00Z`).getTime();
      expect(atual - anterior, `${dias[i - 1]} → ${dias[i]}`).toBe(86_400_000);
    }
  });

  it('usa o número de semanas que o mês precisa, nem mais nem menos', () => {
    // Fevereiro de 2026 tem 28 dias e começa num domingo: cabe em 4 linhas
    // exatas, sem nenhum dia de fora.
    const fev = gradeDoMes(2026, 2);
    expect(diaDaSemana('2026-02-01')).toBe(0);
    expect(fev).toHaveLength(4);
    expect(fev.flat().every((d) => d.doMes)).toBe(true);

    // Agosto de 2026 tem 31 dias e começa num sábado: precisa de 6.
    expect(diaDaSemana('2026-08-01')).toBe(6);
    expect(gradeDoMes(2026, 8)).toHaveLength(6);
  });

  it('fevereiro bissexto tem 29 dias na grade', () => {
    const doMes = gradeDoMes(2028, 2).flat().filter((d) => d.doMes);
    expect(doMes).toHaveLength(29);
    expect(doMes[28].dia).toBe('2028-02-29');
  });

  it('atravessa a virada do ano nas pontas', () => {
    const jan = gradeDoMes(2026, 1);
    expect(jan[0][0].dia.startsWith('2025-12')).toBe(true);
    const dez = gradeDoMes(2026, 12);
    expect(dez.at(-1)!.at(-1)!.dia.startsWith('2027-01')).toBe(true);
  });
});

describe('mês vizinho', () => {
  it('anda para frente e para trás', () => {
    expect(mesVizinho(2026, 9, 1)).toEqual([2026, 10]);
    expect(mesVizinho(2026, 9, -1)).toEqual([2026, 8]);
  });

  it('atravessa dezembro e janeiro', () => {
    expect(mesVizinho(2026, 12, 1)).toEqual([2027, 1]);
    expect(mesVizinho(2026, 1, -1)).toEqual([2025, 12]);
  });

  it('anda vários meses de uma vez', () => {
    expect(mesVizinho(2026, 1, 13)).toEqual([2027, 2]);
    expect(mesVizinho(2026, 1, -13)).toEqual([2024, 12]);
  });
});

describe('itens do dia', () => {
  const banco = {
    ...bancoVazio(),
    rotinas: [
      rotina({ id: 'diaria', titulo: 'Ler' }),
      rotina({ id: 'segunda', titulo: 'Planejar', recorrencia: { tipo: 'semanal', dias: [1] } }),
      rotina({ id: 'morta', titulo: 'Arquivada', arquivada: true }),
    ],
    execucoes: [execucao('diaria', '2026-09-14')],
    tarefas: [
      tarefa({ id: 'no-dia', titulo: 'Entregar', prazo: '2026-09-14' }),
      tarefa({ id: 'outro-dia', titulo: 'Depois', prazo: '2026-09-20' }),
      tarefa({ id: 'sem-prazo', titulo: 'Solta' }),
    ],
  };

  it('traz as rotinas que ocorrem e as tarefas que vencem naquele dia', () => {
    // 2026-09-14 é uma segunda.
    const segunda = itensDoDia(banco, '2026-09-14');
    expect(segunda.rotinas.map((r) => r.rotina.id)).toEqual(['diaria', 'segunda']);
    expect(segunda.tarefas.map((t) => t.id)).toEqual(['no-dia']);
  });

  it('marca o que já foi feito', () => {
    const segunda = itensDoDia(banco, '2026-09-14');
    expect(segunda.rotinas.find((r) => r.rotina.id === 'diaria')!.feita).toBe(true);
    expect(segunda.rotinas.find((r) => r.rotina.id === 'segunda')!.feita).toBe(false);
  });

  it('não traz tarefa sem prazo para dia nenhum', () => {
    // Ela existe, mas não tem lugar no tempo — inventar um seria mentir.
    const dias = ['2026-09-13', '2026-09-14', '2026-09-15'];
    for (const d of dias) {
      expect(itensDoDia(banco, d).tarefas.map((t) => t.id)).not.toContain('sem-prazo');
    }
  });

  it('ignora rotina arquivada', () => {
    expect(itensDoDia(banco, '2026-09-15').rotinas.map((r) => r.rotina.id)).toEqual(['diaria']);
  });
});

describe('resumo do dia', () => {
  const hoje = '2026-09-16';
  const banco = {
    ...bancoVazio(),
    rotinas: [rotina({ id: 'd', titulo: 'Ler' })],
    execucoes: [execucao('d', '2026-09-15')],
    tarefas: [
      tarefa({ id: 'venceu', titulo: 'Atrasada', prazo: '2026-09-10' }),
      tarefa({ id: 'feita', titulo: 'Feita', prazo: '2026-09-11', concluidaEm: '2026-09-11T10:00:00Z' }),
    ],
  };

  it('conta rotinas e o que já foi cumprido', () => {
    const r = resumoDoDia(banco, '2026-09-15', hoje);
    expect(r.rotinas).toBe(1);
    expect(r.rotinasFeitas).toBe(1);
    expect(r.vazio).toBe(false);
  });

  it('marca atraso quando a tarefa daquele dia continua pendente', () => {
    expect(resumoDoDia(banco, '2026-09-10', hoje).temAtraso).toBe(true);
  });

  it('não marca atraso quando a tarefa daquele dia foi concluída', () => {
    expect(resumoDoDia(banco, '2026-09-11', hoje).temAtraso).toBe(false);
  });

  it('um dia sem nada é vazio', () => {
    const semRotina = { ...bancoVazio(), tarefas: [] };
    expect(resumoDoDia(semRotina, '2026-09-20', hoje).vazio).toBe(true);
  });
});

describe('rótulos', () => {
  it('nomeia o mês em português', () => {
    expect(nomeDoMes(2026, 9)).toBe('setembro de 2026');
    expect(nomeDoMes(2026, 3)).toBe('março de 2026');
    expect(nomeDoMes(2027, 1)).toBe('janeiro de 2027');
  });

  it('o cabeçalho tem sete dias e começa no domingo', () => {
    expect(CABECALHO_SEMANA).toHaveLength(7);
    expect(CABECALHO_SEMANA[0]).toBe('dom');
    expect(CABECALHO_SEMANA[6]).toBe('sáb');
  });

  it('extrai ano e mês de um dia', () => {
    expect(anoMesDe('2026-09-16')).toEqual([2026, 9]);
    expect(anoMesDe('2027-01-01')).toEqual([2027, 1]);
  });
});

describe('a semana', () => {
  it('começa no domingo da semana em que o dia cai', () => {
    // 2026-09-16 é uma quarta; o domingo dela é dia 13.
    expect(inicioDaSemana('2026-09-16')).toBe('2026-09-13');
  });

  it('domingo é o começo da própria semana, e não da anterior', () => {
    expect(inicioDaSemana('2026-09-13')).toBe('2026-09-13');
  });

  it('sábado ainda é da semana que começou no domingo', () => {
    expect(inicioDaSemana('2026-09-19')).toBe('2026-09-13');
  });

  it('atravessa o mês e o ano sem tropeçar', () => {
    expect(semanaDe('2027-01-01')[0]).toBe('2026-12-27');
    expect(semanaDe('2027-01-01').at(-1)).toBe('2027-01-02');
  });

  it('tem sete dias, todos seguidos e começando em domingo', () => {
    const dias = semanaDe('2026-09-16');
    expect(dias).toHaveLength(7);
    expect(diaDaSemana(dias[0])).toBe(0);
    expect(diaDaSemana(dias[6])).toBe(6);
  });

  it('o título diz o intervalo, e nomeia os dois meses quando ela vira o mês', () => {
    expect(nomeDaSemana('2026-09-16')).toBe('13 a 19 de setembro');
    expect(nomeDaSemana('2027-01-01')).toBe('27 de dezembro a 2 de janeiro');
  });
});

describe('agenda de um intervalo', () => {
  const banco = {
    ...bancoVazio(),
    rotinas: [rotina({ id: 'diaria', titulo: 'Ler' })],
    tarefas: [tarefa({ id: 'no-dia', prazo: '2026-09-15' })],
    lancamentos: [
      lancamento({ id: 'aluguel', data: '2026-01-10', valor: 250000, recorrencia: { periodo: 'mensal' } }),
      lancamento({ id: 'salario', data: '2026-09-05', valor: 900000, tipo: 'entrada' }),
    ],
  };

  it('devolve um dia para cada dia do intervalo, inclusive as pontas', () => {
    const agenda = agendaDeIntervalo(banco, '2026-09-13', '2026-09-19');
    expect(agenda.size).toBe(7);
    expect([...agenda.keys()][0]).toBe('2026-09-13');
    expect([...agenda.keys()].at(-1)).toBe('2026-09-19');
  });

  it('o lançamento recorrente aparece no mês certo sem eu relançar', () => {
    // Foi lançado em janeiro; em setembro ele continua caindo no dia 10.
    const agenda = agendaDeIntervalo(banco, '2026-09-01', '2026-09-30');
    expect(agenda.get('2026-09-10')!.lancamentos.map((o) => o.lancamento.id)).toEqual(['aluguel']);
    expect(agenda.get('2026-09-10')!.lancamentos[0].repeticao).toBe(true);
  });

  it('o lançamento avulso aparece só no dia dele', () => {
    const agenda = agendaDeIntervalo(banco, '2026-09-01', '2026-09-30');
    expect(agenda.get('2026-09-05')!.lancamentos.map((o) => o.lancamento.id)).toEqual(['salario']);
    expect(agenda.get('2026-09-06')!.lancamentos).toEqual([]);
  });

  it('dia sem nada continua no mapa, vazio', () => {
    const agenda = agendaDeIntervalo(bancoVazio(), '2026-09-13', '2026-09-19');
    expect(agenda.get('2026-09-17')).toEqual({ rotinas: [], tarefas: [], lancamentos: [] });
  });

  it('intervalo invertido é vazio, e não um laço infinito', () => {
    expect(agendaDeIntervalo(banco, '2026-09-19', '2026-09-13').size).toBe(0);
  });

  it('bate com o que itensDoDia responde dia a dia', () => {
    // A agenda existe só para não reexpandir a série 42 vezes numa grade de
    // mês. Se as duas divergissem, a grade mostraria uma coisa e o dia outra.
    for (const dia of semanaDe('2026-09-16')) {
      expect(agendaDeIntervalo(banco, dia, dia).get(dia)).toEqual(itensDoDia(banco, dia));
    }
  });
});

describe('resumo do dia, com dinheiro', () => {
  const banco = {
    ...bancoVazio(),
    lancamentos: [
      lancamento({ id: 'conta', data: '2026-09-15', valor: 30000, tipo: 'saida' }),
      lancamento({ id: 'receita', data: '2026-09-15', valor: 50000, tipo: 'entrada' }),
    ],
  };

  it('soma o dia com o sinal vindo do tipo', () => {
    const r = resumoDoDia(banco, '2026-09-15', '2026-09-16');
    expect(r.lancamentos).toBe(2);
    expect(r.saldo).toBe(20000);
  });

  it('um dia que só tem dinheiro não é um dia vazio', () => {
    // Antes o resumo só olhava rotina e tarefa: o dia do aluguel aparecia em
    // branco na grade.
    expect(resumoDoDia(banco, '2026-09-15', '2026-09-16').vazio).toBe(false);
  });
});
