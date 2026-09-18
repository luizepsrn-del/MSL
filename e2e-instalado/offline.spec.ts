import { test, expect } from '@playwright/test';

/**
 * O sistema instalado, sem rede.
 *
 * Roda sobre o que foi construído, e não sobre o servidor de desenvolvimento:
 * o operário de serviço só é registrado no que foi construído, e é ele que faz
 * a tela existir sem sinal.
 */

/** Espera o operário assumir o controle da página. */
async function esperarOOperario(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, {
    timeout: 20_000,
  });
}

/**
 * O WebKit do harness cai com "internal error" em qualquer navegação sem rede
 * quando há operário de serviço — é limitação da build do Playwright, não do
 * Safari. No iPhone, portanto, aqui se prova que o operário assume e guarda o
 * que precisa; abrir de fato sem sinal fica provado no Chromium.
 */
const semRedeSoNoChromium = (nome: string) =>
  test.skip(
    nome !== 'chromium',
    'a build WebKit do Playwright cai ao navegar sem rede com operário de serviço',
  );

test('o operário assume e guarda a casca', async ({ page, browserName }) => {
  await page.goto('/app');
  await esperarOOperario(page);

  const guardado = await page.evaluate(async () => {
    const nomes = await caches.keys();
    const caixa = await caches.open(nomes[0]);
    const chaves = await caixa.keys();
    return {
      caixas: nomes,
      urls: chaves.map((p) => new URL(p.url).pathname),
    };
  });

  expect(guardado.caixas.length, `no ${browserName}`).toBeGreaterThan(0);
  expect(guardado.urls).toContain('/index.html');
  expect(guardado.urls).toContain('/manifest.webmanifest');
  // O pacote com hash no nome entra ao ser pedido, não na instalação.
  expect(guardado.urls.some((u) => u.startsWith('/assets/'))).toBe(true);
});

test('o sistema abre sem rede, e os meus dados continuam lá', async ({
  page,
  context,
  browserName,
}) => {
  semRedeSoNoChromium(browserName);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();

  // Cria alguma coisa com rede, para provar depois que o dado sobreviveu.
  await page.goto('/app/tarefas');
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByLabel('O que precisa ser feito').fill('Sobreviver ao modo avião');
  await page.getByRole('button', { name: 'Criar tarefa' }).click();
  await expect(page.getByText('Sobreviver ao modo avião')).toBeVisible();

  await esperarOOperario(page);
  // Uma volta com rede para o operário guardar os pedaços com hash no nome.
  await page.reload();
  await expect(page.getByText('Sobreviver ao modo avião')).toBeVisible();

  await context.setOffline(true);
  await page.goto('/app/tarefas');

  // A tela existe…
  await expect(page.getByText('Sobreviver ao modo avião')).toBeVisible();
  // …e o roteador também: `/app/calendario` não é um arquivo no servidor.
  await page.goto('/app/calendario');
  await expect(page.getByRole('heading', { name: 'Calendário' })).toBeVisible();

  expect(erros, 'nenhum erro de JavaScript sem rede').toEqual([]);
  await context.setOffline(false);
});

test('os ícones aparecem sem rede', async ({ page, context, browserName }) => {
  semRedeSoNoChromium(browserName);

  // O motivo de os ícones terem saído do CDN. Sem isto a tela abre, mas
  // careca: nenhum glifo, e a navegação inteira vira texto solto.
  await page.goto('/app');
  await esperarOOperario(page);
  await page.reload();

  await context.setOffline(true);
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();

  const desenhados = await page
    .locator('svg.lucide, svg[class*="lucide"]')
    .count()
    .catch(() => 0);
  const svgs = desenhados > 0 ? desenhados : await page.locator('nav svg, aside svg').count();
  expect(svgs, 'algum ícone desenhado').toBeGreaterThan(3);

  await context.setOffline(false);
});

test('o manifesto e os ícones do aplicativo são servidos', async ({ page, request }) => {
  await page.goto('/app');

  const manifesto = await request.get('/manifest.webmanifest');
  expect(manifesto.ok()).toBe(true);
  const conteudo = await manifesto.json();

  // O que decide se a instalação acontece de verdade.
  expect(conteudo.display).toBe('standalone');
  expect(conteudo.start_url).toBe('/app');
  expect(conteudo.name).toBe('My System Life');

  // Android pede um mascarável; sem ele o ícone vira um selo branco recortado.
  const proposito = conteudo.icons.map((i: { purpose: string }) => i.purpose);
  expect(proposito).toContain('maskable');
  expect(conteudo.icons.map((i: { sizes: string }) => i.sizes)).toContain('512x512');

  for (const icone of conteudo.icons) {
    const resposta = await request.get(icone.src);
    expect(resposta.ok(), icone.src).toBe(true);
    expect(resposta.headers()['content-type'], icone.src).toContain('image/png');
  }

  // O iOS não lê o manifesto para o ícone: ele quer o apple-touch-icon.
  const apple = await request.get('/icones/apple-touch-icon.png');
  expect(apple.ok()).toBe(true);
});

test('a página declara o que o iPhone precisa para instalar', async ({ page }) => {
  await page.goto('/app');

  const cabeca = await page.evaluate(() => ({
    manifesto: document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
    apple: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
    titulo: document
      .querySelector('meta[name="apple-mobile-web-app-title"]')
      ?.getAttribute('content'),
    capaz: document
      .querySelector('meta[name="apple-mobile-web-app-capable"]')
      ?.getAttribute('content'),
    cor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
  }));

  expect(cabeca.manifesto).toBe('/manifest.webmanifest');
  expect(cabeca.apple).toBe('/icones/apple-touch-icon.png');
  expect(cabeca.titulo).toBe('My System Life');
  expect(cabeca.capaz).toBe('yes');
  // A cor da tela do sistema, a mesma do `--ink-1000`.
  expect(cabeca.cor).toBe('#06071A');
});
