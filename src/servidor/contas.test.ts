import { describe, it, expect } from 'vitest';
import { ArmazemMemoria } from './armazem';
import {
  cadastrar,
  entrar,
  validarSessao,
  sair,
  listarSessoes,
  revogar,
  permitidos,
  normalizarEmail,
  emailValido,
  TENTATIVAS_ATE_ESFRIAR,
  MINIMO_DA_SENHA,
  DIAS_DE_SESSAO,
} from './contas';

const AMBIENTE = { EMAILS_PERMITIDOS: 'dono@exemplo.com' };
const SENHA = 'uma senha bem comprida';

const novo = () => new ArmazemMemoria();

async function comConta(armazem = novo()) {
  const r = await cadastrar(armazem, { email: 'dono@exemplo.com', senha: SENHA }, AMBIENTE);
  if (!r.ok) throw new Error(`cadastro falhou: ${r.falha}`);
  return { armazem, entrada: r.valor };
}

describe('quem pode se cadastrar', () => {
  it('só quem está na lista do ambiente', async () => {
    // O endereço é público: sem isto, qualquer um cria conta no banco que eu
    // pago e guarda o que quiser nele.
    const armazem = novo();
    const fora = await cadastrar(armazem, { email: 'estranho@exemplo.com', senha: SENHA }, AMBIENTE);
    expect(fora).toEqual({ ok: false, falha: 'email-nao-permitido' });
  });

  it('sem a variável, ninguém se cadastra', async () => {
    // Padrão seguro: esquecer de configurar fecha a porta, não abre.
    expect(permitidos({})).toEqual([]);
    const r = await cadastrar(novo(), { email: 'dono@exemplo.com', senha: SENHA }, {});
    expect(r).toEqual({ ok: false, falha: 'email-nao-permitido' });
  });

  it('a lista aceita mais de um, separados por vírgula', () => {
    expect(permitidos({ EMAILS_PERMITIDOS: 'a@x.com, B@X.com ' })).toEqual(['a@x.com', 'b@x.com']);
  });

  it('e-mail é comparado normalizado', async () => {
    const r = await cadastrar(novo(), { email: '  DONO@Exemplo.COM ', senha: SENHA }, AMBIENTE);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.usuario.email).toBe('dono@exemplo.com');
  });

  it('recusa e-mail sem cara de e-mail', () => {
    expect(emailValido('dono@exemplo.com')).toBe(true);
    for (const ruim of ['', 'dono', 'dono@', '@exemplo.com', 'dono@exemplo', 'a b@c.com']) {
      expect(emailValido(ruim), ruim).toBe(false);
    }
  });

  it('recusa senha curta', async () => {
    const curta = 'a'.repeat(MINIMO_DA_SENHA - 1);
    const r = await cadastrar(novo(), { email: 'dono@exemplo.com', senha: curta }, AMBIENTE);
    expect(r).toEqual({ ok: false, falha: 'senha-curta' });
  });

  it('não deixa cadastrar duas vezes o mesmo e-mail', async () => {
    const { armazem } = await comConta();
    const r = await cadastrar(armazem, { email: 'DONO@exemplo.com', senha: SENHA }, AMBIENTE);
    expect(r).toEqual({ ok: false, falha: 'ja-existe' });
  });

  it('o cadastro já devolve a sessão: ninguém cadastra para depois entrar', async () => {
    const { entrada } = await comConta();
    expect(entrada.token.length).toBeGreaterThan(20);
    expect(entrada.usuario.email).toBe('dono@exemplo.com');
  });
});

describe('entrar', () => {
  it('com a senha certa', async () => {
    const { armazem } = await comConta();
    const r = await entrar(armazem, { email: 'dono@exemplo.com', senha: SENHA });
    expect(r.ok).toBe(true);
  });

  it('com a senha errada, não', async () => {
    const { armazem } = await comConta();
    const r = await entrar(armazem, { email: 'dono@exemplo.com', senha: 'outra coisa' });
    expect(r).toEqual({ ok: false, falha: 'credencial-invalida' });
  });

  it('conta que não existe dá a mesma resposta que senha errada', async () => {
    // Resposta diferente diria a quem tenta quais e-mails têm conta aqui.
    const r = await entrar(novo(), { email: 'ninguem@exemplo.com', senha: SENHA });
    expect(r).toEqual({ ok: false, falha: 'credencial-invalida' });
  });

  it('cada entrada abre uma sessão própria', async () => {
    // Entrar no telefone não pode derrubar o Mac.
    const { armazem, entrada } = await comConta();
    const outra = await entrar(armazem, { email: 'dono@exemplo.com', senha: SENHA });
    expect(outra.ok).toBe(true);
    if (!outra.ok) return;
    expect(outra.valor.token).not.toBe(entrada.token);
    expect((await validarSessao(armazem, entrada.token)).ok).toBe(true);
    expect((await validarSessao(armazem, outra.valor.token)).ok).toBe(true);
  });
});

