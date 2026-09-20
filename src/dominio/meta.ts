import type { Banco, Meta, Contexto, PeriodoDaMeta } from '../dados/esquema';
import { somarDias, diasNoMes, distanciaEmDias, diaLocalDe, diaValido } from './rotina';
import { inicioDaSemana, anoMesDe } from './calendario';
import { ocorrenciasEntre } from './financeiro';

/**
 * Metas.
 *
 * Uma meta é um alvo com prazo: "20 treinos neste mês", "R$ 2.000 guardados
 * neste ano", "não passar de R$ 800 em lazer".
 *
 * **O progresso é medido, nunca guardado.** É a mesma regra do resto do
 * domínio, e aqui ela é ainda mais afiada: um "18 de 20" gravado dentro da meta
 * atravessaria a virada do mês dizendo que eu já estava quase lá. O que fica
 * guardado é o alvo e a janela; o número sai dos dados toda vez que alguém
 * pergunta.
 *
 * Três das quatro fontes leem dado que já existe — execução de rotina, tarefa
 * concluída, lançamento. A meta se preenche sozinha enquanto eu uso o sistema
 * como sempre usei, que é a diferença entre uma meta e mais uma lista para
 * manter.
 */

/* ── A janela ────────────────────────────────────────────────────────────── */

/** O primeiro e o último dia do período em que `hoje` cai. */
export function periodoEm(periodo: PeriodoDaMeta, hoje: string): { de: string; ate: string } | null {
  const [ano, mes] = anoMesDe(hoje);
  switch (periodo) {
    case 'semana': {
      const de = inicioDaSemana(hoje);
      return { de, ate: somarDias(de, 6) };
    }
    case 'mes': {
      const mm = String(mes).padStart(2, '0');
      return { de: `${ano}-${mm}-01`, ate: `${ano}-${mm}-${String(diasNoMes(ano, mes)).padStart(2, '0')}` };
    }
    case 'ano':
      return { de: `${ano}-01-01`, ate: `${ano}-12-31` };
    case 'sempre':
      // Não tem fim: quem chama completa com `inicioEm` e com hoje.
      return null;
  }
}

export interface JanelaDaMeta {
  /** o primeiro dia contado */
  de: string;
  /** o último dia contado — nunca depois de hoje */
  ate: string;
  /** o último dia do período, mesmo que ainda não tenha chegado; ausente em `sempre` */
  fim?: string;
  /** a janela não contém dia nenhum: a meta ainda não começou */
  vazia: boolean;
}

/**
 * Os dias que esta meta conta agora.
 *
 * Duas aparas, e cada uma tem motivo. No começo, `inicioEm`: uma meta criada
 * no dia 20 não pode aparecer já cumprida por causa do que aconteceu no dia 3.
 * No fim, **hoje**: o que se mede é o que já foi feito, e não a previsão — com
 * o mês inteiro na janela, um salário lançado para o dia 30 daria a meta de
 * poupança por batida no dia 1º.
 */
export function janelaDaMeta(meta: Meta, hoje: string): JanelaDaMeta {
  const periodo = periodoEm(meta.periodo, hoje);
  const de = periodo && periodo.de > meta.inicioEm ? periodo.de : meta.inicioEm;
  const fim = periodo?.ate;
  const ate = fim && fim < hoje ? fim : hoje;
  return { de, ate, fim, vazia: de > ate };
}

/* ── A medida ────────────────────────────────────────────────────────────── */

/** Quanto já foi feito na janela, pela fonte que a meta declara. */
export function feitoNaJanela(banco: Banco, meta: Meta, janela: JanelaDaMeta): number {
  if (janela.vazia) return 0;
  const { de, ate } = janela;
  const dentro = (dia: string) => dia >= de && dia <= ate;

  switch (meta.fonte.tipo) {
    case 'manual':
      return banco.marcos
        .filter((m) => m.metaId === meta.id && dentro(m.dia))
        .reduce((total, m) => total + m.quanto, 0);

    case 'rotina': {
      const { rotinaId } = meta.fonte;
      return banco.execucoes.filter((e) => e.rotinaId === rotinaId && dentro(e.dia)).length;
    }

    case 'tarefas': {
      const { projetoId, contexto } = meta.fonte;
      return banco.tarefas.filter((t) => {
        if (!t.concluidaEm) return false;
        // `concluidaEm` é um instante em UTC. Fatiar os dez primeiros caracteres
        // põe uma tarefa terminada às 22h em São Paulo no dia seguinte.
        if (!dentro(diaLocalDe(t.concluidaEm))) return false;
        if (projetoId && t.projetoId !== projetoId) return false;
        if (contexto && t.contexto !== contexto) return false;
        return true;
      }).length;
    }

    case 'dinheiro': {
      const { movimento, categoria } = meta.fonte;
      return ocorrenciasEntre(banco, de, ate)
        .filter((o) => o.lancamento.tipo === movimento)
        .filter((o) => !categoria || o.lancamento.categoria === categoria)
        .reduce((total, o) => total + o.lancamento.valor, 0);
    }
  }
}

