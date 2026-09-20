import { describe, it, expect } from 'vitest';
import {
  desdobrar,
  lerPropriedade,
  desescapar,
  relogioEm,
  instanteDe,
  lerMomento,
  lerRRule,
  diasDaRepeticao,
  lerAgenda,
  eventosDoDia,
  TETO_DE_OCORRENCIAS,
  FUSO_PADRAO,
} from './ical';

/** Monta um arquivo iCal com as linhas dadas dentro de um VEVENT. */
function arquivo(...eventos: string[][]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'X-WR-CALNAME:Minha agenda',
    ...eventos.flatMap((linhas) => ['BEGIN:VEVENT', ...linhas, 'END:VEVENT']),
    'END:VCALENDAR',
  ].join('\r\n');
}

const prop = (linha: string) => lerPropriedade(linha)!;

describe('o texto', () => {
  it('desdobra a linha que continua na seguinte', () => {
    // O RFC quebra em 75 octetos e continua com espaço. Sem desdobrar, o
    // título chega cortado na tela.
    const texto = 'SUMMARY:Reunião de alinhamento com\r\n  o time de produto';
    expect(desdobrar(texto)).toEqual(['SUMMARY:Reunião de alinhamento com o time de produto']);
  });

  it('desdobra com tabulação também, e aceita \\n sozinho', () => {
    expect(desdobrar('SUMMARY:Um\n\tdois')).toEqual(['SUMMARY:Umdois']);
  });

  it('a continuação na primeira linha não vira lixo', () => {
    expect(desdobrar(' sozinho')).toEqual([' sozinho']);
  });

  it('separa nome, parâmetros e valor', () => {
    expect(prop('DTSTART;TZID=America/Sao_Paulo:20260917T140000')).toEqual({
      nome: 'DTSTART',
      parametros: { TZID: 'America/Sao_Paulo' },
      valor: '20260917T140000',
    });
  });

  it('o valor pode conter dois-pontos — só o primeiro separa', () => {
    expect(prop('URL:https://exemplo.com/a:b').valor).toBe('https://exemplo.com/a:b');
  });

  it('tira as aspas do parâmetro', () => {
    expect(prop('DTSTART;TZID="America/Sao_Paulo":20260917T140000').parametros.TZID).toBe(
      'America/Sao_Paulo',
    );
  });

  it('desfaz o escape do RFC', () => {
    expect(desescapar('Reunião com Ana\\, Bruno\\; e Carla')).toBe('Reunião com Ana, Bruno; e Carla');
    expect(desescapar('Linha um\\nLinha dois')).toBe('Linha um\nLinha dois');
    expect(desescapar('Barra\\\\invertida')).toBe('Barra\\invertida');
  });
});

describe('tempo', () => {
  it('lê o relógio de parede de um instante, num fuso', () => {
    // 2026-09-17T12:00Z é 09:00 em São Paulo (UTC−3).
    const r = relogioEm(new Date('2026-09-17T12:00:00Z'), 'America/Sao_Paulo');
    expect(r).toEqual({ ano: 2026, mes: 9, dia: 17, hora: 9, minuto: 0 });
  });

  it('a meia-noite é hora 0, e não hora 24', () => {
    const r = relogioEm(new Date('2026-09-17T03:00:00Z'), 'America/Sao_Paulo');
    expect(r.hora).toBe(0);
    expect(r.dia).toBe(17);
  });

  it('volta de relógio de parede para instante', () => {
    const instante = instanteDe(
      { ano: 2026, mes: 9, dia: 17, hora: 9, minuto: 0 },
      'America/Sao_Paulo',
    );
    expect(instante.toISOString()).toBe('2026-09-17T12:00:00.000Z');
  });

  it('a volta funciona para fuso com horário de verão', () => {
    // Nova York em setembro está em UTC−4.
    const instante = instanteDe(
      { ano: 2026, mes: 9, dia: 17, hora: 9, minuto: 0 },
      'America/New_York',
    );
    expect(instante.toISOString()).toBe('2026-09-17T13:00:00.000Z');

    // E em janeiro, UTC−5.
    const inverno = instanteDe(
      { ano: 2026, mes: 1, dia: 17, hora: 9, minuto: 0 },
      'America/New_York',
    );
    expect(inverno.toISOString()).toBe('2026-01-17T14:00:00.000Z');
  });
});

