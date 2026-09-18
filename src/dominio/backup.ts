import type { Preferencias } from '../dados/esquema';
import { diaLocalDe, distanciaEmDias } from './rotina';

/**
 * Há quanto tempo o dado não é salvo fora daqui.
 *
 * O sistema guarda tudo no navegador deste aparelho. Isso some de três
 * maneiras: o Safari apaga o armazenamento de site não instalado após sete
 * dias sem uso, o navegador pode ser limpo por engano, e o aparelho pode
 * quebrar. A instalação cobre a primeira; o arquivo exportado cobre as três.
 *
 * Por isso a única regra aqui: lembrar, e lembrar com um número, não com um
 * aviso genérico que se aprende a ignorar.
 */

/** A partir de quantos dias sem exportar o aviso aparece. */
export const DIAS_ATE_COBRAR = 7;

/**
 * Quantos dias desde o último arquivo exportado.
 *
 * `null` quer dizer "nunca" — que é diferente de zero, e a tela precisa saber
 * a diferença: nunca é o caso mais urgente, e zero é o mais tranquilo.
 */
export function diasSemBackup(preferencias: Preferencias | undefined, agora: Date): number | null {
  const ultimo = preferencias?.ultimoBackupEm;
  if (!ultimo) return null;

  const dia = diaLocalDe(ultimo);
  const hoje = diaLocalDe(agora.toISOString());
  const dias = distanciaEmDias(dia, hoje);

  // Data no futuro acontece com relógio errado ou arquivo de outro aparelho:
  // contar negativo viraria "exportado há -3 dias".
  return Number.isNaN(dias) ? null : Math.max(0, dias);
}

export function precisaDeBackup(
  preferencias: Preferencias | undefined,
  agora: Date,
  limite = DIAS_ATE_COBRAR,
): boolean {
  const dias = diasSemBackup(preferencias, agora);
  // Nunca exportado cobra desde o primeiro dia: é o estado mais frágil.
  return dias === null || dias >= limite;
}

/** `Nunca exportado` · `Exportado hoje` · `Exportado há 9 dias` */
export function descreverUltimoBackup(
  preferencias: Preferencias | undefined,
  agora: Date,
): string {
  const dias = diasSemBackup(preferencias, agora);
  if (dias === null) return 'Nunca exportado';
  if (dias === 0) return 'Exportado hoje';
  if (dias === 1) return 'Exportado ontem';
  return `Exportado há ${dias} dias`;
}
