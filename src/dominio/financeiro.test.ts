import { describe, it, expect } from 'vitest';
import {
  efeito,
  saldo,
  totalPorTipo,
  lancamentosDoMes,
  realizados,
  previstos,
  resumoFinanceiro,
  saidasPorCategoria,
  porContexto,
  ordenarLancamentos,
  validarValor,
  ValorInvalido,
  ocorrenciasDe,
  ocorrenciasDoMes,
  saldoDeOcorrencias,
  evolucaoMensal,
  lancamentosRecorrentes,
  comprometidoPorMes,
  ordenarOcorrencias,
} from './financeiro';
import { formatarMoeda } from '../formato';
import { bancoVazio, type Lancamento } from '../dados/esquema';

const HOJE = '2026-09-16';

function lanc(extras: Partial<Lancamento> = {}): Lancamento {
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

describe('o sinal vem do tipo, nunca do número', () => {
  it('entrada soma, saída subtrai', () => {
    expect(efeito(lanc({ tipo: 'entrada', valor: 5000 }))).toBe(5000);
    expect(efeito(lanc({ tipo: 'saida', valor: 5000 }))).toBe(-5000);
  });

  it('valor é sempre positivo no registro', () => {
    // Guardar valor negativo abriria a porta para "saída de -R$ 50", que é
    // entrada escrita errado, e para somas que se cancelam sem ninguém notar.
    const saida = lanc({ tipo: 'saida', valor: 5000 });
    expect(saida.valor).toBeGreaterThan(0);
    expect(efeito(saida)).toBeLessThan(0);
  });
});

describe('saldo', () => {
  it('soma entradas e subtrai saídas', () => {
    const s = saldo([
      lanc({ id: 'a', tipo: 'entrada', valor: 500000 }),
      lanc({ id: 'b', tipo: 'saida', valor: 250000 }),
      lanc({ id: 'c', tipo: 'saida', valor: 32550 }),
    ]);
    expect(s).toBe(217450);
    expect(formatarMoeda(s)).toBe('R$ 2.174,50');
  });

  it('lista vazia é zero, não nulo', () => {
    expect(saldo([])).toBe(0);
    expect(formatarMoeda(saldo([]))).toBe('R$ 0,00');
  });

  it('saldo negativo é negativo, não some', () => {
    const s = saldo([lanc({ tipo: 'saida', valor: 12345 })]);
    expect(s).toBe(-12345);
    expect(formatarMoeda(s)).toBe('-R$ 123,45');
  });

  it('mil lançamentos pequenos fecham exato', () => {
    // O teste que justifica centavos inteiros. Em ponto flutuante isto
    // acumularia erro e o saldo passaria a divergir da soma dos extratos.
    const centavos = Array.from({ length: 1000 }, (_, i) =>
      lanc({ id: `x${i}`, tipo: 'entrada', valor: 10 }),
    );
    expect(saldo(centavos)).toBe(10_000);
    expect(formatarMoeda(saldo(centavos))).toBe('R$ 100,00');
  });

  it('entrada e saída iguais zeram exatamente', () => {
    expect(
      saldo([
        lanc({ id: 'a', tipo: 'entrada', valor: 333_33 }),
        lanc({ id: 'b', tipo: 'saida', valor: 333_33 }),
      ]),
    ).toBe(0);
  });

  it('separa totais por tipo', () => {
    expect(
      totalPorTipo([
        lanc({ id: 'a', tipo: 'entrada', valor: 100 }),
        lanc({ id: 'b', tipo: 'entrada', valor: 200 }),
        lanc({ id: 'c', tipo: 'saida', valor: 50 }),
      ]),
    ).toEqual({ entradas: 300, saidas: 50 });
  });
});

describe('realizado e previsto', () => {
  const lista = [
    lanc({ id: 'passado', data: '2026-09-01', tipo: 'entrada', valor: 500000 }),
    lanc({ id: 'hoje', data: HOJE, tipo: 'saida', valor: 10000 }),
    lanc({ id: 'futuro', data: '2026-09-25', tipo: 'saida', valor: 250000 }),
    lanc({ id: 'futuro2', data: '2026-09-30', tipo: 'entrada', valor: 100000 }),
  ];

  it('o de hoje conta como realizado', () => {
    // O dia não precisa acabar para o dinheiro ter saído.
    expect(realizados(lista, HOJE).map((l) => l.id)).toEqual(['passado', 'hoje']);
  });

  it('o de amanhã em diante é previsto', () => {
    expect(previstos(lista, HOJE).map((l) => l.id)).toEqual(['futuro', 'futuro2']);
  });

  it('separa o saldo que já é do que ainda vai ser', () => {
    // O ponto do pilar: um mês que fecha positivo só porque uma entrada futura
    // entrou na conta não fechou positivo ainda.
    const r = resumoFinanceiro(lista, HOJE);
    expect(r.entradas).toBe(500000);
    expect(r.saidas).toBe(10000);
    expect(r.saldoRealizado).toBe(490000);
    expect(r.aPagar).toBe(250000);
    expect(r.aReceber).toBe(100000);
    expect(r.saldoPrevisto).toBe(490000 - 250000 + 100000);
  });

  it('um mês só com previsto tem realizado zero', () => {
    const so_futuro = [lanc({ data: '2026-12-01', tipo: 'entrada', valor: 100000 })];
    const r = resumoFinanceiro(so_futuro, HOJE);
    expect(r.saldoRealizado).toBe(0);
    expect(r.saldoPrevisto).toBe(100000);
  });

  it('sem lançamento nenhum, tudo é zero', () => {
    expect(resumoFinanceiro([], HOJE)).toEqual({
      entradas: 0,
      saidas: 0,
      saldoRealizado: 0,
      saldoPrevisto: 0,
      aReceber: 0,
      aPagar: 0,
    });
  });
});

describe('recorte por mês', () => {
  const banco = {
    ...bancoVazio(),
    lancamentos: [
      lanc({ id: 'a', data: '2026-08-31' }),
      lanc({ id: 'b', data: '2026-09-01' }),
      lanc({ id: 'c', data: '2026-09-30' }),
      lanc({ id: 'd', data: '2026-10-01' }),
    ],
  };

  it('pega o mês inteiro e só ele', () => {
    expect(lancamentosDoMes(banco, 2026, 9).map((l) => l.id)).toEqual(['b', 'c']);
  });

  it('não confunde mês de um dígito com outro', () => {
    // '2026-1' casaria com '2026-10' se o filtro não preenchesse o zero.
    const b = {
      ...bancoVazio(),
      lancamentos: [lanc({ id: 'jan', data: '2026-01-15' }), lanc({ id: 'out', data: '2026-10-15' })],
    };
    expect(lancamentosDoMes(b, 2026, 1).map((l) => l.id)).toEqual(['jan']);
    expect(lancamentosDoMes(b, 2026, 10).map((l) => l.id)).toEqual(['out']);
  });
});

describe('por categoria', () => {
  const lista = [
    lanc({ id: 'a', tipo: 'saida', valor: 250000, categoria: 'moradia' }),
    lanc({ id: 'b', tipo: 'saida', valor: 80000, categoria: 'alimentacao' }),
    lanc({ id: 'c', tipo: 'saida', valor: 20000, categoria: 'alimentacao' }),
    lanc({ id: 'd', tipo: 'entrada', valor: 900000, categoria: 'receita' }),
  ];

  it('agrupa e soma as saídas, da maior para a menor', () => {
    expect(saidasPorCategoria(lista)).toEqual([
      { categoria: 'moradia', total: 250000, fracao: 250000 / 350000 },
      { categoria: 'alimentacao', total: 100000, fracao: 100000 / 350000 },
    ]);
  });

  it('ignora entradas', () => {
    // Misturar entrada e saída numa fatia produz um gráfico que não diz nada.
    expect(saidasPorCategoria(lista).map((f) => f.categoria)).not.toContain('receita');
  });

  it('as frações somam um', () => {
    const soma = saidasPorCategoria(lista).reduce((t, f) => t + f.fracao, 0);
    expect(soma).toBeCloseTo(1, 10);
  });

  it('sem saída nenhuma devolve lista vazia, não divisão por zero', () => {
    expect(saidasPorCategoria([lanc({ tipo: 'entrada', valor: 100 })])).toEqual([]);
    expect(saidasPorCategoria([])).toEqual([]);
  });
});

describe('ordenação', () => {
  it('do mais recente para o mais antigo', () => {
    const lista = [
      lanc({ id: 'velho', data: '2026-09-01' }),
      lanc({ id: 'novo', data: '2026-09-20' }),
      lanc({ id: 'meio', data: '2026-09-10' }),
    ];
    expect(ordenarLancamentos(lista).map((l) => l.id)).toEqual(['novo', 'meio', 'velho']);
  });

  it('no mesmo dia, o lançado por último aparece em cima', () => {
    const lista = [
      lanc({ id: 'primeiro', data: HOJE, criadoEm: '2026-09-16T08:00:00.000Z' }),
      lanc({ id: 'segundo', data: HOJE, criadoEm: '2026-09-16T18:00:00.000Z' }),
    ];
    expect(ordenarLancamentos(lista).map((l) => l.id)).toEqual(['segundo', 'primeiro']);
  });

  it('não muda a lista original', () => {
    const lista = [lanc({ id: 'a', data: '2026-09-01' }), lanc({ id: 'b', data: '2026-09-20' })];
    ordenarLancamentos(lista);
    expect(lista.map((l) => l.id)).toEqual(['a', 'b']);
  });
});

describe('contexto', () => {
  it('separa pessoal de profissional', () => {
    const lista = [
      lanc({ id: 'p', contexto: 'pessoal' }),
      lanc({ id: 'w', contexto: 'profissional' }),
    ];
    expect(porContexto(lista, 'pessoal').map((l) => l.id)).toEqual(['p']);
    expect(porContexto(lista, 'profissional').map((l) => l.id)).toEqual(['w']);
  });
});

describe('validação do valor', () => {
  it('aceita centavos inteiros positivos', () => {
    expect(() => validarValor(1)).not.toThrow();
    expect(() => validarValor(123456)).not.toThrow();
  });

  it('recusa zero', () => {
    // Um lançamento de R$ 0,00 não é informação, é ruído que ainda aparece nas
    // listas e nos gráficos.
    expect(() => validarValor(0)).toThrow(ValorInvalido);
  });

  it('recusa negativo — o sinal é do tipo', () => {
    expect(() => validarValor(-100)).toThrow(ValorInvalido);
  });

  it('recusa fração de centavo', () => {
    expect(() => validarValor(10.5)).toThrow(/inteiro em centavos/);
  });
});

describe('lançamento recorrente', () => {
  const aluguel = lanc({
    id: 'aluguel',
    descricao: 'Aluguel',
    valor: 250000,
    tipo: 'saida',
    categoria: 'moradia',
    data: '2026-01-05',
    recorrencia: { periodo: 'mensal' },
  });

  it('sem recorrência, aparece uma vez só', () => {
    const unico = lanc({ data: '2026-01-10' });
    expect(ocorrenciasDe(unico, '2026-01-01', '2026-12-31')).toHaveLength(1);
    expect(ocorrenciasDe(unico, '2026-02-01', '2026-12-31')).toHaveLength(0);
  });

  it('mensal aparece todo mês, e só a primeira não é repetição', () => {
    const os = ocorrenciasDe(aluguel, '2026-01-01', '2026-12-31');
    expect(os).toHaveLength(12);
    expect(os[0]).toMatchObject({ data: '2026-01-05', repeticao: false });
    expect(os[1]).toMatchObject({ data: '2026-02-05', repeticao: true });
    expect(os[11].data).toBe('2026-12-05');
  });

  it('a série é ancorada na data original, não na janela', () => {
    // Olhar só agosto não pode deslocar a série. Sem a âncora, o aluguel
    // "andaria" conforme o mês que eu estivesse vendo.
    const so_agosto = ocorrenciasDe(aluguel, '2026-08-01', '2026-08-31');
    expect(so_agosto).toHaveLength(1);
    expect(so_agosto[0].data).toBe('2026-08-05');
    expect(so_agosto[0].repeticao).toBe(true);
  });

  it('dia 31 cai no último dia dos meses curtos, em vez de sumir', () => {
    const no31 = lanc({ id: 'x', data: '2026-01-31', recorrencia: { periodo: 'mensal' } });
    const datas = ocorrenciasDe(no31, '2026-01-01', '2026-05-31').map((o) => o.data);
    expect(datas).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-28',
      '2026-04-28',
      '2026-05-28',
    ]);
  });

  it('semanal anda de sete em sete', () => {
    const semanal = lanc({ id: 's', data: '2026-01-01', recorrencia: { periodo: 'semanal' } });
    expect(ocorrenciasDe(semanal, '2026-01-01', '2026-01-31').map((o) => o.data)).toEqual([
      '2026-01-01',
      '2026-01-08',
      '2026-01-15',
      '2026-01-22',
      '2026-01-29',
    ]);
  });

  it('anual anda de ano em ano', () => {
    const anual = lanc({ id: 'a', data: '2026-03-10', recorrencia: { periodo: 'anual' } });
    expect(ocorrenciasDe(anual, '2026-01-01', '2029-12-31').map((o) => o.data)).toEqual([
      '2026-03-10',
      '2027-03-10',
      '2028-03-10',
      '2029-03-10',
    ]);
  });

  it('respeita a data de término', () => {
    const ate_junho = lanc({
      id: 'f',
      data: '2026-01-05',
      recorrencia: { periodo: 'mensal', ate: '2026-06-30' },
    });
    const datas = ocorrenciasDe(ate_junho, '2026-01-01', '2026-12-31').map((o) => o.data);
    expect(datas).toHaveLength(6);
    expect(datas.at(-1)).toBe('2026-06-05');
  });

  it('não repete antes da data original', () => {
    expect(ocorrenciasDe(aluguel, '2025-01-01', '2025-12-31')).toEqual([]);
  });

  it('uma janela enorme não trava', () => {
    const semanal = lanc({ id: 's', data: '2026-01-01', recorrencia: { periodo: 'semanal' } });
    const os = ocorrenciasDe(semanal, '2026-01-01', '2100-01-01');
    expect(os.length).toBeLessThanOrEqual(520);
  });
});

