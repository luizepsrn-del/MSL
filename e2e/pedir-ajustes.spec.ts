import { test, expect, type Page } from '@playwright/test';
import { VERSAO_ESQUEMA } from '../src/dados/esquema';

/** O agente e o backup — as duas últimas superfícies. */

const SEGREDO = 'ZZTOPSECRET-terapia';

async function semear(page: Page) {
  const banco = {
    versao: 4,
    rotinas: [
      {
        id: 'r1',
        criadoEm: 'x',
        alteradoEm: 'x',
        titulo: SEGREDO,
        contexto: 'pessoal',
        icone: 'heart-pulse',
        inicioEm: '2026-01-01',
        arquivada: false,
        recorrencia: { tipo: 'diaria' },
      },
    ],
    execucoes: [],
    tarefas: [],
    projetos: [],
    lancamentos: [],
  };
  await page.addInitScript((b) => {
    try {
      if (!sessionStorage.getItem('teste-ja-semeou')) {
        localStorage.setItem('msl-banco', JSON.stringify(b));
        sessionStorage.setItem('teste-ja-semeou', '1');
      }
    } catch {
      /* janela privada */
    }
  }, banco);
}

test('o que o agente não entende vira um pedido pronto', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await semear(page);
  await page.goto('/app/pedir');

  await page.getByPlaceholder('Pergunte, ou mande fazer').fill('Quero registrar leituras');
  await page.getByPlaceholder('Pergunte, ou mande fazer').press('Enter');

  // Ele não adivinha: diz que não resolve sozinho e monta o pedido.
  await expect(page.getByText('Isto eu não resolvo sozinho')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar o pedido' })).toBeVisible();

  await page.getByText('Ver o texto inteiro antes de colar').click();
  await expect(page.getByText('# Pedido para o My System Life')).toBeVisible();
  await expect(page.getByText('Quero registrar leituras').first()).toBeVisible();

  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('o nível padrão não vaza nada do meu dado', async ({ page }) => {
  await semear(page);
  await page.goto('/app/pedir');

  await page.getByPlaceholder('Pergunte, ou mande fazer').fill('um pedido qualquer');
  await page.getByPlaceholder('Pergunte, ou mande fazer').press('Enter');
  await page.getByText('Ver o texto inteiro antes de colar').click();

  // A garantia que justifica o controle existir, verificada no navegador e não
  // só na unidade: o título da minha rotina não pode estar no texto.
  const texto = await page.locator('pre').innerText();
  expect(texto).not.toContain(SEGREDO);
  expect(texto).toContain('Nenhum conteúdo meu foi incluído');
});

test('mudar o nível regenera o pedido na hora', async ({ page }) => {
  await semear(page);
  await page.goto('/app/pedir');

  await page.getByPlaceholder('Pergunte, ou mande fazer').fill('pedido');
  await page.getByPlaceholder('Pergunte, ou mande fazer').press('Enter');
  await page.getByText('Ver o texto inteiro antes de colar').click();
  expect(await page.locator('pre').innerText()).not.toContain(SEGREDO);

  // Escolher "meus dados reais" tem que refletir no texto sem gerar de novo.
  await page.getByLabel('Quanto do meu dado entra').click();
  await page.getByRole('button', { name: 'Meus dados reais' }).click();

  await expect(page.locator('pre')).toContainText(SEGREDO);
});

test('as regras do projeto vão junto no pedido', async ({ page }) => {
  await semear(page);
  await page.goto('/app/pedir');

  await page.getByPlaceholder('Pergunte, ou mande fazer').fill('x');
  await page.getByPlaceholder('Pergunte, ou mande fazer').press('Enter');
  await page.getByText('Ver o texto inteiro antes de colar').click();

  const texto = await page.locator('pre').innerText();
  expect(texto).toContain('DESIGN.md');
  expect(texto).toContain('centavos');
  expect(texto).toContain('migração aditiva');
  expect(texto).toContain('esquema.ts');
});

test('Ajustes mostra o que está guardado e oferece exportar', async ({ page }) => {
  await semear(page);
  await page.goto('/app/ajustes');

  await expect(page.getByText('1 rotinas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exportar tudo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Importar de um arquivo' })).toBeVisible();
});

test('Ajustes avisa sobre o navegador apagar os dados', async ({ page }) => {
  await semear(page);
  await page.goto('/app/ajustes');

  // O aviso existe porque o Safari apaga armazenamento local após sete dias
  // sem uso, e isso decide se o backup é hábito ou não.
  await expect(page.getByText('O navegador pode apagar estes dados')).toBeVisible();
  await expect(page.getByText(/Adicionar à Tela de Início/)).toBeVisible();
});

test('exportar baixa um arquivo JSON legível com os meus dados', async ({ page }) => {
  await semear(page);
  await page.goto('/app/ajustes');

  const baixando = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar tudo' }).click();
  const download = await baixando;

  expect(download.suggestedFilename()).toMatch(/^my-system-life-.*\.json$/);

  const caminho = await download.path();
  const { readFileSync } = await import('node:fs');
  const conteudo = readFileSync(caminho, 'utf8');

  expect(() => JSON.parse(conteudo)).not.toThrow();
  // A versão vem do esquema, e não de um número escrito aqui: com o 4 fixo o
  // teste quebrava a cada migração, e a quebra não dizia nada sobre o backup.
  expect(JSON.parse(conteudo).versao).toBe(VERSAO_ESQUEMA);
  expect(conteudo).toContain(SEGREDO);
  // Legível: indentado, não minificado numa linha só.
  expect(conteudo.split('\n').length).toBeGreaterThan(10);
});

test('as duas telas funcionam no iPhone', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'só interessa no iPhone');

  await semear(page);
  await page.goto('/app/pedir');
  await page.getByPlaceholder('Pergunte, ou mande fazer').fill('no telefone');
  await page.getByPlaceholder('Pergunte, ou mande fazer').press('Enter');
  await expect(page.getByText('pedido.md')).toBeVisible();

  let vazamento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(vazamento, 'pedir sem rolagem horizontal').toBeLessThanOrEqual(0);

  await page.goto('/app/ajustes');
  await expect(page.getByRole('button', { name: 'Exportar tudo' })).toBeVisible();
  vazamento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(vazamento, 'ajustes sem rolagem horizontal').toBeLessThanOrEqual(0);
});
