import React from 'react';
import type { DadosDoInstagram } from '../dominio/instagram';

/**
 * O Instagram, do lado do aplicativo.
 *
 * Nada daqui vai para o banco: os números são lidos do servidor a cada visita
 * à tela (que por sua vez guarda uma hora de cache). O que muda o banco é só
 * ligar uma peça a um post, e isso passa pelo `editarPeca` de sempre.
 */

/**
 * O método de cada rota. A volta da Meta (`/api/instagram-callback`) não está
 * aqui de propósito: quem chega nela é o navegador, nunca um `fetch`.
 */
export const METODO_INSTAGRAM: Record<string, 'GET' | 'POST'> = {
  '/api/instagram': 'GET',
  '/api/instagram-estado': 'GET',
  '/api/instagram-conectar': 'POST',
  '/api/instagram-conta': 'POST',
  '/api/instagram-desconectar': 'POST',
  '/api/instagram-referencia': 'GET',
  '/api/instagram-gerar': 'POST',
};

const LIMITE_DE_ESPERA_MS = 45_000;

export class ErroDoInstagramNoCliente extends Error {
  readonly estado: number;
  readonly codigo?: string;
  constructor(mensagem: string, estado: number, codigo?: string) {
    super(mensagem);
    this.name = 'ErroDoInstagramNoCliente';
    this.estado = estado;
    this.codigo = codigo;
  }
}

const sessao = (): string | null =>
  typeof window === 'undefined' ? null : window.localStorage.getItem('msl-sessao');

export async function falarComInstagram<T>(
  caminho: string,
  corpo?: unknown,
  buscar: typeof fetch = fetch,
  esperaMs: number = LIMITE_DE_ESPERA_MS,
): Promise<T> {
  const metodo = METODO_INSTAGRAM[caminho.split('?')[0]] ?? 'POST';
  const temCorpo = metodo !== 'GET';
  const acesso = sessao();

  const resposta = await buscar(caminho, {
    method: metodo,
    headers: {
      ...(temCorpo ? { 'Content-Type': 'application/json' } : {}),
      ...(acesso ? { Authorization: `Bearer ${acesso}` } : {}),
    },
    body: temCorpo ? JSON.stringify(corpo ?? {}) : undefined,
    signal: AbortSignal.timeout(esperaMs),
  });

  const lido = await resposta.json().then(
    (j: unknown) => ({ ok: true as const, j }),
    () => ({ ok: false as const }),
  );
  if (!lido.ok || typeof lido.j !== 'object' || lido.j === null) {
    // Não é JSON: a rota não existe neste endereço e quem respondeu foi a
    // página do app, ou algo no caminho cortou a resposta. Aceitar `{}` como
    // dado faria a tela ler `perfil.usuario` de nada e cair inteira.
    throw new ErroDoInstagramNoCliente(
      'O servidor respondeu algo que não entendi.',
      resposta.status,
      'resposta-invalida',
    );
  }
  const dados = lido.j as T & { mensagem?: string; erro?: string };
  if (!resposta.ok) {
    throw new ErroDoInstagramNoCliente(
      dados.mensagem ?? 'Não consegui falar com o Instagram.',
      resposta.status,
      typeof dados.erro === 'string' ? dados.erro : undefined,
    );
  }
  return dados;
}

/** Só passa por dado o que tem perfil e lista de posts. */
export function dadosValidos(d: unknown): d is DadosDoInstagram {
  if (typeof d !== 'object' || d === null) return false;
  const x = d as Partial<DadosDoInstagram>;
  return (
    typeof x.perfil === 'object' &&
    x.perfil !== null &&
    typeof x.perfil.usuario === 'string' &&
    Array.isArray(x.posts)
  );
}

export type EstadoDoInstagram =
  | 'carregando'
  | 'desconectado'
  | 'sem-conta'
  | 'acesso-perdido'
  | 'erro'
  | 'pronto';

/**
 * O que um erro quer dizer para a tela.
 *
 * Só o `token-recusado` pede reconexão. Um 401 de `sessao-invalida` é a sessão
 * do MSL vencida — reconectar a Meta não a conserta, e mandar a pessoa fazer
 * isso seria mandá-la para o lugar errado.
 */
export function situacaoDoErro(erro: unknown): 'desconectado' | 'sem-conta' | 'acesso-perdido' | 'erro' {
  if (!(erro instanceof ErroDoInstagramNoCliente)) return 'erro';
  if (erro.codigo === 'nao-conectado') return 'desconectado';
  if (erro.codigo === 'sem-conta') return 'sem-conta';
  if (erro.codigo === 'token-recusado' && erro.estado === 401) return 'acesso-perdido';
  return 'erro';
}

