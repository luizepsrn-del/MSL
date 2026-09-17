import { test, expect, type Page } from '@playwright/test';

/** O ciclo do pilar Tarefas, no navegador. */

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

async function criarTarefa(page: Page, titulo: string, prazo?: string) {
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByLabel('O que precisa ser feito').fill(titulo);
  if (prazo) await page.getByLabel('Prazo').fill(prazo);
  await page.getByRole('button', { name: 'Criar tarefa' }).click();
  await expect(page.getByRole('button', { name: 'Criar tarefa' })).toHaveCount(0);
}

/**
 * Datas relativas ao dia LOCAL, não ao dia UTC.
 *
 * `toISOString()` devolve UTC: às 21h em São Paulo já é o dia seguinte lá, e
 * "ontem" calculado assim vira "hoje" para o aplicativo. É exatamente o erro
 * de fuso que a camada de domínio foi escrita para evitar, e o teste não pode
 * reintroduzi-lo — senão ele passa ou falha conforme a hora do dia.
 */
function datas() {
  const emSaoPaulo = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
  const d = (n: number) => {
    const hoje = emSaoPaulo.format(new Date());
    const [ano, mes, dia] = hoje.split('-').map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia + n)).toISOString().slice(0, 10);
  };
  return { ontem: d(-1), hoje: d(0), semanaQueVem: d(7) };
}

test('criar uma tarefa sem prazo não a torna atrasada', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await comecarLimpo(page);
  await page.goto('/app/tarefas');
  await criarTarefa(page, 'Pensar no próximo passo');

  await expect(page.getByText('Pensar no próximo passo')).toBeVisible();
  await expect(page.getByText('Sem prazo')).toBeVisible();
  await expect(page.getByText('Atrasada')).toHaveCount(0);

  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('o prazo vencido aparece como atraso, com a contagem certa', async ({ page }) => {
  const { ontem } = datas();
  await comecarLimpo(page);
  await page.goto('/app/tarefas');
  await criarTarefa(page, 'Renovar o contrato', ontem);

  await expect(page.getByText('Venceu ontem')).toBeVisible();
  await expect(page.getByText('1 atrasada')).toBeVisible();
});

test('a tarefa de hoje vence hoje, não está atrasada', async ({ page }) => {
  const { hoje } = datas();
  await comecarLimpo(page);
  await page.goto('/app/tarefas');
  await criarTarefa(page, 'Ligar para o contador', hoje);

  await expect(page.getByText('Vence hoje')).toBeVisible();
  await expect(page.getByText('1 para hoje')).toBeVisible();
  await expect(page.getByText('atrasada')).toHaveCount(0);
});

test('concluir tira da lista de pendentes e sobrevive ao recarregar', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/tarefas');
  await criarTarefa(page, 'Comprar café');

  await page.getByText('Comprar café').click();
  await expect(page.getByText('0 pendentes')).toBeVisible();
  await expect(page.getByText('Nada pendente. Bom sinal.')).toBeVisible();

  await page.reload();
  await expect(page.getByText('0 pendentes')).toBeVisible();

  // E reaparece no filtro de concluídas.
  await page.getByRole('button', { name: 'Pendentes' }).click();
  await page.getByRole('button', { name: 'Concluídas' }).click();
  await expect(page.getByText('Comprar café')).toBeVisible();
});

test('as atrasadas vêm antes das de hoje', async ({ page }) => {
  const { ontem, hoje } = datas();
  await comecarLimpo(page);
  await page.goto('/app/tarefas');
  await criarTarefa(page, 'Tarefa de hoje', hoje);
  await criarTarefa(page, 'Tarefa atrasada', ontem);

  const atrasada = (await page.getByText('Tarefa atrasada').boundingBox())!;
  const deHoje = (await page.getByText('Tarefa de hoje').boundingBox())!;
  expect(atrasada.y, 'a atrasada aparece acima').toBeLessThan(deHoje.y);
});

test('o formulário recusa tarefa sem nome', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/tarefas');

  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByRole('button', { name: 'Criar tarefa' }).click();

  await expect(page.getByRole('alert')).toContainText('Dê um nome à tarefa');
  await expect(page.getByRole('button', { name: 'Criar tarefa' })).toBeVisible();
});

test('o Início mostra o que vence e deixa marcar de lá', async ({ page }) => {
  const { ontem } = datas();
  await comecarLimpo(page);
  await page.goto('/app/tarefas');
  await criarTarefa(page, 'Enviar a nota', ontem);

  await page.goto('/app/inicio');
  await expect(page.getByRole('heading', { name: 'Vencendo' })).toBeVisible();
  await expect(page.getByText('Enviar a nota')).toBeVisible();

  // Marcar do Início tira de "Vencendo" sem precisar ir à outra tela.
  await page.getByText('Enviar a nota').click();
  await expect(page.getByRole('heading', { name: 'Vencendo' })).toHaveCount(0);
});

test('o Início só mostra o que vence, não o futuro distante', async ({ page }) => {
  const { semanaQueVem } = datas();
  await comecarLimpo(page);
  await page.goto('/app/tarefas');
  await criarTarefa(page, 'Coisa distante', semanaQueVem);

  await page.goto('/app/inicio');
  await expect(page.getByText('Coisa distante')).toHaveCount(0);
});

test('tarefas funcionam no iPhone', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'só interessa no iPhone');
  const { ontem } = datas();

  await comecarLimpo(page);
  await page.goto('/app/tarefas');
  await criarTarefa(page, 'Pagar o boleto', ontem);

  await expect(page.getByText('Venceu ontem')).toBeVisible();
  const vazamento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(vazamento, 'sem rolagem horizontal').toBeLessThanOrEqual(0);

  await page.getByText('Pagar o boleto').tap();
  await expect(page.getByText('Nada pendente. Bom sinal.')).toBeVisible();
});
