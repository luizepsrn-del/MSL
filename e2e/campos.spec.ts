import { test, expect } from '@playwright/test';

test('os campos de formulário renderizam e funcionam', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.goto('/design-system?section=forms');

  await expect(page.getByRole('heading', { name: 'Field + TextInput' })).toBeVisible();

  // rótulo ligado ao controle
  const titulo = page.getByLabel('Título');
  await expect(titulo).toBeVisible();
  await titulo.fill('Comprar café');
  await expect(titulo).toHaveValue('Comprar café');

  // erro é anunciado
  await expect(page.getByRole('alert')).toContainText('Informe um valor válido');

  // desabilitado é desabilitado
  await expect(page.getByLabel('Desabilitado')).toBeDisabled();

  // multi-linha cresce com o conteúdo
  const nota = page.getByLabel('Nota');
  const antes = (await nota.boundingBox())!.height;
  await nota.fill('uma\nduas\ntrês\nquatro\ncinco\nseis linhas');
  const depois = (await nota.boundingBox())!.height;
  expect(depois, 'a área de texto cresceu').toBeGreaterThan(antes);

  expect(erros).toEqual([]);
});
