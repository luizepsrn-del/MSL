import { rotaGoogleConectar } from '../src/servidor/rotasGoogle.ts';
import { armazem, proteger } from '../src/servidor/vercel.ts';

export const POST = proteger((pedido: Request) => rotaGoogleConectar(pedido, armazem(), process.env));
