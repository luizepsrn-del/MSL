import { falarComInstagram } from './instagram';
import type { PerfilLido } from '../dominio/estudio';

/**
 * O Estúdio falando com o servidor — só para ler perfis de referência na Meta.
 * Os erros chegam como `ErroDoInstagramNoCliente`, com o `codigo` do servidor
 * (`perfil-nao-profissional`, `permissao-faltando`…) e a mensagem pronta.
 */

export function lerReferencia(usuario: string): Promise<PerfilLido> {
  return falarComInstagram<PerfilLido>(`/api/instagram-referencia?usuario=${encodeURIComponent(usuario)}`);
}
