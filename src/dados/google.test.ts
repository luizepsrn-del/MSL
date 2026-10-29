import { describe, it, expect } from 'vitest';
import {
  paraEspelhar,
  lerCache,
  gravarCache,
  limparCache,
  estaVelho,
  falar,
  METODO,
  MINUTOS_ATE_RESSINCRONIZAR,
  compromissosDaAgenda,
  corpoDoEvento,
  cacheFicouVelho,
  depoisDeMexer,
  mexerNoEventoDoGoogle,
  perdeuOAcesso,
} from './google';
import { bancoVazio, type Banco, type Tarefa, type Peca } from './esquema';
import { responder, interpretar, type Efeito } from '../dominio/agente';
import type { EventoParaTela } from '../dominio/google';
import { readFileSync } from 'node:fs';

const JANELA = { de: '2026-09-01', ate: '2026-12-31' };

const tarefa = (dados: Partial<Tarefa> & { id: string }): Tarefa => ({
  criadoEm: 'c',
  alteradoEm: 'a',
  titulo: dados.id,
  contexto: 'profissional',
  ...dados,
});

const peca = (dados: Partial<Peca> & { id: string }): Peca => ({
  criadoEm: 'c',
  alteradoEm: 'a',
  titulo: dados.id,
  tipo: 'post',
  estado: 'rascunho',
  contexto: 'profissional',
  corpo: '',
  ...dados,
});

const banco = (partes: Partial<Banco>): Banco => ({ ...bancoVazio(), ...partes });

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
  return { length: 0, clear: lancar, getItem: lancar, key: lancar, removeItem: lancar, setItem: lancar } as unknown as Storage;
}

describe('o que vai para o Google', () => {
  it('tarefa com prazo, com e sem hora', () => {
    const b = banco({
      tarefas: [
        tarefa({ id: 'comHora', prazo: '2026-09-17', hora: '14:00' }),
        tarefa({ id: 'semHora', prazo: '2026-09-18' }),
      ],
    });
    expect(paraEspelhar(b, JANELA.de, JANELA.ate)).toEqual([
      { chave: 'tarefa:comHora', titulo: 'comHora', dia: '2026-09-17', hora: '14:00', alteradoEm: 'a' },
      { chave: 'tarefa:semHora', titulo: 'semHora', dia: '2026-09-18', hora: undefined, alteradoEm: 'a' },
    ]);
  });

  it('tarefa sem prazo não vai: não tem onde cair na agenda', () => {
    expect(paraEspelhar(banco({ tarefas: [tarefa({ id: 'solta' })] }), JANELA.de, JANELA.ate)).toEqual([]);
  });

  it('tarefa concluída sai do Google sozinha', () => {
    // Ela deixa de ser espelhada, e o plano apaga o espelho sem dono. Uma
    // tarefa feita na agenda é ruído.
    const b = banco({
      tarefas: [tarefa({ id: 'feita', prazo: '2026-09-17', concluidaEm: '2026-09-17T12:00:00Z' })],
    });
    expect(paraEspelhar(b, JANELA.de, JANELA.ate)).toEqual([]);
  });

  it('peça com data vai; semente e publicada não', () => {
    const b = banco({
      pecas: [
        peca({ id: 'pronta', publicarEm: '2026-09-20' }),
        peca({ id: 'semente', estado: 'semente', publicarEm: '2026-09-20' }),
        peca({ id: 'saiu', publicarEm: '2026-09-20', publicadoEm: '2026-09-20T12:00:00Z' }),
        peca({ id: 'semData' }),
      ],
    });
    expect(paraEspelhar(b, JANELA.de, JANELA.ate).map((i) => i.chave)).toEqual(['peca:pronta']);
  });

  it('rotina nunca vai — a agenda viraria a rotina inteira', () => {
    const b = banco({
      rotinas: [
        {
          id: 'r1',
          criadoEm: 'c',
          alteradoEm: 'a',
          titulo: 'Treinar',
          contexto: 'pessoal',
          icone: 'dumbbell',
          inicioEm: '2026-01-01',
          arquivada: false,
          recorrencia: { tipo: 'diaria' },
          hora: '07:00',
        },
      ],
    });
    expect(paraEspelhar(b, JANELA.de, JANELA.ate)).toEqual([]);
  });

  it('o que está fora da janela fica de fora', () => {
    const b = banco({
      tarefas: [
        tarefa({ id: 'antes', prazo: '2026-08-01' }),
        tarefa({ id: 'dentro', prazo: '2026-09-17' }),
        tarefa({ id: 'depois', prazo: '2027-06-01' }),
      ],
    });
    expect(paraEspelhar(b, JANELA.de, JANELA.ate).map((i) => i.chave)).toEqual(['tarefa:dentro']);
  });

  it('as bordas da janela contam', () => {
    const b = banco({
      tarefas: [tarefa({ id: 'inicio', prazo: JANELA.de }), tarefa({ id: 'fim', prazo: JANELA.ate })],
    });
    expect(paraEspelhar(b, JANELA.de, JANELA.ate)).toHaveLength(2);
  });

  it('a ordem é estável, porque o servidor corta no teto', () => {
    // Sem ordem fixa, o que fica de fora do teto muda a cada chamada e a mesma
    // tarefa nunca chegaria a ser espelhada.
    const tarefas = [
      tarefa({ id: 'c', prazo: '2026-09-17' }),
      tarefa({ id: 'a', prazo: '2026-09-17' }),
      tarefa({ id: 'b', prazo: '2026-09-17' }),
    ];
    const uma = paraEspelhar(banco({ tarefas }), JANELA.de, JANELA.ate);
    const outra = paraEspelhar(banco({ tarefas: [...tarefas].reverse() }), JANELA.de, JANELA.ate);
    expect(uma).toEqual(outra);
  });
});

