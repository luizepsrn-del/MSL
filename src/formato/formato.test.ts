import { describe, it, expect } from 'vitest';
import {
  formatarData,
  formatarDataMedia,
  formatarDataLonga,
  formatarHora,
  formatarDataHora,
  formatarDiaDaSemana,
  formatarMes,
  formatarDataRelativa,
  formatarMoeda,
  lerMoeda,
  formatarNumero,
  formatarPorcento,
  compararTexto,
  ordenarPor,
  PRIMEIRO_DIA_DA_SEMANA,
} from './index';

/**
 * Datas fixas em UTC, para o teste não depender do relógio nem do fuso da
 * máquina. 2026-01-03T17:30:00Z é 14:30 em São Paulo (UTC-3).
 */
const TARDE = new Date('2026-01-03T17:30:00Z');

describe('data e hora', () => {
  it('formata no padrão brasileiro', () => {
    expect(formatarData(TARDE)).toBe('03/01/2026');
    expect(formatarDataMedia(TARDE)).toBe('3 de jan. de 2026');
    expect(formatarDataLonga(TARDE)).toBe('3 de janeiro de 2026');
  });

  it('usa 24h, nunca AM/PM', () => {
    expect(formatarHora(TARDE)).toBe('14:30');
    expect(formatarHora(TARDE)).not.toMatch(/AM|PM/i);
  });

  it('junta data e hora', () => {
    expect(formatarDataHora(TARDE)).toBe('03/01/2026 14:30');
  });

  it('nomeia dia da semana e mês em português', () => {
    expect(formatarDiaDaSemana(TARDE)).toBe('sábado');
    expect(formatarMes(TARDE)).toBe('janeiro de 2026');
  });

  it('exibe no fuso de São Paulo, não em UTC', () => {
    // 2026-01-04T01:00:00Z ainda é dia 3 às 22h em São Paulo.
    const viradaUtc = new Date('2026-01-04T01:00:00Z');
    expect(formatarData(viradaUtc)).toBe('03/01/2026');
    expect(formatarHora(viradaUtc)).toBe('22:00');
  });

  it('a semana começa no domingo', () => {
    expect(PRIMEIRO_DIA_DA_SEMANA).toBe(0);
  });
});

describe('data relativa', () => {
  const agora = new Date('2026-01-03T12:00:00Z');

  it('nomeia os dias próximos', () => {
    expect(formatarDataRelativa(new Date('2026-01-03T20:00:00Z'), agora)).toBe('hoje');
    expect(formatarDataRelativa(new Date('2026-01-02T12:00:00Z'), agora)).toBe('ontem');
    expect(formatarDataRelativa(new Date('2026-01-04T12:00:00Z'), agora)).toBe('amanhã');
  });

  it('conta dias de calendário, não intervalos de 24h', () => {
    // 23h de hoje → 1h de amanhã são 2 horas de distância, mas um dia de
    // calendário. Para uma tarefa, o que importa é o dia.
    const tardeDaNoite = new Date('2026-01-04T02:00:00Z'); // 23:00 do dia 3 em SP
    const madrugada = new Date('2026-01-04T04:00:00Z'); //    01:00 do dia 4 em SP
    expect(formatarDataRelativa(madrugada, tardeDaNoite)).toBe('amanhã');
  });

  it('usa as palavras que o português tem', () => {
    // pt-BR nomeia -2 e +2; só a partir de 3 vira contagem.
    expect(formatarDataRelativa(new Date('2026-01-01T12:00:00Z'), agora)).toBe('anteontem');
    expect(formatarDataRelativa(new Date('2026-01-05T12:00:00Z'), agora)).toBe(
      'depois de amanhã',
    );
  });

  it('conta os dias mais distantes', () => {
    expect(formatarDataRelativa(new Date('2026-01-06T12:00:00Z'), agora)).toBe('em 3 dias');
    expect(formatarDataRelativa(new Date('2025-12-31T12:00:00Z'), agora)).toBe('há 3 dias');
  });
});

