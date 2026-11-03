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
 * Evento **sem** a marca é do Google. A sincronização continua só lendo e
 * mostrando esse evento — nunca o altera.
 *
 * Esta frase já foi "o MSL mostra e não toca", sem exceção. Deixou de ser: o
 * agente agora apaga, move e renomeia compromisso que nasceu no Google, mas
 * por **uma porta separada, com nome**, e não pelo espelho. Misturar as duas
 * deixaria o sincronizador decidir sozinho o destino do que o dono nunca
 * pediu para mexer. Pela mesma razão a porta, **em mover e renomear**, recusa
 * o evento que **tem** a marca: mexer no espelho por fora seria desfeito na
 * sincronia seguinte. Em apagar ela não confere (veja abaixo).
 *
 * O que a porta garante, e de quem é cada garantia. A divisão importa: quem
 * mexer num lado achando que o outro cobre vai abrir um buraco.
 *
 * **A rota (`rotaGoogleEvento`) impõe:**
 *
 * - **ninguém é avisado.** `sendUpdates=none` vai em toda escrita, posto no
 *   funil por onde todas passam. Cancelar uma reunião não manda e-mail aos
 *   convidados por baixo dos panos;
 * - **mover e renomear recusam o espelho** (`e-nosso`): leem o evento e, se ele
 *   tem a marca, a próxima sincronia desfaria a mudança, então a resposta é
 *   recusa e não "feito". **Apagar não lê o evento, de propósito** (seria uma
 *   ida a mais ao Google em toda exclusão). Apagar um espelho só é impedido
 *   porque o agente nunca o lista;
 * - **mover e renomear só valem sobre a versão lida** (`etag`): se alguém
 *   mexeu entre a leitura e a escrita, nada é feito. A janela é a dessas duas
 *   chamadas, não o tempo em que o dono decidiu.
 *
 * **O agente (este domínio) impõe, e a rota não confere:**
 *
 * - **a série é intocável.** O agente aponta sempre o id da **ocorrência**.
 *   Apagar a reunião semanal de quinta tira a de quinta, não as próximas;
 * - **convidado só apaga.** Apagar tira o evento da agenda de quem apaga; se
 *   quem apaga organiza, tira também da agenda dos convidados que usam Google
 *   Agenda (os demais podem seguir com o convite). Mover e renomear exigem organizar, porque
 *   o Google costuma recusar a alteração de convidado sem `guestsCanModify`,
 *   campo que não buscamos. A rota não sabe quem organiza;
 * - **evento de vários dias não se move por aqui**, só se apaga e renomeia. É
 *   uma escolha do agente, não uma incapacidade: `corpoDoMover` sabe a duração
 *   e trata o caso (tem teste), mas `AcaoNoGoogle.mover` leva um dia só e não
 *   diz se o evento anda inteiro, encolhe ou estica, então o domínio fecha a
 *   porta (`DA_PARA_MOVER`). O ramo da rota segue vivo e sem consumidor;
 * - **a assinatura iCal nunca é mexível:** o agente só põe `mexivel` nos
 *   eventos do Google, e lá não existe caminho de escrita;
 * - **anotação e projeto não existem no Google**, então esses pedidos são
 *   recusados antes de chegar à rota.
 *
 * O espelho não mudou. Só deixou de ser o único lugar onde o MSL escreve no
 * Google.
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
  /**
   * O id da **série**, quando o evento se repete.
   *
   * O Google dá um `id` diferente para cada ocorrência de uma reunião
   * semanal, e só este campo as amarra. É por ele que o rótulo é guardado:
   * marcar terça a terça seria trabalho sem fim.
   */
  recurringEventId?: string;
  /**
   * A versão do evento. Mandada em `If-Match`, faz o Google recusar a escrita
   * se alguém mexeu no evento depois que ele foi lido.
   */
  etag?: string;
  summary?: string;
  status?: string;
  /** ISO UTC da última alteração do lado do Google */
  updated?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
  /**
   * Quem organiza o evento. `self` é o Google dizendo que sou eu, sem eu
   * precisar comparar e-mails — o que falharia com alias e com agenda
   * compartilhada.
   */
  organizer?: { self?: boolean; email?: string };
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
 * O novo `start` e `end` de um evento movido para outro dia (e, se vier, hora).
 *
 * A duração é do evento, não do destino: uma reunião de uma hora e meia
 * continua com uma hora e meia ao mudar de dia. Ela sai da diferença entre os
 * dois instantes — que têm deslocamento, então a conta vale em qualquer fuso —
 * e, se o evento não tem os dois (era de dia inteiro, ou o fim veio estranho),
 * cai no bloco padrão em vez de inventar uma duração.
 *
 * A hora só é tocada quando veio uma: mover "para sexta" não pode apagar o
 * horário que o compromisso já tinha, nem virá-lo em dia inteiro. Sem hora
 * nova, o evento com hora fica com a hora **local** de antes — lida por
 * `paraLocal`, porque o `dateTime` do Google vem em UTC e a hora que importa é
 * a da parede. Só o evento que já era de dia inteiro continua de dia inteiro,
 * levando os dias dele junto (uma viagem de três dias segue com três).
 *
 * Cada lado leva `date` **ou** `dateTime`, nunca os dois: o Google recusa o
 * evento que tem ambos. Por isso o corpo é montado do zero, e não aproveitando
 * o `start` antigo — que carregaria o campo do tipo anterior para o novo.
 */
