import { test, expect, type Page } from '@playwright/test';

/** O ciclo do Financeiro. As asserções são sobre dinheiro, então são exatas. */

const NBSP = ' ';
const reais = (t: string) => `R$${NBSP}${t}`;

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

async function lancar(
  page: Page,
  descricao: string,
  valor: string,
  tipo: 'Saída' | 'Entrada',
  data?: string,
) {
  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Descrição').fill(descricao);
  await page.getByLabel('Valor').fill(valor);
  if (tipo === 'Entrada') {
    await page.getByLabel('Tipo').click();
    await page.getByRole('option', { name: 'Entrada' }).click();
  }
  if (data) await page.getByLabel('Data').fill(data);
  await page.getByRole('button', { name: 'Lançar' }).click();
  await expect(page.getByRole('button', { name: 'Lançar' })).toHaveCount(0);
}

test('lançar uma saída move o saldo pelo valor exato', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await comecarLimpo(page);
  await page.goto('/app/financeiro');
  await lancar(page, 'Aluguel', '2.500,00', 'Saída');

  await expect(page.getByText('Aluguel')).toBeVisible();
  await expect(page.getByText(`−${reais('2.500,00')}`)).toBeVisible();
  // Saldo realizado negativo, com o sinal do lado certo.
  await expect(page.getByText(`-${reais('2.500,00')}`).first()).toBeVisible();

  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('entrada e saída se compensam exatamente', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/financeiro');
  await lancar(page, 'Pagamento recebido', '3.333,33', 'Entrada');
  await lancar(page, 'Fornecedor', '3.333,33', 'Saída');

  // Zero exato: é o teste de que centavos inteiros valem a pena.
  await expect(page.getByText(reais('0,00')).first()).toBeVisible();
});

test('o lançamento futuro não entra no saldo realizado', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/financeiro');

  await lancar(page, 'Recebido hoje', '1.000,00', 'Entrada');
  await lancar(page, 'Conta que vence depois', '400,00', 'Saída', diaLocal(5));

  // Realizado ignora o futuro; previsto conta.
  await expect(page.getByText('Saldo realizado')).toBeVisible();
  await expect(page.getByText(reais('1.000,00')).first()).toBeVisible();
  await expect(page.getByText(reais('600,00')).first()).toBeVisible();
  await expect(page.getByText('previsto', { exact: false }).first()).toBeVisible();
});

test('o formulário recusa valor zero e valor vazio', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/financeiro');

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Descrição').fill('Nada');
  await page.getByRole('button', { name: 'Lançar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Informe um valor' })).toBeVisible();

  await page.getByLabel('Valor').fill('0,00');
  await page.getByRole('button', { name: 'Lançar' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'maior que zero' }),
  ).toBeVisible();
});

test('o valor digitado é confirmado antes de lançar', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/financeiro');

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor').fill('1234,56');
  // A ajuda do campo mostra como o sistema entendeu o número.
  await expect(page.getByText(reais('1.234,56'))).toBeVisible();
});

test('as saídas aparecem agrupadas por categoria', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/financeiro');

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Descrição').fill('Aluguel');
  await page.getByLabel('Valor').fill('2.000,00');
  await page.getByLabel('Categoria').click();
  await page.getByRole('option', { name: 'Moradia' }).click();
  await page.getByRole('button', { name: 'Lançar' }).click();

  await expect(page.getByText('Para onde foi')).toBeVisible();
  await expect(page.getByText('Moradia').first()).toBeVisible();
});

test('o mês anterior fica vazio e a navegação volta', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/financeiro');
  await lancar(page, 'Deste mês', '100,00', 'Saída');

  await page.getByRole('button', { name: 'Mês anterior' }).click();
  await expect(page.getByText('Nada lançado neste mês.')).toBeVisible();

  await page.getByRole('button', { name: 'Mês atual' }).click();
  await expect(page.getByText('Deste mês')).toBeVisible();
});

test('o financeiro funciona no iPhone', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'só interessa no iPhone');

  await comecarLimpo(page);
  await page.goto('/app/financeiro');
  await lancar(page, 'Mercado', '187,45', 'Saída');

  await expect(page.getByText(`−${reais('187,45')}`)).toBeVisible();
  const vazamento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(vazamento, 'sem rolagem horizontal').toBeLessThanOrEqual(0);
});

