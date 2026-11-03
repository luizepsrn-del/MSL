import { test, expect, type Page } from '@playwright/test';
import { VERSAO_ESQUEMA } from '../src/dados/esquema';

/**
 * O Instagram, com a Meta de mentira.
 *
 * As rotas `/api/instagram*` são interceptadas: o que se prova aqui é a tela.
 * OAuth, leitura e cache têm os testes deles em Vitest.
 */

function diasAtras(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

const POSTS = [
  { id: 'reel-a', legenda: 'Por aqui é assim!', formato: 'reels', publicadoEm: diasAtras(3), link: 'https://www.instagram.com/reel/a/', curtidas: 107, comentarios: 54, alcance: 3391, salvamentos: 7, compartilhamentos: 26, tempoMedioMs: 8007 },
  { id: 'reel-b', legenda: 'Seguimos', formato: 'reels', publicadoEm: diasAtras(5), link: 'https://www.instagram.com/reel/b/', curtidas: 83, comentarios: 4, alcance: 1487, salvamentos: 12, compartilhamentos: 5, tempoMedioMs: 6231 },
  { id: 'reel-c', legenda: 'Reel três', formato: 'reels', publicadoEm: diasAtras(9), link: 'https://www.instagram.com/reel/c/', curtidas: 83, comentarios: 21, alcance: 1593, salvamentos: 5, compartilhamentos: 11, tempoMedioMs: 5858 },
  { id: 'mentalista', legenda: 'Assisti O Mentalista inteiro', formato: 'carrossel', publicadoEm: diasAtras(12), link: 'https://www.instagram.com/p/m/', curtidas: 133, comentarios: 28, alcance: 2373, salvamentos: 52, compartilhamentos: 30, visitasAoPerfil: 46, seguidoresGanhos: 2 },
  { id: 'c1', legenda: 'Carrossel um', formato: 'carrossel', publicadoEm: diasAtras(40), link: 'https://www.instagram.com/p/c1/', curtidas: 20, comentarios: 2, alcance: 400, salvamentos: 2, compartilhamentos: 1, visitasAoPerfil: 4, seguidoresGanhos: 0 },
  { id: 'c2', legenda: 'Carrossel dois', formato: 'carrossel', publicadoEm: diasAtras(45), link: 'https://www.instagram.com/p/c2/', curtidas: 20, comentarios: 2, alcance: 380, salvamentos: 2, compartilhamentos: 1, visitasAoPerfil: 5, seguidoresGanhos: 0 },
  { id: 'c3', legenda: 'Carrossel três', formato: 'carrossel', publicadoEm: diasAtras(50), link: 'https://www.instagram.com/p/c3/', curtidas: 20, comentarios: 2, alcance: 420, salvamentos: 3, compartilhamentos: 1, visitasAoPerfil: 6, seguidoresGanhos: 0 },
  { id: 'c4', legenda: 'Carrossel quatro', formato: 'carrossel', publicadoEm: diasAtras(60), link: 'https://www.instagram.com/p/c4/', curtidas: 20, comentarios: 2, alcance: 390, salvamentos: 2, compartilhamentos: 2, visitasAoPerfil: 5, seguidoresGanhos: 0 },
];

const DADOS = {
  perfil: { usuario: '_luizpereira_', seguidores: 2242, totalDePosts: 69 },
  posts: POSTS,
  lidoEm: new Date().toISOString(),
};

/** Banco com uma peça publicada, para ligar a um post. Semeado uma vez por teste. */
async function semear(page: Page) {
  const agora = new Date().toISOString();
  const banco = {
    versao: VERSAO_ESQUEMA,
    pecas: [
      {
        id: 'peca-mentalista',
        criadoEm: agora,
        alteradoEm: agora,
        titulo: 'Carrossel do Mentalista',
        tipo: 'carrossel',
        estado: 'publicado',
        contexto: 'profissional',
        corpo: 'texto',
        publicadoEm: agora,
      },
    ],
  };
  await page.addInitScript((b) => {
    try {
      if (!sessionStorage.getItem('teste-ja-semeou')) {
        localStorage.setItem('msl-banco', JSON.stringify(b));
        localStorage.setItem('msl-sessao', 'token-de-teste');
        sessionStorage.setItem('teste-ja-semeou', '1');
      }
    } catch {
      /* janela privada */
    }
  }, banco);
}

type Situacao = 'pronto' | 'desconectado' | 'sem-conta' | 'token-recusado';

async function metaFalsa(page: Page, inicial: Situacao) {
  const estado = { situacao: inicial, contaRecebida: '' };
  const respostaDeErro = {
    desconectado: { status: 409, json: { erro: 'nao-conectado', mensagem: 'O Instagram não está conectado.' } },
    'sem-conta': { status: 409, json: { erro: 'sem-conta', mensagem: 'Falta informar o ID da conta.' } },
    'token-recusado': { status: 401, json: { erro: 'token-recusado', mensagem: 'A Meta deixou de aceitar a conexão.' } },
  };
  await page.route('**/api/instagram?**', (rota) =>
    estado.situacao === 'pronto' ? rota.fulfill({ json: DADOS }) : rota.fulfill(respostaDeErro[estado.situacao]),
  );
  await page.route('**/api/instagram', (rota) =>
    estado.situacao === 'pronto' ? rota.fulfill({ json: DADOS }) : rota.fulfill(respostaDeErro[estado.situacao]),
  );
  await page.route('**/api/instagram-conta', (rota) => {
    estado.contaRecebida = JSON.parse(rota.request().postData() ?? '{}').contaId ?? '';
    estado.situacao = 'pronto';
    return rota.fulfill({ json: { contaId: estado.contaRecebida } });
  });
  await page.route('**/api/instagram-conectar', (rota) =>
    rota.fulfill({ json: { url: 'https://exemplo.invalid/meta' } }),
  );
  await page.route('**/api/instagram-desconectar', (rota) => {
    estado.situacao = 'desconectado';
    return rota.fulfill({ json: { conectado: false } });
  });
  return estado;
}

test.describe('Ajustes', () => {
  test('desconectado oferece Conectar', async ({ page }) => {
    await semear(page);
    await metaFalsa(page, 'desconectado');
    await page.goto('/app/ajustes');
    const cartao = page.locator('section, article, div').filter({ hasText: /^Instagram/ }).first();
    await expect(page.getByText('Ligue o seu Instagram')).toBeVisible();
    await expect(cartao.getByRole('button', { name: 'Conectar', exact: true }).first()).toBeVisible();
  });

  test('sem conta pede o ID e manda para o servidor', async ({ page }) => {
    await semear(page);
    const meta = await metaFalsa(page, 'sem-conta');
    await page.goto('/app/ajustes');
    await page.getByLabel('ID da conta do Instagram').fill('17841400224855713');
    await page.getByRole('button', { name: 'Salvar' }).last().click();
    await expect.poll(() => meta.contaRecebida).toBe('17841400224855713');
    await expect(page.getByText('@_luizpereira_ · 2.242 seguidores')).toBeVisible();
  });

  test('conectado mostra a conta', async ({ page }) => {
    await semear(page);
    await metaFalsa(page, 'pronto');
    await page.goto('/app/ajustes');
    await expect(page.getByText('@_luizpereira_ · 2.242 seguidores')).toBeVisible();
  });
});

test.describe('Criação · Instagram', () => {
  test('mostra a conta, os números e o que fazer', async ({ page }) => {
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    await semear(page);
    await metaFalsa(page, 'pronto');
    await page.goto('/app/criacao?aba=instagram');
    await expect(page.getByText('@_luizpereira_', { exact: true })).toBeVisible();
    await expect(page.getByText('Alcance médio por post')).toBeVisible();
    await expect(page.getByText('O que fazer')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Criar semente' }).first()).toBeVisible();
    await expect(page.getByText('8 no período')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('NaN');
    expect(erros).toEqual([]);
  });

  test('30 dias deixa de fora os posts mais antigos', async ({ page }) => {
    await semear(page);
    await metaFalsa(page, 'pronto');
    await page.goto('/app/criacao?aba=instagram');
    await page.locator('#ig-periodo').click();
    await page.getByRole('option', { name: 'Últimos 30 dias' }).click();
    await expect(page.getByText('4 no período')).toBeVisible();
  });

  test('criar semente leva a recomendação para a aba Peças', async ({ page }) => {
    await semear(page);
    await metaFalsa(page, 'pronto');
    await page.goto('/app/criacao?aba=instagram');
    await page.getByRole('button', { name: 'Criar semente' }).first().click();
    await expect(page.getByText('Semente criada na aba Peças.')).toBeVisible();
    await page.getByRole('button', { name: 'Peças' }).click();
    await expect(page.getByText('2 de 2')).toBeVisible();
  });

  test('ligar uma peça publicada ao post mostra o alcance na linha da peça', async ({ page }) => {
    await semear(page);
    await metaFalsa(page, 'pronto');
    await page.goto('/app/criacao?aba=instagram');
    await page.locator('#ig-ordem').click();
    await page.getByRole('option', { name: 'Mais salvos e compartilhados' }).click();
    await page.getByRole('button', { name: 'Ligar a uma peça' }).first().click();
    await page.getByRole('button', { name: 'Carrossel do Mentalista' }).click();
    await expect(page.getByText('Peça ligada ao post.')).toBeVisible();
    await page.getByRole('button', { name: 'Peças' }).click();
    await expect(page.getByText('Instagram: 2.373 de alcance')).toBeVisible();
  });

  test('token recusado pede para conectar de novo', async ({ page }) => {
    await semear(page);
    await metaFalsa(page, 'token-recusado');
    await page.goto('/app/criacao?aba=instagram');
    await expect(page.getByText('A Meta deixou de aceitar a conexão').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Conectar de novo' })).toBeVisible();
  });

  test('sem conexão aponta para Ajustes', async ({ page }) => {
    await semear(page);
    await metaFalsa(page, 'desconectado');
    await page.goto('/app/criacao?aba=instagram');
    await expect(page.getByText('Instagram não conectado')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ir para Ajustes' })).toBeVisible();
  });
});
