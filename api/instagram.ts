import { rotaInstagram } from '../src/servidor/rotasInstagram.ts';
import { armazem, proteger } from '../src/servidor/vercel.ts';

export const GET = proteger((pedido: Request) => rotaInstagram(pedido, armazem()));
