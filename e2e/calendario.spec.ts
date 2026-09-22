import { test, expect, type Page } from '@playwright/test';

/** O Calendário lendo rotina e tarefa no tempo. */

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

/** Semeia o banco direto, para o teste falar de calendário e não de formulário. */
async function semear(page: Page) {
  const hoje = diaLocal(0);
  const banco = {
    versao: 2,
    rotinas: [
      {
        id: 'r1',
        criadoEm: 'x',
        alteradoEm: 'x',
        titulo: 'Ler 20 páginas',
        contexto: 'pessoal',
        icone: 'book-open',
        inicioEm: diaLocal(-60),
        arquivada: false,
        recorrencia: { tipo: 'diaria' },
      },
    ],
    execucoes: [],
    tarefas: [
      {
        id: 't1',
        criadoEm: 'x',
        alteradoEm: 'x',
        titulo: 'Entregar o relatório',
        contexto: 'profissional',
        prazo: hoje,
      },
    ],
  };
  // Semeia UMA vez por teste. addInitScript roda em todo carregamento de
  // página: sem a trava, navegar para o Início re-semearia o banco original e
  // apagaria o que o teste acabou de marcar.
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

test('a grade abre no mês de hoje e marca o dia', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await semear(page);
  await page.goto('/app/calendario');

  const numeroDeHoje = Number(diaLocal(0).slice(8));
  await expect(page.getByRole('button', { name: `Dia ${numeroDeHoje}` })).toBeVisible();

  // O dia de hoje começa selecionado.
  await expect(page.getByRole('heading', { name: 'Hoje' })).toBeVisible();
  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('o dia escolhido mostra rotina e tarefa daquele dia', async ({ page }) => {
  await semear(page);
  await page.goto('/app/calendario');

  await expect(page.getByText('Ler 20 páginas')).toBeVisible();
  await expect(page.getByText('Entregar o relatório')).toBeVisible();
  await expect(page.getByText('Vencem neste dia')).toBeVisible();
});

test('navegar entre meses anda e volta', async ({ page }) => {
  await semear(page);
  await page.goto('/app/calendario');

  const tituloInicial = await page.locator('h3').first().textContent();

  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await expect(page.locator('h3').first()).not.toHaveText(tituloInicial!);
  // O botão de voltar para hoje só aparece fora do mês atual.
  await expect(page.getByRole('button', { name: 'Hoje', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Hoje', exact: true }).click();
  await expect(page.locator('h3').first()).toHaveText(tituloInicial!);
});

test('só dá para marcar rotina no dia de hoje', async ({ page }) => {
  await semear(page);
  await page.goto('/app/calendario');

  // Hoje tem caixa.
  await expect(page.getByRole('checkbox')).not.toHaveCount(0);

  // Um dia anterior no mesmo mês não tem — marcar o passado registraria algo
  // que não aconteceu.
  const ontem = Number(diaLocal(-1).slice(8));
  const mesDeOntem = diaLocal(-1).slice(0, 7);
  test.skip(mesDeOntem !== diaLocal(0).slice(0, 7), 'ontem caiu em outro mês');

  await page.getByRole('button', { name: `Dia ${ontem}` }).click();
  await expect(page.getByText('Ler 20 páginas')).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
});

test('marcar do calendário grava e aparece no Início', async ({ page }) => {
  await semear(page);
  await page.goto('/app/calendario');

  await page.getByText('Ler 20 páginas').click();

  await page.goto('/app/inicio');
  // A rotina sai da fila porque foi cumprida — e o indicador conta a marca.
  // A fila não esvazia: ainda há uma tarefa vencendo hoje na semente.
  await expect(page.getByText('Ler 20 páginas')).toHaveCount(0);
  await expect(
    page.locator('div').filter({ hasText: /^1\/1Rotinas cumpridas hoje$/ }).first(),
  ).toBeVisible();
});

test('o calendário funciona no iPhone', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'só interessa no iPhone');

  await semear(page);
  await page.goto('/app/calendario');

  await expect(page.getByText('Ler 20 páginas')).toBeVisible();

  const vazamento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(vazamento, 'sem rolagem horizontal').toBeLessThanOrEqual(0);

  // Toda célula precisa ser tocável.
  const numeroDeHoje = Number(diaLocal(0).slice(8));
  const celula = (await page
    .getByRole('button', { name: `Dia ${numeroDeHoje}` })
    .boundingBox())!;
  expect(Math.round(celula.height), 'altura de toque').toBeGreaterThanOrEqual(44);
});

test('a semana mostra os sete dias com o nome de cada item', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await semear(page);
  await page.goto('/app/calendario');

  await page.getByRole('button', { name: 'Mês', exact: true }).first().click();
  await page.getByRole('option', { name: 'Semana', exact: true }).click();

  // Sete dias, e o título por extenso — não uma bolinha, como no mês.
  const dias = page.locator('button[aria-label*="dia "]');
  await expect(dias).toHaveCount(7);
  await expect(page.getByText('Entregar o relatório').first()).toBeVisible();

  // Andar uma semana muda o intervalo e faz aparecer o atalho de voltar.
  await page.getByRole('button', { name: 'Próxima semana' }).click();
  await expect(page.getByRole('button', { name: 'Hoje', exact: true })).toBeVisible();

  expect(erros).toEqual([]);
});

/** Um dia seguro para repetição mensal: o 29, 30 e 31 encostam no fim do mês. */
function diaSeguro() {
  const [ano, mes, dia] = diaLocal(0).split('-').map(Number);
  const d = Math.min(dia, 28);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    numero: d,
    mesPassado: `${mes === 1 ? ano - 1 : ano}-${pad(mes === 1 ? 12 : mes - 1)}-${pad(d)}`,
  };
}

test('o lançamento recorrente aparece no mês seguinte sem eu relançar', async ({ page }) => {
  const { numero, mesPassado } = diaSeguro();

  await page.addInitScript((data) => {
    try {
      if (sessionStorage.getItem('teste-ja-semeou')) return;
      sessionStorage.setItem('teste-ja-semeou', '1');
      localStorage.setItem(
        'msl-banco',
        JSON.stringify({
          versao: 5,
          rotinas: [],
          execucoes: [],
          tarefas: [],
          projetos: [],
          lancamentos: [
            {
              id: 'l1',
              criadoEm: 'x',
              alteradoEm: 'x',
              descricao: 'Aluguel',
              valor: 250000,
              tipo: 'saida',
              categoria: 'moradia',
              contexto: 'pessoal',
              data,
              recorrencia: { periodo: 'mensal' },
            },
          ],
        }),
      );
    } catch {
      /* janela privada */
    }
  }, mesPassado);

  await page.goto('/app/calendario');

  // Foi lançado no mês passado, uma vez só. Este mês ele está lá.
  await page.getByRole('button', { name: `Dia ${numero}`, exact: true }).click();
  await expect(page.getByText('Dinheiro')).toBeVisible();
  await expect(page.getByText('Aluguel')).toBeVisible();
  await expect(page.getByText('se repete')).toBeVisible();
});

test('a visão de dia põe tudo na ordem do relógio', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await page.addInitScript((hoje) => {
    try {
      if (sessionStorage.getItem('teste-ja-semeou')) return;
      sessionStorage.setItem('teste-ja-semeou', '1');
      const b = { criadoEm: new Date().toISOString(), alteradoEm: new Date().toISOString() };
      localStorage.setItem(
        'msl-banco',
        JSON.stringify({
          versao: 6,
          rotinas: [
            {
              ...b,
              id: 'r1',
              titulo: 'Academia',
              contexto: 'pessoal',
              icone: 'dumbbell',
              inicioEm: hoje,
              arquivada: false,
              recorrencia: { tipo: 'diaria' },
              hora: '07:00',
            },
          ],
          execucoes: [],
          tarefas: [
            { ...b, id: 't1', titulo: 'Reunião com o cliente', contexto: 'profissional', prazo: hoje, hora: '14:30' },
            { ...b, id: 't2', titulo: 'Revisar a proposta', contexto: 'profissional', prazo: hoje },
          ],
          projetos: [],
          lancamentos: [],
        }),
      );
    } catch {
      /* janela privada */
    }
  }, diaLocal(0));

  await page.goto('/app/calendario');
  await page.getByRole('button', { name: 'Mês', exact: true }).first().click();
  await page.getByRole('option', { name: 'Dia', exact: true }).click();

  await expect(page.getByText('07:00')).toBeVisible();
  await expect(page.getByText('14:30')).toBeVisible();
  // O que não tem hora vai para o fim, junto, com o rótulo dizendo isso.
  await expect(page.getByText('A qualquer hora')).toBeVisible();

  expect(erros).toEqual([]);
});

