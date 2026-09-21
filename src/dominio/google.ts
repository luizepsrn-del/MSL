/**
 * Espelhar o MSL no Google Agenda, e ler o Google de volta.
 *
 * Tudo aqui é função pura: entra o que o MSL quer publicar mais o que o Google
 * respondeu, sai um plano do que fazer de cada lado. Nenhuma chamada de rede,
 * nenhum token, nada de `Date.now()` escondido — o que torna possível provar a
 * parte difícil, que é decidir quem ganha quando os dois lados mudaram.
 *
 * ## Quem é dono de quê
 *
 * Todo evento que o MSL cria leva uma marca em `extendedProperties.private.msl`
 * dizendo qual registro ele espelha. Essa marca é o **único** vínculo, e ela
 * mora só do lado do Google:
 *
 * - não há campo novo no esquema, nem id de evento viajando entre aparelhos;
 * - dois aparelhos sincronizando acham o mesmo evento pela marca e **atualizam**
 *   em vez de criar um segundo;
 * - e apagar a conta do Google não deixa lixo nenhum no banco.
 *
 * Evento **sem** a marca é do Google. O MSL mostra e não toca.
 *
 * ## Quem ganha
 *
 * A mesma regra que a sincronização entre aparelhos já usa: **vence quem foi
 * alterado por último**, item a item. O `updated` do Google contra o
 * `alteradoEm` do registro.
 *
 * Isso funciona porque a comparação só acontece quando o conteúdo **difere**.
 * Escrever no Google carimba um `updated` novo, mais recente que o
 * `alteradoEm`; mas aí os dois lados estão iguais, o plano sai vazio, e o
 * carimbo mais novo nunca chega a ser usado para desempatar nada.
 */

export const MARCA = 'msl';

/** Quanto dura um bloco de evento sem fim declarado, em minutos. */
export const MINUTOS_PADRAO = 30;

/* ── O que o MSL manda para fora ─────────────────────────────────────────── */

export interface ItemParaEspelhar {
  /** `tarefa:<id>` ou `peca:<id>` — é a marca que vai no evento */
  chave: string;
  titulo: string;
  /** dia local `AAAA-MM-DD` */
  dia: string;
  /** `HH:MM`; sem ela o evento é de dia inteiro */
  hora?: string;
  /** ISO UTC da última alteração do registro no MSL */
  alteradoEm: string;
}

/* ── O que o Google devolve ──────────────────────────────────────────────── */

export interface EventoDoGoogle {
  id: string;
  summary?: string;
  status?: string;
  /** ISO UTC da última alteração do lado do Google */
  updated?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
}

/** A marca do MSL num evento, ou `null` quando o evento é do Google. */
export function marcaDe(evento: EventoDoGoogle): string | null {
  return evento.extendedProperties?.private?.[MARCA] ?? null;
}

/* ── Traduzir ────────────────────────────────────────────────────────────── */

export interface CorpoDoEvento {
  summary: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties: { private: Record<string, string> };
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** Soma minutos a um `HH:MM`, sem passar do fim do dia. */
export function somarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutos, 24 * 60 - 1);
  return `${doisDigitos(Math.floor(total / 60))}:${doisDigitos(total % 60)}`;
}

/**
 * O corpo do evento que representa um item do MSL.
 *
 * Item com hora vira evento com hora, no fuso declarado — e **não** num
 * instante em UTC calculado aqui. Mandar `timeZone` deixa a conversão com o
 * Google, que tem a base de fusos inteira; calcular o instante eu mesmo
 * colocaria o compromisso uma hora fora sempre que o horário de verão mudasse.
 *
 * Item sem hora vira evento de dia inteiro, e o `end` é o **dia seguinte**,
 * porque no iCalendar o fim de um evento de dia inteiro é exclusivo. Pôr o
 * mesmo dia nos dois faz o Google recusar o evento.
 */
export function corpoDoEvento(
  item: ItemParaEspelhar,
  fuso: string,
  diaSeguinte: (dia: string) => string,
): CorpoDoEvento {
  const base = {
    summary: item.titulo,
    extendedProperties: { private: { [MARCA]: item.chave } },
  };

  if (!item.hora) {
    return { ...base, start: { date: item.dia }, end: { date: diaSeguinte(item.dia) } };
  }

  return {
    ...base,
    start: { dateTime: `${item.dia}T${item.hora}:00`, timeZone: fuso },
    end: {
      dateTime: `${item.dia}T${somarMinutos(item.hora, MINUTOS_PADRAO)}:00`,
      timeZone: fuso,
    },
  };
}

