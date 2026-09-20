import { VERSAO_ESQUEMA, bancoVazio, type Banco } from './esquema.ts';

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

  /**
   * 1 → 2: entra o pilar Tarefas.
   *
   * Coleção nova começa vazia. Nada do que já existia é tocado — este é o
   * formato que toda migração aditiva deve ter, e é o que torna seguro subir
   * de versão sem medo de perder rotina ou execução.
   */
  1: (dados) => ({
    ...dados,
    tarefas: Array.isArray(dados.tarefas) ? dados.tarefas : [],
    versao: 2,
  }),

  /**
   * 2 → 3: entra o pilar Projetos.
   *
   * Aditiva como a anterior. As tarefas que já existem ficam sem `projetoId`,
   * que é exatamente o que "tarefa solta" significa — nenhuma precisa ser
   * tocada.
   */
  2: (dados) => ({
    ...dados,
    projetos: Array.isArray(dados.projetos) ? dados.projetos : [],
    versao: 3,
  }),

  /** 3 → 4: entra o pilar Financeiro. Aditiva, como as anteriores. */
  3: (dados) => ({
    ...dados,
    lancamentos: Array.isArray(dados.lancamentos) ? dados.lancamentos : [],
    versao: 4,
  }),

  /**
   * 4 → 5: o quadro de tarefas e os lançamentos recorrentes.
   *
   * Nenhum campo novo precisa de valor: tarefa sem `estado` já significa
   * "a fazer", e lançamento sem `recorrencia` já significa "uma vez só". A
   * migração só sobe a versão — o formato antigo continua sendo válido no
   * novo, que é o melhor tipo de mudança de esquema.
   */
  4: (dados) => ({ ...dados, versao: 5 }),

  /**
   * 5 → 6: hora opcional na rotina e na tarefa, e as preferências da interface.
   *
   * Aditiva como as outras: quem não tem hora continua sem hora, e quem não
   * tem preferência vê o Início de fábrica.
   */
  5: (dados) => ({ ...dados, versao: 6 }),

  /** 6 → 7: a data do último backup, dentro das preferências. Aditiva. */
  6: (dados) => ({ ...dados, versao: 7 }),

  /**
   * 7 → 8: as lápides.
   *
   * Aditiva: quem nunca apagou nada não tem lápide nenhuma, e um banco sem a
   * lista se comporta como uma lista vazia.
   */
  7: (dados) => ({ ...dados, versao: 8 }),

  /**
   * 8 → 9: entra o pilar Metas, com as duas coleções que ele precisa.
   *
   * `marcos` é separada de `metas` pelo mesmo motivo que `execucoes` é separada
   * de `rotinas`: o avanço tem dia, e um total guardado dentro da meta
   * atravessaria a virada do mês mentindo. Aditiva — quem não tem meta nenhuma
   * fica com as duas listas vazias.
   */
  8: (dados) => ({
    ...dados,
    metas: Array.isArray(dados.metas) ? dados.metas : [],
    marcos: Array.isArray(dados.marcos) ? dados.marcos : [],
    versao: 9,
  }),

  /**
   * 9 → 10: o nome, dentro das preferências.
   *
   * Aditiva e sem valor de partida: quem não disser como quer ser chamado vê
   * a data sem nome, que é o comportamento certo e não uma falta.
   */
  9: (dados) => ({ ...dados, versao: 10 }),

  /**
   * 10 → 11: o endereço da agenda externa, dentro das preferências.
   *
   * Aditiva: quem não assina agenda nenhuma não tem o campo, e o calendário
   * se comporta exatamente como antes.
   */
  10: (dados) => ({ ...dados, versao: 11 }),

  /**
   * 11 → 12: a tarefa que se repete.
   *
   * Aditiva e sem valor de partida: tarefa sem `repeticao` já significa "uma
   * vez só", que é o que toda tarefa existente é.
   */
  11: (dados) => ({ ...dados, versao: 12 }),

  /**
   * 12 → 13: os modelos de projeto.
   *
   * Coleção nova, começa vazia — o formato de sempre para uma adição que não
   * toca em nada do que já existe.
   */
  12: (dados) => ({
    ...dados,
    modelos: Array.isArray(dados.modelos) ? dados.modelos : [],
    versao: 13,
  }),

  /**
   * 13 → 14: a jornada, dentro das preferências.
   *
   * Aditiva: quem não disser a que horas o dia começa fica com a jornada
   * padrão, que é uma escolha razoável e não uma falta.
   */
  13: (dados) => ({ ...dados, versao: 14 }),

  /**
   * 14 → 15: as regras "quando X, faça Y".
   *
   * Coleção nova, começa vazia. Quem não escrever regra nenhuma não vê
   * diferença — e nenhuma regra escreve sozinha, então nem quem escrever.
   */
  14: (dados) => ({
    ...dados,
    regras: Array.isArray(dados.regras) ? dados.regras : [],
    versao: 15,
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