describe('ocorrências do mês e evolução', () => {
  const banco = {
    ...bancoVazio(),
    lancamentos: [
      lanc({
        id: 'salario',
        tipo: 'entrada',
        valor: 900000,
        categoria: 'receita',
        data: '2026-01-05',
        recorrencia: { periodo: 'mensal' },
      }),
      lanc({
        id: 'aluguel',
        tipo: 'saida',
        valor: 250000,
        categoria: 'moradia',
        data: '2026-01-10',
        recorrencia: { periodo: 'mensal' },
      }),
      lanc({ id: 'avulso', tipo: 'saida', valor: 50000, data: '2026-03-15' }),
    ],
  };

  it('um mês futuro já traz o que se repete, sem eu lançar de novo', () => {
    // A automação que o pilar ganhou: lancei uma vez, aparece todo mês.
    const junho = ocorrenciasDoMes(banco, 2026, 6);
    expect(junho.map((o) => o.lancamento.id).sort()).toEqual(['aluguel', 'salario']);
    expect(junho.every((o) => o.repeticao)).toBe(true);
    expect(saldoDeOcorrencias(junho)).toBe(650000);
  });

  it('o mês com lançamento avulso soma os dois', () => {
    expect(saldoDeOcorrencias(ocorrenciasDoMes(banco, 2026, 3))).toBe(900000 - 250000 - 50000);
  });

  it('a evolução mostra o saldo mês a mês, com as repetições', () => {
    const pontos = evolucaoMensal(banco, 2026, 6, 6);
    expect(pontos).toHaveLength(6);
    expect(pontos[0].chave).toBe('2026-01');
    expect(pontos[5].chave).toBe('2026-06');
    // Sem as repetições, todo mês depois de janeiro seria zero.
    expect(pontos.every((p) => p.saldo !== 0)).toBe(true);
    expect(pontos[2].saldo).toBe(900000 - 250000 - 50000); // março, com o avulso
  });

  it('lista o que é recorrente, do maior para o menor', () => {
    expect(lancamentosRecorrentes(banco).map((l) => l.id)).toEqual(['salario', 'aluguel']);
  });

  it('diz quanto já está comprometido por mês', () => {
    expect(comprometidoPorMes(banco)).toEqual({ entradas: 900000, saidas: 250000 });
  });

  it('avulso não conta como comprometido', () => {
    const so_avulso = { ...bancoVazio(), lancamentos: [lanc({ valor: 1000 })] };
    expect(comprometidoPorMes(so_avulso)).toEqual({ entradas: 0, saidas: 0 });
  });
});