export function corpoDoMover(
  evento: EventoDoGoogle,
  dia: string,
  hora: string | undefined,
  fuso: string,
  ajuda: {
    somarDias: (dia: string, dias: number) => string;
    distanciaEmDias: (a: string, b: string) => number;
    paraLocal: (iso: string) => { dia: string; hora: string };
  },
): Pick<CorpoDoEvento, 'start' | 'end'> {
  const inicio = evento.start?.dateTime;
  const fim = evento.end?.dateTime;
  // Vazio vem de parser e quer dizer "sem hora": tratá-lo como hora apagaria o
  // horário do evento, que é justamente o que esta função não pode fazer.
  const horaFinal = hora || (inicio ? ajuda.paraLocal(inicio).hora : undefined);

  if (!horaFinal) {
    const de = evento.start?.date;
    const ate = evento.end?.date;
    const dias = de && ate ? Math.max(ajuda.distanciaEmDias(de, ate), 1) : 1;
    return { start: { date: dia }, end: { date: ajuda.somarDias(dia, dias) } };
  }

  const medida = inicio && fim ? (Date.parse(fim) - Date.parse(inicio)) / 60_000 : NaN;
  // Um bloco de vários dias que ganha hora segue com os mesmos dias — "mover as
  // férias para sexta às 9h" não pode virar meia hora. De um dia só (ou sem
  // medida nenhuma) vale o bloco padrão.
  const de = evento.start?.date;
  const ate = evento.end?.date;
  const diasInteiros = de && ate ? ajuda.distanciaEmDias(de, ate) : 0;
  const minutos =
    Number.isFinite(medida) && medida > 0
      ? medida
      : diasInteiros > 1
        ? diasInteiros * 1440
        : MINUTOS_PADRAO;

  // O fim sai do total de minutos e cai no dia que tiver que cair. Não é
  // `somarMinutos`: o teto de 23:59 dela serve ao bloco padrão de um item do
  // MSL, mas aqui cortaria em silêncio a reunião que passa da meia-noite — e o
  // Google aceitaria o evento errado.
  const [h, m] = horaFinal.split(':').map(Number);
  const total = h * 60 + m + minutos;
  const fimDia = ajuda.somarDias(dia, Math.floor(total / 1440));
  const fimHora = `${doisDigitos(Math.floor((total % 1440) / 60))}:${doisDigitos(total % 60)}`;

  return {
    start: { dateTime: `${dia}T${horaFinal}:00`, timeZone: fuso },
    end: { dateTime: `${fimDia}T${fimHora}:00`, timeZone: fuso },
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
  /** a série, quando o evento se repete */
  serie?: string;
  titulo: string;
  dia: string;
  hora?: string;
  fim?: string;
  local?: string;
  diaInteiro: boolean;
  /**
   * O primeiro e o último dia de um evento de vários dias, o mesmo em todas as
   * cópias. A janela da tela corta o evento pelos dois lados, e sem estes dois
   * campos uma cópia sozinha não sabe que pertence a algo maior: quem apaga
   * mostraria um dia só enquanto o Google leva todos. Ausentes quando o evento
   * ocupa um dia só.
   */
  desde?: string;
  ate?: string;
  /**
   * Se o evento é meu. Evento de outro organizador não aceita alteração
   * minha (o Google recusa ou, pior, aceita só para mim), então o agente só
   * mexe nos que são meus. Na dúvida é `false`: perder uma edição permitida
   * custa menos que tentar uma proibida.
   */
  souOrganizador: boolean;
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

    // O fim de dia inteiro é exclusivo; o último dia do evento é o anterior.
    const variosDias =
      duracao > 1 ? { desde: inicio.dia, ate: ajuda.somarDias(inicio.dia, duracao - 1) } : {};

    for (let n = 0; n < duracao; n++) {
      const dia = ajuda.somarDias(inicio.dia, n);
      if (dia < de || dia > ate) continue;

      saida.push({
        chave: `${evento.id}@${dia}`,
        uid: evento.id,
        serie: evento.recurringEventId,
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
        ...variosDias,
        souOrganizador: evento.organizer?.self === true,
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
