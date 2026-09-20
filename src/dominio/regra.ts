import type { Banco, Regra, Gatilho, Acao, Tarefa, Contexto } from '../dados/esquema';
import { situacao, diasDeAtraso } from './tarefa';
import { painelDosProjetos } from './projeto';
import { metasEmCurso } from './meta';

/**
 * Regras: quando tal coisa acontecer, faça tal outra.
 *
 * ## A regra nunca escreve sozinha
 *
 * Ela calcula o que faria e devolve a lista; aplicar é um toque meu. Um
 * sistema que edita os meus dados enquanto eu durmo é exatamente o que "não
 * suponha em silêncio" proíbe — e desfazer uma automação que rodou sozinha
 * custa muito mais que confirmar uma que não rodou.
 *
 * ## Sem registro de disparo
 *
 * Não existe "já disparou hoje". Em vez disso **todo efeito é idempotente**:
 * aplicar duas vezes dá o mesmo que aplicar uma. A regra que cria uma tarefa
 * confere antes se já existe uma pendente com aquele título naquele projeto; a
 * que arquiva não propõe arquivar o que já está arquivado; a que traz para
 * hoje não aparece para quem já está em hoje.
 *
 * Isso troca uma coleção de histórico — que cresceria para sempre e precisaria
 * sincronizar entre aparelhos — por uma propriedade do próprio cálculo. E é
 * mais robusto: um aparelho que ficou offline não repete nada ao voltar,
 * porque a pergunta é sempre sobre o estado de agora.
 */

export type TipoDeEfeito = 'criar-tarefa' | 'arquivar-projeto' | 'editar-tarefa';

export interface Efeito {
  /** única e estável: a mesma situação dá sempre a mesma chave */
  chave: string;
  regraId: string;
  /** o que aparece na tela antes de eu aplicar */
  descricao: string;
  tipo: TipoDeEfeito;
  /** para `criar-tarefa` */
  tarefa?: Omit<Tarefa, 'id' | 'criadoEm' | 'alteradoEm'>;
  /** para `arquivar-projeto` */
  projetoId?: string;
  /** para `editar-tarefa` */
  tarefaId?: string;
  mudanca?: Partial<Tarefa>;
}

const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;

/** `{projeto}` no título vira o nome do projeto. */
const preencher = (texto: string, nome: string) => texto.replaceAll('{projeto}', nome);

/* ── Os alvos de cada gatilho ────────────────────────────────────────────── */

interface Alvo {
  /** identifica o alvo dentro da regra — entra na chave do efeito */
  id: string;
  nome: string;
  contexto: Contexto;
  /** por que este alvo foi pego */
  motivo: string;
}

function alvosDe(banco: Banco, gatilho: Gatilho, hoje: string): Alvo[] {
  switch (gatilho.tipo) {
    case 'projeto-parado': {
      const dias = Math.max(Math.trunc(gatilho.dias) || 1, 1);
      return painelDosProjetos(banco, hoje)
        .filter((p) => p.parado && p.paradoHa >= dias)
        .map((p) => ({
          id: p.projeto.id,
          nome: p.projeto.titulo,
          contexto: p.projeto.contexto,
          motivo: `parado há ${plural(p.paradoHa, 'dia', 'dias')}`,
        }));
    }

    case 'projeto-terminado':
      return painelDosProjetos(banco, hoje)
        // Zero de zero não é "terminado": um projeto sem tarefa nenhuma nunca
        // começou, e arquivá-lo seria apagar o que eu ainda ia planejar.
        .filter((p) => p.progresso.total > 0 && p.progresso.concluidas === p.progresso.total)
        .map((p) => ({
          id: p.projeto.id,
          nome: p.projeto.titulo,
          contexto: p.projeto.contexto,
          motivo: `${plural(p.progresso.total, 'tarefa concluída', 'tarefas concluídas')}`,
        }));

    case 'tarefa-atrasada': {
      const dias = Math.max(Math.trunc(gatilho.dias) || 1, 1);
      return banco.tarefas
        .filter((t) => situacao(t, hoje) === 'atrasada' && diasDeAtraso(t, hoje) >= dias)
        .map((t) => ({
          id: t.id,
          nome: t.titulo,
          contexto: t.contexto,
          motivo: `atrasada há ${plural(diasDeAtraso(t, hoje), 'dia', 'dias')}`,
        }));
    }

    case 'meta-atrasada':
      return metasEmCurso(banco, hoje)
        .filter((m) => m.atrasada)
        .map((m) => ({
          id: m.meta.id,
          nome: m.meta.titulo,
          contexto: m.meta.contexto,
          motivo: `${m.feito} de ${m.alvo}, andando devagar`,
        }));
  }
}

