import type { Registro } from '../dados/esquema';

/**
 * Corrigir o que já existe.
 *
 * Até aqui o sistema só sabia criar e apagar: errei o prazo, apagava e
 * refazia — e no caso da tarefa concluída isso levava junto a data em que eu
 * a concluí. Apagar para corrigir é destruir história por causa de um
 * digitação.
 *
 * O que uma edição **não** pode fazer é o assunto deste arquivo. Ela nunca
 * inventa um campo que ninguém mandou, nunca mexe em `id` nem em `criadoEm`, e
 * sempre marca `alteradoEm` — que existia no esquema desde o primeiro dia sem
 * ninguém escrever nele.
 */

/** Os campos que uma edição pode tocar: tudo menos a identidade do registro. */
export type Edicao<T extends Registro> = Partial<Omit<T, 'id' | 'criadoEm' | 'alteradoEm'>>;

/**
 * Aplica uma correção, devolvendo um registro novo.
 *
 * Campo ausente da mudança fica como estava. Campo presente com `undefined` é
 * **apagado** de propósito: é assim que se tira o prazo de uma tarefa que
 * deixou de ter data, e distinguir os dois casos é a razão de a mudança ser
 * um objeto parcial e não um registro inteiro.
 */
export function aplicarEdicao<T extends Registro>(registro: T, mudanca: Edicao<T>, agora: string): T {
  const corrigido = { ...registro } as T;

  for (const [campo, valor] of Object.entries(mudanca)) {
    if (campo === 'id' || campo === 'criadoEm' || campo === 'alteradoEm') continue;
    if (valor === undefined) {
      delete (corrigido as Record<string, unknown>)[campo];
    } else {
      (corrigido as Record<string, unknown>)[campo] = valor;
    }
  }

  return { ...corrigido, id: registro.id, criadoEm: registro.criadoEm, alteradoEm: agora };
}

/** Aplica a correção ao registro de um id, deixando os outros intactos. */
export function editarNaLista<T extends Registro>(
  lista: readonly T[],
  id: string,
  mudanca: Edicao<T>,
  agora: string,
): T[] {
  return lista.map((registro) =>
    registro.id === id ? aplicarEdicao(registro, mudanca, agora) : registro,
  );
}
