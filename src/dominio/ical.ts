/**
 * Ler uma agenda iCalendar (RFC 5545).
 *
 * É o que liga o Google Agenda ao sistema. O Google publica um "endereço
 * secreto no formato iCal" por agenda; este módulo transforma aquele texto em
 * eventos com dia local, e nada mais — sem rede, sem estado, testável inteiro.
 *
 * **Os eventos nunca entram no banco.** Eles são de outro sistema, e guardá-los
 * criaria uma cópia que envelhece: apagar o compromisso no Google deixaria o
 * fantasma aqui para sempre. Mesma razão pela qual a recorrência de uma rotina
 * é expandida e não gravada.
 *
 * ## O que este leitor entende
 *
 * `VEVENT` com `DTSTART`/`DTEND`, evento de dia inteiro e com hora, fuso por
 * `TZID` ou por `Z`, `SUMMARY`, `LOCATION`, `STATUS`, e repetição por `RRULE`
 * com `FREQ` diária, semanal, mensal e anual, mais `INTERVAL`, `BYDAY`,
 * `COUNT`, `UNTIL` e `EXDATE`.
 *
 * ## O que ele não entende, e o que faz então
 *
 * `BYMONTHDAY`, `BYSETPOS`, `BYWEEKNO` e as outras regras finas do RFC. Um
 * evento com uma dessas repete pela `FREQ` sozinha, o que pode mostrar um dia
 * a mais. Preferi mostrar demais a esconder um compromisso — e `avisos()`
 * devolve o que foi ignorado, para a tela poder dizer em vez de calar.
 */

import { somarDias, diasNoMes, diaDaSemana, distanciaEmDias } from './rotina';

export const FUSO_PADRAO = 'America/Sao_Paulo';

export interface EventoExterno {
  /** o `UID` do evento, mais a data quando é uma repetição */
  chave: string;
  uid: string;
  titulo: string;
  /** dia local `AAAA-MM-DD` */
  dia: string;
  /** `HH:MM` local de início; ausente quando é evento de dia inteiro */
  hora?: string;
  /** `HH:MM` local de fim, quando existe e cai no mesmo dia */
  fim?: string;
  local?: string;
  diaInteiro: boolean;
}

/* ── O texto ─────────────────────────────────────────────────────────────── */

/**
 * Desdobra as linhas dobradas.
 *
 * O RFC quebra linha em 75 octetos e continua na seguinte começando com espaço
 * ou tabulação. Sem desdobrar, um `SUMMARY` longo vira duas linhas e a segunda
 * é lida como propriedade desconhecida — ou seja, o título chega cortado.
 */
export function desdobrar(texto: string): string[] {
  const linhas: string[] = [];
  for (const bruta of texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')) {
    if ((bruta.startsWith(' ') || bruta.startsWith('\t')) && linhas.length > 0) {
      linhas[linhas.length - 1] += bruta.slice(1);
    } else {
      linhas.push(bruta);
    }
  }
  return linhas;
}

export interface Propriedade {
  nome: string;
  parametros: Record<string, string>;
  valor: string;
}

/** `DTSTART;TZID=America/Sao_Paulo:20260917T140000` → nome, parâmetros, valor. */
export function lerPropriedade(linha: string): Propriedade | null {
  const doisPontos = linha.indexOf(':');
  if (doisPontos === -1) return null;

  const cabeca = linha.slice(0, doisPontos);
  const valor = linha.slice(doisPontos + 1);
  const [nome, ...pares] = cabeca.split(';');

  const parametros: Record<string, string> = {};
  for (const par of pares) {
    const igual = par.indexOf('=');
    if (igual === -1) continue;
    parametros[par.slice(0, igual).toUpperCase()] = par.slice(igual + 1).replace(/^"|"$/g, '');
  }

  return { nome: nome.toUpperCase(), parametros, valor };
}

