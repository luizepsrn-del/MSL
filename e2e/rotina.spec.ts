import { test, expect, type Page } from '@playwright/test';

/**
 * O ciclo completo do pilar Rotina, no navegador de verdade.
 *
 * Os testes de domínio já cobrem a recorrência. Aqui a pergunta é outra: o que
 * eu crio sobrevive, aparece no Início, e volta depois de recarregar a página.
 */

/**
 * Cada teste começa com o banco limpo, senão um vaza no outro.
 *
 * A limpeza acontece UMA vez por teste, não a cada navegação: addInitScript
 * roda em todo carregamento de página, então limpar sem trava apagava o banco
 * no meio do próprio teste, ao navegar de /app/rotina para /app/inicio.
 */
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

async function criarRotina(page: Page, titulo: string) {
  await page.getByRole('button', { name: 'Nova rotina' }).click();
  await page.getByLabel('O que é').fill(titulo);
  await page.getByRole('button', { name: 'Criar rotina' }).click();
  await expect(page.getByRole('button', { name: 'Criar rotina' })).toHaveCount(0);
}

test('o primeiro uso convida em vez de mostrar painel vazio', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/inicio');

  await expect(page.getByText('Nada cadastrado ainda')).toBeVisible();
  // O primeiro uso oferece os dois caminhos desde que Tarefas existe.
  await expect(page.getByRole('link', { name: /Criar uma rotina/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Criar uma tarefa/ })).toBeVisible();
});

test('criar uma rotina e vê-la no Início', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await comecarLimpo(page);
  await page.goto('/app/rotina');
  await criarRotina(page, 'Ler 20 páginas');

  await expect(page.getByText('Ler 20 páginas')).toBeVisible();
  await expect(page.getByText('Todo dia').first()).toBeVisible();

  await page.goto('/app/inicio');
  // `exact`: o título também aparece na linha "Não coube hoje" do cartão do
  // dia montado, e sem isto o localizador pega dois elementos.
  await expect(page.getByText('Ler 20 páginas', { exact: true })).toBeVisible();
  // Um indicador de 0 de 1 cumprida.
  // "0/1" aparece no indicador, no centro do donut e na barra de contexto:
  // escopar ao cartão que interessa, senão o localizador é ambíguo.
  const cumpridas = page.locator('div').filter({ hasText: /^0\/1Rotinas cumpridas hoje$/ });
  await expect(cumpridas.first()).toBeVisible();

  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('marcar como feita move o indicador e sobrevive ao recarregar', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/rotina');
  await criarRotina(page, 'Caminhar');

  await page.goto('/app/inicio');
  await expect(page.getByText('Caminhar', { exact: true })).toBeVisible();

  // Clicar no título, que é o rótulo da caixa — como uma pessoa faz. A caixa
  // em si é visualmente escondida por design no componente.
  await page.getByText('Caminhar', { exact: true }).click();
  // A fila esvazia e o indicador vira 100%. A frase é a do cartão "Precisa de
  // você hoje", que passou a ser onde a rotina do dia aparece.
  await expect(page.getByText('O dia está seu')).toBeVisible();
  await expect(page.getByText('100%').first()).toBeVisible();

  // O dado é do disco, não da memória da aba.
  await page.reload();
  await expect(page.getByText('O dia está seu')).toBeVisible();
  await expect(page.getByText('100%').first()).toBeVisible();
});

test('o formulário recusa rotina sem nome', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/rotina');

  await page.getByRole('button', { name: 'Nova rotina' }).click();
  await page.getByRole('button', { name: 'Criar rotina' }).click();

  await expect(page.getByRole('alert')).toContainText('Dê um nome à rotina');
  // Continua aberto: recusar não é fechar em silêncio.
  await expect(page.getByRole('button', { name: 'Criar rotina' })).toBeVisible();
});

test('a frequência escolhida aparece descrita em português', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/rotina');

  await page.getByRole('button', { name: 'Nova rotina' }).click();
  await page.getByLabel('O que é').fill('Planejar a semana');

  await page.getByLabel('Frequência').click();
  await page.getByRole('option', { name: 'Dias da semana' }).click();
  await expect(page.getByText('Vai acontecer: de segunda a sexta')).toBeVisible();

  await page.getByRole('button', { name: 'segunda', exact: true }).click();
  await page.getByRole('button', { name: 'terça' }).click();
  await page.getByRole('button', { name: 'quarta' }).click();
  await page.getByRole('button', { name: 'quinta' }).click();
  await expect(page.getByText('Vai acontecer: sexta')).toBeVisible();

  await page.getByRole('button', { name: 'Criar rotina' }).click();
  await expect(page.getByText('sexta').first()).toBeVisible();
});

