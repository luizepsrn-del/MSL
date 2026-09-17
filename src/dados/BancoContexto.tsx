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
} from './esquema';
import { RepositorioLocal, type Repositorio } from './repositorio';
import { removerProjeto as soltarEremover } from '../dominio/projeto';

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
  arquivarRotina(id: string): Promise<void>;
  alternarExecucao(rotinaId: string, dia: string): Promise<void>;
  criarTarefa(dados: Omit<Tarefa, keyof BaseRegistro>): Promise<void>;
  alternarTarefa(id: string): Promise<void>;
  removerTarefa(id: string): Promise<void>;
  criarProjeto(dados: Omit<Projeto, keyof BaseRegistro>): Promise<void>;
  arquivarProjeto(id: string): Promise<void>;
  /** solta as tarefas do projeto; não as apaga */
  removerProjeto(id: string): Promise<void>;
  moverTarefa(tarefaId: string, projetoId: string | undefined): Promise<void>;
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

      async criarProjeto(dados) {
        const t = agora();
        const projeto: Projeto = { ...dados, id: novoId(), criadoEm: t, alteradoEm: t };
        await gravar({ ...banco, projetos: [...banco.projetos, projeto] });
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
