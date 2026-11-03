/**
 * A página que fecha o ciclo de uma conexão (Google ou Instagram).
 *
 * Mora num arquivo próprio porque os dois provedores voltam para o MSL do
 * mesmo jeito: o navegador segue um redirecionamento, e uma tela de JSON cru
 * seria o fim da jornada para quem está olhando.
 */

export function paginaDeVolta(deuCerto: boolean, titulo: string, mensagem: string): Response {
  const escapar = (t: string) =>
    t.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

  return new Response(
    `<!doctype html>
<html lang="pt-BR">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)}</title>
<style>
  body { margin:0; min-height:100dvh; display:grid; place-items:center; padding:24px;
    font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    background:#08060F; color:#EDEAF5; }
  main { max-width:26rem; text-align:center; }
  h1 { font-size:1.4rem; margin:0 0 .5rem; }
  p { color:#A79FC0; margin:0 0 1.5rem; }
  a { display:inline-block; padding:12px 20px; border-radius:12px; text-decoration:none;
    background:#682EC7; color:#fff; font-weight:600; }
</style>
<main>
  <h1>${deuCerto ? 'Pronto' : 'Não deu'}</h1>
  <p>${escapar(mensagem)}</p>
  <a href="/app/ajustes">Voltar ao My System Life</a>
</main>
</html>`,
    {
      status: deuCerto ? 200 : 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    },
  );
}