/**
 * O dia e a hora locais de um evento, do jeito que o MSL guarda.
 *
 * Evento de dia inteiro não tem hora e não tem fuso — `date` já é o dia local,
 * e inventar uma conversão aqui moveria "17 de setembro" para o dia 16 de quem
 * estiver a oeste. Evento com hora traz um instante com deslocamento, e é dele
 * que sai o dia local.
 */
export function quandoAcontece(
  evento: EventoDoGoogle,
  paraLocal: (iso: string) => { dia: string; hora: string },
): { dia: string; hora?: string } | null {
  if (evento.start?.date) return { dia: evento.start.date };
  if (!evento.start?.dateTime) return null;
  const { dia, hora } = paraLocal(evento.start.dateTime);
  return { dia, hora };
}

/* ── O plano ─────────────────────────────────────────────────────────────── */

export interface Criar {
  tipo: 'criar';
  chave: string;
  corpo: CorpoDoEvento;
}

export interface Atualizar {
  tipo: 'atualizar';
  chave: string;
  eventoId: string;
  corpo: CorpoDoEvento;
}

export interface Apagar {
  tipo: 'apagar';
  /** a marca que o evento levava, para o registro do que foi feito */
  chave: string | null;
  eventoId: string;
}

/** Uma mudança que veio do Google e precisa entrar no MSL. */
export interface Puxar {
  tipo: 'puxar';
  chave: string;
  dia: string;
  hora?: string;
}

export type Passo = Criar | Atualizar | Apagar;

export interface Plano {
  /** o que fazer no Google */
  empurrar: Passo[];
  /** o que trazer para o MSL */
  puxar: Puxar[];
  /** os eventos que são do Google, para o calendário mostrar */
  deles: EventoDoGoogle[];
}

/**
 * O que precisa acontecer para os dois lados ficarem iguais.
 *
 * `itens` é o que o MSL quer ver espelhado na janela; `eventos` é o que o
 * Google tem nela. Nada é executado aqui.
 */
export function planejar(
  itens: readonly ItemParaEspelhar[],
  eventos: readonly EventoDoGoogle[],
  opcoes: {
    fuso: string;
    diaSeguinte: (dia: string) => string;
    paraLocal: (iso: string) => { dia: string; hora: string };
  },
): Plano {
  const empurrar: Passo[] = [];
  const puxar: Puxar[] = [];
  const deles: EventoDoGoogle[] = [];

  /** Os espelhos, por marca. O primeiro de cada marca manda. */
  const espelhos = new Map<string, EventoDoGoogle>();
  const repetidos: EventoDoGoogle[] = [];

  for (const evento of eventos) {
    // Cancelado no Google é lápide, e não evento. Tratar como existente faria
    // o plano achar que o espelho está lá quando ele já foi para o lixo.
    if (evento.status === 'cancelled') continue;

    const marca = marcaDe(evento);
    if (marca === null) {
      deles.push(evento);
      continue;
    }
    // Dois eventos com a mesma marca só existem se algo deu errado antes —
    // uma criação que respondeu depois de a outra já ter gravado. Fica um, e
    // o resto é apagado, ou a duplicata se multiplica a cada sincronização.
    if (espelhos.has(marca)) repetidos.push(evento);
    else espelhos.set(marca, evento);
  }

  for (const sobrando of repetidos) {
    empurrar.push({ tipo: 'apagar', chave: marcaDe(sobrando), eventoId: sobrando.id });
  }

  const vistas = new Set<string>();

  for (const item of itens) {
    vistas.add(item.chave);
    const espelho = espelhos.get(item.chave);

    if (!espelho) {
      empurrar.push({
        tipo: 'criar',
        chave: item.chave,
        corpo: corpoDoEvento(item, opcoes.fuso, opcoes.diaSeguinte),
      });
      continue;
    }

    const la = quandoAcontece(espelho, opcoes.paraLocal);
    const igual =
      espelho.summary === item.titulo &&
      la?.dia === item.dia &&
      (la?.hora ?? undefined) === item.hora;

    if (igual) continue;

    // Os dois lados divergem: vence quem mexeu por último, como na junção
    // entre aparelhos.
    const googleMaisNovo = !!espelho.updated && espelho.updated > item.alteradoEm;

    if (googleMaisNovo && la) {
      puxar.push({ tipo: 'puxar', chave: item.chave, dia: la.dia, hora: la.hora });
    } else {
      empurrar.push({
        tipo: 'atualizar',
        chave: item.chave,
        eventoId: espelho.id,
        corpo: corpoDoEvento(item, opcoes.fuso, opcoes.diaSeguinte),
      });
    }
  }

  // Espelho sem dono: o registro foi apagado no MSL, concluído, ou saiu da
  // janela. O evento vai junto — um espelho órfão é um compromisso fantasma
  // que ninguém consegue explicar depois.
  for (const [marca, evento] of espelhos) {
    if (!vistas.has(marca)) {
      empurrar.push({ tipo: 'apagar', chave: marca, eventoId: evento.id });
    }
  }

  // Ordem estável: o mesmo estado dos dois lados dá sempre o mesmo plano, e
  // dois aparelhos sincronizando não fazem as coisas em ordens diferentes.
  const peso = { criar: 0, atualizar: 1, apagar: 2 } as const;
  empurrar.sort((a, b) => {
    if (peso[a.tipo] !== peso[b.tipo]) return peso[a.tipo] - peso[b.tipo];
    const ca = a.chave ?? '';
    const cb = b.chave ?? '';
    return ca < cb ? -1 : ca > cb ? 1 : 0;
  });
  puxar.sort((a, b) => (a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0));

  return { empurrar, puxar, deles };
}

