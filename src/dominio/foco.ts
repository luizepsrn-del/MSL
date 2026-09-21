import type { Banco, Contexto } from '../dados/esquema';
import { agendaDoDia } from './rotina';
import { situacao, diasDeAtraso } from './tarefa';
import { projetosQuePedemAtencao } from './projeto';
import { metasEmCurso } from './meta';
import { ocorrenciasEntre } from './financeiro';
import { compararHora } from './calendario';
import { pecasDeHoje } from './criacao';
import { distanciaEmDias } from './rotina';

/**
 * O que precisa de mim agora.
 *
 * Uma lista só, com tudo que o sistema sabe, **na ordem em que cobra**. É a
 * diferença entre um painel e uma instrução: seis cartões cada um com a sua
 * lista me fazem decidir de novo toda manhã; uma fila ordenada responde.
 *
 * A ordem é um julgamento, e por isso mora aqui, testada, e não espalhada pela
 * tela. As faixas, da mais urgente para a menos:
 *
 *   0  tarefa atrasada        — já passou do prazo, e passa mais a cada dia
 *   1  compromisso com hora   — tarefa ou rotina de hoje com hora marcada
 *   2  conta a pagar hoje     — lançamento com data de hoje
 *   3  tarefa que vence hoje  — sem hora
 *   4  rotina de hoje         — sem hora
 *   5  meta que ainda dá      — atrasada, mas salvável
 *   6  projeto parado         — o que apodrece calado
 *
 * O que não cabe em nenhuma faixa **não entra**. Uma lista de "o que fazer
 * agora" com quarenta itens é uma lista de tudo, e volta a ser um painel.
 */

export type TipoDoFoco = 'tarefa' | 'rotina' | 'lancamento' | 'meta' | 'projeto' | 'peca';

export interface ItemDoFoco {
  /** único na lista */
  chave: string;
  tipo: TipoDoFoco;
  /** o id do registro, para a tela saber o que marcar */
  id: string;
  titulo: string;
  /** por que este item está aqui — nunca vazio */
  motivo: string;
  /** `HH:MM` quando há hora marcada */
  hora?: string;
  contexto?: Contexto;
  /** a faixa: menor é mais urgente */
  faixa: number;
  /** já pode ser marcado como feito a partir da lista */
  marcavel: boolean;
}

/** Quantos itens a lista mostra antes de virar painel de novo. */
export const LIMITE_DO_FOCO = 7;

const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;

