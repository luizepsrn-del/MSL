import { describe, it, expect } from 'vitest';
import {
  minutosDoItem,
  minutosDoEvento,
  rotuloDoEvento,
  tempoPorRotulo,
  reunioesPorSemana,
  cargaDaJornada,
  planejadoContraFeito,
  horas,
  acharRotulo,
  quemUsa,
  SEM_ROTULO,
  type CompromissoExterno,
} from './insights';
import { JORNADA_PADRAO } from './plano';
import {
  bancoVazio,
  type Banco,
  type Tarefa,
  type Rotina,
  type Peca,
  type Rotulo,
} from '../dados/esquema';

/** `2026-09-17` é uma quinta; a semana dela vai de domingo 13 a sábado 19. */
const HOJE = '2026-09-17';
const base = { criadoEm: 'c', alteradoEm: 'a' };

const rotulo = (id: string, nome = id): Rotulo => ({
  ...base,
  id,
  nome,
  cor: 'var(--chart-1)',
  arquivado: false,
});

const tarefa = (dados: Partial<Tarefa> & { id: string }): Tarefa => ({
  ...base,
  titulo: dados.id,
  contexto: 'profissional',
  ...dados,
});

const rotina = (dados: Partial<Rotina> & { id: string }): Rotina => ({
  ...base,
  titulo: dados.id,
  contexto: 'pessoal',
  icone: 'repeat',
  inicioEm: '2026-01-01',
  arquivada: false,
  recorrencia: { tipo: 'diaria' },
  ...dados,
});

const peca = (dados: Partial<Peca> & { id: string }): Peca => ({
  ...base,
  titulo: dados.id,
  tipo: 'post',
  estado: 'rascunho',
  contexto: 'profissional',
  corpo: '',
  ...dados,
});

const evento = (dados: Partial<CompromissoExterno> & { id: string }): CompromissoExterno => ({
  dia: HOJE,
  diaInteiro: false,
  ...dados,
});

const banco = (partes: Partial<Banco> = {}): Banco => ({ ...bancoVazio(), ...partes });

describe('quanto tempo cada coisa toma', () => {
  it('a duração declarada manda', () => {
    expect(minutosDoItem({ duracao: 120, hora: '09:00' }, JORNADA_PADRAO)).toBe(120);
  });

  it('sem duração, mas com hora, vale o bloco da jornada', () => {
    expect(minutosDoItem({ hora: '09:00' }, JORNADA_PADRAO)).toBe(30);
  });

  it('sem hora e sem duração não é compromisso no tempo', () => {
    // Uma tarefa solta com prazo é intenção, não compromisso. Enfiá-la na
    // conta encheria a semana de tempo que ninguém marcou.
    expect(minutosDoItem({}, JORNADA_PADRAO)).toBeNull();
  });

  it('duração zero ou negativa não vale como declaração', () => {
    expect(minutosDoItem({ duracao: 0, hora: '09:00' }, JORNADA_PADRAO)).toBe(30);
    expect(minutosDoItem({ duracao: -60 }, JORNADA_PADRAO)).toBeNull();
  });
});

describe('quanto tempo toma um compromisso externo', () => {
  it('do começo ao fim', () => {
    expect(minutosDoEvento(evento({ id: 'a', hora: '09:00', fim: '10:30' }), JORNADA_PADRAO)).toBe(90);
  });

  it('evento de dia inteiro não vira horas', () => {
    // Contar um feriado como oito horas de compromisso faria a tela inteira
    // perder a credibilidade.
    expect(minutosDoEvento(evento({ id: 'a', diaInteiro: true }), JORNADA_PADRAO)).toBeNull();
  });

  it('sem fim, vale o bloco da jornada', () => {
    expect(minutosDoEvento(evento({ id: 'a', hora: '09:00' }), JORNADA_PADRAO)).toBe(30);
  });

  it('fim antes do começo não vira tempo negativo', () => {
    expect(minutosDoEvento(evento({ id: 'a', hora: '15:00', fim: '09:00' }), JORNADA_PADRAO)).toBe(30);
  });
});

