import { test, expect, type Page } from '@playwright/test';

/**
 * As automações — e a regra que vale para todas elas: nenhuma escreve sozinha.
 */

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

/** Um projeto parado há muito, com uma tarefa antiga pendente. */
async function semear(page: Page) {
  const velho = `${diaLocal(-60)}T12:00:00.000Z`;
  await page.addInitScript(
    (t) => {
      try {
        if (sessionStorage.getItem('teste-ja-semeou')) return;
        sessionStorage.setItem('teste-ja-semeou', '1');
        const b = { criadoEm: t.velho, alteradoEm: t.velho };
        localStorage.setItem(
          'msl-banco',
          JSON.stringify({
            versao: 15,
            rotinas: [],
            execucoes: [],
            tarefas: [
              { ...b, id: 't1', titulo: 'Fazer a proposta', contexto: 'profissional', projetoId: 'p1', prazo: t.antes },
            ],
            projetos: [{ ...b, id: 'p1', titulo: 'Campanha', contexto: 'profissional' }],
            lancamentos: [],
            metas: [],
            marcos: [],
            modelos: [],
            regras: [],
            removidos: [],
          }),
        );
      } catch {
        /* janela privada */
      }
    },
    { velho, antes: diaLocal(-40) },
  );
}

test('a regra mostra o que faria, e só escreve quando eu aplico', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await semear(page);
  await page.goto('/app/regras');

  // Nada proposto antes de existir regra.
  await expect(page.getByText('As regras querem fazer isto')).toHaveCount(0);

  await page.getByRole('button', { name: 'Nova regra' }).click();
  await page.getByLabel('Nome da regra').fill('Retomar parado');
  await page.locator('#reg-dias').fill('7');
  // A frase inteira aparece antes de salvar.
  await expect(page.getByText(/Quando um projeto ficar 7 dias parado/)).toBeVisible();
  await page.getByRole('button', { name: 'Criar regra' }).click();

  // Agora ela propõe — e ainda não escreveu nada.
  await expect(page.getByText('As regras querem fazer isto')).toBeVisible();
  await expect(page.getByText(/Criar "Retomar Campanha"/)).toBeVisible();

  const quantasTarefas = () =>
    page.evaluate(
      () => (JSON.parse(localStorage.getItem('msl-banco') ?? '{}').tarefas as unknown[]).length,
    );
  expect(await quantasTarefas(), 'olhar não escreve').toBe(1);

  await page.getByRole('button', { name: /Aplicar 1/ }).click();
  await expect.poll(quantasTarefas).toBe(2);

  // E a proposta some: a mesma situação não é proposta duas vezes.
  await expect(page.getByText('As regras querem fazer isto')).toHaveCount(0);

  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('dá para recusar uma proposta sem desligar a regra', async ({ page }) => {
  await semear(page);
  await page.goto('/app/regras');

  await page.getByRole('button', { name: 'Nova regra' }).click();
  await page.getByLabel('Nome da regra').fill('Retomar parado');
  await page.getByRole('button', { name: 'Criar regra' }).click();

  // Desmarcar a proposta desabilita o botão de aplicar.
  await page.getByText(/Criar "Retomar Campanha"/).click();
  await expect(page.getByRole('button', { name: 'Nada marcado' })).toBeDisabled();

  const tarefas = await page.evaluate(
    () => (JSON.parse(localStorage.getItem('msl-banco') ?? '{}').tarefas as unknown[]).length,
  );
  expect(tarefas).toBe(1);
});

test('a regra desligada para de propor, sem ser apagada', async ({ page }) => {
  await semear(page);
  await page.goto('/app/regras');

  await page.getByRole('button', { name: 'Nova regra' }).click();
  await page.getByLabel('Nome da regra').fill('Retomar parado');
  await page.getByRole('button', { name: 'Criar regra' }).click();
  await expect(page.getByText('As regras querem fazer isto')).toBeVisible();

  await page.getByText('Retomar parado').click();
  await expect(page.getByText('As regras querem fazer isto')).toHaveCount(0);
  // Continua na lista: desligar não é apagar.
  await expect(page.getByText('Retomar parado')).toBeVisible();
});