export function precisaDeVoce(banco: Banco, hoje: string, limite = LIMITE_DO_FOCO): ItemDoFoco[] {
  const itens: ItemDoFoco[] = [];

  /* Faixa 0 e 1 e 3: as tarefas. */
  for (const t of banco.tarefas) {
    if (t.concluidaEm) continue;
    const onde = situacao(t, hoje);

    if (onde === 'atrasada') {
      const dias = diasDeAtraso(t, hoje);
      itens.push({
        chave: `tarefa:${t.id}`,
        tipo: 'tarefa',
        id: t.id,
        titulo: t.titulo,
        motivo: `Atrasada há ${plural(dias, 'dia', 'dias')}`,
        hora: t.hora,
        contexto: t.contexto,
        // Mais atrasada, mais em cima — e nunca sai da faixa 0.
        faixa: -dias / 10_000,
        marcavel: true,
      });
      continue;
    }

    if (onde === 'hoje') {
      itens.push({
        chave: `tarefa:${t.id}`,
        tipo: 'tarefa',
        id: t.id,
        titulo: t.titulo,
        motivo: t.hora ? `Vence hoje, às ${t.hora}` : 'Vence hoje',
        hora: t.hora,
        contexto: t.contexto,
        faixa: t.hora ? 1 : 3,
        marcavel: true,
      });
    }
  }

  /* Faixa 0 e 3: o que eu escrevi e ainda não saiu.
     Na mesma faixa da tarefa, e não numa própria: uma peça que devia ter
     saído ontem cobra exatamente como uma tarefa vencida ontem, e separá-las
     faria a fila mentir sobre o que é mais urgente. */
  for (const peca of pecasDeHoje(banco, hoje)) {
    const dias = distanciaEmDias(peca.publicarEm!, hoje);
    itens.push({
      chave: `peca:${peca.id}`,
      tipo: 'peca',
      id: peca.id,
      titulo: peca.titulo,
      motivo: dias > 0 ? `Devia ter saído há ${plural(dias, 'dia', 'dias')}` : 'Sai hoje',
      contexto: peca.contexto,
      faixa: dias > 0 ? -dias / 10_000 : 3,
      // Publicar é uma decisão, não uma caixinha: marcar daqui diria que saiu
      // sem que nada tivesse saído.
      marcavel: false,
    });
  }

  /* Faixa 1 e 4: a rotina de hoje que ainda não foi cumprida. */
  for (const { rotina, feita } of agendaDoDia(banco, hoje)) {
    if (feita) continue;
    itens.push({
      chave: `rotina:${rotina.id}`,
      tipo: 'rotina',
      id: rotina.id,
      titulo: rotina.titulo,
      motivo: rotina.hora ? `Da rotina, às ${rotina.hora}` : 'Da rotina de hoje',
      hora: rotina.hora,
      contexto: rotina.contexto,
      faixa: rotina.hora ? 1 : 4,
      marcavel: true,
    });
  }

  /* Faixa 2: o que vence no bolso hoje. */
  for (const o of ocorrenciasEntre(banco, hoje, hoje)) {
    itens.push({
      chave: `lancamento:${o.lancamento.id}@${o.data}`,
      tipo: 'lancamento',
      id: o.lancamento.id,
      titulo: o.lancamento.descricao,
      motivo: o.lancamento.tipo === 'saida' ? 'Sai hoje' : 'Entra hoje',
      contexto: o.lancamento.contexto,
      faixa: 2,
      // Lançamento não se "conclui": ele aconteceu ou não. Marcar daqui
      // inventaria um estado que o financeiro não tem.
      marcavel: false,
    });
  }

  /* Faixa 5: a meta que ainda dá para salvar hoje. */
  for (const medida of metasEmCurso(banco, hoje)) {
    if (!medida.atrasada || medida.porDia === undefined) continue;
    itens.push({
      chave: `meta:${medida.meta.id}`,
      tipo: 'meta',
      id: medida.meta.id,
      titulo: medida.meta.titulo,
      motivo: `Atrasada · precisa de ${Math.ceil(medida.porDia)} por dia até o fim`,
      contexto: medida.meta.contexto,
      faixa: 5,
      marcavel: false,
    });
  }

  /* Faixa 6: o projeto que apodrece calado. */
  for (const p of projetosQuePedemAtencao(banco, hoje)) {
    if (!p.parado) continue;
    itens.push({
      chave: `projeto:${p.projeto.id}`,
      tipo: 'projeto',
      id: p.projeto.id,
      titulo: p.projeto.titulo,
      motivo: p.proxima
        ? `Parado há ${plural(p.paradoHa, 'dia', 'dias')} · próxima: ${p.proxima.titulo}`
        : `Parado há ${plural(p.paradoHa, 'dia', 'dias')}`,
      contexto: p.projeto.contexto,
      faixa: 6,
      marcavel: false,
    });
  }

  return itens
    .sort((a, b) => {
      if (a.faixa !== b.faixa) return a.faixa - b.faixa;
      // Dentro da mesma faixa, a ordem do relógio; sem hora vai para o fim.
      const porHora = compararHora(a.hora, b.hora);
      if (porHora !== 0) return porHora;
      // Desempate estável: sem ele a lista muda de ordem entre dois desenhos.
      return a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0;
    })
    .slice(0, limite);
}

/* ── A saudação ──────────────────────────────────────────────────────────── */

/**
 * Bom dia, boa tarde, boa noite.
 *
 * Recebe a hora, e não um `Date`, pelo mesmo motivo que o resto do domínio
 * recebe `AAAA-MM-DD`: assim dá para testar as três faixas sem mexer no relógio
 * da máquina.
 */
export function saudacao(hora: number): string {
  if (hora < 5) return 'Boa noite';
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * A linha embaixo da saudação: uma frase sobre o dia.
 *
 * Nunca é uma lista — é uma frase. Se houver o que fazer, ela diz quanto; se
 * não houver, ela diz que não há, o que também é informação.
 */
export function comoEstaODia(banco: Banco, hoje: string): string {
  const fila = precisaDeVoce(banco, hoje, Number.MAX_SAFE_INTEGER);
  if (fila.length === 0) return 'Nada pendente. O dia está limpo.';

  const atrasadas = fila.filter((i) => i.tipo === 'tarefa' && i.faixa < 1).length;
  const comHora = fila.filter((i) => i.hora !== undefined).length;

  const partes: string[] = [`${plural(fila.length, 'coisa', 'coisas')} pedindo você`];
  if (atrasadas > 0) partes.push(`${plural(atrasadas, 'atrasada', 'atrasadas')}`);
  if (comHora > 0) partes.push(`${plural(comHora, 'com hora', 'com hora')}`);

  return `${partes.join(' · ')}.`;
}
