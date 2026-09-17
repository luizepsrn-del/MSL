import { describe, it, expect } from 'vitest';
import { montarPrompt, textosDoUsuario, ROTULO_NIVEL, type ContextoDoPedido } from './pedido';
import { VERSAO_ESQUEMA, bancoVazio, type Banco } from '../dados/esquema';

const CONTEXTO: ContextoDoPedido = {
  modulos: ['Início', 'Rotina', 'Tarefas'],
  componentes: { core: 8, forms: 7 },
};

/** Um banco com textos bem distintos, para o vazamento ser inconfundível. */
function bancoComSegredos(): Banco {
  return {
    ...bancoVazio(),
    rotinas: [
      {
        id: 'r1',
        criadoEm: '2026-01-01T00:00:00.000Z',
        alteradoEm: '2026-01-01T00:00:00.000Z',
        titulo: 'SEGREDO-ROTINA-terapia às terças',
        contexto: 'pessoal',
        icone: 'heart-pulse',
        inicioEm: '2026-01-01',
        arquivada: false,
        recorrencia: { tipo: 'semanal', dias: [2] },
      },
    ],
    tarefas: [
      {
        id: 't1',
        criadoEm: '2026-01-02T00:00:00.000Z',
        alteradoEm: '2026-01-02T00:00:00.000Z',
        titulo: 'SEGREDO-TAREFA-falar com o advogado',
        contexto: 'pessoal',
        prazo: '2026-02-01',
        anotacao: 'SEGREDO-NOTA-processo 123',
      },
    ],
    projetos: [
      {
        id: 'p1',
        criadoEm: '2026-01-03T00:00:00.000Z',
        alteradoEm: '2026-01-03T00:00:00.000Z',
        titulo: 'SEGREDO-PROJETO-mudança de cidade',
        contexto: 'pessoal',
        descricao: 'SEGREDO-DESCRICAO-detalhes da mudança',
      },
    ],
    lancamentos: [
      {
        id: 'l1',
        criadoEm: '2026-01-04T00:00:00.000Z',
        alteradoEm: '2026-01-04T00:00:00.000Z',
        descricao: 'SEGREDO-LANCAMENTO-honorários',
        valor: 1234567,
        tipo: 'entrada',
        categoria: 'receita',
        contexto: 'profissional',
        data: '2026-01-04',
      },
    ],
  };
}

describe('a estrutura do pedido', () => {
  const prompt = montarPrompt(bancoComSegredos(), 'Quero uma área de leituras', 'estrutura', CONTEXTO);

  it('carrega a minha descrição', () => {
    expect(prompt).toContain('Quero uma área de leituras');
  });

  it('carrega as regras que impedem invenção', () => {
    expect(prompt).toContain('DESIGN.md');
    expect(prompt).toContain('prove pelos `.prompt.md` que nenhum dos existentes serve');
    expect(prompt).toContain('centavos');
    expect(prompt).toContain('migração aditiva');
  });

  it('diz o que já existe, para não duplicar', () => {
    expect(prompt).toContain('Início, Rotina, Tarefas');
    expect(prompt).toContain('core (8)');
    expect(prompt).toContain('forms (7)');
  });

  it('diz a versão do esquema e as coleções, com as contagens', () => {
    expect(prompt).toContain(`versão ${VERSAO_ESQUEMA}`);
    expect(prompt).toContain('`rotinas` — 1 registro');
    expect(prompt).toContain('`execucoes` — 0 registros');
    expect(prompt).toContain('`lancamentos` — 1 registro');
  });

  it('lista os campos que cada coleção realmente tem', () => {
    expect(prompt).toContain('recorrencia');
    expect(prompt).toContain('anotacao');
  });

  it('aponta o arquivo do esquema, porque coleção vazia não descreve campo', () => {
    // camposDe deriva dos registros existentes. Numa instalação nova todas as
    // coleções estão vazias e o pedido não diria nada sobre o formato —
    // apontar o arquivo resolve sem duplicar os tipos aqui.
    expect(prompt).toContain('src/dados/esquema.ts');
  });

  it('nomeia o nível escolhido', () => {
    expect(prompt).toContain(ROTULO_NIVEL.estrutura);
  });
});

