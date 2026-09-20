import { rotaSessoes } from '../src/servidor/rotas';
import { armazem } from './_armazem';

export const GET = (pedido: Request) => rotaSessoes(pedido, armazem());
export const DELETE = (pedido: Request) => rotaSessoes(pedido, armazem());
