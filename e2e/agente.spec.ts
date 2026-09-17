import { test, expect, type Page } from '@playwright/test';

/** O agente: pergunta que lê, comando que muda, e o que ele recusa adivinhar. */

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

async function semear(page: Page) {
  const dias = [diaLocal(-3), diaLocal(0)];
  await page.addInitScript((d) => {
    try {
      if (sessionStorage.getItem('teste-ja-semeou')) return;
      sessionStorage.setItem('teste-ja-semeou', '1');
      const b = { criadoEm: new Date().toISOString(), alteradoEm: new Date().toISOString() };
      localStorage.setItem(
        'msl-banco',
        JSON.stringify({
          versao: 5,
          rotinas: [],
          execucoes: [],
          tarefas: [
            { ...b, id: 't1', titulo: 'Entregar o relatório', contexto: 'profissional', prazo: d[0] },
            { ...b, id: 't2', titulo: 'Renovar o seguro', contexto: 'pessoal' },
            { ...b, id: 't3', titulo: 'Renovar o passaporte', contexto: 'pessoal' },
          ],
          projetos: [],
          lancamentos: [
            {
              ...b,
              id: 'l1',
              descricao: 'Aluguel',
              valor: 250000,
              tipo: 'saida',
              categoria: 'moradia',
              contexto: 'pessoal',
              data: d[0],
            },
          ],
        }),
      );
    } catch {
      /* janela privada */
    }
  }, dias);
}

async function perguntar(page: Page, frase: string) {
  const campo = page.getByPlaceholder('Pergunte, ou mande fazer');
  await campo.fill(frase);
  await campo.press('Enter');
}

test('o agente responde sobre os meus dados, com o número certo', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await semear(page);
  await page.goto('/app/pedir');

  await perguntar(page, 'quanto gastei com moradia?');
  await expect(page.getByText('R$ 2.500,00')).toBeVisible();

  await perguntar(page, 'o que está atrasado?');
  await expect(page.getByText('Entregar o relatório').first()).toBeVisible();

  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('mandar criar uma tarefa cria a tarefa, com a data que eu escrevi', async ({ page }) => {
  await semear(page);
  await page.goto('/app/pedir');

  await perguntar(page, 'criar tarefa pagar o IPVA amanhã');
  await expect(page.getByText('Tarefa criada')).toBeVisible();
  // A data saiu do título: "Pagar o IPVA amanhã" viraria mentira amanhã.
  await expect(page.getByText('Pagar o IPVA', { exact: true })).toBeVisible();
  await expect(page.getByText('Vence amanhã')).toBeVisible();

  // E ela existe de verdade no pilar de Tarefas.
  await page.goto('/app/tarefas');
  await expect(page.getByText('Pagar o IPVA')).toBeVisible();
});

test('mandar lançar um gasto lança, e adivinha a categoria', async ({ page }) => {
  await semear(page);
  await page.goto('/app/pedir');

  await perguntar(page, 'gastei 250 no mercado');
  await expect(page.getByText('Gasto lançado')).toBeVisible();
  await expect(page.getByText('Alimentação')).toBeVisible();

  await page.goto('/app/financeiro');
  await expect(page.getByText('Mercado')).toBeVisible();
  await expect(page.getByText('−R$ 250,00')).toBeVisible();
});

test('com duas tarefas parecidas ele pergunta qual, em vez de concluir a errada', async ({
  page,
}) => {
  await semear(page);
  await page.goto('/app/pedir');

  await perguntar(page, 'concluir renovar');
  await expect(page.getByText('Qual delas?')).toBeVisible();
  await expect(page.getByText('Renovar o seguro')).toBeVisible();
  await expect(page.getByText('Renovar o passaporte')).toBeVisible();

  // Nada foi concluído: as três continuam pendentes.
  await page.goto('/app/tarefas');
  await expect(page.getByText('3 pendentes')).toBeVisible();
});

test('dizendo o nome inteiro, ele conclui', async ({ page }) => {
  await semear(page);
  await page.goto('/app/pedir');

  await perguntar(page, 'concluir renovar o seguro');
  await expect(page.getByText('Concluída')).toBeVisible();

  await page.goto('/app/tarefas');
  await expect(page.getByText('2 pendentes')).toBeVisible();
});

test('os atalhos respondem sem eu digitar nada', async ({ page }) => {
  await semear(page);
  await page.goto('/app/pedir');

  await page.getByRole('button', { name: 'O que está atrasado?' }).click();
  await expect(page.getByText('O que está atrasado', { exact: true })).toBeVisible();
});
