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
    signal: AbortSignal.timeout(LIMITE_DE_ESPERA_MS),
  });

  const dados = (await resposta.json().catch(() => ({}))) as T & { mensagem?: string; erro?: string };
  if (!resposta.ok) {
    throw new ErroDoInstagramNoCliente(
      dados.mensagem ?? 'Não consegui falar com o Instagram.',
      resposta.status,
      typeof dados.erro === 'string' ? dados.erro : undefined,
    );
  }
  return dados;
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

export function useInstagram(): Instagram {
  const [estado, setEstado] = React.useState<EstadoDoInstagram>('carregando');
  const [dados, setDados] = React.useState<DadosDoInstagram>();
  const [erro, setErro] = React.useState<string>();
  const [atualizando, setAtualizando] = React.useState(false);

  const ler = React.useCallback(async (forcar: boolean) => {
    setAtualizando(true);
    try {
      const lidos = await falarComInstagram<DadosDoInstagram>(
        forcar ? '/api/instagram?atualizar=1' : '/api/instagram',
      );
      setDados(lidos);
      setErro(undefined);
      setEstado('pronto');
    } catch (e) {
      const situacao = situacaoDoErro(e);
      setErro(e instanceof Error ? e.message : String(e));
      setEstado(situacao);
      if (situacao !== 'erro') setDados(undefined);
    } finally {
      setAtualizando(false);
    }
  }, []);

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