/**
 * Desfaz o escape de texto do RFC.
 *
 * `\n` é quebra de linha, e `\,` `\;` `\\` são o caractere literal. Sem isto,
 * "Reunião com Ana\, Bruno" aparece com a barra invertida na tela.
 */
export function desescapar(valor: string): string {
  return valor.replace(/\\([nN,;\\])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}

/* ── Tempo ───────────────────────────────────────────────────────────────── */

interface Relogio {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

const comoDia = (r: Relogio) => `${r.ano}-${doisDigitos(r.mes)}-${doisDigitos(r.dia)}`;
const comoHora = (r: Relogio) => `${doisDigitos(r.hora)}:${doisDigitos(r.minuto)}`;

/** O relógio de parede de um instante, num fuso. */
export function relogioEm(instante: Date, fuso: string): Relogio {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(instante);

  const pegar = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? '0');
  // `hour12: false` devolve 24 para a meia-noite em alguns motores.
  const hora = pegar('hour') % 24;
  return { ano: pegar('year'), mes: pegar('month'), dia: pegar('day'), hora, minuto: pegar('minute') };
}

/**
 * O instante em que aquele relógio de parede marca aquela hora, naquele fuso.
 *
 * Não existe função pronta para isto: `Date.UTC` sabe ir de partes a instante
 * só em UTC. A volta é por aproximação — chuta, vê quanto errou naquele fuso, e
 * corrige. Duas voltas porque a primeira pode cair do lado errado de uma
 * mudança de horário.
 *
 * Na hora que o relógio repete numa mudança de fuso, o resultado é uma das
 * duas — e não há resposta certa, porque a hora de fato aconteceu duas vezes.
 */
export function instanteDe(r: Relogio, fuso: string): Date {
  // O alvo é fixo: o erro se mede sempre contra ele, nunca contra o palpite
  // corrente. Medindo contra o palpite, a segunda volta corrige de novo uma
  // diferença que já tinha sido corrigida e o resultado sai com o dobro do
  // deslocamento — foi o primeiro jeito que eu escrevi, e os testes pegaram.
  const alvo = Date.UTC(r.ano, r.mes - 1, r.dia, r.hora, r.minuto);
  let palpite = alvo;
  for (let volta = 0; volta < 2; volta++) {
    const visto = relogioEm(new Date(palpite), fuso);
    const erro = Date.UTC(visto.ano, visto.mes - 1, visto.dia, visto.hora, visto.minuto) - alvo;
    if (erro === 0) break;
    palpite -= erro;
  }
  return new Date(palpite);
}

export interface Momento {
  /** dia local `AAAA-MM-DD` */
  dia: string;
  /** `HH:MM` local; ausente quando é de dia inteiro */
  hora?: string;
  diaInteiro: boolean;
}

/**
 * Lê `DTSTART`/`DTEND`/`EXDATE` nas três formas que o Google emite.
 *
 * - `VALUE=DATE:20260917` — dia inteiro. Não tem fuso, e inventar um
 *   transformaria "17 de setembro" em "16 às 21h" para quem estiver a oeste.
 * - `20260917T170000Z` — instante em UTC. Converte para o fuso local.
 * - `TZID=...:20260917T140000` — relógio de parede naquele fuso.
 * - sem `Z` e sem `TZID` — flutuante: o RFC diz que é a hora local de quem lê.
 */
export function lerMomento(
  prop: Propriedade,
  fuso = FUSO_PADRAO,
): Momento | null {
  const valor = prop.valor.trim();

  if (prop.parametros.VALUE === 'DATE' || /^\d{8}$/.test(valor)) {
    const m = /^(\d{4})(\d{2})(\d{2})$/.exec(valor);
    if (!m) return null;
    return { dia: `${m[1]}-${m[2]}-${m[3]}`, diaInteiro: true };
  }

  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(valor);
  if (!m) return null;

  const parede: Relogio = {
    ano: Number(m[1]),
    mes: Number(m[2]),
    dia: Number(m[3]),
    hora: Number(m[4]),
    minuto: Number(m[5]),
  };

  if (m[7] === 'Z') {
    const local = relogioEm(new Date(Date.UTC(parede.ano, parede.mes - 1, parede.dia, parede.hora, parede.minuto)), fuso);
    return { dia: comoDia(local), hora: comoHora(local), diaInteiro: false };
  }

  const tzid = prop.parametros.TZID;
  if (!tzid || tzid === fuso) {
    // Flutuante ou já no meu fuso: o relógio de parede é o meu.
    return { dia: comoDia(parede), hora: comoHora(parede), diaInteiro: false };
  }

  let local: Relogio;
  try {
    local = relogioEm(instanteDe(parede, tzid), fuso);
  } catch {
    // TZID que o motor não conhece. Melhor mostrar a hora crua do que sumir
    // com o compromisso.
    local = parede;
  }
  return { dia: comoDia(local), hora: comoHora(local), diaInteiro: false };
}

/* ── Repetição ───────────────────────────────────────────────────────────── */

const DIAS_RRULE: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

export interface Repeticao {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  intervalo: number;
  /** dias da semana, 0 = domingo; vazio quando a regra não usa BYDAY */
  porDia: number[];
  /** `AAAA-MM-DD` do último dia, inclusive */
  ate?: string;
  /** quantas ocorrências no total, contando a primeira */
  quantas?: number;
  /** partes da RRULE que este leitor não entende */
  ignoradas: string[];
}

const ENTENDIDAS = new Set(['FREQ', 'INTERVAL', 'BYDAY', 'UNTIL', 'COUNT', 'WKST']);

export function lerRRule(valor: string, fuso = FUSO_PADRAO): Repeticao | null {
  const partes: Record<string, string> = {};
  for (const pedaco of valor.split(';')) {
    const igual = pedaco.indexOf('=');
    if (igual > 0) partes[pedaco.slice(0, igual).toUpperCase()] = pedaco.slice(igual + 1);
  }

  const freq = partes.FREQ?.toUpperCase();
  if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY' && freq !== 'YEARLY') {
    return null;
  }

  const ate = partes.UNTIL
    ? lerMomento({ nome: 'UNTIL', parametros: {}, valor: partes.UNTIL }, fuso)?.dia
    : undefined;

  return {
    freq,
    // Intervalo zero ou negativo vindo de um arquivo torto viraria laço eterno.
    intervalo: Math.max(Number(partes.INTERVAL ?? 1) || 1, 1),
    porDia: (partes.BYDAY ?? '')
      .split(',')
      .map((d) => DIAS_RRULE[d.trim().slice(-2).toUpperCase()])
      .filter((d): d is number => d !== undefined),
    ate,
    quantas: partes.COUNT ? Number(partes.COUNT) || undefined : undefined,
    ignoradas: Object.keys(partes).filter((k) => !ENTENDIDAS.has(k)),
  };
}

