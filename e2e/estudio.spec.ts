import { test, expect, type Page } from '@playwright/test';
import { VERSAO_ESQUEMA } from '../src/dados/esquema';

/**
 * O Estúdio, com a Meta de mentira. O MSL não chama IA nenhuma: o prompt é
 * copiado, e a resposta da IA é colada de volta.
 *
 * A montagem do prompt e a leitura da resposta têm testes em Vitest.
 */

const dias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const DADOS = {
  perfil: { usuario: '_luizpereira_', nome: 'Luiz Eduardo', seguidores: 2243, totalDePosts: 69 },
  posts: [
    { id: 'a', legenda: 'Por aqui é assim!', formato: 'reels', publicadoEm: dias(3), link: 'https://www.instagram.com/reel/a/', curtidas: 107, comentarios: 54, alcance: 3391, salvamentos: 7, compartilhamentos: 26 },
    { id: 'b', legenda: 'Seguimos', formato: 'reels', publicadoEm: dias(5), link: 'https://www.instagram.com/reel/b/', curtidas: 83, comentarios: 4, alcance: 1487, salvamentos: 12, compartilhamentos: 5 },
    { id: 'c', legenda: 'Reel três', formato: 'reels', publicadoEm: dias(9), link: 'https://www.instagram.com/reel/c/', curtidas: 83, comentarios: 21, alcance: 1593, salvamentos: 5, compartilhamentos: 11 },
    { id: 'm', legenda: 'Assisti O Mentalista inteiro', formato: 'carrossel', publicadoEm: dias(12), link: 'https://www.instagram.com/p/m/', curtidas: 133, comentarios: 28, alcance: 2373, salvamentos: 52, compartilhamentos: 30, visitasAoPerfil: 46, seguidoresGanhos: 2 },
  ],
  lidoEm: new Date().toISOString(),
};

const PERFIL_REF = {
  usuario: 'fulano.adv',
  nome: 'Fulano',
  seguidores: 12000,
  posts: [
    { id: 'r1', legenda: 'Pare de perder clientes no WhatsApp', formato: 'carrossel', publicadoEm: dias(2), link: 'https://www.instagram.com/p/r1/', curtidas: 900, comentarios: 80 },
    { id: 'r2', legenda: 'Um Reel qualquer', formato: 'reels', publicadoEm: dias(4), link: 'https://www.instagram.com/reel/r2/', curtidas: 120, comentarios: 5 },
  ],
};

const CARROSSEL = { formato: 'carrossel', ganchos: ['Gancho um', 'Gancho dois', 'Gancho três'], cards: ['Primeiro card', 'Segundo card'], cta: 'Salve este post' };
const REEL = { formato: 'reel', ganchos: ['Abre forte', 'Abre médio', 'Abre fraco'], blocos: [{ fala: 'Fala um', tela: 'Tela um' }], cta: 'Me segue' };

async function semear(page: Page) {
  await page.addInitScript((v) => {
    try {
      if (!sessionStorage.getItem('teste-ja-semeou')) {
        localStorage.setItem('msl-banco', JSON.stringify({ versao: v }));
        localStorage.setItem('msl-sessao', 'token-de-teste');
        sessionStorage.setItem('teste-ja-semeou', '1');
      }
    } catch {
      /* janela privada */
    }
  }, VERSAO_ESQUEMA);
}

interface Opcoes {
  conectado?: boolean;
  referencia?: { status?: number; json: unknown };
}

async function servidorFalso(page: Page, o: Opcoes = {}) {
  const conectado = o.conectado ?? true;
  await page.route('**/api/instagram', (r) =>
    conectado
      ? r.fulfill({ json: DADOS })
      : r.fulfill({ status: 409, json: { erro: 'nao-conectado', mensagem: 'O Instagram não está conectado.' } }),
  );
  await page.route('**/api/instagram-estado', (r) =>
    r.fulfill({ json: { conectado, conectadoEm: null, contaId: conectado ? '1' : null } }),
  );
  await page.route('**/api/instagram-referencia?**', (r) =>
    r.fulfill(o.referencia ? { status: o.referencia.status ?? 200, json: o.referencia.json } : { json: PERFIL_REF }),
  );
  // Nenhuma chamada a IA pode sair do MSL.
  const ia: string[] = [];
  await page.route(/anthropic|openai|instagram-gerar/, (r) => {
    ia.push(r.request().url());
    return r.abort();
  });
  return ia;
}

async function guardarReferencia(page: Page) {
  await page.goto('/app/criacao?aba=estudio&vista=referencias');
  await page.getByLabel('@ do perfil').fill('@Fulano.Adv');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await expect(page.getByText('@fulano.adv').first()).toBeVisible();
  await page.getByRole('button', { name: 'Guardar Pare de perder clientes no WhatsApp' }).click();
  await page.getByLabel('Por que funciona?').fill('gancho com número');
  await page.getByRole('button', { name: 'Salvar referência' }).click();
}

const prompt = (page: Page) => page.getByLabel('Prompt', { exact: true });

async function montar(page: Page, tema: string) {
  await page.getByLabel('Tema', { exact: true }).fill(tema);
  await page.getByRole('button', { name: 'Montar prompt' }).click();
  await expect(prompt(page)).toBeVisible();
}

async function colar(page: Page, resposta: unknown) {
  await page.getByLabel('Colar a resposta').fill(`Aqui está:\n${JSON.stringify(resposta)}`);
  await page.getByRole('button', { name: 'Ler resposta' }).click();
}

