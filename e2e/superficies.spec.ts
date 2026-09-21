import { test, expect, type Page } from '@playwright/test';

/**
 * As superfícies que não podem quebrar.
 *
 * Este arquivo existe desde antes do domínio de vida para que a rede já esteja
 * armada quando os pilares começarem a entrar. Por ora ele cobre o que existe:
 * as três superfícies do projeto, nos dois temas, no Mac e no iPhone.
 *
 * Toda asserção aqui é sobre comportamento observável, não sobre aparência.
 */

test('a rota /app renderiza a casca', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await page.goto('/app');

  // /app redireciona para o primeiro pilar, que tem URL própria.
  await expect(page).toHaveURL(/\/app\/inicio$/);
  await expect(page.getByRole('heading', { name: 'Início', level: 1 })).toBeVisible();
  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

/**
 * O menu está dentro da tela?
 *
 * Fechado, ele fica deslocado para fora pela esquerda (`translateX(-100%)`),
 * então a caixa dele termina antes do zero.
 *
 * Antes isto se media por `toBeHidden()` num localizador por papel, que
 * funcionava só porque o painel levava `aria-hidden` — o Playwright ignora
 * quem tem esse atributo. Quando o `aria-hidden` virou `inert`, por causa de
 * um defeito de foco de verdade, os dois testes quebraram sem que nada tivesse
 * piorado: eles mediam o atributo, e não a posição. Agora medem a posição.
 *
 * (O `inert` **é** removido da árvore de acessibilidade pelos navegadores de
 * verdade; o motor de papéis do Playwright é que ainda não modela isso.)
 */
async function menuNaTela(page: Page): Promise<boolean> {
  const caixa = await page.getByRole('navigation').boundingBox();
  return !!caixa && caixa.x + caixa.width > 1;
}

test('a casca serve o iPhone', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'só interessa no iPhone');

  // Era DEFEITO CONHECIDO até a casca existir: /app renderizava AdminShell sem
  // condição, o telefone recebia o rail de 224px, o h1 ficava com 0px de
  // largura e o documento vazava 302px de lado. A marca fixme saiu junto com
  // o defeito.
  await page.goto('/app');

  const vazamento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(vazamento, 'sem rolagem horizontal').toBeLessThanOrEqual(0);

  const titulo = page.getByRole('heading', { name: 'Início', level: 1 });
  await expect(titulo).toBeVisible();

  const caixa = (await titulo.boundingBox())!;
  expect(caixa.width, 'o título tem largura de verdade').toBeGreaterThan(40);

  // O rail de desktop não pode estar na tela do telefone.
  await expect.poll(() => menuNaTela(page), { message: 'o menu apareceu sozinho' }).toBe(false);
});

test('a gaveta do iPhone abre, navega e fecha', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'só interessa no iPhone');

  await page.goto('/app');
  await expect.poll(() => menuNaTela(page), { message: 'começou aberto' }).toBe(false);

  await page.getByRole('button', { name: 'Abrir menu' }).tap();
  await expect.poll(() => menuNaTela(page), { message: 'não abriu' }).toBe(true);

  await page.getByRole('button', { name: 'Financeiro' }).tap();
  await expect(page).toHaveURL(/\/app\/financeiro$/);
  await expect(page.getByRole('heading', { name: 'Financeiro', level: 1 })).toBeVisible();
  await expect.poll(() => menuNaTela(page), { message: 'não fechou ao navegar' }).toBe(false);
});

test('nenhuma rota do produto vaza inglês na interface', async ({ page }) => {
  // Varre TODAS as rotas, não só a primeira.
  //
  // A versão anterior olhava só /app e por isso não pegou o "You" embutido no
  // MessageBubble — que só aparece em /app/pedir, a última tela a usá-lo.
  // Cada string visível presa na biblioteca some assim até alguém abrir a
  // tela certa.
  const rotas = [
    'inicio',
    'rotina',
    'tarefas',
    'calendario',
    'projetos',
    'financeiro',
    'pedir',
    'ajustes',
  ];

  const proibidas = [
    'Search',
    'Overview',
    'Orders',
    'Carriers',
    'Go Premium',
    'Upgrade Now',
    'Nothing here yet',
    'Typing…',
    'Card menu',
  ];

  for (const rota of rotas) {
    await page.goto(`/app/${rota}`);
    const texto = await page.evaluate(() => document.body.innerText);
    for (const palavra of proibidas) {
      expect(texto, `"${palavra}" apareceu em /app/${rota}`).not.toContain(palavra);
    }
    // "You" precisa de fronteira de palavra para não casar com outras coisas.
    expect(texto, `"You" apareceu em /app/${rota}`).not.toMatch(/\bYou\b/);
  }

  await page.goto('/app/inicio');
  await expect(page.getByPlaceholder('Buscar')).toBeVisible();
  await expect(page.getByPlaceholder('Search')).toHaveCount(0);
});

