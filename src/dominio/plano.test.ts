import { describe, it, expect } from 'vitest';
import {
  montarODia,
  emMinutos,
  emHora,
  resumirPlano,
  duracao,
  JORNADA_PADRAO,
  type Compromisso,
  type ParaFazer,
} from './plano';

const fazer = (...titulos: string[]): ParaFazer[] =>
  titulos.map((titulo) => ({ chave: titulo, titulo }));

const as = (inicio: string, fim: string | undefined, titulo: string): Compromisso => ({
  chave: titulo,
  titulo,
  inicio,
  fim,
});

/** Só os blocos de trabalho, como "HH:MM título". */
const trabalho = (plano: ReturnType<typeof montarODia>) =>
  plano.blocos.filter((b) => b.tipo === 'trabalho').map((b) => `${b.inicio} ${b.titulo}`);

describe('o relógio', () => {
  it('vai e volta', () => {
    expect(emMinutos('08:30')).toBe(510);
    expect(emHora(510)).toBe('08:30');
    expect(emHora(0)).toBe('00:00');
  });

  it('hora inválida não vira número', () => {
    expect(emMinutos('25:00')).toBeNull();
    expect(emMinutos('08:70')).toBeNull();
    expect(emMinutos('oito')).toBeNull();
  });

  it('não escapa do dia', () => {
    expect(emHora(-30)).toBe('00:00');
    expect(emHora(24 * 60 + 100)).toBe('23:59');
  });
});

describe('encaixar o que há para fazer', () => {
  it('sem compromisso nenhum, tudo em fila a partir da abertura', () => {
    const plano = montarODia([], fazer('A', 'B', 'C'), JORNADA_PADRAO);
    expect(trabalho(plano)).toEqual(['08:00 A', '08:30 B', '09:00 C']);
  });

  it('mantém a ordem em que a fila chegou — ela já vem priorizada', () => {
    const plano = montarODia([], fazer('Atrasada', 'Hoje', 'Depois'), JORNADA_PADRAO);
    expect(trabalho(plano).map((b) => b.slice(6))).toEqual(['Atrasada', 'Hoje', 'Depois']);
  });

  it('o compromisso fica onde está, e o trabalho se desvia dele', () => {
    const plano = montarODia([as('09:00', '10:00', 'Reunião')], fazer('A', 'B', 'C'), JORNADA_PADRAO);

    expect(plano.blocos.map((b) => `${b.inicio}–${b.fim} ${b.titulo}`)).toEqual([
      '08:00–08:30 A',
      '08:30–09:00 B',
      '09:00–10:00 Reunião',
      '10:00–10:30 C',
      '10:30–20:00 Livre',
    ]);
  });

  it('um buraco pequeno demais não recebe nada', () => {
    // Entre 08:00 e 08:20 não cabe um bloco de 30 minutos.
    const plano = montarODia(
      [as('08:20', '09:00', 'Chamada')],
      fazer('A'),
      JORNADA_PADRAO,
    );
    expect(trabalho(plano)).toEqual(['09:00 A']);
  });

  it('compromisso sem fim ocupa um bloco padrão em vez de nada', () => {
    const plano = montarODia([as('09:00', undefined, 'Evento')], fazer('A', 'B'), JORNADA_PADRAO);
    expect(plano.blocos.find((b) => b.titulo === 'Evento')).toMatchObject({
      inicio: '09:00',
      fim: '09:30',
    });
    expect(trabalho(plano)).toEqual(['08:00 A', '08:30 B']);
  });

  it('fim antes do começo não engole o dia', () => {
    // Dado torto de agenda externa. Um intervalo negativo, ao ser unido,
    // marcaria o dia inteiro como ocupado.
    const plano = montarODia([as('15:00', '09:00', 'Torto')], fazer('A'), JORNADA_PADRAO);
    expect(trabalho(plano)).toEqual(['08:00 A']);
  });
});

describe('compromissos que se atropelam', () => {
  it('os dois aparecem, mas o tempo ocupado é a união', () => {
    // Esconder um seria mentir — eles de fato se sobrepõem. Mas encaixar
    // trabalho dentro da segunda reunião seria pior.
    const plano = montarODia(
      [as('09:00', '11:00', 'Longa'), as('10:00', '10:30', 'Curta')],
      fazer('A'),
      JORNADA_PADRAO,
      '09:00',
    );

    const titulos = plano.blocos.map((b) => b.titulo);
    expect(titulos).toContain('Longa');
    expect(titulos).toContain('Curta');
    // A tarefa só entra depois das duas.
    expect(trabalho(plano)).toEqual(['11:00 A']);
  });

  it('compromissos encostados não deixam buraco fantasma', () => {
    const plano = montarODia(
      [as('09:00', '10:00', 'Um'), as('10:00', '11:00', 'Dois')],
      fazer('A'),
      JORNADA_PADRAO,
      '09:00',
    );
    expect(trabalho(plano)).toEqual(['11:00 A']);
  });
});