describe('nível "somente a estrutura" — a garantia que importa', () => {
  it('não vaza NENHUM texto meu', () => {
    // Esta é a asserção que justifica o controle existir. Um compositor que
    // despeja o financeiro num prompt é um jeito confortável de vazar sem
    // perceber, e o padrão da tela é este nível.
    const banco = bancoComSegredos();
    const prompt = montarPrompt(banco, 'meu pedido', 'estrutura', CONTEXTO);

    const segredos = textosDoUsuario(banco);
    expect(segredos.length).toBeGreaterThan(0);
    for (const segredo of segredos) {
      expect(prompt, `vazou: ${segredo}`).not.toContain(segredo);
    }
    expect(prompt).not.toContain('SEGREDO');
  });

  it('não vaza valor em dinheiro', () => {
    const prompt = montarPrompt(bancoComSegredos(), 'x', 'estrutura', CONTEXTO);
    expect(prompt).not.toContain('1234567');
    expect(prompt).not.toContain('12.345,67');
  });

  it('diz explicitamente que nada foi incluído', () => {
    const prompt = montarPrompt(bancoComSegredos(), 'x', 'estrutura', CONTEXTO);
    expect(prompt).toContain('Nenhum conteúdo meu foi incluído');
  });
});

describe('nível "amostra anonimizada"', () => {
  const banco = bancoComSegredos();
  const prompt = montarPrompt(banco, 'x', 'amostra', CONTEXTO);

  it('também não vaza os meus textos', () => {
    for (const segredo of textosDoUsuario(banco)) {
      expect(prompt, `vazou: ${segredo}`).not.toContain(segredo);
    }
  });

  it('troca o texto por um marcador que diz qual campo era', () => {
    expect(prompt).toContain('«titulo»');
    expect(prompt).toContain('«anotacao»');
    expect(prompt).toContain('«descricao»');
  });

  it('preserva o que torna a amostra útil: datas, tipos e categorias', () => {
    // Sem isto a amostra não serve para raciocinar sobre o formato.
    expect(prompt).toContain('2026-02-01');
    expect(prompt).toContain('"tipo": "entrada"');
    expect(prompt).toContain('"categoria": "receita"');
    expect(prompt).toContain('"contexto": "pessoal"');
  });

  it('preserva a forma dos dados estruturados', () => {
    expect(prompt).toContain('"tipo": "semanal"');
  });
});

describe('nível "meus dados reais"', () => {
  it('inclui tudo, porque foi o que eu pedi', () => {
    const banco = bancoComSegredos();
    const prompt = montarPrompt(banco, 'x', 'completo', CONTEXTO);
    for (const segredo of textosDoUsuario(banco)) {
      expect(prompt).toContain(segredo);
    }
    expect(prompt).toContain('1234567');
  });

  it('avisa que é para usar só se for necessário', () => {
    const prompt = montarPrompt(bancoComSegredos(), 'x', 'completo', CONTEXTO);
    expect(prompt).toContain('Só use se for necessário');
  });
});

describe('banco vazio', () => {
  it('monta um pedido válido mesmo sem dado nenhum', () => {
    const prompt = montarPrompt(bancoVazio(), 'minha primeira ideia', 'estrutura', CONTEXTO);
    expect(prompt).toContain('minha primeira ideia');
    expect(prompt).toContain('`rotinas` — 0 registros');
  });

  it('descrição vazia vira um marcador em vez de um buraco', () => {
    expect(montarPrompt(bancoVazio(), '   ', 'estrutura', CONTEXTO)).toContain('(descreva aqui)');
  });
});

describe('textosDoUsuario', () => {
  it('encontra todo texto que eu escrevi', () => {
    // titulo da rotina, titulo e anotacao da tarefa, titulo e descricao do
    // projeto, descricao do lançamento.
    const textos = textosDoUsuario(bancoComSegredos());
    expect(textos).toHaveLength(6);
    expect(textos.every((t) => t.includes('SEGREDO'))).toBe(true);
  });

  it('banco vazio não tem texto nenhum', () => {
    expect(textosDoUsuario(bancoVazio())).toEqual([]);
  });
});
