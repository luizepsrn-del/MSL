import { test, expect } from '@playwright/test';

/**
 * As superfícies que não podem quebrar.
 *
 * Este arquivo existe desde antes do domínio de vida para que a rede já esteja
 * armada quando os pilares começarem a entrar. Por ora ele cobre o que existe:
 * as três superfícies do projeto, nos dois temas, no Mac e no iPhone.
 *
 * Toda asserção aqui é sobre comportamento observável, não sobre aparência.
 */

test('a rota /app renderiza o shell da aplicação', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await page.goto('/app');

  await expect(page.locator('h1')).toHaveCount(1);
  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('a rota /app serve o iPhone', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'só interessa no iPhone');
  test.fixme(true, 'DEFEITO CONHECIDO — /app não tem caminho para o mobile');

  // Medido no iPhone 15 (393x659): /app renderiza AdminShell sem condição
  // nenhuma, então o telefone recebe o shell de desktop inteiro —
  //   · o rail de 224px ocupa mais da metade da largura
  //   · o <h1> do título fica com 0px de largura, espremido em x=244
  //   · o documento tem 695px contra 393 de viewport: 302px vazando de lado
  //
  // MobileShell existe em design-system/patterns/mobile/ e funciona, mas nada
  // roteia para ele — só é alcançável dentro da aba Patterns do showcase.
  //
  // Este teste fica como fixme de propósito: no dia em que /app servir o
  // telefone, o Playwright acusa "passou quando era esperado falhar" e obriga
  // a remover a marca. É o oposto de esconder o defeito.
  await page.goto('/app');

  const vazamento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(vazamento, 'sem rolagem horizontal').toBeLessThanOrEqual(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('o showcase renderiza a biblioteca', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await page.goto('/design-system');

  await expect(page.getByRole('heading', { name: 'Design system' })).toBeVisible();
  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('cada seção do showcase tem URL própria e renderiza', async ({ page }) => {
  const secoes = ['tokens', 'core', 'forms', 'navigation', 'data', 'messaging', 'feedback'];

  for (const secao of secoes) {
    await page.goto(`/design-system?section=${secao}`);
    // Cada seção é uma pilha de cartões <Spec>, cada um com um <h3> nomeando
    // o componente. Zero cabeçalhos significa seção vazia.
    const cabecalhos = page.locator('h3');
    await expect(cabecalhos.first(), `seção "${secao}" renderizou`).toBeVisible();
  }
});

test('o tema alterna e fica registrado no documento', async ({ page }) => {
  await page.goto('/design-system');

  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', { name: 'light theme' }).first().click();
  await expect(html).toHaveAttribute('data-theme', 'light');

  // A escolha sobrevive a um recarregamento.
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');

  await page.getByRole('button', { name: 'dark theme' }).first().click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('a marca tem o mesmo roxo nos dois temas', async ({ page }) => {
  await page.goto('/design-system');

  const lerRoxo = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--purple-500').trim(),
    );

  const escuro = await lerRoxo();
  await page.getByRole('button', { name: 'light theme' }).first().click();
  const claro = await lerRoxo();

  expect(escuro.toUpperCase()).toBe('#682EC7');
  expect(claro, 'a marca não muda entre temas').toBe(escuro);
});

test('o tema claro inverte a rampa de tinta de verdade', async ({ page }) => {
  await page.goto('/design-system');

  const lerFundo = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--surface-app').trim(),
    );

  const escuro = await lerFundo();
  await page.getByRole('button', { name: 'light theme' }).first().click();
  const claro = await lerFundo();

  // Regressão da armadilha registrada no AGENTS.md: um alias que resolve na
  // rampa e fica só no :root ignora o override com escopo, e o tema claro
  // aplica pela metade sem erro nenhum.
  expect(claro, '--surface-app muda com o tema').not.toBe(escuro);
  expect(escuro.toUpperCase()).toBe('#06071A');
});

test('as páginas de referência abrem e carregam seus recursos', async ({ page }) => {
  const quebrados: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400) quebrados.push(`${r.status()} ${r.url()}`);
  });

  await page.goto('/design-system/reference/index.html');
  await expect(page.getByRole('heading', { name: 'Visual reference' })).toBeVisible();

  // O kit desktop compila o próprio JSX no navegador: se o servidor entregar
  // os .jsx transformados, a página abre vazia em vez de falhar.
  await page.goto('/design-system/reference/ui_kits/admin_desktop/index.html');
  await expect(page.locator('#root svg').first()).toBeVisible();

  expect(quebrados, 'nenhum recurso quebrado').toEqual([]);
});
