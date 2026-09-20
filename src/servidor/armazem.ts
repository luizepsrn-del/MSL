/**
 * O armazém do servidor.
 *
 * A mesma costura do `Repositorio` do cliente: uma interface estreita, uma
 * implementação em memória para teste e uma de verdade para produção. As
 * funções de conta e de sincronização falam com esta interface e nunca com o
 * Redis — é o que permite testar o fluxo inteiro de cadastro, entrada e junção
 * em Vitest, sem rede e sem banco.
 */

export interface Armazem {
  ler(chave: string): Promise<string | null>;
  gravar(chave: string, valor: string, segundos?: number): Promise<void>;
  apagar(chave: string): Promise<void>;
  /**
   * Grava só se o valor atual for exatamente `esperado` (ou se não existir,
   * quando `esperado` é `null`). Devolve `false` quando outra escrita passou
   * na frente.
   *
   * É o que impede dois aparelhos sincronizando ao mesmo tempo de um apagar o
   * trabalho do outro na janela entre ler e gravar.
   */
  gravarSeIgual(chave: string, esperado: string | null, valor: string): Promise<boolean>;
  /** As chaves com um prefixo. Usado para listar as sessões de uma conta. */
  listar(prefixo: string): Promise<string[]>;
}

/* ── Em memória, para os testes ──────────────────────────────────────────── */

export class ArmazemMemoria implements Armazem {
  private dados = new Map<string, { valor: string; expiraEm?: number }>();
  private agora: () => number;

  /** Injetável para o teste poder envelhecer uma sessão sem esperar. */
  constructor(agora: () => number = () => Date.now()) {
    this.agora = agora;
  }

  private vivo(chave: string): string | null {
    const item = this.dados.get(chave);
    if (!item) return null;
    if (item.expiraEm !== undefined && item.expiraEm <= this.agora()) {
      this.dados.delete(chave);
      return null;
    }
    return item.valor;
  }

  async ler(chave: string) {
    return this.vivo(chave);
  }

  async gravar(chave: string, valor: string, segundos?: number) {
    this.dados.set(chave, {
      valor,
      expiraEm: segundos === undefined ? undefined : this.agora() + segundos * 1000,
    });
  }

  async apagar(chave: string) {
    this.dados.delete(chave);
  }

  async gravarSeIgual(chave: string, esperado: string | null, valor: string) {
    if (this.vivo(chave) !== esperado) return false;
    await this.gravar(chave, valor);
    return true;
  }

  async listar(prefixo: string) {
    return [...this.dados.keys()].filter((c) => c.startsWith(prefixo) && this.vivo(c) !== null);
  }
}

/* ── Redis, em produção ──────────────────────────────────────────────────── */

/**
 * Fala com o Upstash pela API REST, com `fetch` e mais nada.
 *
 * Sem SDK de propósito: é uma chamada HTTP com um array de argumentos, e uma
 * dependência a menos é uma dependência a menos para atualizar e auditar num
 * caminho que carrega a senha e o dado de uma vida inteira.
 */
export class ArmazemRedis implements Armazem {
  private url: string;
  private token: string;

  /**
   * Campos escritos à mão, e não propriedades de parâmetro.
   *
   * `private url: string` no construtor é açúcar que exige transformação, não
   * só remoção de tipos — e o Node se recusa a carregar o arquivo em modo de
   * remoção pura. Escrever à mão custa duas linhas e deixa este módulo
   * carregável por Node puro, que é como eu confiro antes de publicar.
   */
  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  /**
   * As variáveis mudam de nome conforme como o banco foi ligado ao projeto:
   * a Vercel injeta `KV_REST_API_*` e o Upstash direto usa
   * `UPSTASH_REDIS_REST_*`. Aceitar as duas evita uma configuração que falha
   * sem dizer por quê.
   */
  static doAmbiente(ambiente: Record<string, string | undefined>): ArmazemRedis {
    const url = ambiente.KV_REST_API_URL ?? ambiente.UPSTASH_REDIS_REST_URL;
    const token = ambiente.KV_REST_API_TOKEN ?? ambiente.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        'faltam as variáveis do Redis: esperava KV_REST_API_URL e KV_REST_API_TOKEN ' +
          '(ou as UPSTASH_REDIS_REST_*). Ligue o banco ao projeto na aba Storage.',
      );
    }
    return new ArmazemRedis(url, token);
  }

  private async comando<T>(...partes: (string | number)[]): Promise<T> {
    const resposta = await fetch(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(partes),
    });
    if (!resposta.ok) {
      throw new Error(`Redis respondeu ${resposta.status}: ${await resposta.text()}`);
    }
    const { result, error } = (await resposta.json()) as { result: T; error?: string };
    if (error) throw new Error(`Redis: ${error}`);
    return result;
  }

  async ler(chave: string) {
    return this.comando<string | null>('GET', chave);
  }

  async gravar(chave: string, valor: string, segundos?: number) {
    if (segundos === undefined) await this.comando('SET', chave, valor);
    else await this.comando('SET', chave, valor, 'EX', segundos);
  }

  async apagar(chave: string) {
    await this.comando('DEL', chave);
  }

  async gravarSeIgual(chave: string, esperado: string | null, valor: string) {
    // Comparar e gravar precisa ser um passo só: entre um `GET` e um `SET`
    // cabe a sincronização do outro aparelho inteira.
    const script =
      esperado === null
        ? 'if redis.call("GET", KEYS[1]) == false then redis.call("SET", KEYS[1], ARGV[1]); return 1 else return 0 end'
        : 'if redis.call("GET", KEYS[1]) == ARGV[1] then redis.call("SET", KEYS[1], ARGV[2]); return 1 else return 0 end';

    const resultado =
      esperado === null
        ? await this.comando<number>('EVAL', script, 1, chave, valor)
        : await this.comando<number>('EVAL', script, 1, chave, esperado, valor);
    return resultado === 1;
  }

  async listar(prefixo: string) {
    // `SCAN` e não `KEYS`: `KEYS` trava o banco inteiro enquanto varre.
    const chaves: string[] = [];
    let cursor = '0';
    do {
      const [proximo, achadas] = await this.comando<[string, string[]]>(
        'SCAN',
        cursor,
        'MATCH',
        `${prefixo}*`,
        'COUNT',
        100,
      );
      chaves.push(...achadas);
      cursor = proximo;
    } while (cursor !== '0');
    return chaves;
  }
}
