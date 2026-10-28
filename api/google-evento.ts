import { rotaGoogleEvento } from '../src/servidor/rotasGoogle.ts';
import { armazem, proteger } from '../src/servidor/vercel.ts';

export const POST = proteger((pedido: Request) => rotaGoogleEvento(pedido, armazem(), process.env));
