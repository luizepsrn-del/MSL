import { describe, it, expect } from 'vitest';
import {
  periodoEm,
  janelaDaMeta,
  feitoNaJanela,
  medirMeta,
  metasEmCurso,
  resumoDeMetas,
  validarMeta,
  MetaInvalida,
} from './meta';
import { bancoVazio, type Banco, type Meta, type Marco } from '../dados/esquema';

/**
 * `2026-09-17` é uma quinta-feira; a semana dela vai de domingo 13 a sábado 19.
 * Setembro tem 30 dias. Esses três fatos sustentam quase todos os casos aqui.
 */
const HOJE = '2026-09-17';

let sequencia = 0;
const carimbo = () => {
  sequencia += 1;
  return `2026-01-01T00:00:${String(sequencia).padStart(2, '0')}.000Z`;
};

function meta(dados: Partial<Meta> = {}): Meta {
  const t = carimbo();
  return {
    id: `meta-${sequencia}`,
    criadoEm: t,
    alteradoEm: t,
    titulo: 'Treinar',
    contexto: 'pessoal',
    alvo: 20,
    periodo: 'mes',
    direcao: 'atingir',
    fonte: { tipo: 'manual' },
    inicioEm: '2026-01-01',
    arquivada: false,
    ...dados,
  };
}

function marco(metaId: string, dia: string, quanto = 1): Marco {
  const t = carimbo();
  return { id: `marco-${sequencia}`, criadoEm: t, alteradoEm: t, metaId, dia, quanto };
}

function banco(partes: Partial<Banco> = {}): Banco {
  return { ...bancoVazio(), ...partes };
}

describe('a janela de cada período', () => {
  it('a semana vai de domingo a sábado', () => {
    expect(periodoEm('semana', HOJE)).toEqual({ de: '2026-09-13', ate: '2026-09-19' });
  });

  it('o mês vai do dia 1 ao último, que não é sempre 31', () => {
    expect(periodoEm('mes', HOJE)).toEqual({ de: '2026-09-01', ate: '2026-09-30' });
    expect(periodoEm('mes', '2026-02-10')).toEqual({ de: '2026-02-01', ate: '2026-02-28' });
    // 2028 é bissexto: o dia 29 existe e precisa entrar na janela.
    expect(periodoEm('mes', '2028-02-10')).toEqual({ de: '2028-02-01', ate: '2028-02-29' });
  });

  it('o ano vai de 1º de janeiro a 31 de dezembro', () => {
    expect(periodoEm('ano', HOJE)).toEqual({ de: '2026-01-01', ate: '2026-12-31' });
  });

  it('`sempre` não tem período: quem chama completa com o início da meta', () => {
    expect(periodoEm('sempre', HOJE)).toBeNull();
  });
});

describe('a janela que a meta conta', () => {
  it('termina hoje, e não no fim do mês', () => {
    // O que se mede é o que já foi feito. Com o mês inteiro na janela, um
    // salário lançado para o dia 30 daria a meta de poupança por batida no 1º.
    const { de, ate, fim } = janelaDaMeta(meta({ periodo: 'mes' }), HOJE);
    expect(de).toBe('2026-09-01');
    expect(ate).toBe(HOJE);
    expect(fim).toBe('2026-09-30');
  });

  it('começa no dia da meta quando ela nasceu no meio do período', () => {
    // Criar uma meta no dia 10 não pode trazer de graça o que fiz no dia 3.
    const { de } = janelaDaMeta(meta({ periodo: 'mes', inicioEm: '2026-09-10' }), HOJE);
    expect(de).toBe('2026-09-10');
  });

  it('meta que ainda não começou tem janela vazia, e não uma janela invertida', () => {
    const j = janelaDaMeta(meta({ inicioEm: '2026-12-01' }), HOJE);
    expect(j.vazia).toBe(true);
    expect(feitoNaJanela(banco(), meta({ inicioEm: '2026-12-01' }), j)).toBe(0);
  });

  it('em `sempre`, conta do início da meta até hoje', () => {
    const j = janelaDaMeta(meta({ periodo: 'sempre', inicioEm: '2025-03-04' }), HOJE);
    expect(j).toMatchObject({ de: '2025-03-04', ate: HOJE, fim: undefined, vazia: false });
  });
});

