import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/**
 * Guardar senha.
 *
 * `scrypt` do próprio Node, sem dependência nenhuma: é lento e come memória de
 * propósito, que é o que torna caro tentar senha por força bruta. Um `sha256`
 * cru seria instantâneo de quebrar com uma tabela pronta.
 *
 * O formato guardado carrega os parâmetros junto do hash. Sem isso, subir o
 * custo um dia invalidaria toda senha já cadastrada — com eles, o hash antigo
 * continua verificável e a senha é reforçada na próxima entrada.
 */

/** Custo do scrypt. 2^16 é o recomendado atual para uso interativo. */
const CUSTO = 2 ** 16;
const BLOCO = 8;
const PARALELO = 1;
const TAMANHO = 64;

const derivar = (senha: string, sal: Buffer, custo: number, bloco: number, paralelo: number) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(
      senha.normalize('NFKC'),
      sal,
      TAMANHO,
      // `maxmem` precisa acompanhar o custo, senão o Node recusa o trabalho.
      { N: custo, r: bloco, p: paralelo, maxmem: 256 * custo * bloco },
      (erro, chave) => (erro ? reject(erro) : resolve(chave)),
    );
  });

/** `scrypt$N$r$p$sal$hash`, tudo em base64url. */
export async function embaralhar(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await derivar(senha, sal, CUSTO, BLOCO, PARALELO);
  return ['scrypt', CUSTO, BLOCO, PARALELO, sal.toString('base64url'), hash.toString('base64url')].join(
    '$',
  );
}

/**
 * Confere a senha contra o que está guardado.
 *
 * A comparação é em tempo constante: comparar com `===` vaza, pelo tempo de
 * resposta, quantos bytes iniciais bateram.
 */
export async function conferir(senha: string, guardado: string): Promise<boolean> {
  const partes = guardado.split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false;

  const [, custo, bloco, paralelo, sal, hash] = partes;
  try {
    const esperado = Buffer.from(hash, 'base64url');
    const obtido = await derivar(
      senha,
      Buffer.from(sal, 'base64url'),
      Number(custo),
      Number(bloco),
      Number(paralelo),
    );
    return esperado.length === obtido.length && timingSafeEqual(esperado, obtido);
  } catch {
    // Parâmetro estragado no registro não pode derrubar a entrada inteira.
    return false;
  }
}

/** O hash foi feito com custo menor que o de hoje? Então vale refazer. */
export function precisaReforcar(guardado: string): boolean {
  const partes = guardado.split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return true;
  return Number(partes[1]) < CUSTO;
}

/** Um segredo aleatório, para sessão ou para o que mais precisar. */
export const segredo = (bytes = 32): string => randomBytes(bytes).toString('base64url');
