import type { Modelo, ItemDoModelo, Projeto, Tarefa } from '../dados/esquema';
import { somarDias, diaValido, distanciaEmDias } from './rotina';
import { ordenarTarefas } from './tarefa';

/**
 * Modelos de projeto.
 *
 * Um projeto que eu já sei fazer — "lançar um produto", "fechar o mês" — vira
 * uma lista montada uma vez e usada em toda entrega.
 *
 * **Os prazos são relativos à entrega, nunca datas.** Um modelo com datas
 * fixas serviria uma vez e depois viraria uma lista de prazos vencidos.
 * "Revisar o texto, 3 dias antes" vale para toda entrega que existir.
 *
 * Aplicar um modelo **gera** projeto e tarefas de verdade, e depois o vínculo
 * acaba: editar o modelo não mexe no que já foi criado. É o contrário do
 * calendário, e de propósito — um projeto em andamento não pode mudar de
 * escopo porque alguém corrigiu um modelo.
 */

export type Semente<T> = Omit<T, 'id' | 'criadoEm' | 'alteradoEm'>;

export interface Aplicacao {
  projeto: Semente<Projeto>;
  /** as tarefas, na ordem em que acontecem; `projetoId` é preenchido por quem grava */
  tarefas: Omit<Semente<Tarefa>, 'projetoId'>[];
}

/**
 * O que o modelo cria para uma entrega naquele dia.
 *
 * `titulo` sobrescreve o nome do modelo — "Lançar o curso de março" em vez de
 * "Lançar um produto", que é o nome da receita e não do prato.
 */
export function aplicarModelo(
  modelo: Modelo,
  entrega: string,
  titulo?: string,
): Aplicacao {
  return {
    projeto: {
      titulo: (titulo ?? modelo.titulo).trim() || modelo.titulo,
      contexto: modelo.contexto,
      descricao: modelo.descricao,
      prazo: entrega,
    },
    tarefas: ordenarItens(modelo.itens).map((item) => ({
      titulo: item.titulo,
      contexto: modelo.contexto,
      // Contar para trás: 3 dias antes de uma entrega em 20/03 é 17/03.
      prazo: somarDias(entrega, -item.diasAntes),
      hora: item.hora,
    })),
  };
}

/**
 * Os itens na ordem em que acontecem.
 *
 * Mais dias antes vem primeiro. O desempate é pelo título, para a mesma lista
 * sair na mesma ordem toda vez — um modelo que embaralha a cada abertura não
 * dá para conferir.
 */
export function ordenarItens(itens: readonly ItemDoModelo[]): ItemDoModelo[] {
  return [...itens].sort((a, b) => {
    if (a.diasAntes !== b.diasAntes) return b.diasAntes - a.diasAntes;
    return a.titulo < b.titulo ? -1 : a.titulo > b.titulo ? 1 : 0;
  });
}

/**
 * Transforma um projeto que existe num modelo.
 *
 * É como um modelo bom nasce: primeiro eu faço o projeto, depois percebo que
 * vou repetir. Os prazos viram distâncias até a entrega do projeto.
 *
 * Sem prazo no projeto não há de onde contar, e o modelo sairia com todas as
 * tarefas no mesmo dia — por isso devolve `null` em vez de um modelo torto.
 */
export function modeloDeProjeto(
  projeto: Projeto,
  tarefas: readonly Tarefa[],
  hoje: string,
): Semente<Modelo> | null {
  if (!projeto.prazo || !diaValido(projeto.prazo)) return null;
  const entrega = projeto.prazo;

  const doProjeto = tarefas.filter((t) => t.projetoId === projeto.id);
  if (doProjeto.length === 0) return null;

  return {
    titulo: projeto.titulo,
    contexto: projeto.contexto,
    descricao: projeto.descricao,
    itens: ordenarTarefas(doProjeto, hoje).map((t) => ({
      titulo: t.titulo,
      // Tarefa sem prazo vira "no dia da entrega": zero é a resposta honesta
      // para "quantos dias antes?" quando ninguém disse.
      diasAntes: t.prazo ? distancia(t.prazo, entrega) : 0,
      hora: t.hora,
    })),
  };
}

/**
 * Quantos dias `prazo` está antes de `entrega`. Negativo é depois.
 *
 * Usa a função do domínio, e não uma conta local com `Date.UTC`. A primeira
 * versão passava o mês cru para `Date.UTC`, que o quer 0-indexado, achando que
 * o deslocamento se cancelava entre as duas datas — não se cancela quando elas
 * caem em meses de tamanhos diferentes, e 17/09 a 01/10 dava 15 dias em vez de
 * 14. O teste de ida e volta pegou.
 */
const distancia = (prazo: string, entrega: string) => distanciaEmDias(prazo, entrega);

/* ── Validação ───────────────────────────────────────────────────────────── */

export class ModeloInvalido extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ModeloInvalido';
  }
}

export function validarModelo(modelo: Pick<Modelo, 'titulo' | 'itens'>): void {
  if (modelo.titulo.trim() === '') throw new ModeloInvalido('o modelo precisa de um nome');
  if (modelo.itens.length === 0) throw new ModeloInvalido('um modelo sem tarefa nenhuma não cria nada');
  for (const item of modelo.itens) {
    if (item.titulo.trim() === '') throw new ModeloInvalido('toda tarefa do modelo precisa de um nome');
    if (!Number.isInteger(item.diasAntes)) {
      throw new ModeloInvalido('os dias antes da entrega precisam ser um número inteiro');
    }
  }
}

/** `8 tarefas · da 30 dias antes até o dia da entrega` */
export function descreverModelo(modelo: Modelo): string {
  const quantas = `${modelo.itens.length} ${modelo.itens.length === 1 ? 'tarefa' : 'tarefas'}`;
  if (modelo.itens.length === 0) return quantas;

  const dias = modelo.itens.map((i) => i.diasAntes);
  const primeiro = Math.max(...dias);
  const ultimo = Math.min(...dias);

  const quando = (d: number) =>
    d > 0 ? `${d} ${d === 1 ? 'dia' : 'dias'} antes` : d === 0 ? 'no dia' : `${-d} depois`;

  if (primeiro === ultimo) return `${quantas} · ${quando(primeiro)}`;
  return `${quantas} · de ${quando(primeiro)} até ${quando(ultimo)}`;
}
