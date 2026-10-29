import { describe, it, expect } from 'vitest';
import {
  rotaGoogleConectar,
  rotaGoogleCallback,
  rotaGoogleSincronizar,
  rotaGoogleDesconectar,
  rotaGoogleEvento,
  rotaGoogleEstado,
  voltaPara,
  TETO_DE_PASSOS,
  type ResultadoDaSincronia,
} from './rotasGoogle';
import { ArmazemMemoria } from './armazem';
import { cadastrar } from './contas';
import { MARCA, type EventoDoGoogle, type CorpoDoEvento } from '../dominio/google';
import type { ClienteDoCalendario } from './google';

const AMBIENTE = {
  EMAILS_PERMITIDOS: 'eu@exemplo.com',
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'segredo',
};
const BASE = 'https://msl-delta.vercel.app';

async function comSessao() {
  const armazem = new ArmazemMemoria();
  const entrada = await cadastrar(
    armazem,
    { email: 'eu@exemplo.com', senha: 'uma senha longa' },
    AMBIENTE,
  );
  if (!entrada.ok) throw new Error('não deu para cadastrar');
  return { armazem, token: entrada.valor.token, usuarioId: entrada.valor.usuario.id };
}

/** Uma credencial já guardada, sem passar pelo fluxo inteiro. */
async function jaConectado(armazem: ArmazemMemoria, usuarioId: string) {
  await armazem.gravar(
    `google:${usuarioId}`,
    JSON.stringify({
      refreshToken: 'renovo',
      accessToken: 'acesso',
      // Bem no futuro: assim `acessoValido` não tenta renovar nos testes.
      expiraEm: '2099-01-01T00:00:00.000Z',
      conectadoEm: '2026-09-17T12:00:00.000Z',
    }),
  );
}