/* ── O que cada ação propõe ──────────────────────────────────────────────── */

function efeitoDe(
  banco: Banco,
  regra: Regra,
  alvo: Alvo,
  acao: Acao,
  hoje: string,
): Efeito | null {
  switch (acao.tipo) {
    case 'criar-tarefa': {
      const titulo = preencher(acao.titulo, alvo.nome).trim();
      if (titulo === '') return null;

      // O gatilho de projeto amarra a tarefa nova ao projeto; os outros não
      // têm projeto para amarrar, e a tarefa nasce solta.
      const projetoId =
        regra.gatilho.tipo === 'projeto-parado' || regra.gatilho.tipo === 'projeto-terminado'
          ? alvo.id
          : undefined;

      // **A idempotência mora aqui.** Já existe uma pendente com este título
      // no mesmo lugar? Então a regra já foi aplicada e não propõe de novo.
      const jaExiste = banco.tarefas.some(
        (t) => !t.concluidaEm && t.titulo === titulo && t.projetoId === projetoId,
      );
      if (jaExiste) return null;

      return {
        chave: `${regra.id}:${alvo.id}:criar`,
        regraId: regra.id,
        descricao: `Criar "${titulo}" — ${alvo.nome} ${alvo.motivo}`,
        tipo: 'criar-tarefa',
        tarefa: { titulo, contexto: acao.contexto, prazo: hoje, projetoId },
      };
    }

    case 'arquivar-projeto': {
      const projeto = banco.projetos.find((p) => p.id === alvo.id);
      // Arquivar o que já está arquivado não é efeito nenhum.
      if (!projeto || projeto.arquivadoEm) return null;

      return {
        chave: `${regra.id}:${alvo.id}:arquivar`,
        regraId: regra.id,
        descricao: `Arquivar "${alvo.nome}" — ${alvo.motivo}`,
        tipo: 'arquivar-projeto',
        projetoId: alvo.id,
      };
    }

    case 'trazer-para-hoje': {
      const tarefa = banco.tarefas.find((t) => t.id === alvo.id);
      // Só faz sentido para o gatilho de tarefa, e só se o prazo não for hoje.
      if (!tarefa || tarefa.concluidaEm || tarefa.prazo === hoje) return null;

      return {
        chave: `${regra.id}:${alvo.id}:hoje`,
        regraId: regra.id,
        descricao: `Trazer "${alvo.nome}" para hoje — ${alvo.motivo}`,
        tipo: 'editar-tarefa',
        tarefaId: alvo.id,
        mudanca: { prazo: hoje },
      };
    }
  }
}

/**
 * O que as regras querem fazer agora.
 *
 * Nada é gravado: a lista é uma proposta. A ordem é estável pela chave, para a
 * tela não embaralhar entre dois desenhos.
 */
export function oQueAsRegrasQuerem(banco: Banco, hoje: string): Efeito[] {
  const efeitos: Efeito[] = [];

  for (const regra of banco.regras) {
    if (!regra.ativa) continue;
    for (const alvo of alvosDe(banco, regra.gatilho, hoje)) {
      const efeito = efeitoDe(banco, regra, alvo, regra.acao, hoje);
      if (efeito) efeitos.push(efeito);
    }
  }

  return efeitos.sort((a, b) => (a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0));
}