describe('de onde sai o número', () => {
  it('manual: soma os marcos do período e ignora os de fora', () => {
    const m = meta({ periodo: 'mes' });
    const b = banco({
      metas: [m],
      marcos: [
        marco(m.id, '2026-09-02', 3),
        marco(m.id, '2026-09-17', 2),
        marco(m.id, '2026-08-31', 9), // mês passado
        marco(m.id, '2026-09-25', 9), // ainda não chegou
        marco('outra-meta', '2026-09-05', 9),
      ],
    });
    expect(medirMeta(b, m, HOJE).feito).toBe(5);
  });

  it('rotina: conta as execuções daquela rotina, sem somar as das outras', () => {
    const m = meta({ fonte: { tipo: 'rotina', rotinaId: 'r1' } });
    const exec = (rotinaId: string, dia: string) => ({
      id: `e-${rotinaId}-${dia}`,
      criadoEm: carimbo(),
      alteradoEm: carimbo(),
      rotinaId,
      dia,
    });
    const b = banco({
      metas: [m],
      execucoes: [
        exec('r1', '2026-09-01'),
        exec('r1', '2026-09-16'),
        exec('r2', '2026-09-16'),
        exec('r1', '2026-08-30'),
      ],
    });
    expect(medirMeta(b, m, HOJE).feito).toBe(2);
  });

  it('tarefas: conta pelo dia local de `concluidaEm`, não pelos dez primeiros caracteres', () => {
    // Terminar às 22h em São Paulo já é o dia seguinte em UTC. Fatiar o ISO
    // jogaria esta tarefa para fora do mês — ou para dentro, no dia 31.
    const m = meta({ fonte: { tipo: 'tarefas' } });
    const noite = new Date(2026, 8, 30, 22, 0).toISOString();
    expect(noite.slice(0, 10)).toBe('2026-10-01'); // a armadilha, explicitada

    const b = banco({
      metas: [m],
      tarefas: [
        {
          id: 't1',
          criadoEm: carimbo(),
          alteradoEm: carimbo(),
          titulo: 'Fechar o mês',
          contexto: 'pessoal',
          concluidaEm: noite,
        },
      ],
    });
    // Medindo em 31/10 com período mensal: a tarefa é de setembro, não conta.
    expect(medirMeta(b, m, '2026-10-31').feito).toBe(0);
    // Medindo em 30/09: conta, porque localmente foi naquele dia.
    expect(medirMeta(b, m, '2026-09-30').feito).toBe(1);
  });

  it('tarefas: o filtro de projeto e o de contexto recortam de verdade', () => {
    const tarefa = (id: string, extra: Record<string, unknown>) => ({
      id,
      criadoEm: carimbo(),
      alteradoEm: carimbo(),
      titulo: id,
      contexto: 'pessoal' as const,
      concluidaEm: new Date(2026, 8, 15, 12).toISOString(),
      ...extra,
    });
    const tarefas = [
      tarefa('a', { projetoId: 'p1' }),
      tarefa('b', { projetoId: 'p2' }),
      tarefa('c', {}),
      tarefa('d', { contexto: 'profissional' as const }),
    ];

    const so = (fonte: Meta['fonte']) => medirMeta(banco({ tarefas }), meta({ fonte }), HOJE).feito;
    expect(so({ tipo: 'tarefas' })).toBe(4);
    expect(so({ tipo: 'tarefas', projetoId: 'p1' })).toBe(1);
    expect(so({ tipo: 'tarefas', contexto: 'profissional' })).toBe(1);
    expect(so({ tipo: 'tarefas', contexto: 'pessoal' })).toBe(3);
  });

  it('dinheiro: soma em centavos, pelo tipo, e a categoria recorta', () => {
    const lanc = (id: string, valor: number, extra: Record<string, unknown>) => ({
      id,
      criadoEm: carimbo(),
      alteradoEm: carimbo(),
      descricao: id,
      valor,
      tipo: 'saida' as const,
      categoria: 'lazer' as const,
      contexto: 'pessoal' as const,
      data: '2026-09-05',
      ...extra,
    });
    const b = banco({
      lancamentos: [
        lanc('cinema', 5_000, {}),
        lanc('bar', 12_000, {}),
        lanc('mercado', 30_000, { categoria: 'alimentacao' as const }),
        lanc('salario', 900_000, { tipo: 'entrada' as const, categoria: 'receita' as const }),
      ],
    });

    const gastoEmLazer = meta({
      direcao: 'limitar',
      alvo: 80_000,
      fonte: { tipo: 'dinheiro', movimento: 'saida', categoria: 'lazer' },
    });
    expect(medirMeta(b, gastoEmLazer, HOJE).feito).toBe(17_000);

    const tudoQueSaiu = meta({ fonte: { tipo: 'dinheiro', movimento: 'saida' } });
    expect(medirMeta(b, tudoQueSaiu, HOJE).feito).toBe(47_000);

    const tudoQueEntrou = meta({ fonte: { tipo: 'dinheiro', movimento: 'entrada' } });
    expect(medirMeta(b, tudoQueEntrou, HOJE).feito).toBe(900_000);
  });

  it('dinheiro: o que está lançado para depois de hoje não conta como feito', () => {
    // A regra que a janela existe para garantir, cobrada aqui de novo porque é
    // a que faria uma meta de poupança mentir logo no dia 1º.
    const m = meta({ fonte: { tipo: 'dinheiro', movimento: 'entrada' }, alvo: 100_000 });
    const b = banco({
      lancamentos: [
        {
          id: 'futuro',
          criadoEm: carimbo(),
          alteradoEm: carimbo(),
          descricao: 'Salário',
          valor: 900_000,
          tipo: 'entrada',
          categoria: 'receita',
          contexto: 'profissional',
          data: '2026-09-30',
        },
      ],
    });
    expect(medirMeta(b, m, HOJE).feito).toBe(0);
  });
});

