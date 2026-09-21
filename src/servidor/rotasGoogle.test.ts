import { describe, it, expect } from 'vitest';
import {
  rotaGoogleConectar,
  rotaGoogleCallback,
  rotaGoogleSincronizar,
  rotaGoogleDesconectar,
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
