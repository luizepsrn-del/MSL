import { rotaSincronizar } from '../src/servidor/rotas';
import { armazem } from './_armazem';

export const POST = (pedido: Request) => rotaSincronizar(pedido, armazem());
