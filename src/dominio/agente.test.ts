import { describe, it, expect } from 'vitest';
import {
  normalizar,
  lerPrazo,
  lerHora,
  interpretar,
  acharTarefas,
  responder,
  exigeConfirmacao,
  type CompromissoExterno,
} from './agente';
import { bancoVazio, type Banco, type Tarefa, type Lancamento, type Rotina } from '../dados/esquema';

/** 2026-09-17 é uma quinta-feira. Toda data escrita aqui parte dela. */
const HOJE = '2026-09-17';

function tarefa(extras: Partial<Tarefa> = {}): Tarefa {
  return {
    id: 't1',
    criadoEm: '2026-09-01T09:00:00.000Z',
    alteradoEm: '2026-09-01T09:00:00.000Z',
    titulo: 'Tarefa',
    contexto: 'pessoal',
    ...extras,
  };
}

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
    criadoEm: '2026-09-01T09:00:00.000Z',
    alteradoEm: '2026-09-01T09:00:00.000Z',
    titulo: 'Ler 20 páginas',
    contexto: 'pessoal',
    icone: 'book-open',
    inicioEm: '2026-01-01',
    arquivada: false,
    recorrencia: { tipo: 'diaria' },
    ...extras,
  };
}

function banco(extras: Partial<Banco> = {}): Banco {
  return { ...bancoVazio(), ...extras };
}

/** O Intl separa "R$" do número com U+00A0, e não com espaço comum. */
const reais = (valor: string) => `R$\u00a0${valor}`;

/** Todo texto de uma resposta, para procurar sem saber em qual bloco caiu. */
function textoDe(resposta: ReturnType<typeof responder>): string {
  const partes = [resposta.titulo];
  for (const b of resposta.blocos) {
    if (b.tipo === 'texto') partes.push(b.texto);
    if (b.tipo === 'metricas') partes.push(...b.itens.map((i) => `${i.rotulo} ${i.valor}`));
    if (b.tipo === 'lista') {
      partes.push(b.titulo ?? '');
      partes.push(...b.itens.map((i) => `${i.texto} ${i.detalhe ?? ''}`));
    }
    if (b.tipo === 'barras') partes.push(...b.itens.map((i) => `${i.rotulo} ${i.valor}`));
    if (b.tipo === 'atalho') partes.push(b.rotulo);
  }
  return partes.join(' | ');
}

describe('normalizar', () => {
  it('tira acento, caixa e espaço sobrando', () => {
    expect(normalizar('  Como  foi  a MINHA Semana? ')).toBe('como foi a minha semana?');
    expect(normalizar('Ç é ã')).toBe('c e a');
  });
});

