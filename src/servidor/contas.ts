import type { Armazem } from './armazem';
import { embaralhar, conferir, precisaReforcar, segredo } from './senha';

/**
 * Contas, entrada e sessão.
 *
 * Nada aqui fala com o Redis nem com HTTP: recebe um `Armazem` e devolve um
 * resultado. É o que permite provar o fluxo inteiro — cadastro, senha errada,
 * sessão expirada, revogação — em Vitest, sem rede.
 *
 * Duas regras que o endereço público impõe:
 *
 * - **Só quem está na lista se cadastra.** O endereço é público; sem isso,
 *   qualquer um cria conta no banco que você paga.
 * - **Errar a senha custa tempo.** Sem freio, o endereço vira um convite a
 *   tentar senha em massa.
 */

export interface Usuario {
  id: string;
  email: string;
  senha: string;
  criadoEm: string;
}

export interface Sessao {
  usuarioId: string;
  criadaEm: string;
  /** o que o aparelho disse ser, só para eu reconhecer na lista */
  aparelho: string;
}

/** Sessão dura 90 dias sem uso. Um sistema de uso diário nunca chega lá. */
export const DIAS_DE_SESSAO = 90;

/** Tentativas erradas seguidas antes de a conta esfriar. */
export const TENTATIVAS_ATE_ESFRIAR = 5;
export const SEGUNDOS_ESFRIANDO = 15 * 60;

/** A senha mais curta que eu aceito guardar. */
export const MINIMO_DA_SENHA = 10;

export type Falha =
  | 'email-invalido'
  | 'email-nao-permitido'
  | 'senha-curta'
  | 'ja-existe'
  | 'credencial-invalida'
  | 'esfriando'
  | 'sessao-invalida';

export type Resultado<T> = { ok: true; valor: T } | { ok: false; falha: Falha };

const erro = (falha: Falha): Resultado<never> => ({ ok: false, falha });
const certo = <T>(valor: T): Resultado<T> => ({ ok: true, valor });

/**
 * Normaliza o e-mail antes de qualquer comparação.
 *
 * `Luiz@Gmail.com ` e `luiz@gmail.com` são a mesma caixa, e sem normalizar
 * viram duas contas — ou uma entrada que não funciona conforme o teclado
 * resolve capitalizar.
 */
export const normalizarEmail = (email: string): string => email.trim().toLowerCase();

/** Simples de propósito: quem valida e-mail de verdade é a caixa de entrada. */
export const emailValido = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizarEmail(email));

/**
 * Quem pode se cadastrar.
 *
 * Vem de variável de ambiente, e não do código: o repositório é público, e
 * e-mail em código público vira alvo de robô. Lista vazia fecha o cadastro
 * para todo mundo — é o padrão seguro para quando a variável não foi posta.
 */
export function permitidos(ambiente: Record<string, string | undefined>): string[] {
  return (ambiente.EMAILS_PERMITIDOS ?? '')
    .split(',')
    .map(normalizarEmail)
    .filter((e) => e !== '');
}

const chaveUsuario = (email: string) => `usuario:${normalizarEmail(email)}`;
const chaveSessao = (token: string) => `sessao:${token}`;
const chaveFreio = (email: string) => `freio:${normalizarEmail(email)}`;
export const chaveBanco = (usuarioId: string) => `banco:${usuarioId}`;

export interface Entrada {
  token: string;
  usuario: Omit<Usuario, 'senha'>;
}

async function abrirSessao(
  armazem: Armazem,
  usuario: Usuario,
  aparelho: string,
  agora: Date,
): Promise<Entrada> {
  const token = segredo();
  const sessao: Sessao = {
    usuarioId: usuario.id,
    criadaEm: agora.toISOString(),
    aparelho: aparelho.slice(0, 80),
  };
  await armazem.gravar(chaveSessao(token), JSON.stringify(sessao), DIAS_DE_SESSAO * 86_400);
  return {
    token,
    usuario: { id: usuario.id, email: usuario.email, criadoEm: usuario.criadoEm },
  };
}

