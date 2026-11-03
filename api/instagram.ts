import {
  rotaInstagram,
  rotaInstagramCallback,
  rotaInstagramConectar,
  rotaInstagramConta,
  rotaInstagramDesconectar,
  rotaInstagramEstado,
} from '../src/servidor/rotasInstagram.ts';
import { despachar, type TabelaDeRotas } from '../src/servidor/despacho.ts';
import { armazem, proteger } from '../src/servidor/vercel.ts';

/**
 * Todas as rotas do Instagram numa função só — ver `src/servidor/despacho.ts`.
 * Os endereços públicos continuam `/api/instagram` e `/api/instagram-<rota>`,
 * pelo `vercel.json`.
 */
const ROTAS: TabelaDeRotas = {
  '': { GET: (p) => rotaInstagram(p, armazem()) },
  // GET porque quem chega aqui é o navegador, seguindo o redirecionamento da Meta.
  callback: { GET: (p) => rotaInstagramCallback(p, armazem(), process.env) },
  conectar: { POST: (p) => rotaInstagramConectar(p, armazem(), process.env) },
  conta: { POST: (p) => rotaInstagramConta(p, armazem()) },
  desconectar: { POST: (p) => rotaInstagramDesconectar(p, armazem()) },
  estado: { GET: (p) => rotaInstagramEstado(p, armazem()) },
};

const tratar = proteger((pedido: Request) => despachar(pedido, 'instagram', ROTAS));
export const GET = tratar;
export const POST = tratar;
