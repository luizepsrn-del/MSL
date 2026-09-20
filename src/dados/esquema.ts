/**
 * O esquema dos dados, com versão.
 *
 * A versão existe desde antes de haver dado meu para migrar — é o único
 * momento em que dá para acertar isso de graça. Toda mudança de formato daqui
 * em diante sobe `VERSAO_ESQUEMA` e ganha uma migração em `migracoes.ts`.
 */

/** Sobe a cada mudança de formato. Nunca reutilize um número. */
export const VERSAO_ESQUEMA = 15;

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

/**
 * Como uma tarefa se repete.
 *
 * Só existe com prazo: "todo mês" sem data não quer dizer nada.
 */
export interface RepeticaoDaTarefa {
  periodo: PeriodoRecorrencia;
  /** a cada quantos períodos; 1 é todo mês, 3 é de três em três */
  intervalo: number;
  /** data local `AAAA-MM-DD` da última ocorrência; ausente = sem fim */
  ate?: string;
}

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
  /**
   * Quando presente, concluir esta tarefa cria a próxima.
   *
   * **Aqui a repetição é gerada, e não derivada** — ao contrário do calendário
   * e do lançamento recorrente, e de propósito. Uma ocorrência de tarefa
   * precisa de identidade: ela atrasa, acumula anotação, anda no quadro. Uma
   * ocorrência derivada não teria onde guardar nada disso, e "pagar o IPVA"
   * não pode deixar de ficar atrasado só porque ninguém marcou.
   *
   * A próxima nasce ao concluir a atual, e não antes: assim o futuro não
   * enche de tarefas que ninguém pediu, e pular três semanas deixa uma
   * pendência atrasada em vez de três.
   */
  repeticao?: RepeticaoDaTarefa;
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

/* ── Modelo de projeto ───────────────────────────────────────────────────── */

/**
 * Uma tarefa dentro de um modelo.
 *
 * O prazo é **relativo à entrega**, e não uma data: um modelo com datas fixas
 * serviria uma vez só. "Revisar o texto, 3 dias antes" vale para toda entrega
 * que existir.
 */
export interface ItemDoModelo {
  titulo: string;
  /**
   * Dias **antes** da entrega. Positivo é antes; negativo é depois, para o que
   * só acontece com a coisa no ar.
   */
  diasAntes: number;
  /** hora local `HH:MM`, ou ausente */
  hora?: string;
}

/**
 * Um projeto que eu já sei fazer.
 *
 * Monto a lista uma vez e uso em toda entrega: o projeto nasce com as tarefas
 * na ordem e com os prazos já contados para trás a partir da data de entrega.
 */
