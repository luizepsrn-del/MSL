import { rotaSincronizar } from '../src/servidor/rotas.ts';
import { armazem } from './_armazem.ts';
import { proteger } from './_proteger.ts';

export const POST = proteger((pedido: Request) => rotaSincronizar(pedido, armazem()));
