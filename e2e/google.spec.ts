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
  await expect(page.getByRole('button', { name: 'Conectar', exact: true })).toBeVisible();
});

test('acesso expirado: o cartão deixa de dizer Conectada e oferece Conectar', async ({ page }) => {
  await comecarLimpo(page);
  // O servidor ainda guarda a credencial, então `google-estado` diz conectado;
  // quem sabe que ela morreu é a chamada ao Google.
  await servidorFalso(page);
  await page.route('**/api/google-sincronizar', (rota) =>
    rota.fulfill({
      status: 401,
      json: {
        erro: 'google',
        mensagem: 'o Google recusou o acesso. Reconecte a agenda em Ajustes.',
      },
    }),
  );

  await page.goto('/app/ajustes');
  await expect(page.getByText('Reconecte a agenda em Ajustes')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Conectar', exact: true })).toBeVisible();
  await expect(page.getByText('Não conectada')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Desconectar' })).toHaveCount(0);
  // Quem já configurou tudo não é mandado recomeçar do zero.
  await expect(page.getByText('continua valendo')).toBeVisible();
  await expect(page.getByText('vinte e cinco minutos')).toHaveCount(0);
});

test('acesso expirado: os eventos guardados saem do aparelho junto', async ({ page }) => {
  await comecarLimpo(page);
  await servidorFalso(page, {
    deles: [{ id: 'g1', summary: 'Reunião do Google', start: { date: diaLocal(0) }, end: { date: diaLocal(1) } }],
  });

  await page.goto('/app/calendario');
  await expect(page.getByText('Reunião do Google')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('msl-google-eventos'))).not.toBeNull();

  // O acesso morre depois: o cache fresco não dispara sincronização sozinho,
  // então é o botão que descobre.
  await page.route('**/api/google-sincronizar', (rota) =>
    rota.fulfill({ status: 401, json: { erro: 'google', mensagem: 'o Google recusou o acesso. Reconecte a agenda em Ajustes.' } }),
  );
  await page.goto('/app/ajustes');
  await page.getByRole('button', { name: 'Sincronizar agora' }).click();
  // exact: "Desconectar" também contém "Conectar" e passaria antes da hora.
  await expect(page.getByRole('button', { name: 'Conectar', exact: true })).toBeVisible();

  // Sem isso o calendário mostraria, ao reabrir, uma lista que ninguém mais atualiza.
  expect(await page.evaluate(() => localStorage.getItem('msl-google-eventos'))).toBeNull();
});

test('o 403 do Google (limite, API desligada) não derruba a conexão', async ({ page }) => {
  await comecarLimpo(page);
  await servidorFalso(page);
  await page.route('**/api/google-sincronizar', (rota) =>
    rota.fulfill({
      status: 403,
      json: {
        erro: 'google',
        mensagem:
          'o Google recusou o pedido. Costuma ser limite de pedidos (espere uns minutos) ou a ' +
          'Calendar API desligada no projeto do Google Cloud. Reconectar não resolve.',
      },
    }),
  );

  await page.goto('/app/ajustes');
  await expect(page.getByText('Reconectar não resolve')).toBeVisible();
  // Mandar reconectar seria falso: o cartão segue conectado, com o erro à vista.
  await expect(page.getByText('Reconecte a agenda em Ajustes')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Desconectar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Conectar', exact: true })).toHaveCount(0);
});

test('sessão do MSL vencida não finge que o Google caiu', async ({ page }) => {
  await comecarLimpo(page);
  await servidorFalso(page);
  await page.route('**/api/google-sincronizar', (rota) =>
    rota.fulfill({ status: 401, json: { erro: 'sessao-invalida', mensagem: 'Entre de novo.' } }),
  );

  await page.goto('/app/ajustes');
  await expect(page.getByText('Entre de novo.')).toBeVisible();
  // Reconectar o Google não resolveria: o cartão segue como estava.
  await expect(page.getByRole('button', { name: 'Desconectar' })).toBeVisible();
});

/* ── O agente mexe no evento, e diz a verdade quando o Google não deixa ──── */

async function pedirParaApagarAReuniao(page: Page) {
  await comecarLimpo(page);
  const estado = await servidorFalso(page, {
    deles: [
      {
        id: 'g1',
        summary: 'Reunião de equipe',
        start: { date: diaLocal(0) },
        end: { date: diaLocal(1) },
        organizer: { self: true },
      },
    ],
  });
  await page.goto('/app/pedir');
  await expect.poll(() => estado.chamadas).toBeGreaterThan(0);

  // O cache de eventos chega logo depois da resposta: repete a pergunta até o
  // agente enxergar o evento, em vez de dormir um tempo que alguém chutou.
  const botao = page.getByRole('button', { name: 'Apagar no Google' });
  await expect(async () => {
    const campo = page.getByPlaceholder('Pergunte, ou mande fazer');
    await campo.fill('cancela a reunião de equipe');
    await campo.press('Enter');
    await expect(botao).toBeVisible({ timeout: 500 });
  }).toPass();

  return { botao };
}

test('o Google recusa: a tela não diz "Feito" e diz que nada mudou', async ({ page }) => {
  const { botao } = await pedirParaApagarAReuniao(page);
  await page.route('**/api/google-evento', (rota) =>
    rota.fulfill({ json: { feito: false, motivo: 'sem-permissao' } }),
  );

  await botao.click();

  await expect(page.getByText('Não deu certo')).toBeVisible();
  await expect(page.getByText('Nada mudou.')).toBeVisible();
  await expect(page.getByText('Feito', { exact: true })).toHaveCount(0);
});

test('o Google fora do ar: a tela não diz "Feito" nem que nada mudou', async ({ page }) => {
  const { botao } = await pedirParaApagarAReuniao(page);
  await page.route('**/api/google-evento', (rota) => rota.abort());

  await botao.click();

  await expect(page.getByText('não sei se a mudança chegou a valer')).toBeVisible();
  await expect(page.getByText('Feito', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Nada mudou.')).toHaveCount(0);
});

test('o Google aceita: manda o id certo e só então diz "Feito"', async ({ page }) => {
  const { botao } = await pedirParaApagarAReuniao(page);
  const corpos: unknown[] = [];
  await page.route('**/api/google-evento', (rota) => {
    corpos.push(JSON.parse(rota.request().postData() ?? '{}'));
    return rota.fulfill({ json: { feito: true } });
  });

  await botao.click();

  await expect(page.getByText('Feito', { exact: true })).toBeVisible();
  expect(corpos).toEqual([{ acao: 'apagar', uid: 'g1' }]);
});

test('toque duplo em "Apagar no Google" manda um pedido só', async ({ page }) => {
  const { botao } = await pedirParaApagarAReuniao(page);
  const corpos: unknown[] = [];
  await page.route('**/api/google-evento', async (rota) => {
    corpos.push(JSON.parse(rota.request().postData() ?? '{}'));
    // Resposta devagar: o segundo toque tem de cair com o primeiro ainda no ar.
    await new Promise((resolver) => setTimeout(resolver, 400));
    return rota.fulfill({ json: { feito: true } });
  });

  await botao.dblclick();

  await expect(page.getByText('Feito', { exact: true })).toBeVisible();
  expect(corpos).toHaveLength(1);
});

/* ── A lista em memória acompanha o que o Google disse ───────────────────── */

const REUNIAO = (dia: string, proximo: string) => ({
  id: 'g1',
  summary: 'Reunião de equipe',
  start: { date: dia },
  end: { date: proximo },
  organizer: { self: true },
});

async function perguntarDeNovo(page: Page) {
  const campo = page.getByPlaceholder('Pergunte, ou mande fazer');
  await campo.fill('cancela a reunião de equipe');
  await campo.press('Enter');
}

test('depois de apagar, se a rebusca falha, o agente não oferece apagar de novo', async ({ page }) => {
  // Limpar o cache do disco não basta: quem responde é a lista em memória. Sem
  // esvaziá-la, uma rebusca que falha deixa o agente listando o que acabou de
  // apagar.
  const { botao } = await pedirParaApagarAReuniao(page);
  let rebuscas = 0;
  await page.unroute('**/api/google-sincronizar');
  await page.route('**/api/google-sincronizar', (rota) => {
    rebuscas += 1;
    return rota.abort();
  });
  await page.route('**/api/google-evento', (rota) => rota.fulfill({ json: { feito: true } }));

  await botao.click();
  await expect(page.getByText('Feito', { exact: true })).toBeVisible();
  await expect.poll(() => rebuscas).toBe(1);

  await perguntarDeNovo(page);
  await expect(page.getByText('Não achei essa tarefa')).toBeVisible();
  await expect(botao).toHaveCount(0);
});

/**
 * Uma busca já no ar quando se apaga: o cache de antes está velho no disco, a
 * busca vai voltar com o evento ainda vivo, e a resposta dela não pode valer.
 */
async function comBuscaNoAr(page: Page) {
  await comecarLimpo(page);
  const dia = diaLocal(0);
  await page.addInitScript(
    ([d, p]) => {
      try {
        // Velho o bastante para a tela rebuscar ao abrir.
        localStorage.setItem(
          'msl-google-eventos',
          JSON.stringify({
            eventos: [
              {
                id: 'g1',
                summary: 'Reunião de equipe',
                start: { date: d },
                end: { date: p },
                organizer: { self: true },
              },
            ],
            em: '2000-01-01T00:00:00.000Z',
          }),
        );
      } catch {
        /* janela privada */
      }
    },
    [dia, diaLocal(1)],
  );
  const estado = await servidorFalso(page);
  await page.unroute('**/api/google-sincronizar');

  const buscas: { liberar: (corpo: unknown) => void; abortar: boolean }[] = [];
  await page.route('**/api/google-sincronizar', (rota) => {
    if (buscas.length === 0) {
      // A primeira fica segurada até o teste soltá-la.
      return new Promise<void>((resolver) => {
        buscas.push({
          abortar: false,
          liberar: (corpo) => {
            void rota.fulfill({ json: corpo }).then(resolver);
          },
        });
      });
    }
    buscas.push({ abortar: true, liberar: () => {} });
    return rota.abort();
  });

  await page.goto('/app/pedir');
  await expect.poll(() => buscas.length).toBe(1);

  const botao = page.getByRole('button', { name: 'Apagar no Google' });
  await expect(async () => {
    await perguntarDeNovo(page);
    await expect(botao).toBeVisible({ timeout: 500 });
  }).toPass();

  const corpoAntigo = {
    conectado: true,
    deles: [REUNIAO(dia, diaLocal(1))],
    puxar: [],
    escritos: { criados: 0, atualizados: 0, apagados: 0 },
    faltou: 0,
  };
  return { botao, buscas, estado, corpoAntigo };
}

test('apagar com uma busca no ar: a resposta antiga é descartada e outra busca roda', async ({ page }) => {
  const { botao, buscas, corpoAntigo } = await comBuscaNoAr(page);
  await page.route('**/api/google-evento', (rota) => rota.fulfill({ json: { feito: true } }));

  await botao.click();
  await expect(page.getByText('Feito', { exact: true })).toBeVisible();

  // A busca de antes volta com o evento ainda vivo.
  buscas[0].liberar(corpoAntigo);

  // Uma segunda busca roda quando a primeira termina (a que falha, aqui).
  await expect.poll(() => buscas.length).toBe(2);

  await perguntarDeNovo(page);
  await expect(page.getByText('Não achei essa tarefa')).toBeVisible();
  await expect(botao).toHaveCount(0);
});

test('perder o acesso com uma busca no ar: a resposta antiga não reconecta nem traz a lista de volta', async ({ page }) => {
  const { botao, buscas, corpoAntigo } = await comBuscaNoAr(page);
  await page.route('**/api/google-evento', (rota) =>
    rota.fulfill({ json: { feito: false, motivo: 'desconectado' } }),
  );

  await botao.click();
  await expect(page.getByText('A conexão com o Google caiu')).toBeVisible();

  buscas[0].liberar(corpoAntigo);
  // Sem credencial não há por que buscar de novo.
  await expect.poll(() => buscas.length).toBe(1);

  await perguntarDeNovo(page);
  await expect(page.getByText('Não achei essa tarefa')).toBeVisible();
  await expect(botao).toHaveCount(0);
});