describe('ler a data escrita na frase', () => {
  it('entende hoje, amanhã e ontem', () => {
    expect(lerPrazo('pagar a conta hoje', HOJE).prazo).toBe('2026-09-17');
    expect(lerPrazo('pagar a conta amanhã', HOJE).prazo).toBe('2026-09-18');
    expect(lerPrazo('pagar a conta ontem', HOJE).prazo).toBe('2026-09-16');
  });

  it('"depois de amanhã" não é lido como "amanhã"', () => {
    // A segunda expressão casa dentro da primeira: a ordem do teste é a regra.
    expect(lerPrazo('ligar depois de amanhã', HOJE).prazo).toBe('2026-09-19');
  });

  it('tira a data do texto, para o título não envelhecer', () => {
    // "Pagar o IPVA amanhã" vira mentira amanhã.
    expect(lerPrazo('pagar o IPVA amanhã', HOJE).resto).toBe('pagar o IPVA');
  });

  it('preserva acento e caixa do que sobrou', () => {
    // Normalizar para comparar e devolver o normalizado estragaria o título.
    const { resto } = lerPrazo('revisar a proposta do João amanhã', HOJE);
    expect(resto).toBe('revisar a proposta do João');
  });

  it('limpa a preposição que ficou órfã', () => {
    expect(lerPrazo('entregar o relatório para sexta', HOJE).resto).toBe('entregar o relatório');
    expect(lerPrazo('entregar o relatório até amanhã', HOJE).resto).toBe('entregar o relatório');
    expect(lerPrazo('ir ao médico na terça', HOJE).resto).toBe('ir ao médico');
  });

  it('um dia da semana é o próximo, e hoje conta', () => {
    // Hoje é quinta.
    expect(lerPrazo('reunião sexta', HOJE).prazo).toBe('2026-09-18');
    expect(lerPrazo('reunião quinta', HOJE).prazo).toBe(HOJE);
    expect(lerPrazo('reunião quarta', HOJE).prazo).toBe('2026-09-23');
    expect(lerPrazo('reunião sábado', HOJE).prazo).toBe('2026-09-19');
  });

  it('aceita o dia da semana sem acento e com -feira', () => {
    expect(lerPrazo('reunião terça-feira', HOJE).prazo).toBe('2026-09-22');
    expect(lerPrazo('reunião terca', HOJE).prazo).toBe('2026-09-22');
    expect(lerPrazo('reunião sabado', HOJE).prazo).toBe('2026-09-19');
  });

  it('entende "em N dias" e "semana que vem"', () => {
    expect(lerPrazo('cobrar em 3 dias', HOJE).prazo).toBe('2026-09-20');
    expect(lerPrazo('cobrar em 1 dia', HOJE).prazo).toBe('2026-09-18');
    expect(lerPrazo('cobrar semana que vem', HOJE).prazo).toBe('2026-09-24');
  });

  it('entende a data escrita com barra', () => {
    expect(lerPrazo('vence 25/12', HOJE).prazo).toBe('2026-12-25');
    expect(lerPrazo('vence 25/12/2027', HOJE).prazo).toBe('2027-12-25');
    expect(lerPrazo('vence 5/1', HOJE).prazo).toBe('2026-01-05');
  });

  it('data impossível não vira data', () => {
    // 30 de fevereiro não existe, e inventar o dia 1º de março seria pior.
    expect(lerPrazo('vence 30/02', HOJE).prazo).toBeUndefined();
  });

  it('"dia 25" é este mês; se já passou, é o mês que vem', () => {
    expect(lerPrazo('pagar dia 25', HOJE).prazo).toBe('2026-09-25');
    expect(lerPrazo('pagar dia 5', HOJE).prazo).toBe('2026-10-05');
  });

  it('"dia 31" no mês que vem encosta no último dia', () => {
    // De outubro para novembro: 31 não existe em novembro.
    expect(lerPrazo('pagar dia 3', '2026-10-31').prazo).toBe('2026-11-03');
    expect(lerPrazo('pagar dia 31', '2026-10-31').prazo).toBe('2026-10-31');
  });

  it('frase sem data nenhuma devolve o texto inteiro', () => {
    expect(lerPrazo('pensar no próximo passo', HOJE)).toEqual({
      resto: 'pensar no próximo passo',
    });
  });
});

