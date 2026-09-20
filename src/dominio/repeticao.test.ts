import { describe, it, expect } from 'vitest';
import {
  proximoPrazo,
  proximaOcorrencia,
  aoPular,
  descreverRepeticao,
  ehAUltima,
} from './repeticao';
import type { Tarefa, RepeticaoDaTarefa } from '../dados/esquema';

const tarefa = (dados: Partial<Tarefa>): Tarefa => ({
  id: 't1',
  criadoEm: '2026-01-01T00:00:00.000Z',
  alteradoEm: '2026-01-01T00:00:00.000Z',
  titulo: 'Pagar o IPVA',
  contexto: 'pessoal',
  ...dados,
});

const todo = (periodo: RepeticaoDaTarefa['periodo'], intervalo = 1, ate?: string) =>
  ({ periodo, intervalo, ate }) as RepeticaoDaTarefa;

describe('o prazo seguinte', () => {
  it('semanal soma sete dias', () => {
    expect(proximoPrazo('2026-09-17', todo('semanal'))).toBe('2026-09-24');
    expect(proximoPrazo('2026-09-17', todo('semanal', 2))).toBe('2026-10-01');
  });

  it('mensal atravessa a virada do ano', () => {
    expect(proximoPrazo('2026-11-15', todo('mensal', 3))).toBe('2027-02-15');
    expect(proximoPrazo('2026-12-15', todo('mensal'))).toBe('2027-01-15');
  });

  it('anual mantém o dia e o mês', () => {
    expect(proximoPrazo('2026-03-10', todo('anual'))).toBe('2027-03-10');
  });

  it('o dia 31 num mês de 30 vira o último dia — o contrário do iCal', () => {
    // Lá a regra é pular o mês, porque um compromisso que não existe naquele
    // dia não aconteceu. Aqui é o oposto: uma conta não some por falta de dia.
    expect(proximoPrazo('2026-01-31', todo('mensal'))).toBe('2026-02-28');
    expect(proximoPrazo('2026-03-31', todo('mensal'))).toBe('2026-04-30');
  });

  it('e no ano bissexto o mês de fevereiro tem o 29', () => {
    expect(proximoPrazo('2028-01-31', todo('mensal'))).toBe('2028-02-29');
    expect(proximoPrazo('2028-02-29', todo('anual'))).toBe('2029-02-28');
  });

  it('o fim da série corta', () => {
    expect(proximoPrazo('2026-09-17', todo('semanal', 1, '2026-09-30'))).toBe('2026-09-24');
    expect(proximoPrazo('2026-09-24', todo('semanal', 1, '2026-09-30'))).toBeNull();
  });

  it('o próprio dia do fim ainda conta', () => {
    expect(proximoPrazo('2026-09-17', todo('semanal', 1, '2026-09-24'))).toBe('2026-09-24');
  });

  it('intervalo torto não trava nem congela a data', () => {
    // Zero daria a mesma data para sempre, e um laço que nunca termina.
    expect(proximoPrazo('2026-09-17', todo('semanal', 0))).toBe('2026-09-24');
    expect(proximoPrazo('2026-09-17', todo('semanal', -4))).toBe('2026-09-24');
    expect(proximoPrazo('2026-09-17', todo('semanal', 1.7))).toBe('2026-09-24');
  });

  it('prazo que não é data devolve nada em vez de inventar uma', () => {
    expect(proximoPrazo('2026-02-30', todo('mensal'))).toBeNull();
    expect(proximoPrazo('qualquer coisa', todo('mensal'))).toBeNull();
  });
});

