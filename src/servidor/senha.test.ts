import { describe, it, expect } from 'vitest';
import { embaralhar, conferir, precisaReforcar, segredo } from './senha';

describe('guardar senha', () => {
  it('a senha certa entra e a errada não', async () => {
    const guardado = await embaralhar('uma senha bem comprida');
    expect(await conferir('uma senha bem comprida', guardado)).toBe(true);
    expect(await conferir('uma senha bem comprid', guardado)).toBe(false);
    expect(await conferir('', guardado)).toBe(false);
  });

  it('a mesma senha nunca dá o mesmo hash', async () => {
    // Sal diferente a cada vez: sem isso, duas contas com a mesma senha teriam
    // o mesmo registro, e quebrar uma quebraria as duas.
    const a = await embaralhar('mesma senha');
    const b = await embaralhar('mesma senha');
    expect(a).not.toBe(b);
    expect(await conferir('mesma senha', a)).toBe(true);
    expect(await conferir('mesma senha', b)).toBe(true);
  });

  it('a senha crua não aparece no que é guardado', async () => {
    const guardado = await embaralhar('correio cavalo bateria grampo');
    expect(guardado).not.toContain('correio');
    expect(guardado).not.toContain('cavalo');
  });

  it('os parâmetros viajam junto do hash', async () => {
    // Sem eles, subir o custo um dia invalidaria toda senha já cadastrada.
    const guardado = await embaralhar('seja qual for');
    const [algoritmo, custo, bloco, paralelo, sal, hash] = guardado.split('$');
    expect(algoritmo).toBe('scrypt');
    expect(Number(custo)).toBeGreaterThanOrEqual(2 ** 16);
    expect(Number(bloco)).toBe(8);
    expect(Number(paralelo)).toBe(1);
    expect(sal.length).toBeGreaterThan(10);
    expect(hash.length).toBeGreaterThan(40);
  });

  it('acento na senha não muda o resultado pela forma de escrever', async () => {
    // "á" pode vir como um caractere ou como "a" mais o acento; o teclado do
    // iPhone e o do Mac não combinam sempre, e a senha certa seria recusada.
    const composto = 'senha com ç e á';
    const decomposto = composto.normalize('NFD');
    expect(composto).not.toBe(decomposto);
    const guardado = await embaralhar(composto);
    expect(await conferir(decomposto, guardado)).toBe(true);
  });

  it('registro estragado recusa, em vez de estourar', async () => {
    for (const lixo of ['', 'qualquer coisa', 'scrypt$a$b$c$d$e', 'md5$1$2$3$4$5']) {
      expect(await conferir('senha', lixo), lixo).toBe(false);
    }
  });
});

describe('reforçar o hash antigo', () => {
  it('o que foi feito com o custo de hoje não precisa', async () => {
    expect(precisaReforcar(await embaralhar('x'))).toBe(false);
  });

  it('o que foi feito com custo menor precisa', () => {
    expect(precisaReforcar('scrypt$16384$8$1$c2Fs$aGFzaA')).toBe(true);
  });

  it('registro ilegível precisa, porque não dá para confiar nele', () => {
    expect(precisaReforcar('qualquer coisa')).toBe(true);
  });
});

describe('segredo', () => {
  it('nunca repete', () => {
    const muitos = new Set(Array.from({ length: 200 }, () => segredo()));
    expect(muitos.size).toBe(200);
  });

  it('cabe numa URL sem escapar nada', () => {
    expect(segredo()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('é longo o bastante para não ser adivinhado', () => {
    // 32 bytes em base64url dão 43 caracteres.
    expect(segredo().length).toBeGreaterThanOrEqual(43);
  });
});
