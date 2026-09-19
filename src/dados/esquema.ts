/**
 * O esquema dos dados, com versão.
 *
 * A versão existe desde antes de haver dado meu para migrar — é o único
 * momento em que dá para acertar isso de graça. Toda mudança de formato daqui
 * em diante sobe `VERSAO_ESQUEMA` e ganha uma migração em `migracoes.ts`.
 */

/** Sobe a cada mudança de formato. Nunca reutilize um número. */
export const VERSAO_ESQUEMA = 8;

/** Todo item do sistema carrega isto. */
export interface Registro {
  id: string;
  /** ISO 8601 em UTC. O fuso entra na exibição, não no armazenamento. */
  criadoEm: string;
  alteradoEm: string;
}

/**
 * O eixo de contexto.
 *
 * Vida pessoal e profissional convivem no mesmo sistema, separadas por este
 * eixo e não por dois aplicativos.
 */
export type Contexto = 'pessoal' | 'profissional';

export const CONTEXTOS: Contexto[] = ['pessoal', 'profissional'];

export const ROTULO_CONTEXTO: Record<Contexto, string> = {
  pessoal: 'Pessoal',
  profissional: 'Profissional',
};

/* ── Rotina ──────────────────────────────────────────────────────────────── */

/**
 * Como uma rotina se repete.
 *
 * `dias` usa 0 = domingo, como `Date.getDay` e como o calendário brasileiro.
 */
export type Recorrencia =
  | { tipo: 'diaria' }
  | { tipo: 'semanal'; dias: number[] }
  | { tipo: 'mensal'; diaDoMes: number }
  | { tipo: 'intervalo'; aCadaDias: number };

export interface Rotina extends Registro {
  titulo: string;
  contexto: Contexto;
  recorrencia: Recorrencia;
  /** kebab-case do Lucide */
  icone: string;
  /** data local `AAAA-MM-DD` a partir da qual a rotina vale */
  inicioEm: string;
  /** arquivada some das listas sem perder o histórico */
  arquivada: boolean;
  /** hora local `HH:MM` em que ela costuma acontecer, ou ausente */
  hora?: string;
}

/**
 * Uma ocorrência concluída.
 *
 * Guardo o que foi feito, não o que faltou: a ausência de execução num dia já
 * diz que não foi feito, e assim o banco não cresce com registros vazios.
 */
export interface Execucao extends Registro {
  rotinaId: string;
  /** data local `AAAA-MM-DD` do dia a que a execução se refere */
  dia: string;
}

/* ── Tarefa ──────────────────────────────────────────────────────────────── */

/**
 * Uma tarefa é o que tem fim, ao contrário da rotina, que se repete.
 *
 * `prazo` é opcional de propósito: boa parte do que eu preciso fazer não tem
 * data, e obrigar uma inventa urgência falsa.
 */
/**
 * A coluna do quadro.
 *
 * `concluidaEm` continua sendo a verdade sobre "feito" — todo o domínio já
 * depende dela. `estado` só distingue o que ainda não terminou: parado ou em
 * andamento. "Fazendo" é uma declaração minha, não algo derivável do prazo,
 * e por isso é o único pedaço de situação que fica guardado.
 */
export type EstadoTarefa = 'a-fazer' | 'fazendo' | 'feito';

export const ESTADOS_TAREFA: EstadoTarefa[] = ['a-fazer', 'fazendo', 'feito'];

export const ROTULO_ESTADO: Record<EstadoTarefa, string> = {
  'a-fazer': 'A fazer',
  fazendo: 'Fazendo',
  feito: 'Feito',
};