describe('onde foi o meu tempo', () => {
  it('reparte por rótulo, do maior para o menor', () => {
    const b = banco({
      rotulos: [rotulo('reuniao'), rotulo('estudo')],
      tarefas: [
        tarefa({ id: 'a', prazo: HOJE, hora: '09:00', duracao: 120, rotuloId: 'reuniao' }),
        tarefa({ id: 'b', prazo: HOJE, hora: '14:00', duracao: 60, rotuloId: 'estudo' }),
        tarefa({ id: 'c', prazo: HOJE, hora: '16:00', duracao: 30, rotuloId: 'reuniao' }),
      ],
    });

    expect(tempoPorRotulo(b, [], HOJE, HOJE)).toEqual([
      { rotuloId: 'reuniao', minutos: 150, itens: 2 },
      { rotuloId: 'estudo', minutos: 60, itens: 1 },
    ]);
  });

  it('o sem-rótulo fica no fim, mesmo sendo o maior', () => {
    // Ele não é uma categoria, é a ausência de uma. Deixá-lo competir por
    // posição faria a lista mudar de ordem conforme eu fosse marcando.
    const b = banco({
      rotulos: [rotulo('estudo')],
      tarefas: [
        tarefa({ id: 'sem', prazo: HOJE, hora: '09:00', duracao: 300 }),
        tarefa({ id: 'com', prazo: HOJE, hora: '15:00', duracao: 60, rotuloId: 'estudo' }),
      ],
    });
    expect(tempoPorRotulo(b, [], HOJE, HOJE).map((f) => f.rotuloId)).toEqual(['estudo', null]);
  });

  it('a rotina conta em cada dia em que ela ocorre', () => {
    // "Treinar uma hora, todo dia" numa semana é sete horas, e não uma.
    const b = banco({
      rotinas: [rotina({ id: 'treino', hora: '07:00', duracao: 60, rotuloId: 'corpo' })],
    });
    const semana = tempoPorRotulo(b, [], '2026-09-13', '2026-09-19');
    expect(semana).toEqual([{ rotuloId: 'corpo', minutos: 420, itens: 7 }]);
  });

  it('a rotina arquivada não conta mais', () => {
    const b = banco({
      rotinas: [rotina({ id: 'antiga', hora: '07:00', duracao: 60, arquivada: true })],
    });
    expect(tempoPorRotulo(b, [], HOJE, HOJE)).toEqual([]);
  });

  it('a tarefa sem hora e sem duração não entra', () => {
    const b = banco({ tarefas: [tarefa({ id: 'solta', prazo: HOJE })] });
    expect(tempoPorRotulo(b, [], HOJE, HOJE)).toEqual([]);
  });

  it('a peça vale o bloco padrão', () => {
    const b = banco({ pecas: [peca({ id: 'post', publicarEm: HOJE, rotuloId: 'conteudo' })] });
    expect(tempoPorRotulo(b, [], HOJE, HOJE)).toEqual([
      { rotuloId: 'conteudo', minutos: 30, itens: 1 },
    ]);
  });

  it('o evento externo entra com o rótulo da marcação', () => {
    const b = banco({
      rotulos: [rotulo('equipe')],
      marcacoes: [{ ...base, id: 'm1', chaveDoEvento: 'serie-1', rotuloId: 'equipe' }],
    });
    const externos = [evento({ id: 'ocorrencia-de-hoje', serie: 'serie-1', hora: '10:00', fim: '11:00' })];

    expect(tempoPorRotulo(b, externos, HOJE, HOJE)).toEqual([
      { rotuloId: 'equipe', minutos: 60, itens: 1 },
    ]);
  });

  it('a marcação vale para a série inteira, e não para a ocorrência', () => {
    // O Google dá um id diferente para cada terça de uma reunião semanal.
    // Marcar uma a uma seria trabalho sem fim.
    const b = banco({
      marcacoes: [{ ...base, id: 'm1', chaveDoEvento: 'semanal', rotuloId: 'equipe' }],
    });
    for (const id of ['terca-1', 'terca-2', 'terca-3']) {
      expect(rotuloDoEvento(b, evento({ id, serie: 'semanal' }))).toBe('equipe');
    }
  });

  it('evento único é marcado pelo próprio id', () => {
    const b = banco({
      marcacoes: [{ ...base, id: 'm1', chaveDoEvento: 'avulso', rotuloId: 'urgente' }],
    });
    expect(rotuloDoEvento(b, evento({ id: 'avulso' }))).toBe('urgente');
  });

  it('a janela recorta', () => {
    const b = banco({
      tarefas: [
        tarefa({ id: 'dentro', prazo: HOJE, hora: '09:00', duracao: 60 }),
        tarefa({ id: 'fora', prazo: '2026-10-20', hora: '09:00', duracao: 60 }),
      ],
    });
    expect(tempoPorRotulo(b, [], '2026-09-13', '2026-09-19')[0].minutos).toBe(60);
  });

  it('a mesma janela dá sempre o mesmo resultado', () => {
    const b = banco({
      tarefas: [
        tarefa({ id: 'a', prazo: HOJE, hora: '09:00', duracao: 60, rotuloId: 'x' }),
        tarefa({ id: 'b', prazo: HOJE, hora: '10:00', duracao: 60, rotuloId: 'y' }),
      ],
    });
    expect(tempoPorRotulo(b, [], HOJE, HOJE)).toEqual(tempoPorRotulo(b, [], HOJE, HOJE));
  });
});

