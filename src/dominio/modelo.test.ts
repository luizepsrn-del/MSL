import { describe, it, expect } from 'vitest';
import {
  aplicarModelo,
  ordenarItens,
  modeloDeProjeto,
  validarModelo,
  descreverModelo,
  ModeloInvalido,
} from './modelo';
import type { Modelo, Projeto, Tarefa } from '../dados/esquema';

const HOJE = '2026-09-17';
const base = { id: 'x', criadoEm: 'c', alteradoEm: 'a' };

const modelo = (dados: Partial<Modelo> = {}): Modelo => ({
  ...base,
  id: 'm1',
  titulo: 'Lançar um produto',
  contexto: 'profissional',
  itens: [
    { titulo: 'Escrever a página', diasAntes: 14 },
    { titulo: 'Revisar o texto', diasAntes: 3 },
    { titulo: 'Publicar', diasAntes: 0, hora: '09:00' },
    { titulo: 'Medir o resultado', diasAntes: -7 },
  ],
  ...dados,
});

describe('aplicar o modelo', () => {
  it('conta os prazos para trás a partir da entrega', () => {
    const { projeto, tarefas } = aplicarModelo(modelo(), '2026-10-01');

    expect(projeto).toEqual({
      titulo: 'Lançar um produto',
      contexto: 'profissional',
      descricao: undefined,
      prazo: '2026-10-01',
    });
    expect(tarefas.map((t) => `${t.prazo} ${t.titulo}`)).toEqual([
      '2026-09-17 Escrever a página',
      '2026-09-28 Revisar o texto',
      '2026-10-01 Publicar',
      '2026-10-08 Medir o resultado',
    ]);
  });

  it('dias negativos caem depois da entrega', () => {
    // "Medir o resultado" só acontece com a coisa no ar.
    const { tarefas } = aplicarModelo(modelo(), '2026-10-01');
    expect(tarefas.at(-1)).toMatchObject({ titulo: 'Medir o resultado', prazo: '2026-10-08' });
  });

  it('a hora do item viaja para a tarefa', () => {
    const { tarefas } = aplicarModelo(modelo(), '2026-10-01');
    expect(tarefas.find((t) => t.titulo === 'Publicar')?.hora).toBe('09:00');
    expect(tarefas.find((t) => t.titulo === 'Revisar o texto')?.hora).toBeUndefined();
  });

  it('o contexto do modelo vale para todas as tarefas', () => {
    const { tarefas } = aplicarModelo(modelo({ contexto: 'pessoal' }), '2026-10-01');
    expect(tarefas.every((t) => t.contexto === 'pessoal')).toBe(true);
  });

  it('dá para batizar a entrega sem renomear a receita', () => {
    // "Lançar o curso de março" é o prato; "Lançar um produto" é a receita.
    const { projeto } = aplicarModelo(modelo(), '2026-10-01', 'Lançar o curso de março');
    expect(projeto.titulo).toBe('Lançar o curso de março');
  });

  it('título em branco cai no nome do modelo, em vez de num projeto sem nome', () => {
    expect(aplicarModelo(modelo(), '2026-10-01', '   ').projeto.titulo).toBe('Lançar um produto');
  });

  it('atravessa a virada do mês e do ano', () => {
    const { tarefas } = aplicarModelo(
      modelo({ itens: [{ titulo: 'Preparar', diasAntes: 45 }] }),
      '2027-01-10',
    );
    expect(tarefas[0].prazo).toBe('2026-11-26');
  });

  it('modelo sem item nenhum cria o projeto vazio, e não quebra', () => {
    const { projeto, tarefas } = aplicarModelo(modelo({ itens: [] }), '2026-10-01');
    expect(projeto.prazo).toBe('2026-10-01');
    expect(tarefas).toEqual([]);
  });
});

describe('a ordem dos itens', () => {
  it('mais dias antes vem primeiro', () => {
    expect(ordenarItens(modelo().itens).map((i) => i.diasAntes)).toEqual([14, 3, 0, -7]);
  });

  it('empate desempata pelo título, e a ordem não muda entre duas leituras', () => {
    // Um modelo que embaralha a cada abertura não dá para conferir.
    const itens = [
      { titulo: 'Bravo', diasAntes: 5 },
      { titulo: 'Alfa', diasAntes: 5 },
      { titulo: 'Charlie', diasAntes: 5 },
    ];
    expect(ordenarItens(itens).map((i) => i.titulo)).toEqual(['Alfa', 'Bravo', 'Charlie']);
    expect(ordenarItens([...itens].reverse())).toEqual(ordenarItens(itens));
  });

  it('não muda a lista original', () => {
    const itens = modelo().itens;
    const antes = itens.map((i) => i.titulo);
    ordenarItens(itens);
    expect(itens.map((i) => i.titulo)).toEqual(antes);
  });
});