export interface Modelo extends Registro {
  titulo: string;
  contexto: Contexto;
  descricao?: string;
  itens: ItemDoModelo[];
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

/* ── Meta ────────────────────────────────────────────────────────────────── */

/**
 * A janela em que a meta é medida.
 *
 * `sempre` é a meta que não zera — conta de `inicioEm` até hoje. As outras
 * recomeçam sozinhas quando a semana, o mês ou o ano viram, e é por isso que o
 * progresso **não pode ser um número guardado**: um "18 de 20" gravado
 * atravessaria a virada do mês dizendo que já estava quase lá.
 */
export type PeriodoDaMeta = 'semana' | 'mes' | 'ano' | 'sempre';

export const PERIODOS_DA_META: PeriodoDaMeta[] = ['semana', 'mes', 'ano', 'sempre'];

export const ROTULO_PERIODO_META: Record<PeriodoDaMeta, string> = {
  semana: 'Nesta semana',
  mes: 'Neste mês',
  ano: 'Neste ano',
  sempre: 'Desde o começo',
};

/**
 * De onde sai o número da meta.
 *
 * Três das quatro fontes leem dado que já existe: a meta se preenche sozinha
 * enquanto eu uso o sistema como sempre usei. Só `manual` pede que eu marque —
 * e existe para o que o sistema não tem como saber.
 */
export type FonteDaMeta =
  | { tipo: 'manual' }
  /** conta as execuções desta rotina que caem no período */
  | { tipo: 'rotina'; rotinaId: string }
  /** conta as tarefas concluídas no período, opcionalmente de um projeto só */
  | { tipo: 'tarefas'; projetoId?: string; contexto?: Contexto }
  /** soma os lançamentos do período, em centavos */
  | { tipo: 'dinheiro'; movimento: TipoLancamento; categoria?: Categoria };

/**
 * Para que lado a meta é boa.
 *
 * `atingir` quer chegar ao alvo ou passar dele; `limitar` quer ficar abaixo.
 * Sem esta distinção não existe "gastar menos de R$ 800 em lazer" — a barra
 * cheia diria sucesso onde é o contrário.
 */
export type DirecaoDaMeta = 'atingir' | 'limitar';

export const ROTULO_DIRECAO: Record<DirecaoDaMeta, string> = {
  atingir: 'Chegar a',
  limitar: 'Não passar de',
};

export interface Meta extends Registro {
  titulo: string;
  contexto: Contexto;
  /** o alvo: vezes, ou centavos inteiros quando a fonte é dinheiro */
  alvo: number;
  periodo: PeriodoDaMeta;
  direcao: DirecaoDaMeta;
  fonte: FonteDaMeta;
  /** data local `AAAA-MM-DD` a partir da qual a meta vale */
  inicioEm: string;
  /** arquivada some das listas sem perder o histórico */
  arquivada: boolean;
}

/**
 * Um avanço marcado à mão, num dia.
 *
 * É o `Execucao` da meta, e pelo mesmo motivo: guardar um total acumulado no
 * próprio registro faria o número atravessar a virada do período. Um marco tem
 * dia, então a janela sabe quais contar e quais deixar para trás.
 */
export interface Marco extends Registro {
  metaId: string;
  /** data local `AAAA-MM-DD` a que o avanço se refere */
  dia: string;
  /** quanto avançou: vezes, ou centavos quando a meta é de dinheiro. Sempre > 0 */
  quanto: number;
}

/* ── Regras ──────────────────────────────────────────────────────────────── */

/**
 * O que faz a regra olhar.
 *
 * Cada gatilho é uma pergunta que o sistema já sabe responder a partir do que
 * está gravado — nenhum deles precisa de um relógio rodando por trás.
 */
export type Gatilho =
  /** projeto ativo sem nenhuma tarefa concluída há N dias */
  | { tipo: 'projeto-parado'; dias: number }
  /** projeto ativo com todas as tarefas concluídas */
  | { tipo: 'projeto-terminado' }
  /** tarefa pendente com prazo vencido há N dias ou mais */
  | { tipo: 'tarefa-atrasada'; dias: number }
  /** meta em curso andando mais devagar que o calendário */
  | { tipo: 'meta-atrasada' };

/** O que a regra propõe fazer. */
export type Acao =
  /** cria uma tarefa; `{projeto}` no título vira o nome do projeto */
  | { tipo: 'criar-tarefa'; titulo: string; contexto: Contexto }
  /** arquiva o projeto */
  | { tipo: 'arquivar-projeto' }
  /** traz o prazo da tarefa para hoje */
  | { tipo: 'trazer-para-hoje' };

/**
 * Uma regra minha: quando tal coisa acontecer, faça tal outra.
 *
 * **A regra nunca escreve sozinha.** Ela calcula o que faria e mostra; quem
 * aplica sou eu, num toque. Um sistema que edita os meus dados enquanto eu
 * durmo é exatamente o que "não suponha em silêncio" proíbe — e desfazer uma
 * automação que rodou sozinha é bem mais caro que confirmar uma que não rodou.
 */
export interface Regra extends Registro {
  titulo: string;
  gatilho: Gatilho;
  acao: Acao;
  ativa: boolean;
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
   * Como eu quero ser chamado no Início.
   *
   * Fica aqui, e não no código, porque o repositório é público — e porque é
   * uma escolha minha, que deve viajar no backup e na sincronização como
   * qualquer outra. Vazio ou ausente: o Início mostra só a data, sem nome.
   */
  nome?: string;
  /**
   * A agenda externa que eu assino, pelo endereço secreto no formato iCal.
   *
   * **O endereço é uma senha**: quem o tiver lê a agenda inteira, sem login.
   * Ele fica aqui, dentro do banco, e não em `localStorage` como o token de
   * sessão — de propósito, para chegar sozinho no outro aparelho pela
   * sincronização. O preço é que ele viaja também no arquivo exportado, e a
   * tela de Ajustes diz isso com todas as letras em vez de deixar a surpresa
   * para depois.
   *
   * Os eventos **não** ficam guardados: só o endereço. Guardar os eventos
   * criaria uma cópia que envelhece, e apagar o compromisso no Google
   * deixaria o fantasma aqui para sempre.
   */
  agendaExterna?: {
    url: string;
    /** o nome que a própria agenda declara, quando declara */
    nome?: string;
  };
  /**
   * A janela em que o dia aceita trabalho, para o plano automático.
   *
   * Sem ela, `JORNADA_PADRAO`. O bloco é o mesmo para toda tarefa de
   * propósito: um número por tarefa que ninguém mediu é precisão inventada.
   */
  jornada?: {
    /** `HH:MM` */
    de: string;
    ate: string;
    minutosPorItem: number;
  };
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
  metas: Meta[];
  marcos: Marco[];
  modelos: Modelo[];
  regras: Regra[];
  preferencias?: Preferencias;
  /** o que foi apagado, para a junção entre aparelhos não ressuscitar nada */
  removidos?: Removido[];
}

export const COLECOES = [
  'rotinas',
  'execucoes',
  'tarefas',
  'projetos',
  'lancamentos',
  'metas',
  'marcos',
  'modelos',
  'regras',
] as const;
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
  metas: ['meta', 'metas'],
  marcos: ['marco', 'marcos'],
  modelos: ['modelo', 'modelos'],
  regras: ['regra', 'regras'],
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
    metas: [],
    marcos: [],
    modelos: [],
    regras: [],
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
