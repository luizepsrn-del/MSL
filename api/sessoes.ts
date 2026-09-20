import { rotaSessoes } from '../src/servidor/rotas.ts';
import { armazem, proteger } from '../src/servidor/vercel.ts';

export const GET = proteger((pedido: Request) => rotaSessoes(pedido, armazem()));
export const DELETE = proteger((pedido: Request) => rotaSessoes(pedido, armazem()));
