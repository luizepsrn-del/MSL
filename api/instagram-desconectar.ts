import { rotaInstagramDesconectar } from '../src/servidor/rotasInstagram.ts';
import { armazem, proteger } from '../src/servidor/vercel.ts';

export const POST = proteger((pedido: Request) => rotaInstagramDesconectar(pedido, armazem()));
