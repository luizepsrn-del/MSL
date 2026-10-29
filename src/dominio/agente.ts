import {
  CATEGORIAS,
  ROTULO_CATEGORIA,
  type Banco,
  type Categoria,
  type Contexto,
  type Projeto,
  type Tarefa,
} from '../dados/esquema';
import {
  diaValido,
  diasNoMes,
  somarDias,
  diaDaSemana,
  agendaDoDia,
  progressoDoDia,
  sequencia,
  descreverRotina,
} from './rotina';
import {
  situacao,
  descreverPrazo,
  ordenarTarefas,
  resumoTarefas,
  tarefasDoDia,
  semanaDeTarefas,
  concluidasPorDia,
  estadoDe,
} from './tarefa';
import { painelDosProjetos, projetosQuePedemAtencao } from './projeto';
import {
  ocorrenciasDoMes,
  resumoFinanceiro,
  saidasPorCategoria,
  realizados,
  comprometidoPorMes,
} from './financeiro';
import { inicioDaSemana, semanaDe, anoMesDe, nomeDoMes, nomeDaSemana } from './calendario';
import { lerMoeda, formatarMoeda, formatarPorcento, formatarNumero } from '../formato';

/**
 * O agente — local, e só.
 *
 * Nenhum modelo é chamado daqui e nenhuma chave de API vive no cliente. Ele
 * entende um conjunto **declarado** de perguntas e comandos sobre os meus
 * próprios dados e responde com o que os dados dizem, nada além. O que ele não
 * entende vira um pedido para o Claude Code, que é onde mudança de sistema
 * acontece — com teste e revisão.
 *
 * A escolha tem um preço e uma vantagem, e as duas são explícitas: ele não
 * improvisa uma frase bonita sobre a minha semana, e em troca nunca inventa um
 * número. Toda resposta aqui é derivada do banco, como o resto do domínio.
 */

/* ── Texto ───────────────────────────────────────────────────────────────── */

/** Minúsculas, sem acento, sem espaço sobrando. A base de toda comparação. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const contem = (t: string, ...termos: string[]) => termos.some((termo) => t.includes(termo));

/* ── Datas escritas por extenso ──────────────────────────────────────────── */

/** Acento e maiúscula toleradas: o texto que eu digito não é normalizado. */
const DIAS_ESCRITOS: [RegExp, number][] = [
  [/\bdomingos?\b/i, 0],
  [/\bsegunda(-feira)?s?\b/i, 1],
  [/\bter[çc]a(-feira)?s?\b/i, 2],
  [/\bquarta(-feira)?s?\b/i, 3],
  [/\bquinta(-feira)?s?\b/i, 4],
  [/\bsexta(-feira)?s?\b/i, 5],
  [/\bs[áa]bados?\b/i, 6],
];

export interface PrazoLido {
  /** `AAAA-MM-DD`, ou ausente quando o texto não falava de data */
  prazo?: string;
  /** o texto sem o pedaço que virou data, com o acento e a caixa originais */
  resto: string;
}

/** Tira a data do texto e limpa a preposição que ficou órfã no fim. */
function recortar(texto: string, padrao: RegExp, prazo: string): PrazoLido {
  const resto = texto
    .replace(padrao, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+(para|pro|pra|at[ée]|no|na|em|de)\s*$/i, '')
    .trim();
  return { prazo, resto };
}

/**
 * Lê a data escrita no meio da frase e a remove do texto.
 *
 * Remover importa: sem isso "criar tarefa pagar o IPVA amanhã" viraria uma
 * tarefa chamada "pagar o IPVA amanhã", que amanhã passa a mentir.
 *
 * Trabalha no texto **original**, e não no normalizado: quem normaliza para
 * comparar e devolve o normalizado transforma "pagar o IPVA do carrão" em
 * "pagar o ipva do carrao". O padrão é que tolera acento, não o texto.
 *
 * Um dia da semana escrito ("sexta") é a **próxima** sexta, incluindo hoje se
 * hoje for sexta — é como se fala.
 */