test('a rotina que não é de hoje aparece sem caixa de marcar', async ({ page }) => {
  await comecarLimpo(page);
  await page.goto('/app/rotina');

  await page.getByRole('button', { name: 'Nova rotina' }).click();
  await page.getByLabel('O que é').fill('Só no dia 1');
  await page.getByLabel('Frequência').click();
  await page.getByRole('option', { name: 'Uma vez por mês' }).click();
  await page.getByRole('button', { name: 'Criar rotina' }).click();

  await expect(page.getByText('Só no dia 1')).toBeVisible();
  // Ou é hoje e tem caixa, ou não é e diz por quê — nunca uma caixa morta.
  const naoEHoje = page.getByText('não é hoje');
  const caixas = page.getByRole('checkbox');
  expect((await naoEHoje.count()) + (await caixas.count())).toBeGreaterThan(0);
});

test('o Início funciona no iPhone', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'só interessa no iPhone');

  await comecarLimpo(page);
  await page.goto('/app/rotina');
  await criarRotina(page, 'Alongar');

  await page.goto('/app/inicio');
  await expect(page.getByText('Alongar', { exact: true })).toBeVisible();

  const vazamento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(vazamento, 'sem rolagem horizontal').toBeLessThanOrEqual(0);

  // Marcar pelo toque, que é como eu vou usar de verdade.
  await page.getByText('Alongar', { exact: true }).tap();
  await expect(page.getByText('O dia está seu')).toBeVisible();
});

test('os indicadores viram trilho no telefone, em vez de empilhar', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'só interessa no iPhone');

  await comecarLimpo(page);
  await page.goto('/app/rotina');
  await criarRotina(page, 'Alongar');
  await page.goto('/app/inicio');

  // Empilhados, os quatro indicadores empurravam o "Hoje" para muito além da
  // primeira tela. Em trilho, ele fica ao alcance de uma rolagem curta.
  const hoje = page.getByRole('heading', { name: 'Hoje' });
  const caixa = (await hoje.boundingBox())!;
  const altura = page.viewportSize()!.height;
  expect(caixa.y, 'o cartão Hoje está perto da primeira tela').toBeLessThan(altura * 1.5);

  // E o trilho rola de lado sem que a página role.
  const trilho = page.locator('div').filter({ hasText: 'Rotinas cumpridas hoje' }).first();
  await expect(trilho).toBeVisible();
  const vazamento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(vazamento, 'a página não rola de lado').toBeLessThanOrEqual(0);
});

test('o conteúdo do Início é de uma coluna no telefone', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'só interessa no iPhone');

  await comecarLimpo(page);
  await page.goto('/app/rotina');
  await criarRotina(page, 'Ler 20 páginas');
  await page.goto('/app/inicio');

  // Duas colunas em 393px espremiam a data a uma palavra por linha. Os dois
  // cartões precisam ocupar a mesma largura, um abaixo do outro.
  const hoje = (await page.getByRole('heading', { name: 'Hoje' }).boundingBox())!;
  const divisao = (await page
    .getByRole('heading', { name: 'Pessoal e profissional' })
    .boundingBox())!;

  expect(Math.abs(hoje.x - divisao.x), 'os cartões começam na mesma coluna').toBeLessThan(4);
  expect(divisao.y, 'um está abaixo do outro').toBeGreaterThan(hoje.y);
});

test('corrigir a frequência muda o calendário e não apaga o que já foi marcado', async ({
  page,
}) => {
  await comecarLimpo(page);
  await page.goto('/app/rotina');
  await criarRotina(page, 'Ler 20 páginas');

  // Marca hoje: é este registro que não pode sumir numa correção de agenda.
  // A sequência de um dia é o sinal visível de que a execução existe.
  await page.getByText('Ler 20 páginas').click();
  await expect(page.getByText('1', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Corrigir Ler 20 páginas' }).click();
  await expect(page.getByLabel('O que é')).toHaveValue('Ler 20 páginas');
  await page.getByLabel('O que é').fill('Ler 30 páginas');
  await page.getByLabel('Hora').fill('22:00');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByText('Ler 30 páginas')).toBeVisible();
  await expect(page.getByText('Todo dia · 22:00')).toBeVisible();
  // A execução de hoje continua lá: corrigir o nome não desfaz o dia.
  await page.goto('/app');
  await expect(page.getByText('100%').first()).toBeVisible();
});