export interface Tarefa extends Registro {
  titulo: string;
  contexto: Contexto;
  /** data local `AAAA-MM-DD`, ou ausente quando não há prazo */
  prazo?: string;
  /** ISO UTC do momento em que foi concluída; ausente enquanto pendente */
  concluidaEm?: string;
  anotacao?: string;
  /**
   * Projeto a que pertence, ou ausente quando é solta.
   *
   * Pode apontar para um projeto que não existe mais — um arquivo importado ou
   * editado à mão. O domínio trata isso como tarefa solta em vez de quebrar.
   */
  projetoId?: string;
  /** coluna do quadro; ausente equivale a 'a-fazer' */
  estado?: EstadoTarefa;
  /**
   * Hora local `HH:MM`, ou ausente.
   *
   * Opcional de propósito: a maioria das tarefas não tem hora, e exigir uma
   * inventaria compromisso onde só havia um prazo. Quem tem hora aparece na
   * linha certa da agenda do dia; quem não tem fica em "a qualquer hora".
   */
  hora?: string;
}

/* ── Projeto ─────────────────────────────────────────────────────────────── */

/**
 * Um projeto é trabalho maior que uma tarefa: ele agrupa tarefas e termina
 * quando todas terminam.
 *
 * Não guarda progresso nem situação: os dois são derivados das tarefas, pelo
 * mesmo motivo que a situação da tarefa é derivada do prazo — número guardado
 * envelhece e passa a mentir.
 */
export interface Projeto extends Registro {
  titulo: string;
  contexto: Contexto;
  descricao?: string;
  /** data local `AAAA-MM-DD`, ou ausente */
  prazo?: string;
  /** ISO UTC; arquivado some das listas sem perder o histórico */
  arquivadoEm?: string;
}

/* ── Financeiro ──────────────────────────────────────────────────────────── */

export type TipoLancamento = 'entrada' | 'saida';

