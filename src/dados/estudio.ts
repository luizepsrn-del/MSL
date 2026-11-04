import { falarComInstagram } from './instagram';
import type { Gerado, Pedido, PerfilLido } from '../dominio/estudio';

/**
 * O Estúdio falando com o servidor. Os erros chegam como
 * `ErroDoInstagramNoCliente`, com o `codigo` do servidor (`sem-chave`,
 * `limite-do-dia`, `perfil-nao-profissional`…) e a mensagem pronta para a tela.
 */

/** A geração espera o Claude (até 45 s, duas tentativas) e a leitura dos números. */
const ESPERA_DA_GERACAO_MS = 120_000;

export function lerReferencia(usuario: string): Promise<PerfilLido> {
  return falarComInstagram<PerfilLido>(`/api/instagram-referencia?usuario=${encodeURIComponent(usuario)}`);
}

export function gerarPost(pedido: Pedido): Promise<Gerado> {
  return falarComInstagram<Gerado>('/api/instagram-gerar', pedido, fetch, ESPERA_DA_GERACAO_MS);
}
