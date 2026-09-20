import type { Preferencias } from '../dados/esquema';

/**
 * O que eu escolhi sobre como o Início se apresenta.
 *
 * O catálogo mora aqui, e não na tela, por dois motivos: a preferência guarda
 * **ids**, então alguém precisa saber quais existem para descartar o que não
 * existe mais; e a ordem é regra, com teste, como todo o resto do domínio.
 */

export type Largura = 'metade' | 'inteira';

export interface BlocoDoInicio {
  id: string;
  rotulo: string;
  descricao: string;
  /** blocos largos ocupam as duas colunas no desktop */
  largura: Largura;
}

/** A ordem de fábrica. Quem nunca mexeu vê exatamente esta lista. */
export const BLOCOS_DO_INICIO: BlocoDoInicio[] = [
  {
    id: 'indicadores',
    rotulo: 'Indicadores do dia',
    descricao: 'Rotina cumprida, sequência, tarefas, projetos e saldo',
    largura: 'inteira',
  },
  {
    id: 'foco',
    rotulo: 'Precisa de você hoje',
    descricao: 'Uma fila só, na ordem em que cobra — o atrasado primeiro',
    largura: 'inteira',
  },
  {
    id: 'metas',
    rotulo: 'Metas em curso',
    descricao: 'Quantas estão no alvo, e a distância de cada uma',
    largura: 'metade',
  },
  {
    id: 'hoje',
    rotulo: 'Hoje',
    descricao: 'As rotinas que faltam, com caixinha para marcar',
    largura: 'metade',
  },
  {
    id: 'vencendo',
    rotulo: 'Vencendo',
    descricao: 'As tarefas atrasadas e as de hoje',
    largura: 'metade',
  },
  {
    id: 'semana',
    rotulo: 'Esta semana',
    descricao: 'Os sete dias, com rotina, prazos e conclusões',
    largura: 'inteira',
  },
  {
    id: 'dinheiro',
    rotulo: 'Dinheiro',
    descricao: 'Entradas e saídas nos seis meses até aqui',
    largura: 'metade',
  },
  {
    id: 'atencao',
    rotulo: 'Projetos que pedem atenção',
    descricao: 'Atrasados, parados, ou com o prazo perto',
    largura: 'metade',
  },
  {
    id: 'contexto',
    rotulo: 'Pessoal e profissional',
    descricao: 'Como o dia se divide entre os dois',
    largura: 'metade',
  },
  {
    id: 'quinzena',
    rotulo: 'Últimos 14 dias',
    descricao: 'Quanto de cada dia foi cumprido',
    largura: 'metade',
  },
  {
    id: 'concluidas',
    rotulo: 'Tarefas concluídas',
    descricao: 'Uma barra por dia, nos últimos 14',
    largura: 'metade',
  },
];

const TODOS = BLOCOS_DO_INICIO.map((b) => b.id);

export const blocoPorId = (id: string): BlocoDoInicio | undefined =>
  BLOCOS_DO_INICIO.find((b) => b.id === id);

/**
 * Os blocos visíveis, na ordem escolhida.
 *
 * Sem preferência nenhuma, tudo na ordem de fábrica — instalação nova não pode
 * abrir vazia. Id desconhecido é descartado: um arquivo exportado de uma versão
 * mais nova pode citar bloco que este código não tem, e travar por isso seria
 * pior que ignorar.
 */
export function blocosVisiveis(preferencias?: Preferencias): string[] {
  const escolhidos = preferencias?.blocosDoInicio;
  if (!escolhidos) return [...TODOS];
  return escolhidos.filter((id, i) => TODOS.includes(id) && escolhidos.indexOf(id) === i);
}

/**
 * Liga ou desliga um bloco.
 *
 * Desligado sai da lista; ligado volta para o **fim**, e não para o lugar de
 * fábrica: se eu desliguei e liguei de novo, mandar ele para o meio da tela
 * seria mexer numa ordem que eu escolhi.
 */
export function alternarBloco(visiveis: readonly string[], id: string): string[] {
  if (!TODOS.includes(id)) return [...visiveis];
  return visiveis.includes(id) ? visiveis.filter((b) => b !== id) : [...visiveis, id];
}

/** Sobe (-1) ou desce (+1) um bloco. Nas pontas, não faz nada. */
export function moverBloco(visiveis: readonly string[], id: string, passo: number): string[] {
  const de = visiveis.indexOf(id);
  const para = de + passo;
  if (de === -1 || para < 0 || para >= visiveis.length) return [...visiveis];

  const nova = [...visiveis];
  [nova[de], nova[para]] = [nova[para], nova[de]];
  return nova;
}

/** Volta para a ordem de fábrica, com tudo visível. */
export const ordemDeFabrica = (): string[] => [...TODOS];