test('o filtro corta rotina, tarefa e dinheiro juntos', async ({ page }) => {
  await semear(page);
  await page.goto('/app/calendario');
  await page.getByRole('button', { name: 'Mês', exact: true }).first().click();
  await page.getByRole('option', { name: 'Dia', exact: true }).click();

  await expect(page.getByText('Ler 20 páginas')).toBeVisible();
  await expect(page.getByText('Entregar o relatório')).toBeVisible();

  // "Ler 20 páginas" é pessoal; a tarefa é profissional.
  // O seletor é localizado pelo id: "Pessoal e profissional" também é o
  // subtítulo do meu nome na barra de cima.
  await page.locator('#cal-contexto').click();
  await page.getByRole('option', { name: 'Profissional', exact: true }).click();

  await expect(page.getByText('Ler 20 páginas')).toHaveCount(0);
  await expect(page.getByText('Entregar o relatório')).toBeVisible();

  await page.getByRole('button', { name: 'Limpar filtro' }).click();
  await expect(page.getByText('Ler 20 páginas')).toBeVisible();
});

test('"o que vem" pula os dias vazios e deixa a rotina de fora por padrão', async ({ page }) => {
  await semear(page);
  await page.goto('/app/calendario');
  await page.getByRole('button', { name: 'Mês', exact: true }).first().click();
  await page.getByRole('option', { name: 'O que vem', exact: true }).click();

  // A rotina diária repetida sessenta vezes afogaria a tarefa.
  await expect(page.getByText('Ler 20 páginas')).toHaveCount(0);
  await expect(page.getByText('Entregar o relatório')).toBeVisible();

  // E nada some em silêncio: o interruptor traz a rotina de volta.
  await page.getByText('Incluir as rotinas').click();
  await expect(page.getByText('Ler 20 páginas').first()).toBeVisible();
});

