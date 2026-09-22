import { test, expect, type Page } from '@playwright/test';

/**
 * O que o navegador reclama quando ninguém está olhando.
 *
 * Este arquivo nasceu de uma mensagem no console, num uso de verdade:
 *
 *   Blocked aria-hidden on an element because its descendant retained focus.
 *   Element with focus: <button>  ·  Ancestor with aria-hidden: <div>
 *
 * Nenhum dos 250 testes de ponta a ponta pegou, porque nenhum olhava o foco
 * nem o console.
 *
 * **Roda em Chromium com a tela estreita, de propósito.** A gaveta só existe
 * abaixo de `--bp-desktop`, e quem reclama disso é o Chromium — no WebKit,
 * clicar num botão nem sequer lhe dá foco, então a primeira versão destes
 * testes passava com o defeito no lugar. É o navegador que reporta o problema
 * que precisa ser o navegador do teste.
 */

const TELEFONE = { width: 390, height: 844 };

async function noTelefone(page: Page, caminho: string) {
  await page.setViewportSize(TELEFONE);
  await page.goto(caminho);
}

/** O elemento com foco tem algum ancestral escondido da tecnologia assistiva? */
async function focoEscondido(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const ativo = document.activeElement;
    if (!ativo || ativo === document.body) return null;

    for (let p: Element | null = ativo; p; p = p.parentElement) {
      if (p.getAttribute('aria-hidden') === 'true') {
        return `<${ativo.tagName.toLowerCase()}> com foco dentro de um aria-hidden`;
      }
      if (p.hasAttribute('inert')) {
        return `<${ativo.tagName.toLowerCase()}> com foco dentro de um inert`;
      }
    }
    return null;
  });
}

test('fechar a gaveta não deixa o foco preso num lugar escondido', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac', 'precisa do Chromium, que é quem reclama');

  const reclamacoes: string[] = [];
  // `error` **e** `warning`: a mensagem do aria-hidden é um aviso, e a
  // primeira versão deste teste só coletava erros.
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') reclamacoes.push(m.text());
  });

  await noTelefone(page, '/app/inicio');
  await page.getByRole('button', { name: 'Abrir menu' }).click();

  // Foco pelo teclado e acionamento por Enter: é assim que o botão **retém** o
  // foco ao navegar. Um clique de mouse não retém em todo navegador, e foi por
  // isso que a primeira versão deste teste não pegava nada.
  const item = page.getByRole('button', { name: 'Tarefas' });
  await item.focus();
  await item.press('Enter');

  await expect(page.getByRole('heading', { name: 'Tarefas' })).toBeVisible();

  expect(await focoEscondido(page), 'o foco ficou dentro de algo escondido').toBeNull();
  expect(
    reclamacoes.filter((r) => r.toLowerCase().includes('aria-hidden')),
    'o navegador reclamou de aria-hidden',
  ).toEqual([]);
});

test('a gaveta fechada recusa o foco', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac', 'precisa do Chromium, que é quem reclama');

  await noTelefone(page, '/app/inicio');

  // Tenta focar à força um item que só existe dentro da gaveta fechada.
  // `aria-hidden` esconde do leitor de tela mas **não** impede o foco: quem
  // navega por teclado cairia num painel invisível. `inert` impede.
  const pegouFoco = await page.evaluate(() => {
    const alvo = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Financeiro',
    );
    if (!alvo) return 'não achei o item da gaveta';
    alvo.focus();
    return document.activeElement === alvo;
  });

  expect(pegouFoco, 'um item da gaveta fechada aceitou o foco').toBe(false);
});

test('nenhuma tela reclama no console ao abrir', async ({ page }) => {
  const telas = ['inicio', 'calendario', 'tarefas', 'criacao', 'regras', 'ajustes'];
  const reclamacoes: string[] = [];

  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') reclamacoes.push(m.text());
  });
  page.on('pageerror', (e) => reclamacoes.push(String(e)));

  for (const tela of telas) {
    await page.goto(`/app/${tela}`);
    await page.waitForTimeout(400);
  }

  // O 401 das rotas do Google sem sessão é esperado, e o navegador o registra
  // sozinho. Não é o sistema reclamando.
  //
  // O aviso do operário de serviço também não é: quem o bloqueia é o próprio
  // Playwright, de propósito — ver `serviceWorkers: 'block'` na configuração.
  const doSistema = reclamacoes.filter(
    (r) =>
      !r.includes('401') &&
      !r.includes('Failed to load resource') &&
      !r.includes('Service Worker registration blocked by Playwright'),
  );
  expect(doSistema).toEqual([]);
});
