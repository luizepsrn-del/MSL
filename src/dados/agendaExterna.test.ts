import { describe, it, expect, vi } from 'vitest';
import {
  lerCache,
  gravarCache,
  limparCache,
  estaVelha,
  buscarAgenda,
  ErroDaAgenda,
  MINUTOS_ATE_REBUSCAR,
  type AgendaGuardada,
} from './agendaExterna';

/** Um `localStorage` de mentira, e um que se recusa a funcionar. */
function guardaFalsa(inicial: Record<string, string> = {}): Storage {
  const dados = new Map(Object.entries(inicial));
  return {
    get length() {
      return dados.size;
    },
    clear: () => dados.clear(),
    getItem: (c: string) => dados.get(c) ?? null,
    key: (i: number) => [...dados.keys()][i] ?? null,
    removeItem: (c: string) => void dados.delete(c),
    setItem: (c: string, v: string) => void dados.set(c, v),
  } as Storage;
}

function guardaQuebrada(): Storage {
  const lancar = () => {
    throw new Error('janela privada');
  };
  return {
    length: 0,
    clear: lancar,
    getItem: lancar,
    key: lancar,
    removeItem: lancar,
    setItem: lancar,
  } as unknown as Storage;
}

const URL_A = 'https://calendar.google.com/calendar/ical/a/private-1/basic.ics';
const URL_B = 'https://calendar.google.com/calendar/ical/b/private-2/basic.ics';

const guardada = (url: string, buscadoEm: string): AgendaGuardada => ({
  url,
  texto: 'BEGIN:VCALENDAR\r\nEND:VCALENDAR',
  buscadoEm,
});

describe('o cache', () => {
  it('guarda e devolve', () => {
    const guarda = guardaFalsa();
    const item = guardada(URL_A, '2026-09-17T12:00:00.000Z');
    gravarCache(guarda, item);
    expect(lerCache(guarda, URL_A)).toEqual(item);
  });

  it('não serve a agenda de outro endereço', () => {
    // Colar a agenda do trabalho mostraria a de casa até o próximo rebusque.
    const guarda = guardaFalsa();
    gravarCache(guarda, guardada(URL_A, '2026-09-17T12:00:00.000Z'));
    expect(lerCache(guarda, URL_B)).toBeNull();
  });

  it('cache vazio ou corrompido devolve nulo em vez de quebrar', () => {
    expect(lerCache(guardaFalsa(), URL_A)).toBeNull();
    expect(lerCache(guardaFalsa({ 'msl-agenda-externa': 'não é json' }), URL_A)).toBeNull();
  });

  it('armazenamento que se recusa a funcionar não derruba o calendário', () => {
    // Janela privada, cota estourada. Nada disso é motivo para não abrir.
    expect(() => lerCache(guardaQuebrada(), URL_A)).not.toThrow();
    expect(lerCache(guardaQuebrada(), URL_A)).toBeNull();
    expect(() => gravarCache(guardaQuebrada(), guardada(URL_A, 'x'))).not.toThrow();
    expect(() => limparCache(guardaQuebrada())).not.toThrow();
  });

  it('limpar apaga de verdade', () => {
    const guarda = guardaFalsa();
    gravarCache(guarda, guardada(URL_A, '2026-09-17T12:00:00.000Z'));
    limparCache(guarda);
    expect(lerCache(guarda, URL_A)).toBeNull();
  });
});

describe('quando rebuscar', () => {
  const agora = new Date('2026-09-17T12:00:00.000Z');
  const hAtras = (minutos: number) =>
    new Date(agora.getTime() - minutos * 60_000).toISOString();

  it('sem cache, rebusca', () => {
    expect(estaVelha(null, agora)).toBe(true);
  });

  it('recém-buscada não rebusca', () => {
    expect(estaVelha(guardada(URL_A, hAtras(1)), agora)).toBe(false);
  });

  it('passado o prazo, rebusca', () => {
    expect(estaVelha(guardada(URL_A, hAtras(MINUTOS_ATE_REBUSCAR + 1)), agora)).toBe(true);
  });

  it('instante ilegível conta como velha', () => {
    // Rebuscar é barato; mostrar dado de origem desconhecida não é.
    expect(estaVelha(guardada(URL_A, 'ontem à noite'), agora)).toBe(true);
  });

  it('data no futuro, de relógio errado, também rebusca', () => {
    expect(estaVelha(guardada(URL_A, hAtras(-500)), agora)).toBe(false);
  });
});

describe('a busca', () => {
  it('manda o token e o endereço, e devolve o texto', async () => {
    const chamadas: [string, RequestInit | undefined][] = [];
    const buscar = vi.fn(async (u: string, o?: RequestInit) => {
      chamadas.push([u, o]);
      return new Response(JSON.stringify({ texto: 'ICAL', buscadoEm: '2026-09-17T12:00:00.000Z' }));
    }) as unknown as typeof fetch;

    const resultado = await buscarAgenda(URL_A, 'tok', buscar);

    expect(resultado).toEqual({ url: URL_A, texto: 'ICAL', buscadoEm: '2026-09-17T12:00:00.000Z' });
    expect(chamadas[0][0]).toBe('/api/agenda');
    expect((chamadas[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(String(chamadas[0][1]?.body))).toEqual({ url: URL_A });
  });

  it('sem token, não inventa cabeçalho', async () => {
    const chamadas: RequestInit[] = [];
    const buscar = (async (_u: string, o: RequestInit) => {
      chamadas.push(o);
      return new Response(JSON.stringify({ texto: '' }));
    }) as unknown as typeof fetch;

    await buscarAgenda(URL_A, null, buscar);
    expect((chamadas[0].headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('erro do servidor vira a mensagem que o servidor mandou', async () => {
    const buscar = (async () =>
      new Response(JSON.stringify({ erro: 'dominio-nao-permitido', mensagem: 'Só busco do Google.' }), {
        status: 403,
      })) as unknown as typeof fetch;

    await expect(buscarAgenda(URL_A, 'tok', buscar)).rejects.toThrow(ErroDaAgenda);
    await expect(buscarAgenda(URL_A, 'tok', buscar)).rejects.toThrow('Só busco do Google.');
  });

  it('resposta sem texto é erro, e não uma agenda vazia', async () => {
    // Uma agenda vazia apagaria os compromissos da tela como se não houvesse
    // nenhum. Melhor dizer que falhou e deixar o cache velho no lugar.
    const buscar = (async () => new Response(JSON.stringify({ buscadoEm: 'x' }))) as unknown as typeof fetch;
    await expect(buscarAgenda(URL_A, 'tok', buscar)).rejects.toThrow(ErroDaAgenda);
  });

  it('corpo que não é json vira erro com mensagem legível', async () => {
    const buscar = (async () => new Response('<html>erro</html>', { status: 500 })) as unknown as typeof fetch;
    await expect(buscarAgenda(URL_A, 'tok', buscar)).rejects.toThrow('Não consegui buscar a agenda.');
  });
});
