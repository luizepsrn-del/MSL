import type { Armazem } from './armazem.ts';
import { validarSessao } from './contas.ts';

/**
 * Buscar a agenda externa.
 *
 * Existe porque o navegador não pode: o Google não manda
 * `Access-Control-Allow-Origin` no endereço iCal, então um `fetch` da página
 * falha. A função serve de ponte.
 *
 * **Uma ponte dessas é um pedido de SSRF.** Quem conseguisse mandar qualquer
 * endereço faria o meu servidor bater em qualquer lugar — inclusive na rede
 * interna da Vercel e nos endereços de metadados da nuvem, que costumam
 * entregar credencial para quem pergunta de dentro. Por isso, quatro cercas:
 *
 * 1. **Só com sessão válida.** Sem isso o endereço é um proxy aberto para
 *    qualquer pessoa na internet.
 * 2. **Só `https`, e só para os domínios da lista.** É a cerca que importa:
 *    com ela, nenhum endereço interno é alcançável, por mais criativo que
 *    seja o que chega no corpo.
 * 3. **O destino final também é conferido.** Um redirecionamento é a porta
 *    dos fundos: conferir só o endereço pedido deixaria `calendar.google.com`
 *    mandar a busca para outro lugar.
 * 4. **Teto de bytes e de tempo.** Um endereço que responde para sempre
 *    prenderia a função até o limite da plataforma.
 */

/**
 * Os domínios de onde eu busco agenda.
 *
 * Curta de propósito. Acrescentar um é mudança de código, revisada — e não
 * algo que se configure em produção por engano.
 */
export const DOMINIOS_DE_AGENDA = [
  'calendar.google.com',
  'outlook.office365.com',
  'outlook.live.com',
] as const;

/** Quatro megabytes de texto é uma agenda de muitos anos. */
export const TETO_DE_BYTES = 4 * 1024 * 1024;

/** Dez segundos: acima disso, a função morreria na plataforma de qualquer jeito. */
export const SEGUNDOS_DE_ESPERA = 10;

export type RecusaDaAgenda = 'endereco-invalido' | 'dominio-nao-permitido' | 'grande-demais';

/**
 * O endereço serve?
 *
 * Devolve a `URL` normalizada, ou o motivo da recusa. Separada da busca para
 * poder ser provada sozinha, inclusive nos casos torcidos —
 * `https://calendar.google.com@meu-servidor.com` é um endereço cujo *host* é
 * `meu-servidor.com`, e é assim que essa cerca costuma ser pulada.
 */
export function conferirEndereco(bruto: string): { url: URL } | { recusa: RecusaDaAgenda } {
  let url: URL;
  try {
    url = new URL(bruto.trim());
  } catch {
    return { recusa: 'endereco-invalido' };
  }

  if (url.protocol !== 'https:') return { recusa: 'endereco-invalido' };

  // `hostname`, e não `host`: `host` carrega a porta, e comparar com ela
  // deixaria `calendar.google.com:8080` de fora sem motivo.
  const permitido = (DOMINIOS_DE_AGENDA as readonly string[]).includes(url.hostname.toLowerCase());
  return permitido ? { url } : { recusa: 'dominio-nao-permitido' };
}

const json = (corpo: unknown, estado = 200): Response =>
  new Response(JSON.stringify(corpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

const MENSAGENS: Record<RecusaDaAgenda, string> = {
  'endereco-invalido': 'Esse endereço não parece um endereço https.',
  'dominio-nao-permitido':
    'Só busco agenda do Google e do Outlook. Confira se você copiou o endereço secreto no formato iCal.',
  'grande-demais': 'Essa agenda é grande demais para eu buscar.',
};

/**
 * Lê o corpo com teto de bytes.
 *
 * `resposta.text()` leria tudo antes de eu poder reclamar. Aqui o fluxo é
 * cortado assim que passa do teto, e a memória da função não vai junto.
 */
async function lerComTeto(resposta: Response, teto: number): Promise<string | null> {
  const declarado = Number(resposta.headers.get('content-length') ?? '0');
  if (declarado > teto) return null;

  const corpo = resposta.body;
  if (!corpo) return null;

  const leitor = corpo.getReader();
  const pedacos: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > teto) {
      await leitor.cancel();
      return null;
    }
    pedacos.push(value);
  }

  const tudo = new Uint8Array(total);
  let posicao = 0;
  for (const pedaco of pedacos) {
    tudo.set(pedaco, posicao);
    posicao += pedaco.byteLength;
  }
  return new TextDecoder('utf-8').decode(tudo);
}

export async function rotaAgenda(
  pedido: Request,
  armazem: Armazem,
  /** injetável para o teste não precisar de rede */
  buscar: typeof fetch = fetch,
  agora = new Date(),
): Promise<Response> {
  if (pedido.method !== 'POST') return json({ erro: 'metodo' }, 405);

  const cabecalho = pedido.headers.get('Authorization') ?? '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : undefined;
  const sessao = await validarSessao(armazem, token);
  if (!sessao.ok) {
    return json({ erro: 'sessao-invalida', mensagem: 'Sua sessão terminou. Entre de novo.' }, 401);
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = (await pedido.json()) as Record<string, unknown>;
  } catch {
    corpo = {};
  }

  const conferido = conferirEndereco(typeof corpo.url === 'string' ? corpo.url : '');
  if ('recusa' in conferido) {
    return json(
      { erro: conferido.recusa, mensagem: MENSAGENS[conferido.recusa] },
      conferido.recusa === 'dominio-nao-permitido' ? 403 : 400,
    );
  }

  let resposta: Response;
  try {
    resposta = await buscar(conferido.url.toString(), {
      headers: { Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.1' },
      signal: AbortSignal.timeout(SEGUNDOS_DE_ESPERA * 1000),
    });
  } catch {
    return json(
      { erro: 'sem-resposta', mensagem: 'Não consegui falar com o servidor da agenda.' },
      502,
    );
  }

  // O destino final, depois dos redirecionamentos. Sem esta conferência, um
  // domínio da lista poderia mandar a busca para qualquer lugar.
  const chegou = conferirEndereco(resposta.url || conferido.url.toString());
  if ('recusa' in chegou) {
    return json(
      { erro: 'redirecionou-para-fora', mensagem: 'A agenda redirecionou para fora dos domínios que eu busco.' },
      403,
    );
  }

  if (!resposta.ok) {
    return json(
      {
        erro: 'recusada',
        // 404 no endereço secreto quase sempre é endereço regenerado no Google.
        mensagem:
          resposta.status === 404
            ? 'A agenda não existe nesse endereço. Se você recriou o endereço secreto no Google, cole o novo.'
            : `O servidor da agenda respondeu ${resposta.status}.`,
      },
      502,
    );
  }

  const texto = await lerComTeto(resposta, TETO_DE_BYTES);
  if (texto === null) {
    return json({ erro: 'grande-demais', mensagem: MENSAGENS['grande-demais'] }, 413);
  }

  // Devolvo o texto cru, e quem lê é o domínio, no cliente. O servidor fica
  // burro de propósito: toda a interpretação do iCal já está provada em
  // Vitest, e duplicá-la aqui criaria duas leituras que divergem.
  return json({ texto, buscadoEm: agora.toISOString() });
}
