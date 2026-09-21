import { describe, it, expect } from 'vitest';
import {
  marcaDe,
  somarMinutos,
  corpoDoEvento,
  quandoAcontece,
  planejar,
  lerChave,
  MARCA,
  MINUTOS_PADRAO,
  eventosParaTela,
  type EventoDoGoogle,
  type ItemParaEspelhar,
} from './google';
import { somarDias } from './rotina';
import { relogioEm } from './ical';

const FUSO = 'America/Sao_Paulo';

/** As três funções que o domínio recebe de fora, ligadas ao que já existe. */
const OPCOES = {
  fuso: FUSO,
  diaSeguinte: (dia: string) => somarDias(dia, 1),
  paraLocal: (iso: string) => {
    const r = relogioEm(new Date(iso), FUSO);
    const dd = (n: number) => String(n).padStart(2, '0');
    return {
      dia: `${r.ano}-${dd(r.mes)}-${dd(r.dia)}`,
      hora: `${dd(r.hora)}:${dd(r.minuto)}`,
    };
  },
};

const item = (dados: Partial<ItemParaEspelhar> = {}): ItemParaEspelhar => ({
  chave: 'tarefa:t1',
  titulo: 'Entregar a proposta',
  dia: '2026-09-17',
  alteradoEm: '2026-09-15T12:00:00.000Z',
  ...dados,
});

const evento = (dados: Partial<EventoDoGoogle> = {}): EventoDoGoogle => ({
  id: 'ev1',
  summary: 'Entregar a proposta',
  updated: '2026-09-15T12:00:00.000Z',
  start: { date: '2026-09-17' },
  end: { date: '2026-09-18' },
  extendedProperties: { private: { [MARCA]: 'tarefa:t1' } },
  ...dados,
});

describe('a marca', () => {
  it('diz de quem é o evento', () => {
    expect(marcaDe(evento())).toBe('tarefa:t1');
    expect(marcaDe(evento({ extendedProperties: undefined }))).toBeNull();
    expect(marcaDe(evento({ extendedProperties: { private: {} } }))).toBeNull();
  });

  it('a chave se lê de volta', () => {
    expect(lerChave('tarefa:abc')).toEqual({ tipo: 'tarefa', id: 'abc' });
    expect(lerChave('peca:xyz')).toEqual({ tipo: 'peca', id: 'xyz' });
  });

  it('chave estranha não vira registro nenhum', () => {
    // Alguém pode pôr `msl` numa propriedade privada à mão. Não é motivo para
    // o sistema tentar editar um registro que não existe.
    expect(lerChave('rotina:r1')).toBeNull();
    expect(lerChave('semdoispontos')).toBeNull();
    expect(lerChave('tarefa:')).toBeNull();
  });

  it('o id pode conter dois-pontos, e só o primeiro separa', () => {
    expect(lerChave('tarefa:a:b')).toEqual({ tipo: 'tarefa', id: 'a:b' });
  });
});

describe('traduzir para evento', () => {
  it('sem hora vira dia inteiro, e o fim é o dia seguinte', () => {
    // No iCalendar o fim de um evento de dia inteiro é exclusivo; pôr o mesmo
    // dia nos dois faz o Google recusar.
    expect(corpoDoEvento(item(), FUSO, OPCOES.diaSeguinte)).toEqual({
      summary: 'Entregar a proposta',
      start: { date: '2026-09-17' },
      end: { date: '2026-09-18' },
      extendedProperties: { private: { msl: 'tarefa:t1' } },
    });
  });

  it('com hora manda o fuso, e não um instante calculado aqui', () => {
    // Calcular o instante eu mesmo poria o compromisso uma hora fora sempre
    // que o horário de verão mudasse em qualquer lugar.
    const corpo = corpoDoEvento(item({ hora: '14:00' }), FUSO, OPCOES.diaSeguinte);
    expect(corpo.start).toEqual({ dateTime: '2026-09-17T14:00:00', timeZone: FUSO });
    expect(corpo.end).toEqual({ dateTime: '2026-09-17T14:30:00', timeZone: FUSO });
  });

  it('o bloco padrão é o que separa começo de fim', () => {
    const corpo = corpoDoEvento(item({ hora: '09:00' }), FUSO, OPCOES.diaSeguinte);
    expect(corpo.end.dateTime).toBe(`2026-09-17T${somarMinutos('09:00', MINUTOS_PADRAO)}:00`);
  });

  it('a hora não escapa do dia', () => {
    expect(somarMinutos('23:50', 30)).toBe('23:59');
    expect(somarMinutos('00:00', 30)).toBe('00:30');
  });

  it('a marca viaja junto, sempre', () => {
    expect(corpoDoEvento(item({ hora: '10:00' }), FUSO, OPCOES.diaSeguinte).extendedProperties)
      .toEqual({ private: { msl: 'tarefa:t1' } });
  });
});