test('criar no dia escolhido nasce com o prazo daquele dia', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await semear(page);
  await page.goto('/app/calendario');

  // Escolhe um dia que não é hoje: com hoje, um prazo em branco passaria no
  // teste por acidente. Dois dias à frente cai sempre no mesmo mês da grade
  // ou no seguinte, e a grade mostra os dois.
  const alvo = diaLocal(2);
  await page.getByRole('button', { name: `Dia ${Number(alvo.slice(8))}`, exact: false }).first().click();

  await page.getByRole('button', { name: 'Adicionar' }).first().click();
  await page.getByRole('button', { name: /Uma tarefa/ }).click();

  await page.getByLabel('O que precisa ser feito').fill('Comprar a passagem');
  await page.getByRole('button', { name: 'Criar tarefa' }).click();

  // Ela aparece no dia escolhido, e não em hoje.
  await expect(page.getByText('Comprar a passagem')).toBeVisible();
  await expect(page.getByText('Vencem neste dia')).toBeVisible();

  // E o prazo gravado é mesmo o do dia clicado.
  const prazo = await page.evaluate(() => {
    const b = JSON.parse(localStorage.getItem('msl-banco') ?? '{}');
    return b.tarefas?.find((t: { titulo: string }) => t.titulo === 'Comprar a passagem')?.prazo;
  });
  expect(prazo).toBe(alvo);
  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('a agenda do Google aparece no calendário, e o erro não esvazia a tela', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  await semear(page);

  // Assina a agenda e responde pela função, sem rede de verdade.
  await page.addInitScript(() => {
    const banco = JSON.parse(localStorage.getItem('msl-banco') ?? '{}');
    banco.preferencias = {
      ...banco.preferencias,
      agendaExterna: { url: 'https://calendar.google.com/calendar/ical/x/private-y/basic.ics' },
    };
    localStorage.setItem('msl-banco', JSON.stringify(banco));
    // Sessão de mentira: a função precisa de uma, e aqui ela é interceptada.
    localStorage.setItem('msl-sessao', 'token-de-teste');
  });

  const hoje = diaLocal(0);
  const comoIcal = hoje.replace(/-/g, '');
  let chamadas = 0;

  await page.route('**/api/agenda', async (rota) => {
    chamadas += 1;
    // A segunda chamada falha, para provar que o erro não apaga o que já veio.
    if (chamadas > 1) {
      await rota.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ erro: 'sem-resposta', mensagem: 'Não consegui falar com o servidor da agenda.' }),
      });
      return;
    }
    await rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        texto: [
          'BEGIN:VCALENDAR',
          'X-WR-CALNAME:Agenda de teste',
          'BEGIN:VEVENT',
          'UID:consulta-1',
          'SUMMARY:Consulta no dentista',
          'LOCATION:Rua das Flores',
          `DTSTART;TZID=America/Sao_Paulo:${comoIcal}T140000`,
          `DTEND;TZID=America/Sao_Paulo:${comoIcal}T150000`,
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n'),
        buscadoEm: new Date().toISOString(),
      }),
    });
  });

  await page.goto('/app/calendario');

  // O compromisso aparece, com o lugar, e a agenda se identifica pelo nome.
  await expect(page.getByText('Consulta no dentista')).toBeVisible();
  await expect(page.getByText('Rua das Flores')).toBeVisible();
  await expect(page.getByText('Agenda de teste')).toBeVisible();

  // E no dia, em ordem de relógio, junto do resto.
  await page.getByRole('button', { name: 'Mês', exact: true }).first().click();
  await page.getByRole('option', { name: 'Dia', exact: true }).click();
  await expect(page.getByText('Consulta no dentista')).toBeVisible();

  // Agora a busca falha: o aviso aparece e o compromisso continua na tela.
  await page.getByRole('button', { name: 'Atualizar' }).click();
  await expect(page.getByText(/Não consegui falar com o servidor da agenda/)).toBeVisible();
  await expect(page.getByText('Consulta no dentista')).toBeVisible();

  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('os insights contam o tempo, e rotular o compromisso move a fatia', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));

  const hoje = diaLocal(0);

  // Um banco só para esta conta: um rótulo, uma tarefa de duas horas com ele,
  // e uma tarefa de uma hora sem nenhum.
  await page.addInitScript(
    ({ banco }) => {
      try {
        if (!sessionStorage.getItem('teste-ja-semeou')) {
          localStorage.setItem('msl-banco', JSON.stringify(banco));
          localStorage.setItem('msl-sessao', 'token-de-teste');
          sessionStorage.setItem('teste-ja-semeou', '1');
        }
      } catch {
        /* janela privada */
      }
    },
    {
      banco: {
        versao: 2,
        preferencias: {
          agendaExterna: {
            url: 'https://calendar.google.com/calendar/ical/x/private-y/basic.ics',
          },
        },
        rotulos: [
          { id: 'rot1', criadoEm: 'x', alteradoEm: 'x', nome: 'Estudo', cor: 'var(--chart-2)', arquivado: false },
        ],
        marcacoes: [],
        tarefas: [
          {
            id: 'comRotulo',
            criadoEm: 'x',
            alteradoEm: 'x',
            titulo: 'Estudar inglês',
            contexto: 'pessoal',
            prazo: hoje,
            duracao: 120,
            rotuloId: 'rot1',
          },
          {
            id: 'semRotulo',
            criadoEm: 'x',
            alteradoEm: 'x',
            titulo: 'Revisar o contrato',
            contexto: 'profissional',
            prazo: hoje,
            duracao: 60,
          },
        ],
      },
    },
  );

  const comoIcal = hoje.replace(/-/g, '');
  await page.route('**/api/agenda', async (rota) => {
    await rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        texto: [
          'BEGIN:VCALENDAR',
          'BEGIN:VEVENT',
          'UID:reuniao-semanal',
          'SUMMARY:Reunião de equipe',
          `DTSTART;TZID=America/Sao_Paulo:${comoIcal}T100000`,
          `DTEND;TZID=America/Sao_Paulo:${comoIcal}T113000`,
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n'),
        buscadoEm: new Date().toISOString(),
      }),
    });
  });

  await page.goto('/app/calendario');
  await expect(page.getByText('Reunião de equipe')).toBeVisible();

  // Insights: 2h com rótulo, 1h de tarefa sem rótulo e 1h30 de reunião.
  await page.getByRole('button', { name: 'Mês', exact: true }).first().click();
  await page.getByRole('option', { name: 'Insights', exact: true }).click();

  await expect(page.getByText('Onde foi o seu tempo')).toBeVisible();
  await expect(page.getByText('Quanto da jornada já tem dono')).toBeVisible();
  await expect(page.getByText('Reuniões, semana a semana')).toBeVisible();
  await expect(page.getByText('O planejado contra o feito')).toBeVisible();

  // 2h + 1h + 1h30 = 4h30, e dois baldes: "Estudo" e o resto sem rótulo.
  await expect(page.getByText('4h30 em 2 rótulos')).toBeVisible();
  // "Estudo" aparece duas vezes: na repartição do tempo e no planejado
  // contra o feito. As duas leituras são do mesmo rótulo.
  await expect(page.getByText('Estudo', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Sem rótulo', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('2h · 1 compromisso')).toBeVisible();
  await expect(page.getByText('2h30 · 2 compromissos')).toBeVisible();

  // Com agenda assinada por link, a tela se recusa a separar o que se repete.
  await expect(page.getByText(/não sei quais eventos são de uma série/)).toBeVisible();

  // Agora rotulo a reunião, no dia.
  await page.getByRole('button', { name: 'Insights', exact: true }).first().click();
  await page.getByRole('option', { name: 'Dia', exact: true }).click();

  await page.getByRole('button', { name: 'Rótulo de Reunião de equipe' }).click();
  await page.getByRole('option', { name: 'Estudo' }).click();

  // O rótulo ficou na linha, e a fatia mudou de lado: 3h30 no rótulo, e o
  // "sem rótulo" agora é só a tarefa de uma hora.
  await expect(page.getByRole('button', { name: 'Rótulo de Reunião de equipe' })).toContainText(
    'Estudo',
  );

  await page.getByRole('button', { name: 'Dia', exact: true }).first().click();
  await page.getByRole('option', { name: 'Insights', exact: true }).click();
  await expect(page.getByText('3h30 · 2 compromissos')).toBeVisible();
  await expect(page.getByText('1h · 1 compromisso')).toBeVisible();

  expect(erros, 'nenhum erro de JavaScript').toEqual([]);
});

