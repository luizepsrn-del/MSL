import { rotaSair } from '../src/servidor/rotas';
import { armazem } from './_armazem';

export const POST = (pedido: Request) => rotaSair(pedido, armazem());