test('os rótulos de acessibilidade estão em português', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac', 'o segmento de tema só existe no desktop');

  await page.goto('/app');
  await expect(page.getByRole('button', { name: 'Tema claro' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tema escuro' })).toBeVisible();
});

test('todo pilar tem URL própria e abre direto', async ({ page }) => {
  const pilares = [
    'inicio',
    'rotina',
    'tarefas',
    'calendario',
    'projetos',
    'financeiro',
    'pedir',
    'ajustes',
  ];

  for (const id of pilares) {
    await page.goto(`/app/${id}`);
    await expect(page.locator('h1'), `pilar "${id}"`).toBeVisible();
  }
});

test('alvos de toque respeitam o mínimo de 44px', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'só interessa no iPhone');

  await page.goto('/app');
  const menu = (await page.getByRole('button', { name: 'Abrir menu' }).boundingBox())!;
  expect(Math.round(menu.width)).toBeGreaterThanOrEqual(44);
  expect(Math.round(menu.height)).toBeGreaterThanOrEqual(44);
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


const ROTAS_DO_PRODUTO = [
  '',
  '/rotina',
  '/tarefas',
  '/calendario',
  '/projetos',
  '/financeiro',
  '/pedir',
  '/ajustes',
];

test('nenhuma tela estoura a largura do aparelho', async ({ page }) => {
  // O estouro não faz a página rolar de lado: um ancestral com overflow
  // escondido corta o botão e ninguém percebe. Já aconteceu duas vezes.
  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem('teste-ja-semeou-largura')) return;
      sessionStorage.setItem('teste-ja-semeou-largura', '1');
      const b = { criadoEm: new Date().toISOString(), alteradoEm: new Date().toISOString() };
      const hoje = new Date().toISOString().slice(0, 10);
      localStorage.setItem(
        'msl-banco',
        JSON.stringify({
          versao: 6,
          rotinas: [
            {
              ...b,
              id: 'r1',
              titulo: 'Ler 20 páginas',
              contexto: 'pessoal',
              icone: 'book-open',
              inicioEm: '2026-01-01',
              arquivada: false,
              recorrencia: { tipo: 'diaria' },
              hora: '07:00',
            },
          ],
          execucoes: [],
          tarefas: [
            {
              ...b,
              id: 't1',
              titulo: 'Entregar o relatório do trimestre',
              contexto: 'profissional',
              prazo: hoje,
              hora: '14:30',
              projetoId: 'p1',
            },
          ],
          projetos: [{ ...b, id: 'p1', titulo: 'Proposta comercial', contexto: 'profissional' }],
          lancamentos: [
            {
              ...b,
              id: 'l1',
              descricao: 'Aluguel',
              valor: 250000,
              tipo: 'saida',
              categoria: 'moradia',
              contexto: 'pessoal',
              data: hoje,
              recorrencia: { periodo: 'mensal' },
            },
          ],
        }),
      );
    } catch {
      /* janela privada */
    }
  });

  for (const rota of ROTAS_DO_PRODUTO) {
    await page.goto(`/app${rota}`);
    // Espera a decisão de largura assentar: `useLarguraDesktop` começa em
    // `null` e só sabe a resposta no quadro seguinte, porque em
    // desenvolvimento o Vite injeta o CSS por JavaScript.
    await page.waitForTimeout(400);

    // O trilho com encaixe transborda de propósito; o resto, não.
    const culpados = await page.evaluate(() => {
      const largura = window.innerWidth;
      const trilhos = [...document.querySelectorAll('div')].filter((e) =>
        getComputedStyle(e).scrollSnapType.startsWith('x'),
      );
      return [...document.querySelectorAll('section, div, p, span, button')]
        .filter((e) => !trilhos.some((t) => t.contains(e)))
        .filter((e) => e.getBoundingClientRect().right > largura + 1)
        .map((e) => `${e.tagName}: ${(e.textContent || '').slice(0, 30)}`)
        .slice(0, 4);
    });
    expect(culpados, `em /app${rota}`).toEqual([]);
  }
});