describe('interpretar — comandos vêm antes de perguntas', () => {
  it('criar tarefa, com e sem prazo', () => {
    expect(interpretar('criar tarefa renovar o seguro sexta', HOJE)).toEqual({
      tipo: 'criar-tarefa',
      titulo: 'Renovar o seguro',
      prazo: '2026-09-18',
      contexto: 'pessoal',
    });
    expect(interpretar('nova tarefa pensar no próximo passo', HOJE)).toMatchObject({
      tipo: 'criar-tarefa',
      titulo: 'Pensar no próximo passo',
      prazo: undefined,
    });
  });

  it('palavra de trabalho manda a tarefa para o contexto profissional', () => {
    expect(interpretar('criar tarefa enviar a proposta amanhã', HOJE)).toMatchObject({
      contexto: 'profissional',
    });
    expect(interpretar('criar tarefa comprar pão', HOJE)).toMatchObject({ contexto: 'pessoal' });
  });

  it('aceita as várias formas de mandar criar', () => {
    for (const frase of [
      'criar tarefa comprar pão',
      'nova tarefa comprar pão',
      'adicionar comprar pão',
      'anotar comprar pão',
      'lembrar de comprar pão',
    ]) {
      expect(interpretar(frase, HOJE), frase).toMatchObject({
        tipo: 'criar-tarefa',
        titulo: 'Comprar pão',
      });
    }
  });

  it('concluir uma tarefa', () => {
    expect(interpretar('concluir renovar o seguro', HOJE)).toEqual({
      tipo: 'concluir-tarefa',
      alvo: 'renovar o seguro',
    });
    expect(interpretar('terminei a tarefa relatório', HOJE)).toEqual({
      tipo: 'concluir-tarefa',
      alvo: 'relatorio',
    });
  });

  it('lançar um gasto, com a categoria adivinhada pela palavra', () => {
    expect(interpretar('gastei 250 no mercado', HOJE)).toEqual({
      tipo: 'lancar',
      descricao: 'Mercado',
      valor: 25000,
      entrada: false,
      categoria: 'alimentacao',
    });
    expect(interpretar('paguei 2.500,00 de aluguel', HOJE)).toMatchObject({
      valor: 250000,
      categoria: 'moradia',
      entrada: false,
    });
    expect(interpretar('recebi 9500 de salário', HOJE)).toMatchObject({
      valor: 950000,
      entrada: true,
      categoria: 'receita',
    });
  });

  it('valor ilegível não vira lançamento silencioso', () => {
    // Melhor virar pedido do que gravar um número que eu não escrevi.
    expect(interpretar('gastei muito no mercado', HOJE).tipo).toBe('pedido');
  });

  it('gasto sem descrição ainda é um gasto', () => {
    expect(interpretar('gastei 50', HOJE)).toMatchObject({
      tipo: 'lancar',
      descricao: 'Gasto',
      valor: 5000,
      categoria: 'outros',
    });
  });
});

describe('interpretar — perguntas', () => {
  const casos: [string, string][] = [
    ['como foi minha semana?', 'resumo'],
    ['resumo do mês', 'resumo'],
    ['como estou hoje', 'resumo'],
    ['o que está atrasado?', 'atrasos'],
    ['tem alguma tarefa vencida?', 'atrasos'],
    ['o que tenho hoje', 'agenda'],
    ['minha agenda da semana', 'agenda'],
    ['quanto gastei com moradia', 'gastos'],
    ['qual é o meu saldo', 'saldo'],
    ['como estão meus projetos', 'projetos'],
    ['como está minha rotina', 'rotina'],
    ['ajuda', 'ajuda'],
  ];

  it.each(casos)('"%s" vira %s', (frase, tipo) => {
    expect(interpretar(frase, HOJE).tipo).toBe(tipo);
  });

  it('o período do resumo sai da frase', () => {
    expect(interpretar('resumo do mês', HOJE)).toEqual({ tipo: 'resumo', periodo: 'mes' });
    expect(interpretar('como foi a semana', HOJE)).toEqual({ tipo: 'resumo', periodo: 'semana' });
    expect(interpretar('como estou', HOJE)).toEqual({ tipo: 'resumo', periodo: 'hoje' });
  });

  it('a categoria citada é reconhecida pelo nome e pelo rótulo', () => {
    expect(interpretar('quanto gastei com moradia', HOJE)).toMatchObject({ categoria: 'moradia' });
    expect(interpretar('quanto gastei com alimentação', HOJE)).toMatchObject({
      categoria: 'alimentacao',
    });
    expect(interpretar('quanto gastei esse mês', HOJE)).toMatchObject({ categoria: undefined });
  });

  it('o que ele não entende vira pedido, e não um palpite', () => {
    // Esta é a linha que separa "responde com dados" de "inventa".
    const fora = interpretar('quero uma área para registrar minhas leituras', HOJE);
    expect(fora).toEqual({
      tipo: 'pedido',
      descricao: 'quero uma área para registrar minhas leituras',
    });
  });

  it('frase vazia pede ajuda em vez de quebrar', () => {
    expect(interpretar('   ', HOJE).tipo).toBe('ajuda');
  });
});

