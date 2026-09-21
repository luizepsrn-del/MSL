import { test, expect, type Page } from '@playwright/test';

/** Criação — e o que a liga ao resto do sistema. */

function diaLocal(deslocamento = 0) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
  const [ano, mes, dia] = fmt.format(new Date()).split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + deslocamento)).toISOString().slice(0, 10);
}

/**
 * Limpa UMA vez por teste.
 *
 * `addInitScript` roda em todo carregamento: sem a trava, navegar do editor
 * para o calendário apagaria a peça que o teste acabou de criar — e o teste
 * acusaria o código de um defeito que era dele.
 */
async function comecarLimpo(page: Page) {
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('teste-ja-limpou')) {
        localStorage.removeItem('msl-banco');
        sessionStorage.setItem('teste-ja-limpou', '1');
      }
    } catch {
      /* janela privada */
    }
  });
}

async function criar(
  page: Page,
  titulo: string,
  tipo: string,
  corpo: string,
  data?: string,
  estado = 'Rascunho',
) {
  await page.getByRole('button', { name: 'Criar', exact: false }).first().click();
  await page.locator('#cri-titulo').fill(titulo);
  await page.locator('#cri-tipo-form').click();
  await page.getByRole('option', { name: tipo, exact: true }).click();
  // Sai de "semente": ela é matéria-prima e de propósito não entra na fila do
  // dia, por mais data que tenha.
  await page.locator('#cri-estado-form').click();
  await page.getByRole('option', { name: estado, exact: true }).click();
  await page.locator('#cri-corpo').fill(corpo);
  if (data) await page.locator('#cri-data').fill(data);
  await page.getByRole('button', { name: 'Salvar' }).click();
}

test('o carrossel mostra os slides antes de existir arquivo nenhum', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await comecarLimpo(page);
  await page.goto('/app/criacao');

  await page.getByRole('button', { name: 'Criar', exact: false }).first().click();
  await page.locator('#cri-titulo').fill('Carrossel de teste');
  await page.locator('#cri-tipo-form').click();
  await page.getByRole('option', { name: 'Carrossel', exact: true }).click();
  await page.locator('#cri-corpo').fill('Slide um\n---\nSlide dois\n---\nSlide três');

  await expect(page.getByText('Como vai ficar')).toBeVisible();
  await expect(page.getByText('1/3')).toBeVisible();
  await expect(page.getByText('3/3')).toBeVisible();
  // A contagem de slides aparece no cabeçalho do editor.
  await expect(page.getByText(/3 slides/)).toBeVisible();

  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Carrossel de teste')).toBeVisible();
  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('o limite só aparece quando o texto estoura', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/criacao');

  await page.getByRole('button', { name: 'Criar', exact: false }).first().click();
  await page.locator('#cri-titulo').fill('Post comprido');
  await page.locator('#cri-corpo').fill('curto');
  await expect(page.getByText(/\d+ a mais/)).toHaveCount(0);

  await page.locator('#cri-corpo').fill('a'.repeat(300));
  await expect(page.getByText('X: 20 a mais')).toBeVisible();
  // Só o que estourou: Instagram e LinkedIn cabem 300 caracteres.
  await expect(page.getByText(/Instagram/)).toHaveCount(0);
});

test('uma peça com data aparece no calendário e na fila do dia', async ({ page }) => {
  // É o que separa isto de mais um caderno de anotações.
  await comecarLimpo(page);
  await page.goto('/app/criacao');

  await criar(page, 'Post de hoje', 'Post', 'O texto do post.', diaLocal(0));
  await expect(page.getByText('Post de hoje')).toBeVisible();

  await page.goto('/app/calendario');
  await expect(page.getByText('Para publicar')).toBeVisible();
  await expect(page.getByText('Post de hoje')).toBeVisible();

  await page.goto('/app/inicio');
  await expect(page.getByRole('heading', { name: 'Precisa de você hoje' })).toBeVisible();
  await expect(page.getByText('Post de hoje')).toBeVisible();
  await expect(page.getByText('Sai hoje').first()).toBeVisible();
});

test('a semente não entra na fila do dia, mesmo com data', async ({ page }) => {
  // Ela é matéria-prima, não compromisso. Uma ideia com data virando cobrança
  // seria o caminho mais curto para parar de anotar ideias.
  await comecarLimpo(page);
  await page.goto('/app/criacao');

  await criar(page, 'Ideia com data', 'Ideia', 'só uma ideia', diaLocal(0), 'Semente');

  await page.goto('/app/calendario');
  await expect(page.getByText('Ideia com data')).toBeVisible();

  await page.goto('/app/inicio');
  await expect(page.getByText('Ideia com data')).toHaveCount(0);
});

test('a busca alcança o texto, e não só o título', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/criacao');

  await criar(page, 'Algum título', 'Post', 'uma palavra bem específica aqui');
  await criar(page, 'Outro título', 'Post', 'nada a ver');

  await page.getByPlaceholder('Procurar no título, no texto e nas etiquetas').fill('específica');
  await expect(page.getByText('Algum título')).toBeVisible();
  await expect(page.getByText('Outro título')).toHaveCount(0);
});