/**
 * Aplica os efeitos num banco, devolvendo o banco novo.
 *
 * Função pura, e aplicar duas vezes dá o mesmo que aplicar uma — porque
 * `oQueAsRegrasQuerem` já não proporia de novo o que está feito, e porque cada
 * efeito aqui é uma escrita idempotente por si.
 *
 * Quem grava é o contexto de dados; esta função só monta o resultado, o que a
 * torna testável sem React e sem armazenamento.
 */
export function aplicarEfeitos(
  banco: Banco,
  efeitos: readonly Efeito[],
  agora: string,
  novoId: () => string,
): Banco {
  let atual = banco;

  for (const efeito of efeitos) {
    if (efeito.tipo === 'criar-tarefa' && efeito.tarefa) {
      atual = {
        ...atual,
        tarefas: [
          ...atual.tarefas,
          { ...efeito.tarefa, id: novoId(), criadoEm: agora, alteradoEm: agora },
        ],
      };
    }

    if (efeito.tipo === 'arquivar-projeto' && efeito.projetoId) {
      atual = {
        ...atual,
        projetos: atual.projetos.map((p) =>
          p.id === efeito.projetoId ? { ...p, arquivadoEm: agora, alteradoEm: agora } : p,
        ),
      };
    }

    if (efeito.tipo === 'editar-tarefa' && efeito.tarefaId) {
      atual = {
        ...atual,
        tarefas: atual.tarefas.map((t) =>
          t.id === efeito.tarefaId ? { ...t, ...efeito.mudanca, alteradoEm: agora } : t,
        ),
      };
    }
  }

  return atual;
}

/* ── Texto ───────────────────────────────────────────────────────────────── */

export function descreverGatilho(g: Gatilho): string {
  switch (g.tipo) {
    case 'projeto-parado':
      return `Quando um projeto ficar ${plural(g.dias, 'dia', 'dias')} parado`;
    case 'projeto-terminado':
      return 'Quando todas as tarefas de um projeto terminarem';
    case 'tarefa-atrasada':
      return `Quando uma tarefa atrasar ${plural(g.dias, 'dia', 'dias')}`;
    case 'meta-atrasada':
      return 'Quando uma meta ficar para trás do calendário';
  }
}

export function descreverAcao(a: Acao): string {
  switch (a.tipo) {
    case 'criar-tarefa':
      return `criar a tarefa "${a.titulo}"`;
    case 'arquivar-projeto':
      return 'arquivar o projeto';
    case 'trazer-para-hoje':
      return 'trazer o prazo para hoje';
  }
}

export const descreverRegra = (r: Regra) =>
  `${descreverGatilho(r.gatilho)}, ${descreverAcao(r.acao)}.`;

/* ── Validação ───────────────────────────────────────────────────────────── */

export class RegraInvalida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'RegraInvalida';
  }
}

/**
 * O que uma regra não pode ser.
 *
 * O caso que importa é o par sem sentido: "quando uma meta atrasar, arquive o
 * projeto" não tem projeto nenhum para arquivar. Deixar passar criaria uma
 * regra que nunca faz nada e que ninguém entende por quê.
 */
export function validarRegra(regra: Pick<Regra, 'titulo' | 'gatilho' | 'acao'>): void {
  if (regra.titulo.trim() === '') throw new RegraInvalida('a regra precisa de um nome');

  const sobreProjeto =
    regra.gatilho.tipo === 'projeto-parado' || regra.gatilho.tipo === 'projeto-terminado';
  const sobreTarefa = regra.gatilho.tipo === 'tarefa-atrasada';

  if (regra.acao.tipo === 'arquivar-projeto' && !sobreProjeto) {
    throw new RegraInvalida('só dá para arquivar um projeto quando o gatilho fala de um projeto');
  }
  if (regra.acao.tipo === 'trazer-para-hoje' && !sobreTarefa) {
    throw new RegraInvalida('só dá para mudar o prazo quando o gatilho fala de uma tarefa');
  }
  if (regra.acao.tipo === 'criar-tarefa' && regra.acao.titulo.trim() === '') {
    throw new RegraInvalida('a tarefa criada precisa de um título');
  }
}