const pedir = (caminho: string, token?: string, corpo?: unknown) =>
  new Request(`${BASE}${caminho}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

/** Um calendário de mentira que registra o que foi feito nele. */
function calendarioFalso(eventos: EventoDoGoogle[] = []) {
  const feitos: string[] = [];
  const cliente: ClienteDoCalendario = {
    async listar() {
      return eventos;
    },
    async criar(corpo: CorpoDoEvento) {
      feitos.push(`criar:${corpo.extendedProperties.private[MARCA]}`);
      return null;
    },
    async atualizar(id: string) {
      feitos.push(`atualizar:${id}`);
      return null;
    },
    async apagar(id: string) {
      feitos.push(`apagar:${id}`);
    },
  };
  return { cliente, feitos };
}

const ITEM = {
  chave: 'tarefa:t1',
  titulo: 'Entregar a proposta',
  dia: '2026-09-17',
  alteradoEm: '2026-09-15T12:00:00.000Z',
};

const JANELA = { de: '2026-09-01', ate: '2026-09-30' };

describe('o endereço de volta', () => {
  it('sai do próprio pedido, e não de uma constante', () => {
    // Assim funciona igual no domínio de produção e numa prévia da Vercel.
    expect(voltaPara(new Request(`${BASE}/api/google-conectar`))).toBe(
      `${BASE}/api/google-callback`,
    );
  });
});

describe('conectar', () => {
  it('sem sessão, não convida ninguém', async () => {
    const { armazem } = await comSessao();
    const resposta = await rotaGoogleConectar(pedir('/api/google-conectar'), armazem, AMBIENTE);
    expect(resposta.status).toBe(401);
  });

  it('com sessão, devolve o endereço em vez de redirecionar', async () => {
    // Um redirecionamento não carrega o cabeçalho da sessão, então quem manda
    // o navegador para lá é o cliente.
    const { armazem, token } = await comSessao();
    const resposta = await rotaGoogleConectar(pedir('/api/google-conectar', token), armazem, AMBIENTE);

    expect(resposta.status).toBe(200);
    const { url } = (await resposta.json()) as { url: string };
    expect(url).toContain('accounts.google.com');
    expect(new URL(url).searchParams.get('redirect_uri')).toBe(`${BASE}/api/google-callback`);
  });

  it('sem as variáveis, explica o que falta em vez de quebrar', async () => {
    const { armazem, token } = await comSessao();
    const resposta = await rotaGoogleConectar(pedir('/api/google-conectar', token), armazem, {
      EMAILS_PERMITIDOS: 'eu@exemplo.com',
    });

    expect(resposta.status).toBe(500);
    const corpo = (await resposta.json()) as { mensagem: string };
    expect(corpo.mensagem).toContain('GOOGLE_CLIENT_ID');
    expect(corpo.mensagem).toContain('Redeploy');
  });
});

describe('a volta do Google', () => {
  const chegar = (busca: string) =>
    new Request(`${BASE}/api/google-callback?${busca}`, { method: 'GET' });

  const falso = (corpo: unknown) =>
    (async () => new Response(JSON.stringify(corpo))) as unknown as typeof fetch;

  it('responde uma página, e não JSON cru', async () => {
    // Quem chega aqui é o navegador seguindo um redirecionamento.
    const { armazem, token } = await comSessao();
    const convite = await rotaGoogleConectar(pedir('/api/google-conectar', token), armazem, AMBIENTE);
    const estado = new URL(((await convite.json()) as { url: string }).url).searchParams.get('state')!;

    const resposta = await rotaGoogleCallback(
      chegar(`code=abc&state=${estado}`),
      armazem,
      AMBIENTE,
      falso({ access_token: 'a', refresh_token: 'r', expires_in: 3600 }),
    );

    expect(resposta.headers.get('Content-Type')).toContain('text/html');
    const html = await resposta.text();
    expect(html).toContain('Pronto');
    expect(html).toContain('/app/ajustes');
    // Nada de fora numa página que fecha um fluxo de credencial.
    expect(html).not.toContain('https://');
  });

  it('o convite vale uma vez só', async () => {
    const { armazem, token } = await comSessao();
    const convite = await rotaGoogleConectar(pedir('/api/google-conectar', token), armazem, AMBIENTE);
    const estado = new URL(((await convite.json()) as { url: string }).url).searchParams.get('state')!;
    const buscar = falso({ access_token: 'a', refresh_token: 'r', expires_in: 3600 });

    expect((await rotaGoogleCallback(chegar(`code=a&state=${estado}`), armazem, AMBIENTE, buscar)).status).toBe(200);
    const segunda = await rotaGoogleCallback(chegar(`code=a&state=${estado}`), armazem, AMBIENTE, buscar);
    expect(segunda.status).toBe(400);
    expect(await segunda.text()).toContain('não vale mais');
  });

  it('estado inventado não conecta nada', async () => {
    const { armazem } = await comSessao();
    const resposta = await rotaGoogleCallback(
      chegar('code=abc&state=chutei'),
      armazem,
      AMBIENTE,
      falso({}),
    );
    expect(resposta.status).toBe(400);
  });

  it('quem não autorizou vê o motivo em português', async () => {
    const { armazem } = await comSessao();
    const resposta = await rotaGoogleCallback(chegar('error=access_denied'), armazem, AMBIENTE, falso({}));
    expect(await resposta.text()).toContain('não autorizou');
  });

  it('a mensagem de erro do Google é escapada antes de virar página', async () => {
    const { armazem } = await comSessao();
    const resposta = await rotaGoogleCallback(
      chegar(`error=${encodeURIComponent('<script>alert(1)</script>')}`),
      armazem,
      AMBIENTE,
      falso({}),
    );
    const html = await resposta.text();
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('sincronizar', () => {
  it('sem sessão, nada', async () => {
    const { armazem } = await comSessao();
    const resposta = await rotaGoogleSincronizar(pedir('/api/google-sincronizar'), armazem, AMBIENTE);
    expect(resposta.status).toBe(401);
  });

  it('sem conexão, responde que não está conectado — e isso não é erro', async () => {
    const { armazem, token } = await comSessao();
    const resposta = await rotaGoogleSincronizar(
      pedir('/api/google-sincronizar', token, JANELA),
      armazem,
      AMBIENTE,
    );

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toMatchObject({ conectado: false, deles: [], puxar: [] });
  });

  it('cria no Google o que só existe aqui', async () => {
    const { armazem, token, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId);
    const { cliente, feitos } = calendarioFalso();

    const resposta = await rotaGoogleSincronizar(
      pedir('/api/google-sincronizar', token, { ...JANELA, itens: [ITEM] }),
      armazem,
      AMBIENTE,
      fetch,
      () => cliente,
    );

    const corpo = (await resposta.json()) as ResultadoDaSincronia;
    expect(corpo.conectado).toBe(true);
    expect(corpo.escritos).toEqual({ criados: 1, atualizados: 0, apagados: 0 });
    expect(feitos).toEqual(['criar:tarefa:t1']);
  });

  it('devolve os eventos que são do Google para a tela', async () => {
    const { armazem, token, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId);
    const deles: EventoDoGoogle = {
      id: 'g1',
      summary: 'Dentista',
      start: { dateTime: '2026-09-17T17:00:00Z' },
    };
    const { cliente } = calendarioFalso([deles]);

    const resposta = await rotaGoogleSincronizar(
      pedir('/api/google-sincronizar', token, { ...JANELA, itens: [] }),
      armazem,
      AMBIENTE,
      fetch,
      () => cliente,
    );

    const corpo = (await resposta.json()) as ResultadoDaSincronia;
    expect(corpo.deles.map((e) => e.summary)).toEqual(['Dentista']);
  });

  it('o que mudou lá volta como mudança para aplicar aqui', async () => {
    const { armazem, token, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId);
    const arrastado: EventoDoGoogle = {
      id: 'ev1',
      summary: 'Entregar a proposta',
      updated: '2026-09-16T12:00:00.000Z',
      start: { date: '2026-09-20' },
      end: { date: '2026-09-21' },
      extendedProperties: { private: { [MARCA]: 'tarefa:t1' } },
    };
    const { cliente, feitos } = calendarioFalso([arrastado]);

    const resposta = await rotaGoogleSincronizar(
      pedir('/api/google-sincronizar', token, { ...JANELA, itens: [ITEM] }),
      armazem,
      AMBIENTE,
      fetch,
      () => cliente,
    );

    const corpo = (await resposta.json()) as ResultadoDaSincronia;
    expect(corpo.puxar).toEqual([{ chave: 'tarefa:t1', dia: '2026-09-20' }]);
    expect(feitos, 'não escreve no Google o que veio de lá').toEqual([]);
  });

  it('item torto do cliente é descartado, não vira evento sem nome', async () => {
    const { armazem, token, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId);
    const { cliente, feitos } = calendarioFalso();

    await rotaGoogleSincronizar(
      pedir('/api/google-sincronizar', token, {
        ...JANELA,
        itens: [
          { chave: 'tarefa:a', titulo: '   ', dia: '2026-09-17', alteradoEm: 'x' },
          { chave: 'tarefa:b', titulo: 'Boa', dia: '2026-02-30', alteradoEm: 'x' },
          { chave: '', titulo: 'Sem chave', dia: '2026-09-17', alteradoEm: 'x' },
          'nem é objeto',
          ITEM,
        ],
      }),
      armazem,
      AMBIENTE,
      fetch,
      () => cliente,
    );

    expect(feitos).toEqual(['criar:tarefa:t1']);
  });

  it('janela inválida é recusada antes de falar com o Google', async () => {
    const { armazem, token, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId);

    for (const janela of [
      {},
      { de: '2026-09-30', ate: '2026-09-01' },
      { de: '2026-02-30', ate: '2026-03-01' },
    ]) {
      const resposta = await rotaGoogleSincronizar(
        pedir('/api/google-sincronizar', token, janela),
        armazem,
        AMBIENTE,
        fetch,
        () => calendarioFalso().cliente,
      );
      expect(resposta.status, JSON.stringify(janela)).toBe(400);
    }
  });

  it('para no teto de passos, e diz quanto faltou', async () => {
    // Uma primeira sincronização grande não pode estourar o tempo da função.
    const { armazem, token, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId);
    const { cliente, feitos } = calendarioFalso();

    const muitos = Array.from({ length: TETO_DE_PASSOS + 5 }, (_, i) => ({
      ...ITEM,
      chave: `tarefa:t${String(i).padStart(3, '0')}`,
    }));

    const resposta = await rotaGoogleSincronizar(
      pedir('/api/google-sincronizar', token, { ...JANELA, itens: muitos }),
      armazem,
      AMBIENTE,
      fetch,
      () => cliente,
    );

    const corpo = (await resposta.json()) as ResultadoDaSincronia;
    expect(feitos).toHaveLength(TETO_DE_PASSOS);
    expect(corpo.faltou).toBe(5);
  });

  it('acesso recusado pelo Google vira pedido de reconexão', async () => {
    const { armazem, token, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId);
    const cliente: ClienteDoCalendario = {
      listar: async () => {
        const { ErroDoGoogle } = await import('./google');
        throw new ErroDoGoogle('o Google recusou o acesso. Reconecte a agenda em Ajustes.', 401);
      },
      criar: async () => null,
      atualizar: async () => null,
      apagar: async () => {},
    };

    const resposta = await rotaGoogleSincronizar(
      pedir('/api/google-sincronizar', token, JANELA),
      armazem,
      AMBIENTE,
      fetch,
      () => cliente,
    );

    expect(resposta.status).toBe(401);
    expect((await resposta.json()) as { mensagem: string }).toMatchObject({
      mensagem: expect.stringContaining('Reconecte'),
    });
  });
});

describe('estado e desconectar', () => {
  it('diz se está conectado, e desde quando', async () => {
    const { armazem, token, usuarioId } = await comSessao();

    let resposta = await rotaGoogleEstado(pedir('/api/google-estado', token), armazem);
    expect(await resposta.json()).toEqual({ conectado: false, conectadoEm: null });

    await jaConectado(armazem, usuarioId);
    resposta = await rotaGoogleEstado(pedir('/api/google-estado', token), armazem);
    expect(await resposta.json()).toMatchObject({ conectado: true });
  });

  it('desconectar apaga a credencial daqui, e só daqui', async () => {
    const { armazem, token, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId);

    const resposta = await rotaGoogleDesconectar(pedir('/api/google-desconectar', token), armazem);
    expect(await resposta.json()).toEqual({ conectado: false });
    expect(await armazem.ler(`google:${usuarioId}`)).toBeNull();
  });

  it('desconectar sem sessão não apaga nada', async () => {
    const { armazem, usuarioId } = await comSessao();
    await jaConectado(armazem, usuarioId);

    const resposta = await rotaGoogleDesconectar(pedir('/api/google-desconectar'), armazem);
    expect(resposta.status).toBe(401);
    expect(await armazem.ler(`google:${usuarioId}`)).not.toBeNull();
  });
});

/* ── Mexer num evento que não é nosso ────────────────────────────────────── */

/**
 * Um Google de mentira que fala HTTP: guarda cada chamada e responde o que o
 * roteiro mandar. Os testes de cima trocam o cliente inteiro; aqui o que está
 * sob prova é justamente o endereço e o corpo, então o falso é o `fetch`.
 */
function corpoEmJson(corpo: BodyInit | null | undefined): Record<string, unknown> | undefined {
  if (!corpo) return undefined;
  try {
    return JSON.parse(String(corpo)) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function googleFalso(roteiro: (chamada: { metodo: string; url: URL }) => { estado: number; corpo?: unknown }) {
  const chamadas: {
    metodo: string;
    url: URL;
    corpo?: Record<string, unknown>;
    cabecalhos: Record<string, string>;
  }[] = [];
  const buscar = (async (url: string, opcoes: RequestInit = {}) => {
    const chamada = { metodo: opcoes.method ?? 'GET', url: new URL(url) };
    chamadas.push({
      ...chamada,
      cabecalhos: (opcoes.headers ?? {}) as Record<string, string>,
      // o endpoint de token recebe formulário, e não JSON
      corpo: corpoEmJson(opcoes.body),
    });
    const { estado, corpo } = roteiro(chamada);
    return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status: estado });
  }) as unknown as typeof fetch;
  return { buscar, chamadas };
}

const EVENTO_DAS_10: EventoDoGoogle = {
  id: 'ev1',
  etag: '"3500000000000000"',
  summary: 'Reunião',
  // 13:00 UTC é 10:00 em São Paulo; uma hora de duração.
  start: { dateTime: '2026-09-17T13:00:00Z' },
  end: { dateTime: '2026-09-17T14:00:00Z' },
};

/** Responde 200 com o evento no GET e 200 vazio em qualquer escrita. */
const GOOGLE_BOM = ({ metodo }: { metodo: string }) =>
  metodo === 'GET' ? { estado: 200, corpo: EVENTO_DAS_10 } : { estado: 200, corpo: {} };

async function mexer(
  corpo: unknown,
  buscar: typeof fetch,
  opcoes: { conectado?: boolean; comSessao?: boolean } = {},
) {
  const { armazem, token, usuarioId } = await comSessao();
  if (opcoes.conectado !== false) await jaConectado(armazem, usuarioId);
  const resposta = await rotaGoogleEvento(
    pedir('/api/google-evento', opcoes.comSessao === false ? undefined : token, corpo),
    armazem,
    AMBIENTE,
    buscar,
  );
  return { resposta, corpo: (await resposta.json()) as Record<string, unknown> };
}

describe('mexer num evento do Google', () => {
  it('sem sessão, recusa antes de falar com o Google', async () => {
    const { buscar, chamadas } = googleFalso(GOOGLE_BOM);
    const { resposta } = await mexer({ acao: 'apagar', uid: 'ev1' }, buscar, { comSessao: false });
    expect(resposta.status).toBe(401);
    expect(chamadas).toHaveLength(0);
  });

  it('só aceita POST', async () => {
    const { armazem, token } = await comSessao();
    const { buscar, chamadas } = googleFalso(GOOGLE_BOM);
    const pedido = new Request(`${BASE}/api/google-evento`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect((await rotaGoogleEvento(pedido, armazem, AMBIENTE, buscar)).status).toBe(405);
    expect(chamadas).toHaveLength(0);
  });

  it('sem agenda conectada, diz "desconectado" e não é erro', async () => {
    const { buscar, chamadas } = googleFalso(GOOGLE_BOM);
    const { resposta, corpo } = await mexer({ acao: 'apagar', uid: 'ev1' }, buscar, {
      conectado: false,
    });
    expect(resposta.status).toBe(200);
    expect(corpo).toEqual({ feito: false, motivo: 'desconectado' });
    expect(chamadas).toHaveLength(0);
  });

  describe('apagar', () => {
    it('manda DELETE com sendUpdates=none', async () => {
      const { buscar, chamadas } = googleFalso(() => ({ estado: 204 }));
      const { corpo } = await mexer({ acao: 'apagar', uid: 'ev1' }, buscar);

      expect(corpo).toEqual({ feito: true });
      expect(chamadas).toHaveLength(1);
      expect(chamadas[0].metodo).toBe('DELETE');
      expect(chamadas[0].url.pathname).toBe('/calendar/v3/calendars/primary/events/ev1');
      expect(chamadas[0].url.searchParams.get('sendUpdates')).toBe('none');
    });

    it('404 do Google vira motivo "inexistente", e não erro', async () => {
      const { buscar } = googleFalso(() => ({ estado: 404, corpo: { error: {} } }));
      const { resposta, corpo } = await mexer({ acao: 'apagar', uid: 'ev1' }, buscar);
      expect(resposta.status).toBe(200);
      expect(corpo).toEqual({ feito: false, motivo: 'inexistente' });
    });

    it('410 (já apagado) também é "inexistente"', async () => {
      // O Google responde 410 a quem apaga duas vezes o mesmo evento.
      const { buscar } = googleFalso(() => ({ estado: 410 }));
      const { corpo } = await mexer({ acao: 'apagar', uid: 'ev1' }, buscar);
      expect(corpo).toEqual({ feito: false, motivo: 'inexistente' });
    });

    it('403 do Google vira motivo "sem-permissao"', async () => {
      const { buscar } = googleFalso(() => ({
        estado: 403,
        corpo: { error: { errors: [{ reason: 'forbiddenForNonOrganizer' }] } },
      }));
      const { resposta, corpo } = await mexer({ acao: 'apagar', uid: 'ev1' }, buscar);
      expect(resposta.status).toBe(200);
      expect(corpo).toEqual({ feito: false, motivo: 'sem-permissao' });
    });

    it('403 por excesso de pedidos não é falta de permissão', async () => {
      // Dizer "você não pode mexer nesse evento" a quem só bateu no limite de
      // pedidos seria mentira: é para tentar de novo, não para desistir.
      const { buscar } = googleFalso(() => ({
        estado: 403,
        corpo: { error: { errors: [{ reason: 'rateLimitExceeded' }] } },
      }));
      const { resposta, corpo } = await mexer({ acao: 'apagar', uid: 'ev1' }, buscar);
      expect(resposta.status).toBeGreaterThanOrEqual(429);
      expect(corpo.motivo).toBeUndefined();
      expect(corpo.erro).toBe('google');
    });

    it('acesso revogado (401) cai no caminho de "desconectado"', async () => {
      const { buscar } = googleFalso(() => ({ estado: 401 }));
      const { corpo } = await mexer({ acao: 'apagar', uid: 'ev1' }, buscar);
      expect(corpo).toEqual({ feito: false, motivo: 'desconectado' });
    });

    it('erro do Google que não é de negócio continua sendo erro', async () => {
      const { buscar } = googleFalso(() => ({ estado: 500 }));
      const { resposta, corpo } = await mexer({ acao: 'apagar', uid: 'ev1' }, buscar);
      expect(resposta.status).toBe(502);
      expect(corpo.erro).toBe('google');
    });
  });

  describe('renomear', () => {
    it('manda PATCH só com summary', async () => {
      const { buscar, chamadas } = googleFalso(GOOGLE_BOM);
      const { corpo } = await mexer({ acao: 'renomear', uid: 'ev1', novo: 'Reunião de equipe' }, buscar);

      expect(corpo).toEqual({ feito: true });
      const escrita = chamadas.filter((c) => c.metodo !== 'GET');
      expect(escrita).toHaveLength(1);
      expect(escrita[0].metodo).toBe('PATCH');
      expect(escrita[0].corpo).toEqual({ summary: 'Reunião de equipe' });
      expect(escrita[0].url.searchParams.get('sendUpdates')).toBe('none');
    });

    it('não renomeia evento já cancelado: ele ressuscitaria', async () => {
      // O GET do Google devolve o evento apagado com status "cancelled". Um
      // PATCH em cima dele pode trazê-lo de volta com o nome novo.
      const { buscar, chamadas } = googleFalso(() => ({
        estado: 200,
        corpo: { ...EVENTO_DAS_10, status: 'cancelled' },
      }));
      const { corpo } = await mexer({ acao: 'renomear', uid: 'ev1', novo: 'X' }, buscar);
      expect(corpo).toEqual({ feito: false, motivo: 'inexistente' });
      expect(chamadas.every((c) => c.metodo === 'GET')).toBe(true);
    });

    it('tira os espaços das pontas do nome novo', async () => {
      const { buscar, chamadas } = googleFalso(GOOGLE_BOM);
      await mexer({ acao: 'renomear', uid: 'ev1', novo: '  Alinhamento  ' }, buscar);
      expect(chamadas.find((c) => c.metodo === 'PATCH')?.corpo).toEqual({ summary: 'Alinhamento' });
    });
  });

  describe('mover', () => {
    it('busca o evento e manda PATCH só com start e end, mantendo a duração', async () => {
      const { buscar, chamadas } = googleFalso(GOOGLE_BOM);
      const { corpo } = await mexer(
        { acao: 'mover', uid: 'ev1', dia: '2026-09-18', hora: '14:00' },
        buscar,
      );

      expect(corpo).toEqual({ feito: true });
      expect(chamadas.map((c) => c.metodo)).toEqual(['GET', 'PATCH']);
      expect(chamadas[1].corpo).toEqual({
        start: { dateTime: '2026-09-18T14:00:00', timeZone: 'America/Sao_Paulo' },
        end: { dateTime: '2026-09-18T15:00:00', timeZone: 'America/Sao_Paulo' },
      });
      expect(chamadas[1].url.searchParams.get('sendUpdates')).toBe('none');
    });

    it('sem hora nova, fica com a hora de parede que o evento já tinha', async () => {
      // 13:00 UTC é 10:00 em São Paulo; mover "para sexta" não pode ir para as 13.
      const { buscar, chamadas } = googleFalso(GOOGLE_BOM);
      await mexer({ acao: 'mover', uid: 'ev1', dia: '2026-09-18' }, buscar);
      expect(chamadas[1].corpo).toMatchObject({
        start: { dateTime: '2026-09-18T10:00:00', timeZone: 'America/Sao_Paulo' },
        end: { dateTime: '2026-09-18T11:00:00', timeZone: 'America/Sao_Paulo' },
      });
    });

    it('usa o fuso que o cliente mandou', async () => {
      const { buscar, chamadas } = googleFalso(GOOGLE_BOM);
      await mexer(
        { acao: 'mover', uid: 'ev1', dia: '2026-09-18', hora: '09:00', fuso: 'America/Manaus' },
        buscar,
      );
      expect(chamadas[1].corpo).toMatchObject({ start: { timeZone: 'America/Manaus' } });
    });

    it('404 ao buscar o evento é "inexistente", e nada é escrito', async () => {
      const { buscar, chamadas } = googleFalso(() => ({ estado: 404 }));
      const { corpo } = await mexer({ acao: 'mover', uid: 'ev1', dia: '2026-09-18' }, buscar);
      expect(corpo).toEqual({ feito: false, motivo: 'inexistente' });
      expect(chamadas.map((c) => c.metodo)).toEqual(['GET']);
    });

    it('evento cancelado conta como inexistente, e nada é escrito', async () => {
      const { buscar, chamadas } = googleFalso(() => ({
        estado: 200,
        corpo: { ...EVENTO_DAS_10, status: 'cancelled' },
      }));
      const { corpo } = await mexer({ acao: 'mover', uid: 'ev1', dia: '2026-09-18' }, buscar);
      expect(corpo).toEqual({ feito: false, motivo: 'inexistente' });
      expect(chamadas.map((c) => c.metodo)).toEqual(['GET']);
    });

    it('403 no PATCH vira "sem-permissao"', async () => {
      const { buscar } = googleFalso(({ metodo }) =>
        metodo === 'GET' ? { estado: 200, corpo: EVENTO_DAS_10 } : { estado: 403 },
      );
      const { corpo } = await mexer({ acao: 'mover', uid: 'ev1', dia: '2026-09-18' }, buscar);
      expect(corpo).toEqual({ feito: false, motivo: 'sem-permissao' });
    });
  });

  describe('a série é intocável', () => {
    // As ocorrências de uma série têm id próprio, que começa pelo id da série
    // — então "não contém o id da série" seria um teste que nunca passa. O que
    // se prova é o caminho inteiro: termina exatamente na ocorrência.
    const OCORRENCIA = 'serie1_20260917T130000Z';
    const DA_SERIE: EventoDoGoogle = { ...EVENTO_DAS_10, id: OCORRENCIA, recurringEventId: 'serie1' };
    const CAMINHO = `/calendar/v3/calendars/primary/events/${OCORRENCIA}`;

    const casos = [
      { acao: 'apagar', uid: OCORRENCIA },
      { acao: 'renomear', uid: OCORRENCIA, novo: 'Outro nome' },
      { acao: 'mover', uid: OCORRENCIA, dia: '2026-09-18', hora: '09:00' },
    ];

    for (const caso of casos) {
      it(`${caso.acao} age só na ocorrência, nunca na série`, async () => {
        const { buscar, chamadas } = googleFalso(({ metodo }) =>
          metodo === 'GET' ? { estado: 200, corpo: DA_SERIE } : { estado: 200, corpo: {} },
        );
        const { corpo } = await mexer(caso, buscar);

        expect(corpo).toEqual({ feito: true });
        for (const chamada of chamadas) {
          expect(chamada.url.pathname).toBe(CAMINHO);
          // nenhuma chamada leva o campo que ligaria a escrita à série
          expect(chamada.corpo ?? {}).not.toHaveProperty('recurringEventId');
          expect(chamada.url.searchParams.has('recurringEventId')).toBe(false);
        }
      });
    }

    it('toda escrita leva sendUpdates=none, sem exceção', async () => {
      for (const caso of casos) {
        const { buscar, chamadas } = googleFalso(GOOGLE_BOM);
        await mexer(caso, buscar);
        const escritas = chamadas.filter((c) => c.metodo !== 'GET');
        expect(escritas.length).toBeGreaterThan(0);
        for (const e of escritas) expect(e.url.searchParams.get('sendUpdates')).toBe('none');
      }
    });
  });

  describe('a entrada do cliente é conferida na borda', () => {
    const recusas: [string, unknown][] = [
      ['ação desconhecida', { acao: 'duplicar', uid: 'ev1' }],
      ['sem ação', { uid: 'ev1' }],
      ['sem uid', { acao: 'apagar' }],
      ['uid vazio', { acao: 'apagar', uid: '' }],
      ['uid que não é texto', { acao: 'apagar', uid: 42 }],
      ['uid que sobe de diretório', { acao: 'apagar', uid: '..' }],
      ['uid com barra', { acao: 'apagar', uid: 'a/b' }],
      ['uid com interrogação', { acao: 'apagar', uid: 'a?sendUpdates=all' }],
      ['mover sem dia', { acao: 'mover', uid: 'ev1', hora: '10:00' }],
      ['dia que não existe', { acao: 'mover', uid: 'ev1', dia: '2026-02-30' }],
      ['dia fora do formato', { acao: 'mover', uid: 'ev1', dia: '18/09/2026' }],
      ['hora sem dois-pontos', { acao: 'mover', uid: 'ev1', dia: '2026-09-18', hora: '9' }],
      ['hora com um dígito', { acao: 'mover', uid: 'ev1', dia: '2026-09-18', hora: '9:00' }],
      ['hora impossível', { acao: 'mover', uid: 'ev1', dia: '2026-09-18', hora: '25:00' }],
      ['minuto impossível', { acao: 'mover', uid: 'ev1', dia: '2026-09-18', hora: '10:75' }],
      ['hora que não é texto', { acao: 'mover', uid: 'ev1', dia: '2026-09-18', hora: 9 }],
      ['fuso inventado', { acao: 'mover', uid: 'ev1', dia: '2026-09-18', fuso: 'Marte/Olimpo' }],
      ['renomear sem nome', { acao: 'renomear', uid: 'ev1' }],
      ['renomear para vazio', { acao: 'renomear', uid: 'ev1', novo: '   ' }],
      ['nome que não é texto', { acao: 'renomear', uid: 'ev1', novo: 7 }],
    ];

    for (const [nome, entrada] of recusas) {
      it(`recusa ${nome} sem tocar no Google`, async () => {
        const { buscar, chamadas } = googleFalso(GOOGLE_BOM);
        const { resposta } = await mexer(entrada, buscar);
        expect(resposta.status).toBe(400);
        expect(chamadas).toHaveLength(0);
      });
    }

    it('corpo que nem é JSON é recusado, não explode', async () => {
      const { armazem, token, usuarioId } = await comSessao();
      await jaConectado(armazem, usuarioId);
      const { buscar, chamadas } = googleFalso(GOOGLE_BOM);
      const pedido = new Request(`${BASE}/api/google-evento`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: 'isto não é json',
      });
      const resposta = await rotaGoogleEvento(pedido, armazem, AMBIENTE, buscar);
      expect(resposta.status).toBe(400);
      expect(chamadas).toHaveLength(0);
    });

    it('hora vazia quer dizer "sem hora nova", e é aceita', async () => {
      // É o que um formulário manda quando o campo fica em branco.
      const { buscar, chamadas } = googleFalso(GOOGLE_BOM);
      const { corpo } = await mexer({ acao: 'mover', uid: 'ev1', dia: '2026-09-18', hora: '' }, buscar);
      expect(corpo).toEqual({ feito: true });
      expect(chamadas[1].corpo).toMatchObject({ start: { dateTime: '2026-09-18T10:00:00' } });
    });
  });
  describe('o evento mudou entre a leitura e a escrita', () => {
    it('mover manda If-Match com o etag do evento lido', async () => {
      const { buscar, chamadas } = googleFalso(GOOGLE_BOM);
      await mexer({ acao: 'mover', uid: 'ev1', dia: '2026-09-18' }, buscar);
      expect(chamadas[1].cabecalhos['If-Match']).toBe(EVENTO_DAS_10.etag);
    });

    it('renomear manda If-Match com o etag do evento lido', async () => {
      const { buscar, chamadas } = googleFalso(GOOGLE_BOM);
      await mexer({ acao: 'renomear', uid: 'ev1', novo: 'Outro' }, buscar);
      expect(chamadas[1].cabecalhos['If-Match']).toBe(EVENTO_DAS_10.etag);
    });

    it('412 vira "mudou-enquanto-isso": o organizador remarcou no meio', async () => {
      // Gravar a hora lida desfaria, em silêncio, a remarcação de outra pessoa.
      const { buscar } = googleFalso(({ metodo }) =>
        metodo === 'GET' ? { estado: 200, corpo: EVENTO_DAS_10 } : { estado: 412 },
      );
      const { resposta, corpo } = await mexer({ acao: 'mover', uid: 'ev1', dia: '2026-09-18' }, buscar);
      expect(resposta.status).toBe(200);
      expect(corpo).toEqual({ feito: false, motivo: 'mudou-enquanto-isso' });
    });

    it('412 também vale para renomear', async () => {
      const { buscar } = googleFalso(({ metodo }) =>
        metodo === 'GET' ? { estado: 200, corpo: EVENTO_DAS_10 } : { estado: 412 },
      );
      const { corpo } = await mexer({ acao: 'renomear', uid: 'ev1', novo: 'X' }, buscar);
      expect(corpo).toEqual({ feito: false, motivo: 'mudou-enquanto-isso' });
    });

    it('sem etag no evento lido, não escreve às cegas', async () => {
      const { buscar, chamadas } = googleFalso(({ metodo }) =>
        metodo === 'GET'
          ? { estado: 200, corpo: { ...EVENTO_DAS_10, etag: undefined } }
          : { estado: 200, corpo: {} },
      );
      const { resposta } = await mexer({ acao: 'mover', uid: 'ev1', dia: '2026-09-18' }, buscar);
      expect(resposta.status).toBe(502);
      expect(chamadas.every((c) => c.metodo === 'GET')).toBe(true);
    });
  });

  describe('o espelho do MSL não é mexido por aqui', () => {
    const ESPELHO = { ...EVENTO_DAS_10, extendedProperties: { private: { [MARCA]: 'tarefa:t1' } } };
    const doEspelho = ({ metodo }: { metodo: string }) =>
      metodo === 'GET' ? { estado: 200, corpo: ESPELHO } : { estado: 200, corpo: {} };

    it('mover recusa com "e-nosso", e nada é escrito', async () => {
      // Dizer "feito" a uma ação que a próxima sincronia desfaz seria mentir.
      const { buscar, chamadas } = googleFalso(doEspelho);
      const { corpo } = await mexer({ acao: 'mover', uid: 'ev1', dia: '2026-09-18' }, buscar);
      expect(corpo).toEqual({ feito: false, motivo: 'e-nosso' });
      expect(chamadas.map((c) => c.metodo)).toEqual(['GET']);
    });

    it('renomear recusa com "e-nosso", e nada é escrito', async () => {
      const { buscar, chamadas } = googleFalso(doEspelho);
      const { corpo } = await mexer({ acao: 'renomear', uid: 'ev1', novo: 'X' }, buscar);
      expect(corpo).toEqual({ feito: false, motivo: 'e-nosso' });
      expect(chamadas.map((c) => c.metodo)).toEqual(['GET']);
    });

    it('apagar não lê o evento antes: o domínio já impede mirar um espelho', async () => {
      const { buscar, chamadas } = googleFalso(() => ({ estado: 204 }));
      await mexer({ acao: 'apagar', uid: 'ev1' }, buscar);
      expect(chamadas.map((c) => c.metodo)).toEqual(['DELETE']);
    });
  });

  describe('o acesso renovado que o Google não aceita mais', () => {
    /** Credencial vencida, para a rota ter que renovar. */
    async function vencida() {
      const { armazem, token, usuarioId } = await comSessao();
      await armazem.gravar(
        `google:${usuarioId}`,
        JSON.stringify({
          refreshToken: 'revogado',
          accessToken: 'velho',
          expiraEm: '2020-01-01T00:00:00.000Z',
          conectadoEm: '2020-01-01T00:00:00.000Z',
        }),
      );
      return { armazem, token };
    }
    const REVOGADO = { estado: 400, corpo: { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' } };

    it('invalid_grant na renovação vira "desconectado", e não 502', async () => {
      // É o caminho comum de perder o acesso: o dono revoga o consentimento, ou
      // o app em modo de testes deixa o token expirar a cada sete dias.
      const { armazem, token } = await vencida();
      const { buscar, chamadas } = googleFalso(() => REVOGADO);
      const resposta = await rotaGoogleEvento(
        pedir('/api/google-evento', token, { acao: 'apagar', uid: 'ev1' }),
        armazem,
        AMBIENTE,
        buscar,
      );
      expect(resposta.status).toBe(200);
      expect(await resposta.json()).toEqual({ feito: false, motivo: 'desconectado' });
      expect(chamadas).toHaveLength(1);
    });

    it('a sincronização trata o mesmo caso como pedido de reconexão', async () => {
      const { armazem, token } = await vencida();
      const { buscar } = googleFalso(() => REVOGADO);
      const resposta = await rotaGoogleSincronizar(
        pedir('/api/google-sincronizar', token, JANELA),
        armazem,
        AMBIENTE,
        buscar,
      );
      expect(resposta.status).toBe(401);
      expect((await resposta.json()) as { mensagem: string }).toMatchObject({
        mensagem: expect.stringContaining('Reconecte'),
      });
    });

    it('outro erro da renovação continua sendo erro', async () => {
      const { armazem, token } = await vencida();
      const { buscar } = googleFalso(() => ({ estado: 500, corpo: {} }));
      const resposta = await rotaGoogleEvento(
        pedir('/api/google-evento', token, { acao: 'apagar', uid: 'ev1' }),
        armazem,
        AMBIENTE,
        buscar,
      );
      expect(resposta.status).toBe(502);
    });
  });
});