/**
 * Os dias em que o evento cai dentro da janela.
 *
 * Caminha a partir do próprio começo, como a rotina faz: ancorar na data
 * original é o que mantém "a cada 3 dias" alinhado, em vez de recomeçar a
 * contagem na borda da janela.
 */
export function diasDaRepeticao(
  inicio: string,
  regra: Repeticao | null,
  de: string,
  ate: string,
  excecoes: readonly string[] = [],
): string[] {
  const fora = new Set(excecoes);
  if (!regra) return inicio >= de && inicio <= ate && !fora.has(inicio) ? [inicio] : [];

  const limite = regra.ate && regra.ate < ate ? regra.ate : ate;
  const dias: string[] = [];
  let contadas = 0;

  const aceitar = (dia: string) => {
    contadas += 1;
    if (dia >= de && dia <= limite && !fora.has(dia)) dias.push(dia);
  };

  const cabe = () =>
    (regra.quantas === undefined || contadas < regra.quantas) && dias.length < TETO_DE_OCORRENCIAS;

  if (regra.freq === 'DAILY') {
    for (let dia = inicio; dia <= limite && cabe(); dia = somarDias(dia, regra.intervalo)) {
      aceitar(dia);
    }
    return dias;
  }

  if (regra.freq === 'WEEKLY') {
    // Sem BYDAY a repetição semanal cai no mesmo dia da semana do começo.
    const quais = regra.porDia.length > 0 ? [...regra.porDia].sort() : [diaDaSemana(inicio)];
    // A semana do evento começa no domingo, como o resto do sistema.
    const domingoInicial = somarDias(inicio, -diaDaSemana(inicio));

    for (
      let domingo = domingoInicial;
      domingo <= limite && cabe();
      domingo = somarDias(domingo, 7 * regra.intervalo)
    ) {
      for (const d of quais) {
        const dia = somarDias(domingo, d);
        // Nada antes do próprio começo: o BYDAY da primeira semana pode
        // apontar para um dia que já tinha passado quando a série nasceu.
        if (dia < inicio || dia > limite || !cabe()) continue;
        aceitar(dia);
      }
    }
    return dias;
  }

  // MONTHLY e YEARLY: o mesmo dia do mês, o mesmo dia do ano.
  const passoEmMeses = regra.freq === 'MONTHLY' ? regra.intervalo : 12 * regra.intervalo;
  const [anoZero, mesZero, diaDoMes] = inicio.split('-').map(Number);

  for (let passo = 0; cabe(); passo++) {
    const total = anoZero * 12 + (mesZero - 1) + passo * passoEmMeses;
    const ano = Math.floor(total / 12);
    const mes = (total % 12) + 1;
    // Dia 31 em mês de 30 simplesmente não acontece — é o que o RFC manda, e
    // empurrar para o dia 1º do mês seguinte inventaria um compromisso.
    if (diaDoMes > diasNoMes(ano, mes)) {
      contadas += 0;
      if (`${ano}-${doisDigitos(mes)}-01` > limite) break;
      continue;
    }
    const dia = `${ano}-${doisDigitos(mes)}-${doisDigitos(diaDoMes)}`;
    if (dia > limite) break;
    aceitar(dia);
  }

  return dias;
}