describe('achar a tarefa pelo nome', () => {
  const b = banco({
    tarefas: [
      tarefa({ id: 'a', titulo: 'Renovar o seguro do carro' }),
      tarefa({ id: 'b', titulo: 'Renovar o passaporte' }),
      tarefa({ id: 'c', titulo: 'Comprar pão', concluidaEm: '2026-09-16T10:00:00.000Z' }),
    ],
  });

  it('acha por pedaço do título, sem acento e sem caixa', () => {
    expect(acharTarefas(b, 'SEGURO').map((t) => t.id)).toEqual(['a']);
    expect(acharTarefas(b, 'passaporte').map((t) => t.id)).toEqual(['b']);
  });

  it('não acha o que já está concluído', () => {
    expect(acharTarefas(b, 'pão')).toEqual([]);
  });

  it('devolve todas as candidatas, para quem responde poder perguntar qual', () => {
    expect(acharTarefas(b, 'renovar')).toHaveLength(2);
  });
});

describe('responder — comandos devolvem efeito, e não gravam nada', () => {
  it('criar tarefa devolve o efeito que a tela executa', () => {
    const intencao = interpretar('criar tarefa renovar o seguro sexta', HOJE);
    const r = responder(bancoVazio(), intencao, HOJE);
    expect(r.efeito).toEqual({
      tipo: 'criar-tarefa',
      titulo: 'Renovar o seguro',
      prazo: '2026-09-18',
      contexto: 'pessoal',
    });
    // O domínio é puro: o banco recebido não mudou.
    expect(bancoVazio().tarefas).toEqual([]);
  });

  it('concluir com duas candidatas pergunta qual, em vez de escolher', () => {
    // Concluir a tarefa errada é o tipo de erro que só se descobre depois.
    const b = banco({
      tarefas: [
        tarefa({ id: 'a', titulo: 'Renovar o seguro' }),
        tarefa({ id: 'b', titulo: 'Renovar o passaporte' }),
      ],
    });
    const r = responder(b, { tipo: 'concluir-tarefa', alvo: 'renovar' }, HOJE);
    expect(r.efeito).toBeUndefined();
    expect(r.titulo).toBe('Qual delas?');
    expect(textoDe(r)).toContain('Renovar o passaporte');
  });

  it('concluir com uma candidata devolve o efeito com o id certo', () => {
    const b = banco({ tarefas: [tarefa({ id: 'a', titulo: 'Renovar o seguro' })] });
    const r = responder(b, { tipo: 'concluir-tarefa', alvo: 'seguro' }, HOJE);
    expect(r.efeito).toEqual({ tipo: 'concluir-tarefa', id: 'a', titulo: 'Renovar o seguro' });
  });

  it('concluir o que não existe diz que não achou', () => {
    const r = responder(bancoVazio(), { tipo: 'concluir-tarefa', alvo: 'nada' }, HOJE);
    expect(r.efeito).toBeUndefined();
    expect(textoDe(r)).toContain('Nenhuma tarefa pendente');
  });

  it('o pedido carrega a frase original para o compositor', () => {
    const r = responder(bancoVazio(), interpretar('quero uma área de leituras', HOJE), HOJE);
    expect(r.efeito).toEqual({ tipo: 'montar-pedido', descricao: 'quero uma área de leituras' });
  });
});

