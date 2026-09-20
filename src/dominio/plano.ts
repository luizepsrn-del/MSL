/**
 * O dia montado sozinho.
 *
 * O que tem hora marcada fica onde está — é fato, não sugestão. O resto entra
 * nos buracos entre os compromissos, na ordem em que cobra, até a jornada
 * acabar. O que não couber é dito, e não empurrado para depois em silêncio.
 *
 * **É uma proposta, e o sistema nunca a grava.** Nada aqui escreve no banco:
 * a função recebe listas e devolve blocos. Gravar um horário sugerido criaria
 * compromisso onde havia palpite, e no dia seguinte o palpite estaria lá
 * dizendo que eu marquei aquilo.
 *
 * Por isso também não há estimativa por tarefa: todas pedem o mesmo bloco. Um
 * número por tarefa que ninguém mediu é precisão inventada, e o bloco
 * uniforme diz a verdade — "cabem cinco coisas hoje" é a informação útil.
 */

import { horaValida } from './calendario';

export interface Compromisso {
  chave: string;
  titulo: string;
  /** `HH:MM` */
  inicio: string;
  /** `HH:MM`; sem ele, o compromisso ocupa um bloco padrão */
  fim?: string;
}

export interface ParaFazer {
  chave: string;
  titulo: string;
}

export type TipoDoBloco = 'compromisso' | 'trabalho' | 'vago';

export interface Bloco {
  inicio: string;
  fim: string;
  tipo: TipoDoBloco;
  chave: string;
  titulo: string;
}

export interface Jornada {
  /** `HH:MM` em que o dia começa a aceitar trabalho */
  de: string;
  /** `HH:MM` em que ele para */
  ate: string;
  /** quanto dura um bloco de tarefa, em minutos */
  minutosPorItem: number;
}

export const JORNADA_PADRAO: Jornada = { de: '08:00', ate: '20:00', minutosPorItem: 30 };

/** O menor buraco que ainda vale mostrar como vago. */
const MINUTOS_MINIMOS_DE_VAGO = 15;

export interface Plano {
  blocos: Bloco[];
  /** o que não coube na jornada de hoje */
  naoCoube: ParaFazer[];
  /** minutos que sobraram livres depois de encaixar tudo que coube */
  minutosVagos: number;
}

/* ── Relógio ─────────────────────────────────────────────────────────────── */