describe('DTSTART nas formas que o Google emite', () => {
  it('dia inteiro fica no dia, sem fuso nenhum', () => {
    // Inventar um fuso aqui transformaria "17 de setembro" em "16 às 21h".
    expect(lerMomento(prop('DTSTART;VALUE=DATE:20260917'))).toEqual({
      dia: '2026-09-17',
      diaInteiro: true,
    });
  });

  it('oito dígitos sem VALUE=DATE também é dia inteiro', () => {
    expect(lerMomento(prop('DTSTART:20260917'))?.diaInteiro).toBe(true);
  });

  it('instante em UTC vira dia e hora locais', () => {
    // 17:00Z é 14:00 em São Paulo.
    expect(lerMomento(prop('DTSTART:20260917T170000Z'))).toEqual({
      dia: '2026-09-17',
      hora: '14:00',
      diaInteiro: false,
    });
  });

  it('UTC que atravessa a meia-noite muda o dia local', () => {
    // 2026-09-18T01:00Z é ainda dia 17, às 22h, em São Paulo. É exatamente a
    // armadilha que o resto do domínio já documenta sobre cortar ISO.
    expect(lerMomento(prop('DTSTART:20260918T010000Z'))).toEqual({
      dia: '2026-09-17',
      hora: '22:00',
      diaInteiro: false,
    });
  });

  it('TZID do meu fuso é o relógio de parede, sem conversão', () => {
    expect(lerMomento(prop('DTSTART;TZID=America/Sao_Paulo:20260917T140000'))).toEqual({
      dia: '2026-09-17',
      hora: '14:00',
      diaInteiro: false,
    });
  });

  it('TZID de outro fuso é convertido', () => {
    // 09:00 em Nova York, em setembro, é 10:00 em São Paulo.
    expect(lerMomento(prop('DTSTART;TZID=America/New_York:20260917T090000'))).toEqual({
      dia: '2026-09-17',
      hora: '10:00',
      diaInteiro: false,
    });
  });

  it('sem Z e sem TZID é flutuante: a hora é a minha', () => {
    expect(lerMomento(prop('DTSTART:20260917T140000'))).toEqual({
      dia: '2026-09-17',
      hora: '14:00',
      diaInteiro: false,
    });
  });

  it('TZID que o motor não conhece mostra a hora crua em vez de sumir', () => {
    const lido = lerMomento(prop('DTSTART;TZID=Marte/Olympus:20260917T140000'));
    expect(lido).toEqual({ dia: '2026-09-17', hora: '14:00', diaInteiro: false });
  });

  it('valor ilegível devolve nulo em vez de quebrar o arquivo inteiro', () => {
    expect(lerMomento(prop('DTSTART:qualquer coisa'))).toBeNull();
  });
});

describe('RRULE', () => {
  it('lê a regra semanal com dias', () => {
    expect(lerRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=2')).toMatchObject({
      freq: 'WEEKLY',
      intervalo: 2,
      porDia: [1, 3, 5],
    });
  });

  it('UNTIL vira dia local', () => {
    expect(lerRRule('FREQ=DAILY;UNTIL=20261231T235959Z')?.ate).toBe('2026-12-31');
  });

  it('FREQ que eu não entendo devolve nulo, e quem chama avisa', () => {
    expect(lerRRule('FREQ=HOURLY')).toBeNull();
    expect(lerRRule('INTERVAL=2')).toBeNull();
  });

  it('INTERVAL torto não vira laço eterno', () => {
    expect(lerRRule('FREQ=DAILY;INTERVAL=0')?.intervalo).toBe(1);
    expect(lerRRule('FREQ=DAILY;INTERVAL=-3')?.intervalo).toBe(1);
    expect(lerRRule('FREQ=DAILY;INTERVAL=abacaxi')?.intervalo).toBe(1);
  });

  it('diz o que ignorou, em vez de calar', () => {
    expect(lerRRule('FREQ=MONTHLY;BYSETPOS=-1;BYDAY=FR')?.ignoradas).toEqual(['BYSETPOS']);
  });

  it('o prefixo numérico do BYDAY é tolerado', () => {
    // "2MO" é a segunda segunda do mês. Eu não sei fazer a conta do "2", mas
    // reconhecer a segunda-feira é melhor que descartar a regra inteira.
    expect(lerRRule('FREQ=MONTHLY;BYDAY=2MO')?.porDia).toEqual([1]);
  });
});

