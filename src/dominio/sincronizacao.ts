import {
  COLECOES,
  bancoVazio,
  type Banco,
  type NomeColecao,
  type Registro,
  type Removido,
} from '../dados/esquema.ts';

/**
 * Juntar o que dois aparelhos fizeram.
 *
 * A regra é uma só, e vale registro a registro: **vence quem foi alterado por
 * último**. Nunca "o banco inteiro mais novo vence" — com essa regra eu
 * marcaria três tarefas no metrô e o Mac apagaria as três ao sincronizar
 * depois, sem dizer nada.
 *
 * Por isso `alteradoEm` precisa ser verdade em todo registro. Ele existia no
 * esquema desde o começo e só passou a ser escrito de verdade quando a edição
 * chegou; antes disso, uma junção teria dado empate em tudo.
 *
 * A junção é **comutativa e idempotente**: juntar A com B dá o mesmo que
 * juntar B com A, e juntar duas vezes dá o mesmo que juntar uma. Sem isso, a
 * ordem em que os aparelhos sincronizam mudaria o resultado, e o mesmo dado
 * daria bancos diferentes em cada lado.
 */

/** A lápide mais recente de cada registro, por coleção. */
function lapides(bancos: Banco[]): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const banco of bancos) {
    for (const { colecao, id, em } of banco.removidos ?? []) {
      const chave = `${colecao}:${id}`;
      const atual = mapa.get(chave);
      if (!atual || em > atual) mapa.set(chave, em);
    }
  }
  return mapa;
}

/** Une as lápides dos dois lados, ficando com a data mais recente de cada. */
function juntarLapides(a: Banco, b: Banco): Removido[] {
  const mapa = new Map<string, Removido>();
  for (const lapide of [...(a.removidos ?? []), ...(b.removidos ?? [])]) {
    const chave = `${lapide.colecao}:${lapide.id}`;
    const atual = mapa.get(chave);
    if (!atual || lapide.em > atual.em) mapa.set(chave, lapide);
  }
  return [...mapa.values()].sort((x, y) => (x.em < y.em ? -1 : x.em > y.em ? 1 : 0));
}

function juntarColecao<T extends Registro>(
  colecao: NomeColecao,
  daqui: readonly T[],
  dali: readonly T[],
  mortos: Map<string, string>,
): T[] {
  const mapa = new Map<string, T>();

  for (const registro of [...daqui, ...dali]) {
    const atual = mapa.get(registro.id);
    // Empate em `alteradoEm` fica com quem já estava: a junção precisa dar o
    // mesmo resultado nas duas ordens, e sem critério estável não daria.
    if (!atual || registro.alteradoEm > atual.alteradoEm) mapa.set(registro.id, registro);
  }

  return (
    [...mapa.values()]
      .filter((registro) => {
        const morteEm = mortos.get(`${colecao}:${registro.id}`);
        // A lápide só vence se a remoção veio **depois** da última alteração:
        // apagar no telefone e editar no Mac depois quer dizer que eu mudei de
        // ideia, e o registro fica.
        return !morteEm || registro.alteradoEm > morteEm;
      })
      // Ordem fixa por criação, e o id como desempate.
      //
      // Sem isto a junção escolhe os mesmos registros mas os devolve em ordem
      // diferente conforme quem vem primeiro — e os dois aparelhos guardariam
      // documentos diferentes com o mesmo conteúdo, brigando para sempre sobre
      // qual é o mais novo.
      .sort((x, y) =>
        x.criadoEm !== y.criadoEm
          ? x.criadoEm < y.criadoEm
            ? -1
            : 1
          : x.id < y.id
            ? -1
            : x.id > y.id
              ? 1
              : 0,
      )
  );
}

/**
 * Junta dois bancos num só.
 *
 * As preferências não se misturam registro a registro — são um objeto só, e
 * fica a do banco que tem o backup mais recente; na falta disso, a de `a`.
 */
export function juntar(a: Banco, b: Banco): Banco {
  const mortos = lapides([a, b]);
  const junto = { ...bancoVazio(), versao: Math.max(a.versao, b.versao) } as Banco;

  for (const colecao of COLECOES) {
    const daqui = (a as unknown as Record<string, Registro[]>)[colecao] ?? [];
    const dali = (b as unknown as Record<string, Registro[]>)[colecao] ?? [];
    (junto as unknown as Record<string, Registro[]>)[colecao] = juntarColecao(
      colecao,
      daqui,
      dali,
      mortos,
    );
  }

  junto.removidos = juntarLapides(a, b);
  junto.preferencias = preferenciasMaisNovas(a, b);
  return junto;
}

function preferenciasMaisNovas(a: Banco, b: Banco): Banco['preferencias'] {
  const backupA = a.preferencias?.ultimoBackupEm;
  const backupB = b.preferencias?.ultimoBackupEm;
  if (backupA && backupB) return backupA >= backupB ? a.preferencias : b.preferencias;
  return a.preferencias ?? b.preferencias;
}

/**
 * Lápide velha não serve para nada.
 *
 * Ela existe para impedir que um aparelho atrasado ressuscite um registro. Se
 * nenhum aparelho ficou atrasado tanto tempo, a lápide só ocupa espaço — e a
 * lista cresceria para sempre.
 */
export function podarLapides(banco: Banco, agora: string, dias = 90): Banco {
  const limite = new Date(new Date(agora).getTime() - dias * 86_400_000).toISOString();
  const removidos = (banco.removidos ?? []).filter((r) => r.em >= limite);
  return { ...banco, removidos };
}
