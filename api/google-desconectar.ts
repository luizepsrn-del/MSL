import { rotaGoogleDesconectar } from '../src/servidor/rotasGoogle.ts';
import { armazem, proteger } from '../src/servidor/vercel.ts';

export const POST = proteger((pedido: Request) => rotaGoogleDesconectar(pedido, armazem()));
