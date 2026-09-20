import { describe, it, expect } from 'vitest';
import { conferirEndereco, rotaAgenda, TETO_DE_BYTES, DOMINIOS_DE_AGENDA } from './agenda';
import { ArmazemMemoria } from './armazem';
import { cadastrar } from './contas';

const AMBIENTE = { EMAILS_PERMITIDOS: 'eu@exemplo.com' };

async function comSessao() {
  const armazem = new ArmazemMemoria();
  const entrada = await cadastrar(armazem, { email: 'eu@exemplo.com', senha: 'uma senha longa' }, AMBIENTE);
  if (!entrada.ok) throw new Error('não deu para cadastrar no teste');
  return { armazem, token: entrada.valor.token };
}

function pedir(token: string | undefined, corpo: unknown): Request {
  return new Request('https://exemplo.com/api/agenda', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(corpo),
  });
}

/** Um `fetch` de mentira que devolve o que o teste mandar. */
function falsoFetch(
  resposta: { corpo?: string; estado?: number; url?: string; erro?: boolean },
  visitados: string[] = [],
): typeof fetch {
  return (async (entrada: string | URL | Request) => {
    visitados.push(String(entrada));
    if (resposta.erro) throw new Error('sem rede');
    const r = new Response(resposta.corpo ?? 'BEGIN:VCALENDAR\r\nEND:VCALENDAR', {
      status: resposta.estado ?? 200,
    });
    // `resposta.url` é somente-leitura num Response comum.
    Object.defineProperty(r, 'url', { value: resposta.url ?? String(entrada) });
    return r;
  }) as unknown as typeof fetch;
}

const GOOGLE = 'https://calendar.google.com/calendar/ical/abc%40group.calendar.google.com/private-xyz/basic.ics';

describe('que endereços eu aceito', () => {
  it('aceita o endereço secreto do Google', () => {
    expect(conferirEndereco(GOOGLE)).toHaveProperty('url');
  });

  it('aceita os domínios da lista, e só eles', () => {
    for (const dominio of DOMINIOS_DE_AGENDA) {
      expect(conferirEndereco(`https://${dominio}/x.ics`), dominio).toHaveProperty('url');
    }
    expect(conferirEndereco('https://exemplo.com/x.ics')).toEqual({ recusa: 'dominio-nao-permitido' });
  });

  it('recusa http puro', () => {
    expect(conferirEndereco('http://calendar.google.com/x.ics')).toEqual({
      recusa: 'endereco-invalido',
    });
  });

  it('recusa os esquemas que alcançam a própria máquina', () => {
    for (const endereco of [
      'file:///etc/passwd',
      'http://169.254.169.254/latest/meta-data/',
      'https://169.254.169.254/latest/meta-data/',
      'https://localhost/admin',
      'https://127.0.0.1/',
      'https://[::1]/',
      'https://10.0.0.1/',
      'gopher://calendar.google.com/',
    ]) {
      expect(conferirEndereco(endereco), endereco).toHaveProperty('recusa');
    }
  });

  it('não cai no truque do arroba', () => {
    // O host disto é `meu-servidor.com`; `calendar.google.com` é só o usuário.
    // É assim que essa cerca costuma ser pulada.
    expect(conferirEndereco('https://calendar.google.com@meu-servidor.com/x.ics')).toEqual({
      recusa: 'dominio-nao-permitido',
    });
  });

  it('não cai em subdomínio parecido', () => {
    for (const falso of [
      'https://calendar.google.com.exemplo.com/x.ics',
      'https://naocalendar.google.com/x.ics',
      'https://evil-calendar.google.com.br/x.ics',
    ]) {
      expect(conferirEndereco(falso), falso).toEqual({ recusa: 'dominio-nao-permitido' });
    }
  });

  it('ignora a caixa do domínio e os espaços em volta', () => {
    expect(conferirEndereco(`  https://CALENDAR.GOOGLE.COM/x.ics  `)).toHaveProperty('url');
  });

  it('texto que não é endereço nenhum é recusado, não explode', () => {
    expect(conferirEndereco('')).toEqual({ recusa: 'endereco-invalido' });
    expect(conferirEndereco('abacaxi')).toEqual({ recusa: 'endereco-invalido' });
  });
});