describe('responder — relatórios saem dos dados, e só', () => {
  const completo = banco({
    rotinas: [rotina({ id: 'r1' }), rotina({ id: 'r2', titulo: 'Academia' })],
    execucoes: [
      { id: 'e1', criadoEm: 'x', alteradoEm: 'x', rotinaId: 'r1', dia: HOJE },
    ],
    tarefas: [
      tarefa({ id: 'atrasada', titulo: 'Entregar o relatório', prazo: '2026-09-10', projetoId: 'p1' }),
      tarefa({ id: 'hoje', titulo: 'Pagar o IPVA', prazo: HOJE }),
      tarefa({ id: 'fazendo', titulo: 'Revisar a proposta', estado: 'fazendo' }),
      tarefa({
        id: 'feita',
        titulo: 'Assinar o contrato',
        concluidaEm: new Date(2026, 8, 17, 10).toISOString(),
      }),
    ],
    projetos: [
      {
        id: 'p1',
        criadoEm: new Date(2026, 8, 1, 9).toISOString(),
        alteradoEm: new Date(2026, 8, 1, 9).toISOString(),
        titulo: 'Proposta comercial',
        contexto: 'profissional',
      },
    ],
    lancamentos: [
      lancamento({ id: 'salario', tipo: 'entrada', valor: 950000, categoria: 'receita', data: '2026-09-05' }),
      lancamento({ id: 'aluguel', valor: 250000, categoria: 'moradia', data: '2026-09-10' }),
      lancamento({ id: 'mercado', valor: 43250, categoria: 'alimentacao', data: '2026-09-12' }),
    ],
  });

  it('o resumo junta os quatro pilares', () => {
    const t = textoDe(responder(completo, { tipo: 'resumo', periodo: 'semana' }, HOJE));
    expect(t).toContain('Tarefas concluídas');
    expect(t).toContain('Saldo do mês até hoje');
    expect(t).toContain(reais('6.567,50')); // 9500 − 2500 − 432,50
    expect(t).toContain('Da rotina');
  });

  it('o resumo conta a tarefa que venceu e a que está em andamento', () => {
    const t = textoDe(responder(completo, { tipo: 'resumo', periodo: 'semana' }, HOJE));
    expect(t).toContain('1 tarefa venceu e continua aberta');
    expect(t).toContain('1 tarefa está em andamento');
    expect(t).toContain('Entregar o relatório');
  });

  it('a frase inteira concorda no plural, e não só o começo dela', () => {
    // "1 tarefa venceu e continuam abertas" é o mesmo erro do "1 concluídos".
    const duas = banco({
      tarefas: [
        tarefa({ id: 'a', titulo: 'Uma', prazo: '2026-09-01' }),
        tarefa({ id: 'b', titulo: 'Outra', prazo: '2026-09-02' }),
      ],
    });
    const t = textoDe(responder(duas, { tipo: 'resumo', periodo: 'semana' }, HOJE));
    expect(t).toContain('2 tarefas venceram e continuam abertas');
    expect(t).not.toContain('venceu e continuam');
  });

  it('os atrasos listam tarefa e projeto juntos', () => {
    const t = textoDe(responder(completo, { tipo: 'atrasos' }, HOJE));
    expect(t).toContain('Entregar o relatório');
    expect(t).toContain('Proposta comercial');
  });

  it('sem atraso nenhum ele diz isso, em vez de mostrar lista vazia', () => {
    const t = textoDe(responder(bancoVazio(), { tipo: 'atrasos' }, HOJE));
    expect(t).toContain('Nenhuma tarefa vencida');
  });

  it('a agenda de hoje traz a rotina que falta e o que vence', () => {
    const t = textoDe(responder(completo, { tipo: 'agenda', periodo: 'hoje' }, HOJE));
    expect(t).toContain('Academia'); // a rotina não cumprida
    expect(t).not.toContain('Ler 20 páginas'); // essa já foi feita hoje
    expect(t).toContain('Pagar o IPVA');
  });

  it('o gasto por categoria responde o valor exato', () => {
    const t = textoDe(responder(completo, { tipo: 'gastos', categoria: 'moradia' }, HOJE));
    expect(t).toContain(reais('2.500,00'));
  });

  it('gasto numa categoria sem nada é zero, e não um buraco', () => {
    const t = textoDe(responder(completo, { tipo: 'gastos', categoria: 'lazer' }, HOJE));
    expect(t).toContain(reais('0,00'));
  });

  it('o saldo separa o que já é do que ainda vai ser', () => {
    const t = textoDe(responder(completo, { tipo: 'saldo' }, HOJE));
    expect(t).toContain('Saldo até hoje');
    expect(t).toContain('Previsto no fim do mês');
  });

  it('a rotina mostra a sequência de cada uma', () => {
    const t = textoDe(responder(completo, { tipo: 'rotina' }, HOJE));
    expect(t).toContain('Ler 20 páginas');
    expect(t).toContain('1 dia seguido');
  });

  it('banco vazio responde sem quebrar, em todas as perguntas', () => {
    const perguntas = [
      { tipo: 'resumo', periodo: 'semana' },
      { tipo: 'atrasos' },
      { tipo: 'agenda', periodo: 'hoje' },
      { tipo: 'agenda', periodo: 'semana' },
      { tipo: 'gastos' },
      { tipo: 'saldo' },
      { tipo: 'projetos' },
      { tipo: 'rotina' },
      { tipo: 'ajuda' },
    ] as const;
    for (const p of perguntas) {
      const r = responder(bancoVazio(), p, HOJE);
      expect(r.titulo, JSON.stringify(p)).not.toBe('');
      expect(r.blocos.length, JSON.stringify(p)).toBeGreaterThan(0);
    }
  });

  it('a ajuda lista o que ele sabe, e diz o que ele não faz', () => {
    const t = textoDe(responder(bancoVazio(), { tipo: 'ajuda' }, HOJE));
    expect(t).toContain('Não invento número');
    expect(t).toContain('Claude Code');
  });
});

