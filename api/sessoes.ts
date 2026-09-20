import { rotaSessoes } from '../src/servidor/rotas';
import { armazem } from './_armazem';
import { proteger } from './_proteger';

export const GET = proteger((pedido: Request) => rotaSessoes(pedido, armazem()));
export const DELETE = proteger((pedido: Request) => rotaSessoes(pedido, armazem()));
