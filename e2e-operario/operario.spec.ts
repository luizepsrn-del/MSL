import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * O operário de serviço, com um deploy no meio.
 *
 * Fica fora da suíte principal por dois motivos: lá o operário é bloqueado de
 * propósito (ele atrapalha a interceptação das rotas no WebKit), e este teste
 * mexe nos arquivos de `dist/` enquanto o servidor os serve — o que não pode
 * acontecer ao lado de outros testes.
 *
 * O que ele prova é o que deu errado de verdade: uma visão nova publicada que
 * simplesmente não apareceu no aparelho, e um 504 no console.
 */

/** O `<head>` do index é o que diz de qual deploy esta página veio. */
const carimboDaPagina = () => document.head.innerHTML.includes('deploy-novo');

test('o deploy novo chega ao aparelho, e pede licença antes de entrar', async ({ page }) => {
  const indexAntes = readFileSync('dist/index.html', 'utf8');
  const swAntes = readFileSync('dist/sw.js', 'utf8');

  await page.goto('/app/inicio');
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15_000 })
    .toBe(true);
  await expect(page.getByText(/versão nova/)).toHaveCount(0);
  expect(await page.evaluate(carimboDaPagina), 'começa na versão antiga').toBe(false);

  try {
    // Um deploy: o index muda, e o `sw.js` vem carimbado com a versão nova.
    // Era esta a parte que faltava — o carimbo era escrito à mão e nunca
    // mudava, então o operário novo nunca existia e a caixa velha valia para
    // sempre.
    writeFileSync(
      'dist/index.html',
      indexAntes.replace('</head>', '<meta name="deploy-novo" content="1"></head>'),
    );
    writeFileSync(
      'dist/sw.js',
      swAntes.replace(/const VERSAO = '[^']+'/, "const VERSAO = 'v2deploy'"),
    );

    // **Sem recarregar.** Uma recarga já traria o código novo sozinha — a
    // navegação busca o index na rede. O caso que o aviso existe para cobrir é
    // o outro: o app instalado na tela de início, que fica aberto e nunca
    // navega. Voltar para ele é quando o gancho pergunta se mudou algo.
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

    const aviso = page.getByText(/Tem uma versão nova/);
    await expect(aviso).toBeVisible({ timeout: 20_000 });

    // E **continua** na tela: a página não se recarrega por conta própria, nem
    // quando o operário novo assume sozinho. A primeira versão disto
    // recarregava em `controllerchange` e o aviso sumia antes de dar para ler
    // — e, num dia comum, levava junto o formulário que estava aberto.
    await page.waitForTimeout(5000);
    await expect(aviso).toBeVisible();
    expect(await page.evaluate(carimboDaPagina), 'ainda rodando o código antigo').toBe(false);

    // Esperar a recarga terminar antes de perguntar qualquer coisa à página:
    // perguntar no meio da navegação dá "Execution context was destroyed".
    const recarregou = page.waitForEvent('load');
    await page.getByRole('button', { name: 'Atualizar' }).click();
    await recarregou;

    // Agora sim: a página veio do deploy novo, o aviso não tem mais o que
    // avisar, e a caixa velha foi embora.
    await expect.poll(() => page.evaluate(carimboDaPagina), { timeout: 20_000 }).toBe(true);
    await expect(page.getByText(/Tem uma versão nova/)).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => caches.keys().then((n) => n.sort().join(','))), {
        timeout: 20_000,
      })
      .toBe('caixa-v2deploy');
  } finally {
    writeFileSync('dist/index.html', indexAntes);
    writeFileSync('dist/sw.js', swAntes);
  }
});