describe('a medida', () => {
  it('a barra não passa de cheia, mas o número passa do alvo', () => {
    const m = meta({ alvo: 10 });
    const b = banco({ metas: [m], marcos: [marco(m.id, '2026-09-05', 14)] });
    const medida = medirMeta(b, m, HOJE);
    expect(medida.feito).toBe(14);
    expect(medida.fracao).toBe(1);
    expect(medida.noAlvo).toBe(true);
    expect(medida.falta).toBe(0);
  });

  it('meta de limite começa no alvo e sai dele ao estourar', () => {
    // O mês começa dentro do limite. Chamar isso de "batida" no dia 1º seria
    // comemorar o que ainda não aconteceu — por isso o campo é `noAlvo`.
    const m = meta({ direcao: 'limitar', alvo: 10 });
    const dentro = medirMeta(banco({ metas: [m] }), m, HOJE);
    expect(dentro.noAlvo).toBe(true);
    expect(dentro.estourou).toBe(false);
    expect(dentro.atrasada).toBe(false);

    const b = banco({ metas: [m], marcos: [marco(m.id, '2026-09-05', 11)] });
    const fora = medirMeta(b, m, HOJE);
    expect(fora.noAlvo).toBe(false);
    expect(fora.estourou).toBe(true);
    // Limite nunca "atrasa": está dentro ou estourado.
    expect(fora.atrasada).toBe(false);
  });

  it('o ritmo compara com o calendário, que é o que dá sentido ao número', () => {
    // 17 de 30 dias decorridos = 56,6% do mês. 2 de 20 = 10% da meta.
    const m = meta({ alvo: 20 });
    const b = banco({ metas: [m], marcos: [marco(m.id, '2026-09-02', 2)] });
    const medida = medirMeta(b, m, HOJE);

    expect(medida.decorrido).toBeCloseTo(17 / 30, 5);
    expect(medida.atrasada).toBe(true);
    expect(medida.diasRestantes).toBe(14); // 17 a 30, contando hoje
    expect(medida.porDia).toBeCloseTo(18 / 14, 5);
  });

  it('o mesmo número no dia 3 não está atrasado', () => {
    const m = meta({ alvo: 20 });
    const b = banco({ metas: [m], marcos: [marco(m.id, '2026-09-02', 2)] });
    // 3 de 30 dias = 10% do mês; 2 de 20 = 10% da meta. Empate não é atraso.
    expect(medirMeta(b, m, '2026-09-03').atrasada).toBe(false);
  });

  it('meta já cumprida não é atrasada, mesmo no último dia', () => {
    const m = meta({ alvo: 20 });
    const b = banco({ metas: [m], marcos: [marco(m.id, '2026-09-02', 20)] });
    expect(medirMeta(b, m, '2026-09-30').atrasada).toBe(false);
  });

  it('em `sempre` não há ritmo nem dias restantes para inventar', () => {
    const medida = medirMeta(banco(), meta({ periodo: 'sempre' }), HOJE);
    expect(medida.decorrido).toBeUndefined();
    expect(medida.diasRestantes).toBeUndefined();
    expect(medida.porDia).toBeUndefined();
    expect(medida.atrasada).toBe(false);
  });

  it('não sugere ritmo para o que já está feito', () => {
    const m = meta({ alvo: 5 });
    const b = banco({ metas: [m], marcos: [marco(m.id, '2026-09-02', 5)] });
    expect(medirMeta(b, m, HOJE).porDia).toBeUndefined();
  });

  it('alvo zero vindo de arquivo editado à mão não vira Infinity na tela', () => {
    const m = meta({ alvo: 0 });
    const b = banco({ metas: [m], marcos: [marco(m.id, '2026-09-02', 3)] });
    expect(medirMeta(b, m, HOJE).fracao).toBe(0);
  });
});

