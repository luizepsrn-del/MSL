import type { Armazem } from './armazem';
import {
  cadastrar,
  entrar,
  sair,
  validarSessao,
  listarSessoes,
  revogar,
  chaveBanco,
  type Falha,
} from './contas';
import { migrar } from '../dados/migracoes';
import { juntar, podarLapides } from '../dominio/sincronizacao';
import { bancoVazio } from '../dados/esquema';

/**
 * As rotas, como funções puras de `Request` para `Response`.
 *
 * Os arquivos em `api/` são adaptadores de três linhas: montam o armazém a
 * partir do ambiente e chamam daqui. Assim a lógica inteira — cabeçalho,
 * código de estado, corpo, junção — é testável em Vitest com um `new Request`,
 * sem subir nada.
 */

const json = (corpo: unknown, estado = 200): Response =>
  new Response(JSON.stringify(corpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

/**
 * Cada falha tem o seu código, e a mensagem é a que o usuário lê.
 *
 * `credencial-invalida` responde 401 sem dizer se foi o e-mail ou a senha: a
 * diferença diria a quem tenta quais e-mails têm conta aqui.
 */
const RESPOSTAS: Record<Falha, { estado: number; mensagem: string }> = {
  'email-invalido': { estado: 400, mensagem: 'Esse e-mail não parece um e-mail.' },
  'email-nao-permitido': {
    estado: 403,
    mensagem: 'Este endereço não aceita cadastro deste e-mail.',
  },
  'senha-curta': { estado: 400, mensagem: 'A senha precisa de pelo menos 10 caracteres.' },
  'ja-existe': { estado: 409, mensagem: 'Já existe uma conta com esse e-mail.' },
  'credencial-invalida': { estado: 401, mensagem: 'E-mail ou senha não conferem.' },
  esfriando: {
    estado: 429,
    mensagem: 'Muitas tentativas. Espere quinze minutos e tente de novo.',
  },
  'sessao-invalida': { estado: 401, mensagem: 'Sua sessão terminou. Entre de novo.' },
};

const falhar = (falha: Falha): Response => {
  const { estado, mensagem } = RESPOSTAS[falha];
  return json({ erro: falha, mensagem }, estado);
};

/** O token vem no cabeçalho, nunca no endereço: endereço vai parar em registro. */
function tokenDe(pedido: Request): string | undefined {
  const cabecalho = pedido.headers.get('Authorization') ?? '';
  return cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : undefined;
}

async function corpoDe(pedido: Request): Promise<Record<string, unknown>> {
  try {
    const corpo = await pedido.json();
    return typeof corpo === 'object' && corpo !== null ? (corpo as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor : '');

/* ── Conta ───────────────────────────────────────────────────────────────── */

export async function rotaCadastro(
  pedido: Request,
  armazem: Armazem,
  ambiente: Record<string, string | undefined>,
): Promise<Response> {
  if (pedido.method !== 'POST') return json({ erro: 'metodo' }, 405);
  const corpo = await corpoDe(pedido);

  const resultado = await cadastrar(
    armazem,
    {
      email: texto(corpo.email),
      senha: texto(corpo.senha),
      aparelho: texto(corpo.aparelho) || undefined,
    },
    ambiente,
  );
  return resultado.ok ? json(resultado.valor, 201) : falhar(resultado.falha);
}

export async function rotaEntrar(pedido: Request, armazem: Armazem): Promise<Response> {
  if (pedido.method !== 'POST') return json({ erro: 'metodo' }, 405);
  const corpo = await corpoDe(pedido);

  const resultado = await entrar(armazem, {
    email: texto(corpo.email),
    senha: texto(corpo.senha),
    aparelho: texto(corpo.aparelho) || undefined,
  });
  return resultado.ok ? json(resultado.valor) : falhar(resultado.falha);
}

export async function rotaSair(pedido: Request, armazem: Armazem): Promise<Response> {
  if (pedido.method !== 'POST') return json({ erro: 'metodo' }, 405);
  const token = tokenDe(pedido);
  if (token) await sair(armazem, token);
  // Sempre 204: sair de uma sessão que já não existe não é erro nenhum.
  return new Response(null, { status: 204 });
}

export async function rotaSessoes(pedido: Request, armazem: Armazem): Promise<Response> {
  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return falhar(sessao.falha);

  if (pedido.method === 'GET') {
    return json({ sessoes: await listarSessoes(armazem, sessao.valor.usuarioId, sessao.valor.token) });
  }

  if (pedido.method === 'DELETE') {
    const corpo = await corpoDe(pedido);
    const resultado = await revogar(armazem, sessao.valor.usuarioId, texto(corpo.token));
    return resultado.ok ? new Response(null, { status: 204 }) : falhar(resultado.falha);
  }

  return json({ erro: 'metodo' }, 405);
}

/* ── Sincronizar ─────────────────────────────────────────────────────────── */

/** Quantas vezes tentar gravar quando o outro aparelho passa na frente. */
const TENTATIVAS = 3;

export async function rotaSincronizar(
  pedido: Request,
  armazem: Armazem,
  agora = new Date(),
): Promise<Response> {
  if (pedido.method !== 'POST') return json({ erro: 'metodo' }, 405);

  const sessao = await validarSessao(armazem, tokenDe(pedido));
  if (!sessao.ok) return falhar(sessao.falha);

  const corpo = await corpoDe(pedido);
  let doAparelho;
  try {
    // Migra o que chega: um aparelho que ficou para trás não pode gravar um
    // formato velho por cima do banco de todo mundo.
    doAparelho = migrar(corpo.banco);
  } catch {
    return json({ erro: 'banco-invalido', mensagem: 'O aparelho mandou um banco ilegível.' }, 400);
  }

  const chave = chaveBanco(sessao.valor.usuarioId);

  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const guardado = await armazem.ler(chave);
    const doServidor = guardado ? migrar(JSON.parse(guardado)) : bancoVazio();

    const junto = podarLapides(juntar(doServidor, doAparelho), agora.toISOString());
    const novo = JSON.stringify(junto);

    // Comparar e gravar num passo só: entre ler e gravar cabe a sincronização
    // inteira do outro aparelho, e ela seria perdida sem aviso.
    if (await armazem.gravarSeIgual(chave, guardado, novo)) {
      return json({ banco: junto, sincronizadoEm: agora.toISOString() });
    }
  }

  // A junção é idempotente, então tentar de novo é seguro — mas não vou
  // insistir para sempre e deixar o aparelho pendurado.
  return json(
    { erro: 'ocupado', mensagem: 'Outro aparelho está sincronizando. Tente de novo.' },
    409,
  );
}