export const CATEGORIAS = [
  'receita',
  'moradia',
  'alimentacao',
  'transporte',
  'saude',
  'educacao',
  'lazer',
  'servicos',
  'impostos',
  'outros',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const ROTULO_CATEGORIA: Record<Categoria, string> = {
  receita: 'Receita',
  moradia: 'Moradia',
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  saude: 'Saúde',
  educacao: 'Educação',
  lazer: 'Lazer',
  servicos: 'Serviços',
  impostos: 'Impostos',
  outros: 'Outros',
};

export type PeriodoRecorrencia = 'semanal' | 'mensal' | 'anual';

export const ROTULO_PERIODO: Record<PeriodoRecorrencia, string> = {
  semanal: 'Toda semana',
  mensal: 'Todo mês',
  anual: 'Todo ano',
};

/**
 * Um lançamento que se repete.
 *
 * As repetições **não são gravadas**. O lançamento guarda a regra, e as
 * ocorrências são calculadas quando alguém pergunta — mesmo princípio do
 * calendário. Gravar doze aluguéis criaria doze registros que envelhecem
 * juntos: mudar o valor obrigaria a reescrever o passado, e apagar a série
 * viraria uma operação perigosa.
 */
export interface RecorrenciaLancamento {
  periodo: PeriodoRecorrencia;
  /** data local `AAAA-MM-DD` do último mês a repetir; ausente = sem fim */
  ate?: string;
}

/**
 * Um lançamento financeiro.
 *
 * **`valor` é sempre positivo, em centavos inteiros.** O sinal vem do `tipo`,
 * nunca do número. Guardar valor negativo abriria a porta para "saída de
 * -R$ 50", que é entrada escrita errado, e para somas que se cancelam sem
 * ninguém notar.
 *
 * Centavos inteiros e não ponto flutuante pelo motivo já testado em
 * src/formato: 0.1 + 0.2 não é 0.3, e num sistema que guarda o meu dinheiro
 * isso não é curiosidade, é erro de saldo.
 */
export interface Lancamento extends Registro {
  descricao: string;
  /** centavos, sempre > 0 */
  valor: number;
  tipo: TipoLancamento;
  categoria: Categoria;
  contexto: Contexto;
  /** data local `AAAA-MM-DD` — pode ser futura, e aí é previsão */
  data: string;
  /** quando presente, este lançamento se repete a partir de `data` */
  recorrencia?: RecorrenciaLancamento;
}

/* ── O banco ─────────────────────────────────────────────────────────────── */

/**
 * O que eu escolhi sobre como o sistema se apresenta.
 *
 * Mora no banco, e não em `localStorage`, para viajar no backup: restaurar o
 * arquivo em outro aparelho devolve o Início do jeito que eu deixei. Não é
 * coleção — `COLECOES` continua sendo só a lista de arrays.
 */
export interface Preferencias {
  /**
   * Os blocos do Início, na ordem em que aparecem. Bloco que não está na lista
   * fica escondido. Ausente quer dizer "tudo, na ordem de fábrica".
   */
  blocosDoInicio?: string[];
  /**
   * ISO UTC do último arquivo exportado, ou ausente se nunca houve um.
   *
   * Viaja dentro do próprio arquivo, e isso é de propósito: o arquivo carrega
   * a data em que foi gerado, e restaurar num aparelho novo diz a verdade
   * sobre quando aquele dado foi salvo pela última vez.
   */
  ultimoBackupEm?: string;
}

/**
 * A lápide de um registro apagado.
 *
 * Apagar não pode ser simplesmente sumir. Com dois aparelhos, o que não soube
 * da remoção traz o registro de volta na próxima junção — e uma tarefa
 * apagada ressuscitando é pior que uma tarefa a mais.
 *
 * A lápide fica **ao lado** das coleções, e não dentro delas, de propósito:
 * assim nenhuma tela precisa aprender a filtrar registro morto. Quem apaga
 * continua tirando da lista; só passa a anotar que tirou.
 */
export interface Removido {
  colecao: NomeColecao;
  id: string;
  /** ISO UTC do momento da remoção */
  em: string;
}

export interface Banco {
  versao: number;
  rotinas: Rotina[];
  execucoes: Execucao[];
  tarefas: Tarefa[];
  projetos: Projeto[];
  lancamentos: Lancamento[];
  preferencias?: Preferencias;
  /** o que foi apagado, para a junção entre aparelhos não ressuscitar nada */
  removidos?: Removido[];
}

export const COLECOES = ['rotinas', 'execucoes', 'tarefas', 'projetos', 'lancamentos'] as const;
export type NomeColecao = (typeof COLECOES)[number];

/**
 * O nome de cada coleção em português, no singular e no plural.
 *
 * Os identificadores são sem acento porque são chaves de dado; a tela não
 * pode mostrá-los crus — "25 execucoes" é jargão de banco, e "1 rotinas" é
 * erro de concordância.
 */
export const ROTULO_COLECAO: Record<NomeColecao, [string, string]> = {
  rotinas: ['rotina', 'rotinas'],
  execucoes: ['execução', 'execuções'],
  tarefas: ['tarefa', 'tarefas'],
  projetos: ['projeto', 'projetos'],
  lancamentos: ['lançamento', 'lançamentos'],
};

/** `1 rotina`, `25 execuções` — o número e o nome concordando. */
export function nomearColecao(colecao: NomeColecao, quantos: number): string {
  const [um, muitos] = ROTULO_COLECAO[colecao];
  return `${quantos} ${quantos === 1 ? um : muitos}`;
}

export function bancoVazio(): Banco {
  return {
    versao: VERSAO_ESQUEMA,
    rotinas: [],
    execucoes: [],
    tarefas: [],
    projetos: [],
    lancamentos: [],
    removidos: [],
  };
}

/** Tira o registro da lista e anota a lápide, num passo só. */
export function removerRegistro<T extends { id: string }>(
  banco: Banco,
  colecao: NomeColecao,
  lista: readonly T[],
  id: string,
  agora: string,
): { lista: T[]; removidos: Removido[] } {
  return {
    lista: lista.filter((r) => r.id !== id),
    removidos: [...(banco.removidos ?? []), { colecao, id, em: agora }],
  };
}

/** Identificador estável e ordenável por criação. */
export function novoId(): string {
  const aleatorio =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(36)}-${aleatorio}`;
}

/** `AAAA-MM-DD` do dia local, que é a chave usada por rotina e execução. */
export function diaLocal(d: Date, fuso = 'America/Sao_Paulo'): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: fuso,
  }).format(d);
}