describe('o conjunto', () => {
  it('a arquivada some da lista', () => {
    const b = banco({ metas: [meta({ titulo: 'Viva' }), meta({ titulo: 'Morta', arquivada: true })] });
    expect(metasEmCurso(b, HOJE).map((m) => m.meta.titulo)).toEqual(['Viva']);
  });

  it('quem pede atenção vem primeiro', () => {
    const atrasada = meta({ titulo: 'Atrasada', alvo: 20 });
    const estourada = meta({ titulo: 'Estourada', direcao: 'limitar', alvo: 5 });
    const tranquila = meta({ titulo: 'Tranquila', alvo: 20 });
    const b = banco({
      metas: [tranquila, estourada, atrasada],
      marcos: [marco(tranquila.id, '2026-09-02', 20), marco(estourada.id, '2026-09-02', 9)],
    });

    expect(metasEmCurso(b, HOJE).map((m) => m.meta.titulo)).toEqual([
      'Atrasada',
      'Estourada',
      'Tranquila',
    ]);
  });

  it('a ordem não muda entre dois desenhos da mesma lista', () => {
    // Sem desempate estável a tela pisca sem nada ter mudado.
    const iguais = [meta({ titulo: 'A' }), meta({ titulo: 'B' }), meta({ titulo: 'C' })];
    const uma = metasEmCurso(banco({ metas: iguais }), HOJE).map((m) => m.meta.id);
    const outra = metasEmCurso(banco({ metas: [...iguais].reverse() }), HOJE).map((m) => m.meta.id);
    expect(uma).toEqual(outra);
  });

  it('o contexto recorta', () => {
    const b = banco({
      metas: [meta({ titulo: 'Casa' }), meta({ titulo: 'Trabalho', contexto: 'profissional' })],
    });
    expect(metasEmCurso(b, HOJE, 'profissional').map((m) => m.meta.titulo)).toEqual(['Trabalho']);
  });

  it('o resumo conta o que o donut mostra', () => {
    const batida = meta({ alvo: 2 });
    const atrasada = meta({ alvo: 20 });
    const b = banco({ metas: [batida, atrasada], marcos: [marco(batida.id, '2026-09-02', 2)] });
    expect(resumoDeMetas(metasEmCurso(b, HOJE))).toEqual({
      total: 2,
      noAlvo: 1,
      atrasadas: 1,
      estouradas: 0,
    });
  });
});

describe('o que uma meta não pode ser', () => {
  const valida = { titulo: 'Treinar', alvo: 20, inicioEm: '2026-09-01' };

  it('aceita a meta boa', () => {
    expect(() => validarMeta(valida)).not.toThrow();
  });

  it('recusa título em branco', () => {
    expect(() => validarMeta({ ...valida, titulo: '   ' })).toThrow(MetaInvalida);
  });

  it('recusa alvo zero ou negativo', () => {
    expect(() => validarMeta({ ...valida, alvo: 0 })).toThrow(MetaInvalida);
    expect(() => validarMeta({ ...valida, alvo: -3 })).toThrow(MetaInvalida);
  });

  it('recusa alvo quebrado: dinheiro é centavo inteiro, e vezes não são 2,5', () => {
    expect(() => validarMeta({ ...valida, alvo: 2.5 })).toThrow(MetaInvalida);
  });

  it('recusa data de início que não existe', () => {
    expect(() => validarMeta({ ...valida, inicioEm: '2026-02-30' })).toThrow(MetaInvalida);
    expect(() => validarMeta({ ...valida, inicioEm: 'ontem' })).toThrow(MetaInvalida);
  });
});
