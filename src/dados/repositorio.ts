import {
  VERSAO_ESQUEMA,
  bancoVazio,
  type Banco,
  type Rotina,
  type Execucao,
  type Tarefa,
} from './esquema';
import { migrar } from './migracoes';

/**
 * A costura de armazenamento.
 *
 * Nenhuma tela fala com `localStorage` nem com IndexedDB direto — toda fala
 * com este contrato. É o que torna o backend uma ligação em vez de uma
 * reforma, quando a sincronização entre Mac e iPhone deixar de ser adiável
 * (veja DECISOES.md, decisão b).
 *
 * Por isso os testes de domínio usam `RepositorioMemoria` e continuam valendo
 * inalterados no dia em que existir `RepositorioRemoto`: eles testam a lógica,
 * não o armazenamento.
 */
export interface Repositorio {
  carregar(): Promise<Banco>;
  salvar(banco: Banco): Promise<void>;
  /** o arquivo que eu levo embora — é isto que garante que o dado é meu */
  exportar(): Promise<string>;
  /** substitui o banco inteiro pelo arquivo, depois de migrar e validar */
  importar(json: string): Promise<Banco>;
}

/* ── Serialização ────────────────────────────────────────────────────────── */

export function serializar(banco: Banco): string {
  return JSON.stringify({ ...banco, versao: VERSAO_ESQUEMA }, null, 2);
}

export function desserializar(json: string): Banco {
  let cru: unknown;
  try {
    cru = JSON.parse(json);
  } catch {
    throw new Error('o arquivo não é um JSON válido');
  }
  return migrar(cru);
}

/* ── Em memória — o que os testes usam ───────────────────────────────────── */

export class RepositorioMemoria implements Repositorio {
  private banco: Banco;

  constructor(inicial: Banco = bancoVazio()) {
    this.banco = estruturado(inicial);
  }

  async carregar(): Promise<Banco> {
    return estruturado(this.banco);
  }

  async salvar(banco: Banco): Promise<void> {
    this.banco = estruturado(banco);
  }

  async exportar(): Promise<string> {
    return serializar(this.banco);
  }

  async importar(json: string): Promise<Banco> {
    this.banco = desserializar(json);
    return estruturado(this.banco);
  }
}

/* ── No navegador ────────────────────────────────────────────────────────── */

const CHAVE = 'msl-banco';

/**
 * Persistência local do navegador.
 *
 * **O dado guardado aqui é apagado pelo Safari após 7 dias sem interação**, a
 * menos que o sistema esteja instalado na tela de início — e
 * `navigator.storage.persist()` não protege contra esse despejo, só contra
 * pressão de armazenamento. Veja DECISOES.md, decisão (b). Por isso a
 * exportação existe desde o primeiro pilar, e não como recurso futuro.
 */
export class RepositorioLocal implements Repositorio {
  async carregar(): Promise<Banco> {
    try {
      const cru = localStorage.getItem(CHAVE);
      if (!cru) return bancoVazio();
      return desserializar(cru);
    } catch {
      // Janela privada, armazenamento bloqueado, ou arquivo corrompido. Abrir
      // vazio é melhor que não abrir — e o dado anterior continua no disco
      // para uma tentativa de recuperação manual.
      return bancoVazio();
    }
  }

  async salvar(banco: Banco): Promise<void> {
    localStorage.setItem(CHAVE, serializar(banco));
  }

  async exportar(): Promise<string> {
    return serializar(await this.carregar());
  }

  async importar(json: string): Promise<Banco> {
    const banco = desserializar(json);
    await this.salvar(banco);
    return banco;
  }
}

/* ── Consultas que várias telas compartilham ─────────────────────────────── */

export const rotinasAtivas = (b: Banco): Rotina[] => b.rotinas.filter((r) => !r.arquivada);

export const execucoesDoDia = (b: Banco, dia: string): Execucao[] =>
  b.execucoes.filter((e) => e.dia === dia);

export const tarefasPendentes = (b: Banco): Tarefa[] => b.tarefas.filter((t) => !t.concluidaEm);

function estruturado<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}