test('adicionar perfil e guardar post com o porquê', async ({ page }) => {
  await semear(page);
  await servidorFalso(page);
  await guardarReferencia(page);
  const minhas = page.getByRole('region', { name: 'Minhas referências' });
  await expect(minhas.getByText('gancho com número')).toBeVisible();
  await expect(minhas.getByText(/Pare de perder clientes/)).toBeVisible();
});

test('montar o prompt com uma referência e copiar', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await semear(page);
  const ia = await servidorFalso(page);
  await guardarReferencia(page);
  await page.getByRole('button', { name: 'Gerar', exact: true }).first().click();
  await page.getByRole('button', { name: 'Carrossel', exact: true }).click();
  await page.getByRole('button', { name: /Usar referência: Pare de perder/ }).click();
  await montar(page, 'Como responder lead no WhatsApp');
  await expect(prompt(page)).toHaveValue(/Como responder lead no WhatsApp/);
  await expect(prompt(page)).toHaveValue(/gancho com número/);
  await expect(prompt(page)).toHaveValue(/@_luizpereira_/);
  await expect(prompt(page)).toHaveValue(/"cards"/);
  await page.getByRole('button', { name: 'Copiar prompt' }).click();
  await expect(page.getByText('Prompt copiado.')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Como responder lead no WhatsApp');
  expect(ia).toEqual([]);
});

test('colar a resposta, escolher o segundo gancho e salvar o carrossel', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await semear(page);
  await servidorFalso(page);
  await page.goto('/app/criacao?aba=estudio');
  await page.getByRole('button', { name: 'Carrossel', exact: true }).click();
  await montar(page, 'Como responder lead no WhatsApp');
  await colar(page, CARROSSEL);
  await expect(page.getByText('Primeiro card', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gancho dois' }).click();
  await page.getByRole('button', { name: 'Salvar como peça' }).click();
  await expect(page).toHaveURL(/\/app\/criacao(\?|$)(?!.*aba=estudio)/);
  await page.getByRole('button', { name: 'Abrir Gancho dois' }).click();
  await expect(page.locator('textarea').first()).toHaveValue(/Gancho dois\n---\nPrimeiro card\n---\nSegundo card\n---\nSalve este post/);
  expect(erros).toEqual([]);
});

test('Reel colado e salvo vira roteiro', async ({ page }) => {
  await semear(page);
  await servidorFalso(page);
  await page.goto('/app/criacao?aba=estudio');
  await montar(page, 'honorários');
  await colar(page, REEL);
  await expect(page.getByText('Fala um', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salvar como peça' }).click();
  await page.getByRole('button', { name: 'Abrir Abre forte' }).click();
  await expect(page.locator('#cri-tipo-form')).toContainText('Roteiro');
  await expect(page.locator('textarea').first()).toHaveValue(/^Gancho \(0–3 s\): Abre forte/);
});

test('resposta que não é do formato pedido avisa e não quebra', async ({ page }) => {
  await semear(page);
  await servidorFalso(page);
  await page.goto('/app/criacao?aba=estudio');
  await montar(page, 'honorários');
  await colar(page, { qualquer: 'coisa' });
  await expect(page.getByText(/Não reconheci a resposta/)).toBeVisible();
});

test('pedir ajuste monta um novo prompt com a versão anterior, no formato dela', async ({ page }) => {
  await semear(page);
  await servidorFalso(page);
  await page.goto('/app/criacao?aba=estudio');
  await montar(page, 'honorários');
  await colar(page, REEL);
  await expect(page.getByText('Fala um', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Carrossel', exact: true }).click();
  await page.getByLabel('Pedir ajuste').fill('mais curto');
  await page.getByRole('button', { name: 'Montar prompt de ajuste' }).click();
  await expect(prompt(page)).toHaveValue(/mais curto/);
  await expect(prompt(page)).toHaveValue(/Abre forte/);
  await expect(prompt(page)).toHaveValue(/"blocos"/);
});

test('Montar prompt no "O que fazer" leva o tema para o Estúdio', async ({ page }) => {
  await semear(page);
  await servidorFalso(page);
  await page.goto('/app/criacao?aba=instagram&v=1');
  await page.getByRole('button', { name: '90 dias' }).click();
  await page.getByRole('button', { name: 'Montar prompt' }).first().click();
  await expect(page).toHaveURL(/aba=estudio/);
  await expect(page.getByLabel('Tema', { exact: true })).not.toHaveValue('');
  await expect(page).not.toHaveURL(/tema=/);
});

test('perfil que não é profissional mostra o aviso', async ({ page }) => {
  await semear(page);
  await servidorFalso(page, {
    referencia: { status: 422, json: { erro: 'perfil-nao-profissional', mensagem: 'Esse perfil não é conta profissional; a Meta não deixa ler.' } },
  });
  await page.goto('/app/criacao?aba=estudio&vista=referencias');
  await page.getByLabel('@ do perfil').fill('pessoal');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await expect(page.getByText(/não é conta profissional/)).toBeVisible();
});

test('Instagram desconectado: monta o prompt e avisa que não usou seus números', async ({ page }) => {
  await semear(page);
  await servidorFalso(page, { conectado: false });
  await page.goto('/app/criacao?aba=estudio');
  await expect(page.getByText(/sem os seus números do Instagram/)).toBeVisible();
  await montar(page, 'honorários');
  await expect(prompt(page)).not.toHaveValue(/O que funciona com você/);
});

test('toque duplo em salvar cria uma peça só', async ({ page }) => {
  await semear(page);
  await servidorFalso(page);
  await page.goto('/app/criacao?aba=estudio');
  await montar(page, 'honorários');
  await colar(page, REEL);
  await expect(page.getByText('Fala um', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salvar como peça' }).dblclick();
  await expect(page.getByRole('button', { name: 'Abrir Abre forte' })).toHaveCount(1);
});
