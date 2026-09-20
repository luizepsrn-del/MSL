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

  // E reaparece no filtro de concluídas. O primeiro clique é no gatilho, que
  // é um botão; o segundo é na opção, dentro do portal.
  await page.getByRole('button', { name: 'Pendentes' }).click();
  await page.getByRole('option', { name: 'Concluídas' }).click();
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
  // A tarefa atrasada abre a fila, e leva o motivo junto.
  await expect(page.getByRole('heading', { name: 'Precisa de você hoje' })).toBeVisible();
  await expect(page.getByText('Enviar a nota')).toBeVisible();
  await expect(page.getByText('Atrasada há 1 dia')).toBeVisible();

  // Marcar do Início tira da fila sem precisar ir à outra tela.
  await page.getByText('Enviar a nota').click();
  await expect(page.getByText('Enviar a nota')).toHaveCount(0);
  await expect(page.getByText('O dia está seu')).toBeVisible();
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

/**
 * O `Select` da biblioteca não é um `<select>` nativo: é um botão que abre uma
 * lista de botões. `selectOption` não funciona nele.
 */
async function escolher(page: Page, atual: string, opcao: string) {
  await page.getByRole('button', { name: atual, exact: true }).first().click();
  await page.getByRole('option', { name: opcao, exact: true }).click();
}

