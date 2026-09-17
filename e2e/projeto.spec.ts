import { test, expect, type Page } from '@playwright/test';

/** O ciclo de Projetos, com atenção ao que acontece ao remover. */

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

async function criarProjeto(page: Page, titulo: string) {
  await page.getByRole('button', { name: 'Novo projeto' }).click();
  await page.getByLabel('Nome do projeto').fill(titulo);
  await page.getByRole('button', { name: 'Criar projeto' }).click();
  await expect(page.getByRole('button', { name: 'Criar projeto' })).toHaveCount(0);
}

async function criarTarefaNoProjeto(page: Page, titulo: string, projeto?: string) {
  await page.goto('/app/tarefas');
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByLabel('O que precisa ser feito').fill(titulo);
  if (projeto) {
    await page.getByLabel('Projeto').click();
    await page.getByRole('button', { name: projeto }).click();
  }
  await page.getByRole('button', { name: 'Criar tarefa' }).click();
  await expect(page.getByRole('button', { name: 'Criar tarefa' })).toHaveCount(0);
}

test('um projeto novo nasce sem tarefas e em 0%', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await comecarLimpo(page);
  await page.goto('/app/projetos');
  await criarProjeto(page, 'Reforma do escritório');

  await expect(page.getByText('Reforma do escritório')).toBeVisible();
  await expect(page.getByText('Sem tarefas', { exact: true })).toBeVisible();
  // Projeto sem tarefa está por começar, não pronto.
  await expect(page.getByText('0/0')).toBeVisible();

  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('o progresso acompanha as tarefas do projeto', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/projetos');
  await criarProjeto(page, 'Mudança');

  await criarTarefaNoProjeto(page, 'Contratar a transportadora', 'Mudança');
  await criarTarefaNoProjeto(page, 'Embalar os livros', 'Mudança');

  await page.goto('/app/projetos');
  await expect(page.getByText('0/2')).toBeVisible();
  await expect(page.getByText('Em andamento')).toBeVisible();

  // Concluir uma move a barra.
  await page.getByRole('button', { name: /tarefas$/ }).click();
  await page.getByText('Embalar os livros').click();
  await expect(page.getByText('1/2')).toBeVisible();
});

test('remover um projeto SOLTA as tarefas, não as apaga', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/projetos');
  await criarProjeto(page, 'Projeto que vai sair');
  await criarTarefaNoProjeto(page, 'Tarefa que precisa sobreviver', 'Projeto que vai sair');

  await page.goto('/app/projetos');
  await page.getByRole('button', { name: 'Remover Projeto que vai sair' }).click();

  // O diálogo diz o que vai acontecer antes de acontecer.
  await expect(page.getByText(/não são apagadas/)).toBeVisible();
  await page.getByRole('button', { name: 'Remover projeto', exact: true }).click();

  await expect(page.getByText('Projeto que vai sair')).toHaveCount(0);

  // A tarefa continua existindo, agora solta.
  await expect(page.getByText('Tarefas sem projeto')).toBeVisible();
  await expect(page.getByText('Tarefa que precisa sobreviver')).toBeVisible();

  await page.goto('/app/tarefas');
  await expect(page.getByText('Tarefa que precisa sobreviver')).toBeVisible();
});

test('uma tarefa atrasada deixa o projeto atrasado', async ({ page }) => {
  await comecarLimpo(page);

  const fmt = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
  const [ano, mes, dia] = fmt.format(new Date()).split('-').map(Number);
  const ontem = new Date(Date.UTC(ano, mes - 1, dia - 1)).toISOString().slice(0, 10);

  await page.goto('/app/projetos');
  await criarProjeto(page, 'Entrega');

  await page.goto('/app/tarefas');
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByLabel('O que precisa ser feito').fill('Passo vencido');
  await page.getByLabel('Prazo').fill(ontem);
  await page.getByLabel('Projeto').click();
  await page.getByRole('button', { name: 'Entrega' }).click();
  await page.getByRole('button', { name: 'Criar tarefa' }).click();

  await page.goto('/app/projetos');
  await expect(page.getByText('Atrasado', { exact: true })).toBeVisible();
  await expect(page.getByText('1 atrasado')).toBeVisible();
});

test('o formulário recusa projeto sem nome', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/projetos');

  await page.getByRole('button', { name: 'Novo projeto' }).click();
  await page.getByRole('button', { name: 'Criar projeto' }).click();

  await expect(page.getByRole('alert')).toContainText('Dê um nome ao projeto');
  await expect(page.getByRole('button', { name: 'Criar projeto' })).toBeVisible();
});

test('projetos funcionam no iPhone', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'só interessa no iPhone');

  await comecarLimpo(page);
  await page.goto('/app/projetos');
  await criarProjeto(page, 'Projeto no telefone');

  await expect(page.getByText('Projeto no telefone')).toBeVisible();
  const vazamento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(vazamento, 'sem rolagem horizontal').toBeLessThanOrEqual(0);
});

test('os contadores concordam em número', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/projetos');
  await criarProjeto(page, 'Um projeto só');

  // "1 projetos ativos" e "1 concluídos" são o tipo de erro que passa
  // despercebido para sempre porque nada quebra.
  await expect(page.getByText('1 projeto ativo')).toBeVisible();
  await expect(page.getByText('projetos ativos')).toHaveCount(0);

  await criarTarefaNoProjeto(page, 'Única tarefa', 'Um projeto só');
  await page.goto('/app/projetos');
  await page.getByRole('button', { name: /tarefa$/ }).click();
  // O título aparece duas vezes: na lista e no bloco "Próxima" que o painel
  // agora mostra. Marcar por qualquer um dos dois tem o mesmo efeito.
  await page.getByText('Única tarefa').first().click();

  await expect(page.getByText('1 concluído', { exact: true })).toBeVisible();
});

test('dá para criar a tarefa de dentro do projeto, sem escolher o projeto de novo', async ({
  page,
}) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await comecarLimpo(page);
  await page.goto('/app/projetos');
  await criarProjeto(page, 'Mudança de casa');

  await page.getByRole('button', { name: 'Nova tarefa em Mudança de casa' }).click();
  // O seletor de projeto não aparece: quem abriu daqui já disse qual é.
  await expect(page.getByText('Projeto', { exact: true })).toHaveCount(0);
  await page.getByLabel('O que precisa ser feito').fill('Contratar o caminhão');
  await page.getByRole('button', { name: 'Criar tarefa' }).click();

  // Entrou no projeto, e virou a próxima coisa a fazer.
  await expect(page.getByText('Próxima')).toBeVisible();
  await expect(page.getByText('Contratar o caminhão')).toBeVisible();
  await expect(page.getByText('1 tarefa', { exact: true })).toBeVisible();

  expect(erros).toEqual([]);
});

test('uma tarefa solta pode ser guardada num projeto', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/projetos');
  await criarProjeto(page, 'Reforma');
  await criarTarefaNoProjeto(page, 'Comprar tinta');

  await page.goto('/app/projetos');
  await expect(page.getByText('Tarefas sem projeto')).toBeVisible();

  await page.getByRole('button', { name: 'Pôr num projeto' }).click();
  await page.getByRole('button', { name: 'Reforma', exact: true }).click();

  // Saiu das soltas e entrou no projeto.
  await expect(page.getByText('Tarefas sem projeto')).toHaveCount(0);
  await expect(page.getByText('Comprar tinta')).toBeVisible();
});
