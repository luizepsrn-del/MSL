import { rotaEntrar } from '../src/servidor/rotas';
import { armazem } from './_armazem';

export const POST = (pedido: Request) => rotaEntrar(pedido, armazem());