describe('ler de volta quando o evento acontece', () => {
  it('dia inteiro não ganha fuso nenhum', () => {
    // Converter aqui moveria "17 de setembro" para o 16 de quem está a oeste.
    expect(quandoAcontece(evento(), OPCOES.paraLocal)).toEqual({ dia: '2026-09-17' });
  });

  it('com hora vira dia e hora locais', () => {
    const comHora = evento({ start: { dateTime: '2026-09-17T17:00:00Z' }, end: undefined });
    expect(quandoAcontece(comHora, OPCOES.paraLocal)).toEqual({
      dia: '2026-09-17',
      hora: '14:00',
    });
  });

  it('instante que atravessa a meia-noite muda o dia local', () => {
    const tarde = evento({ start: { dateTime: '2026-09-18T01:00:00Z' } });
    expect(quandoAcontece(tarde, OPCOES.paraLocal)).toEqual({ dia: '2026-09-17', hora: '22:00' });
  });

  it('evento sem começo nenhum devolve nada, em vez de inventar', () => {
    expect(quandoAcontece(evento({ start: undefined }), OPCOES.paraLocal)).toBeNull();
  });
});

describe('o plano', () => {
  it('item sem espelho é criado', () => {
    const plano = planejar([item()], [], OPCOES);
    expect(plano.empurrar).toEqual([
      { tipo: 'criar', chave: 'tarefa:t1', corpo: expect.objectContaining({ summary: 'Entregar a proposta' }) },
    ]);
    expect(plano.puxar).toEqual([]);
  });

  it('item igual ao espelho não gera passo nenhum', () => {
    // É o caso mais comum, e o que garante que sincronizar de novo é de graça.
    expect(planejar([item()], [evento()], OPCOES)).toEqual({
      empurrar: [],
      puxar: [],
      deles: [],
    });
  });

  it('título mudado no MSL empurra para o Google', () => {
    const plano = planejar(
      [item({ titulo: 'Outro nome', alteradoEm: '2026-09-16T12:00:00.000Z' })],
      [evento()],
      OPCOES,
    );
    expect(plano.empurrar).toHaveLength(1);
    expect(plano.empurrar[0]).toMatchObject({ tipo: 'atualizar', eventoId: 'ev1' });
    expect(plano.puxar).toEqual([]);
  });

  it('dia mudado no Google puxa para o MSL', () => {
    // O evento foi arrastado lá, e depois do que o MSL sabia.
    const arrastado = evento({
      start: { date: '2026-09-20' },
      end: { date: '2026-09-21' },
      updated: '2026-09-16T12:00:00.000Z',
    });
    const plano = planejar([item()], [arrastado], OPCOES);

    expect(plano.puxar).toEqual([{ tipo: 'puxar', chave: 'tarefa:t1', dia: '2026-09-20', hora: undefined }]);
    expect(plano.empurrar).toEqual([]);
  });

  it('o mais recente ganha, e o empate fica com o MSL', () => {
    const mesmoInstante = '2026-09-15T12:00:00.000Z';
    const plano = planejar(
      [item({ titulo: 'Do MSL', alteradoEm: mesmoInstante })],
      [evento({ summary: 'Do Google', updated: mesmoInstante })],
      OPCOES,
    );
    // Empate empurra: o registro é meu, e o evento é o espelho dele.
    expect(plano.empurrar[0]).toMatchObject({ tipo: 'atualizar' });
    expect(plano.puxar).toEqual([]);
  });

  it('evento arrastado para um horário vem com a hora', () => {
    const comHora = evento({
      start: { dateTime: '2026-09-17T17:00:00Z' },
      end: { dateTime: '2026-09-17T18:00:00Z' },
      updated: '2026-09-16T12:00:00.000Z',
    });
    expect(planejar([item()], [comHora], OPCOES).puxar).toEqual([
      { tipo: 'puxar', chave: 'tarefa:t1', dia: '2026-09-17', hora: '14:00' },
    ]);
  });

  it('espelho sem dono é apagado', () => {
    // O registro foi apagado, concluído, ou saiu da janela. Um espelho órfão é
    // um compromisso fantasma que ninguém consegue explicar depois.
    const plano = planejar([], [evento()], OPCOES);
    expect(plano.empurrar).toEqual([{ tipo: 'apagar', chave: 'tarefa:t1', eventoId: 'ev1' }]);
  });

  it('evento do Google não é tocado, e vai para a tela', () => {
    const deles = evento({ id: 'g1', summary: 'Dentista', extendedProperties: undefined });
    const plano = planejar([], [deles], OPCOES);
    expect(plano.empurrar).toEqual([]);
    expect(plano.puxar).toEqual([]);
    expect(plano.deles.map((e) => e.summary)).toEqual(['Dentista']);
  });

  it('o cancelado não conta como espelho existente', () => {
    // Tratar lápide como evento faria o plano achar que o espelho está lá
    // quando ele já foi para o lixo — e o item nunca mais seria recriado.
    const plano = planejar([item()], [evento({ status: 'cancelled' })], OPCOES);
    expect(plano.empurrar).toEqual([
      { tipo: 'criar', chave: 'tarefa:t1', corpo: expect.anything() },
    ]);
  });

  it('e o cancelado também não aparece na tela', () => {
    const plano = planejar([], [evento({ extendedProperties: undefined, status: 'cancelled' })], OPCOES);
    expect(plano.deles).toEqual([]);
  });

  it('duplicata da mesma marca é apagada, e sobra uma', () => {
    // Acontece quando uma criação responde depois de outra já ter gravado. Sem
    // isto, a duplicata se multiplica a cada sincronização.
    const plano = planejar(
      [item()],
      [evento({ id: 'ev1' }), evento({ id: 'ev2' }), evento({ id: 'ev3' })],
      OPCOES,
    );
    const apagados = plano.empurrar.filter((p) => p.tipo === 'apagar').map((p) => p.eventoId);
    expect(apagados.sort()).toEqual(['ev2', 'ev3']);
    // E o que sobrou já estava igual, então não há mais nada a fazer.
    expect(plano.empurrar.filter((p) => p.tipo !== 'apagar')).toEqual([]);
  });

  it('sincronizar duas vezes não faz nada na segunda', () => {
    // A propriedade que importa: depois de aplicado, o plano seguinte é vazio.
    const itens = [item(), item({ chave: 'peca:p1', titulo: 'Carrossel', dia: '2026-09-19' })];
    const primeiro = planejar(itens, [], OPCOES);
    expect(primeiro.empurrar).toHaveLength(2);

    // O que o Google teria depois de aplicar.
    const depois: EventoDoGoogle[] = primeiro.empurrar.map((passo, i) => ({
      id: `novo-${i}`,
      summary: (passo as { corpo: { summary: string } }).corpo.summary,
      updated: '2026-09-17T00:00:00.000Z',
      start: (passo as { corpo: { start: EventoDoGoogle['start'] } }).corpo.start,
      end: (passo as { corpo: { end: EventoDoGoogle['end'] } }).corpo.end,
      extendedProperties: { private: { [MARCA]: passo.chave! } },
    }));

    expect(planejar(itens, depois, OPCOES)).toEqual({ empurrar: [], puxar: [], deles: [] });
  });

  it('a ordem do plano é estável', () => {
    const itens = [item({ chave: 'tarefa:b' }), item({ chave: 'tarefa:a' })];
    expect(planejar(itens, [], OPCOES)).toEqual(planejar([...itens].reverse(), [], OPCOES));
  });

  it('cria antes de apagar', () => {
    // Apagar primeiro deixaria a agenda vazia por um instante se algo falhar
    // no meio — e o que falta é sempre pior de perceber que o que sobra.
    const plano = planejar([item({ chave: 'tarefa:novo' })], [evento()], OPCOES);
    expect(plano.empurrar.map((p) => p.tipo)).toEqual(['criar', 'apagar']);
  });
});