export interface MedidaDaMeta {
  meta: Meta;
  janela: JanelaDaMeta;
  /** quanto já foi feito: vezes, ou centavos quando a fonte é dinheiro */
  feito: number;
  alvo: number;
  /** 0 a 1, para a barra. Passar do alvo não passa de 1. */
  fracao: number;
  /**
   * O número está onde eu quero **agora**.
   *
   * Não se chama "batida" de propósito. Para uma meta de limite, o mês começa
   * dentro do limite e só sai dele se eu gastar demais — dizer "batida" no dia
   * 1º seria comemorar o que ainda não aconteceu. "No alvo" é verdade nos dois
   * sentidos, em qualquer dia.
   */
  noAlvo: boolean;
  /** meta de limite que já passou do teto */
  estourou: boolean;
  /** o que falta para o alvo, em meta de `atingir`; 0 quando já chegou */
  falta: number;
  /** dias que ainda restam no período, contando hoje; ausente em `sempre` */
  diasRestantes?: number;
  /**
   * Quanto por dia daqui até o fim para chegar ao alvo.
   *
   * Só existe em `atingir`, com prazo e com algo faltando — sem uma dessas três
   * o número seria divisão por zero ou conselho sobre o que já está feito.
   */
  porDia?: number;
  /** fração do período já decorrida, 0 a 1; ausente em `sempre` */
  decorrido?: number;
  /**
   * Andando mais devagar do que o calendário.
   *
   * Comparar `fracao` com `decorrido` é o que transforma "18 de 20" em
   * informação: no dia 3 do mês é excelente, no dia 30 é quase falhar.
   */
  atrasada: boolean;
}

export function medirMeta(banco: Banco, meta: Meta, hoje: string): MedidaDaMeta {
  const janela = janelaDaMeta(meta, hoje);
  const feito = feitoNaJanela(banco, meta, janela);
  const alvo = meta.alvo;

  // Alvo zero não deveria existir — `validarMeta` recusa — mas um arquivo
  // importado à mão pode trazer um, e dividir por ele daria Infinity na tela.
  const fracao = alvo > 0 ? Math.min(feito / alvo, 1) : 0;

  const limite = meta.direcao === 'limitar';
  const noAlvo = limite ? feito <= alvo : feito >= alvo;
  const falta = limite ? 0 : Math.max(alvo - feito, 0);

  const diasRestantes = janela.fim ? Math.max(distanciaEmDias(hoje, janela.fim) + 1, 0) : undefined;

  const periodo = periodoEm(meta.periodo, hoje);
  const decorrido = periodo
    ? Math.min(
        Math.max((distanciaEmDias(periodo.de, hoje) + 1) / (distanciaEmDias(periodo.de, periodo.ate) + 1), 0),
        1,
      )
    : undefined;

  return {
    meta,
    janela,
    feito,
    alvo,
    fracao,
    noAlvo,
    estourou: limite && feito > alvo,
    falta,
    diasRestantes,
    porDia: !limite && falta > 0 && diasRestantes && diasRestantes > 0 ? falta / diasRestantes : undefined,
    decorrido,
    // Uma meta de limite nunca está "atrasada": ela está dentro ou estourada.
    atrasada: !limite && decorrido !== undefined && !noAlvo && fracao < decorrido,
  };
}

/* ── O conjunto ──────────────────────────────────────────────────────────── */

/**
 * As metas vivas, medidas, na ordem em que pedem atenção.
 *
 * Quem está atrasada vem primeiro, depois quem está mais longe do alvo. Uma
 * lista de metas em ordem alfabética esconde justamente a que precisa de hoje.
 */
export function metasEmCurso(banco: Banco, hoje: string, contexto?: Contexto): MedidaDaMeta[] {
  return banco.metas
    .filter((m) => !m.arquivada)
    .filter((m) => !contexto || m.contexto === contexto)
    .map((m) => medirMeta(banco, m, hoje))
    .sort((a, b) => {
      if (a.atrasada !== b.atrasada) return a.atrasada ? -1 : 1;
      if (a.estourou !== b.estourou) return a.estourou ? -1 : 1;
      if (a.noAlvo !== b.noAlvo) return a.noAlvo ? 1 : -1;
      if (a.fracao !== b.fracao) return a.fracao - b.fracao;
      // Desempate estável: sem ele a mesma lista muda de ordem entre dois
      // desenhos, e a tela pisca sem nada ter mudado.
      return a.meta.id < b.meta.id ? -1 : a.meta.id > b.meta.id ? 1 : 0;
    });
}

export interface ResumoDeMetas {
  total: number;
  noAlvo: number;
  atrasadas: number;
  estouradas: number;
}

export function resumoDeMetas(medidas: readonly MedidaDaMeta[]): ResumoDeMetas {
  return {
    total: medidas.length,
    noAlvo: medidas.filter((m) => m.noAlvo).length,
    atrasadas: medidas.filter((m) => m.atrasada).length,
    estouradas: medidas.filter((m) => m.estourou).length,
  };
}

/** A meta mede dinheiro, e o número é centavos e não vezes. */
export const emDinheiro = (meta: Meta): boolean => meta.fonte.tipo === 'dinheiro';

/* ── Validação ───────────────────────────────────────────────────────────── */

export class MetaInvalida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'MetaInvalida';
  }
}

/**
 * O que uma meta não pode ser.
 *
 * A mesma função vale na criação e na correção — uma checagem que só guarda a
 * porta da frente não é uma checagem.
 */
export function validarMeta(meta: Pick<Meta, 'titulo' | 'alvo' | 'inicioEm'>): void {
  if (meta.titulo.trim() === '') throw new MetaInvalida('a meta precisa de um título');
  if (!Number.isInteger(meta.alvo)) throw new MetaInvalida('o alvo precisa ser um número inteiro');
  if (meta.alvo <= 0) throw new MetaInvalida('o alvo precisa ser maior que zero');
  if (!diaValido(meta.inicioEm)) throw new MetaInvalida('o início precisa ser uma data válida');
}

/** `20 treinos` · `R$ 2.000,00` — quem formata é a tela; aqui só o número cru. */
export function descreverAlvo(meta: Meta, formatarDinheiro: (c: number) => string): string {
  return emDinheiro(meta) ? formatarDinheiro(meta.alvo) : String(meta.alvo);
}
