import React from 'react';
import {
  bancoVazio,
  novoId,
  diaLocal,
  type Banco,
  type Rotina,
  type Execucao,
  type Tarefa,
  type Projeto,
  type Lancamento,
  type EstadoTarefa,
  type Preferencias,
} from './esquema';
import { RepositorioLocal, type Repositorio } from './repositorio';
import { removerProjeto as soltarEremover } from '../dominio/projeto';
import { aoMoverPara } from '../dominio/tarefa';
import { editarNaLista, type Edicao } from '../dominio/edicao';
import { validarValor } from '../dominio/financeiro';

/**
 * O banco, disponível para as telas.
 *
 * As telas nunca tocam no `Repositorio` diretamente: chamam as ações daqui,
 * que cuidam de gravar. Trocar a implementação de armazenamento — para o
 * backend, quando chegar a hora — muda só a linha que constrói o repositório.
 */

interface Acoes {
  banco: Banco;
  carregando: boolean;
  hoje: string;
  criarRotina(dados: Omit<Rotina, keyof BaseRegistro>): Promise<void>;
  /** corrige o que já existe; campo com `undefined` é apagado */
  editarRotina(id: string, mudanca: Edicao<Rotina>): Promise<void>;
  arquivarRotina(id: string): Promise<void>;
  alternarExecucao(rotinaId: string, dia: string): Promise<void>;
  criarTarefa(dados: Omit<Tarefa, keyof BaseRegistro>): Promise<void>;
  editarTarefa(id: string, mudanca: Edicao<Tarefa>): Promise<void>;
  alternarTarefa(id: string): Promise<void>;
  removerTarefa(id: string): Promise<void>;
  /** move a tarefa de coluna no quadro; entrar em "feito" conclui, sair reabre */
  mudarEstadoTarefa(id: string, estado: EstadoTarefa): Promise<void>;
  criarProjeto(dados: Omit<Projeto, keyof BaseRegistro>): Promise<void>;
  editarProjeto(id: string, mudanca: Edicao<Projeto>): Promise<void>;
  arquivarProjeto(id: string): Promise<void>;
  /** solta as tarefas do projeto; não as apaga */
  removerProjeto(id: string): Promise<void>;
  moverTarefa(tarefaId: string, projetoId: string | undefined): Promise<void>;
  criarLancamento(dados: Omit<Lancamento, keyof BaseRegistro>): Promise<void>;
  editarLancamento(id: string, mudanca: Edicao<Lancamento>): Promise<void>;
  removerLancamento(id: string): Promise<void>;
  /** grava o que eu escolhi sobre a interface; viaja no backup */
  definirPreferencias(mudanca: Partial<Preferencias>): Promise<void>;
  exportar(): Promise<string>;
  importar(json: string): Promise<void>;
}

type BaseRegistro = { id: string; criadoEm: string; alteradoEm: string };

const Contexto = React.createContext<Acoes | null>(null);