describe('o tempo que já passou', () => {
  it('não planeja o passado', () => {
    const plano = montarODia([], fazer('A', 'B'), JORNADA_PADRAO, '15:00');
    expect(trabalho(plano)).toEqual(['15:00 A', '15:30 B']);
  });

  it('agora antes da abertura não antecipa a jornada', () => {
    const plano = montarODia([], fazer('A'), JORNADA_PADRAO, '05:00');
    expect(trabalho(plano)).toEqual(['08:00 A']);
  });

  it('depois do fechamento, nada cabe — e isso é dito', () => {
    const plano = montarODia([], fazer('A', 'B'), JORNADA_PADRAO, '21:00');
    expect(trabalho(plano)).toEqual([]);
    expect(plano.naoCoube.map((i) => i.titulo)).toEqual(['A', 'B']);
  });

  it('o compromisso de mais tarde continua aparecendo mesmo fora da jornada', () => {
    // Um jantar às 21h é fato, e sumir com ele porque a jornada fecha às 20h
    // esconderia justamente o que eu preciso lembrar.
    const plano = montarODia([as('21:00', '23:00', 'Jantar')], [], JORNADA_PADRAO);
    expect(plano.blocos.map((b) => b.titulo)).toContain('Jantar');
  });
});

describe('o que não coube', () => {
  it('é dito, e não empurrado em silêncio', () => {
    const jornada = { de: '08:00', ate: '09:00', minutosPorItem: 30 };
    const plano = montarODia([], fazer('A', 'B', 'C', 'D'), jornada);

    expect(trabalho(plano)).toEqual(['08:00 A', '08:30 B']);
    expect(plano.naoCoube.map((i) => i.titulo)).toEqual(['C', 'D']);
  });

  it('nada para fazer dá um dia todo vago, sem sobras', () => {
    const plano = montarODia([], [], JORNADA_PADRAO);
    expect(plano.naoCoube).toEqual([]);
    expect(plano.minutosVagos).toBe(12 * 60);
  });

  it('conta os minutos livres de verdade, buraco a buraco', () => {
    const jornada = { de: '08:00', ate: '12:00', minutosPorItem: 30 };
    // Reunião das 9 às 10. Uma tarefa entra às 8:00; sobram 8:30–9:00 e
    // 10:00–12:00, ou seja 30 + 120 minutos.
    const plano = montarODia([as('09:00', '10:00', 'Reunião')], fazer('A'), jornada);
    expect(plano.minutosVagos).toBe(150);
  });
});

describe('o bloco padrão', () => {
  it('vale para todas as tarefas, e é configurável', () => {
    // Um número por tarefa que ninguém mediu é precisão inventada.
    const plano = montarODia([], fazer('A', 'B'), { de: '08:00', ate: '20:00', minutosPorItem: 45 });
    expect(trabalho(plano)).toEqual(['08:00 A', '08:45 B']);
  });

  it('bloco torto não vira laço eterno', () => {
    const plano = montarODia([], fazer('A'), { de: '08:00', ate: '20:00', minutosPorItem: 0 });
    expect(plano.blocos.length).toBeGreaterThan(0);
    expect(plano.naoCoube).toEqual([]);
  });
});

describe('a ordem dos blocos', () => {
  it('é cronológica, com o compromisso na frente no empate', () => {
    const plano = montarODia([as('08:00', '08:30', 'Reunião')], fazer('A'), JORNADA_PADRAO);
    expect(plano.blocos[0].titulo).toBe('Reunião');
  });

  it('a mesma entrada dá a mesma saída, sempre', () => {
    const entrada = () =>
      montarODia(
        [as('09:00', '10:00', 'B'), as('09:00', '10:00', 'A')],
        fazer('X', 'Y'),
        JORNADA_PADRAO,
      );
    expect(entrada()).toEqual(entrada());
  });
});

