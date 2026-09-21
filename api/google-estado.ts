import { rotaGoogleEstado } from '../src/servidor/rotasGoogle.ts';
import { armazem, proteger } from '../src/servidor/vercel.ts';

export const GET = proteger((pedido: Request) => rotaGoogleEstado(pedido, armazem()));
