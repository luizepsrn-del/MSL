import {
  CATEGORIAS,
  ROTULO_CATEGORIA,
  type Banco,
  type Categoria,
  type Contexto,
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
  descreverRecorrencia,
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

/* ── Intenção ────────────────────────────────────────────────────────────── */

export type Periodo = 'hoje' | 'semana' | 'mes';

export type Intencao =
  | { tipo: 'ajuda' }
  | { tipo: 'resumo'; periodo: Periodo }
  | { tipo: 'atrasos' }
  | { tipo: 'agenda'; periodo: 'hoje' | 'semana' }
  | { tipo: 'gastos'; categoria?: Categoria }
  | { tipo: 'saldo' }
  | { tipo: 'projetos' }
  | { tipo: 'rotina' }
  | { tipo: 'criar-tarefa'; titulo: string; prazo?: string; contexto: Contexto }
  | { tipo: 'concluir-tarefa'; alvo: string }
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

  const concluir = t.match(/^(concluir|concluido|terminei|finalizei|marcar|feito)\s+(.+)$/);
  if (concluir) {
    const alvo = concluir[2].replace(/^(a\s+)?tarefa\s+/, '').trim();
    if (alvo !== '') return { tipo: 'concluir-tarefa', alvo };
  }

  const criar = cru.match(
    /^(criar|nova|novo|adicionar|anotar|lembrar)\s+(?:de\s+)?(?:uma\s+)?(?:tarefa\s+)?(.+)$/i,
  );
  if (criar) {
    const { prazo, resto } = lerPrazo(criar[2], hoje);
    const titulo = resto.trim();
    if (titulo !== '') {
      return {
        tipo: 'criar-tarefa',
        titulo: maiuscula(titulo),
        prazo,
        contexto: contem(t, 'trabalho', 'cliente', 'reuniao', 'proposta', 'contrato')
          ? 'profissional'
          : 'pessoal',
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

/** O que a resposta pede que o banco faça. A tela executa; o domínio não. */
export type Efeito =
  | { tipo: 'criar-tarefa'; titulo: string; prazo?: string; contexto: Contexto }
  | { tipo: 'concluir-tarefa'; id: string; titulo: string }
  | {
      tipo: 'criar-lancamento';
      descricao: string;
      valor: number;
      entrada: boolean;
      categoria: Categoria;
    }
  /** o texto vai para o compositor de pedido, que já existia */
  | { tipo: 'montar-pedido'; descricao: string };

export interface Resposta {
  titulo: string;
  blocos: Bloco[];
  efeito?: Efeito;
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
export function responder(banco: Banco, intencao: Intencao, hoje: string): Resposta {
  switch (intencao.tipo) {
    case 'ajuda':
      return {
        titulo: 'O que eu sei fazer',
        blocos: [
          {
            tipo: 'texto',
            texto:
              'Eu leio os seus dados e respondo com o que eles dizem. Não invento número, ' +
              'e nada sai deste aparelho.',
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
              { texto: 'Concluir renovar o seguro', detalhe: 'marca como feita' },
              { texto: 'Gastei 250 no mercado', detalhe: 'lança, e adivinha a categoria' },
            ],
          },
          {
            tipo: 'texto',
            texto:
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
      return intencao.periodo === 'hoje' ? agendaDeHoje(banco, hoje) : agendaDaSemana(banco, hoje);

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
              detalhe: `${plural(sequencia(banco, r, hoje), 'dia seguido', 'dias seguidos')} · ${descreverRecorrencia(r.recorrencia).toLowerCase()}`,
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
                detalhe: intencao.prazo
                  ? descreverPrazo(
                      { prazo: intencao.prazo } as Tarefa,
                      hoje,
                    )
                  : 'Sem prazo',
              },
            ],
          },
          { tipo: 'atalho', rotulo: 'Abrir tarefas', destino: '/app/tarefas' },
        ],
        efeito: {
          tipo: 'criar-tarefa',
          titulo: intencao.titulo,
          prazo: intencao.prazo,
          contexto: intencao.contexto,
        },
      };

    case 'concluir-tarefa': {
      const candidatas = acharTarefas(banco, intencao.alvo);

      if (candidatas.length === 0) {
        return {
          titulo: 'Não achei essa tarefa',
          blocos: [
            {
              tipo: 'texto',
              texto: `Nenhuma tarefa pendente com "${intencao.alvo}" no nome.`,
            },
          ],
        };
      }

      if (candidatas.length > 1) {
        // Concluir a errada é o tipo de erro que só se descobre depois.
        return {
          titulo: 'Qual delas?',
          blocos: [
            { tipo: 'texto', texto: `${candidatas.length} tarefas combinam com o que você escreveu.` },
            listaDeTarefas(ordenarTarefas(candidatas, hoje), hoje),
          ],
        };
      }

      const alvo = candidatas[0];
      return {
        titulo: 'Concluída',
        blocos: [
          { tipo: 'lista', itens: [{ texto: alvo.titulo, detalhe: 'Marcada agora', tom: 'bom' }] },
        ],
        efeito: { tipo: 'concluir-tarefa', id: alvo.id, titulo: alvo.titulo },
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

function agendaDeHoje(banco: Banco, hoje: string): Resposta {
  const rotinas = agendaDoDia(banco, hoje);
  const pendentesDeRotina = rotinas.filter((i) => !i.feita);
  const tarefas = tarefasDoDia(banco, hoje);

  if (pendentesDeRotina.length === 0 && tarefas.length === 0) {
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
  if (pendentesDeRotina.length > 0) {
    blocos.push({
      tipo: 'lista',
      titulo: 'Rotinas que faltam',
      itens: pendentesDeRotina.map((i) => ({
        texto: i.rotina.titulo,
        detalhe: descreverRecorrencia(i.rotina.recorrencia),
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

function agendaDaSemana(banco: Banco, hoje: string): Resposta {
  const dias = semanaDe(hoje);
  const semana = semanaDeTarefas(banco, dias[0]);
  const total = semana.reduce((s, d) => s + d.pendentes.length, 0);

  return {
    titulo: nomeDaSemana(hoje),
    blocos: [
      {
        tipo: 'metricas',
        itens: [
          { rotulo: 'Vencem nesta semana', valor: formatarNumero(total) },
          {
            rotulo: 'Já concluídas',
            valor: formatarNumero(semana.reduce((s, d) => s + d.concluidas.length, 0)),
            tom: 'bom',
          },
        ],
      },
      ...(total === 0
        ? [{ tipo: 'texto' as const, texto: 'Nenhuma tarefa vence nesta semana.' }]
        : semana
            .filter((d) => d.pendentes.length > 0)
            .map((d) => listaDeTarefas(ordenarTarefas(d.pendentes, hoje), hoje, tituloDoDia(d.dia, hoje)))),
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
