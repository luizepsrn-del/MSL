import { VERSAO_ESQUEMA, bancoVazio, type Banco } from './esquema';

/**
 * Migração de esquema.
 *
 * Escrita antes de existir dado meu para migrar — de propósito. Migração é a
 * coisa que sempre se adia e que depois custa o banco inteiro.
 *
 * Regras:
 *   · uma função por degrau, de N para N+1, nunca de N para N+2;
 *   · migração nunca perde campo que não entende — ela copia o resto adiante;
 *   · o banco só é aceito depois de chegar em VERSAO_ESQUEMA.
 */

type Migracao = (dados: Record<string, unknown>) => Record<string, unknown>;

/**
 * `MIGRACOES[n]` leva da versão `n` para `n + 1`.
 *
 * A entrada 0 existe para o caso de um arquivo antigo sem versão nenhuma.
 */
export const MIGRACOES: Record<number, Migracao> = {
  0: (dados) => ({
    ...dados,
    rotinas: Array.isArray(dados.rotinas) ? dados.rotinas : [],
    execucoes: Array.isArray(dados.execucoes) ? dados.execucoes : [],
    versao: 1,
  }),
};

export class ErroDeMigracao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeMigracao';
  }
}

/**
 * Sobe um banco de qualquer versão conhecida até a atual.
 *
 * Recusa o que vem do futuro: um arquivo exportado por uma versão mais nova do
 * sistema pode ter formato que este código não entende, e importar assim mesmo
 * corromperia silenciosamente. Falhar é melhor.
 */
export function migrar(dados: unknown): Banco {
  if (dados == null || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new ErroDeMigracao('arquivo não é um banco válido');
  }

  let atual = { ...(dados as Record<string, unknown>) };
  let versao = typeof atual.versao === 'number' ? atual.versao : 0;

  if (versao > VERSAO_ESQUEMA) {
    throw new ErroDeMigracao(
      `o arquivo é da versão ${versao} e este sistema entende até a ${VERSAO_ESQUEMA}. ` +
        'Atualize o sistema antes de importar.',
    );
  }

  while (versao < VERSAO_ESQUEMA) {
    const migracao = MIGRACOES[versao];
    if (!migracao) {
      throw new ErroDeMigracao(`não há migração da versão ${versao} para a ${versao + 1}`);
    }
    atual = migracao(atual);
    const nova = typeof atual.versao === 'number' ? atual.versao : versao + 1;
    if (nova <= versao) {
      throw new ErroDeMigracao(`a migração da versão ${versao} não avançou a versão`);
    }
    versao = nova;
  }

  return { ...bancoVazio(), ...atual, versao: VERSAO_ESQUEMA } as Banco;
}