/** `HH:MM` → minutos desde a meia-noite. Hora inválida vira `null`. */
export function emMinutos(hora: string): number | null {
  if (!horaValida(hora)) return null;
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/** Minutos desde a meia-noite → `HH:MM`, preso dentro do dia. */
export function emHora(minutos: number): string {
  const preso = Math.max(0, Math.min(Math.round(minutos), 24 * 60 - 1));
  return `${String(Math.floor(preso / 60)).padStart(2, '0')}:${String(preso % 60).padStart(2, '0')}`;
}

/* ── O plano ─────────────────────────────────────────────────────────────── */

interface Intervalo {
  de: number;
  ate: number;
}

/**
 * Une os intervalos que se encostam ou se sobrepõem.
 *
 * Duas reuniões sobrepostas continuam sendo duas na tela — elas de fato se
 * atropelam, e esconder uma seria mentir. Mas o tempo ocupado é a união, ou o
 * plano encaixaria trabalho dentro da segunda reunião.
 */
function unir(intervalos: readonly Intervalo[]): Intervalo[] {
  const ordenados = [...intervalos].sort((a, b) => a.de - b.de);
  const unidos: Intervalo[] = [];

  for (const atual of ordenados) {
    const ultimo = unidos[unidos.length - 1];
    if (ultimo && atual.de <= ultimo.ate) {
      ultimo.ate = Math.max(ultimo.ate, atual.ate);
    } else {
      unidos.push({ ...atual });
    }
  }
  return unidos;
}

export function montarODia(
  compromissos: readonly Compromisso[],
  aFazer: readonly ParaFazer[],
  jornada: Jornada = JORNADA_PADRAO,
  /** `HH:MM` de agora: o plano não usa o tempo que já passou */
  agora?: string,
): Plano {
  const bloco = Math.max(Math.trunc(jornada.minutosPorItem) || 1, 1);
  const abertura = emMinutos(jornada.de) ?? 0;
  const fechamento = emMinutos(jornada.ate) ?? 24 * 60;

  // Os compromissos válidos, com um fim calculado quando não vem.
  const marcados = compromissos
    .map((c) => {
      const de = emMinutos(c.inicio);
      if (de === null) return null;
      const fimDito = c.fim ? emMinutos(c.fim) : null;
      // Fim antes do começo é dado torto: melhor um bloco padrão que um
      // intervalo negativo que engoliria o dia inteiro na hora de unir.
      const ate = fimDito !== null && fimDito > de ? fimDito : de + bloco;
      return { ...c, de, ate };
    })
    .filter((c): c is Compromisso & Intervalo => c !== null)
    .sort((a, b) => (a.de !== b.de ? a.de - b.de : a.chave < b.chave ? -1 : 1));

  const ocupado = unir(marcados);

  // O trabalho começa quando a jornada abre, ou agora, o que vier depois: não
  // adianta planejar as oito da manhã às três da tarde.
  const minutoDeAgora = agora ? emMinutos(agora) : null;
  const comeco = Math.max(abertura, minutoDeAgora ?? abertura);

  const vagos: Intervalo[] = [];
  let cursor = comeco;
  for (const { de, ate } of ocupado) {
    if (ate <= cursor) continue;
    if (de > cursor) vagos.push({ de: cursor, ate: Math.min(de, fechamento) });
    cursor = Math.max(cursor, ate);
    if (cursor >= fechamento) break;
  }
  if (cursor < fechamento) vagos.push({ de: cursor, ate: fechamento });

  // Encaixa o que há para fazer nos buracos, na ordem em que eles aparecem.
  const trabalho: Bloco[] = [];
  const sobrou: Bloco[] = [];
  const fila = [...aFazer];

  for (const vago of vagos) {
    if (vago.ate <= vago.de) continue;
    let dentro = vago.de;

    while (fila.length > 0 && dentro + bloco <= vago.ate) {
      const item = fila.shift()!;
      trabalho.push({
        inicio: emHora(dentro),
        fim: emHora(dentro + bloco),
        tipo: 'trabalho',
        chave: item.chave,
        titulo: item.titulo,
      });
      dentro += bloco;
    }

    // O que sobra do buraco só vira "vago" se der para fazer alguma coisa nele.
    if (vago.ate - dentro >= MINUTOS_MINIMOS_DE_VAGO) {
      sobrou.push({
        inicio: emHora(dentro),
        fim: emHora(vago.ate),
        tipo: 'vago',
        chave: `vago:${emHora(dentro)}`,
        titulo: 'Livre',
      });
    }
  }

  const doCompromisso: Bloco[] = marcados.map((c) => ({
    inicio: emHora(c.de),
    fim: emHora(c.ate),
    tipo: 'compromisso',
    chave: c.chave,
    titulo: c.titulo,
  }));

  const blocos = [...doCompromisso, ...trabalho, ...sobrou].sort((a, b) => {
    if (a.inicio !== b.inicio) return a.inicio < b.inicio ? -1 : 1;
    // Empate: o compromisso primeiro — ele é fato, o resto é proposta.
    const peso: Record<TipoDoBloco, number> = { compromisso: 0, trabalho: 1, vago: 2 };
    if (peso[a.tipo] !== peso[b.tipo]) return peso[a.tipo] - peso[b.tipo];
    return a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0;
  });

  return {
    blocos,
    naoCoube: fila,
    minutosVagos: sobrou.reduce(
      (total, b) => total + ((emMinutos(b.fim) ?? 0) - (emMinutos(b.inicio) ?? 0)),
      0,
    ),
  };
}

/**
 * `3 coisas cabem hoje · 1h30 livre` — o resumo que a tela mostra.
 *
 * Quando nada coube, diz isso em primeiro lugar. "3 ficam para depois" sozinho
 * deixa a pergunta no ar — vi a tela às 20h40, com a jornada fechada às 20h, e
 * ela não explicava por que não tinha planejado nada.
 */
export function resumirPlano(plano: Plano): string {
  const cabem = plano.blocos.filter((b) => b.tipo === 'trabalho').length;
  const ficam = plano.naoCoube.length;
  const partes: string[] = [];

  if (cabem > 0) partes.push(`${cabem} ${cabem === 1 ? 'coisa cabe' : 'coisas cabem'} hoje`);
  else if (ficam > 0) partes.push('A jornada de hoje já fechou');

  if (ficam > 0) partes.push(`${ficam} ${ficam === 1 ? 'fica' : 'ficam'} para amanhã`);
  if (plano.minutosVagos > 0) partes.push(`${duracao(plano.minutosVagos)} livre`);

  return partes.length === 0 ? 'Sem espaço no dia' : partes.join(' · ');
}

/** `1h30` · `45min` · `2h` */
export function duracao(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}
