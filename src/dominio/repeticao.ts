import type { Tarefa, RepeticaoDaTarefa, PeriodoRecorrencia } from '../dados/esquema';
import { somarDias, diasNoMes, diaValido } from './rotina';

/**
 * A tarefa que se repete.
 *
 * "Pagar o IPVA todo ano em março", "revisar as metas toda sexta". Até aqui só
 * rotina e lançamento repetiam, e a diferença importa: **uma rotina que não
 * foi feita hoje simplesmente não foi feita** — ela não atrasa, não acumula,
 * volta amanhã limpa. O IPVA não some no dia 16; ele fica atrasado.
 *
 * ## Gerada, e não derivada
 *
 * É a exceção declarada à regra da casa. O calendário e o lançamento recorrente
 * expandem ocorrências ao serem perguntados, sem gravar nada. Uma ocorrência de
 * tarefa não pode ser assim: ela precisa de identidade para atrasar, receber
 * anotação e andar no quadro.
 *
 * Então a próxima nasce **ao concluir a atual**, e não antes:
 *
 * - o futuro não enche de tarefas que ninguém pediu;
 * - pular três semanas deixa **uma** pendência atrasada, e não três — uma pilha
 *   de culpa retroativa não ajuda ninguém a fazer a de hoje;
 * - e a série nunca se perde, porque a regra viaja em cada ocorrência.
 *
 * O preço está declarado: quem nunca conclui, nunca vê a próxima. Para isso
 * existe `aoPular`, que empurra a atual sem fingir que ela foi feita.
 */

/**
 * O prazo seguinte, a partir de um prazo.
 *
 * Devolve `null` quando a série acabou.
 */
export function proximoPrazo(prazo: string, repeticao: RepeticaoDaTarefa): string | null {
  if (!diaValido(prazo)) return null;
  // Intervalo torto vindo de arquivo editado à mão viraria laço ou data parada.
  const passos = Math.max(Math.trunc(repeticao.intervalo) || 1, 1);

  const proximo = avancar(prazo, repeticao.periodo, passos);
  if (repeticao.ate && proximo > repeticao.ate) return null;
  return proximo;
}

function avancar(prazo: string, periodo: PeriodoRecorrencia, passos: number): string {
  if (periodo === 'semanal') return somarDias(prazo, 7 * passos);

  const [ano, mes, dia] = prazo.split('-').map(Number);
  const meses = periodo === 'mensal' ? passos : 12 * passos;
  const total = ano * 12 + (mes - 1) + meses;
  const anoNovo = Math.floor(total / 12);
  const mesNovo = (total % 12) + 1;

  /*
   * O dia 31 num mês de 30 vira o dia 30 — **o contrário do que o iCal faz**.
   *
   * Lá a regra é pular o mês, porque um compromisso que não existe naquele dia
   * não aconteceu. Aqui é o oposto: "pagar o aluguel todo dia 31" não pode
   * deixar de existir em fevereiro. Uma conta não some por falta de dia no
   * calendário; ela vence no último que houver.
   */
  const ultimo = diasNoMes(anoNovo, mesNovo);
  const diaNovo = Math.min(dia, ultimo);

  return `${anoNovo}-${String(mesNovo).padStart(2, '0')}-${String(diaNovo).padStart(2, '0')}`;
}

/** O que a próxima ocorrência herda. */
type Semente = Omit<Tarefa, 'id' | 'criadoEm' | 'alteradoEm'>;

/**
 * A próxima ocorrência de uma tarefa que acabou de ser concluída.
 *
 * `null` quando ela não repete, não tem prazo, ou a série chegou ao fim.
 *
 * Herda o que descreve a tarefa — título, contexto, hora, projeto, a própria
 * regra — e **não** herda o que descreve aquela vez: a anotação escrita em
 * março não vale para abril, e a coluna do quadro recomeça em "a fazer".
 */
export function proximaOcorrencia(tarefa: Tarefa): Semente | null {
  if (!tarefa.repeticao || !tarefa.prazo) return null;
  const prazo = proximoPrazo(tarefa.prazo, tarefa.repeticao);
  if (!prazo) return null;

  return {
    titulo: tarefa.titulo,
    contexto: tarefa.contexto,
    prazo,
    hora: tarefa.hora,
    projetoId: tarefa.projetoId,
    repeticao: tarefa.repeticao,
  };
}

/**
 * Empurrar a ocorrência sem marcá-la como feita.
 *
 * Devolve a mudança a aplicar na **própria** tarefa — ela anda no tempo em vez
 * de virar histórico. Pular não é concluir, e registrar como concluído o que
 * não foi feito estragaria toda conta que o sistema faz a partir daí.
 *
 * `null` quando não há para onde pular.
 */
export function aoPular(tarefa: Tarefa): { prazo: string } | null {
  if (!tarefa.repeticao || !tarefa.prazo) return null;
  const prazo = proximoPrazo(tarefa.prazo, tarefa.repeticao);
  return prazo ? { prazo } : null;
}

/** `Todo mês` · `A cada 3 semanas, até 31/12/2026` */
export function descreverRepeticao(r: RepeticaoDaTarefa): string {
  const passos = Math.max(Math.trunc(r.intervalo) || 1, 1);
  const UM: Record<PeriodoRecorrencia, string> = {
    semanal: 'Toda semana',
    mensal: 'Todo mês',
    anual: 'Todo ano',
  };
  const MUITOS: Record<PeriodoRecorrencia, string> = {
    semanal: 'semanas',
    mensal: 'meses',
    anual: 'anos',
  };

  const base = passos === 1 ? UM[r.periodo] : `A cada ${passos} ${MUITOS[r.periodo]}`;
  if (!r.ate) return base;
  return `${base}, até ${r.ate.split('-').reverse().join('/')}`;
}

/** A série acabou: não há próxima ocorrência depois desta. */
export function ehAUltima(tarefa: Tarefa): boolean {
  return !!tarefa.repeticao && !!tarefa.prazo && proximaOcorrencia(tarefa) === null;
}
