import { test, expect } from '@playwright/test';

/**
 * Varredura de largura: nenhuma tela vaza de lado no telefone.
 *
 * Existe porque este projeto já teve três defeitos assim, e nenhum deles
 * apareceu num teste verde — apareceram numa foto. O cartão "Hoje" medindo
 * 419px numa tela de 393px, o primeiro tile do trilho colado na borda, e o
 * título de uma tarefa descendo uma letra por linha.
 *
 * **O trilho é exceção, e precisa ser.** Ele rola de lado de propósito, então
 * os tiles além da dobra de fato passam da borda da tela. O que não pode
 * passar é o que está fora de um rolador horizontal — e a página inteira nunca
 * pode rolar de lado.
 */

const TELAS = [
  'inicio',
  'rotina',
  'tarefas',
  'calendario',
  'projetos',
  'financeiro',
  'criacao',
  'metas',
  'pedir',
  'regras',
  'ajustes',
];

for (const tela of TELAS) {
  test(`${tela} cabe no iPhone`, async ({ page }, info) => {
    test.skip(info.project.name !== 'iphone', 'é uma armadilha de telefone');

    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));

    await page.goto(`/app/${tela}`);
    await page.waitForTimeout(500);

    const vazamento = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(vazamento, 'a página não rola de lado').toBeLessThanOrEqual(0);

    const estouro = await page.evaluate(() => {
      const largura = window.innerWidth;

      /** Está dentro de algo que rola de lado de propósito? */
      const noTrilho = (el: Element): boolean => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const overflow = getComputedStyle(p).overflowX;
          if (overflow === 'auto' || overflow === 'scroll') return true;
        }
        return false;
      };

      return [...document.querySelectorAll('span, p, h1, h2, h3, button')]
        .filter((el) => el.getBoundingClientRect().right > largura + 1)
        .filter((el) => !noTrilho(el))
        .map((el) => (el.textContent || '').slice(0, 40));
    });

    expect(estouro, 'nada fora do trilho passa da borda').toEqual([]);
    expect(erros, 'nenhum erro de JavaScript').toEqual([]);
  });
}
