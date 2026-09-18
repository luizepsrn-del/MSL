import { describe, it, expect } from 'vitest';
import {
  diasSemBackup,
  precisaDeBackup,
  descreverUltimoBackup,
  DIAS_ATE_COBRAR,
} from './backup';

/** Um instante que cai naquele dia no fuso desta máquina. */
function em(ano: number, mes: number, dia: number, hora = 12): Date {
  return new Date(ano, mes - 1, dia, hora);
}

const AGORA = em(2026, 9, 18);

describe('há quanto tempo não exporto', () => {
  it('conta os dias desde o último arquivo', () => {
    expect(diasSemBackup({ ultimoBackupEm: em(2026, 9, 18).toISOString() }, AGORA)).toBe(0);
    expect(diasSemBackup({ ultimoBackupEm: em(2026, 9, 17).toISOString() }, AGORA)).toBe(1);
    expect(diasSemBackup({ ultimoBackupEm: em(2026, 9, 9).toISOString() }, AGORA)).toBe(9);
  });

  it('nunca é diferente de zero', () => {
    // Nunca é o caso mais urgente; zero é o mais tranquilo. Confundir os dois
    // faria a tela dizer "exportado hoje" para quem nunca exportou.
    expect(diasSemBackup(undefined, AGORA)).toBeNull();
    expect(diasSemBackup({}, AGORA)).toBeNull();
    expect(diasSemBackup({ blocosDoInicio: ['hoje'] }, AGORA)).toBeNull();
  });

  it('conta pelo dia local, e não pelo corte do ISO', () => {
    // Exportar às 22h em São Paulo é dia 17 aqui e dia 18 em UTC.
    const noiteDeOntem = em(2026, 9, 17, 22).toISOString();
    expect(diasSemBackup({ ultimoBackupEm: noiteDeOntem }, AGORA)).toBe(1);
  });

  it('data no futuro não vira dia negativo', () => {
    // Acontece com relógio errado ou arquivo trazido de outro aparelho.
    const amanha = em(2026, 9, 25).toISOString();
    expect(diasSemBackup({ ultimoBackupEm: amanha }, AGORA)).toBe(0);
  });

  it('instante ilegível conta como nunca, em vez de quebrar', () => {
    expect(diasSemBackup({ ultimoBackupEm: 'qualquer coisa' }, AGORA)).toBeNull();
  });
});

describe('quando o sistema cobra', () => {
  it('cobra a partir de sete dias', () => {
    const seis = { ultimoBackupEm: em(2026, 9, 12).toISOString() };
    const sete = { ultimoBackupEm: em(2026, 9, 11).toISOString() };
    expect(diasSemBackup(seis, AGORA)).toBe(6);
    expect(precisaDeBackup(seis, AGORA)).toBe(false);
    expect(diasSemBackup(sete, AGORA)).toBe(7);
    expect(precisaDeBackup(sete, AGORA)).toBe(true);
  });

  it('quem nunca exportou é cobrado desde o começo', () => {
    expect(precisaDeBackup(undefined, AGORA)).toBe(true);
  });

  it('o prazo é o mesmo dos sete dias do Safari', () => {
    // Não é número escolhido à toa: é a janela em que o navegador apaga o
    // armazenamento de um site que não está instalado.
    expect(DIAS_ATE_COBRAR).toBe(7);
  });

  it('dá para apertar ou afrouxar o prazo', () => {
    const tres = { ultimoBackupEm: em(2026, 9, 15).toISOString() };
    expect(precisaDeBackup(tres, AGORA, 3)).toBe(true);
    expect(precisaDeBackup(tres, AGORA, 30)).toBe(false);
  });
});

describe('o texto', () => {
  it('diz o número, e não um aviso genérico', () => {
    // "Faça backup" a gente aprende a ignorar; "há nove dias" não.
    expect(descreverUltimoBackup({ ultimoBackupEm: em(2026, 9, 9).toISOString() }, AGORA)).toBe(
      'Exportado há 9 dias',
    );
  });

  it('hoje e ontem por extenso', () => {
    expect(descreverUltimoBackup({ ultimoBackupEm: em(2026, 9, 18).toISOString() }, AGORA)).toBe(
      'Exportado hoje',
    );
    expect(descreverUltimoBackup({ ultimoBackupEm: em(2026, 9, 17).toISOString() }, AGORA)).toBe(
      'Exportado ontem',
    );
  });

  it('nunca tem texto próprio', () => {
    expect(descreverUltimoBackup(undefined, AGORA)).toBe('Nunca exportado');
  });
});