test('o quadro move a tarefa entre as três colunas, e "feito" conclui de verdade', async ({
  page,
}) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await comecarLimpo(page);
  await page.goto('/app/tarefas');
  await criarTarefa(page, 'Revisar o contrato');

  await escolher(page, 'Lista', 'Quadro');
  await expect(page.getByRole('heading', { name: 'A fazer' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fazendo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Feito' })).toBeVisible();

  await page.getByRole('button', { name: 'Mover Revisar o contrato para Fazendo' }).click();
  await expect(
    page.getByRole('button', { name: 'Mover Revisar o contrato para Feito' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Mover Revisar o contrato para Feito' }).click();
  await expect(
    page.getByRole('button', { name: 'Mover Revisar o contrato para Fazendo' }),
  ).toBeVisible();

  // O resto do sistema precisa concordar: a tarefa saiu das pendentes.
  await escolher(page, 'Quadro', 'Lista');
  await expect(page.getByText('0 pendentes')).toBeVisible();
  await escolher(page, 'Pendentes', 'Concluídas');
  await expect(page.getByText('Revisar o contrato')).toBeVisible();

  expect(erros).toEqual([]);
});

test('tirar do "feito" reabre a tarefa em vez de só mudar de coluna', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/tarefas');
  await criarTarefa(page, 'Conferir a nota');

  // Conclui pela caixinha da lista e só depois abre o quadro: as duas portas
  // precisam falar da mesma coisa.
  await page.getByText('Conferir a nota').click();
  await expect(page.getByText('0 pendentes')).toBeVisible();

  await escolher(page, 'Lista', 'Quadro');
  await page.getByRole('button', { name: 'Mover Conferir a nota para Fazendo' }).click();

  await escolher(page, 'Quadro', 'Lista');
  await expect(page.getByText('1 pendente', { exact: true })).toBeVisible();
});

test('o quadro pode ser cortado por prazo, sem mexer em nenhuma tarefa', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  const { ontem, hoje, semanaQueVem } = datas();
  await comecarLimpo(page);
  await page.goto('/app/tarefas');
  await criarTarefa(page, 'Entregar o relatório', ontem);
  await criarTarefa(page, 'Pagar o IPVA', hoje);
  await criarTarefa(page, 'Comprar passagem', semanaQueVem);
  await criarTarefa(page, 'Pensar no próximo passo');

  await escolher(page, 'Lista', 'Quadro');
  await escolher(page, 'Por etapa', 'Por prazo');

  await expect(page.getByRole('heading', { name: 'Atrasadas' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hoje' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Próximos 7 dias' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sem prazo' })).toBeVisible();

  // Trocar o eixo é outro corte da mesma lista: as quatro continuam lá.
  await escolher(page, 'Por prazo', 'Por contexto');
  await expect(page.getByText('Entregar o relatório')).toBeVisible();
  await expect(page.getByText('Pensar no próximo passo')).toBeVisible();

  await escolher(page, 'Por contexto', 'Por etapa');
  await expect(page.getByText('4 pendentes')).toBeVisible();

  expect(erros).toEqual([]);
});

test('a hora aparece junto do prazo, e não só no calendário', async ({ page }) => {
  // A hora entrou no esquema com a agenda do dia; se ela só aparecesse lá, eu
  // marcaria 14:30 e não veria isso na lista onde trabalho.
  const { hoje } = datas();
  await comecarLimpo(page);
  await page.goto('/app/tarefas');

  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByLabel('O que precisa ser feito').fill('Reunião com o cliente');
  await page.getByLabel('Prazo').fill(hoje);
  await page.getByLabel('Hora').fill('14:30');
  await page.getByRole('button', { name: 'Criar tarefa' }).click();

  await expect(page.getByText('Vence hoje às 14:30')).toBeVisible();
});

test('dá para corrigir uma tarefa sem apagar e refazer', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  const { hoje, semanaQueVem } = datas();
  await comecarLimpo(page);
  await page.goto('/app/tarefas');
  await criarTarefa(page, 'Entregar o relatorio', hoje);

  await page.getByRole('button', { name: 'Corrigir Entregar o relatorio' }).click();
  // Os campos vêm preenchidos com o que está gravado.
  await expect(page.getByLabel('O que precisa ser feito')).toHaveValue('Entregar o relatorio');
  await expect(page.getByLabel('Prazo')).toHaveValue(hoje);

  await page.getByLabel('O que precisa ser feito').fill('Entregar o relatório');
  await page.getByLabel('Prazo').fill(semanaQueVem);
  await page.getByLabel('Hora').fill('14:30');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByText('Entregar o relatório')).toBeVisible();
  await expect(page.getByText('Vence em 7 dias às 14:30')).toBeVisible();
  // Uma só: corrigir não pode virar duas tarefas.
  await expect(page.getByText('1 pendente', { exact: true })).toBeVisible();

  expect(erros).toEqual([]);
});

test('corrigir uma tarefa concluída não a ressuscita', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/tarefas');
  await criarTarefa(page, 'Assinar o contrato');
  await page.getByText('Assinar o contrato').click();
  await expect(page.getByText('0 pendentes')).toBeVisible();

  await escolher(page, 'Pendentes', 'Concluídas');
  await page.getByRole('button', { name: 'Corrigir Assinar o contrato' }).click();
  await page.getByLabel('O que precisa ser feito').fill('Assinar o contrato novo');
  await page.getByRole('button', { name: 'Salvar' }).click();

  // Consertar um nome não desfaz o trabalho.
  await expect(page.getByText('Assinar o contrato novo')).toBeVisible();
  await expect(page.getByText('0 pendentes')).toBeVisible();
});

test('apagar o prazo na correção deixa a tarefa sem prazo', async ({ page }) => {
  // A diferença entre "não mandei" e "mandei vazio": sem ela, não haveria como
  // tirar uma data que deixou de existir.
  const { hoje } = datas();
  await comecarLimpo(page);
  await page.goto('/app/tarefas');
  await criarTarefa(page, 'Ligar para o contador', hoje);
  await expect(page.getByText('Vence hoje')).toBeVisible();

  await page.getByRole('button', { name: 'Corrigir Ligar para o contador' }).click();
  await page.getByLabel('Prazo').fill('');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByText('Sem prazo')).toBeVisible();
  await expect(page.getByText('Vence hoje')).toHaveCount(0);
});

test('a tarefa que se repete cria a próxima ao ser concluída', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  const { hoje } = datas();
  await comecarLimpo(page);
  await page.goto('/app/tarefas');

  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByLabel('O que precisa ser feito').fill('Pagar o aluguel');
  await page.getByLabel('Prazo').fill(hoje);
  await page.locator('#tar-repete').click();
  await page.getByRole('option', { name: 'Toda semana', exact: true }).click();
  await page.getByRole('button', { name: 'Criar tarefa' }).click();

  // Uma só, e ela se anuncia como repetida.
  await expect(page.getByText('Pagar o aluguel')).toHaveCount(1);
  await expect(page.getByText(/toda semana/)).toBeVisible();

  // Concluir cria a próxima, com o prazo uma semana à frente. A lista mostra
  // pendentes, então continua uma na tela — a concluída virou histórico.
  await page.getByText('Pagar o aluguel').first().click();
  await expect(page.getByText('Pagar o aluguel')).toHaveCount(1);

  const prazos = await page.evaluate(() => {
    const b = JSON.parse(localStorage.getItem('msl-banco') ?? '{}');
    return (b.tarefas as { titulo: string; prazo?: string; concluidaEm?: string }[])
      .filter((t) => t.titulo === 'Pagar o aluguel')
      .map((t) => `${t.prazo}${t.concluidaEm ? ' (feita)' : ''}`)
      .sort();
  });

  const daquiUmaSemana = new Date(`${hoje}T12:00:00`);
  daquiUmaSemana.setDate(daquiUmaSemana.getDate() + 7);
  const esperado = daquiUmaSemana.toISOString().slice(0, 10);

  expect(prazos).toEqual([`${esperado}`, `${hoje} (feita)`].sort());
  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('desmarcar uma repetida não cria uma terceira', async ({ page }) => {
  // Marcar e desmarcar duas vezes encheria o mês de ocorrências.
  const { hoje } = datas();
  await comecarLimpo(page);
  await page.goto('/app/tarefas');

  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByLabel('O que precisa ser feito').fill('Revisar as metas');
  await page.getByLabel('Prazo').fill(hoje);
  await page.locator('#tar-repete').click();
  await page.getByRole('option', { name: 'Toda semana', exact: true }).click();
  await page.getByRole('button', { name: 'Criar tarefa' }).click();

  const quantas = () =>
    page.evaluate(
      () =>
        (JSON.parse(localStorage.getItem('msl-banco') ?? '{}').tarefas as { titulo: string }[])
          .filter((t) => t.titulo === 'Revisar as metas').length,
    );

  await page.getByText('Revisar as metas').first().click();
  await expect.poll(quantas).toBe(2);

  // Desmarcar reabre a que foi concluída — e não cria uma terceira.
  //
  // Filtrando por concluídas, e não por todas: com as duas na tela a primeira
  // é a pendente nova, e clicar nela a concluiria, criando uma terceira de
  // verdade. O teste erraria de alvo e depois acusaria o código.
  await page.getByRole('button', { name: 'Pendentes', exact: true }).first().click();
  await page.getByRole('option', { name: 'Concluídas', exact: true }).click();
  await page.getByText('Revisar as metas').first().click();
  await expect.poll(quantas).toBe(2);
});

test('o título da tarefa não é espremido a uma letra por linha', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'é uma armadilha de largura de telefone');

  // Aconteceu de verdade: o botão de pular entrou na linha e o título passou a
  // descer uma letra por linha. Duas etiquetas e três botões cabem, desde que
  // a linha quebre em vez de espremer o texto.
  const { hoje } = datas();
  await comecarLimpo(page);
  await page.goto('/app/tarefas');

  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByLabel('O que precisa ser feito').fill('Pagar o aluguel do apartamento');
  await page.getByLabel('Prazo').fill(hoje);
  await page.locator('#tar-repete').click();
  await page.getByRole('option', { name: 'Todo mês', exact: true }).click();
  await page.getByRole('button', { name: 'Criar tarefa' }).click();

  const titulo = page.getByText('Pagar o aluguel do apartamento');
  await expect(titulo).toBeVisible();

  const caixa = (await titulo.boundingBox())!;
  // Uma palavra curta do título tem mais de 40px. Abaixo disso, o texto está
  // descendo letra a letra.
  expect(caixa.width, 'o título tem largura de palavra, não de letra').toBeGreaterThan(80);
  // E a linha inteira não pode estourar a tela.
  const vazamento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(vazamento, 'sem rolagem horizontal').toBeLessThanOrEqual(0);
});
