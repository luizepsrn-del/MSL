import { rotaAgenda } from '../src/servidor/agenda.ts';
import { armazem, proteger } from '../src/servidor/vercel.ts';

export const POST = proteger((pedido: Request) => rotaAgenda(pedido, armazem()));
