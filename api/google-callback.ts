import { rotaGoogleCallback } from '../src/servidor/rotasGoogle.ts';
import { armazem, proteger } from '../src/servidor/vercel.ts';

// GET porque quem chega aqui é o navegador, seguindo o redirecionamento do
// Google — não um `fetch` do aplicativo.
export const GET = proteger((pedido: Request) =>
  rotaGoogleCallback(pedido, armazem(), process.env),
);
