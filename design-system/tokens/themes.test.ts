import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * O contrato dos temas, como teste.
 *
 * Existe por causa de um defeito real: `--surface-app: var(--ink-1000)` está
 * declarado em `:root` (colors.css), então resolve contra a rampa de `:root` e
 * ignora um override com escopo `[data-theme="light"]`. O tema claro aplicava
 * pela metade — fundo escuro com texto escuro — e nada falhava: nem o lint, nem
 * o typecheck, nem o build. Só olhando o valor computado no navegador aparecia.
 *
 * O AGENTS.md registra a armadilha em prosa. Aqui ela vira regressão: todo
 * alias que resolve na rampa de tinta precisa estar declarado nos DOIS blocos
 * de themes.css.
 */

const AQUI = join(import.meta.dirname, '.');
const ler = (arquivo: string) => readFileSync(join(AQUI, arquivo), 'utf8');

/** Extrai o corpo de um bloco CSS pelo seletor. */
function bloco(css: string, seletor: string): string {
  const inicio = css.indexOf(seletor);
  if (inicio === -1) throw new Error(`bloco "${seletor}" não encontrado`);
  const abre = css.indexOf('{', inicio);
  const fecha = css.indexOf('}', abre);
  return css.slice(abre + 1, fecha);
}

/** Nomes das custom properties declaradas num corpo de bloco. */
function declaradas(corpo: string): Set<string> {
  return new Set([...corpo.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
}

/** Custom properties cujo valor é `var(--ink-*)` — as que dependem da rampa. */
function dependentesDaRampa(corpo: string): Set<string> {
  return new Set(
    [...corpo.matchAll(/(--[\w-]+)\s*:\s*var\((--ink-[\w-]+)\)/g)].map((m) => m[1]),
  );
}

const colors = ler('colors.css');
const themes = ler('themes.css');
const raiz = bloco(colors, ':root');
const escuro = bloco(themes, '[data-theme="dark"]');
const claro = bloco(themes, '[data-theme="light"]');

describe('themes.css', () => {
  it('declara os dois temas com escopo em [data-theme]', () => {
    expect(themes).toContain('[data-theme="dark"]');
    expect(themes).toContain('[data-theme="light"]');
  });

  it('todo alias que resolve na rampa está declarado nos dois blocos', () => {
    const naRaiz = dependentesDaRampa(raiz);
    expect(naRaiz.size, 'colors.css tem aliases apontando para a rampa').toBeGreaterThan(0);

    const noEscuro = declaradas(escuro);
    const noClaro = declaradas(claro);

    const faltandoEscuro = [...naRaiz].filter((t) => !noEscuro.has(t));
    const faltandoClaro = [...naRaiz].filter((t) => !noClaro.has(t));

    expect(faltandoEscuro, 'aliases ausentes do bloco escuro').toEqual([]);
    expect(faltandoClaro, 'aliases ausentes do bloco claro').toEqual([]);
  });

  it('os dois blocos declaram exatamente o mesmo conjunto de tokens', () => {
    const soNoEscuro = [...declaradas(escuro)].filter((t) => !declaradas(claro).has(t));
    const soNoClaro = [...declaradas(claro)].filter((t) => !declaradas(escuro).has(t));

    // Um token declarado num tema só é como o tema esquecer de se definir:
    // ele herda silenciosamente o valor do outro.
    expect(soNoEscuro, 'declarado só no escuro').toEqual([]);
    expect(soNoClaro, 'declarado só no claro').toEqual([]);
  });

  it('a rampa de tinta é redeclarada inteira nos dois temas', () => {
    const rampa = [...declaradas(raiz)].filter((t) => /^--ink-\d+$/.test(t));
    expect(rampa.length).toBe(11);

    for (const token of rampa) {
      expect(declaradas(escuro).has(token), `${token} no tema escuro`).toBe(true);
      expect(declaradas(claro).has(token), `${token} no tema claro`).toBe(true);
    }
  });

  it('a marca não muda entre os temas', () => {
    // Roxo, verde, laranja e vermelho são valores da folha de origem e valem
    // nos dois temas. Se um deles aparecer redeclarado num bloco de tema, é
    // porque alguém decidiu uma cor de marca nova sem passar pelo DESIGN.md.
    for (const corpo of [escuro, claro]) {
      const marca = [...declaradas(corpo)].filter((t) =>
        /^--(purple|green|orange|red|blue)-\d+$/.test(t),
      );
      expect(marca, 'nenhuma cor de marca redeclarada por tema').toEqual([]);
    }
  });

  it('o tema escuro continua sendo o padrão em :root', () => {
    // colors.css define o tema canônico sem precisar de data-theme nenhum.
    expect(declaradas(raiz).has('--ink-1000')).toBe(true);
    expect(raiz).toContain('#06071A');
  });
});