test('o formulário não herda o tipo do lançamento anterior', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/financeiro');

  await lancar(page, 'Recebimento', '1.000,00', 'Entrada');
  // Sem escolher nada: o tipo tem que voltar ao padrão, que é saída.
  await lancar(page, 'Despesa', '400,00', 'Saída');

  await expect(page.getByText(`+${reais('1.000,00')}`)).toBeVisible();
  await expect(page.getByText(`−${reais('400,00')}`)).toBeVisible();
  // 1000 − 400, e não 1000 + 400.
  await expect(page.getByText(reais('600,00')).first()).toBeVisible();
});

test('o gráfico de categorias bate com o total que ele mesmo mostra', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/financeiro');

  await lancar(page, 'Gasto de hoje', '100,00', 'Saída');
  await lancar(page, 'Conta futura', '900,00', 'Saída', diaLocal(5));

  // O centro do donut fala de saídas realizadas. Se o previsto entrasse nos
  // segmentos, eles somariam R$ 1.000,00 contra um centro de R$ 100,00.
  const cartao = page.locator('section').filter({ hasText: 'Para onde foi' });
  await expect(cartao.getByText(reais('100,00')).first()).toBeVisible();
  await expect(cartao.getByText(reais('900,00'))).toHaveCount(0);
  await expect(cartao.getByText(reais('1.000,00'))).toHaveCount(0);
});

test('um lançamento que se repete aparece no mês seguinte sozinho', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await comecarLimpo(page);
  await page.goto('/app/financeiro');

  // Dia 28 ou antes: 29, 30 e 31 encostam no fim do mês e mudariam de data.
  const [ano, mes, dia] = diaLocal(0).split('-').map(Number);
  const seguro = `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, 28)).padStart(2, '0')}`;

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Descrição').fill('Aluguel');
  await page.getByLabel('Valor').fill('2.500,00');
  await page.getByLabel('Data').fill(seguro);
  await page.getByLabel('Se repete').click();
  await page.getByRole('option', { name: 'Todo mês' }).click();
  await page.getByRole('button', { name: 'Lançar' }).click();
  await expect(page.getByRole('button', { name: 'Lançar' })).toHaveCount(0);

  // Neste mês, uma vez.
  await expect(page.getByText('Aluguel').first()).toBeVisible();
  await expect(page.getByText('Todo mês').first()).toBeVisible();

  // No mês seguinte ele está lá, sem eu lançar de novo.
  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await expect(page.getByText('Aluguel').first()).toBeVisible();
  await expect(page.getByText(reais('2.500,00')).first()).toBeVisible();

  // E daqui a seis meses também.
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Próximo mês' }).click();
  await expect(page.getByText('Aluguel').first()).toBeVisible();

  expect(erros).toEqual([]);
});

test('apagar a série diz que apaga a série', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/financeiro');

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Descrição').fill('Internet');
  await page.getByLabel('Valor').fill('129,90');
  await page.getByLabel('Se repete').click();
  await page.getByRole('option', { name: 'Todo mês' }).click();
  await page.getByRole('button', { name: 'Lançar' }).click();

  // O rótulo avisa antes do clique: a repetição não existe como registro,
  // então não dá para apagar uma só.
  const apagar = page.getByRole('button', { name: 'Remover Internet e todas as repetições' });
  await expect(apagar).toBeVisible();
  await apagar.click();
  await expect(page.getByText('Nada lançado neste mês.')).toBeVisible();
});

test('dá para corrigir um lançamento, e o valor passa pela mesma conferência', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/financeiro');
  await lancar(page, 'Mercado', '432,50', 'Saída');
  await expect(page.getByText(`−${reais('432,50')}`)).toBeVisible();

  await page.getByRole('button', { name: 'Corrigir Mercado' }).click();
  await expect(page.getByLabel('Descrição')).toHaveValue('Mercado');
  await expect(page.getByLabel('Valor')).toHaveValue('432,50');

  // Valor zero continua barrado na correção, como na entrada.
  await page.getByLabel('Valor').fill('0');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('alert')).toContainText('maior que zero');

  await page.getByLabel('Valor').fill('532,50');
  await page.getByLabel('Descrição').fill('Mercado do mês');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByText('Mercado do mês')).toBeVisible();
  await expect(page.getByText(`−${reais('532,50')}`)).toBeVisible();
  // Um só: corrigir não pode virar dois lançamentos.
  await expect(page.getByText('1 lançamento')).toBeVisible();
});
