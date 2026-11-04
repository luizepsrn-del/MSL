import { test, expect, type Page } from '@playwright/test';
import { VERSAO_ESQUEMA } from '../src/dados/esquema';

/**
 * O Estúdio, com a Meta e o Claude de mentira.
 *
 * As rotas são interceptadas: aqui se prova a tela. A montagem do pedido e a
 * leitura da resposta têm testes em Vitest.
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
  gerar?: (corpo: Record<string, unknown>) => { status?: number; json: unknown };
  referencia?: { status?: number; json: unknown };
}

async function servidorFalso(page: Page, o: Opcoes = {}) {
  const pedidos: Record<string, unknown>[] = [];
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
  await page.route('**/api/instagram-gerar', (r) => {
    const corpo = JSON.parse(r.request().postData() ?? '{}');
    pedidos.push(corpo);
    const resposta = o.gerar ? o.gerar(corpo) : { json: corpo.formato === 'reel' ? REEL : CARROSSEL };
    return r.fulfill({ status: resposta.status ?? 200, json: resposta.json });
  });
  return pedidos;
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

test('adicionar perfil e guardar post com o porquê', async ({ page }) => {
  await semear(page);
  await servidorFalso(page);
  await guardarReferencia(page);
  const minhas = page.getByRole('region', { name: 'Minhas referências' });
  await expect(minhas.getByText('gancho com número')).toBeVisible();
  await expect(minhas.getByText(/Pare de perder clientes/)).toBeVisible();
});

test('gerar carrossel com uma referência, escolher o segundo gancho e salvar', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await semear(page);
  const pedidos = await servidorFalso(page);
  await guardarReferencia(page);
  await page.getByRole('button', { name: 'Gerar', exact: true }).first().click();
  await page.getByRole('button', { name: 'Carrossel', exact: true }).click();
  await page.getByLabel('Tema', { exact: true }).fill('Como responder lead no WhatsApp');
  await page.getByRole('button', { name: /Usar referência: Pare de perder/ }).click();
  await page.getByRole('button', { name: 'Gerar post' }).click();
  await expect(page.getByText('Primeiro card')).toBeVisible();
  expect(pedidos[0]).toMatchObject({ formato: 'carrossel', tema: 'Como responder lead no WhatsApp' });
  expect((pedidos[0].referencias as { porQue: string }[])[0].porQue).toBe('gancho com número');

  await page.getByRole('button', { name: 'Gancho dois' }).click();
  await page.getByRole('button', { name: 'Salvar como peça' }).click();
  await expect(page).toHaveURL(/\/app\/criacao(\?|$)(?!.*aba=estudio)/);
  await page.getByRole('button', { name: 'Abrir Gancho dois' }).click();
  await expect(page.locator('textarea').first()).toHaveValue(/Gancho dois\n---\nPrimeiro card\n---\nSegundo card\n---\nSalve este post/);
  expect(erros).toEqual([]);
});

test('Reel salvo vira roteiro', async ({ page }) => {
  await semear(page);
  await servidorFalso(page);
  await page.goto('/app/criacao?aba=estudio');
  await page.getByLabel('Tema', { exact: true }).fill('honorários');
  await page.getByRole('button', { name: 'Gerar post' }).click();
  await expect(page.getByText('Fala um')).toBeVisible();
  await page.getByRole('button', { name: 'Salvar como peça' }).click();
  await page.getByRole('button', { name: 'Abrir Abre forte' }).click();
  await expect(page.locator('#cri-tipo-form')).toContainText('Roteiro');
  await expect(page.locator('textarea').first()).toHaveValue(/^Gancho \(0–3 s\): Abre forte/);
});

test('pedir ajuste reenvia com o anterior', async ({ page }) => {
  await semear(page);
  const pedidos = await servidorFalso(page);
  await page.goto('/app/criacao?aba=estudio');
  await page.getByLabel('Tema', { exact: true }).fill('honorários');
  await page.getByRole('button', { name: 'Gerar post' }).click();
  await expect(page.getByText('Fala um')).toBeVisible();
  await page.getByLabel('Pedir ajuste').fill('mais curto');
  await page.getByRole('button', { name: 'Ajustar' }).click();
  await expect.poll(() => pedidos.length).toBe(2);
  expect(pedidos[1]).toMatchObject({ ajuste: { pedido: 'mais curto', anterior: { ganchos: REEL.ganchos } } });
});

test('Criar com IA no "O que fazer" leva o tema para o Estúdio', async ({ page }) => {
  await semear(page);
  await servidorFalso(page);
  await page.goto('/app/criacao?aba=instagram&v=1');
  await page.getByRole('button', { name: '90 dias' }).click();
  await page.getByRole('button', { name: 'Criar com IA' }).first().click();
  await expect(page).toHaveURL(/aba=estudio/);
  await expect(page.getByLabel('Tema', { exact: true })).not.toHaveValue('');
  await expect(page).not.toHaveURL(/tema=/);
});

test('sem chave do Claude, o Estúdio avisa', async ({ page }) => {
  await semear(page);
  await servidorFalso(page, {
    gerar: () => ({ status: 503, json: { erro: 'sem-chave', mensagem: 'A geração precisa da chave do Claude na Vercel (ANTHROPIC_API_KEY).' } }),
  });
  await page.goto('/app/criacao?aba=estudio');
  await page.getByLabel('Tema', { exact: true }).fill('honorários');
  await page.getByRole('button', { name: 'Gerar post' }).click();
  await expect(page.getByText(/ANTHROPIC_API_KEY/)).toBeVisible();
  await expect(page.getByLabel('Tema', { exact: true })).toHaveValue('honorários');
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

test('Instagram desconectado: gera e avisa que não usou seus números', async ({ page }) => {
  await semear(page);
  await servidorFalso(page, { conectado: false });
  await page.goto('/app/criacao?aba=estudio');
  await expect(page.getByText(/sem os seus números do Instagram/)).toBeVisible();
  await page.getByLabel('Tema', { exact: true }).fill('honorários');
  await page.getByRole('button', { name: 'Gerar post' }).click();
  await expect(page.getByText('Fala um')).toBeVisible();
});

test('ajustar depois de trocar o formato ajusta o que está na tela', async ({ page }) => {
  await semear(page);
  const pedidos = await servidorFalso(page);
  await page.goto('/app/criacao?aba=estudio');
  await page.getByLabel('Tema', { exact: true }).fill('honorários');
  await page.getByRole('button', { name: 'Gerar post' }).click();
  await expect(page.getByText('Fala um')).toBeVisible();
  await page.getByRole('button', { name: 'Carrossel', exact: true }).click();
  await page.getByLabel('Pedir ajuste').fill('mais curto');
  await page.getByRole('button', { name: 'Ajustar' }).click();
  await expect.poll(() => pedidos.length).toBe(2);
  expect(pedidos[1]).toMatchObject({ formato: 'reel', ajuste: { pedido: 'mais curto' } });
});

test('toque duplo em salvar cria uma peça só', async ({ page }) => {
  await semear(page);
  await servidorFalso(page);
  await page.goto('/app/criacao?aba=estudio');
  await page.getByLabel('Tema', { exact: true }).fill('honorários');
  await page.getByRole('button', { name: 'Gerar post' }).click();
  await expect(page.getByText('Fala um')).toBeVisible();
  await page.getByRole('button', { name: 'Salvar como peça' }).dblclick();
  await expect(page.getByRole('button', { name: 'Abrir Abre forte' })).toHaveCount(1);
});
