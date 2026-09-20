/**
 * O guarda-chuva das funções.
 *
 * Sem ele, qualquer erro vira `FUNCTION_INVOCATION_FAILED` e uma página de
 * texto puro: nem quem usa entende, nem eu consigo diagnosticar de fora.
 *
 * A mensagem só sai inteira quando é uma configuração que falta — as minhas
 * nomeiam variáveis de ambiente, nunca valores. Qualquer outro erro vira uma
 * frase genérica, porque uma mensagem de biblioteca pode carregar endereço
 * interno ou pedaço de credencial.
 */
export const proteger =
  (rota: (pedido: Request) => Promise<Response>) =>
  async (pedido: Request): Promise<Response> => {
    try {
      return await rota(pedido);
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      const deConfiguracao = mensagem.startsWith('faltam as variáveis do Redis');

      return new Response(
        JSON.stringify({
          erro: 'servidor',
          mensagem: deConfiguracao
            ? mensagem
            : 'O servidor falhou. O registro da Vercel tem o detalhe.',
          tipo: erro instanceof Error ? erro.name : 'desconhecido',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }
  };