describe('reuniões, semana a semana', () => {
  it('separa o que se repete do que foi uma vez só', () => {
    // São coisas diferentes: a semanal é um custo fixo que eu escolhi uma vez
    // e pago para sempre; a pontual é uma decisão daquela semana.
    const externos = [
      evento({ id: 'a', serie: 'semanal', dia: HOJE, hora: '10:00', fim: '11:00' }),
      evento({ id: 'b', dia: HOJE, hora: '14:00', fim: '14:30' }),
    ];
    const semanas = reunioesPorSemana(externos, HOJE, 1);

    expect(semanas).toEqual([
      {
        de: '2026-09-13',
        ate: '2026-09-19',
        minutosRecorrentes: 60,
        minutosUnicos: 30,
        total: 90,
      },
    ]);
  });

  it('volta o número de semanas pedido, terminando na atual', () => {
    const semanas = reunioesPorSemana([], HOJE, 3);
    expect(semanas.map((s) => s.de)).toEqual(['2026-08-30', '2026-09-06', '2026-09-13']);
  });

  it('semana sem reunião nenhuma aparece zerada, e não some', () => {
    // Sumir com a semana vazia esconderia justamente a informação boa.
    const semanas = reunioesPorSemana([], HOJE, 2);
    expect(semanas.every((s) => s.total === 0)).toBe(true);
    expect(semanas).toHaveLength(2);
  });

  it('dia inteiro não entra na conta de reunião', () => {
    const externos = [evento({ id: 'feriado', dia: HOJE, diaInteiro: true })];
    expect(reunioesPorSemana(externos, HOJE, 1)[0].total).toBe(0);
  });

  it('número de semanas torto não trava', () => {
    expect(reunioesPorSemana([], HOJE, 0)).toHaveLength(1);
    expect(reunioesPorSemana([], HOJE, -3)).toHaveLength(1);
  });
});

describe('quanto da jornada já tem dono', () => {
  const umDia = 12 * 60; // a jornada padrão vai das 8 às 20

  it('conta o disponível pelo tamanho da jornada', () => {
    const carga = cargaDaJornada(banco(), [], '2026-09-13', '2026-09-19');
    expect(carga.minutosDisponiveis).toBe(umDia * 7);
    expect(carga.minutosComprometidos).toBe(0);
    expect(carga.fracao).toBe(0);
  });

  it('soma o que está marcado, dia a dia', () => {
    const b = banco({
      tarefas: [
        tarefa({ id: 'a', prazo: HOJE, hora: '09:00', duracao: 120 }),
        tarefa({ id: 'b', prazo: '2026-09-18', hora: '09:00', duracao: 60 }),
      ],
    });
    const carga = cargaDaJornada(b, [], HOJE, '2026-09-18');

    expect(carga.minutosComprometidos).toBe(180);
    expect(carga.porDia.map((d) => d.minutosComprometidos)).toEqual([120, 60]);
  });

  it('diz em que dia eu me comprometi com mais do que cabe', () => {
    const b = banco({
      tarefas: [tarefa({ id: 'maratona', prazo: HOJE, hora: '09:00', duracao: 13 * 60 })],
    });
    const carga = cargaDaJornada(b, [], HOJE, HOJE);

    expect(carga.estourados).toEqual([HOJE]);
    expect(carga.fracao).toBeGreaterThan(1);
  });

  it('a jornada é a mesma todo dia, e isso está dito', () => {
    // Descontar o fim de semana exigiria eu declarar em que dias trabalho, e
    // o sistema não pergunta isso. Inventar daria uma precisão falsa.
    const carga = cargaDaJornada(banco(), [], '2026-09-19', '2026-09-20');
    expect(carga.porDia.map((d) => d.minutosDisponiveis)).toEqual([umDia, umDia]);
  });

  it('jornada de tamanho zero não vira divisão por zero', () => {
    const carga = cargaDaJornada(banco(), [], HOJE, HOJE, {
      de: '08:00',
      ate: '08:00',
      minutosPorItem: 30,
    });
    expect(carga.fracao).toBe(0);
  });
});

