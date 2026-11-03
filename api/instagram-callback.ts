import { rotaInstagramCallback } from '../src/servidor/rotasInstagram.ts';
import { armazem, proteger } from '../src/servidor/vercel.ts';

// GET porque quem chega aqui é o navegador, seguindo o redirecionamento da
// Meta — não um `fetch` do aplicativo.
export const GET = proteger((pedido: Request) =>
  rotaInstagramCallback(pedido, armazem(), process.env),
);
