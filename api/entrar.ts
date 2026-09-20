import { rotaEntrar } from '../src/servidor/rotas.ts';
import { armazem, proteger } from '../src/servidor/vercel.ts';

export const POST = proteger((pedido: Request) => rotaEntrar(pedido, armazem()));