describe('o planejado contra o feito', () => {
  it('conta itens, e não minutos', () => {
    // Comparar duas estimativas daria uma precisão que nenhum dos dois lados
    // tem. "Um de dois" é um número que eu posso conferir.
    const b = banco({
      tarefas: [
        tarefa({ id: 'feita', prazo: HOJE, rotuloId: 'x', concluidaEm: '2026-09-17T12:00:00Z' }),
        tarefa({ id: 'aberta', prazo: HOJE, rotuloId: 'x' }),
      ],
    });
    expect(planejadoContraFeito(b, HOJE, HOJE)).toEqual([
      { rotuloId: 'x', planejados: 2, feitos: 1, fracao: 0.5 },
    ]);
  });

  it('a tarefa sem hora entra aqui, mesmo não entrando nas horas', () => {
    // São perguntas diferentes: uma é "quanto tempo", a outra é "quantas".
    const b = banco({ tarefas: [tarefa({ id: 'solta', prazo: HOJE })] });
    expect(planejadoContraFeito(b, HOJE, HOJE)).toEqual([
      { rotuloId: null, planejados: 1, feitos: 0, fracao: 0 },
    ]);
  });

  it('a rotina entra por ocorrência, e a execução conta pelo dia local', () => {
    // Fatiar o instante em UTC poria o que foi feito às 22h no dia seguinte.
    const b = banco({
      rotinas: [rotina({ id: 'ler', rotuloId: 'estudo' })],
      execucoes: [{ ...base, id: 'e1', rotinaId: 'ler', dia: '2026-09-14' }],
    });
    expect(planejadoContraFeito(b, '2026-09-13', '2026-09-15')).toEqual([
      { rotuloId: 'estudo', planejados: 3, feitos: 1, fracao: 1 / 3 },
    ]);
  });

  it('peça publicada fora da janela não conta como feita', () => {
    // O que interessa é se ela saiu quando eu disse que sairia.
    const noPrazo = peca({ id: 'a', publicarEm: HOJE, publicadoEm: '2026-09-17T15:00:00Z' });
    const atrasada = peca({ id: 'b', publicarEm: HOJE, publicadoEm: '2026-10-05T15:00:00Z' });

    expect(planejadoContraFeito(banco({ pecas: [noPrazo] }), HOJE, HOJE)[0].feitos).toBe(1);
    expect(planejadoContraFeito(banco({ pecas: [atrasada] }), HOJE, HOJE)[0].feitos).toBe(0);
  });

  it('o sem-rótulo vai para o fim aqui também', () => {
    const b = banco({
      tarefas: [
        tarefa({ id: 'sem1', prazo: HOJE }),
        tarefa({ id: 'sem2', prazo: HOJE }),
        tarefa({ id: 'sem3', prazo: HOJE }),
        tarefa({ id: 'com', prazo: HOJE, rotuloId: 'x' }),
      ],
    });
    expect(planejadoContraFeito(b, HOJE, HOJE).map((p) => p.rotuloId)).toEqual(['x', null]);
  });
});

describe('o texto', () => {
  it('as horas se leem como gente fala', () => {
    expect(horas(0)).toBe('0min');
    expect(horas(45)).toBe('45min');
    expect(horas(60)).toBe('1h');
    expect(horas(390)).toBe('6h30');
    expect(horas(125)).toBe('2h05');
  });

  it('o rótulo se acha pelo id', () => {
    const rotulos = [rotulo('x', 'Estudos')];
    expect(acharRotulo(rotulos, 'x').nome).toBe('Estudos');
    expect(acharRotulo(rotulos, null)).toEqual(SEM_ROTULO);
  });

  it('rótulo apagado some o nome, e não o tempo', () => {
    // O número continua verdadeiro mesmo sem o nome.
    expect(acharRotulo([], 'sumiu').nome).toBe('Rótulo apagado');
  });

  it('diz quem usa um rótulo, para avisar antes de apagar', () => {
    const b = banco({
      tarefas: [tarefa({ id: 't', prazo: HOJE, rotuloId: 'x' })],
      rotinas: [rotina({ id: 'r', rotuloId: 'x' })],
      pecas: [peca({ id: 'p', rotuloId: 'y' })],
    });
    expect(quemUsa(b, 'x').map((i) => i.id).sort()).toEqual(['r', 't']);
    expect(quemUsa(b, 'y')).toHaveLength(1);
    expect(quemUsa(b, 'z')).toEqual([]);
  });
});