describe('a rota', () => {
  it('sem sessão, não busca nada', async () => {
    const { armazem } = await comSessao();
    const visitados: string[] = [];
    const resposta = await rotaAgenda(pedir(undefined, { url: GOOGLE }), armazem, falsoFetch({}, visitados));

    expect(resposta.status).toBe(401);
    // O ponto: nem chegou a bater lá fora. Sem isto o endereço seria um proxy
    // aberto para qualquer pessoa na internet.
    expect(visitados).toEqual([]);
  });

  it('com sessão e endereço bom, devolve o texto cru', async () => {
    const { armazem, token } = await comSessao();
    const ics = 'BEGIN:VCALENDAR\r\nX-WR-CALNAME:Minha\r\nEND:VCALENDAR';
    const resposta = await rotaAgenda(pedir(token, { url: GOOGLE }), armazem, falsoFetch({ corpo: ics }));

    expect(resposta.status).toBe(200);
    const corpo = (await resposta.json()) as { texto: string; buscadoEm: string };
    expect(corpo.texto).toBe(ics);
    expect(corpo.buscadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('domínio fora da lista é 403, e não chega a buscar', async () => {
    const { armazem, token } = await comSessao();
    const visitados: string[] = [];
    const resposta = await rotaAgenda(
      pedir(token, { url: 'https://169.254.169.254/latest/meta-data/' }),
      armazem,
      falsoFetch({}, visitados),
    );

    expect(resposta.status).toBe(403);
    expect(visitados).toEqual([]);
  });

  it('redirecionamento para fora da lista é barrado', async () => {
    // A porta dos fundos: conferir só o endereço pedido deixaria um domínio
    // da lista mandar a busca para qualquer lugar.
    const { armazem, token } = await comSessao();
    const resposta = await rotaAgenda(
      pedir(token, { url: GOOGLE }),
      armazem,
      falsoFetch({ url: 'https://exemplo.com/roubado' }),
    );

    expect(resposta.status).toBe(403);
    expect(await resposta.json()).toMatchObject({ erro: 'redirecionou-para-fora' });
  });

  it('agenda grande demais é recusada em vez de engolida', async () => {
    const { armazem, token } = await comSessao();
    const gigante = 'x'.repeat(TETO_DE_BYTES + 1);
    const resposta = await rotaAgenda(pedir(token, { url: GOOGLE }), armazem, falsoFetch({ corpo: gigante }));

    expect(resposta.status).toBe(413);
  });

  it('no limite exato ainda passa', async () => {
    const { armazem, token } = await comSessao();
    const noLimite = 'x'.repeat(TETO_DE_BYTES);
    const resposta = await rotaAgenda(pedir(token, { url: GOOGLE }), armazem, falsoFetch({ corpo: noLimite }));

    expect(resposta.status).toBe(200);
  });

  it('404 explica o caso real: o endereço secreto foi recriado', async () => {
    const { armazem, token } = await comSessao();
    const resposta = await rotaAgenda(
      pedir(token, { url: GOOGLE }),
      armazem,
      falsoFetch({ estado: 404 }),
    );

    expect(resposta.status).toBe(502);
    const corpo = (await resposta.json()) as { mensagem: string };
    expect(corpo.mensagem).toContain('recriou');
  });

  it('sem rede, responde em vez de pendurar', async () => {
    const { armazem, token } = await comSessao();
    const resposta = await rotaAgenda(pedir(token, { url: GOOGLE }), armazem, falsoFetch({ erro: true }));

    expect(resposta.status).toBe(502);
    expect(await resposta.json()).toMatchObject({ erro: 'sem-resposta' });
  });

  it('corpo ilegível não derruba a função', async () => {
    const { armazem, token } = await comSessao();
    const pedido = new Request('https://exemplo.com/api/agenda', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: 'isto não é json',
    });
    const resposta = await rotaAgenda(pedido, armazem, falsoFetch({}));
    expect(resposta.status).toBe(400);
  });

  it('GET não serve', async () => {
    const { armazem, token } = await comSessao();
    const pedido = new Request('https://exemplo.com/api/agenda', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect((await rotaAgenda(pedido, armazem, falsoFetch({}))).status).toBe(405);
  });
});