describe('lerHora', () => {
  it('lê a hora cheia e tira a preposição órfã', () => {
    expect(lerHora('reunião com o contador às 15h')).toEqual({
      hora: '15:00',
      resto: 'reunião com o contador',
    });
  });

  it('lê hora com minuto, em h e em dois-pontos', () => {
    expect(lerHora('consulta 15h30').hora).toBe('15:30');
    expect(lerHora('consulta 15:30').hora).toBe('15:30');
    expect(lerHora('consulta às 9h05').hora).toBe('09:05');
  });

  it('converte o período dito para 24 horas', () => {
    expect(lerHora('almoço às 3 da tarde').hora).toBe('15:00');
    expect(lerHora('ligar 8 da manhã').hora).toBe('08:00');
    expect(lerHora('jantar 9 da noite').hora).toBe('21:00');
    expect(lerHora('acordar 5 da madrugada').hora).toBe('05:00');
  });

  it('resolve meio-dia e meia-noite, inclusive com meia', () => {
    expect(lerHora('almoçar ao meio-dia').hora).toBe('12:00');
    expect(lerHora('almoçar meio-dia e meia').hora).toBe('12:30');
    expect(lerHora('virar meia-noite').hora).toBe('00:00');
    expect(lerHora('12 da noite').hora).toBe('00:00');
  });

  it('não transforma número solto em hora', () => {
    expect(lerHora('comprar 2 cadeiras')).toEqual({ resto: 'comprar 2 cadeiras' });
    expect(lerHora('pagar as 3 parcelas')).toEqual({ resto: 'pagar as 3 parcelas' });
  });

  it('ignora hora impossível', () => {
    expect(lerHora('ligar 99h').hora).toBeUndefined();
  });

  it('trabalha sobre o resto de lerPrazo, sem disputar o número da data', () => {
    const data = lerPrazo('marcar o dentista dia 25 às 14h', HOJE);
    expect(data.prazo).toBe('2026-09-25');
    const hora = lerHora(data.resto);
    expect(hora).toEqual({ hora: '14:00', resto: 'marcar o dentista' });
  });
});

