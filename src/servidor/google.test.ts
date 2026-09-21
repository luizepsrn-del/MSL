import { describe, it, expect } from 'vitest';
import {
  convitePara,
  donoDoEstado,
  guardarCredencial,
  credencialDe,
  desconectar,
  acessoValido,
  clienteDoCalendario,
  GoogleNaoConfigurado,
  ErroDoGoogle,
  ESCOPO,
  SEGUNDOS_DO_ESTADO,
  TETO_DE_PAGINAS,
} from './google';
import { ArmazemMemoria } from './armazem';

const AMBIENTE = { GOOGLE_CLIENT_ID: 'id-do-cliente', GOOGLE_CLIENT_SECRET: 'segredo-do-cliente' };
const VOLTA = 'https://exemplo.com/api/google-callback';
const AGORA = new Date('2026-09-17T12:00:00.000Z');

/** Um `fetch` de mentira que registra o que foi pedido. */
function falso(respostas: unknown[] | unknown, estado = 200) {
  const fila = Array.isArray(respostas) ? [...respostas] : [respostas];
  const pedidos: { url: string; metodo?: string; corpo?: string; auth?: string }[] = [];

  const buscar = (async (url: string, opcoes: RequestInit = {}) => {
    pedidos.push({
      url,
      metodo: opcoes.method,
      corpo: opcoes.body ? String(opcoes.body) : undefined,
      auth: (opcoes.headers as Record<string, string>)?.Authorization,
    });
    const corpo = fila.length > 1 ? fila.shift() : fila[0];
    return new Response(corpo === null ? null : JSON.stringify(corpo), {
      status: corpo === null ? 204 : estado,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;

  return { buscar, pedidos };
}

describe('o convite', () => {
  it('leva o escopo, o offline e o consent', async () => {
    const armazem = new ArmazemMemoria();
    const url = new URL(await convitePara(armazem, 'u1', VOLTA, AMBIENTE));

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('scope')).toBe(ESCOPO);
    // Sem `offline` o acesso morre em uma hora e nunca mais volta.
    expect(url.searchParams.get('access_type')).toBe('offline');
    // Sem `consent` a reconexão vem sem a credencial que dura, e a conexão que
    // deveria consertar o acesso fica pela metade.
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('redirect_uri')).toBe(VOLTA);
  });

  it('o estado é guardado preso ao usuário, e é de uso único', async () => {
    // Sem ele, alguém faria o meu navegador terminar um fluxo que ela começou,
    // e a agenda dela ficaria ligada à minha conta.
    const armazem = new ArmazemMemoria();
    const url = new URL(await convitePara(armazem, 'u1', VOLTA, AMBIENTE));
    const estado = url.searchParams.get('state')!;

    expect(estado.length).toBeGreaterThan(20);
    expect(await donoDoEstado(armazem, estado)).toBe('u1');
    // A segunda vez não vale mais.
    expect(await donoDoEstado(armazem, estado)).toBeNull();
  });

  it('o estado morre sozinho', async () => {
    let relogio = 0;
    const armazem = new ArmazemMemoria(() => relogio);
    const url = new URL(await convitePara(armazem, 'u1', VOLTA, AMBIENTE));
    const estado = url.searchParams.get('state')!;

    relogio = (SEGUNDOS_DO_ESTADO + 1) * 1000;
    expect(await donoDoEstado(armazem, estado)).toBeNull();
  });

  it('estado inventado não tem dono', async () => {
    expect(await donoDoEstado(new ArmazemMemoria(), 'chutei')).toBeNull();
    expect(await donoDoEstado(new ArmazemMemoria(), '')).toBeNull();
  });

  it('sem as variáveis, diz exatamente o que falta', async () => {
    await expect(convitePara(new ArmazemMemoria(), 'u1', VOLTA, {})).rejects.toThrow(
      GoogleNaoConfigurado,
    );
    await expect(
      convitePara(new ArmazemMemoria(), 'u1', VOLTA, { GOOGLE_CLIENT_ID: 'só-o-id' }),
    ).rejects.toThrow(/GOOGLE_CLIENT_SECRET/);
  });
});

describe('guardar a credencial', () => {
  const resposta = { access_token: 'acesso', refresh_token: 'renovo', expires_in: 3600 };

  it('guarda o que dura e o que vence', async () => {
    const armazem = new ArmazemMemoria();
    const { buscar } = falso(resposta);

    const credencial = await guardarCredencial(armazem, 'u1', 'cod', VOLTA, AMBIENTE, buscar, AGORA);

    expect(credencial.refreshToken).toBe('renovo');
    expect(credencial.expiraEm).toBe('2026-09-17T13:00:00.000Z');
    expect(await credencialDe(armazem, 'u1')).toEqual(credencial);
  });

  it('a credencial fica presa ao usuário', async () => {
    const armazem = new ArmazemMemoria();
    const { buscar } = falso(resposta);
    await guardarCredencial(armazem, 'u1', 'cod', VOLTA, AMBIENTE, buscar, AGORA);
    expect(await credencialDe(armazem, 'outro')).toBeNull();
  });

  it('sem a credencial que dura, recusa a conexão inteira', async () => {
    // Guardar assim mesmo daria uma conexão que falha em uma hora e não volta.
    const { buscar } = falso({ access_token: 'acesso', expires_in: 3600 });
    await expect(
      guardarCredencial(new ArmazemMemoria(), 'u1', 'cod', VOLTA, AMBIENTE, buscar, AGORA),
    ).rejects.toThrow(/credencial que dura/);
  });

  it('erro do Google vira mensagem legível', async () => {
    const { buscar } = falso({ error: 'invalid_grant', error_description: 'Code was already redeemed' });
    await expect(
      guardarCredencial(new ArmazemMemoria(), 'u1', 'cod', VOLTA, AMBIENTE, buscar, AGORA),
    ).rejects.toThrow('Code was already redeemed');
  });

  it('desconectar apaga de verdade', async () => {
    const armazem = new ArmazemMemoria();
    const { buscar } = falso(resposta);
    await guardarCredencial(armazem, 'u1', 'cod', VOLTA, AMBIENTE, buscar, AGORA);
    await desconectar(armazem, 'u1');
    expect(await credencialDe(armazem, 'u1')).toBeNull();
  });

  it('credencial corrompida devolve nada, em vez de quebrar', async () => {
    const armazem = new ArmazemMemoria();
    await armazem.gravar('google:u1', 'isto não é json');
    expect(await credencialDe(armazem, 'u1')).toBeNull();
  });
});

describe('renovar o acesso', () => {
  async function comCredencial(extra: Record<string, unknown> = {}) {
    const armazem = new ArmazemMemoria();
    await armazem.gravar(
      'google:u1',
      JSON.stringify({
        refreshToken: 'renovo',
        accessToken: 'acesso-velho',
        expiraEm: '2026-09-17T13:00:00.000Z',
        conectadoEm: '2026-09-17T12:00:00.000Z',
        ...extra,
      }),
    );
    return armazem;
  }

  it('usa o que ainda vale, sem falar com o Google', async () => {
    const armazem = await comCredencial();
    const { buscar, pedidos } = falso({});
    const acesso = await acessoValido(armazem, 'u1', AMBIENTE, buscar, AGORA);

    expect(acesso).toBe('acesso-velho');
    expect(pedidos, 'não pede token à toa').toEqual([]);
  });

  it('renova quando falta pouco', async () => {
    const armazem = await comCredencial();
    const { buscar } = falso({ access_token: 'acesso-novo', expires_in: 3600 });
    // Um minuto antes do vencimento: dentro da folga.
    const quase = new Date('2026-09-17T12:59:00.000Z');

    expect(await acessoValido(armazem, 'u1', AMBIENTE, buscar, quase)).toBe('acesso-novo');
  });

  it('a credencial que dura sobrevive a uma renovação que não a devolve', async () => {
    // O Google só manda o `refresh_token` na primeira autorização. Sobrescrever
    // com `undefined` custaria a conexão inteira na hora seguinte.
    const armazem = await comCredencial({ expiraEm: '2026-09-17T11:00:00.000Z' });
    const { buscar } = falso({ access_token: 'novo', expires_in: 3600 });

    await acessoValido(armazem, 'u1', AMBIENTE, buscar, AGORA);
    expect((await credencialDe(armazem, 'u1'))?.refreshToken).toBe('renovo');
  });

  it('sem conexão nenhuma, diz isso com um código que a tela entende', async () => {
    const { buscar } = falso({});
    await expect(
      acessoValido(new ArmazemMemoria(), 'u1', AMBIENTE, buscar, AGORA),
    ).rejects.toMatchObject({ estado: 409 });
  });

  it('credencial sem acesso nenhum renova em vez de devolver vazio', async () => {
    const armazem = await comCredencial({ accessToken: undefined, expiraEm: undefined });
    const { buscar } = falso({ access_token: 'do-zero', expires_in: 3600 });
    expect(await acessoValido(armazem, 'u1', AMBIENTE, buscar, AGORA)).toBe('do-zero');
  });
});

describe('a API do calendário', () => {
  it('lista pedindo as séries já expandidas', async () => {
    // Sem `singleEvents`, uma reunião semanal chega como a regra, e eu teria
    // que reimplementar a expansão aqui.
    const { buscar, pedidos } = falso({ items: [{ id: 'a' }] });
    const eventos = await clienteDoCalendario('acesso', buscar).listar('2026-09-01', '2026-09-30');

    expect(eventos.map((e) => e.id)).toEqual(['a']);
    const url = new URL(pedidos[0].url);
    expect(url.searchParams.get('singleEvents')).toBe('true');
    expect(url.searchParams.get('timeMin')).toBe('2026-09-01T00:00:00Z');
    expect(url.searchParams.get('timeMax')).toBe('2026-09-30T23:59:59Z');
    expect(pedidos[0].auth).toBe('Bearer acesso');
  });

  it('junta as páginas', async () => {
    const { buscar } = falso([
      { items: [{ id: 'a' }], nextPageToken: 'p2' },
      { items: [{ id: 'b' }] },
    ]);
    const eventos = await clienteDoCalendario('acesso', buscar).listar('2026-09-01', '2026-09-30');
    expect(eventos.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('não varre a vida inteira', async () => {
    // Uma resposta que sempre pede mais uma página não pode prender a função.
    const { buscar, pedidos } = falso({ items: [{ id: 'x' }], nextPageToken: 'sempre' });
    await clienteDoCalendario('acesso', buscar).listar('2026-01-01', '2026-12-31');
    expect(pedidos).toHaveLength(TETO_DE_PAGINAS);
  });

  it('cria e atualiza mandando o corpo', async () => {
    const { buscar, pedidos } = falso({ id: 'novo' });
    const cliente = clienteDoCalendario('acesso', buscar);
    const corpo = {
      summary: 'X',
      start: { date: '2026-09-17' },
      end: { date: '2026-09-18' },
      extendedProperties: { private: { msl: 'tarefa:t1' } },
    };

    await cliente.criar(corpo);
    expect(pedidos[0].metodo).toBe('POST');
    expect(JSON.parse(pedidos[0].corpo!)).toEqual(corpo);

    await cliente.atualizar('ev1', corpo);
    expect(pedidos[1].metodo).toBe('PATCH');
    expect(pedidos[1].url).toContain('/ev1');
  });

  it('o id do evento é escapado no endereço', async () => {
    const { buscar, pedidos } = falso(null);
    await clienteDoCalendario('acesso', buscar).apagar('a/b?c');
    expect(pedidos[0].url).toContain(encodeURIComponent('a/b?c'));
  });

  it('apagar duas vezes dá o mesmo que apagar uma', async () => {
    // O Google responde 404 na segunda, e isso é sucesso: a idempotência do
    // plano depende disto.
    const { buscar } = falso({ error: 'not found' }, 404);
    await expect(clienteDoCalendario('acesso', buscar).apagar('ev1')).resolves.toBeUndefined();
  });

  it('acesso recusado pede reconexão, em vez de uma mensagem de biblioteca', async () => {
    const { buscar } = falso({ error: 'invalid' }, 401);
    await expect(clienteDoCalendario('acesso', buscar).listar('2026-09-01', '2026-09-02'))
      .rejects.toThrow(/Reconecte/);
  });

  it('erro inesperado vira ErroDoGoogle, e não uma exceção crua', async () => {
    const { buscar } = falso({ error: 'boom' }, 500);
    await expect(
      clienteDoCalendario('acesso', buscar).listar('2026-09-01', '2026-09-02'),
    ).rejects.toThrow(ErroDoGoogle);
  });
});
