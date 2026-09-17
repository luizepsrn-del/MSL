import { test, expect, type Page } from '@playwright/test';

/** O Início como painel: o dia, a semana e o que pede atenção. */

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
  const dias = [diaLocal(-40), diaLocal(-1), diaLocal(0), diaLocal(2)];
  await page.addInitScript((d) => {
    try {
      if (sessionStorage.getItem('teste-ja-semeou')) return;
      sessionStorage.setItem('teste-ja-semeou', '1');
      const b = { criadoEm: 'x', alteradoEm: 'x' };
      const inst = (dia: string) => {
        const [a, m, x] = dia.split('-').map(Number);
        return new Date(a, m - 1, x, 10).toISOString();
      };
      localStorage.setItem(
        'msl-banco',
        JSON.stringify({
          versao: 5,
          rotinas: [
            {
              ...b,
              id: 'r1',
              titulo: 'Ler 20 páginas',
              contexto: 'pessoal',
              icone: 'book-open',
              inicioEm: d[0],
              arquivada: false,
              recorrencia: { tipo: 'diaria' },
            },
          ],
          execucoes: [],
          tarefas: [
            { ...b, id: 't1', titulo: 'Entregar o relatório', contexto: 'profissional', prazo: d[1], projetoId: 'p1' },
            { ...b, id: 't2', titulo: 'Comprar passagem', contexto: 'pessoal', prazo: d[3] },
            { ...b, id: 't3', titulo: 'Assinar o contrato', contexto: 'profissional', concluidaEm: inst(d[2]) },
          ],
          projetos: [
            { ...b, id: 'p1', titulo: 'Proposta comercial', contexto: 'profissional' },
            { ...b, id: 'p2', titulo: 'Projeto calmo', contexto: 'pessoal', criadoEm: inst(d[2]) },
          ],
          lancamentos: [],
        }),
      );
    } catch {
      /* janela privada */
    }
  }, dias);
}

test('a semana mostra os sete dias, e explica o que cada marca quer dizer', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await semear(page);
  await page.goto('/app');

  await expect(page.getByRole('heading', { name: 'Esta semana' })).toBeVisible();
  // Sem a legenda a coluna estreita vira charada — no telefone não há como
  // parar o ponteiro em cima para ler o título.
  await expect(page.getByText('A barra é a rotina do dia')).toBeVisible();

  expect(erros).toEqual([]);
});

test('o Início cobra só o projeto que precisa, não a lista inteira', async ({ page }) => {
  await semear(page);
  await page.goto('/app');

  const cartao = page.locator('section').filter({ hasText: 'Projetos que pedem atenção' });
  await expect(cartao.getByText('Proposta comercial')).toBeVisible();
  await expect(cartao.getByText('Projeto calmo')).toHaveCount(0);
  await expect(cartao.getByText('Próxima: Entregar o relatório')).toBeVisible();
});

test('o gráfico de concluídas conta a de hoje', async ({ page }) => {
  await semear(page);
  await page.goto('/app');

  await expect(page.getByText('Uma barra por dia, nos últimos 14 · hoje: 1')).toBeVisible();
});

test('nada do painel estoura a largura da tela', async ({ page }) => {
  // O cartão "Hoje" estourava: uma trilha `1fr` tem o mínimo de conteúdo como
  // piso, e o botão do cabeçalho não encolhe. Medido, 419px numa tela de 393.
  await semear(page);
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Esta semana' })).toBeVisible();

  const estouro = await page.evaluate(() => {
    const largura = window.innerWidth;
    const trilho = [...document.querySelectorAll('div')].find((e) =>
      getComputedStyle(e).scrollSnapType.startsWith('x'),
    );
    return [...document.querySelectorAll('section')]
      .filter((s) => !trilho?.contains(s))
      .filter((s) => s.getBoundingClientRect().right > largura + 1)
      .map((s) => (s.textContent || '').slice(0, 30));
  });
  expect(estouro).toEqual([]);
});