describe('expandir a repetição', () => {
  const de = '2026-09-01';
  const ate = '2026-09-30';

  it('sem regra, só o próprio dia, e só se couber na janela', () => {
    expect(diasDaRepeticao('2026-09-17', null, de, ate)).toEqual(['2026-09-17']);
    expect(diasDaRepeticao('2026-08-17', null, de, ate)).toEqual([]);
  });

  it('diária a cada 3 dias fica ancorada no começo', () => {
    // Ancorar na data original é o que mantém o passo alinhado; recomeçar a
    // contagem na borda da janela daria outros dias.
    const dias = diasDaRepeticao('2026-08-30', lerRRule('FREQ=DAILY;INTERVAL=3'), de, '2026-09-10');
    expect(dias).toEqual(['2026-09-02', '2026-09-05', '2026-09-08']);
  });

  it('semanal com BYDAY dá todos os dias pedidos', () => {
    // Setembro de 2026: dia 1 é terça. Segundas: 7, 14, 21, 28. Sextas: 4, 11, 18, 25.
    const dias = diasDaRepeticao('2026-09-04', lerRRule('FREQ=WEEKLY;BYDAY=MO,FR'), de, ate);
    expect(dias).toEqual([
      '2026-09-04',
      '2026-09-07',
      '2026-09-11',
      '2026-09-14',
      '2026-09-18',
      '2026-09-21',
      '2026-09-25',
      '2026-09-28',
    ]);
  });

  it('nada antes do começo da série, mesmo que o BYDAY aponte para trás', () => {
    // A série nasce numa sexta (4) e inclui segunda. A segunda daquela semana
    // é o dia 31 de agosto, que é antes de a série existir.
    const dias = diasDaRepeticao('2026-09-04', lerRRule('FREQ=WEEKLY;BYDAY=MO,FR'), '2026-08-01', '2026-09-08');
    expect(dias[0]).toBe('2026-09-04');
  });

  it('semanal sem BYDAY cai no dia da semana do começo', () => {
    const dias = diasDaRepeticao('2026-09-03', lerRRule('FREQ=WEEKLY'), de, ate);
    expect(dias).toEqual(['2026-09-03', '2026-09-10', '2026-09-17', '2026-09-24']);
  });

  it('COUNT conta desde a primeira, inclusive as que ficaram fora da janela', () => {
    // Cinco ocorrências a partir de 30/08. As duas primeiras (30/08 e 31/08)
    // estão fora da janela mas gastam a contagem — como o RFC manda.
    const dias = diasDaRepeticao('2026-08-30', lerRRule('FREQ=DAILY;COUNT=5'), de, ate);
    expect(dias).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
  });

  it('UNTIL corta a série', () => {
    // Como o Google costuma emitir: fim do dia, em UTC.
    const dias = diasDaRepeticao('2026-09-01', lerRRule('FREQ=WEEKLY;UNTIL=20260915T235959Z'), de, ate);
    expect(dias).toEqual(['2026-09-01', '2026-09-08', '2026-09-15']);
  });

  it('UNTIL à meia-noite em UTC é o dia anterior aqui, e isso é correto', () => {
    // 15/09 00:00Z é 14/09 às 21h em São Paulo: a série acaba antes de o dia
    // 15 começar. Arredondar para o dia 15 mostraria um compromisso que a
    // regra já tinha encerrado.
    const dias = diasDaRepeticao('2026-09-01', lerRRule('FREQ=WEEKLY;UNTIL=20260915T000000Z'), de, ate);
    expect(dias).toEqual(['2026-09-01', '2026-09-08']);
  });

  it('EXDATE tira o dia sem quebrar o resto', () => {
    const dias = diasDaRepeticao('2026-09-01', lerRRule('FREQ=WEEKLY'), de, ate, ['2026-09-08']);
    expect(dias).toEqual(['2026-09-01', '2026-09-15', '2026-09-22', '2026-09-29']);
  });

  it('mensal no dia 31 pula os meses que não têm dia 31', () => {
    // O RFC manda pular. Empurrar para o dia 1º do mês seguinte inventaria um
    // compromisso num dia em que ele não existe.
    const dias = diasDaRepeticao('2026-01-31', lerRRule('FREQ=MONTHLY'), '2026-01-01', '2026-05-31');
    expect(dias).toEqual(['2026-01-31', '2026-03-31', '2026-05-31']);
  });

  it('anual repete na mesma data', () => {
    const dias = diasDaRepeticao('2020-03-04', lerRRule('FREQ=YEARLY'), '2026-01-01', '2027-12-31');
    expect(dias).toEqual(['2026-03-04', '2027-03-04']);
  });

  it('regra sem fim não expande para sempre', () => {
    const dias = diasDaRepeticao('2000-01-01', lerRRule('FREQ=DAILY'), '2000-01-01', '2100-01-01');
    expect(dias).toHaveLength(TETO_DE_OCORRENCIAS);
  });
});

