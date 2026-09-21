import { test, expect, type Page } from '@playwright/test';

/**
 * O Google Agenda nos dois sentidos, com o servidor de mentira.
 *
 * As rotas `/api/google-*` são interceptadas: o que se prova aqui é a tela — o
 * que ela manda, o que ela faz com a resposta, e o que ela mostra. A lógica de
 * OAuth e de reconciliação tem os testes dela em Vitest.
 */

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

/** Limpa UMA vez por teste; `addInitScript` roda em todo carregamento. */
async function comecarLimpo(page: Page) {
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('teste-ja-limpou')) {
        localStorage.removeItem('msl-banco');
        localStorage.removeItem('msl-google-eventos');
        localStorage.setItem('msl-sessao', 'token-de-teste');
        sessionStorage.setItem('teste-ja-limpou', '1');
      }
    } catch {
      /* janela privada */
    }
  });
}

interface Estado {
  conectado: boolean;
  /** o que o servidor devolve como eventos do Google */
  deles: unknown[];
  /** o que o servidor manda o cliente aplicar */
  puxar: unknown[];
  /** o que o cliente mandou espelhar, na última chamada */
  recebidos: { chave: string; titulo: string; dia: string; hora?: string }[];
  chamadas: number;
}

/** Intercepta as quatro rotas e guarda o que passou por elas. */
async function servidorFalso(page: Page, inicial: Partial<Estado> = {}) {
  const estado: Estado = {
    conectado: true,
    deles: [],
    puxar: [],
    recebidos: [],
    chamadas: 0,
    ...inicial,
  };

  await page.route('**/api/google-estado', (rota) =>
    rota.fulfill({ json: { conectado: estado.conectado, conectadoEm: null } }),
  );

  await page.route('**/api/google-conectar', (rota) =>
    rota.fulfill({ json: { url: 'https://exemplo.invalid/consentimento' } }),
  );

  await page.route('**/api/google-desconectar', (rota) => {
    estado.conectado = false;
    return rota.fulfill({ json: { conectado: false } });
  });

  await page.route('**/api/google-sincronizar', (rota) => {
    estado.chamadas += 1;
    const corpo = JSON.parse(rota.request().postData() ?? '{}');
    estado.recebidos = corpo.itens ?? [];
    return rota.fulfill({
      json: {
        conectado: estado.conectado,
        deles: estado.deles,
        puxar: estado.puxar,
        escritos: { criados: estado.recebidos.length, atualizados: 0, apagados: 0 },
        faltou: 0,
      },
    });
  });

  return estado;
}

async function criarTarefa(page: Page, titulo: string, prazo: string, hora?: string) {
  await page.goto('/app/tarefas');
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByLabel('O que precisa ser feito').fill(titulo);
  await page.getByLabel('Prazo').fill(prazo);
  if (hora) await page.getByLabel('Hora').fill(hora);
  await page.getByRole('button', { name: 'Criar tarefa' }).click();
}

test('a tarefa com prazo é mandada para o Google', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await comecarLimpo(page);
  const estado = await servidorFalso(page);

  await criarTarefa(page, 'Entregar a proposta', diaLocal(2), '14:00');
  await page.goto('/app/calendario');

  await expect.poll(() => estado.recebidos.map((i) => i.chave)).toEqual([
    expect.stringMatching(/^tarefa:/),
  ]);
  expect(estado.recebidos[0]).toMatchObject({
    titulo: 'Entregar a proposta',
    dia: diaLocal(2),
    hora: '14:00',
  });
  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('a tarefa concluída deixa de ser mandada, e some de lá', async ({ page }) => {
  // Ela deixa de ser espelhada e o plano apaga o espelho sem dono. Uma tarefa
  // feita na agenda é ruído.
  await comecarLimpo(page);
  const estado = await servidorFalso(page);

  await criarTarefa(page, 'Ligar para o cliente', diaLocal(1));
  await page.goto('/app/calendario');
  await expect.poll(() => estado.recebidos.length).toBe(1);

  await page.goto('/app/tarefas');
  await page.getByText('Ligar para o cliente', { exact: true }).click();

  await page.goto('/app/calendario');
  await page.getByRole('button', { name: 'Sincronizar' }).click();
  await expect.poll(() => estado.recebidos.length).toBe(0);
});

test('o evento do Google aparece no calendário', async ({ page }) => {
  await comecarLimpo(page);
  await servidorFalso(page, {
    deles: [
      {
        id: 'g1',
        summary: 'Consulta no dentista',
        location: 'Rua das Flores',
        start: { dateTime: `${diaLocal(0)}T17:00:00Z` },
        end: { dateTime: `${diaLocal(0)}T18:00:00Z` },
      },
    ],
  });

  await page.goto('/app/calendario');
  await expect(page.getByText('Consulta no dentista')).toBeVisible();
  await expect(page.getByText('Da agenda do Google')).toBeVisible();
  await expect(page.getByText('Google Agenda, nos dois sentidos')).toBeVisible();
});

test('o que mudou no Google entra no MSL', async ({ page }) => {
  await comecarLimpo(page);
  await servidorFalso(page);

  await criarTarefa(page, 'Revisar o texto', diaLocal(1));
  const id = await page.evaluate(() => {
    const b = JSON.parse(localStorage.getItem('msl-banco') ?? '{}');
    return (b.tarefas as { id: string }[])[0].id;
  });

  // Agora o servidor manda a tarefa para outro dia, como se ela tivesse sido
  // arrastada no Google.
  await page.unroute('**/api/google-sincronizar');
  await page.route('**/api/google-sincronizar', (rota) =>
    rota.fulfill({
      json: {
        conectado: true,
        deles: [],
        puxar: [{ chave: `tarefa:${id}`, dia: diaLocal(5) }],
        escritos: { criados: 0, atualizados: 0, apagados: 0 },
        faltou: 0,
      },
    }),
  );

  await page.goto('/app/calendario');

  await expect
    .poll(async () =>
      page.evaluate(
        () => (JSON.parse(localStorage.getItem('msl-banco') ?? '{}').tarefas as { prazo?: string }[])[0].prazo,
      ),
    )
    .toBe(diaLocal(5));
});

test('desconectar tira a barra e os eventos', async ({ page }) => {
  await comecarLimpo(page);
  await servidorFalso(page, {
    deles: [{ id: 'g1', summary: 'Reunião do Google', start: { date: diaLocal(0) }, end: { date: diaLocal(1) } }],
  });

  await page.goto('/app/calendario');
  await expect(page.getByText('Reunião do Google')).toBeVisible();

  await page.goto('/app/ajustes');
  await page.getByRole('button', { name: 'Desconectar' }).click();

  await page.goto('/app/calendario');
  await expect(page.getByText('Reunião do Google')).toHaveCount(0);
  await expect(page.getByText('Google Agenda, nos dois sentidos')).toHaveCount(0);
});

test('sem conexão nenhuma, nada disso aparece', async ({ page }) => {
  await comecarLimpo(page);
  await servidorFalso(page, { conectado: false });

  await page.goto('/app/calendario');
  await expect(page.getByText('Google Agenda, nos dois sentidos')).toHaveCount(0);

  await page.goto('/app/ajustes');
  await expect(page.getByRole('button', { name: 'Conectar' })).toBeVisible();
});