export function lerPrazo(texto: string, hoje: string): PrazoLido {
  const t = texto.trim();

  // O `\b` do JavaScript conhece só [A-Za-z0-9_]: depois do "ã" ele não fecha,
  // e /\bamanhã\b/ nunca casa. O fim de palavra aqui é "não vem outra letra".
  const depois = /\bdepois de amanh[ãa](?!\p{L})/iu;
  if (depois.test(t)) return recortar(t, depois, somarDias(hoje, 2));
  if (/\bhoje\b/i.test(t)) return recortar(t, /\bhoje\b/i, hoje);
  const amanha = /\bamanh[ãa](?!\p{L})/iu;
  if (amanha.test(t)) return recortar(t, amanha, somarDias(hoje, 1));
  if (/\bontem\b/i.test(t)) return recortar(t, /\bontem\b/i, somarDias(hoje, -1));

  const emDias = t.match(/\bem (\d{1,3}) dias?\b/i);
  if (emDias) return recortar(t, /\bem \d{1,3} dias?\b/i, somarDias(hoje, Number(emDias[1])));

  const proxima = /\b(semana que vem|pr[óo]xima semana)\b/i;
  if (proxima.test(t)) return recortar(t, proxima, somarDias(hoje, 7));

  // 25/09, 25/09/2027, 25-09
  const numerica = t.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numerica) {
    const [, d, m, a] = numerica;
    const ano = a ? (a.length === 2 ? 2000 + Number(a) : Number(a)) : Number(hoje.slice(0, 4));
    const dia = `${ano}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (diaValido(dia)) {
      return recortar(t, /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/, dia);
    }
  }

  // "dia 25" — o 25 deste mês, ou do mês que vem se já passou
  const doMes = t.match(/\bdia (\d{1,2})\b/i);
  if (doMes) {
    const numero = Number(doMes[1]);
    const [ano, mes] = hoje.split('-').map(Number);
    if (numero >= 1 && numero <= diasNoMes(ano, mes)) {
      const nesteMes = `${ano}-${String(mes).padStart(2, '0')}-${String(numero).padStart(2, '0')}`;
      let alvo = nesteMes;
      if (nesteMes < hoje) {
        const proximoMes = mes === 12 ? 1 : mes + 1;
        const proximoAno = mes === 12 ? ano + 1 : ano;
        const limite = Math.min(numero, diasNoMes(proximoAno, proximoMes));
        alvo = `${proximoAno}-${String(proximoMes).padStart(2, '0')}-${String(limite).padStart(2, '0')}`;
      }
      return recortar(t, /\bdia \d{1,2}\b/i, alvo);
    }
  }

  for (const [padrao, alvo] of DIAS_ESCRITOS) {
    if (padrao.test(t)) {
      const distancia = (alvo - diaDaSemana(hoje) + 7) % 7;
      return recortar(t, padrao, somarDias(hoje, distancia));
    }
  }

  return { resto: t };
}

/* ── Horas escritas por extenso ──────────────────────────────────────────── */

export interface HoraLida {
  /** `HH:MM`, ou ausente quando o texto não falava de hora */
  hora?: string;
  /** o texto sem o pedaço que virou hora, com acento e caixa originais */
  resto: string;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/**
 * O período dito em palavra, aplicado ao número.
 *
 * "3 da tarde" é 15h, e "9 da noite" é 21h. As duas exceções são meio-dia e
 * meia-noite, onde o 12 anda para lados opostos: "12 da noite" é 00h.
 */
function em24h(hora: number, periodo?: string): number | undefined {
  if (hora > 23) return undefined;
  if (!periodo) return hora;
  const p = normalizar(periodo);
  if (p.startsWith('madrug')) return hora === 12 ? 0 : hora;
  if (p.startsWith('manh')) return hora === 12 ? 0 : hora;
  if (p.startsWith('tarde') || p.startsWith('noite')) {
    if (hora === 12) return p.startsWith('noite') ? 0 : 12;
    return hora < 12 ? hora + 12 : hora;
  }
  return hora;
}

/** Tira a hora do texto e limpa a preposição órfã, como `recortar` faz com a data. */
function recortarHora(texto: string, padrao: RegExp, hora: string): HoraLida {
  const resto = texto
    .replace(padrao, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+(para|pro|pra|at[ée]|[àa]s?|no|na|em|de)\s*$/i, '')
    .trim();
  return { hora, resto };
}

/**
 * Lê a hora escrita na frase e a remove do texto.
 *
 * Mesmo contrato de `lerPrazo`, e pelo mesmo motivo: sem remover, "reunião com
 * o contador às 15h" viraria uma tarefa chamada "reunião com o contador às
 * 15h", que repete na tela a hora que já está na linha da agenda.
 *
 * **Rodar sempre depois de `lerPrazo`, sobre o resto dela.** A data sai
 * primeiro porque "dia 25" e "25/09" carregam números que, soltos, um padrão
 * de hora poderia disputar.
 *
 * Exige marca explícita — `h`, `:`, "horas", ou o período dito. Um número
 * solto não vira hora: "comprar 2 cadeiras" não é um compromisso às 02:00.
 */
export function lerHora(texto: string): HoraLida {
  const t = texto.trim();

  const meioDia = /\bmeio[- ]dia(\s+e\s+meia)?\b/i;
  const meiaNoite = /\bmeia[- ]noite(\s+e\s+meia)?\b/i;
  if (meioDia.test(t)) {
    return recortarHora(t, meioDia, meioDia.exec(t)?.[1] ? '12:30' : '12:00');
  }
  if (meiaNoite.test(t)) {
    return recortarHora(t, meiaNoite, meiaNoite.exec(t)?.[1] ? '00:30' : '00:00');
  }

  const PERIODO = '(?:\\s+d[ae]\\s+(manh[ãa]|tarde|noite|madrugada))?';

  // 15h30, 15:30, 15h30min, com período opcional depois
  const comMinuto = new RegExp(`\\b([01]?\\d|2[0-3])\\s*[h:]\\s*([0-5]\\d)(?:min)?${PERIODO}`, 'iu');
  const cm = t.match(comMinuto);
  if (cm) {
    const hora = em24h(Number(cm[1]), cm[3]);
    if (hora !== undefined) {
      return recortarHora(t, comMinuto, `${doisDigitos(hora)}:${cm[2]}`);
    }
  }

  // 15h, 15 horas, 15hs — a marca é obrigatória
  const soHora = new RegExp(`\\b([01]?\\d|2[0-3])\\s*(?:h|hs|hrs|horas?)\\b${PERIODO}`, 'iu');
  const sh = t.match(soHora);
  if (sh) {
    const hora = em24h(Number(sh[1]), sh[2]);
    if (hora !== undefined) return recortarHora(t, soHora, `${doisDigitos(hora)}:00`);
  }

  // "às 3 da tarde" — sem o "h", quem marca é o período
  // O `\b` final não fecha depois de "ã" — a mesma armadilha de "amanhã", lá em
  // cima. O fim de palavra aqui é "não vem outra letra".
  const comPeriodo = /\b([01]?\d|2[0-3])\s+d[ae]\s+(manh[ãa]|tarde|noite|madrugada)(?!\p{L})/iu;
  const cp = t.match(comPeriodo);
  if (cp) {
    const hora = em24h(Number(cp[1]), cp[2]);
    if (hora !== undefined) return recortarHora(t, comPeriodo, `${doisDigitos(hora)}:00`);
  }

  return { resto: t };
}

/* ── Intenção ────────────────────────────────────────────────────────────── */

export type Periodo = 'hoje' | 'semana' | 'mes';

/**
 * O que a frase **pediu** que mudasse numa tarefa que já existe.
 *
 * Um objeto só, e não uma intenção por campo: a camada de dados já fala
 * `editarTarefa(id, mudanca)`, e repetir a mesma forma aqui evita quatro ramos
 * quase idênticos. Campo ausente é campo que não se mexe — e não campo que se
 * apaga, que é o que um `undefined` solto significaria.
 *
 * O projeto vem por **nome**: `interpretar` não recebe o banco, e inventar um
 * id a partir de texto seria apontar para um projeto que pode não existir.
 */
export interface MudancaPedida {
  titulo?: string;
  hora?: string;
  anotacao?: string;
  projeto?: string;
}

/** O que o banco vai **aplicar**, com o projeto já resolvido em id. */
export interface MudancaDeTarefa {
  titulo?: string;
  hora?: string;
  anotacao?: string;
  projetoId?: string;
}

export type Intencao =
  | { tipo: 'ajuda' }
  | { tipo: 'resumo'; periodo: Periodo }
  | { tipo: 'atrasos' }
  | { tipo: 'agenda'; periodo: 'hoje' | 'semana' }
  | { tipo: 'gastos'; categoria?: Categoria }
  | { tipo: 'saldo' }
  | { tipo: 'projetos' }
  | { tipo: 'rotina' }
  | { tipo: 'criar-tarefa'; titulo: string; prazo?: string; hora?: string; contexto: Contexto }
  | { tipo: 'concluir-tarefa'; alvo: string }
  | { tipo: 'adiar-tarefa'; alvo: string; prazo: string; hora?: string }
  | { tipo: 'excluir-tarefa'; alvo: string }
  | { tipo: 'editar-tarefa'; alvo: string; mudanca: MudancaPedida }
  | { tipo: 'lancar'; descricao: string; valor: number; entrada: boolean; categoria: Categoria }
  | { tipo: 'pedido'; descricao: string };

/** Palavras que denunciam a categoria, para "gastei 50 no mercado" acertar. */
const PISTAS_DE_CATEGORIA: [Categoria, string[]][] = [
  ['moradia', ['aluguel', 'condominio', 'luz', 'agua', 'gas', 'iptu', 'moradia', 'casa']],
  ['alimentacao', ['mercado', 'supermercado', 'almoco', 'jantar', 'padaria', 'ifood', 'comida']],
  ['transporte', ['uber', 'gasolina', 'combustivel', 'onibus', 'metro', 'estacionamento', 'ipva']],
  ['saude', ['farmacia', 'medico', 'dentista', 'plano de saude', 'remedio', 'academia']],
  ['educacao', ['curso', 'livro', 'faculdade', 'escola', 'mensalidade']],
  ['lazer', ['cinema', 'bar', 'viagem', 'netflix', 'spotify', 'show', 'presente']],
  ['servicos', ['internet', 'telefone', 'celular', 'assinatura', 'streaming']],
  ['impostos', ['imposto', 'darf', 'inss', 'taxa']],
  ['receita', ['salario', 'pagamento', 'honorario', 'freela', 'freelance']],
];

function categoriaPorPista(texto: string, entrada: boolean): Categoria {
  for (const [categoria, pistas] of PISTAS_DE_CATEGORIA) {
    if (contem(texto, ...pistas)) return categoria;
  }
  return entrada ? 'receita' : 'outros';
}

/** Trabalho ou vida: a pista está na palavra, e três ramos do parser perguntam. */
function contextoDe(texto: string): Contexto {
  return contem(texto, 'trabalho', 'cliente', 'reuniao', 'proposta', 'contrato')
    ? 'profissional'
    : 'pessoal';
}

/** A categoria citada por nome: "quanto gastei com moradia". */
function categoriaCitada(texto: string): Categoria | undefined {
  return CATEGORIAS.find(
    (c) => texto.includes(c) || texto.includes(normalizar(ROTULO_CATEGORIA[c])),
  );
}

/**
 * De uma frase para uma intenção.
 *
 * A ordem importa: comandos (que mudam dados) antes de perguntas, e o pedido
 * ao Claude Code por último, como rede. O que não casa com nada **não é
 * adivinhado** — vira pedido, e a tela diz isso claramente.
 */
/**
 * O alvo, sem as sobras da frase.
 *
 * Tira o artigo da frente e o "para" que fica pendurado quando a data saiu do
 * meio: "adiar o dentista para sexta às 16h" deixava o alvo como
 * "dentista para", e nenhuma tarefa se chama assim.
 */
const alvoLimpo = (texto: string) =>
  texto
    .replace(/^[oa]\s+/i, '')
    .replace(/\s+(para|pra)\s*$/i, '')
    .trim();

export function interpretar(texto: string, hoje: string): Intencao {
  const cru = texto.trim();
  const t = normalizar(cru);

  if (t === '') return { tipo: 'ajuda' };
  if (contem(t, 'ajuda', 'o que voce faz', 'o que voce sabe', 'comandos', 'me ajuda a usar')) {
    return { tipo: 'ajuda' };
  }

  /* Comandos — mudam alguma coisa, então vêm primeiro e são explícitos. */

  const lancamento = t.match(
    /^(gastei|paguei|recebi|ganhei)\s+(?:r\$\s*)?([\d.,]+)\s*(?:reais?)?\s*(?:(?:com|em|no|na|de|do|da|para|pra)\s+)?(.*)$/,
  );
  if (lancamento) {
    const [, verbo, numero, resto] = lancamento;
    const valor = lerMoeda(numero);
    if (valor !== null && valor > 0) {
      const entrada = verbo === 'recebi' || verbo === 'ganhei';
      const descricao = resto.trim();
      return {
        tipo: 'lancar',
        descricao: descricao === '' ? (entrada ? 'Entrada' : 'Gasto') : maiuscula(descricao),
        valor,
        entrada,
        categoria: categoriaPorPista(descricao, entrada),
      };
    }
  }

  const agendar = cru.match(/^(agendar|agende|marcar|marque)\s+(?:um[a]?\s+)?(.+)$/i);
  if (agendar) {
    const data = lerPrazo(agendar[2], hoje);
    const { hora, resto } = lerHora(data.resto);
    const titulo = resto.trim();
    // Sem dia nem hora não há compromisso nenhum, e "marcar" volta a querer
    // dizer concluir — que é o que a frase seguinte trata.
    if (titulo !== '' && (data.prazo || hora)) {
      return {
        tipo: 'criar-tarefa',
        titulo: maiuscula(titulo),
        prazo: data.prazo,
        hora,
        contexto: contextoDe(t),
      };
    }
  }

  // Antes de `adiar`, que também responde por "mover", "passar" e "mudar". O
  // que desempata é a expressão "para o projeto", que data nenhuma tem.
  const paraProjeto = cru.match(
    /^(mover|move|mova|passar|passa|passe|jogar|joga|jogue|mudar|muda|mude)\s+(?:[oa]\s+)?(?:tarefa\s+)?(.+?)\s+para\s+(?:[o]\s+)?projeto\s+(.+)$/i,
  );
  if (paraProjeto) {
    const alvoProjeto = alvoLimpo(paraProjeto[2]);
    const nome = paraProjeto[3].trim();
    if (alvoProjeto !== '' && nome !== '') {
      return { tipo: 'editar-tarefa', alvo: alvoProjeto, mudanca: { projeto: nome } };
    }
  }

  const adiar = cru.match(
    /^(adiar|adia|remarcar|remarque|mover|passar|mudar|muda|mude|trocar|troca|troque)\s+(?:[oa]\s+)?(?:tarefa\s+)?(.+)$/i,
  );
  if (adiar) {
    const data = lerPrazo(adiar[2], hoje);
    const { hora, resto } = lerHora(data.resto);
    const alvoAdiar = alvoLimpo(resto);
    // Adiar sem destino não é um comando, é meia frase: sem a data eu não
    // tenho para onde mover, e adivinhar "amanhã" seria inventar ordem minha.
    if (alvoAdiar !== '' && data.prazo) {
      return { tipo: 'adiar-tarefa', alvo: alvoAdiar, prazo: data.prazo, hora };
    }
    // Hora sem data é mudar o horário e **manter o dia**. Cai aqui e não no
    // ramo de cima de propósito: quem tem data é adiar, quem só tem hora é
    // edição — o mesmo critério que separou "agendar" de "concluir".
    if (alvoAdiar !== '' && hora) {
      return { tipo: 'editar-tarefa', alvo: alvoAdiar, mudanca: { hora } };
    }
  }

  const excluir = cru.match(/^(excluir|exclua|exclui|apagar|apague|apaga|deletar|deleta|remover|remova|remove|cancelar|cancele|cancela)\s+(?:[oa]\s+)?(?:tarefa\s+)?(.+)$/i);
  if (excluir) {
    const alvoExcluir = excluir[2].replace(/^[oa]\s+/i, '').trim();
    if (alvoExcluir !== '') return { tipo: 'excluir-tarefa', alvo: alvoExcluir };
  }

  // Guloso de propósito: ganha o **último** "para". "renomear a ida para o
  // mercado para compras" tem dois, e é o segundo que separa alvo de destino.
  const renomear = cru.match(
    /^(renomear|renomeia|renomeie|rebatizar|rebatize)\s+(?:[oa]\s+)?(?:tarefa\s+)?(.+)\s+para\s+(.+)$/i,
  );
  if (renomear) {
    const alvoRenomear = renomear[2].trim();
    const novo = renomear[3].trim();
    if (alvoRenomear !== '' && novo !== '') {
      return { tipo: 'editar-tarefa', alvo: alvoRenomear, mudanca: { titulo: maiuscula(novo) } };
    }
  }

  const concluir = t.match(/^(concluir|concluido|terminei|finalizei|marcar|feito)\s+(.+)$/);
  if (concluir) {
    const alvo = concluir[2].replace(/^(a\s+)?tarefa\s+/, '').trim();
    if (alvo !== '') return { tipo: 'concluir-tarefa', alvo };
  }

  // Antes de `criar`, que também responde por "anotar": sem este ramo,
  // "anota na reunião que..." viraria uma tarefa nova chamada "na reunião
  // que...". O que separa os dois é o alvo seguido de "que".
  //
  // Preguiçoso aqui, ao contrário de renomear: ganha o **primeiro** "que",
  // porque a anotação costuma trazer os seus — "disse que volta".
  const anotar = cru.match(/^(anotar|anota|anote)\s+(?:n[oa]\s+)?(.+?)\s+que\s+(.+)$/i);
  if (anotar) {
    const alvoAnotar = alvoLimpo(anotar[2]);
    const nota = anotar[3].trim();
    if (alvoAnotar !== '' && nota !== '') {
      return { tipo: 'editar-tarefa', alvo: alvoAnotar, mudanca: { anotacao: maiuscula(nota) } };
    }
  }

  const criar = cru.match(
    /^(criar|nova|novo|adicionar|anotar|lembrar)\s+(?:de\s+)?(?:uma\s+)?(?:tarefa\s+)?(.+)$/i,
  );
  if (criar) {
    const data = lerPrazo(criar[2], hoje);
    const { hora, resto } = lerHora(data.resto);
    const titulo = resto.trim();
    if (titulo !== '') {
      return {
        tipo: 'criar-tarefa',
        titulo: maiuscula(titulo),
        prazo: data.prazo,
        hora,
        contexto: contextoDe(t),
      };
    }
  }

  /* Perguntas — só leem. */

  if (contem(t, 'atrasad', 'atraso', 'vencid')) return { tipo: 'atrasos' };

  if (contem(t, 'quanto gastei', 'quanto gasto', 'gastos', 'onde foi o dinheiro', 'despesas')) {
    return { tipo: 'gastos', categoria: categoriaCitada(t) };
  }

  if (contem(t, 'saldo', 'quanto sobrou', 'quanto tenho', 'como esta o financeiro', 'dinheiro')) {
    return { tipo: 'saldo' };
  }

  if (contem(t, 'projeto')) return { tipo: 'projetos' };
  if (contem(t, 'rotina', 'sequencia', 'habito')) return { tipo: 'rotina' };

  if (contem(t, 'o que tenho', 'agenda', 'o que vence', 'o que preciso fazer', 'minhas tarefas')) {
    return { tipo: 'agenda', periodo: contem(t, 'semana') ? 'semana' : 'hoje' };
  }

  if (contem(t, 'resumo', 'como foi', 'como estou', 'como esta', 'relatorio', 'balanco')) {
    return {
      tipo: 'resumo',
      periodo: contem(t, 'mes') ? 'mes' : contem(t, 'semana') ? 'semana' : 'hoje',
    };
  }

  return { tipo: 'pedido', descricao: cru };
}

/** Primeira letra maiúscula, sem mexer no resto. */
function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/* ── Achar uma tarefa pelo nome ──────────────────────────────────────────── */

/**
 * As tarefas pendentes cujo título contém o que eu escrevi.
 *
 * Devolve **todas** as candidatas de propósito: com duas, quem responde
 * pergunta qual, em vez de concluir a errada em silêncio. Concluir a tarefa
 * errada é o tipo de erro que só se descobre depois.
 */
export function acharTarefas(banco: Banco, alvo: string): Tarefa[] {
  const procurado = normalizar(alvo);
  if (procurado === '') return [];
  return banco.tarefas.filter(
    (t) => !t.concluidaEm && normalizar(t.titulo).includes(procurado),
  );
}

/** Compromissos de fora cujo título contém o procurado. */
function acharCompromissos(
  compromissos: readonly CompromissoExterno[],
  alvo: string,
): CompromissoExterno[] {
  const procurado = normalizar(alvo);
  if (procurado === '') return [];
  return umPorEvento(compromissos.filter((c) => normalizar(c.titulo).includes(procurado)));
}

/**
 * Um evento de vários dias chega em uma cópia por dia, todas com o mesmo
 * `uid`. Para o alvo de um comando elas são **um** evento: perguntar "qual
 * delas?" entre três linhas iguais não leva a efeito nenhum, e mostrar só uma
 * data enquanto apagar leva o evento inteiro esconde o estrago.
 *
 * A cópia que sobra vai do primeiro ao último dia que se conhece. Sem `uid`
 * não há como saber que são o mesmo evento, então nada se une.
 */
function umPorEvento(achados: readonly CompromissoExterno[]): CompromissoExterno[] {
  const porUid = new Map<string, CompromissoExterno>();
  const saida: CompromissoExterno[] = [];
  for (const c of achados) {
    const unido = c.uid ? porUid.get(c.uid) : undefined;
    if (unido) {
      const dias = [unido.dia, unido.ate ?? unido.dia, c.dia, c.ate ?? c.dia].sort();
      unido.dia = dias[0];
      unido.ate = dias[3];
      continue;
    }
    const copia = { ...c };
    if (c.uid) porUid.set(c.uid, copia);
    saida.push(copia);
  }
  return saida;
}

/** Projetos ativos cujo nome contém o procurado. Mesma régua de `acharTarefas`. */
export function acharProjetos(banco: Banco, nome: string): Projeto[] {
  const procurado = normalizar(nome);
  if (procurado === '') return [];
  return banco.projetos.filter(
    (p) => !p.arquivadoEm && normalizar(p.titulo).includes(procurado),
  );
}

/* ── O que vem da agenda de fora ─────────────────────────────────────────── */

/**
 * Um compromisso que não nasceu aqui.
 *
 * O agente respondia "o que tenho hoje?" olhando só o banco, e por isso mentia
 * por omissão: uma reunião marcada direto no Google não existia para ele. O
 * calendário já mostrava esses eventos; quem não os via era a conversa.
 *
 * O tipo é o mínimo que a resposta usa, de propósito — tanto o `EventoExterno`
 * do iCal quanto o `EventoParaTela` do Google servem sem conversão, e o
 * domínio não passa a depender de nenhum dos dois.
 *
 * Eles chegam por parâmetro, e não de dentro: buscar na rede é trabalho da
 * tela, e `responder` continua sendo função pura que se prova sem navegador.
 */
export interface CompromissoExterno {
  titulo: string;
  /** dia local `AAAA-MM-DD` */
  dia: string;
  /** `HH:MM` de início; ausente quando ocupa o dia inteiro */
  hora?: string;
  diaInteiro: boolean;
  /**
   * O id do evento no Google. É o que uma ação futura usa para apontar o
   * compromisso certo, em vez de reencontrá-lo pelo título.
   */
  uid?: string;
  /**
   * Se o Google deixa mexer neste evento. Ausente vale **não**: quem não
   * afirmou que dá para mexer não ganha uma ação por omissão.
   */
  mexivel?: boolean;
  /** Se a agenda é minha como organizador; convidado não decide pelos outros. */
  souOrganizador?: boolean;
  /**
   * O último dia de um evento de vários dias. Quem entrega os dados já o
   * repete em uma cópia por dia, todas com o mesmo `uid`; este campo serve
   * para quando a janela só deixa passar uma delas. Ausente vale um dia só.
   */
  ate?: string;
}

/** Os compromissos de um dia, em ordem de hora. Dia inteiro vem primeiro. */
function compromissosDoDia(
  compromissos: readonly CompromissoExterno[],
  dia: string,
): CompromissoExterno[] {
  return compromissos
    .filter((c) => c.dia === dia)
    .sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''));
}

/** A linha de um compromisso numa lista: a hora, ou a marca de dia inteiro. */
function listaDeCompromissos(itens: readonly CompromissoExterno[], titulo: string): Bloco {
  const mostrados = itens.slice(0, LIMITE_DA_LISTA);
  return {
    tipo: 'lista',
    titulo,
    restantes: itens.length - mostrados.length,
    itens: mostrados.map((c) => ({
      texto: c.titulo,
      detalhe: c.hora ?? 'Dia inteiro',
    })),
  };
}

/* ── Achar uma tarefa só ─────────────────────────────────────────────────── */

/**
 * O alvo de um comando: uma tarefa daqui, um compromisso de fora, ou nada.
 *
 * Quatro comandos — concluir, adiar, excluir e editar — fazem a mesma pergunta
 * e erram do mesmo jeito caro: agir no alvo errado só se descobre depois. A
 * escolha aqui é nunca escolher por conta própria quando há empate.
 *
 * Tarefa ganha de compromisso. O que o MSL criou é dele; e a tarefa espelhada
 * no Google carrega a marca `msl`, então nem chega na lista de compromissos.
 * O empate só vale **dentro** de cada grupo: uma tarefa e um compromisso com o
 * mesmo nome não pedem pergunta, a tarefa responde.
 */
export type Alvo =
  | { tipo: 'tarefa'; tarefa: Tarefa }
  | { tipo: 'compromisso'; compromisso: CompromissoExterno }
  | { tipo: 'nada'; resposta: Resposta };

/** O dia e a hora de um compromisso numa linha, para dizer de qual se fala. */
function quandoDoCompromisso(c: CompromissoExterno): string {
  return c.diaInteiro ? c.dia : `${c.dia}${c.hora ? `, ${c.hora}` : ''}`;
}

const SEM_COMO_MEXER =
  'Esse compromisso é do Google, e eu não consigo mexer nele daqui. ' +
  'Por ora, altere direto no Google Agenda.';

/** `Hoje`, `Amanhã`, `Ontem`; ou `Sexta, 25/09`, que se confere de relance. */
function diaFalado(dia: string, hoje: string): string {
  if (dia === hoje) return 'Hoje';
  if (dia === somarDias(hoje, 1)) return 'Amanhã';
  if (dia === somarDias(hoje, -1)) return 'Ontem';
  return `${maiuscula(DIAS_CHEIOS[diaDaSemana(dia)])}, ${dia.slice(8)}/${dia.slice(5, 7)}`;
}

/** O evento ocupa mais de um dia? Uma cópia cujo último dia é o próprio dia, não. */
function emVariosDias(c: CompromissoExterno): boolean {
  return (c.ate ?? c.dia) > c.dia;
}

/**
 * Quando o compromisso acontece, para a prévia.
 *
 * Em dia falado, e não em `2026-09-18`: a prévia existe para o dono pegar o
 * alvo errado depois de um ditado mal entendido, e "Amanhã" se confere num
 * relance. E "Vence", que a tarefa usa, é a palavra errada para uma reunião.
 * Evento de vários dias diz a faixa, porque apagar leva todos.
 */
function quandoFalado(c: CompromissoExterno, hoje: string): string {
  if (emVariosDias(c)) return `${diaFalado(c.dia, hoje)} a ${diaFalado(c.ate!, hoje)}`;
  const hora = horaDoCompromisso(c);
  const dia = diaFalado(c.dia, hoje);
  if (hora) return `${dia}, ${hora}`;
  return c.diaInteiro ? `${dia}, dia inteiro` : dia;
}

/**
 * A recusa honesta para compromisso que nasceu fora.
 *
 * O agente **mostra** esses compromissos desde que passou a enxergar o Google,
 * e responder "não achei" sobre algo que ele acabou de listar é mentir por
 * tecnicismo. Recebe uma lista porque, sem poder mexer em nenhum, listar todos
 * os que casam é mais útil do que perguntar qual — e perguntar para depois
 * recusar seria uma pergunta inútil.
 *
 * O `motivo` troca o texto quando a razão da recusa não é "não consigo": hoje
 * só concluir, que não é questão de permissão — do lado de lá não existe "feito".
 */
function recusaDoGoogle(
  deFora: readonly CompromissoExterno[],
  motivo: string = SEM_COMO_MEXER,
): Resposta {
  return {
    titulo: 'Essa é do Google',
    blocos: [
      {
        tipo: 'lista',
        itens: deFora.slice(0, LIMITE_DA_LISTA).map((c) => ({
          texto: c.titulo,
          detalhe: quandoDoCompromisso(c),
          tom: 'neutro' as const,
        })),
      },
      { tipo: 'texto', texto: motivo },
      { tipo: 'atalho', rotulo: 'Abrir calendário', destino: '/app/calendario' },
    ],
  };
}

/** A hora de início, que um evento de dia inteiro não tem, ainda que o dado traga uma. */
function horaDoCompromisso(c: CompromissoExterno): string | undefined {
  return c.diaInteiro ? undefined : c.hora;
}

/**
 * O id do evento, se dá mesmo para agir nele; senão, nada.
 *
 * Os dois campos são opcionais no tipo, então nada impede montar um efeito com
 * `uid` indefinido — quem impede é esta função, e as duas checagens fazem
 * trabalhos diferentes. O que barra a assinatura iCal é só `mexivel`: ela
 * **chega com `uid`**, e quando o `UID` falta o leitor usa o próprio título no
 * lugar (`ical.ts`). Ou seja, ter `uid` não prova que é um id do Google, e se a
 * checagem de `mexivel` cair um efeito sairia com o título de uma reunião no
 * lugar de um id. A checagem de `uid` cobre o outro lado: o tipo o deixa
 * ausente, e o id vazio também não aponta para evento nenhum, por isso o teste
 * é de verdade e não de `undefined`. Ausente vale "não dá".
 */
function idParaMexer(c: CompromissoExterno): string | undefined {
  return c.mexivel === true && c.uid ? c.uid : undefined;
}

function umAlvo(
  banco: Banco,
  alvo: string,
  hoje: string,
  compromissos: readonly CompromissoExterno[] = [],
): Alvo {
  const candidatas = acharTarefas(banco, alvo);

  if (candidatas.length === 1) return { tipo: 'tarefa', tarefa: candidatas[0] };

  if (candidatas.length > 1) {
    return {
      tipo: 'nada',
      resposta: {
        titulo: 'Qual delas?',
        blocos: [
          { tipo: 'texto', texto: `${candidatas.length} tarefas combinam com o que você escreveu.` },
          listaDeTarefas(ordenarTarefas(candidatas, hoje), hoje),
        ],
      },
    };
  }

  // Só olha a agenda de fora quando nenhuma tarefa casou: tarefa vence.
  const deFora = acharCompromissos(compromissos, alvo);

  if (deFora.length === 1) return { tipo: 'compromisso', compromisso: deFora[0] };

  if (deFora.length > 1) {
    // Se nenhum dá para mexer, o resultado seria a recusa de qualquer jeito.
    if (deFora.every((c) => idParaMexer(c) === undefined)) {
      return { tipo: 'nada', resposta: recusaDoGoogle(deFora) };
    }
    // Do mais próximo ao mais distante, e dentro do dia pela hora; o dia
    // inteiro vem antes, como na agenda.
    const ordenados = [...deFora].sort(
      (x, y) => x.dia.localeCompare(y.dia) || (x.hora ?? '').localeCompare(y.hora ?? ''),
    );
    const mostrados = ordenados.slice(0, LIMITE_DA_LISTA);
    return {
      tipo: 'nada',
      resposta: {
        titulo: 'Qual delas?',
        blocos: [
          { tipo: 'texto', texto: `${deFora.length} compromissos do Google combinam com o que você escreveu.` },
          {
            tipo: 'lista',
            restantes: ordenados.length - mostrados.length,
            itens: mostrados.map((c) => ({
              texto: c.titulo,
              detalhe: quandoDoCompromisso(c),
              tom: 'neutro' as const,
            })),
          },
        ],
      },
    };
  }

  return {
    tipo: 'nada',
    resposta: {
      titulo: 'Não achei essa tarefa',
      blocos: [{ tipo: 'texto', texto: `Nenhuma tarefa pendente com "${alvo}" no nome.` }],
    },
  };
}

/* ── Resposta ────────────────────────────────────────────────────────────── */

export type Tom = 'neutro' | 'bom' | 'atencao' | 'ruim';

export type Bloco =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'metricas'; itens: { rotulo: string; valor: string; tom?: Tom }[] }
  | {
      tipo: 'lista';
      titulo?: string;
      itens: { texto: string; detalhe?: string; tom?: Tom }[];
      /** quantos ficaram de fora do recorte, para a lista não mentir por omissão */
      restantes?: number;
    }
  | { tipo: 'barras'; itens: { rotulo: string; fracao: number; valor: string }[] }
  | { tipo: 'atalho'; rotulo: string; destino: string };

/**
 * As três coisas que dá para fazer num evento do Google. Concluir não está
 * aqui de propósito: não existe "feito" do lado de lá.
 */
export type AcaoNoGoogle =
  | { tipo: 'apagar' }
  | { tipo: 'mover'; dia: string; hora?: string }
  | { tipo: 'renomear'; novo: string };

/** O que a resposta pede que o banco faça. A tela executa; o domínio não. */
export type Efeito =
  | { tipo: 'criar-tarefa'; titulo: string; prazo?: string; hora?: string; contexto: Contexto }
  | { tipo: 'concluir-tarefa'; id: string; titulo: string }
  | { tipo: 'adiar-tarefa'; id: string; titulo: string; prazo: string; hora?: string }
  | { tipo: 'excluir-tarefa'; id: string; titulo: string }
  /** `titulo` é o nome de **agora**, para a tela conseguir dizer o que mexeu */
  | { tipo: 'editar-tarefa'; id: string; titulo: string; mudanca: MudancaDeTarefa }
  | {
      tipo: 'criar-lancamento';
      descricao: string;
      valor: number;
      entrada: boolean;
      categoria: Categoria;
    }
  /**
   * Uma ação num compromisso que vive no Google. `uid` aponta o evento certo e
   * `titulo` é o nome de **agora**, para a tela dizer o que mexeu. `souOrganizador`
   * viaja junto porque decide o tamanho do estrago, e a tela não deve ter de
   * adivinhá-lo de novo.
   */
  | {
      tipo: 'evento-do-google';
      uid: string;
      titulo: string;
      souOrganizador: boolean;
      acao: AcaoNoGoogle;
    }
  /** o texto vai para o compositor de pedido, que já existia */
  | { tipo: 'montar-pedido'; descricao: string };

export interface Resposta {
  titulo: string;
  blocos: Bloco[];
  efeito?: Efeito;
}

/**
 * O efeito precisa de um toque meu antes de acontecer?
 *
 * A régua é o estrago de um engano, não a importância do comando. Criar tarefa
 * e lançar gasto **somam**: se vier errado eu vejo na tela e corrijo, e o custo
 * do engano é uma linha a mais. Concluir, adiar e excluir **mexem no que já
 * existe** — e concluir a tarefa errada ou apagar a história dela é o tipo de
 * erro que só se descobre dias depois, quando já não dá para saber o que havia.
 *
 * A diferença ficou maior com o ditado: voz erra palavra, e palavra errada aqui
 * escolhe outra tarefa. A prévia existe para esse caso.
 */
export function exigeConfirmacao(efeito: Efeito): boolean {
  switch (efeito.tipo) {
    case 'concluir-tarefa':
    case 'adiar-tarefa':
    case 'excluir-tarefa':
    case 'editar-tarefa':
    case 'evento-do-google':
      return true;
    case 'criar-tarefa':
    case 'criar-lancamento':
    case 'montar-pedido':
      return false;
  }
}

/**
 * A frase do botão que confirma. Curta, e dizendo o que vai acontecer.
 *
 * Nunca "Cancelar": o botão que desiste já diz isso, e dois botões iguais lado
 * a lado com efeitos opostos cobram caro no dia errado. Por isso apagar um
 * evento é "Apagar no Google", que também diz **onde** o estrago acontece.
 */
export function rotuloDaConfirmacao(efeito: Efeito): string {
  switch (efeito.tipo) {
    case 'concluir-tarefa':
      return 'Concluir';
    case 'adiar-tarefa':
      return 'Adiar';
    case 'excluir-tarefa':
      return 'Excluir';
    case 'editar-tarefa':
      return 'Salvar';
    case 'evento-do-google':
      return efeito.acao.tipo === 'apagar' ? 'Apagar no Google' : 'Salvar no Google';
    default:
      return 'Confirmar';
  }
}

/** Para quem não organiza: mover e renomear não são dele, e o texto diz a quem recorrer. */
function recusaDeConvidado(c: CompromissoExterno): Resposta {
  return recusaDoGoogle(
    [c],
    'Esse evento é de outra pessoa, e alterá-lo não é algo que eu consiga fazer daqui. ' +
      'Fale com quem organiza, ou mexa direto no Google Agenda.',
  );
}

/**
 * A prévia de uma ação num evento do Google, e o efeito que a acompanha.
 *
 * É a última coisa entre uma frase e uma reunião real desaparecendo, então ela
 * diz o tamanho do estrago, que depende de quem eu sou no evento:
 * - organizador: apagar **cancela para todos os convidados**;
 * - convidado (ou ausente): apagar tira o evento só da minha agenda, e
 *   ninguém é avisado. É por isso que apagar vale para os dois.
 *
 * Mover e renomear só valem para o organizador. O Google só aceita a mudança de
 * um convidado quando o organizador habilitou `guestsCanModify`, campo que não
 * buscamos; e a régua da casa (`EventoParaTela.souOrganizador`, em `google.ts`)
 * é a mesma: na dúvida, não mexe, porque perder uma edição permitida custa menos
 * que tentar uma proibida. Convidado recebe recusa, e não um aviso que
 * afirmaria uma permissão que ninguém verificou.
 *
 * No infinitivo, como as outras prévias: isto é desenhado antes da confirmação,
 * e o efeito pode nunca acontecer.
 */
function acaoNoGoogle(
  c: CompromissoExterno,
  hoje: string,
  titulo: string,
  acao: AcaoNoGoogle,
): Resposta {
  const uid = idParaMexer(c);
  if (uid === undefined) return recusaDoGoogle([c]);

  // Só `true` vale organizador: ausente é convidado, que decide por menos gente.
  const souOrganizador = c.souOrganizador === true;

  if (acao.tipo !== 'apagar' && !souOrganizador) return recusaDeConvidado(c);
  // As cópias de um evento de vários dias foram unidas em uma: `mover` leva um
  // dia só, e não diz se o evento encolhe, estica ou anda inteiro.
  if (acao.tipo === 'mover' && emVariosDias(c)) {
    return recusaDoGoogle(
      [c],
      'Esse evento ocupa mais de um dia, e eu não sei movê-lo sem encurtar ou esticar. ' +
        'Mexa direto no Google Agenda.',
    );
  }

  let detalhe: string;
  let tom: Tom;
  let aviso: string;
  switch (acao.tipo) {
    case 'apagar':
      detalhe = quandoFalado(c, hoje);
      tom = souOrganizador ? 'ruim' : 'atencao';
      aviso = souOrganizador
        ? 'Apagar cancela a reunião para todos os convidados.'
        : 'Apagar tira o evento só da sua agenda, e ninguém é avisado.';
      break;
    case 'mover':
      detalhe = `${quandoFalado(c, hoje)} → ${quandoFalado(comoFicaDepoisDeMover(c, acao), hoje)}`;
      tom = 'atencao';
      aviso = AVISO_DE_MUDANCA;
      break;
    case 'renomear':
      detalhe = `${c.titulo} → ${acao.novo}`;
      tom = 'atencao';
      aviso = AVISO_DE_MUDANCA;
      break;
  }

  return {
    titulo,
    blocos: [
      { tipo: 'lista', itens: [{ texto: c.titulo, detalhe, tom }] },
      { tipo: 'texto', texto: aviso },
    ],
    efeito: { tipo: 'evento-do-google', uid, titulo: c.titulo, souOrganizador, acao },
  };
}

/**
 * O evento como ele fica depois de mover, para a prévia dizer o que vai
 * acontecer e não o que o dado de antes sugere.
 *
 * Duas heranças são perigosas e por isso cortadas: o `diaInteiro` (um evento
 * de dia inteiro que ganha hora deixa de ser de dia inteiro, e herdá-lo faria
 * a prévia esconder justamente a hora pedida) e o `ate` (que, atrás do dia
 * novo, viraria uma faixa que o evento não terá).
 */
function comoFicaDepoisDeMover(
  c: CompromissoExterno,
  acao: Extract<AcaoNoGoogle, { tipo: 'mover' }>,
): CompromissoExterno {
  return {
    ...c,
    dia: acao.dia,
    ate: undefined,
    hora: acao.hora,
    diaInteiro: c.diaInteiro && acao.hora === undefined,
  };
}

/** Só o organizador chega aqui: ele altera o evento de todos os convidados. */
const AVISO_DE_MUDANCA = 'Como você organiza, a mudança vale para todos os convidados.';

/**
 * Editar um compromisso do Google: só título e horário existem do lado de lá.
 *
 * Anotação e projeto são conceitos do MSL, e aceitar a frase em silêncio
 * faria a prévia prometer algo que nunca será gravado. Título e horário juntos
 * também recusam, mas por limite **meu**: `AcaoNoGoogle` carrega uma ação por
 * efeito. Escolher uma das duas por conta própria seria descartar metade do
 * pedido sem avisar.
 */
function editarCompromisso(c: CompromissoExterno, pedida: MudancaPedida, hoje: string): Resposta {
  if (idParaMexer(c) === undefined) return recusaDoGoogle([c]);
  // Antes de qualquer outra checagem: quem não pode alterar não deve ouvir
  // "peça o título, depois o horário" nem "só consigo mudar o título", porque
  // os pedidos seguintes seriam todos recusados.
  if (c.souOrganizador !== true) return recusaDeConvidado(c);

  if (pedida.anotacao !== undefined || pedida.projeto !== undefined) {
    return {
      titulo: 'Isso não existe no Google',
      blocos: [
        {
          tipo: 'texto',
          texto:
            'Um compromisso do Google não tem anotação nem projeto. ' +
            'Dele eu só consigo mudar o título e o horário.',
        },
      ],
    };
  }

  const querTitulo = pedida.titulo !== undefined;
  const querHora = pedida.hora !== undefined;
  if (querTitulo && querHora) {
    return {
      titulo: 'Uma coisa de cada vez',
      blocos: [
        {
          tipo: 'texto',
          texto: 'Por enquanto eu faço uma mudança por vez neste evento: peça o título, depois o horário.',
        },
      ],
    };
  }
  if (pedida.titulo !== undefined) {
    return acaoNoGoogle(c, hoje, 'Salvar', { tipo: 'renomear', novo: pedida.titulo });
  }
  if (pedida.hora !== undefined) {
    // Mudar só a hora é mover para o mesmo dia.
    return acaoNoGoogle(c, hoje, 'Salvar', { tipo: 'mover', dia: c.dia, hora: pedida.hora });
  }
  return {
    titulo: 'O que mudar?',
    blocos: [{ tipo: 'texto', texto: 'Diga o novo título ou o novo horário do evento.' }],
  };
}

/**
 * O que a prévia mostra embaixo do nome: o antes virando o depois.
 *
 * Só fala do que mudou. Uma mudança de projeto não precisa repetir a hora.
 */
function descreverMudanca(
  alvo: Tarefa,
  mudanca: MudancaDeTarefa,
  hoje: string,
  destino?: string,
): string {
  if (destino !== undefined) return `Vai para ${destino}`;
  if (mudanca.titulo !== undefined) return `${alvo.titulo} → ${mudanca.titulo}`;
  // Mesma forma que adiar usa: antes → depois. Mostrar só o antes faria a
  // prévia de uma mudança de hora exibir justamente o horário que vai sair.
  if (mudanca.hora !== undefined) {
    return `${detalheDe(alvo.prazo, alvo.hora, hoje)} → ${detalheDe(alvo.prazo, mudanca.hora, hoje)}`;
  }
  // A anotação **substitui** a que havia. Quando havia uma, a prévia mostra
  // qual vai embora: confirmar sem ver o que se perde não é confirmar.
  if (mudanca.anotacao !== undefined) {
    return alvo.anotacao ? `${alvo.anotacao} → ${mudanca.anotacao}` : mudanca.anotacao;
  }
  return detalheDe(alvo.prazo, alvo.hora, hoje);
}

function listaDeProjetos(projetos: readonly Projeto[]): Bloco {
  return {
    tipo: 'lista',
    itens: projetos.slice(0, LIMITE_DA_LISTA).map((p) => ({ texto: p.titulo, tom: 'neutro' })),
    restantes: Math.max(0, projetos.length - LIMITE_DA_LISTA),
  };
}

const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;

/** Quantos itens uma lista mostra antes de dizer quantos sobraram. */
const LIMITE_DA_LISTA = 6;

function listaDeTarefas(
  tarefas: readonly Tarefa[],
  hoje: string,
  titulo?: string,
): Bloco {
  const mostradas = tarefas.slice(0, LIMITE_DA_LISTA);
  return {
    tipo: 'lista',
    titulo,
    restantes: tarefas.length - mostradas.length,
    itens: mostradas.map((t) => ({
      texto: t.titulo,
      detalhe: descreverPrazo(t, hoje),
      tom: situacao(t, hoje) === 'atrasada' ? 'ruim' : situacao(t, hoje) === 'hoje' ? 'atencao' : 'neutro',
    })),
  };
}


/**
 * Prazo e hora na mesma linha.
 *
 * A hora só aparece acompanhada do dia: "às 15h" sozinho não diz de quando, e
 * uma tarefa com hora e sem prazo não chega a ser compromisso.
 */
function detalheDe(prazo: string | undefined, hora: string | undefined, hoje: string): string {
  if (!prazo) return 'Sem prazo';
  const dia = descreverPrazo({ prazo } as Tarefa, hoje);
  return hora ? `${dia}, ${hora}` : dia;
}

/** O mês de hoje, já com as repetições, no formato que o financeiro espera. */
function mesCorrente(banco: Banco, hoje: string) {
  const [ano, mes] = anoMesDe(hoje);
  const ocorrencias = ocorrenciasDoMes(banco, ano, mes);
  return {
    ano,
    mes,
    lancamentos: ocorrencias.map((o) => ({ ...o.lancamento, data: o.data })),
  };
}

function tomDoSaldo(centavos: number): Tom {
  return centavos > 0 ? 'bom' : centavos < 0 ? 'ruim' : 'neutro';
}

/**
 * A resposta para uma intenção.
 *
 * Função pura: recebe o banco, devolve blocos. O que muda dados sai como
 * `efeito`, que a tela executa — assim tudo aqui é testável sem navegador, e
 * nenhuma resposta grava nada por conta própria.
 */
export function responder(
  banco: Banco,
  intencao: Intencao,
  hoje: string,
  // Opcional porque a maioria das respostas não olha a agenda, e porque um
  // aparelho sem agenda assinada é um estado normal, não uma falta.
  compromissos: readonly CompromissoExterno[] = [],
): Resposta {
  switch (intencao.tipo) {
    case 'ajuda':
      return {
        titulo: 'O que eu sei fazer',
        blocos: [
          {
            tipo: 'texto',
            texto:
              'Eu leio os seus dados e respondo com o que eles dizem. Não invento número. ' +
              'Os dados ficam neste aparelho; só a frase que você ditar sai, para virar texto.',
          },
          {
            tipo: 'lista',
            titulo: 'Pergunte',
            itens: [
              { texto: 'Como foi minha semana?', detalhe: 'relatório do período' },
              { texto: 'O que está atrasado?', detalhe: 'tarefas e projetos' },
              { texto: 'O que tenho hoje?', detalhe: 'rotinas e prazos do dia' },
              { texto: 'Quanto gastei com moradia?', detalhe: 'por categoria, no mês' },
              { texto: 'Como estão meus projetos?', detalhe: 'ritmo, parados e previsão' },
            ],
          },
          {
            tipo: 'lista',
            titulo: 'Ou mande fazer',
            itens: [
              { texto: 'Criar tarefa renovar o seguro sexta', detalhe: 'entende a data escrita' },
              {
                texto: 'Marcar reunião com o contador quinta às 15h',
                detalhe: 'vira compromisso, e sobe para o Google Agenda',
              },
              { texto: 'Adiar o dentista para dia 25', detalhe: 'mantém a hora, pergunta antes' },
              { texto: 'Concluir renovar o seguro', detalhe: 'pergunta antes de marcar' },
              { texto: 'Excluir a tarefa comprar cadeira', detalhe: 'pergunta antes de apagar' },
              { texto: 'Gastei 250 no mercado', detalhe: 'lança, e adivinha a categoria' },
            ],
          },
          {
            tipo: 'lista',
            titulo: 'Ou mande mudar o que já existe',
            itens: [
              { texto: 'Renomear a reunião para call de alinhamento', detalhe: 'troca só o nome' },
              { texto: 'Mudar o dentista para as 16h', detalhe: 'muda a hora e mantém o dia' },
              {
                texto: 'Anotar na reunião que o cliente pediu orçamento',
                detalhe: 'escreve por cima da anotação que houver',
              },
              { texto: 'Jogar o dentista para o projeto Acttus', detalhe: 'move entre projetos' },
            ],
          },
          {
            tipo: 'texto',
            texto:
              'O que mexe no que já existe — concluir, adiar, excluir, mudar — mostra antes o ' +
              'que vai fazer e espera o seu toque. O que só soma acontece na hora.',
          },
          {
            tipo: 'texto',
            texto:
              'Compromisso que nasceu no Google eu mostro, mas não mexo: altere direto lá. ' +
              'Qualquer outra coisa vira um pedido pronto para colar no Claude Code, que é onde ' +
              'o sistema muda — com teste e revisão.',
          },
        ],
      };

    case 'resumo':
      return resumo(banco, intencao.periodo, hoje);

    case 'atrasos': {
      const tarefasAtrasadas = ordenarTarefas(
        banco.tarefas.filter((t) => situacao(t, hoje) === 'atrasada'),
        hoje,
      );
      const projetosParados = projetosQuePedemAtencao(banco, hoje);

      if (tarefasAtrasadas.length === 0 && projetosParados.length === 0) {
        return {
          titulo: 'Nada atrasado',
          blocos: [{ tipo: 'texto', texto: 'Nenhuma tarefa vencida e nenhum projeto parado.' }],
        };
      }

      const blocos: Bloco[] = [];
      if (tarefasAtrasadas.length > 0) {
        blocos.push(listaDeTarefas(tarefasAtrasadas, hoje, 'Tarefas vencidas'));
        blocos.push({ tipo: 'atalho', rotulo: 'Abrir tarefas', destino: '/app/tarefas' });
      }
      if (projetosParados.length > 0) {
        blocos.push({
          tipo: 'lista',
          titulo: 'Projetos',
          itens: projetosParados.map((p) => ({
            texto: p.projeto.titulo,
            detalhe: p.parado
              ? `Parado há ${plural(p.paradoHa, 'dia', 'dias')}`
              : `${plural(p.atrasadas, 'tarefa atrasada', 'tarefas atrasadas')}`,
            tom: 'ruim' as Tom,
          })),
        });
        blocos.push({ tipo: 'atalho', rotulo: 'Abrir projetos', destino: '/app/projetos' });
      }
      return { titulo: 'O que está atrasado', blocos };
    }

    case 'agenda':
      return intencao.periodo === 'hoje'
        ? agendaDeHoje(banco, hoje, compromissos)
        : agendaDaSemana(banco, hoje, compromissos);

    case 'gastos': {
      const { lancamentos, ano, mes } = mesCorrente(banco, hoje);
      const jaSaiu = realizados(lancamentos, hoje);
      const porCategoria = saidasPorCategoria(jaSaiu);

      if (intencao.categoria) {
        const alvo = porCategoria.find((c) => c.categoria === intencao.categoria);
        const rotulo = ROTULO_CATEGORIA[intencao.categoria];
        return {
          titulo: `${rotulo} em ${nomeDoMes(ano, mes)}`,
          blocos: [
            {
              tipo: 'metricas',
              itens: [
                { rotulo: `Gasto com ${rotulo.toLowerCase()}`, valor: formatarMoeda(alvo?.total ?? 0) },
                {
                  rotulo: 'Fatia das saídas',
                  valor: formatarPorcento(alvo?.fracao ?? 0),
                },
              ],
            },
            { tipo: 'atalho', rotulo: 'Abrir financeiro', destino: '/app/financeiro' },
          ],
        };
      }

      if (porCategoria.length === 0) {
        return {
          titulo: `Gastos em ${nomeDoMes(ano, mes)}`,
          blocos: [{ tipo: 'texto', texto: 'Nenhuma saída realizada neste mês ainda.' }],
        };
      }

      const total = porCategoria.reduce((s, c) => s + c.total, 0);
      return {
        titulo: `Gastos em ${nomeDoMes(ano, mes)}`,
        blocos: [
          { tipo: 'metricas', itens: [{ rotulo: 'Total já saiu', valor: formatarMoeda(total) }] },
          {
            tipo: 'barras',
            itens: porCategoria.map((c) => ({
              rotulo: ROTULO_CATEGORIA[c.categoria],
              fracao: c.fracao,
              valor: formatarMoeda(c.total),
            })),
          },
          { tipo: 'atalho', rotulo: 'Abrir financeiro', destino: '/app/financeiro' },
        ],
      };
    }

    case 'saldo': {
      const { lancamentos, ano, mes } = mesCorrente(banco, hoje);
      const r = resumoFinanceiro(lancamentos, hoje);
      const fixo = comprometidoPorMes(banco);
      return {
        titulo: `Dinheiro em ${nomeDoMes(ano, mes)}`,
        blocos: [
          {
            tipo: 'metricas',
            itens: [
              {
                rotulo: 'Saldo até hoje',
                valor: formatarMoeda(r.saldoRealizado),
                tom: tomDoSaldo(r.saldoRealizado),
              },
              {
                rotulo: 'Previsto no fim do mês',
                valor: formatarMoeda(r.saldoPrevisto),
                tom: tomDoSaldo(r.saldoPrevisto),
              },
              { rotulo: 'Entrou', valor: formatarMoeda(r.entradas) },
              { rotulo: 'Saiu', valor: formatarMoeda(r.saidas) },
            ],
          },
          ...(fixo.saidas > 0
            ? [
                {
                  tipo: 'texto' as const,
                  texto: `${formatarMoeda(fixo.saidas)} por mês já estão comprometidos com o que se repete.`,
                },
              ]
            : []),
          { tipo: 'atalho', rotulo: 'Abrir financeiro', destino: '/app/financeiro' },
        ],
      };
    }

    case 'projetos': {
      const paineis = painelDosProjetos(banco, hoje);
      if (paineis.length === 0) {
        return {
          titulo: 'Projetos',
          blocos: [{ tipo: 'texto', texto: 'Nenhum projeto ativo ainda.' }],
        };
      }
      return {
        titulo: 'Seus projetos',
        blocos: [
          {
            tipo: 'barras',
            itens: paineis.map((p) => ({
              rotulo: p.projeto.titulo,
              fracao: p.progresso.fracao,
              valor: `${p.progresso.concluidas}/${p.progresso.total}`,
            })),
          },
          {
            tipo: 'lista',
            titulo: 'O que cada um está esperando',
            itens: paineis.map((p) => ({
              texto: p.projeto.titulo,
              detalhe: p.parado
                ? `Parado há ${plural(p.paradoHa, 'dia', 'dias')}`
                : p.proxima
                  ? `Próxima: ${p.proxima.titulo}`
                  : 'Sem tarefas ainda',
              tom: p.parado || p.situacao === 'atrasado' ? ('ruim' as Tom) : ('neutro' as Tom),
            })),
          },
          { tipo: 'atalho', rotulo: 'Abrir projetos', destino: '/app/projetos' },
        ],
      };
    }

    case 'rotina': {
      const itens = agendaDoDia(banco, hoje);
      const ativas = banco.rotinas.filter((r) => !r.arquivada);
      if (ativas.length === 0) {
        return {
          titulo: 'Rotina',
          blocos: [{ tipo: 'texto', texto: 'Nenhuma rotina ativa ainda.' }],
        };
      }
      return {
        titulo: 'Sua rotina',
        blocos: [
          {
            tipo: 'metricas',
            itens: [
              {
                rotulo: 'Hoje',
                valor: `${itens.filter((i) => i.feita).length}/${itens.length}`,
                tom: progressoDoDia(banco, hoje) === 1 ? 'bom' : 'neutro',
              },
              { rotulo: 'Rotinas ativas', valor: formatarNumero(ativas.length) },
            ],
          },
          {
            tipo: 'lista',
            titulo: 'Sequência de cada uma',
            itens: ativas.map((r) => ({
              texto: r.titulo,
              detalhe: `${plural(sequencia(banco, r, hoje), 'dia seguido', 'dias seguidos')} · ${descreverRotina(r).toLowerCase()}`,
            })),
          },
          { tipo: 'atalho', rotulo: 'Abrir rotina', destino: '/app/rotina' },
        ],
      };
    }

    case 'criar-tarefa':
      return {
        titulo: 'Tarefa criada',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              {
                texto: intencao.titulo,
                detalhe: detalheDe(intencao.prazo, intencao.hora, hoje),
              },
            ],
          },
          { tipo: 'atalho', rotulo: 'Abrir tarefas', destino: '/app/tarefas' },
        ],
        efeito: {
          tipo: 'criar-tarefa',
          titulo: intencao.titulo,
          prazo: intencao.prazo,
          hora: intencao.hora,
          contexto: intencao.contexto,
        },
      };

    case 'concluir-tarefa': {
      const achado = umAlvo(banco, intencao.alvo, hoje, compromissos);
      if (achado.tipo === 'nada') return achado.resposta;
      // Evento não se conclui: do lado do Google não existe "feito". Apagar,
      // mover e renomear atravessam; concluir fica com a recusa.
      if (achado.tipo === 'compromisso') {
        return recusaDoGoogle(
          [achado.compromisso],
          'Compromisso do Google não se conclui: do lado de lá não existe "feito".',
        );
      }
      const alvo = achado.tarefa;
      // No passado ("Concluída", "Marcada agora") esta resposta mentia: ela é
      // desenhada **antes** da confirmação, e o efeito pode nunca acontecer.
      // Quem anuncia o que foi feito é a tela, depois do toque.
      return {
        titulo: 'Concluir',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              { texto: alvo.titulo, detalhe: detalheDe(alvo.prazo, alvo.hora, hoje), tom: 'neutro' },
            ],
          },
        ],
        efeito: { tipo: 'concluir-tarefa', id: alvo.id, titulo: alvo.titulo },
      };
    }

    case 'adiar-tarefa': {
      const alvo = umAlvo(banco, intencao.alvo, hoje, compromissos);
      if (alvo.tipo === 'nada') return alvo.resposta;
      if (alvo.tipo === 'compromisso') {
        const c = alvo.compromisso;
        return acaoNoGoogle(c, hoje, 'Adiar', {
          tipo: 'mover',
          dia: intencao.prazo,
          hora: intencao.hora ?? horaDoCompromisso(c),
        });
      }

      const antes = detalheDe(alvo.tarefa.prazo, alvo.tarefa.hora, hoje);
      const depois = detalheDe(intencao.prazo, intencao.hora ?? alvo.tarefa.hora, hoje);
      return {
        titulo: 'Adiar',
        blocos: [
          {
            tipo: 'lista',
            itens: [{ texto: alvo.tarefa.titulo, detalhe: `${antes} → ${depois}`, tom: 'atencao' }],
          },
        ],
        efeito: {
          tipo: 'adiar-tarefa',
          id: alvo.tarefa.id,
          titulo: alvo.tarefa.titulo,
          prazo: intencao.prazo,
          hora: intencao.hora,
        },
      };
    }

    case 'excluir-tarefa': {
      const alvo = umAlvo(banco, intencao.alvo, hoje, compromissos);
      if (alvo.tipo === 'nada') return alvo.resposta;
      if (alvo.tipo === 'compromisso') {
        return acaoNoGoogle(alvo.compromisso, hoje, 'Apagar', { tipo: 'apagar' });
      }

      return {
        titulo: 'Excluir',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              {
                texto: alvo.tarefa.titulo,
                detalhe: detalheDe(alvo.tarefa.prazo, alvo.tarefa.hora, hoje),
                tom: 'ruim',
              },
            ],
          },
          { tipo: 'texto', texto: 'Excluir apaga a tarefa e o histórico dela. Não tem desfazer.' },
        ],
        efeito: { tipo: 'excluir-tarefa', id: alvo.tarefa.id, titulo: alvo.tarefa.titulo },
      };
    }

    case 'editar-tarefa': {
      const alvo = umAlvo(banco, intencao.alvo, hoje, compromissos);
      if (alvo.tipo === 'nada') return alvo.resposta;
      const pedida = intencao.mudanca;
      if (alvo.tipo === 'compromisso') return editarCompromisso(alvo.compromisso, pedida, hoje);

      const mudanca: MudancaDeTarefa = {};
      // Um por um, e não um espalhamento: `{ hora: undefined }` chegaria no
      // banco como ordem de apagar a hora, e a frase não pediu isso.
      if (pedida.titulo !== undefined) mudanca.titulo = pedida.titulo;
      if (pedida.hora !== undefined) mudanca.hora = pedida.hora;
      if (pedida.anotacao !== undefined) mudanca.anotacao = pedida.anotacao;

      let destino: string | undefined;
      if (pedida.projeto !== undefined) {
        const achados = acharProjetos(banco, pedida.projeto);
        if (achados.length === 0) {
          return {
            titulo: 'Não achei esse projeto',
            blocos: [
              {
                tipo: 'texto',
                texto: `Nenhum projeto ativo com "${pedida.projeto}" no nome.`,
              },
              { tipo: 'atalho', rotulo: 'Abrir projetos', destino: '/app/projetos' },
            ],
          };
        }
        if (achados.length > 1) {
          return {
            titulo: 'Qual deles?',
            blocos: [
              listaDeProjetos(achados),
              { tipo: 'texto', texto: 'Escreva o nome com mais letras e eu mexo no certo.' },
            ],
          };
        }
        mudanca.projetoId = achados[0].id;
        destino = achados[0].titulo;
      }

      // No infinitivo, como concluir, adiar e excluir: isto é desenhado antes
      // da confirmação, e o efeito pode nunca acontecer.
      return {
        titulo: 'Salvar',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              {
                texto: alvo.tarefa.titulo,
                detalhe: descreverMudanca(alvo.tarefa, mudanca, hoje, destino),
                tom: 'atencao',
              },
            ],
          },
        ],
        efeito: {
          tipo: 'editar-tarefa',
          id: alvo.tarefa.id,
          titulo: alvo.tarefa.titulo,
          mudanca,
        },
      };
    }

    case 'lancar':
      return {
        titulo: intencao.entrada ? 'Entrada lançada' : 'Gasto lançado',
        blocos: [
          {
            tipo: 'metricas',
            itens: [
              {
                rotulo: intencao.descricao,
                valor: `${intencao.entrada ? '+' : '−'}${formatarMoeda(intencao.valor)}`,
                tom: intencao.entrada ? 'bom' : 'neutro',
              },
              { rotulo: 'Categoria', valor: ROTULO_CATEGORIA[intencao.categoria] },
            ],
          },
          { tipo: 'atalho', rotulo: 'Abrir financeiro', destino: '/app/financeiro' },
        ],
        efeito: {
          tipo: 'criar-lancamento',
          descricao: intencao.descricao,
          valor: intencao.valor,
          entrada: intencao.entrada,
          categoria: intencao.categoria,
        },
      };

    case 'pedido':
      return {
        titulo: 'Isto eu não resolvo sozinho',
        blocos: [
          {
            tipo: 'texto',
            texto:
              'Eu só respondo sobre os seus dados. Para mudar o sistema, montei um pedido com ' +
              'as regras do projeto e o estado atual — cole no Claude Code.',
          },
        ],
        efeito: { tipo: 'montar-pedido', descricao: intencao.descricao },
      };
  }
}

/* ── Relatórios ──────────────────────────────────────────────────────────── */

function agendaDeHoje(
  banco: Banco,
  hoje: string,
  compromissos: readonly CompromissoExterno[] = [],
): Resposta {
  const rotinas = agendaDoDia(banco, hoje);
  const pendentesDeRotina = rotinas.filter((i) => !i.feita);
  const tarefas = tarefasDoDia(banco, hoje);
  const doDia = compromissosDoDia(compromissos, hoje);

  // "Dia cumprido" com uma reunião às 15h é a mentira que este caso existia
  // para evitar: o compromisso entra na conta do vazio, não só na lista.
  if (pendentesDeRotina.length === 0 && tarefas.length === 0 && doDia.length === 0) {
    return {
      titulo: 'Hoje',
      blocos: [
        {
          tipo: 'texto',
          texto:
            rotinas.length === 0 && banco.tarefas.length === 0
              ? 'Nada cadastrado para hoje.'
              : 'Nada pendente para hoje. Dia cumprido.',
        },
      ],
    };
  }

  const blocos: Bloco[] = [];
  // A agenda vem primeiro: compromisso tem hora marcada, e é ele que decide o
  // que cabe no resto do dia.
  if (doDia.length > 0) {
    blocos.push(listaDeCompromissos(doDia, 'Na agenda'));
    blocos.push({ tipo: 'atalho', rotulo: 'Abrir calendário', destino: '/app/calendario' });
  }
  if (pendentesDeRotina.length > 0) {
    blocos.push({
      tipo: 'lista',
      titulo: 'Rotinas que faltam',
      itens: pendentesDeRotina.map((i) => ({
        texto: i.rotina.titulo,
        detalhe: descreverRotina(i.rotina),
      })),
    });
    blocos.push({ tipo: 'atalho', rotulo: 'Abrir rotina', destino: '/app/rotina' });
  }
  if (tarefas.length > 0) {
    blocos.push(listaDeTarefas(tarefas, hoje, 'Tarefas'));
    blocos.push({ tipo: 'atalho', rotulo: 'Abrir tarefas', destino: '/app/tarefas' });
  }
  return { titulo: 'Hoje', blocos };
}

function agendaDaSemana(
  banco: Banco,
  hoje: string,
  compromissos: readonly CompromissoExterno[] = [],
): Resposta {
  const dias = semanaDe(hoje);
  const semana = semanaDeTarefas(banco, dias[0]);
  const total = semana.reduce((s, d) => s + d.pendentes.length, 0);
  const naSemana = dias.flatMap((d) => compromissosDoDia(compromissos, d));

  return {
    titulo: nomeDaSemana(hoje),
    blocos: [
      {
        tipo: 'metricas',
        itens: [
          { rotulo: 'Vencem nesta semana', valor: formatarNumero(total) },
          { rotulo: 'Na agenda', valor: formatarNumero(naSemana.length) },
          {
            rotulo: 'Já concluídas',
            valor: formatarNumero(semana.reduce((s, d) => s + d.concluidas.length, 0)),
            tom: 'bom',
          },
        ],
      },
      // Um dia por vez, com o compromisso ao lado da tarefa que vence nele —
      // separar as duas listas obrigaria a cruzar datas de cabeça.
      ...dias.flatMap((dia): Bloco[] => {
        const doDia = compromissosDoDia(compromissos, dia);
        const pendentes = semana.find((d) => d.dia === dia)?.pendentes ?? [];
        if (doDia.length === 0 && pendentes.length === 0) return [];
        const titulo = tituloDoDia(dia, hoje);
        return [
          ...(doDia.length > 0 ? [listaDeCompromissos(doDia, titulo)] : []),
          ...(pendentes.length > 0
            ? [listaDeTarefas(ordenarTarefas(pendentes, hoje), hoje, doDia.length > 0 ? undefined : titulo)]
            : []),
        ];
      }),
      ...(total === 0 && naSemana.length === 0
        ? [{ tipo: 'texto' as const, texto: 'Nada marcado nem vencendo nesta semana.' }]
        : []),
      { tipo: 'atalho', rotulo: 'Abrir calendário', destino: '/app/calendario' },
    ],
  };
}

const DIAS_CHEIOS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function tituloDoDia(dia: string, hoje: string): string {
  if (dia === hoje) return 'Hoje';
  if (dia === somarDias(hoje, 1)) return 'Amanhã';
  return `${DIAS_CHEIOS[diaDaSemana(dia)]}, dia ${Number(dia.slice(8))}`;
}

/**
 * O relatório de um período.
 *
 * Os quatro pilares no mesmo lugar, sempre com a mesma forma: o que aconteceu
 * com rotina, tarefa, dinheiro e projeto. É o que eu pediria a um assistente
 * no fim da semana.
 */
function resumo(banco: Banco, periodo: Periodo, hoje: string): Resposta {
  const de =
    periodo === 'hoje' ? hoje : periodo === 'semana' ? inicioDaSemana(hoje) : `${hoje.slice(0, 7)}-01`;

  const titulo =
    periodo === 'hoje' ? 'Hoje' : periodo === 'semana' ? nomeDaSemana(hoje) : nomeDoMes(...anoMesDe(hoje));

  // Rotina: a média do quanto de cada dia foi cumprido, do início até hoje.
  const dias: string[] = [];
  for (let d = de; d <= hoje; d = somarDias(d, 1)) dias.push(d);
  const media = dias.reduce((s, d) => s + progressoDoDia(banco, d), 0) / dias.length;

  const tarefas = resumoTarefas(banco, hoje);
  const feitasNoPeriodo = concluidasPorDia(banco, hoje, dias.length).reduce(
    (s, p) => s + p.total,
    0,
  );

  const { lancamentos } = mesCorrente(banco, hoje);
  const financeiro = resumoFinanceiro(lancamentos, hoje);

  const paineis = painelDosProjetos(banco, hoje);
  const atencao = projetosQuePedemAtencao(banco, hoje);
  const emAndamento = banco.tarefas.filter((t) => estadoDe(t) === 'fazendo').length;

  const blocos: Bloco[] = [
    {
      tipo: 'metricas',
      itens: [
        {
          rotulo: dias.length === 1 ? 'Da rotina de hoje' : 'Da rotina, na média',
          valor: formatarPorcento(media),
          tom: media >= 0.8 ? 'bom' : media >= 0.5 ? 'atencao' : 'ruim',
        },
        {
          rotulo: 'Tarefas concluídas',
          valor: formatarNumero(feitasNoPeriodo),
          tom: feitasNoPeriodo > 0 ? 'bom' : 'neutro',
        },
        {
          rotulo: 'Ainda pendentes',
          valor: formatarNumero(tarefas.pendentes),
          tom: tarefas.atrasadas > 0 ? 'ruim' : 'neutro',
        },
        {
          rotulo: 'Saldo do mês até hoje',
          valor: formatarMoeda(financeiro.saldoRealizado),
          tom: tomDoSaldo(financeiro.saldoRealizado),
        },
      ],
    },
  ];

  const frases: string[] = [];
  // A frase inteira concorda, e não só o começo dela: "1 tarefa venceu e
  // continuam abertas" é o mesmo erro do "1 concluídos" que já apareceu aqui.
  if (tarefas.atrasadas > 0) {
    frases.push(
      tarefas.atrasadas === 1
        ? '1 tarefa venceu e continua aberta.'
        : `${tarefas.atrasadas} tarefas venceram e continuam abertas.`,
    );
  }
  if (emAndamento > 0) {
    frases.push(
      emAndamento === 1
        ? '1 tarefa está em andamento no quadro.'
        : `${emAndamento} tarefas estão em andamento no quadro.`,
    );
  }
  if (atencao.length > 0) {
    frases.push(
      `${plural(atencao.length, 'projeto pede', 'projetos pedem')} atenção: ${atencao
        .map((p) => p.projeto.titulo)
        .join(', ')}.`,
    );
  } else if (paineis.length > 0) {
    frases.push('Nenhum projeto atrasado ou parado.');
  }
  if (frases.length > 0) blocos.push({ tipo: 'texto', texto: frases.join(' ') });

  if (tarefas.atrasadas > 0) {
    blocos.push(
      listaDeTarefas(
        ordenarTarefas(
          banco.tarefas.filter((t) => situacao(t, hoje) === 'atrasada'),
          hoje,
        ),
        hoje,
        'O que ficou para trás',
      ),
    );
  }

  blocos.push({ tipo: 'atalho', rotulo: 'Ver no início', destino: '/app' });

  return { titulo: `Resumo · ${titulo}`, blocos };
}
