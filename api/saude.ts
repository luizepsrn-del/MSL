/**
 * O diagnóstico mais simples possível.
 *
 * Não importa nada de `src/`: se este responder e os outros não, o problema é
 * de importação, não de configuração. Devolve só booleanos — dizer se a
 * variável existe ajuda; dizer o valor dela entregaria a credencial.
 */
export const GET = () =>
  new Response(
    JSON.stringify({
      ok: true,
      redis: !!(process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL),
      redisToken: !!(process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN),
      emailsPermitidos: (process.env.EMAILS_PERMITIDOS ?? '').split(',').filter(Boolean).length,
      node: process.version,
    }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