/**
 * Teto de ocorrências por evento.
 *
 * Uma regra sem fim numa janela larga expande para sempre. O teto é a diferença
 * entre uma agenda pesada e uma aba travada.
 */
export const TETO_DE_OCORRENCIAS = 400;

/* ── O calendário inteiro ────────────────────────────────────────────────── */

export interface AgendaLida {
  eventos: EventoExterno[];
  /** o `X-WR-CALNAME`, quando o arquivo traz */
  nome?: string;
  /** o que foi ignorado, por evento — para a tela poder dizer em vez de calar */
  avisos: string[];
}

/**
 * Lê o arquivo e devolve os eventos que caem na janela.
 *
 * A janela é obrigatória de propósito: uma agenda de anos com eventos semanais
 * expande para dezenas de milhares de ocorrências, e ninguém olha para todas.
 */
export function lerAgenda(
  texto: string,
  de: string,
  ate: string,
  fuso = FUSO_PADRAO,
): AgendaLida {
  const eventos: EventoExterno[] = [];
  const avisos = new Set<string>();
  let nome: string | undefined;

  let dentro = false;
  let atual: Propriedade[] = [];

  const fechar = () => {
    const evento = montarEvento(atual, de, ate, fuso, avisos);
    eventos.push(...evento);
    atual = [];
  };

  for (const linha of desdobrar(texto)) {
    const prop = lerPropriedade(linha);
    if (!prop) continue;

    if (prop.nome === 'BEGIN' && prop.valor.toUpperCase() === 'VEVENT') {
      dentro = true;
      atual = [];
      continue;
    }
    if (prop.nome === 'END' && prop.valor.toUpperCase() === 'VEVENT') {
      if (dentro) fechar();
      dentro = false;
      continue;
    }
    if (dentro) {
      atual.push(prop);
    } else if (prop.nome === 'X-WR-CALNAME') {
      nome = desescapar(prop.valor);
    }
  }

  eventos.sort((a, b) => {
    if (a.dia !== b.dia) return a.dia < b.dia ? -1 : 1;
    // Dia inteiro primeiro: ele é o pano de fundo do dia, não um horário.
    if (a.diaInteiro !== b.diaInteiro) return a.diaInteiro ? -1 : 1;
    if ((a.hora ?? '') !== (b.hora ?? '')) return (a.hora ?? '') < (b.hora ?? '') ? -1 : 1;
    return a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0;
  });

  return { eventos, nome, avisos: [...avisos] };
}

