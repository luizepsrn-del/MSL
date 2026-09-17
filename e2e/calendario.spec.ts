import { test, expect, type Page } from '@playwright/test';

/** O Calendário lendo rotina e tarefa no tempo. */

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

/** Semeia o banco direto, para o teste falar de calendário e não de formulário. */
async function semear(page: Page) {
  const hoje = diaLocal(0);
  const banco = {
    versao: 2,
    rotinas: [
      {
        id: 'r1',
        criadoEm: 'x',
        alteradoEm: 'x',
        titulo: 'Ler 20 páginas',
        contexto: 'pessoal',
        icone: 'book-open',
        inicioEm: diaLocal(-60),
        arquivada: false,
        recorrencia: { tipo: 'diaria' },
      },
    ],
    execucoes: [],
    tarefas: [
      {
        id: 't1',
        criadoEm: 'x',
        alteradoEm: 'x',
        titulo: 'Entregar o relatório',
        contexto: 'profissional',
        prazo: hoje,
      },
    ],
  };
  // Semeia UMA vez por teste. addInitScript roda em todo carregamento de
  // página: sem a trava, navegar para o Início re-semearia o banco original e
  // apagaria o que o teste acabou de marcar.
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

test('a grade abre no mês de hoje e marca o dia', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await semear(page);
  await page.goto('/app/calendario');

  const numeroDeHoje = Number(diaLocal(0).slice(8));
  await expect(page.getByRole('button', { name: `Dia ${numeroDeHoje}` })).toBeVisible();

  // O dia de hoje começa selecionado.
  await expect(page.getByRole('heading', { name: 'Hoje' })).toBeVisible();
  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('o dia escolhido mostra rotina e tarefa daquele dia', async ({ page }) => {
  await semear(page);
  await page.goto('/app/calendario');

  await expect(page.getByText('Ler 20 páginas')).toBeVisible();
  await expect(page.getByText('Entregar o relatório')).toBeVisible();
  await expect(page.getByText('Vencem neste dia')).toBeVisible();
});

test('navegar entre meses anda e volta', async ({ page }) => {
  await semear(page);
  await page.goto('/app/calendario');

  const tituloInicial = await page.locator('h3').first().textContent();

  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await expect(page.locator('h3').first()).not.toHaveText(tituloInicial!);
  // O botão de voltar para hoje só aparece fora do mês atual.
  await expect(page.getByRole('button', { name: 'Hoje', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Hoje', exact: true }).click();
  await expect(page.locator('h3').first()).toHaveText(tituloInicial!);
});

test('só dá para marcar rotina no dia de hoje', async ({ page }) => {
  await semear(page);
  await page.goto('/app/calendario');

  // Hoje tem caixa.
  await expect(page.getByRole('checkbox')).not.toHaveCount(0);

  // Um dia anterior no mesmo mês não tem — marcar o passado registraria algo
  // que não aconteceu.
  const ontem = Number(diaLocal(-1).slice(8));
  const mesDeOntem = diaLocal(-1).slice(0, 7);
  test.skip(mesDeOntem !== diaLocal(0).slice(0, 7), 'ontem caiu em outro mês');

  await page.getByRole('button', { name: `Dia ${ontem}` }).click();
  await expect(page.getByText('Ler 20 páginas')).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
});

test('marcar do calendário grava e aparece no Início', async ({ page }) => {
  await semear(page);
  await page.goto('/app/calendario');

  await page.getByText('Ler 20 páginas').click();

  await page.goto('/app/inicio');
  await expect(page.getByText('Dia cumprido')).toBeVisible();
});

test('o calendário funciona no iPhone', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'só interessa no iPhone');

  await semear(page);
  await page.goto('/app/calendario');

  await expect(page.getByText('Ler 20 páginas')).toBeVisible();

  const vazamento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(vazamento, 'sem rolagem horizontal').toBeLessThanOrEqual(0);

  // Toda célula precisa ser tocável.
  const numeroDeHoje = Number(diaLocal(0).slice(8));
  const celula = (await page
    .getByRole('button', { name: `Dia ${numeroDeHoje}` })
    .boundingBox())!;
  expect(Math.round(celula.height), 'altura de toque').toBeGreaterThanOrEqual(44);
});