describe('virar modelo a partir de um projeto', () => {
  const projeto = (dados: Partial<Projeto> = {}): Projeto => ({
    ...base,
    id: 'p1',
    titulo: 'Campanha de setembro',
    contexto: 'profissional',
    prazo: '2026-10-01',
    ...dados,
  });

  const tarefa = (titulo: string, prazo?: string, extra: Partial<Tarefa> = {}): Tarefa => ({
    ...base,
    id: titulo,
    titulo,
    contexto: 'profissional',
    projetoId: 'p1',
    prazo,
    ...extra,
  });

  it('os prazos viram distâncias até a entrega', () => {
    const feito = modeloDeProjeto(
      projeto(),
      [
        tarefa('Escrever', '2026-09-17'),
        tarefa('Revisar', '2026-09-28'),
        tarefa('Medir', '2026-10-08'),
      ],
      HOJE,
    )!;

    expect(feito.itens.map((i) => [i.titulo, i.diasAntes])).toEqual([
      ['Escrever', 14],
      ['Revisar', 3],
      ['Medir', -7],
    ]);
  });

  it('a volta é fiel: projeto → modelo → projeto dá os mesmos prazos', () => {
    // É a prova de que as duas contas são a mesma, em sentidos opostos.
    const tarefas = [
      tarefa('Escrever', '2026-09-17'),
      tarefa('Revisar', '2026-09-28'),
      tarefa('Publicar', '2026-10-01'),
    ];
    const comoModelo = modeloDeProjeto(projeto(), tarefas, HOJE)!;
    const devolta = aplicarModelo({ ...base, ...comoModelo } as Modelo, '2026-10-01');

    expect(devolta.tarefas.map((t) => `${t.prazo} ${t.titulo}`).sort()).toEqual(
      tarefas.map((t) => `${t.prazo} ${t.titulo}`).sort(),
    );
  });

  it('tarefa sem prazo vira "no dia da entrega"', () => {
    // Zero é a resposta honesta para "quantos dias antes?" quando ninguém disse.
    const feito = modeloDeProjeto(projeto(), [tarefa('Sem data')], HOJE)!;
    expect(feito.itens[0].diasAntes).toBe(0);
  });

  it('só as tarefas daquele projeto entram', () => {
    const feito = modeloDeProjeto(
      projeto(),
      [tarefa('Minha', '2026-09-17'), tarefa('De outro', '2026-09-17', { projetoId: 'p2' })],
      HOJE,
    )!;
    expect(feito.itens.map((i) => i.titulo)).toEqual(['Minha']);
  });

  it('projeto sem prazo não vira modelo', () => {
    // Sem entrega não há de onde contar, e sairiam todas no mesmo dia.
    expect(modeloDeProjeto(projeto({ prazo: undefined }), [tarefa('X', '2026-09-17')], HOJE)).toBeNull();
    expect(modeloDeProjeto(projeto({ prazo: '2026-02-30' }), [tarefa('X')], HOJE)).toBeNull();
  });

  it('projeto sem tarefa nenhuma não vira modelo', () => {
    expect(modeloDeProjeto(projeto(), [], HOJE)).toBeNull();
  });
});

describe('o que um modelo não pode ser', () => {
  it('aceita o modelo bom', () => {
    expect(() => validarModelo(modelo())).not.toThrow();
  });

  it('recusa nome em branco', () => {
    expect(() => validarModelo(modelo({ titulo: '  ' }))).toThrow(ModeloInvalido);
  });

  it('recusa modelo sem tarefa: ele não criaria nada', () => {
    expect(() => validarModelo(modelo({ itens: [] }))).toThrow(ModeloInvalido);
  });

  it('recusa tarefa sem nome e dia quebrado', () => {
    expect(() => validarModelo(modelo({ itens: [{ titulo: ' ', diasAntes: 3 }] }))).toThrow(
      ModeloInvalido,
    );
    expect(() => validarModelo(modelo({ itens: [{ titulo: 'X', diasAntes: 2.5 }] }))).toThrow(
      ModeloInvalido,
    );
  });
});

describe('a descrição', () => {
  it('diz quantas e de quando até quando', () => {
    expect(descreverModelo(modelo())).toBe('4 tarefas · de 14 dias antes até 7 depois');
  });

  it('um item só não vira intervalo', () => {
    expect(descreverModelo(modelo({ itens: [{ titulo: 'X', diasAntes: 1 }] }))).toBe(
      '1 tarefa · 1 dia antes',
    );
  });

  it('tudo no dia da entrega se diz assim', () => {
    expect(
      descreverModelo(
        modelo({ itens: [{ titulo: 'A', diasAntes: 0 }, { titulo: 'B', diasAntes: 0 }] }),
      ),
    ).toBe('2 tarefas · no dia');
  });
});