export function ProvedorBanco({
  children,
  repositorio,
}: {
  children: React.ReactNode;
  /** injetável para teste; em produção é o RepositorioLocal */
  repositorio?: Repositorio;
}) {
  const repo = React.useMemo(() => repositorio ?? new RepositorioLocal(), [repositorio]);
  const [banco, setBanco] = React.useState<Banco>(bancoVazio);
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    let vivo = true;
    repo.carregar().then((b) => {
      if (!vivo) return;
      setBanco(b);
      setCarregando(false);
    });
    return () => {
      vivo = false;
    };
  }, [repo]);

  const gravar = React.useCallback(
    async (proximo: Banco) => {
      setBanco(proximo);
      await repo.salvar(proximo);
    },
    [repo],
  );

  const valor = React.useMemo<Acoes>(() => {
    const agora = () => new Date().toISOString();

    return {
      banco,
      carregando,
      hoje: diaLocal(new Date()),

      async criarRotina(dados) {
        const t = agora();
        const rotina: Rotina = { ...dados, id: novoId(), criadoEm: t, alteradoEm: t };
        await gravar({ ...banco, rotinas: [...banco.rotinas, rotina] });
      },

      async editarRotina(id, mudanca) {
        await gravar({ ...banco, rotinas: editarNaLista(banco.rotinas, id, mudanca, agora()) });
      },

      async arquivarRotina(id) {
        await gravar({
          ...banco,
          rotinas: banco.rotinas.map((r) =>
            r.id === id ? { ...r, arquivada: true, alteradoEm: agora() } : r,
          ),
        });
      },

      async alternarExecucao(rotinaId, dia) {
        const existente = banco.execucoes.find((e) => e.rotinaId === rotinaId && e.dia === dia);
        if (existente) {
          await gravar({
            ...banco,
            execucoes: banco.execucoes.filter((e) => e.id !== existente.id),
          });
          return;
        }
        const t = agora();
        const execucao: Execucao = { id: novoId(), criadoEm: t, alteradoEm: t, rotinaId, dia };
        await gravar({ ...banco, execucoes: [...banco.execucoes, execucao] });
      },

      async criarTarefa(dados) {
        const t = agora();
        const tarefa: Tarefa = { ...dados, id: novoId(), criadoEm: t, alteradoEm: t };
        await gravar({ ...banco, tarefas: [...banco.tarefas, tarefa] });
      },

      async editarTarefa(id, mudanca) {
        await gravar({ ...banco, tarefas: editarNaLista(banco.tarefas, id, mudanca, agora()) });
      },

      async alternarTarefa(id) {
        const t = agora();
        await gravar({
          ...banco,
          tarefas: banco.tarefas.map((tarefa) =>
            tarefa.id === id
              ? {
                  ...tarefa,
                  // Desmarcar apaga o instante em vez de guardar um falso:
                  // "concluída" é a existência da marca, não um booleano.
                  concluidaEm: tarefa.concluidaEm ? undefined : t,
                  alteradoEm: t,
                }
              : tarefa,
          ),
        });
      },

      async removerTarefa(id) {
        await gravar({ ...banco, tarefas: banco.tarefas.filter((t) => t.id !== id) });
      },

      async mudarEstadoTarefa(id, estado) {
        const t = agora();
        await gravar({
          ...banco,
          tarefas: banco.tarefas.map((tarefa) =>
            // A regra da transição mora no domínio, testada: o quadro e a
            // caixinha nunca podem discordar sobre o que "feito" significa.
            tarefa.id === id
              ? { ...tarefa, ...aoMoverPara(tarefa, estado, t), alteradoEm: t }
              : tarefa,
          ),
        });
      },

      async criarProjeto(dados) {
        const t = agora();
        const projeto: Projeto = { ...dados, id: novoId(), criadoEm: t, alteradoEm: t };
        await gravar({ ...banco, projetos: [...banco.projetos, projeto] });
      },

      async editarProjeto(id, mudanca) {
        await gravar({ ...banco, projetos: editarNaLista(banco.projetos, id, mudanca, agora()) });
      },

      async arquivarProjeto(id) {
        const t = agora();
        await gravar({
          ...banco,
          projetos: banco.projetos.map((p) =>
            p.id === id ? { ...p, arquivadoEm: t, alteradoEm: t } : p,
          ),
        });
      },

      async removerProjeto(id) {
        // A regra mora no domínio, testada: soltar as tarefas, nunca apagá-las.
        await gravar(soltarEremover(banco, id, agora()));
      },

      async moverTarefa(tarefaId, projetoId) {
        const t = agora();
        await gravar({
          ...banco,
          tarefas: banco.tarefas.map((tarefa) =>
            tarefa.id === tarefaId ? { ...tarefa, projetoId, alteradoEm: t } : tarefa,
          ),
        });
      },

      async criarLancamento(dados) {
        // A validação mora no domínio; a tela já barra antes, mas a porta de
        // entrada do banco não confia na tela.
        validarValor(dados.valor);
        const t = agora();
        const lancamento: Lancamento = { ...dados, id: novoId(), criadoEm: t, alteradoEm: t };
        await gravar({ ...banco, lancamentos: [...banco.lancamentos, lancamento] });
      },

      async definirPreferencias(mudanca) {
        await gravar({ ...banco, preferencias: { ...banco.preferencias, ...mudanca } });
      },

      async editarLancamento(id, mudanca) {
        // A mesma porta da criação: a validação não pode valer só na entrada.
        if (mudanca.valor !== undefined) validarValor(mudanca.valor);
        await gravar({
          ...banco,
          lancamentos: editarNaLista(banco.lancamentos, id, mudanca, agora()),
        });
      },

      async removerLancamento(id) {
        await gravar({ ...banco, lancamentos: banco.lancamentos.filter((l) => l.id !== id) });
      },

      exportar: () => repo.exportar(),

      async importar(json) {
        const novo = await repo.importar(json);
        setBanco(novo);
      },
    };
  }, [banco, carregando, gravar, repo]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useBanco(): Acoes {
  const valor = React.useContext(Contexto);
  if (!valor) throw new Error('useBanco precisa estar dentro de <ProvedorBanco>');
  return valor;
}