/** O estado da conexão, como `/api/instagram-estado` o devolve. */
export function situacaoDaConexao(e: { conectado: boolean; contaId: string | null }): 'desconectado' | 'sem-conta' | 'pronto' {
  if (!e.conectado) return 'desconectado';
  return e.contaId ? 'pronto' : 'sem-conta';
}

export interface Instagram {
  estado: EstadoDoInstagram;
  dados?: DadosDoInstagram;
  erro?: string;
  atualizando: boolean;
  atualizar(): Promise<void>;
  conectar(): Promise<void>;
  desconectar(): Promise<void>;
  definirConta(contaId: string): Promise<void>;
}

/*
 * Uma leitura só, dividida entre as telas. O Início e a aba Instagram querem
 * os mesmos dados; sem isto, abrir os dois em seguida com o cache do servidor
 * frio dispararia duas leituras inteiras na Meta (centenas de chamadas cada).
 * A guardada vale alguns minutos; "Atualizar" passa por cima dela.
 */
const FRESCA_MS = 5 * 60_000;
let emCurso: Promise<unknown> | null = null;
let guardada: { dados: DadosDoInstagram; em: number } | null = null;

function lerDadosCompartilhado(forcar: boolean): Promise<unknown> {
  if (!forcar && guardada && Date.now() - guardada.em < FRESCA_MS) return Promise.resolve(guardada.dados);
  if (!forcar && emCurso) return emCurso;
  const leitura = falarComInstagram<unknown>(forcar ? '/api/instagram?atualizar=1' : '/api/instagram');
  emCurso = leitura;
  void leitura.finally(() => {
    if (emCurso === leitura) emCurso = null;
  }).catch(() => undefined);
  return leitura;
}

/**
 * `soEstado`: só pergunta ao servidor se há conexão e conta — é o que Ajustes
 * precisa. A leitura inteira (perfil, posts e métricas) é da aba Instagram;
 * fazê-la para desenhar um cartão de configuração era pagar dezenas de
 * chamadas à Meta para mostrar uma linha.
 */
export function useInstagram({ soEstado = false }: { soEstado?: boolean } = {}): Instagram {
  const [estado, setEstado] = React.useState<EstadoDoInstagram>('carregando');
  const [dados, setDados] = React.useState<DadosDoInstagram>();
  const [erro, setErro] = React.useState<string>();
  const [atualizando, setAtualizando] = React.useState(false);

  const ler = React.useCallback(async (forcar: boolean) => {
    setAtualizando(true);
    try {
      if (soEstado) {
        const e = await falarComInstagram<{ conectado: boolean; contaId: string | null }>('/api/instagram-estado');
        setErro(undefined);
        setEstado(situacaoDaConexao(e));
        return;
      }
      const lidos = await lerDadosCompartilhado(forcar);
      if (!dadosValidos(lidos)) {
        throw new ErroDoInstagramNoCliente('A resposta do servidor veio incompleta.', 200, 'resposta-invalida');
      }
      guardada = { dados: lidos, em: Date.now() };
      setDados(lidos);
      setErro(undefined);
      setEstado('pronto');
    } catch (e) {
      if (!soEstado) guardada = null;
      const situacao = situacaoDoErro(e);
      setErro(e instanceof Error ? e.message : String(e));
      setEstado(situacao);
      if (situacao !== 'erro') setDados(undefined);
    } finally {
      setAtualizando(false);
    }
  }, [soEstado]);

  React.useEffect(() => {
    void ler(false);
  }, [ler]);

  const conectar = React.useCallback(async () => {
    try {
      const { url } = await falarComInstagram<{ url: string }>('/api/instagram-conectar');
      window.location.assign(url);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const desconectar = React.useCallback(async () => {
    try {
      await falarComInstagram('/api/instagram-desconectar');
      guardada = null;
      setDados(undefined);
      setEstado('desconectado');
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const definirConta = React.useCallback(
    async (contaId: string) => {
      try {
        await falarComInstagram('/api/instagram-conta', { contaId });
        await ler(true);
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
      }
    },
    [ler],
  );

  const atualizar = React.useCallback(() => ler(true), [ler]);

  return { estado, dados, erro, atualizando, atualizar, conectar, desconectar, definirConta };
}
