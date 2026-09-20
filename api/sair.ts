import { rotaSair } from '../src/servidor/rotas';
import { armazem } from './_armazem';
import { proteger } from './_proteger';

export const POST = proteger((pedido: Request) => rotaSair(pedido, armazem()));