/** `tarefa:abc` → `{ tipo: 'tarefa', id: 'abc' }`; nulo quando não é marca minha. */
export function lerChave(chave: string): { tipo: 'tarefa' | 'peca'; id: string } | null {
  const corte = chave.indexOf(':');
  if (corte === -1) return null;
  const tipo = chave.slice(0, corte);
  const id = chave.slice(corte + 1);
  if (id === '') return null;
  if (tipo !== 'tarefa' && tipo !== 'peca') return null;
  return { tipo, id };
}

/* ── Para o calendário ───────────────────────────────────────────────────── */

/**
 * O que o calendário já sabe desenhar.
 *
 * É a mesma forma que o leitor de iCal produz, de propósito: assim a tela não
 * precisa saber de onde o evento veio, e trocar a assinatura pelo endereço
 * secreto pela conexão com login não mexe em nenhum componente.
 */
export interface EventoParaTela {
  chave: string;
  uid: string;
  titulo: string;
  dia: string;
  hora?: string;
  fim?: string;
  local?: string;
  diaInteiro: boolean;
}

/**
 * Traduz os eventos do Google para a tela, recortando na janela.
 *
 * Evento de vários dias aparece em cada dia dele, como no leitor de iCal — e
 * pelo mesmo motivo: um `DTEND` de dia inteiro é exclusivo, então uma viagem
 * de 17 a 20 acontece em 17, 18 e 19.
 */
export function eventosParaTela(
  eventos: readonly EventoDoGoogle[],
  de: string,
  ate: string,
  ajuda: {
    somarDias: (dia: string, dias: number) => string;
    distanciaEmDias: (a: string, b: string) => number;
    paraLocal: (iso: string) => { dia: string; hora: string };
  },
): EventoParaTela[] {
  const saida: EventoParaTela[] = [];

  for (const evento of eventos) {
    if (evento.status === 'cancelled') continue;

    const diaInteiro = !!evento.start?.date;
    const inicio = quandoAcontece(evento, ajuda.paraLocal);
    if (!inicio) continue;

    const fim = diaInteiro
      ? evento.end?.date
      : evento.end?.dateTime
        ? ajuda.paraLocal(evento.end.dateTime)
        : undefined;

    // Quantos dias ele ocupa. O fim exclusivo do dia inteiro é o que torna
    // "17 a 20" três dias, e não quatro.
    const duracao =
      diaInteiro && typeof fim === 'string'
        ? Math.max(ajuda.distanciaEmDias(inicio.dia, fim), 1)
        : 1;

    for (let n = 0; n < duracao; n++) {
      const dia = ajuda.somarDias(inicio.dia, n);
      if (dia < de || dia > ate) continue;

      saida.push({
        chave: `${evento.id}@${dia}`,
        uid: evento.id,
        titulo: evento.summary?.trim() || '(sem título)',
        dia,
        hora: inicio.hora,
        // O fim só aparece quando é do mesmo dia: "14:00 – 09:00" confunde
        // mais do que ajuda.
        fim:
          !diaInteiro && typeof fim === 'object' && fim?.dia === dia && duracao === 1
            ? fim.hora
            : undefined,
        local: evento.location?.trim() || undefined,
        diaInteiro,
      });
    }
  }

  return saida.sort((a, b) => {
    if (a.dia !== b.dia) return a.dia < b.dia ? -1 : 1;
    // Dia inteiro primeiro: ele é o pano de fundo do dia, não um horário.
    if (a.diaInteiro !== b.diaInteiro) return a.diaInteiro ? -1 : 1;
    if ((a.hora ?? '') !== (b.hora ?? '')) return (a.hora ?? '') < (b.hora ?? '') ? -1 : 1;
    return a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0;
  });
}
