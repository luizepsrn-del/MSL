import { describe, it, expect } from 'vitest';
import { ehAtualizacao, MINUTOS_ENTRE_PERGUNTAS } from './versaoNova';

/**
 * O aviso de versão nova.
 *
 * O gancho conversa com o navegador e é coberto pelo uso; o que se prova aqui
 * é a única decisão dele — e ela tem um jeito óbvio de errar: avisar "tem uma
 * versão nova" para quem acabou de abrir o sistema pela primeira vez.
 */
describe('quando um operário instalado é uma atualização', () => {
  it('instalado com um operário no comando é troca de versão', () => {
    expect(ehAtualizacao('installed', true)).toBe(true);
  });

  it('instalado sem ninguém no comando é a primeira visita', () => {
    // Não há versão anterior para substituir. Avisar aqui seria mentira, e a
    // pessoa clicaria em "Atualizar" para recarregar o que ela acabou de abrir.
    expect(ehAtualizacao('installed', false)).toBe(false);
  });

  it('qualquer outro estado não é nada ainda', () => {
    for (const estado of ['installing', 'activating', 'activated', 'redundant', 'parsed']) {
      expect(ehAtualizacao(estado, true), estado).toBe(false);
    }
  });
});

describe('de quanto em quanto tempo perguntar', () => {
  it('é um intervalo humano, nem por minuto nem por dia', () => {
    // Por minuto é um pedido de rede a cada minuto para sempre; por dia, a
    // versão nova espera um dia num app que quase nunca navega.
    expect(MINUTOS_ENTRE_PERGUNTAS).toBeGreaterThanOrEqual(5);
    expect(MINUTOS_ENTRE_PERGUNTAS).toBeLessThanOrEqual(120);
  });
});
