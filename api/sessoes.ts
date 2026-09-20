import { rotaSessoes } from '../src/servidor/rotas.ts';
import { armazem } from './_armazem.ts';
import { proteger } from './_proteger.ts';

export const GET = proteger((pedido: Request) => rotaSessoes(pedido, armazem()));
export const DELETE = proteger((pedido: Request) => rotaSessoes(pedido, armazem()));
