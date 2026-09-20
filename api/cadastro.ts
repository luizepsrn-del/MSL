import { rotaCadastro } from '../src/servidor/rotas.ts';
import { armazem, proteger } from '../src/servidor/vercel.ts';

/**
 * Exportação por método, e não `export default`.
 *
 * É a forma que a Vercel reconhece sem ambiguidade como manipulador Web. Com
 * `export default` ela pode entregar os objetos do Node em vez de um
 * `Request`, e aí `pedido.headers.get` não existe e o `Response` devolvido é
 * ignorado — a função fica pendurada sem dizer por quê.
 */
export const POST = proteger((pedido: Request) => rotaCadastro(pedido, armazem(), process.env));
