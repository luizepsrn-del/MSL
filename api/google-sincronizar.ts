import { rotaGoogleSincronizar } from '../src/servidor/rotasGoogle.ts';
import { armazem, proteger } from '../src/servidor/vercel.ts';

export const POST = proteger((pedido: Request) => rotaGoogleSincronizar(pedido, armazem(), process.env));