export async function cadastrar(
  armazem: Armazem,
  dados: { email: string; senha: string; aparelho?: string },
  ambiente: Record<string, string | undefined>,
  agora = new Date(),
): Promise<Resultado<Entrada>> {
  const email = normalizarEmail(dados.email);

  if (!emailValido(email)) return erro('email-invalido');
  if (!permitidos(ambiente).includes(email)) return erro('email-nao-permitido');
  if (dados.senha.length < MINIMO_DA_SENHA) return erro('senha-curta');
  if (await armazem.ler(chaveUsuario(email))) return erro('ja-existe');

  const usuario: Usuario = {
    id: segredo(16),
    email,
    senha: await embaralhar(dados.senha),
    criadoEm: agora.toISOString(),
  };
  await armazem.gravar(chaveUsuario(email), JSON.stringify(usuario));

  return certo(await abrirSessao(armazem, usuario, dados.aparelho ?? 'aparelho', agora));
}

export async function entrar(
  armazem: Armazem,
  dados: { email: string; senha: string; aparelho?: string },
  agora = new Date(),
): Promise<Resultado<Entrada>> {
  const email = normalizarEmail(dados.email);
  const freio = await armazem.ler(chaveFreio(email));
  const erradas = freio ? Number(freio) : 0;
  if (erradas >= TENTATIVAS_ATE_ESFRIAR) return erro('esfriando');

  const guardado = await armazem.ler(chaveUsuario(email));
  if (!guardado) {
    // Conta que não existe custa o mesmo tempo que senha errada: responder
    // rápido aqui diria a quem tenta que este e-mail não tem conta.
    await embaralhar(dados.senha);
    await armazem.gravar(chaveFreio(email), String(erradas + 1), SEGUNDOS_ESFRIANDO);
    return erro('credencial-invalida');
  }

  const usuario = JSON.parse(guardado) as Usuario;
  if (!(await conferir(dados.senha, usuario.senha))) {
    await armazem.gravar(chaveFreio(email), String(erradas + 1), SEGUNDOS_ESFRIANDO);
    return erro('credencial-invalida');
  }

  await armazem.apagar(chaveFreio(email));

  // Entrou com a senha certa e o hash é de um custo antigo: refaz agora, que é
  // o único momento em que a senha crua existe.
  if (precisaReforcar(usuario.senha)) {
    const reforcado: Usuario = { ...usuario, senha: await embaralhar(dados.senha) };
    await armazem.gravar(chaveUsuario(email), JSON.stringify(reforcado));
  }

  return certo(await abrirSessao(armazem, usuario, dados.aparelho ?? 'aparelho', agora));
}

/** Quem é o dono deste token, se o token ainda vale. */
export async function validarSessao(
  armazem: Armazem,
  token: string | undefined,
): Promise<Resultado<Sessao & { token: string }>> {
  if (!token) return erro('sessao-invalida');
  const guardada = await armazem.ler(chaveSessao(token));
  if (!guardada) return erro('sessao-invalida');
  return certo({ ...(JSON.parse(guardada) as Sessao), token });
}

export async function sair(armazem: Armazem, token: string): Promise<void> {
  await armazem.apagar(chaveSessao(token));
}

export interface SessaoListada {
  token: string;
  aparelho: string;
  criadaEm: string;
  atual: boolean;
}

/** As sessões abertas da conta, para eu poder cortar a de um aparelho perdido. */
export async function listarSessoes(
  armazem: Armazem,
  usuarioId: string,
  tokenAtual: string,
): Promise<SessaoListada[]> {
  const chaves = await armazem.listar('sessao:');
  const abertas: SessaoListada[] = [];

  for (const chave of chaves) {
    const conteudo = await armazem.ler(chave);
    if (!conteudo) continue;
    const sessao = JSON.parse(conteudo) as Sessao;
    if (sessao.usuarioId !== usuarioId) continue;
    const token = chave.slice('sessao:'.length);
    abertas.push({
      token,
      aparelho: sessao.aparelho,
      criadaEm: sessao.criadaEm,
      atual: token === tokenAtual,
    });
  }

  return abertas.sort((a, b) => (a.criadaEm < b.criadaEm ? -1 : 1));
}

/**
 * Revoga a sessão de outro aparelho.
 *
 * Só apaga sessão da própria conta: sem essa conferência, quem tivesse
 * qualquer token derrubaria a sessão de qualquer pessoa.
 */
export async function revogar(
  armazem: Armazem,
  usuarioId: string,
  token: string,
): Promise<Resultado<null>> {
  const guardada = await armazem.ler(chaveSessao(token));
  if (!guardada) return erro('sessao-invalida');
  if ((JSON.parse(guardada) as Sessao).usuarioId !== usuarioId) return erro('sessao-invalida');
  await armazem.apagar(chaveSessao(token));
  return certo(null);
}
