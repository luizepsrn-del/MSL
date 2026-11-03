/**
 * Uma função da Vercel para várias rotas do mesmo provedor.
 *
 * O plano Hobby aceita no máximo 12 funções por implantação, e passar disso
 * recusa o build inteiro. Cada provedor (Google, Instagram) é então uma
 * função só, e o `vercel.json` reescreve os endereços públicos —
 * `/api/google-callback`, `/api/instagram-estado` — para ela. Os endereços
 * não mudam, e é isso que importa: o de volta está registrado no Google e na
 * Meta, e o cliente chama os mesmos caminhos de sempre.
 */

type Metodo = 'GET' | 'POST';
export type TabelaDeRotas = Record<string, Partial<Record<Metodo, (pedido: Request) => Promise<Response>>>>;

/**
 * A rota pedida: o sufixo do caminho público (`/api/google-callback` →
 * `callback`, `/api/instagram` → vazio) ou, se a reescrita entregar o
 * destino, o parâmetro `rota`.
 */
export function qualRota(pedido: Request, prefixo: string): string {
  const url = new URL(pedido.url);
  const doCaminho = url.pathname.match(new RegExp(`^/api/${prefixo}(?:-([a-z-]+))?/?$`));
  if (doCaminho && doCaminho[1]) return doCaminho[1];
  return url.searchParams.get('rota') ?? '';
}

const json = (corpo: unknown, estado: number, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(corpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });

export async function despachar(pedido: Request, prefixo: string, tabela: TabelaDeRotas): Promise<Response> {
  const rota = tabela[qualRota(pedido, prefixo)];
  if (!rota) return json({ erro: 'rota-inexistente' }, 404);
  const tratar = rota[pedido.method as Metodo];
  if (!tratar) return json({ erro: 'metodo' }, 405, { Allow: Object.keys(rota).join(', ') });
  return tratar(pedido);
}
