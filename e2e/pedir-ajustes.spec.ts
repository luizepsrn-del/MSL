import { test, expect, type Page } from '@playwright/test';
import { VERSAO_ESQUEMA } from '../src/dados/esquema';

/** O agente e o backup — as duas últimas superfícies. */

const SEGREDO = 'ZZTOPSECRET-terapia';

async function semear(page: Page) {
  const banco = {
    versao: 4,
    rotinas: [
      {
        id: 'r1',
        criadoEm: 'x',
        alteradoEm: 'x',
        titulo: SEGREDO,
        contexto: 'pessoal',
        icone: 'heart-pulse',
        inicioEm: '2026-01-01',
        arquivada: false,
        recorrencia: { tipo: 'diaria' },
      },
    ],
    execucoes: [],
    tarefas: [],
    projetos: [],
    lancamentos: [],
  };
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

test('o que o agente não entende vira um pedido pronto', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await semear(page);
  await page.goto('/app/pedir');

  await page.getByPlaceholder('Pergunte, ou mande fazer').fill('Quero registrar leituras');
  await page.getByPlaceholder('Pergunte, ou mande fazer').press('Enter');

  // Ele não adivinha: diz que não resolve sozinho e monta o pedido.
  await expect(page.getByText('Isto eu não resolvo sozinho')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar o pedido' })).toBeVisible();

  await page.getByText('Ver o texto inteiro antes de colar').click();
  await expect(page.getByText('# Pedido para o My System Life')).toBeVisible();
  await expect(page.getByText('Quero registrar leituras').first()).toBeVisible();

  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('o nível padrão não vaza nada do meu dado', async ({ page }) => {
  await semear(page);
  await page.goto('/app/pedir');

  await page.getByPlaceholder('Pergunte, ou mande fazer').fill('um pedido qualquer');
  await page.getByPlaceholder('Pergunte, ou mande fazer').press('Enter');
  await page.getByText('Ver o texto inteiro antes de colar').click();

  // A garantia que justifica o controle existir, verificada no navegador e não
  // só na unidade: o título da minha rotina não pode estar no texto.
  const texto = await page.locator('pre').innerText();
  expect(texto).not.toContain(SEGREDO);
  expect(texto).toContain('Nenhum conteúdo meu foi incluído');
});

test('mudar o nível regenera o pedido na hora', async ({ page }) => {
  await semear(page);
  await page.goto('/app/pedir');

  await page.getByPlaceholder('Pergunte, ou mande fazer').fill('pedido');
  await page.getByPlaceholder('Pergunte, ou mande fazer').press('Enter');
  await page.getByText('Ver o texto inteiro antes de colar').click();
  expect(await page.locator('pre').innerText()).not.toContain(SEGREDO);

  // Escolher "meus dados reais" tem que refletir no texto sem gerar de novo.
  await page.getByLabel('Quanto do meu dado entra').click();
  await page.getByRole('option', { name: 'Meus dados reais' }).click();

  await expect(page.locator('pre')).toContainText(SEGREDO);
});

test('as regras do projeto vão junto no pedido', async ({ page }) => {
  await semear(page);
  await page.goto('/app/pedir');

  await page.getByPlaceholder('Pergunte, ou mande fazer').fill('x');
  await page.getByPlaceholder('Pergunte, ou mande fazer').press('Enter');
  await page.getByText('Ver o texto inteiro antes de colar').click();

  const texto = await page.locator('pre').innerText();
  expect(texto).toContain('DESIGN.md');
  expect(texto).toContain('centavos');
  expect(texto).toContain('migração aditiva');
  expect(texto).toContain('esquema.ts');
});

test('Ajustes mostra o que está guardado e oferece exportar', async ({ page }) => {
  await semear(page);
  await page.goto('/app/ajustes');

  // Era "1 rotinas": o número e o nome não concordavam, e o teste guardava
  // o erro em vez de pegá-lo.
  await expect(page.getByText('1 rotina', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exportar tudo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Importar de um arquivo' })).toBeVisible();
});

test('Ajustes avisa sobre o navegador apagar os dados', async ({ page }) => {
  await semear(page);
  await page.goto('/app/ajustes');

  // O aviso existe porque o Safari apaga armazenamento local após sete dias
  // sem uso, e isso decide se o backup é hábito ou não.
  await expect(page.getByText('O navegador pode apagar estes dados')).toBeVisible();
  await expect(page.getByText(/Adicionar à Tela de Início/)).toBeVisible();
});

test('exportar baixa um arquivo JSON legível com os meus dados', async ({ page }) => {
  await semear(page);
  await page.goto('/app/ajustes');

  const baixando = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar tudo' }).click();
  const download = await baixando;

  expect(download.suggestedFilename()).toMatch(/^my-system-life-.*\.json$/);

  const caminho = await download.path();
  const { readFileSync } = await import('node:fs');
  const conteudo = readFileSync(caminho, 'utf8');

  expect(() => JSON.parse(conteudo)).not.toThrow();
  // A versão vem do esquema, e não de um número escrito aqui: com o 4 fixo o
  // teste quebrava a cada migração, e a quebra não dizia nada sobre o backup.
  expect(JSON.parse(conteudo).versao).toBe(VERSAO_ESQUEMA);
  expect(conteudo).toContain(SEGREDO);
  // Legível: indentado, não minificado numa linha só.
  expect(conteudo.split('\n').length).toBeGreaterThan(10);
});

test('as duas telas funcionam no iPhone', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'só interessa no iPhone');

  await semear(page);
  await page.goto('/app/pedir');
  await page.getByPlaceholder('Pergunte, ou mande fazer').fill('no telefone');
  await page.getByPlaceholder('Pergunte, ou mande fazer').press('Enter');
  await expect(page.getByText('Isto eu não resolvo sozinho')).toBeVisible();

  let vazamento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(vazamento, 'pedir sem rolagem horizontal').toBeLessThanOrEqual(0);

  await page.goto('/app/ajustes');
  await expect(page.getByRole('button', { name: 'Exportar tudo' })).toBeVisible();
  vazamento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(vazamento, 'ajustes sem rolagem horizontal').toBeLessThanOrEqual(0);
});

test('o sistema cobra o backup com um número, e cala quando não há o que salvar', async ({
  page,
}) => {
  // Sem registro nenhum, cobrar backup é o tipo de aviso que ensina a ignorar
  // avisos.
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
  await page.goto('/app/ajustes');
  await expect(page.getByText('Nunca exportado')).toHaveCount(0);

  // Com dado, ele cobra.
  await page.goto('/app/tarefas');
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByLabel('O que precisa ser feito').fill('Algo que vale salvar');
  await page.getByRole('button', { name: 'Criar tarefa' }).click();

  await page.goto('/app/ajustes');
  await expect(page.getByText('Nunca exportado')).toBeVisible();

  // Exportar zera a conta, e o arquivo carrega a data em que foi feito.
  const baixando = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar agora' }).click();
  const arquivo = await baixando;

  await expect(page.getByText('Exportado hoje')).toBeVisible();

  const { readFileSync } = await import('node:fs');
  const conteudo = JSON.parse(readFileSync((await arquivo.path())!, 'utf8'));
  expect(conteudo.preferencias.ultimoBackupEm).toBeTruthy();
});

test('exportar num aparelho e importar noutro traz tudo de volta', async ({ page }) => {
  // É a única ponte entre o Mac e o telefone enquanto não há sincronização, e
  // até agora só o botão era testado — o caminho inteiro, não.
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

  await page.goto('/app/tarefas');
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByLabel('O que precisa ser feito').fill('Tarefa que precisa atravessar');
  await page.getByRole('button', { name: 'Criar tarefa' }).click();
  await expect(page.getByText('Tarefa que precisa atravessar')).toBeVisible();

  await page.goto('/app/ajustes');
  const baixando = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar tudo' }).click();
  const arquivo = await baixando;
  const caminho = (await arquivo.path())!;

  // O outro aparelho: mesmo sistema, armazenamento vazio.
  await page.evaluate(() => localStorage.removeItem('msl-banco'));
  await page.reload();
  await expect(page.getByText('Nada guardado ainda.')).toBeVisible();

  await page.setInputFiles('input[type="file"]', caminho);
  // Importar substitui tudo, então pede confirmação.
  await page.getByRole('button', { name: 'Substituir', exact: true }).click();
  await expect(page.getByText('Dados restaurados')).toBeVisible();
  await page.getByRole('button', { name: 'Entendi' }).click();

  await page.goto('/app/tarefas');
  await expect(page.getByText('Tarefa que precisa atravessar')).toBeVisible();
});

/**
 * A conta, contra um servidor de mentira.
 *
 * O servidor de desenvolvimento não tem as funções `/api` — elas só existem na
 * Vercel. Interceptar as chamadas prova a ligação da tela: o que ela manda, o
 * que faz com a resposta e o que mostra quando dá errado.
 */
async function servidorDeMentira(page: Page, respostas: Record<string, unknown>) {
  await page.route('**/api/**', async (rota) => {
    const caminho = new URL(rota.request().url()).pathname.replace('/api/', '');
    const resposta = respostas[caminho] as { status?: number; corpo?: unknown } | undefined;
    if (!resposta) return rota.fulfill({ status: 404, body: '{}' });
    await rota.fulfill({
      status: resposta.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(resposta.corpo ?? {}),
    });
  });
}

test('sem conta, a tela diz que o dado não atravessa', async ({ page }) => {
  await page.goto('/app/ajustes');
  await expect(page.getByRole('heading', { name: 'Sincronizar entre aparelhos' })).toBeVisible();
  await expect(page.getByText('Sem conta o sistema funciona igual')).toBeVisible();
  // A promessa que não pode ser feita antes da hora.
  await expect(page.getByText('o que eu criar no Mac não aparece no telefone')).toBeVisible();
});

test('entrar liga a sincronização e mostra o estado', async ({ page }) => {
  const conta = { id: 'u1', email: 'dono@exemplo.com', criadoEm: new Date().toISOString() };
  await servidorDeMentira(page, {
    entrar: { corpo: { token: 'tok', usuario: conta } },
    sincronizar: { corpo: { banco: { versao: 8, rotinas: [], execucoes: [], tarefas: [], projetos: [], lancamentos: [] } } },
  });

  await page.goto('/app/ajustes');
  await page.getByLabel('E-mail').fill('dono@exemplo.com');
  await page.getByLabel('Senha').fill('uma senha comprida');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('heading', { name: 'Sincronização' })).toBeVisible();
  await expect(page.getByText('dono@exemplo.com')).toBeVisible();
  // E o texto sobre o dado muda de tom, porque agora ele atravessa mesmo.
  await expect(page.getByText('aparece no telefone na próxima sincronização')).toBeVisible();
});

test('a senha errada aparece na tela em português', async ({ page }) => {
  await servidorDeMentira(page, {
    entrar: { status: 401, corpo: { mensagem: 'E-mail ou senha não conferem.' } },
  });

  await page.goto('/app/ajustes');
  await page.getByLabel('E-mail').fill('dono@exemplo.com');
  await page.getByLabel('Senha').fill('errada demais');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('alert')).toContainText('Entre de novo');
  // E continua deslogado, sem fingir que entrou.
  await expect(page.getByRole('heading', { name: 'Sincronizar entre aparelhos' })).toBeVisible();
});

test('dá para ver e desconectar outro aparelho', async ({ page }) => {
  const conta = { id: 'u1', email: 'dono@exemplo.com', criadoEm: new Date().toISOString() };
  const vazio = { versao: 8, rotinas: [], execucoes: [], tarefas: [], projetos: [], lancamentos: [] };
  await servidorDeMentira(page, {
    entrar: { corpo: { token: 'tok', usuario: conta } },
    sincronizar: { corpo: { banco: vazio } },
    sessoes: {
      corpo: {
        sessoes: [
          { token: 'tok', aparelho: 'Mac', criadaEm: new Date().toISOString(), atual: true },
          { token: 'outro', aparelho: 'iPhone', criadaEm: new Date().toISOString(), atual: false },
        ],
      },
    },
  });

  await page.goto('/app/ajustes');
  await page.getByLabel('E-mail').fill('dono@exemplo.com');
  await page.getByLabel('Senha').fill('uma senha comprida');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('button', { name: 'Ver os aparelhos conectados' }).click();

  // Exato: "iPhone" também aparece no aviso sobre o Safari, logo acima.
  await expect(page.getByText('iPhone', { exact: true })).toBeVisible();
  // O aparelho de agora não oferece o botão de se desconectar sozinho.
  // "Este aparelho" casa também com o texto do aviso do navegador acima.
  await expect(page.getByText('Este aparelho', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Desconectar' })).toHaveCount(1);
});