describe('agendar, adiar e excluir', () => {
  it('"marcar" com data é agendar, e não concluir', () => {
    const i = interpretar('marcar reunião com o cliente sexta às 15h', HOJE);
    expect(i).toEqual({
      tipo: 'criar-tarefa',
      titulo: 'Reunião com o cliente',
      prazo: '2026-09-18',
      hora: '15:00',
      contexto: 'profissional',
    });
  });

  it('o dia da semana escrito inclui hoje — HOJE é quinta', () => {
    const i = interpretar('marcar dentista quinta às 9h', HOJE);
    expect(i).toMatchObject({ prazo: HOJE, hora: '09:00' });
  });

  it('"marcar" sem data continua concluindo, como antes', () => {
    expect(interpretar('marcar renovar o seguro', HOJE)).toEqual({
      tipo: 'concluir-tarefa',
      alvo: 'renovar o seguro',
    });
  });

  it('adia para a data escrita, tirando o artigo do alvo', () => {
    expect(interpretar('adiar o dentista para sexta', HOJE)).toEqual({
      tipo: 'adiar-tarefa',
      alvo: 'dentista',
      prazo: '2026-09-18',
      hora: undefined,
    });
  });

  it('adiar sem data não vira comando — vira pedido', () => {
    expect(interpretar('adiar o dentista', HOJE).tipo).toBe('pedido');
  });

  it('exclui pelo nome', () => {
    expect(interpretar('excluir a tarefa comprar cadeira', HOJE)).toEqual({
      tipo: 'excluir-tarefa',
      alvo: 'comprar cadeira',
    });
  });

  it('adiar devolve o antes e o depois, e o efeito com o id', () => {
    const banco: Banco = {
      ...bancoVazio(),
      tarefas: [tarefa({ id: 't9', titulo: 'Dentista', prazo: '2026-09-18' })],
    };
    const r = responder(banco, interpretar('adiar o dentista para dia 25', HOJE), HOJE);
    expect(r.titulo).toBe('Adiar');
    expect(r.efeito).toEqual({
      tipo: 'adiar-tarefa',
      id: 't9',
      titulo: 'Dentista',
      prazo: '2026-09-25',
      hora: undefined,
    });
  });

  it('não escolhe sozinho quando duas tarefas combinam', () => {
    const banco: Banco = {
      ...bancoVazio(),
      tarefas: [
        tarefa({ id: 'a', titulo: 'Pagar o IPVA' }),
        tarefa({ id: 'b', titulo: 'Pagar o IPTU' }),
      ],
    };
    const r = responder(banco, { tipo: 'excluir-tarefa', alvo: 'pagar' }, HOJE);
    expect(r.titulo).toBe('Qual delas?');
    expect(r.efeito).toBeUndefined();
  });

  it('o que soma dispensa confirmação; o que mexe no que existe, não', () => {
    expect(exigeConfirmacao({ tipo: 'criar-tarefa', titulo: 'X', contexto: 'pessoal' })).toBe(false);
    expect(exigeConfirmacao({ tipo: 'concluir-tarefa', id: 'a', titulo: 'X' })).toBe(true);
    expect(exigeConfirmacao({ tipo: 'excluir-tarefa', id: 'a', titulo: 'X' })).toBe(true);
    expect(
      exigeConfirmacao({ tipo: 'adiar-tarefa', id: 'a', titulo: 'X', prazo: '2026-09-25' }),
    ).toBe(true);
  });
});

describe('a voz da prévia', () => {
  const comTarefa = (): Banco => ({
    ...bancoVazio(),
    tarefas: [tarefa({ id: 't1', titulo: 'Reunião com o contador', prazo: '2026-09-18', hora: '15:00' })],
  });

  it('fala no futuro: a resposta é desenhada antes de o efeito acontecer', () => {
    const r = responder(comTarefa(), { tipo: 'concluir-tarefa', alvo: 'reunião' }, HOJE);
    expect(r.titulo).toBe('Concluir');
    // Nada aqui pode afirmar que já aconteceu — a confirmação ainda não veio.
    const texto = JSON.stringify(r.blocos);
    expect(texto).not.toMatch(/Concluída|Marcada agora/);
    expect(r.efeito).toEqual({ tipo: 'concluir-tarefa', id: 't1', titulo: 'Reunião com o contador' });
  });

  it('todo efeito que exige confirmação tem título no infinitivo', () => {
    const banco = comTarefa();
    for (const intencao of [
      { tipo: 'concluir-tarefa', alvo: 'reunião' },
      { tipo: 'excluir-tarefa', alvo: 'reunião' },
      { tipo: 'adiar-tarefa', alvo: 'reunião', prazo: '2026-09-25' },
    ] as const) {
      const r = responder(banco, intencao, HOJE);
      expect(r.efeito && exigeConfirmacao(r.efeito)).toBe(true);
      expect(['Concluir', 'Adiar', 'Excluir']).toContain(r.titulo);
    }
  });
});

