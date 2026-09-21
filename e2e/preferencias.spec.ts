import { test, expect, type Page } from '@playwright/test';

/**
 * As preferências sobrevivendo à sincronização.
 *
 * Nasceu de um defeito de verdade: digitar o nome em Ajustes, vê-lo aparecer,
 * e três segundos depois a sincronização o apagava. A decisão de qual lado das
 * preferências ganha olhava `ultimoBackupEm`, que não muda quando alguém edita
 * uma preferência — então o servidor sempre vencia o empate e descartava a
 * edição em silêncio.
 */

async function comecarLimpo(page: Page) {
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('teste-ja-limpou')) {
        localStorage.removeItem('msl-banco');
        // Com sessão, o sistema sincroniza sozinho três segundos depois de
        // cada mudança. É exatamente o momento em que o nome sumia.
        localStorage.setItem('msl-sessao', 'token-de-teste');
        sessionStorage.setItem('teste-ja-limpou', '1');
      }
    } catch {
      /* janela privada */
    }
  });
}

/** O servidor devolve o que recebeu, já junto — como o de verdade faz. */
async function servidorQueJunta(page: Page) {
  await page.route('**/api/sincronizar', async (rota) => {
    const corpo = JSON.parse(rota.request().postData() ?? '{}');
    await rota.fulfill({
      json: { banco: corpo.banco, sincronizadoEm: new Date().toISOString() },
    });
  });
  await page.route('**/api/google-estado', (r) => r.fulfill({ json: { conectado: false } }));
}

/** Guarda o que o aparelho mandou na sincronização. */
async function espiarEnvio(page: Page): Promise<{ ultimo: Record<string, unknown> | null }> {
  const visto: { ultimo: Record<string, unknown> | null } = { ultimo: null };

  await page.route('**/api/sincronizar', async (rota) => {
    const corpo = JSON.parse(rota.request().postData() ?? '{}');
    visto.ultimo = corpo.banco?.preferencias ?? null;
    await rota.fulfill({
      json: { banco: corpo.banco, sincronizadoEm: new Date().toISOString() },
    });
  });
  await page.route('**/api/google-estado', (r) => r.fulfill({ json: { conectado: false } }));

  return visto;
}

async function salvarNome(page: Page, nome: string) {
  await page.goto('/app/ajustes');
  await page.locator('#ajustes-nome').fill(nome);
  await page.getByRole('button', { name: 'Salvar' }).first().click();
}

test('o nome sobrevive à sincronização', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await comecarLimpo(page);
  await servidorQueJunta(page);
  await salvarNome(page, 'Luiz Eduardo');

  // A sincronização automática dispara três segundos depois da mudança.
  await page.waitForTimeout(4000);

  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('msl-banco') ?? '{}').preferencias?.nome,
      ),
    )
    .toBe('Luiz Eduardo');

  await page.reload();
  await expect(page.locator('#ajustes-nome')).toHaveValue('Luiz Eduardo');
  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('o aparelho manda o carimbo que deixa o servidor decidir', async ({ page }) => {
  /*
   * É a metade do contrato que cabe ao cliente.
   *
   * Quem junta é o servidor, e ele não tem como saber que este lado é o mais
   * novo se o carimbo não for junto. Era exatamente o que faltava: sem
   * `alteradoEm`, a junção caía no `ultimoBackupEm` e o servidor vencia todo
   * empate. A outra metade — a regra da junção — tem os testes dela em
   * `src/dominio/sincronizacao.test.ts`.
   */
  await comecarLimpo(page);
  const enviado = await espiarEnvio(page);
  const antes = new Date().toISOString();

  await salvarNome(page, 'Luiz Eduardo');
  await page.waitForTimeout(4000);

  await expect.poll(() => enviado.ultimo?.nome).toBe('Luiz Eduardo');
  const carimbo = String(enviado.ultimo?.alteradoEm ?? '');
  expect(carimbo, 'o carimbo foi junto').not.toBe('');
  expect(carimbo >= antes, 'o carimbo é desta edição, e não de uma antiga').toBe(true);
});

test('o nome aparece na saudação do Início, mesmo sem nada cadastrado', async ({ page }) => {
  // Quem acabou de escrever o nome vem aqui conferir. Se a tela do primeiro
  // uso engolisse a saudação, pareceria que não salvou — que é a confusão que
  // este arquivo inteiro existe para não deixar acontecer de novo.
  await comecarLimpo(page);
  await servidorQueJunta(page);
  await salvarNome(page, 'Luiz Eduardo');

  // Espera a gravação terminar antes de navegar.
  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('msl-banco') ?? '{}').preferencias?.nome,
      ),
    )
    .toBe('Luiz Eduardo');

  await page.goto('/app/inicio');
  await expect(page.getByRole('heading', { name: /Luiz Eduardo\.$/ })).toBeVisible();
  await expect(page.getByText('Nada cadastrado ainda')).toBeVisible();
});