/**
 * O Intl separa `R$` do número com espaço NÃO-QUEBRÁVEL (U+00A0), não com
 * espaço comum. É tipografia correta — evita que o `R$` fique órfão no fim da
 * linha — e fica como está. As constantes abaixo tornam isso visível, para
 * ninguém "consertar" com um replace depois.
 */
const NBSP = '\u00A0';
const reais = (texto: string) => `R$${NBSP}${texto}`;

describe('dinheiro', () => {
  it('separa o símbolo com espaço não-quebrável', () => {
    expect(formatarMoeda(100)).toContain(NBSP);
    expect(formatarMoeda(100)).not.toBe('R$ 1,00'); // espaço comum não bate
  });

  it('formata centavos como real', () => {
    expect(formatarMoeda(123456)).toBe(reais('1.234,56'));
    expect(formatarMoeda(0)).toBe(reais('0,00'));
    expect(formatarMoeda(5)).toBe(reais('0,05'));
    expect(formatarMoeda(-2599)).toBe(`-${reais('25,99')}`);
  });

  it('recusa valor não inteiro em vez de arredondar escondido', () => {
    expect(() => formatarMoeda(12.5)).toThrow(TypeError);
  });

  it('centavos inteiros não têm erro de ponto flutuante', () => {
    // O motivo de dinheiro ser inteiro: 0.1 + 0.2 !== 0.3 em ponto flutuante.
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(10 + 20).toBe(30);
    expect(formatarMoeda(10 + 20)).toBe(reais('0,30'));
  });

  it('soma de muitos lançamentos fecha exata', () => {
    const lancamentos = Array.from({ length: 1000 }, () => 10); // mil vezes R$ 0,10
    expect(lancamentos.reduce((a, b) => a + b, 0)).toBe(10_000);
    expect(formatarMoeda(10_000)).toBe(reais('100,00'));
  });

  it('lê o que eu digito', () => {
    expect(lerMoeda('1.234,56')).toBe(123456);
    expect(lerMoeda('R$ 1.234,56')).toBe(123456);
    expect(lerMoeda('1234,56')).toBe(123456);
    expect(lerMoeda('1234.56')).toBe(123456);
    expect(lerMoeda('42')).toBe(4200);
    expect(lerMoeda('-25,99')).toBe(-2599);
  });

  it('devolve null em vez de NaN quando não dá para ler', () => {
    expect(lerMoeda('')).toBeNull();
    expect(lerMoeda('abc')).toBeNull();
    expect(lerMoeda('12,34,56')).toBeNull();
  });

  it('ida e volta preserva o valor', () => {
    for (const centavos of [0, 5, 99, 100, 123456, 999_999_99]) {
      expect(lerMoeda(formatarMoeda(centavos))).toBe(centavos);
    }
  });
});

describe('números', () => {
  it('agrupa milhar com ponto', () => {
    expect(formatarNumero(1_234_567)).toBe('1.234.567');
  });

  it('formata porcentagem a partir da fração', () => {
    expect(formatarPorcento(0.57)).toBe('57%');
    expect(formatarPorcento(1)).toBe('100%');
  });
});

describe('ordenação', () => {
  it('trata acento como a letra base', () => {
    expect(compararTexto('Ágata', 'Alberto')).toBeLessThan(0);
    expect(compararTexto('acai', 'açaí')).toBe(0);
  });

  it('ordena uma lista de nomes como um brasileiro espera', () => {
    const nomes = ['Zulu', 'Ágata', 'Ana', 'Órion', 'Bruno'];
    expect(ordenarPor(nomes, (n) => n)).toEqual(['Ágata', 'Ana', 'Bruno', 'Órion', 'Zulu']);
  });

  it('ordena número dentro de texto pelo valor', () => {
    const itens = ['item 10', 'item 9', 'item 1'];
    expect(ordenarPor(itens, (i) => i)).toEqual(['item 1', 'item 9', 'item 10']);
  });

  it('não muda a lista original', () => {
    const original = ['b', 'a'];
    ordenarPor(original, (x) => x);
    expect(original).toEqual(['b', 'a']);
  });
});