describe('a agenda de fora aparece na conversa', () => {
  const reuniao: CompromissoExterno = {
    titulo: 'Reunião no cartório',
    dia: HOJE,
    hora: '15:00',
    diaInteiro: false,
  };

  it('"o que tenho hoje?" lista o compromisso do Google', () => {
    const r = responder(bancoVazio(), { tipo: 'agenda', periodo: 'hoje' }, HOJE, [reuniao]);
    const texto = JSON.stringify(r.blocos);
    expect(texto).toContain('Reunião no cartório');
    expect(texto).toContain('15:00');
  });

  it('dia sem tarefa mas com reunião não é "dia cumprido"', () => {
    const banco: Banco = { ...bancoVazio(), tarefas: [tarefa({ concluidaEm: '2026-09-17T10:00:00.000Z' })] };
    const vazio = responder(banco, { tipo: 'agenda', periodo: 'hoje' }, HOJE);
    expect(JSON.stringify(vazio.blocos)).toMatch(/Dia cumprido|Nada cadastrado/);

    const cheio = responder(banco, { tipo: 'agenda', periodo: 'hoje' }, HOJE, [reuniao]);
    expect(JSON.stringify(cheio.blocos)).not.toMatch(/Dia cumprido|Nada cadastrado/);
  });

  it('evento de dia inteiro aparece sem hora inventada', () => {
    const feriado: CompromissoExterno = { titulo: 'Feriado', dia: HOJE, diaInteiro: true };
    const r = responder(bancoVazio(), { tipo: 'agenda', periodo: 'hoje' }, HOJE, [feriado]);
    expect(JSON.stringify(r.blocos)).toContain('Dia inteiro');
  });

  it('ordena por hora, e o dia inteiro vem primeiro', () => {
    const tarde: CompromissoExterno = { titulo: 'Tarde', dia: HOJE, hora: '16:00', diaInteiro: false };
    const manha: CompromissoExterno = { titulo: 'Manhã', dia: HOJE, hora: '09:00', diaInteiro: false };
    const inteiro: CompromissoExterno = { titulo: 'Inteiro', dia: HOJE, diaInteiro: true };
    const r = responder(bancoVazio(), { tipo: 'agenda', periodo: 'hoje' }, HOJE, [tarde, manha, inteiro]);
    const texto = JSON.stringify(r.blocos);
    expect(texto.indexOf('Inteiro')).toBeLessThan(texto.indexOf('Manhã'));
    expect(texto.indexOf('Manhã')).toBeLessThan(texto.indexOf('Tarde'));
  });

  it('a semana conta os compromissos e ignora os de fora dela', () => {
    const fora: CompromissoExterno = { titulo: 'Mês que vem', dia: '2026-11-20', hora: '10:00', diaInteiro: false };
    const r = responder(bancoVazio(), { tipo: 'agenda', periodo: 'semana' }, HOJE, [reuniao, fora]);
    const texto = JSON.stringify(r.blocos);
    expect(texto).toContain('Reunião no cartório');
    expect(texto).not.toContain('Mês que vem');
  });

  it('sem agenda assinada, nada muda — o parâmetro é opcional', () => {
    const com = responder(bancoVazio(), { tipo: 'agenda', periodo: 'hoje' }, HOJE, []);
    const sem = responder(bancoVazio(), { tipo: 'agenda', periodo: 'hoje' }, HOJE);
    expect(com).toEqual(sem);
  });
});
