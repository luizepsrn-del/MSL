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
  horaValida,
  compararHora,
  agendaEmLinha,
  filtrarDia,
  linhaDoTempo,
  SEM_FILTRO,
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
    expect(agenda.get('2026-09-17')).toEqual({ rotinas: [], tarefas: [], lancamentos: [], pecas: [] });
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

describe('hora', () => {
  it('aceita HH:MM e recusa o resto', () => {
    expect(horaValida('00:00')).toBe(true);
    expect(horaValida('23:59')).toBe(true);
    expect(horaValida('9:00')).toBe(false);
    expect(horaValida('24:00')).toBe(false);
    expect(horaValida('12:60')).toBe(false);
    expect(horaValida('meio-dia')).toBe(false);
  });

  it('quem não tem hora vai para o fim, e não para o começo', () => {
    // Sem hora primeiro colocaria "algum dia hoje" antes de "08:00", e a
    // agenda deixaria de ser uma linha do tempo.
    expect(compararHora('08:00', undefined)).toBeLessThan(0);
    expect(compararHora(undefined, '08:00')).toBeGreaterThan(0);
    expect(compararHora('08:00', '09:00')).toBeLessThan(0);
    expect(compararHora(undefined, undefined)).toBe(0);
  });

  it('hora inválida conta como sem hora, em vez de quebrar a ordem', () => {
    expect(compararHora('25:00', '08:00')).toBeGreaterThan(0);
  });
});

describe('a agenda de um dia em linha', () => {
  const banco = {
    ...bancoVazio(),
    rotinas: [
      rotina({ id: 'cedo', titulo: 'Academia', hora: '07:00' }),
      rotina({ id: 'sem-hora', titulo: 'Ler' }),
    ],
    tarefas: [
      tarefa({ id: 'reuniao', titulo: 'Reunião', prazo: '2026-09-16', hora: '14:00' }),
      tarefa({ id: 'solta', titulo: 'Revisar', prazo: '2026-09-16' }),
    ],
    lancamentos: [lancamento({ id: 'conta', descricao: 'Conta de luz', data: '2026-09-16' })],
  };

  it('junta os três tipos numa lista só, na ordem do relógio', () => {
    const linha = agendaEmLinha(itensDoDia(banco, '2026-09-16'));
    expect(linha.map((i) => i.titulo)).toEqual([
      'Academia', // 07:00
      'Reunião', // 14:00
      'Ler', // sem hora
      'Revisar', // sem hora
      'Conta de luz', // dinheiro nunca tem hora
    ]);
  });

  it('cada item diz o que é e se já foi feito', () => {
    const linha = agendaEmLinha(itensDoDia(banco, '2026-09-16'));
    expect(linha[0]).toMatchObject({ tipo: 'rotina', hora: '07:00', feito: false });
    expect(linha[4]).toMatchObject({ tipo: 'lancamento' });
    // Dinheiro nunca tem hora: o campo nem existe no registro.
    expect(linha[4].hora).toBeUndefined();
  });

  it('a chave é única dentro do dia', () => {
    const linha = agendaEmLinha(itensDoDia(banco, '2026-09-16'));
    expect(new Set(linha.map((i) => i.chave)).size).toBe(linha.length);
  });

  it('a ordem é estável entre dois carregamentos do mesmo dia', () => {
    const uma = agendaEmLinha(itensDoDia(banco, '2026-09-16')).map((i) => i.chave);
    const outra = agendaEmLinha(itensDoDia(banco, '2026-09-16')).map((i) => i.chave);
    expect(uma).toEqual(outra);
  });

  it('dia vazio devolve lista vazia, e não quebra', () => {
    expect(agendaEmLinha(itensDoDia(bancoVazio(), '2026-09-16'))).toEqual([]);
  });
});

describe('filtrar o calendário', () => {
  const banco = {
    ...bancoVazio(),
    rotinas: [
      rotina({ id: 'pessoal', titulo: 'Academia', contexto: 'pessoal' }),
      rotina({ id: 'trabalho', titulo: 'Revisar a agenda', contexto: 'profissional' }),
    ],
    execucoes: [execucao('pessoal', '2026-09-16')],
    tarefas: [
      tarefa({ id: 'aberta', prazo: '2026-09-16', contexto: 'profissional' }),
      tarefa({
        id: 'feita',
        prazo: '2026-09-16',
        contexto: 'profissional',
        concluidaEm: '2026-09-16T12:00:00.000Z',
      }),
    ],
  };

  it('por contexto, corta tudo junto: rotina, tarefa e dinheiro', () => {
    const so_trabalho = filtrarDia(itensDoDia(banco, '2026-09-16'), {
      contexto: 'profissional',
      esconderFeitos: false,
    });
    expect(so_trabalho.rotinas.map((r) => r.rotina.id)).toEqual(['trabalho']);
    expect(so_trabalho.tarefas).toHaveLength(2);
  });

  it('esconder o que já foi feito tira rotina cumprida e tarefa concluída', () => {
    const pendente = filtrarDia(itensDoDia(banco, '2026-09-16'), { esconderFeitos: true });
    expect(pendente.rotinas.map((r) => r.rotina.id)).toEqual(['trabalho']);
    expect(pendente.tarefas.map((t) => t.id)).toEqual(['aberta']);
  });

  it('sem filtro nada é escondido', () => {
    const tudo = filtrarDia(itensDoDia(banco, '2026-09-16'), SEM_FILTRO);
    expect(tudo.rotinas).toHaveLength(2);
    expect(tudo.tarefas).toHaveLength(2);
  });
});

describe('a linha do tempo', () => {
  const banco = {
    ...bancoVazio(),
    rotinas: [rotina({ id: 'segunda', recorrencia: { tipo: 'semanal', dias: [1] } })],
    tarefas: [
      tarefa({ id: 'perto', prazo: '2026-09-17' }),
      tarefa({ id: 'longe', prazo: '2026-10-20' }),
    ],
  };

  it('pula os dias vazios, que é o ponto dela', () => {
    // Uma lista com trinta dias em branco esconde os três que importam.
    const linha = linhaDoTempo(banco, '2026-09-16', 14);
    expect(linha.map((d) => d.dia)).toEqual(['2026-09-17', '2026-09-21', '2026-09-28']);
  });

  it('respeita o recorte de dias pedido', () => {
    expect(linhaDoTempo(banco, '2026-09-16', 2).map((d) => d.dia)).toEqual(['2026-09-17']);
  });

  it('aceita o mesmo filtro da grade', () => {
    const so_trabalho = linhaDoTempo(banco, '2026-09-16', 14, {
      contexto: 'profissional',
      esconderFeitos: false,
    });
    expect(so_trabalho).toEqual([]);
  });

  it('dá para deixar a rotina de fora, sem ela afogar o que é único', () => {
    // Uma rotina diária repetida sessenta vezes esconde as duas tarefas.
    const semRotina = linhaDoTempo(banco, '2026-09-16', 14, SEM_FILTRO, false);
    expect(semRotina.map((d) => d.dia)).toEqual(['2026-09-17']);
    expect(semRotina[0].itens.rotinas).toEqual([]);
    expect(semRotina[0].itens.tarefas.map((t) => t.id)).toEqual(['perto']);
  });

  it('nada pela frente devolve lista vazia, não um erro', () => {
    expect(linhaDoTempo(bancoVazio(), '2026-09-16', 30)).toEqual([]);
  });
});