describe('o freio depois de errar', () => {
  it('esfria depois de cinco tentativas', async () => {
    // Sem freio, o endereço público vira convite a tentar senha em massa.
    const { armazem } = await comConta();
    for (let i = 0; i < TENTATIVAS_ATE_ESFRIAR; i++) {
      await entrar(armazem, { email: 'dono@exemplo.com', senha: 'errada' });
    }
    const agora = await entrar(armazem, { email: 'dono@exemplo.com', senha: SENHA });
    expect(agora).toEqual({ ok: false, falha: 'esfriando' });
  });

  it('acertar antes do limite limpa a conta do freio', async () => {
    const { armazem } = await comConta();
    await entrar(armazem, { email: 'dono@exemplo.com', senha: 'errada' });
    await entrar(armazem, { email: 'dono@exemplo.com', senha: 'errada' });
    expect((await entrar(armazem, { email: 'dono@exemplo.com', senha: SENHA })).ok).toBe(true);

    for (let i = 0; i < TENTATIVAS_ATE_ESFRIAR - 1; i++) {
      await entrar(armazem, { email: 'dono@exemplo.com', senha: 'errada' });
    }
    expect((await entrar(armazem, { email: 'dono@exemplo.com', senha: SENHA })).ok).toBe(true);
  });

  it('o freio passa sozinho com o tempo', async () => {
    let momento = Date.now();
    const armazem = new ArmazemMemoria(() => momento);
    await cadastrar(armazem, { email: 'dono@exemplo.com', senha: SENHA }, AMBIENTE);
    for (let i = 0; i < TENTATIVAS_ATE_ESFRIAR; i++) {
      await entrar(armazem, { email: 'dono@exemplo.com', senha: 'errada' });
    }
    expect((await entrar(armazem, { email: 'dono@exemplo.com', senha: SENHA })).ok).toBe(false);

    momento += 16 * 60 * 1000;
    expect((await entrar(armazem, { email: 'dono@exemplo.com', senha: SENHA })).ok).toBe(true);
  });
});

describe('sessão', () => {
  it('token bom identifica o dono; token ruim, nada', async () => {
    const { armazem, entrada } = await comConta();
    const boa = await validarSessao(armazem, entrada.token);
    expect(boa.ok).toBe(true);
    if (boa.ok) expect(boa.valor.usuarioId).toBe(entrada.usuario.id);

    expect((await validarSessao(armazem, 'inventado')).ok).toBe(false);
    expect((await validarSessao(armazem, undefined)).ok).toBe(false);
  });

  it('sair corta a sessão daquele aparelho e só dele', async () => {
    const { armazem, entrada } = await comConta();
    const outra = await entrar(armazem, { email: 'dono@exemplo.com', senha: SENHA });
    if (!outra.ok) throw new Error('não entrou');

    await sair(armazem, entrada.token);
    expect((await validarSessao(armazem, entrada.token)).ok).toBe(false);
    expect((await validarSessao(armazem, outra.valor.token)).ok).toBe(true);
  });

  it('a sessão expira sozinha depois de noventa dias parada', async () => {
    let momento = Date.now();
    const armazem = new ArmazemMemoria(() => momento);
    const r = await cadastrar(armazem, { email: 'dono@exemplo.com', senha: SENHA }, AMBIENTE);
    if (!r.ok) throw new Error('não cadastrou');

    momento += (DIAS_DE_SESSAO - 1) * 86_400_000;
    expect((await validarSessao(armazem, r.valor.token)).ok).toBe(true);

    momento += 2 * 86_400_000;
    expect((await validarSessao(armazem, r.valor.token)).ok).toBe(false);
  });
});

describe('revogar o acesso de um aparelho', () => {
  it('lista as sessões e marca qual é a de agora', async () => {
    const { armazem, entrada } = await comConta();
    await entrar(armazem, { email: 'dono@exemplo.com', senha: SENHA, aparelho: 'iPhone' });

    const lista = await listarSessoes(armazem, entrada.usuario.id, entrada.token);
    expect(lista).toHaveLength(2);
    expect(lista.filter((s) => s.atual)).toHaveLength(1);
    expect(lista.map((s) => s.aparelho)).toContain('iPhone');
  });

  it('revogar derruba o aparelho escolhido', async () => {
    const { armazem, entrada } = await comConta();
    const telefone = await entrar(armazem, { email: 'dono@exemplo.com', senha: SENHA });
    if (!telefone.ok) throw new Error('não entrou');

    expect(await revogar(armazem, entrada.usuario.id, telefone.valor.token)).toEqual({
      ok: true,
      valor: null,
    });
    expect((await validarSessao(armazem, telefone.valor.token)).ok).toBe(false);
    expect((await validarSessao(armazem, entrada.token)).ok).toBe(true);
  });

  it('não dá para revogar a sessão de outra conta', async () => {
    // Sem esta conferência, qualquer token derrubaria a sessão de qualquer um.
    const { armazem, entrada } = await comConta();
    const outra = await cadastrar(
      armazem,
      { email: 'vizinho@exemplo.com', senha: SENHA },
      { EMAILS_PERMITIDOS: 'dono@exemplo.com,vizinho@exemplo.com' },
    );
    if (!outra.ok) throw new Error('não cadastrou');

    const tentativa = await revogar(armazem, entrada.usuario.id, outra.valor.token);
    expect(tentativa).toEqual({ ok: false, falha: 'sessao-invalida' });
    expect((await validarSessao(armazem, outra.valor.token)).ok).toBe(true);
  });

  it('só as sessões da própria conta aparecem na lista', async () => {
    const { armazem, entrada } = await comConta();
    await cadastrar(
      armazem,
      { email: 'vizinho@exemplo.com', senha: SENHA },
      { EMAILS_PERMITIDOS: 'vizinho@exemplo.com' },
    );
    const lista = await listarSessoes(armazem, entrada.usuario.id, entrada.token);
    expect(lista).toHaveLength(1);
  });
});

describe('o que fica guardado', () => {
  it('a senha crua nunca é gravada', async () => {
    const { armazem } = await comConta();
    const guardado = await armazem.ler('usuario:dono@exemplo.com');
    expect(guardado).not.toBeNull();
    expect(guardado).not.toContain(SENHA);
    expect(guardado).toContain('scrypt$');
  });

  it('normalizarEmail limpa espaço e caixa', () => {
    expect(normalizarEmail('  Dono@Exemplo.COM  ')).toBe('dono@exemplo.com');
  });
});