describe('ordem das ocorrências', () => {
  it('a mais recente primeiro, pela data da ocorrência', () => {
    // A repetição de setembro tem de ser ordenada por setembro, e não por
    // janeiro, onde o lançamento nasceu.
    const banco = {
      ...bancoVazio(),
      lancamentos: [
        lanc({ id: 'antigo-recorrente', data: '2026-01-20', recorrencia: { periodo: 'mensal' } }),
        lanc({ id: 'novo-avulso', data: '2026-09-05', criadoEm: '2026-09-05T09:00:00.000Z' }),
      ],
    };
    const ordenadas = ordenarOcorrencias(ocorrenciasDoMes(banco, 2026, 9));
    expect(ordenadas.map((o) => o.lancamento.id)).toEqual(['antigo-recorrente', 'novo-avulso']);
    expect(ordenadas.map((o) => o.data)).toEqual(['2026-09-20', '2026-09-05']);
  });

  it('no mesmo dia, o lançado por último aparece em cima', () => {
    const banco = {
      ...bancoVazio(),
      lancamentos: [
        lanc({ id: 'primeiro', data: '2026-09-10', criadoEm: '2026-09-01T09:00:00.000Z' }),
        lanc({ id: 'segundo', data: '2026-09-10', criadoEm: '2026-09-02T09:00:00.000Z' }),
      ],
    };
    expect(ordenarOcorrencias(ocorrenciasDoMes(banco, 2026, 9)).map((o) => o.lancamento.id)).toEqual(
      ['segundo', 'primeiro'],
    );
  });

  it('não muda a lista que recebeu', () => {
    const os = ocorrenciasDoMes(
      { ...bancoVazio(), lancamentos: [lanc({ data: '2026-09-10' })] },
      2026,
      9,
    );
    const copia = [...os];
    ordenarOcorrencias(os);
    expect(os).toEqual(copia);
  });
});
