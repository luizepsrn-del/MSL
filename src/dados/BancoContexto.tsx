import React from 'react';
import {
  bancoVazio,
  novoId,
  diaLocal,
  removerRegistro,
  type Banco,
  type Rotina,
  type Execucao,
  type Tarefa,
  type Projeto,
  type Lancamento,
  type Meta,
  type Marco,
  type EstadoTarefa,
  type Preferencias,
} from './esquema';
import { RepositorioLocal, type Repositorio } from './repositorio';
import { removerProjeto as soltarEremover } from '../dominio/projeto';
import { aoMoverPara } from '../dominio/tarefa';
import { editarNaLista, type Edicao } from '../dominio/edicao';
import {
  ClienteSincronia,
  ErroDaSincronia,
  nomeDoAparelho,
  type Conta,
  type SessaoDeAparelho,
} from './sincronia';
import { validarValor } from '../dominio/financeiro';
import { validarMeta } from '../dominio/meta';

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
  criarMeta(dados: Omit<Meta, keyof BaseRegistro>): Promise<void>;
  editarMeta(id: string, mudanca: Edicao<Meta>): Promise<void>;
  arquivarMeta(id: string): Promise<void>;
  removerMeta(id: string): Promise<void>;
  /**
   * Anota um avanço num dia. Só vale para meta de fonte manual — as outras já
   * leem o dado de onde ele mora, e marcar à mão contaria duas vezes.
   */
  marcarMeta(metaId: string, dia: string, quanto: number): Promise<void>;
  /** desfaz o último avanço marcado naquele dia */
  desmarcarMeta(metaId: string, dia: string): Promise<void>;
  /** grava o que eu escolhi sobre a interface; viaja no backup */
  definirPreferencias(mudanca: Partial<Preferencias>): Promise<void>;
  exportar(): Promise<string>;
  importar(json: string): Promise<void>;

  /* ── Sincronização ────────────────────────────────────────────────────── */

  conta: Conta | null;
  sincronizando: boolean;
  ultimaSincronia: string | null;
  erroDeSincronia: string | null;
  cadastrar(email: string, senha: string): Promise<void>;
  entrarNaConta(email: string, senha: string): Promise<void>;
  sairDaConta(): Promise<void>;
  sincronizarAgora(): Promise<void>;
  listarAparelhos(): Promise<SessaoDeAparelho[]>;
  revogarAparelho(token: string): Promise<void>;
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

  const cliente = React.useMemo(
    () =>
      new ClienteSincronia(
        window.localStorage,
        fetch.bind(window),
        nomeDoAparelho(navigator.userAgent),
      ),
    [],
  );
  const [conta, setConta] = React.useState<Conta | null>(() => cliente.conta);
  const [sincronizando, setSincronizando] = React.useState(false);
  const [ultimaSincronia, setUltimaSincronia] = React.useState<string | null>(() => cliente.ultimaEm);
  const [erroDeSincronia, setErroDeSincronia] = React.useState<string | null>(null);

  // O banco mais recente, para a sincronização adiada não mandar um retrato
  // velho quando finalmente disparar.
  const bancoAgora = React.useRef(banco);
  bancoAgora.current = banco;

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

  /**
   * Sincroniza o que estiver no aparelho agora.
   *
   * Uma de cada vez: duas chamadas ao mesmo tempo disputariam a gravação
   * condicional do servidor e uma levaria 409 à toa.
   */
  const emVoo = React.useRef(false);
  const sincronizar = React.useCallback(
    async (silencioso: boolean) => {
      if (!cliente.token || emVoo.current) return;
      emVoo.current = true;
      if (!silencioso) setSincronizando(true);
      try {
        const junto = await cliente.sincronizar(bancoAgora.current);
        if (junto) {
          setBanco(junto);
          await repo.salvar(junto);
          setUltimaSincronia(cliente.ultimaEm);
          setErroDeSincronia(null);
        }
      } catch (erro) {
        const problema = erro instanceof ErroDaSincronia ? erro : null;
        if (problema?.sessaoMorreu) setConta(null);
        // Falha automática não interrompe o uso: o dado continua aqui, e a
        // mensagem espera na tela de Ajustes.
        setErroDeSincronia(problema?.message ?? 'Não deu para sincronizar.');
      } finally {
        emVoo.current = false;
        setSincronizando(false);
      }
    },
    [cliente, repo],
  );

  /** Espera a poeira baixar antes de mandar: digitar não vira dez chamadas. */
  const agendada = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const agendarSincronia = React.useCallback(() => {
    if (!cliente.token) return;
    if (agendada.current) clearTimeout(agendada.current);
    agendada.current = setTimeout(() => void sincronizar(true), 3000);
  }, [cliente, sincronizar]);

  const gravar = React.useCallback(
    async (proximo: Banco) => {
      setBanco(proximo);
      await repo.salvar(proximo);
      agendarSincronia();
    },
    [repo, agendarSincronia],
  );

  // Ao abrir, e ao voltar a ter rede. Voltar do metrô é exatamente quando há
  // mais coisa esperando para subir.
  React.useEffect(() => {
    if (carregando) return;
    void sincronizar(true);

    const aoVoltarARede = () => void sincronizar(true);
    window.addEventListener('online', aoVoltarARede);
    return () => window.removeEventListener('online', aoVoltarARede);
  }, [carregando, sincronizar]);

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
          // Desmarcar apaga a execução, e apagar precisa deixar lápide: sem
          // ela o outro aparelho remarcaria o dia na próxima junção.
          const { lista, removidos } = removerRegistro(
            banco,
            'execucoes',
            banco.execucoes,
            existente.id,
            agora(),
          );
          await gravar({ ...banco, execucoes: lista, removidos });
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
        const { lista, removidos } = removerRegistro(banco, 'tarefas', banco.tarefas, id, agora());
        await gravar({ ...banco, tarefas: lista, removidos });
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
        const { lista, removidos } = removerRegistro(
          banco,
          'lancamentos',
          banco.lancamentos,
          id,
          agora(),
        );
        await gravar({ ...banco, lancamentos: lista, removidos });
      },

      async criarMeta(dados) {
        // A mesma porta da edição: a tela já barra antes, mas a entrada do
        // banco não confia na tela.
        validarMeta(dados);
        const t = agora();
        const meta: Meta = { ...dados, id: novoId(), criadoEm: t, alteradoEm: t };
        await gravar({ ...banco, metas: [...banco.metas, meta] });
      },

      async editarMeta(id, mudanca) {
        const atual = banco.metas.find((m) => m.id === id);
        if (atual) validarMeta({ ...atual, ...mudanca } as Meta);
        await gravar({ ...banco, metas: editarNaLista(banco.metas, id, mudanca, agora()) });
      },

      async arquivarMeta(id) {
        const t = agora();
        await gravar({
          ...banco,
          metas: banco.metas.map((m) => (m.id === id ? { ...m, arquivada: true, alteradoEm: t } : m)),
        });
      },

      async removerMeta(id) {
        // Os marcos vão junto: sem a meta eles não significam nada, e ficariam
        // no banco para sempre sem ninguém para lê-los.
        const t = agora();
        let atual = banco;
        for (const marco of banco.marcos.filter((m) => m.metaId === id)) {
          const { lista, removidos } = removerRegistro(atual, 'marcos', atual.marcos, marco.id, t);
          atual = { ...atual, marcos: lista, removidos };
        }
        const { lista, removidos } = removerRegistro(atual, 'metas', atual.metas, id, t);
        await gravar({ ...atual, metas: lista, removidos });
      },

      async marcarMeta(metaId, dia, quanto) {
        if (quanto <= 0) return;
        const t = agora();
        const marco: Marco = { id: novoId(), criadoEm: t, alteradoEm: t, metaId, dia, quanto };
        await gravar({ ...banco, marcos: [...banco.marcos, marco] });
      },

      async desmarcarMeta(metaId, dia) {
        // O último daquele dia, e não todos: marquei três vezes e quero tirar
        // uma. Apagar precisa deixar lápide, ou o outro aparelho remarca.
        const doDia = banco.marcos.filter((m) => m.metaId === metaId && m.dia === dia);
        const ultimo = doDia[doDia.length - 1];
        if (!ultimo) return;
        const { lista, removidos } = removerRegistro(banco, 'marcos', banco.marcos, ultimo.id, agora());
        await gravar({ ...banco, marcos: lista, removidos });
      },

      exportar: () => repo.exportar(),

      async importar(json) {
        const novo = await repo.importar(json);
        setBanco(novo);
        agendarSincronia();
      },

      /* ── Sincronização ──────────────────────────────────────────────── */

      conta,
      sincronizando,
      ultimaSincronia,
      erroDeSincronia,

      async cadastrar(email, senha) {
        setConta(await cliente.cadastrar(email, senha));
        setErroDeSincronia(null);
        await sincronizar(false);
      },

      async entrarNaConta(email, senha) {
        setConta(await cliente.entrar(email, senha));
        setErroDeSincronia(null);
        await sincronizar(false);
      },

      async sairDaConta() {
        await cliente.sair();
        setConta(null);
        setUltimaSincronia(null);
        setErroDeSincronia(null);
      },

      async sincronizarAgora() {
        await sincronizar(false);
      },

      listarAparelhos: () => cliente.sessoes(),
      revogarAparelho: (token) => cliente.revogar(token),
    };
  }, [banco, carregando, gravar, repo]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useBanco(): Acoes {
  const valor = React.useContext(Contexto);
  if (!valor) throw new Error('useBanco precisa estar dentro de <ProvedorBanco>');
  return valor;
}
