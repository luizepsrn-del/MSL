import { serializar, desserializar } from './repositorio';
import type { Banco } from './esquema';

/**
 * O cliente da sincronização.
 *
 * Fala com `/api` e guarda o token da sessão. Recebe `fetch` e o armazenamento
 * por parâmetro para poder ser testado sem rede e sem navegador — a mesma
 * ideia do `Repositorio` e do `Armazem`.
 *
 * O token mora em `localStorage`, fora do banco. Se morasse dentro, viajaria
 * no arquivo exportado, e restaurar um backup num aparelho emprestado daria a
 * ele a sua sessão.
 */

export interface Conta {
  id: string;
  email: string;
  criadoEm: string;
}

export interface SessaoDeAparelho {
  token: string;
  aparelho: string;
  criadaEm: string;
  atual: boolean;
}

/** O que a tela mostra. */
export interface Estado {
  conta: Conta | null;
  ultimaEm: string | null;
  sincronizando: boolean;
  /** mensagem em português, já pronta para a tela */
  erro: string | null;
}

export class ErroDaSincronia extends Error {
  constructor(
    mensagem: string,
    readonly sessaoMorreu = false,
  ) {
    super(mensagem);
    this.name = 'ErroDaSincronia';
  }
}

const CHAVE_TOKEN = 'msl-sessao';
const CHAVE_CONTA = 'msl-conta';
const CHAVE_ULTIMA = 'msl-sincronizado-em';

/** O mínimo de `localStorage` que este cliente usa. */
export interface Guarda {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
  removeItem(chave: string): void;
}

/**
 * Como o aparelho se apresenta na lista de sessões.
 *
 * Só para eu reconhecer qual é qual quando for revogar. Não identifica nada
 * nem é usado para decidir coisa alguma.
 */
export function nomeDoAparelho(agente: string): string {
  if (/iPhone/i.test(agente)) return 'iPhone';
  if (/iPad/i.test(agente)) return 'iPad';
  if (/Android/i.test(agente)) return 'Android';
  if (/Macintosh|Mac OS/i.test(agente)) return 'Mac';
  if (/Windows/i.test(agente)) return 'Windows';
  return 'Aparelho';
}

export class ClienteSincronia {
  constructor(
    private guarda: Guarda,
    private buscar: typeof fetch = fetch,
    private aparelho = 'Aparelho',
    private base = '',
  ) {}

  get token(): string | null {
    return this.guarda.getItem(CHAVE_TOKEN);
  }

  get conta(): Conta | null {
    const guardada = this.guarda.getItem(CHAVE_CONTA);
    if (!guardada) return null;
    try {
      return JSON.parse(guardada) as Conta;
    } catch {
      return null;
    }
  }

  get ultimaEm(): string | null {
    return this.guarda.getItem(CHAVE_ULTIMA);
  }

  private guardarEntrada(token: string, conta: Conta) {
    this.guarda.setItem(CHAVE_TOKEN, token);
    this.guarda.setItem(CHAVE_CONTA, JSON.stringify(conta));
  }

  private esquecer() {
    this.guarda.removeItem(CHAVE_TOKEN);
    this.guarda.removeItem(CHAVE_CONTA);
    this.guarda.removeItem(CHAVE_ULTIMA);
  }

  private async pedir(caminho: string, opcoes: RequestInit = {}): Promise<Response> {
    const token = this.token;
    let resposta: Response;
    try {
      resposta = await this.buscar(`${this.base}/api/${caminho}`, {
        ...opcoes,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...opcoes.headers,
        },
      });
    } catch {
      // Sem rede não é falha do sistema: é o avião, o metrô, o elevador.
      throw new ErroDaSincronia('Sem conexão. O que você fez está salvo aqui e sincroniza depois.');
    }

    if (resposta.status === 401) {
      this.esquecer();
      throw new ErroDaSincronia('Sua sessão terminou. Entre de novo.', true);
    }
    return resposta;
  }

  private async mensagemDe(resposta: Response): Promise<string> {
    try {
      const corpo = (await resposta.json()) as { mensagem?: string };
      return corpo.mensagem ?? 'Não deu para completar. Tente de novo.';
    } catch {
      return 'Não deu para completar. Tente de novo.';
    }
  }

  async cadastrar(email: string, senha: string): Promise<Conta> {
    return this.abrirSessao('cadastro', email, senha);
  }

  async entrar(email: string, senha: string): Promise<Conta> {
    return this.abrirSessao('entrar', email, senha);
  }

  private async abrirSessao(caminho: string, email: string, senha: string): Promise<Conta> {
    const resposta = await this.pedir(caminho, {
      method: 'POST',
      body: JSON.stringify({ email, senha, aparelho: this.aparelho }),
    });
    if (!resposta.ok) throw new ErroDaSincronia(await this.mensagemDe(resposta));

    const { token, usuario } = (await resposta.json()) as { token: string; usuario: Conta };
    this.guardarEntrada(token, usuario);
    return usuario;
  }

  async sair(): Promise<void> {
    try {
      await this.pedir('sair', { method: 'POST' });
    } catch {
      // Se o servidor não responder, a sessão fica aberta lá e some no prazo.
      // Esquecer aqui é o que importa para quem está com o aparelho na mão.
    }
    this.esquecer();
  }

  /**
   * Manda o banco daqui e recebe o banco junto.
   *
   * Devolve `null` quando não há conta: sem sessão não há o que sincronizar, e
   * isso não é erro — é o estado normal de quem nunca entrou.
   */
  async sincronizar(banco: Banco, agora = new Date()): Promise<Banco | null> {
    if (!this.token) return null;

    const resposta = await this.pedir('sincronizar', {
      method: 'POST',
      // Pelo serializador do repositório, e não `JSON.stringify` cru: é ele
      // que decide o formato que o resto do sistema sabe ler.
      body: `{"banco":${serializar(banco)}}`,
    });
    if (!resposta.ok) throw new ErroDaSincronia(await this.mensagemDe(resposta));

    const { banco: junto } = (await resposta.json()) as { banco: unknown };
    this.guarda.setItem(CHAVE_ULTIMA, agora.toISOString());
    return desserializar(JSON.stringify(junto));
  }

  async sessoes(): Promise<SessaoDeAparelho[]> {
    const resposta = await this.pedir('sessoes');
    if (!resposta.ok) throw new ErroDaSincronia(await this.mensagemDe(resposta));
    const { sessoes } = (await resposta.json()) as { sessoes: SessaoDeAparelho[] };
    return sessoes;
  }

  async revogar(token: string): Promise<void> {
    const resposta = await this.pedir('sessoes', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    });
    if (!resposta.ok) throw new ErroDaSincronia(await this.mensagemDe(resposta));
  }
}