describe('o cache dos eventos', () => {
  const guardado = { eventos: [{ id: 'a' }], em: '2026-09-17T12:00:00.000Z' };

  it('guarda e devolve', () => {
    const guarda = guardaFalsa();
    gravarCache(guarda, guardado);
    expect(lerCache(guarda)).toEqual(guardado);
  });

  it('vazio ou corrompido devolve nada', () => {
    expect(lerCache(guardaFalsa())).toBeNull();
    expect(lerCache(guardaFalsa({ 'msl-google-eventos': 'nada disso' }))).toBeNull();
  });

  it('armazenamento que se recusa a funcionar não derruba o calendário', () => {
    expect(() => lerCache(guardaQuebrada())).not.toThrow();
    expect(() => gravarCache(guardaQuebrada(), guardado)).not.toThrow();
    expect(() => limparCache(guardaQuebrada())).not.toThrow();
  });

  it('limpar apaga', () => {
    const guarda = guardaFalsa();
    gravarCache(guarda, guardado);
    limparCache(guarda);
    expect(lerCache(guarda)).toBeNull();
  });

  it('sabe quando está velho', () => {
    const agora = new Date('2026-09-17T12:00:00.000Z');
    const hAtras = (min: number) => new Date(agora.getTime() - min * 60_000).toISOString();

    expect(estaVelho(null, agora)).toBe(true);
    expect(estaVelho({ eventos: [], em: hAtras(1) }, agora)).toBe(false);
    expect(estaVelho({ eventos: [], em: hAtras(MINUTOS_ATE_RESSINCRONIZAR + 1) }, agora)).toBe(true);
    // Instante ilegível conta como velho: ressincronizar é barato.
    expect(estaVelho({ eventos: [], em: 'ontem' }, agora)).toBe(true);
  });
});

describe('o método de cada rota', () => {
  it('bate com o que a função da Vercel exporta', () => {
    // O contrário já custou: o cliente mandava POST em `/api/google-estado`,
    // que só exporta GET, e a resposta era 405. A interceptação do Playwright
    // responde a qualquer método, então quem pegou foi o endereço publicado.
    for (const [caminho, metodo] of Object.entries(METODO)) {
      const arquivo = `api/${caminho.replace('/api/', '')}.ts`;
      const fonte = readFileSync(arquivo, 'utf8');
      expect(fonte, arquivo).toContain(`export const ${metodo} =`);
    }
  });

  it('cobre todas as rotas do Google que existem em api/', () => {
    // Rota nova sem entrada na tabela cairia no POST padrão, calada.
    const daPasta = readFileSync('src/servidor/api.test.ts', 'utf8');
    for (const nome of ['estado', 'conectar', 'sincronizar', 'desconectar', 'evento']) {
      expect(daPasta).toContain(`'google-${nome}.ts'`);
      expect(METODO).toHaveProperty(`/api/google-${nome}`);
    }
  });
});

/**
 * Empresta uma `window` ao teste.
 *
 * `async`, e com `await`: a primeira versão era síncrona e o `finally`
 * devolvia a janela antes de a função assíncrona terminar de usá-la.
 */