describe('o arquivo inteiro', () => {
  const JANELA = ['2026-09-01', '2026-09-30'] as const;

  it('lê um evento simples com hora', () => {
    const texto = arquivo([
      'UID:abc123',
      'SUMMARY:Consulta no dentista',
      'LOCATION:Rua das Flores\\, 100',
      'DTSTART;TZID=America/Sao_Paulo:20260917T140000',
      'DTEND;TZID=America/Sao_Paulo:20260917T150000',
    ]);

    const agenda = lerAgenda(texto, ...JANELA);
    expect(agenda.nome).toBe('Minha agenda');
    expect(agenda.eventos).toEqual([
      {
        chave: 'abc123@2026-09-17',
        uid: 'abc123',
        titulo: 'Consulta no dentista',
        dia: '2026-09-17',
        hora: '14:00',
        fim: '15:00',
        local: 'Rua das Flores, 100',
        diaInteiro: false,
      },
    ]);
  });

  it('o cancelado não aparece', () => {
    // Ele continua no arquivo como lápide. Mostrar seria pior que nada.
    const texto = arquivo([
      'UID:x',
      'SUMMARY:Reunião desmarcada',
      'STATUS:CANCELLED',
      'DTSTART:20260917T170000Z',
    ]);
    expect(lerAgenda(texto, ...JANELA).eventos).toEqual([]);
  });

  it('evento sem título ganha um rótulo em vez de sumir', () => {
    const texto = arquivo(['UID:y', 'DTSTART;VALUE=DATE:20260917']);
    expect(lerAgenda(texto, ...JANELA).eventos[0].titulo).toBe('(sem título)');
  });

  it('evento sem DTSTART é descartado, e não derruba o arquivo', () => {
    const texto = arquivo(
      ['UID:sem-data', 'SUMMARY:Sem data'],
      ['UID:com-data', 'SUMMARY:Com data', 'DTSTART;VALUE=DATE:20260917'],
    );
    expect(lerAgenda(texto, ...JANELA).eventos.map((e) => e.titulo)).toEqual(['Com data']);
  });

  it('evento de dia inteiro de vários dias aparece em cada dia, sem o último', () => {
    // DTEND de dia inteiro é exclusivo: 17 a 20 acontece em 17, 18 e 19.
    const texto = arquivo([
      'UID:viagem',
      'SUMMARY:Viagem',
      'DTSTART;VALUE=DATE:20260917',
      'DTEND;VALUE=DATE:20260920',
    ]);
    expect(lerAgenda(texto, ...JANELA).eventos.map((e) => e.dia)).toEqual([
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
    ]);
  });

  it('evento de vários dias que começou antes da janela ainda aparece dentro dela', () => {
    const texto = arquivo([
      'UID:ferias',
      'SUMMARY:Férias',
      'DTSTART;VALUE=DATE:20260828',
      'DTEND;VALUE=DATE:20260905',
    ]);
    const dias = lerAgenda(texto, ...JANELA).eventos.map((e) => e.dia);
    expect(dias).toEqual(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']);
  });

  it('a reunião semanal aparece em todas as semanas', () => {
    const texto = arquivo([
      'UID:semanal',
      'SUMMARY:Alinhamento',
      'DTSTART;TZID=America/Sao_Paulo:20260903T100000',
      'RRULE:FREQ=WEEKLY;BYDAY=TH',
    ]);
    const eventos = lerAgenda(texto, ...JANELA).eventos;
    expect(eventos.map((e) => e.dia)).toEqual([
      '2026-09-03',
      '2026-09-10',
      '2026-09-17',
      '2026-09-24',
    ]);
    // A hora vale para todas as ocorrências, não só a primeira.
    expect(eventos.every((e) => e.hora === '10:00')).toBe(true);
    // E cada ocorrência tem chave própria, ou o React reclamaria de chave repetida.
    expect(new Set(eventos.map((e) => e.chave)).size).toBe(4);
  });

  it('a ordem é por dia, com dia inteiro antes do que tem hora', () => {
    const texto = arquivo(
      ['UID:a', 'SUMMARY:Tarde', 'DTSTART;TZID=America/Sao_Paulo:20260917T150000'],
      ['UID:b', 'SUMMARY:Feriado', 'DTSTART;VALUE=DATE:20260917'],
      ['UID:c', 'SUMMARY:Manhã', 'DTSTART;TZID=America/Sao_Paulo:20260917T090000'],
    );
    expect(lerAgenda(texto, ...JANELA).eventos.map((e) => e.titulo)).toEqual([
      'Feriado',
      'Manhã',
      'Tarde',
    ]);
  });

  it('a mesma agenda lida duas vezes dá exatamente o mesmo resultado', () => {
    const texto = arquivo(
      ['UID:a', 'SUMMARY:Um', 'DTSTART;VALUE=DATE:20260917'],
      ['UID:b', 'SUMMARY:Dois', 'DTSTART;VALUE=DATE:20260917'],
    );
    expect(lerAgenda(texto, ...JANELA)).toEqual(lerAgenda(texto, ...JANELA));
  });

  it('avisa o que ignorou, para a tela poder dizer', () => {
    const texto = arquivo([
      'UID:complicado',
      'SUMMARY:Última sexta do mês',
      'DTSTART;VALUE=DATE:20260925',
      'RRULE:FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1',
    ]);
    const agenda = lerAgenda(texto, ...JANELA);
    expect(agenda.avisos).toEqual(['"Última sexta do mês" usa BYSETPOS, que eu ignoro']);
    // E mostra assim mesmo: esconder um compromisso é pior que mostrar demais.
    expect(agenda.eventos.length).toBeGreaterThan(0);
  });

  it('arquivo vazio ou lixo não quebra', () => {
    expect(lerAgenda('', ...JANELA).eventos).toEqual([]);
    expect(lerAgenda('isto não é um calendário', ...JANELA).eventos).toEqual([]);
    expect(lerAgenda('BEGIN:VEVENT\r\nSUMMARY:Sem fim', ...JANELA).eventos).toEqual([]);
  });

  it('eventosDoDia recorta o dia', () => {
    const texto = arquivo(
      ['UID:a', 'SUMMARY:Hoje', 'DTSTART;VALUE=DATE:20260917'],
      ['UID:b', 'SUMMARY:Amanhã', 'DTSTART;VALUE=DATE:20260918'],
    );
    const agenda = lerAgenda(texto, ...JANELA);
    expect(eventosDoDia(agenda, '2026-09-17').map((e) => e.titulo)).toEqual(['Hoje']);
  });

  it('o fuso é escolhível, e muda o dia de quem está na borda', () => {
    const texto = arquivo(['UID:a', 'SUMMARY:Tarde da noite', 'DTSTART:20260918T010000Z']);
    expect(lerAgenda(texto, ...JANELA, FUSO_PADRAO).eventos[0].dia).toBe('2026-09-17');
    expect(lerAgenda(texto, ...JANELA, 'Europe/Lisbon').eventos[0].dia).toBe('2026-09-18');
  });
});
