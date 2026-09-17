import { describe, it, expect } from 'vitest';
import { lucideKey } from './Icon';

/**
 * A conversão de nome do Icon.
 *
 * Existe por causa de um defeito real: a versão anterior só maiusculizava
 * letras depois do hífen, então `trash-2` virava `Trash-2`, que não existe no
 * Lucide. O ícone renderizava uma caixa vazia sem erro nenhum — nem no lint,
 * nem no typecheck, nem no console. Só olhando a tela aparecia.
 */
describe('lucideKey', () => {
  it('converte os nomes que o kit já usava', () => {
    // Estes vêm do vocabulário de ícones registrado no DESIGN.md. A conversão
    // nova precisa dar exatamente o mesmo resultado que a antiga dava para
    // eles, senão o kit de logística quebra.
    const iguais: [string, string][] = [
      ['truck', 'Truck'],
      ['bell', 'Bell'],
      ['layout-dashboard', 'LayoutDashboard'],
      ['clipboard-list', 'ClipboardList'],
      ['chart-no-axes-combined', 'ChartNoAxesCombined'],
      ['arrow-up-down', 'ArrowUpDown'],
      ['check-check', 'CheckCheck'],
      ['more-vertical', 'MoreVertical'],
      ['shield-question-mark', 'ShieldQuestionMark'],
      ['map-pin', 'MapPin'],
      ['battery-full', 'BatteryFull'],
      ['alert-triangle', 'AlertTriangle'],
    ];
    for (const [entrada, esperado] of iguais) {
      expect(lucideKey(entrada), entrada).toBe(esperado);
    }
  });

  it('converte nome com dígito, que era o defeito', () => {
    expect(lucideKey('trash-2')).toBe('Trash2');
    expect(lucideKey('user-2')).toBe('User2');
    expect(lucideKey('volume-1')).toBe('Volume1');
  });

  it('não inventa nada com entrada estranha', () => {
    expect(lucideKey('')).toBe('');
    expect(lucideKey('x')).toBe('X');
  });
});