describe('a próxima ocorrência', () => {
  it('herda o que descreve a tarefa', () => {
    const atual = tarefa({
      prazo: '2026-03-15',
      hora: '09:00',
      projetoId: 'p1',
      contexto: 'profissional',
      repeticao: todo('anual'),
    });

    expect(proximaOcorrencia(atual)).toEqual({
      titulo: 'Pagar o IPVA',
      contexto: 'profissional',
      prazo: '2027-03-15',
      hora: '09:00',
      projetoId: 'p1',
      repeticao: todo('anual'),
    });
  });

  it('não herda o que descreve aquela vez', () => {
    // A anotação escrita em março não vale para abril, e a coluna do quadro
    // recomeça — a próxima ainda não foi tocada por ninguém.
    const atual = tarefa({
      prazo: '2026-03-15',
      repeticao: todo('mensal'),
      anotacao: 'ligar para o despachante',
      estado: 'fazendo',
      concluidaEm: '2026-03-15T12:00:00.000Z',
    });

    const proxima = proximaOcorrencia(atual)!;
    expect(proxima.anotacao).toBeUndefined();
    expect(proxima.estado).toBeUndefined();
    expect(proxima.concluidaEm).toBeUndefined();
  });

  it('tarefa que não repete não gera nada', () => {
    expect(proximaOcorrencia(tarefa({ prazo: '2026-03-15' }))).toBeNull();
  });

  it('repetição sem prazo não gera nada', () => {
    // "Todo mês" sem data não quer dizer nada.
    expect(proximaOcorrencia(tarefa({ repeticao: todo('mensal') }))).toBeNull();
  });

  it('a última da série não gera a próxima', () => {
    const ultima = tarefa({ prazo: '2026-09-24', repeticao: todo('semanal', 1, '2026-09-30') });
    expect(proximaOcorrencia(ultima)).toBeNull();
    expect(ehAUltima(ultima)).toBe(true);
  });

  it('a série se mantém sozinha: cada ocorrência carrega a regra', () => {
    // Nenhum registro "pai": a série nunca se perde por causa de uma tarefa
    // apagada no meio.
    let atual = tarefa({ prazo: '2026-01-31', repeticao: todo('mensal') });
    const prazos: string[] = [];
    for (let i = 0; i < 4; i++) {
      const proxima = proximaOcorrencia(atual)!;
      prazos.push(proxima.prazo!);
      atual = tarefa({ ...proxima });
    }
    // Fevereiro encurta para 28 e **não volta** a 31: a série anda pelo prazo
    // real de cada ocorrência, e isso é uma escolha, não um descuido.
    expect(prazos).toEqual(['2026-02-28', '2026-03-28', '2026-04-28', '2026-05-28']);
  });
});

describe('pular', () => {
  it('empurra a própria tarefa, sem marcá-la como feita', () => {
    // Registrar como concluído o que não foi feito estragaria toda conta que o
    // sistema faz a partir daí — sequência, metas, gráficos.
    const atual = tarefa({ prazo: '2026-09-17', repeticao: todo('semanal') });
    expect(aoPular(atual)).toEqual({ prazo: '2026-09-24' });
  });

  it('não dá para pular o que não repete, nem a última', () => {
    expect(aoPular(tarefa({ prazo: '2026-09-17' }))).toBeNull();
    expect(
      aoPular(tarefa({ prazo: '2026-09-24', repeticao: todo('semanal', 1, '2026-09-30') })),
    ).toBeNull();
  });
});

describe('a descrição', () => {
  it('concorda no singular e no plural', () => {
    expect(descreverRepeticao(todo('semanal'))).toBe('Toda semana');
    expect(descreverRepeticao(todo('mensal'))).toBe('Todo mês');
    expect(descreverRepeticao(todo('anual'))).toBe('Todo ano');
    expect(descreverRepeticao(todo('semanal', 3))).toBe('A cada 3 semanas');
    expect(descreverRepeticao(todo('mensal', 2))).toBe('A cada 2 meses');
  });

  it('diz até quando, no formato que se lê aqui', () => {
    expect(descreverRepeticao(todo('mensal', 1, '2026-12-31'))).toBe('Todo mês, até 31/12/2026');
  });
});