describe('os invariantes do plano', () => {
  /** Nenhum par de blocos de trabalho pode se sobrepor. */
  const semSobreposicao = (plano: ReturnType<typeof montarODia>) => {
    const t = plano.blocos.filter((b) => b.tipo === 'trabalho');
    return t.every((b, i) => i === 0 || t[i - 1].fim <= b.inicio);
  };

  /** O tempo livre nunca pode passar do tamanho da jornada. */
  const cabeNaJornada = (plano: ReturnType<typeof montarODia>, jornada: typeof JORNADA_PADRAO) =>
    plano.minutosVagos <= emMinutos(jornada.ate)! - emMinutos(jornada.de)!;

  it('vale para um dia comum', () => {
    const plano = montarODia([as('09:00', '10:00', 'R')], fazer('A', 'B'), JORNADA_PADRAO);
    expect(semSobreposicao(plano)).toBe(true);
    expect(cabeNaJornada(plano, JORNADA_PADRAO)).toBe(true);
  });

  it('vale mesmo com um compromisso de fim invertido', () => {
    // Um intervalo negativo faz o laço abrir dois buracos que se sobrepõem:
    // o trabalho seria agendado duas vezes no mesmo horário e o tempo livre
    // passaria do tamanho do dia. Foi a mutação que revelou a falta deste
    // teste — a asserção que existia passava mesmo com o defeito.
    const plano = montarODia([as('15:00', '09:00', 'Torto')], fazer('A', 'B', 'C'), JORNADA_PADRAO);
    expect(semSobreposicao(plano), 'trabalho sobreposto').toBe(true);
    expect(cabeNaJornada(plano, JORNADA_PADRAO), 'mais tempo livre que o dia').toBe(true);
  });

  it('vale com reuniões que se atropelam', () => {
    const plano = montarODia(
      [as('09:00', '11:00', 'Longa'), as('10:00', '10:30', 'Curta'), as('09:30', '12:00', 'Outra')],
      fazer('A', 'B', 'C'),
      JORNADA_PADRAO,
    );
    expect(semSobreposicao(plano)).toBe(true);
    expect(cabeNaJornada(plano, JORNADA_PADRAO)).toBe(true);
    // E nada de trabalho dentro do intervalo tomado pelas reuniões.
    const dentro = plano.blocos.filter(
      (b) => b.tipo === 'trabalho' && b.inicio >= '09:00' && b.inicio < '12:00',
    );
    expect(dentro).toEqual([]);
  });
});

describe('o resumo', () => {
  it('diz quantas cabem, quantas ficam e quanto sobra', () => {
    const jornada = { de: '08:00', ate: '09:30', minutosPorItem: 30 };
    const plano = montarODia([], fazer('A', 'B', 'C', 'D'), jornada);
    expect(resumirPlano(plano)).toBe('3 coisas cabem hoje · 1 fica para amanhã');
  });

  it('concorda no singular', () => {
    const plano = montarODia([], fazer('A'), { de: '08:00', ate: '08:30', minutosPorItem: 30 });
    expect(resumirPlano(plano)).toBe('1 coisa cabe hoje');
  });

  it('dia sem espaço nenhum diz isso', () => {
    const plano = montarODia([], [], { de: '08:00', ate: '08:00', minutosPorItem: 30 });
    expect(resumirPlano(plano)).toBe('Sem espaço no dia');
  });

  it('com a jornada fechada, explica por que não planejou nada', () => {
    // "2 ficam para amanhã" sozinho deixa a pergunta no ar — vi a tela às
    // 20h40, com a jornada fechada às 20h, e ela não dizia o motivo.
    const plano = montarODia([], fazer('A', 'B'), JORNADA_PADRAO, '21:00');
    expect(resumirPlano(plano)).toBe('A jornada de hoje já fechou · 2 ficam para amanhã');
  });

  it('a duração se lê como gente fala', () => {
    expect(duracao(45)).toBe('45min');
    expect(duracao(60)).toBe('1h');
    expect(duracao(90)).toBe('1h30');
    expect(duracao(125)).toBe('2h05');
  });
});

describe('a duração declarada', () => {
  it('é respeitada no lugar do bloco padrão', () => {
    // Encaixar duas horas num bloco de trinta minutos faria o plano prometer
    // um dia que não existe.
    const plano = montarODia(
      [],
      [
        { chave: 'a', titulo: 'Reunião longa', minutos: 120 },
        { chave: 'b', titulo: 'E-mail' },
      ],
      JORNADA_PADRAO,
    );
    expect(plano.blocos.filter((b) => b.tipo === 'trabalho').map((b) => `${b.inicio}–${b.fim}`))
      .toEqual(['08:00–10:00', '10:00–10:30']);
  });

  it('o que não cabe no buraco fica para o próximo, sem ser encolhido', () => {
    // Um compromisso de duas horas não vira meia hora só porque sobrou meia.
    const plano = montarODia(
      [as('08:30', '09:00', 'Chamada')],
      [{ chave: 'longa', titulo: 'Longa', minutos: 120 }],
      JORNADA_PADRAO,
    );
    const trabalhos = plano.blocos.filter((b) => b.tipo === 'trabalho');
    expect(trabalhos).toEqual([
      expect.objectContaining({ inicio: '09:00', fim: '11:00', titulo: 'Longa' }),
    ]);
  });

  it('duração maior que a jornada inteira não cabe, e é dito', () => {
    const plano = montarODia([], [{ chave: 'x', titulo: 'Impossível', minutos: 13 * 60 }], JORNADA_PADRAO);
    expect(plano.blocos.filter((b) => b.tipo === 'trabalho')).toEqual([]);
    expect(plano.naoCoube.map((i) => i.titulo)).toEqual(['Impossível']);
  });

  it('duração torta cai no bloco padrão', () => {
    const plano = montarODia([], [{ chave: 'x', titulo: 'X', minutos: 0 }], JORNADA_PADRAO);
    expect(plano.blocos[0]).toMatchObject({ inicio: '08:00', fim: '08:30' });
  });
});