test('os insights não custam largura do título do período', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'é uma armadilha de telefone');

  // Defeito real: o seletor de período começou no cabeçalho do cartão, ao
  // lado do de visão. Dois controles sobrando, e "20 a 26 de setembro" descia
  // uma palavra por linha — do mesmo tipo do título de tarefa que já tinha
  // acontecido. Nenhum teste verde pegou; a foto pegou.
  //
  // A medida é relativa à semana de propósito. Um número fixo aqui só diria
  // quanto o título mede hoje; o que precisa valer é que a visão nova não
  // cobre o título mais do que a visão que já existia.
  await semear(page);
  await page.goto('/app/calendario');

  const tituloDoPeriodo = () =>
    page
      .getByRole('heading', { level: 3 })
      .filter({ hasText: /\d+ a \d+ de |\d+ de \w+ a / })
      .first();

  const trocarPara = async (de: string, para: string) => {
    await page.getByRole('button', { name: de, exact: true }).first().click();
    await page.getByRole('option', { name: para, exact: true }).click();
  };

  await trocarPara('Mês', 'Semana');
  await expect(tituloDoPeriodo()).toBeVisible();
  const naSemana = (await tituloDoPeriodo().boundingBox())!;

  await trocarPara('Semana', 'Insights');
  await expect(page.getByText('Onde foi o seu tempo')).toBeVisible();
  const nosInsights = (await tituloDoPeriodo().boundingBox())!;

  expect(nosInsights.width, 'o título não encolheu').toBeGreaterThanOrEqual(naSemana.width);
  expect(nosInsights.height, 'o título não desceu mais linhas').toBeLessThanOrEqual(
    naSemana.height,
  );
});