describe('traduzir para o calendário', () => {
  const AJUDA = {
    somarDias,
    distanciaEmDias: (a: string, b: string) =>
      Math.round(
        (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000,
      ),
    paraLocal: OPCOES.paraLocal,
  };

  const naTela = (eventos: EventoDoGoogle[], de = '2026-09-01', ate = '2026-09-30') =>
    eventosParaTela(eventos, de, ate, AJUDA);

  it('dia inteiro de um dia só aparece uma vez', () => {
    expect(naTela([evento({ extendedProperties: undefined })]).map((e) => e.dia)).toEqual([
      '2026-09-17',
    ]);
  });

  it('evento de vários dias aparece em cada dia, sem o último', () => {
    // O fim de um evento de dia inteiro é exclusivo: 17 a 20 são três dias.
    const viagem = evento({
      extendedProperties: undefined,
      summary: 'Viagem',
      start: { date: '2026-09-17' },
      end: { date: '2026-09-20' },
    });
    expect(naTela([viagem]).map((e) => e.dia)).toEqual([
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
    ]);
  });

  it('recorta na janela', () => {
    const ferias = evento({
      extendedProperties: undefined,
      start: { date: '2026-08-28' },
      end: { date: '2026-09-05' },
    });
    expect(naTela([ferias]).map((e) => e.dia)).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
    ]);
  });

  it('com hora traz o fim do mesmo dia', () => {
    const consulta = evento({
      extendedProperties: undefined,
      summary: 'Dentista',
      location: 'Rua das Flores',
      start: { dateTime: '2026-09-17T17:00:00Z' },
      end: { dateTime: '2026-09-17T18:00:00Z' },
    });
    expect(naTela([consulta])[0]).toMatchObject({
      titulo: 'Dentista',
      dia: '2026-09-17',
      hora: '14:00',
      fim: '15:00',
      local: 'Rua das Flores',
      diaInteiro: false,
    });
  });

  it('o cancelado não aparece', () => {
    expect(naTela([evento({ extendedProperties: undefined, status: 'cancelled' })])).toEqual([]);
  });

  it('evento sem título ganha um rótulo em vez de sumir', () => {
    expect(naTela([evento({ extendedProperties: undefined, summary: '  ' })])[0].titulo).toBe(
      '(sem título)',
    );
  });

  it('cada dia tem chave própria, para o React não reclamar', () => {
    const viagem = evento({
      extendedProperties: undefined,
      start: { date: '2026-09-17' },
      end: { date: '2026-09-20' },
    });
    const chaves = naTela([viagem]).map((e) => e.chave);
    expect(new Set(chaves).size).toBe(3);
  });

  it('a ordem é por dia, com dia inteiro antes do que tem hora', () => {
    const tarde = evento({ id: 'a', extendedProperties: undefined, summary: 'Tarde', start: { dateTime: '2026-09-17T18:00:00Z' }, end: undefined });
    const feriado = evento({ id: 'b', extendedProperties: undefined, summary: 'Feriado' });
    const manha = evento({ id: 'c', extendedProperties: undefined, summary: 'Manhã', start: { dateTime: '2026-09-17T12:00:00Z' }, end: undefined });

    expect(naTela([tarde, feriado, manha]).map((e) => e.titulo)).toEqual([
      'Feriado',
      'Manhã',
      'Tarde',
    ]);
  });
});
