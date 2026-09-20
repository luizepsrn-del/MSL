/**
 * O diagnóstico mais simples possível.
 *
 * Não importa nada de `src/` no topo: se este responder e os outros não, o
 * problema é de importação, não de configuração. Devolve só booleanos — dizer
 * se a variável existe ajuda; dizer o valor dela entregaria a credencial.
 *
 * A importação dinâmica dentro do `try` é o que me deixa ver, de fora, a
 * mensagem exata que derruba as outras funções. Sem ela, a Vercel só diz
 * `FUNCTION_INVOCATION_FAILED`.
 */
export const GET = async () => {
  let importacao: string;
  try {
    const modulo = await import('../src/servidor/rotas.ts');
    importacao = typeof modulo.rotaCadastro === 'function' ? 'ok' : 'sem a função esperada';
  } catch (erro) {
    importacao = erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      redis: !!(process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL),
      redisToken: !!(process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN),
      emailsPermitidos: (process.env.EMAILS_PERMITIDOS ?? '').split(',').filter(Boolean).length,
      node: process.version,
      importacao,
    }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
};
