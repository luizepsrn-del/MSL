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

test('a lista do seletor não é comida pelo cartão', async ({ page }) => {
  // O `Card` corta com `overflow: hidden` por causa do canto arredondado e do
  // brilho. A lista era filha dele e sobrava uma fatia de 20px: um seletor que
  // o próprio contêiner da biblioteca engole é um seletor que não dá para usar.
  await page.goto('/app/calendario');
  await page.locator('#cal-contexto').click();

  const lista = page.getByRole('listbox');
  await expect(lista).toBeVisible();

  const inteira = await lista.evaluate((el) => {
    const r = el.getBoundingClientRect();
    if (r.height < 60) return { erro: `lista com ${Math.round(r.height)}px de altura` };
    // o ponto do meio da lista tem de pertencer a ela, e não a quem a cobre
    const noMeio = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      erro: el.contains(noMeio) ? null : `coberta por ${noMeio?.tagName}`,
      dentroDaJanela: r.bottom <= window.innerHeight && r.top >= 0,
    };
  });

  expect(inteira.erro).toBeNull();
  expect(inteira.dentroDaJanela).toBe(true);

  // E escolher continua funcionando de dentro do portal.
  // "Pessoal e profissional" também casa com /Profissional/.
  await page.getByRole('option', { name: 'Profissional', exact: true }).click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(page.locator('#cal-contexto')).toContainText('Profissional');
});

test('o seletor dentro de um diálogo desenha por cima dele', async ({ page }) => {
  await page.goto('/app/tarefas');
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.locator('#tar-contexto').click();

  const visivel = await page.getByRole('listbox').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
  });
  expect(visivel).toBe(true);
});