function montarEvento(
  props: readonly Propriedade[],
  de: string,
  ate: string,
  fuso: string,
  avisos: Set<string>,
): EventoExterno[] {
  const achar = (nome: string) => props.find((p) => p.nome === nome);

  const dtstart = achar('DTSTART');
  if (!dtstart) return [];
  const inicio = lerMomento(dtstart, fuso);
  if (!inicio) return [];

  // Cancelado no Google continua no arquivo, como lápide. Mostrar seria pior
  // que não mostrar nada.
  if (achar('STATUS')?.valor.toUpperCase() === 'CANCELLED') return [];

  const titulo = desescapar(achar('SUMMARY')?.valor ?? '').trim() || '(sem título)';
  const uid = achar('UID')?.valor ?? titulo;
  const local = desescapar(achar('LOCATION')?.valor ?? '').trim() || undefined;

  const fim = achar('DTEND') ? lerMomento(achar('DTEND')!, fuso) : null;

  const rrule = achar('RRULE');
  const regra = rrule ? lerRRule(rrule.valor, fuso) : null;
  if (rrule && !regra) avisos.add(`"${titulo}" repete de um jeito que eu não sei ler`);
  if (regra && regra.ignoradas.length > 0) {
    avisos.add(`"${titulo}" usa ${regra.ignoradas.join(', ')}, que eu ignoro`);
  }

  const excecoes = props
    .filter((p) => p.nome === 'EXDATE')
    .flatMap((p) =>
      p.valor
        .split(',')
        .map((v) => lerMomento({ ...p, valor: v }, fuso)?.dia)
        .filter((d): d is string => d !== undefined),
    );

  // Um evento de dia inteiro de 17 a 20 tem DTEND no dia 20, exclusivo — ele
  // acontece em 17, 18 e 19. Somar um dia aqui poria um compromisso num dia
  // em que ele já acabou.
  const duracao =
    inicio.diaInteiro && fim?.diaInteiro
      ? Math.max(distanciaEmDias(inicio.dia, fim.dia), 1)
      : 1;

  // A janela recua pela duração: um evento de uma semana que começou antes de
  // `de` ainda está acontecendo dentro da janela.
  const dias = diasDaRepeticao(inicio.dia, regra, somarDias(de, -(duracao - 1)), ate, excecoes);

  const saida: EventoExterno[] = [];
  for (const dia of dias) {
    for (let n = 0; n < duracao; n++) {
      const emQue = somarDias(dia, n);
      if (emQue < de || emQue > ate) continue;
      saida.push({
        chave: `${uid}@${emQue}`,
        uid,
        titulo,
        dia: emQue,
        hora: inicio.hora,
        // O fim só aparece quando é do mesmo dia: "14:00 – 09:00" confunde
        // mais do que ajuda.
        fim: fim && !fim.diaInteiro && fim.dia === dia && duracao === 1 ? fim.hora : undefined,
        local,
        diaInteiro: inicio.diaInteiro,
      });
    }
  }
  return saida;
}

/** Os eventos de um dia, já lidos. */
export function eventosDoDia(agenda: AgendaLida, dia: string): EventoExterno[] {
  return agenda.eventos.filter((e) => e.dia === dia);
}