async function comJanela(f: () => Promise<void>): Promise<void> {
  const original = globalThis.window;
  (globalThis as { window?: unknown }).window = {
    localStorage: { getItem: () => 'tok' } as unknown as Storage,
  };
  try {
    await f();
  } finally {
    (globalThis as { window?: unknown }).window = original;
  }
}

describe('o que vai no pedido', () => {
  it('GET não leva corpo, e POST leva', async () => {
    const pedidos: RequestInit[] = [];
    const buscar = (async (_u: string, o: RequestInit) => {
      pedidos.push(o);
      return new Response(JSON.stringify({ conectado: true }));
    }) as unknown as typeof fetch;

    await comJanela(async () => {
      await falar('/api/google-estado', undefined, buscar);
      await falar('/api/google-sincronizar', { de: 'x' }, buscar);
    });

    expect(pedidos[0].method).toBe('GET');
    expect(pedidos[0].body).toBeUndefined();
    expect(pedidos[1].method).toBe('POST');
    expect(JSON.parse(String(pedidos[1].body))).toEqual({ de: 'x' });
  });

  it('a sessão vai no cabeçalho, nos dois', async () => {
    const pedidos: RequestInit[] = [];
    const buscar = (async (_u: string, o: RequestInit) => {
      pedidos.push(o);
      return new Response('{}');
    }) as unknown as typeof fetch;

    await comJanela(async () => {
      await falar('/api/google-estado', undefined, buscar);
      await falar('/api/google-conectar', undefined, buscar);
    });

    for (const pedido of pedidos) {
      expect((pedido.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    }
  });
});

/* ── A escolha da fonte, pura ────────────────────────────────────────────── */

describe('de onde vêm os compromissos do agente', () => {
  const HOJE = '2026-09-17';

  const doGoogle = (extras: Partial<EventoParaTela> = {}): EventoParaTela => ({
    chave: 'g1@2026-09-17',
    uid: 'g1',
    titulo: 'Reunião de equipe',
    dia: HOJE,
    hora: '10:00',
    diaInteiro: false,
    souOrganizador: true,
    ...extras,
  });

  const conectado = (...eventos: EventoParaTela[]) => ({ conectado: true, eventos });
  const desconectado = (...eventos: EventoParaTela[]) => ({ conectado: false, eventos });

  const doIcal = (extras = {}) => ({
    chave: 'abc@2026-09-17',
    uid: 'abc',
    titulo: 'Reunião de equipe',
    dia: HOJE,
    hora: '10:00',
    diaInteiro: false,
    ...extras,
  });
  const assinatura = { agenda: { eventos: [doIcal()] } };

  const dizer = (frase: string, fora: ReturnType<typeof compromissosDaAgenda>) =>
    responder(bancoVazio(), interpretar(frase, HOJE), HOJE, fora);

  it('o ramo do Google marca mexivel; o da assinatura não', () => {
    expect(compromissosDaAgenda(conectado(doGoogle()), assinatura)[0].mexivel).toBe(true);
    expect(compromissosDaAgenda(desconectado(), assinatura)[0].mexivel).toBeUndefined();
  });

  it('conectado, o Google manda e a assinatura não entra, nem para completar', () => {
    const fora = compromissosDaAgenda(conectado(doGoogle({ titulo: 'Do Google' })), assinatura);
    expect(fora.map((c) => c.titulo)).toEqual(['Do Google']);
  });

  it('conectado e sem nenhum evento, a lista é vazia: a assinatura não toma o lugar', () => {
    expect(compromissosDaAgenda(conectado(), assinatura)).toEqual([]);
  });

  it('desconectado, vale a assinatura, ainda que haja eventos velhos do Google na mão', () => {
    const fora = compromissosDaAgenda(desconectado(doGoogle({ titulo: 'Velho' })), assinatura);
    expect(fora.map((c) => c.titulo)).toEqual(['Reunião de equipe']);
  });

  it('sem Google e sem assinatura, não há compromisso', () => {
    expect(compromissosDaAgenda(desconectado(), { agenda: null })).toEqual([]);
  });

  it('leva ao domínio o que ele precisa para apontar o evento certo', () => {
    const [c] = compromissosDaAgenda(
      conectado(
        doGoogle({
          uid: 'xyz',
          titulo: 'Viagem',
          dia: '2026-09-18',
          hora: undefined,
          diaInteiro: true,
          souOrganizador: false,
          desde: '2026-09-17',
          ate: '2026-09-20',
        }),
      ),
      assinatura,
    );
    expect(c).toMatchObject({
      uid: 'xyz',
      titulo: 'Viagem',
      dia: '2026-09-18',
      diaInteiro: true,
      souOrganizador: false,
      desde: '2026-09-17',
      ate: '2026-09-20',
    });
  });

  describe('mexivel é derivado, e a diferença entre apagar e alterar mora no domínio', () => {
    it('sem id não há como apontar o evento, e então ele não é mexível', () => {
      expect(compromissosDaAgenda(conectado(doGoogle({ uid: '' })), assinatura)[0].mexivel).toBe(false);
    });

    it('organizador: apaga, adia e renomeia', () => {
      const fora = compromissosDaAgenda(conectado(doGoogle()), assinatura);
      expect(dizer('cancela a reunião', fora).efeito).toMatchObject({ acao: { tipo: 'apagar' } });
      expect(dizer('adiar a reunião para sexta', fora).efeito).toMatchObject({ acao: { tipo: 'mover' } });
      expect(dizer('renomeia a reunião para Call', fora).efeito).toMatchObject({
        acao: { tipo: 'renomear' },
      });
    });

    it('convidado: só apaga, porque o Google recusa a alteração dele', () => {
      const fora = compromissosDaAgenda(conectado(doGoogle({ souOrganizador: false })), assinatura);
      expect(dizer('cancela a reunião', fora).efeito).toMatchObject({
        souOrganizador: false,
        acao: { tipo: 'apagar' },
      });
      expect(dizer('adiar a reunião para sexta', fora).efeito).toBeUndefined();
      expect(dizer('renomeia a reunião para Call', fora).efeito).toBeUndefined();
      expect(dizer('muda a reunião para 15h', fora).efeito).toBeUndefined();
    });

    it('a assinatura iCal nunca é mexível, nem para apagar: lá não existe caminho de escrita', () => {
      const fora = compromissosDaAgenda(desconectado(), assinatura);
      for (const frase of ['cancela a reunião', 'adiar a reunião para sexta', 'renomeia a reunião para Call']) {
        const r = dizer(frase, fora);
        expect(r.efeito, frase).toBeUndefined();
        expect(r.titulo, frase).toBe('Essa é do Google');
      }
    });

    it('a assinatura recusa mesmo trazendo uid: o iCal usa o título quando falta o UID', () => {
      const fora = compromissosDaAgenda(desconectado(), {
        agenda: { eventos: [doIcal({ uid: 'Reunião de equipe' })] },
      });
      expect(dizer('cancela a reunião', fora).efeito).toBeUndefined();
    });

    it('um evento de vários dias com uma cópia só na janela diz a faixa inteira ao apagar', () => {
      const fora = compromissosDaAgenda(
        conectado(
          doGoogle({
            titulo: 'Viagem',
            dia: '2026-09-19',
            hora: undefined,
            diaInteiro: true,
            desde: '2026-09-17',
            ate: '2026-09-21',
          }),
        ),
        assinatura,
      );
      const lista = dizer('cancela a viagem', fora).blocos.find((b) => b.tipo === 'lista');
      expect(lista && lista.tipo === 'lista' ? lista.itens[0].detalhe : '').toBe('Hoje a Segunda, 21/09');
    });
  });
});

/* ── Mexer no evento ─────────────────────────────────────────────────────── */

describe('mexer num evento do Google', () => {
  type EfeitoDoEvento = Extract<Efeito, { tipo: 'evento-do-google' }>;
  const efeito = (acao: EfeitoDoEvento['acao']): EfeitoDoEvento => ({
    tipo: 'evento-do-google',
    uid: 'g1',
    titulo: 'Reunião',
    souOrganizador: true,
    acao,
  });

  describe('o que vai no pedido', () => {
    it('apagar leva a ação e o id, e mais nada', () => {
      expect(corpoDoEvento(efeito({ tipo: 'apagar' }))).toEqual({ acao: 'apagar', uid: 'g1' });
    });

    it('renomear leva o nome novo', () => {
      expect(corpoDoEvento(efeito({ tipo: 'renomear', novo: 'Call' }))).toEqual({
        acao: 'renomear',
        uid: 'g1',
        novo: 'Call',
      });
    });

    it('mover leva dia, hora e o fuso em que o dono pensa', () => {
      expect(corpoDoEvento(efeito({ tipo: 'mover', dia: '2026-09-25', hora: '15:00' }))).toEqual({
        acao: 'mover',
        uid: 'g1',
        dia: '2026-09-25',
        hora: '15:00',
        fuso: 'America/Sao_Paulo',
      });
    });

    it('mover sem hora nova não inventa uma', () => {
      const corpo = corpoDoEvento(efeito({ tipo: 'mover', dia: '2026-09-25' }));
      expect(corpo.hora).toBeUndefined();
      expect(corpo.dia).toBe('2026-09-25');
    });
  });

  describe('o que o servidor respondeu', () => {
    const CACHE = { eventos: [], em: '2026-09-17T12:00:00.000Z' };
    const responde = (corpo: unknown, status = 200) =>
      (async () => new Response(JSON.stringify(corpo), { status })) as unknown as typeof fetch;
    const tenta = async (buscar: typeof fetch, guarda: Storage = guardaFalsa()) => {
      gravarCache(guarda, CACHE);
      let resultado;
      await comJanela(async () => {
        resultado = await mexerNoEventoDoGoogle(efeito({ tipo: 'apagar' }), guarda, buscar);
      });
      return { resultado, guarda };
    };

    it('manda para a rota certa, por POST, com a sessão', async () => {
      const vistos: { url: string; init: RequestInit }[] = [];
      const buscar = (async (url: string, init: RequestInit) => {
        vistos.push({ url, init });
        return new Response(JSON.stringify({ feito: true }));
      }) as unknown as typeof fetch;
      await tenta(buscar);
      expect(vistos[0].url).toBe('/api/google-evento');
      expect(vistos[0].init.method).toBe('POST');
      expect((vistos[0].init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
      expect(JSON.parse(String(vistos[0].init.body))).toEqual({ acao: 'apagar', uid: 'g1' });
    });

    it('depois de mexer, o cache de eventos é limpo', async () => {
      const { resultado, guarda } = await tenta(responde({ feito: true }));
      expect(resultado).toEqual({ feito: true });
      expect(lerCache(guarda)).toBeNull();
    });

    it('cada recusa chega com o seu motivo', async () => {
      for (const motivo of ['inexistente', 'sem-permissao', 'desconectado', 'mudou-enquanto-isso', 'e-nosso']) {
        const { resultado } = await tenta(responde({ feito: false, motivo }));
        expect(resultado, motivo).toEqual({ feito: false, motivo });
      }
    });

    it('a cópia local fica velha quando o Google disse que o evento mudou ou sumiu, ou que perdi o acesso', async () => {
      for (const motivo of ['inexistente', 'mudou-enquanto-isso', 'desconectado']) {
        const { guarda } = await tenta(responde({ feito: false, motivo }));
        expect(lerCache(guarda), motivo).toBeNull();
      }
    });

    it('mas nada mudou lá nas outras recusas, e então o cache segue valendo', async () => {
      for (const motivo of ['sem-permissao', 'e-nosso']) {
        const { guarda } = await tenta(responde({ feito: false, motivo }));
        expect(lerCache(guarda), motivo).toEqual(CACHE);
      }
    });

    it('rede caída não é sucesso nem recusa: sem resposta, e o cache segue como estava', async () => {
      const cai = (async () => {
        throw new TypeError('Failed to fetch');
      }) as unknown as typeof fetch;
      const { resultado, guarda } = await tenta(cai);
      expect(resultado).toEqual({ feito: false, motivo: 'indisponivel' });
      expect(lerCache(guarda)).toEqual(CACHE);
    });

    it('erro do servidor também fica sem resposta', async () => {
      const { resultado } = await tenta(responde({ erro: 'x', mensagem: 'Deu ruim.' }, 500));
      expect(resultado).toEqual({ feito: false, motivo: 'indisponivel' });
    });

    it('sessão vencida (401) fica sem resposta, e não vira "feito"', async () => {
      const { resultado } = await tenta(responde({ erro: 'sessao-invalida', mensagem: 'Entre de novo.' }, 401));
      expect(resultado).toEqual({ feito: false, motivo: 'indisponivel' });
    });

    it('resposta que não é nenhuma das duas formas não confirma nada', async () => {
      for (const torta of [{}, { feito: 'true' }, { feito: 1 }, { feito: false }, { feito: false, motivo: 7 }, { motivo: 'inexistente' }, { feito: 'false', motivo: 'inexistente' }, null]) {
        const { resultado, guarda } = await tenta(responde(torta));
        expect(resultado, JSON.stringify(torta)).toEqual({ feito: false, motivo: 'indisponivel' });
        expect(lerCache(guarda), JSON.stringify(torta)).toEqual(CACHE);
      }
    });

    it('janela privada, em que limpar o cache falha, não derruba um sucesso', async () => {
      const { resultado } = await tenta(responde({ feito: true }), guardaQuebrada());
      expect(resultado).toEqual({ feito: true });
    });
  });

  describe('o que fazer depois de mexer', () => {
    it('sucesso: buscar de novo, porque a lista que eu tenho ainda tem o evento como era', () => {
      expect(depoisDeMexer({ feito: true })).toBe('ressincronizar');
    });

    it('o evento sumiu ou mudou: buscar de novo', () => {
      for (const motivo of ['inexistente', 'mudou-enquanto-isso']) {
        expect(depoisDeMexer({ feito: false, motivo }), motivo).toBe('ressincronizar');
      }
    });

    it('perdi o acesso: desconectar, e não buscar de novo com uma credencial que não vale', () => {
      expect(depoisDeMexer({ feito: false, motivo: 'desconectado' })).toBe('desconectar');
    });

    it('nada mudou lá: não mexer em nada', () => {
      for (const motivo of ['sem-permissao', 'e-nosso', 'indisponivel', 'qualquer']) {
        expect(depoisDeMexer({ feito: false, motivo }), motivo).toBe('nada');
      }
    });

    it('concorda com o cache: só fica "nada" quando ele continua valendo', () => {
      for (const r of [{ feito: true as const }, ...['inexistente', 'mudou-enquanto-isso', 'desconectado', 'sem-permissao', 'e-nosso', 'indisponivel'].map((motivo) => ({ feito: false as const, motivo }))]) {
        expect(depoisDeMexer(r) === 'nada', JSON.stringify(r)).toBe(!cacheFicouVelho(r));
      }
    });
  });

  describe('quando a cópia local deixou de valer', () => {
    it('depois de sucesso, sim', () => {
      expect(cacheFicouVelho({ feito: true })).toBe(true);
    });

    it('depois das recusas que dizem que o Google está diferente do que eu tinha, sim', () => {
      for (const motivo of ['inexistente', 'mudou-enquanto-isso', 'desconectado']) {
        expect(cacheFicouVelho({ feito: false, motivo }), motivo).toBe(true);
      }
    });

    it('depois das outras, não', () => {
      for (const motivo of ['sem-permissao', 'e-nosso', 'indisponivel', 'qualquer']) {
        expect(cacheFicouVelho({ feito: false, motivo }), motivo).toBe(false);
      }
    });
  });
});

describe('perder o acesso ao Google', () => {
  const resposta = (estado: number, corpo: unknown) =>
    (async () => new Response(JSON.stringify(corpo), { status: estado })) as typeof fetch;

  /** Pede de verdade pela `falar` e devolve o erro que a tela receberia. */
  async function erroDe(estado: number, corpo: unknown): Promise<unknown> {
    let pego: unknown;
    await comJanela(async () => {
      try {
        await falar('/api/google-sincronizar', {}, resposta(estado, corpo));
      } catch (e) {
        pego = e;
      }
    });
    return pego;
  }

  it('o Google recusar o acesso (401 ou 403 da rota) é perder o acesso', async () => {
    const msg = 'o Google recusou o acesso. Reconecte a agenda em Ajustes.';
    expect(perdeuOAcesso(await erroDe(401, { erro: 'google', mensagem: msg }))).toBe(true);
    expect(perdeuOAcesso(await erroDe(403, { erro: 'google', mensagem: msg }))).toBe(true);
  });

  it('a sessão do MSL vencida NÃO é perder o acesso ao Google', async () => {
    // Também é 401, mas reconectar o Google não resolve: é preciso entrar de novo.
    expect(
      perdeuOAcesso(await erroDe(401, { erro: 'sessao-invalida', mensagem: 'Entre de novo.' })),
    ).toBe(false);
  });

  it('falha do Google ou da rede não é perder o acesso', async () => {
    expect(perdeuOAcesso(await erroDe(502, { erro: 'google', mensagem: 'o Google respondeu 500' }))).toBe(false);
    expect(perdeuOAcesso(new Error('rede'))).toBe(false);
  });
});
