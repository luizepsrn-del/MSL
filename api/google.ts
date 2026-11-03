import {
  rotaGoogleCallback,
  rotaGoogleConectar,
  rotaGoogleDesconectar,
  rotaGoogleEstado,
  rotaGoogleEvento,
  rotaGoogleSincronizar,
} from '../src/servidor/rotasGoogle.ts';
import { despachar, type TabelaDeRotas } from '../src/servidor/despacho.ts';
import { armazem, proteger } from '../src/servidor/vercel.ts';

/**
 * Todas as rotas do Google numa função só — ver `src/servidor/despacho.ts`.
 * Os endereços públicos continuam `/api/google-<rota>`, pelo `vercel.json`.
 */
const ROTAS: TabelaDeRotas = {
  // GET porque quem chega aqui é o navegador, seguindo o redirecionamento do
  // Google — não um `fetch` do aplicativo.
  callback: { GET: (p) => rotaGoogleCallback(p, armazem(), process.env) },
  conectar: { POST: (p) => rotaGoogleConectar(p, armazem(), process.env) },
  desconectar: { POST: (p) => rotaGoogleDesconectar(p, armazem()) },
  estado: { GET: (p) => rotaGoogleEstado(p, armazem()) },
  evento: { POST: (p) => rotaGoogleEvento(p, armazem(), process.env) },
  sincronizar: { POST: (p) => rotaGoogleSincronizar(p, armazem(), process.env) },
};

const tratar = proteger((pedido: Request) => despachar(pedido, 'google', ROTAS));
export const GET = tratar;
export const POST = tratar;
