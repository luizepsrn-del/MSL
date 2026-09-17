import { test } from '@playwright/test';

const DIR = '/private/tmp/claude-501/-Users-luizeduardo-Downloads-design-system-export/0e29ee80-091c-47e5-a704-fa1edfbc3ab4/scratchpad/diag';

function semente() {
  try {
    if (sessionStorage.getItem('semeado-diag')) return;
    sessionStorage.setItem('semeado-diag', '1');
    const fmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Sao_Paulo' });
    const [A, M, D] = fmt.format(new Date()).split('-').map(Number);
    const d = (n: number) => new Date(Date.UTC(A, M - 1, D + n)).toISOString().slice(0, 10);
    const inst = (n: number, h = 10) => new Date(A, M - 1, D + n, h).toISOString();
    const b = (n = 0) => ({ criadoEm: inst(n), alteradoEm: inst(n) });

    const execucoes: unknown[] = [];
    let e = 0;
    for (let i = -20; i <= 0; i++) {
      if (i % 3 !== 0) execucoes.push({ ...b(i), id: `e${e++}`, rotinaId: 'r1', dia: d(i) });
      if (i % 2 === 0) execucoes.push({ ...b(i), id: `e${e++}`, rotinaId: 'r2', dia: d(i) });
    }

    const tarefas: unknown[] = [
      { ...b(-10), id: 't1', titulo: 'Entregar o relatório do trimestre', contexto: 'profissional', prazo: d(-3), projetoId: 'p1' },
      { ...b(-5), id: 't2', titulo: 'Pagar o IPVA', contexto: 'pessoal', prazo: d(0), hora: '09:00' },
      { ...b(-5), id: 't3', titulo: 'Reunião com o cliente', contexto: 'profissional', prazo: d(0), hora: '14:30', projetoId: 'p1', estado: 'fazendo' },
      { ...b(-4), id: 't4', titulo: 'Revisar a proposta comercial', contexto: 'profissional', prazo: d(2), projetoId: 'p1' },
      { ...b(-3), id: 't5', titulo: 'Comprar passagem', contexto: 'pessoal', prazo: d(6) },
      { ...b(-2), id: 't6', titulo: 'Renovar o seguro do carro', contexto: 'pessoal', prazo: d(14) },
      { ...b(-30), id: 't7', titulo: 'Achar um professor de inglês', contexto: 'pessoal', projetoId: 'p2' },
    ];
    for (let i = 1; i <= 12; i++) {
      tarefas.push({ ...b(-i), id: `f${i}`, titulo: `Tarefa concluída ${i}`, contexto: i % 2 ? 'pessoal' : 'profissional', concluidaEm: inst(-((i % 9) + 1)), projetoId: i % 3 === 0 ? 'p1' : undefined });
    }

    const lancamentos: unknown[] = [
      { ...b(-120), id: 'l1', descricao: 'Salário', valor: 950000, tipo: 'entrada', categoria: 'receita', contexto: 'profissional', data: d(-120), recorrencia: { periodo: 'mensal' } },
      { ...b(-120), id: 'l2', descricao: 'Aluguel', valor: 250000, tipo: 'saida', categoria: 'moradia', contexto: 'pessoal', data: d(-118), recorrencia: { periodo: 'mensal' } },
      { ...b(-120), id: 'l3', descricao: 'Internet', valor: 12990, tipo: 'saida', categoria: 'servicos', contexto: 'pessoal', data: d(-117), recorrencia: { periodo: 'mensal' } },
      { ...b(-8), id: 'l4', descricao: 'Mercado', valor: 43250, tipo: 'saida', categoria: 'alimentacao', contexto: 'pessoal', data: d(-8) },
      { ...b(-6), id: 'l5', descricao: 'Uber', valor: 8740, tipo: 'saida', categoria: 'transporte', contexto: 'profissional', data: d(-6) },
      { ...b(-4), id: 'l6', descricao: 'Farmácia', valor: 15620, tipo: 'saida', categoria: 'saude', contexto: 'pessoal', data: d(-4) },
      { ...b(-2), id: 'l7', descricao: 'Cinema', valor: 9000, tipo: 'saida', categoria: 'lazer', contexto: 'pessoal', data: d(-2) },
      { ...b(-1), id: 'l8', descricao: 'Freela', valor: 180000, tipo: 'entrada', categoria: 'receita', contexto: 'profissional', data: d(-1) },
    ];

    localStorage.setItem('msl-banco', JSON.stringify({
      versao: 6,
      rotinas: [
        { ...b(-60), id: 'r1', titulo: 'Ler 20 páginas', contexto: 'pessoal', icone: 'book-open', inicioEm: d(-60), arquivada: false, recorrencia: { tipo: 'diaria' }, hora: '22:00' },
        { ...b(-60), id: 'r2', titulo: 'Academia', contexto: 'pessoal', icone: 'dumbbell', inicioEm: d(-60), arquivada: false, recorrencia: { tipo: 'semanal', dias: [1, 3, 5] }, hora: '07:00' },
        { ...b(-60), id: 'r3', titulo: 'Revisar a agenda', contexto: 'profissional', icone: 'calendar-check', inicioEm: d(-60), arquivada: false, recorrencia: { tipo: 'diaria' }, hora: '09:00' },
      ],
      execucoes,
      tarefas,
      projetos: [
        { ...b(-40), id: 'p1', titulo: 'Proposta comercial', contexto: 'profissional', descricao: 'Fechar o contrato do trimestre', prazo: d(10) },
        { ...b(-90), id: 'p2', titulo: 'Curso de inglês', contexto: 'pessoal' },
      ],
      lancamentos,
    }));
  } catch { /* */ }
}


const TELAS: [string, string][] = [
  ['inicio', '/app'],
  ['rotina', '/app/rotina'],
  ['tarefas', '/app/tarefas'],
  ['calendario', '/app/calendario'],
  ['projetos', '/app/projetos'],
  ['financeiro', '/app/financeiro'],
  ['agente', '/app/pedir'],
  ['ajustes', '/app/ajustes'],
];

for (const [nome, rota] of TELAS) {
  test(`tira ${nome}`, async ({ page }, info) => {
    await page.addInitScript(semente);
    await page.goto(rota);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/${nome}-${info.project.name}.png` });
    // e a parte de baixo, rolando o container que realmente rola
    await page.evaluate(() => {
      const alvo = [...document.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 50 && getComputedStyle(e).overflowY !== 'visible');
      if (alvo) alvo.scrollTop = alvo.scrollHeight;
      else window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${DIR}/${nome}-baixo-${info.project.name}.png` });
  });
}
