import { describe, it, expect } from 'vitest';
import {
  BLOCOS_DO_INICIO,
  blocoPorId,
  blocosVisiveis,
  alternarBloco,
  moverBloco,
  ordemDeFabrica,
} from './preferencias';

const TODOS = BLOCOS_DO_INICIO.map((b) => b.id);

describe('o catálogo dos blocos', () => {
  it('tem id único', () => {
    expect(new Set(TODOS).size).toBe(TODOS.length);
  });

  it('todo bloco tem rótulo e descrição em português', () => {
    for (const b of BLOCOS_DO_INICIO) {
      expect(b.rotulo.trim(), b.id).not.toBe('');
      expect(b.descricao.trim(), b.id).not.toBe('');
      expect(['metade', 'inteira']).toContain(b.largura);
    }
  });

  it('bloco novo entra para quem nunca personalizou, e não para quem já o fez', () => {
    // Quem escolheu uma ordem não pode tê-la mexida por uma versão nova; o
    // bloco fica desligado, visível na lista de escondidos do diálogo.
    expect(blocosVisiveis()).toContain('dinheiro');
    expect(blocosVisiveis({ blocosDoInicio: ['hoje', 'semana'] })).not.toContain('dinheiro');
  });

  it('acha o bloco pelo id, e devolve nada para o que não existe', () => {
    expect(blocoPorId('semana')?.rotulo).toBe('Esta semana');
    expect(blocoPorId('inventado')).toBeUndefined();
  });
});

describe('quais blocos aparecem', () => {
  it('sem preferência nenhuma, tudo na ordem de fábrica', () => {
    // Instalação nova não pode abrir com a tela vazia.
    expect(blocosVisiveis()).toEqual(TODOS);
    expect(blocosVisiveis({})).toEqual(TODOS);
  });

  it('com preferência, manda a preferência', () => {
    expect(blocosVisiveis({ blocosDoInicio: ['semana', 'hoje'] })).toEqual(['semana', 'hoje']);
  });

  it('lista vazia é escolha, e não ausência', () => {
    // Quem desligou tudo quer a tela limpa; devolver tudo aqui desfaria isso.
    expect(blocosVisiveis({ blocosDoInicio: [] })).toEqual([]);
  });

  it('id desconhecido é descartado, em vez de travar a tela', () => {
    // Um arquivo exportado de uma versão mais nova pode citar bloco que este
    // código não conhece.
    expect(blocosVisiveis({ blocosDoInicio: ['hoje', 'bloco-do-futuro', 'semana'] })).toEqual([
      'hoje',
      'semana',
    ]);
  });

  it('id repetido aparece uma vez só', () => {
    // React quebraria com duas chaves iguais, e o bloco apareceria em dobro.
    expect(blocosVisiveis({ blocosDoInicio: ['hoje', 'hoje', 'semana'] })).toEqual([
      'hoje',
      'semana',
    ]);
  });
});

describe('ligar e desligar', () => {
  it('desligar tira da lista', () => {
    expect(alternarBloco(['hoje', 'semana'], 'hoje')).toEqual(['semana']);
  });

  it('ligar de novo põe no fim, e não no lugar de fábrica', () => {
    // Mandar o bloco de volta para o meio mexeria numa ordem que eu escolhi.
    expect(alternarBloco(['semana', 'hoje'], 'indicadores')).toEqual([
      'semana',
      'hoje',
      'indicadores',
    ]);
  });

  it('id que não existe não entra na lista', () => {
    expect(alternarBloco(['hoje'], 'inventado')).toEqual(['hoje']);
  });

  it('desligar tudo, um por um, chega na lista vazia', () => {
    let atual = ordemDeFabrica();
    for (const id of TODOS) atual = alternarBloco(atual, id);
    expect(atual).toEqual([]);
  });
});

describe('reordenar', () => {
  const lista = ['a-indicadores', 'b-hoje', 'c-semana'];
  const reais = ['indicadores', 'hoje', 'semana'];

  it('sobe e desce trocando com o vizinho', () => {
    expect(moverBloco(reais, 'hoje', -1)).toEqual(['hoje', 'indicadores', 'semana']);
    expect(moverBloco(reais, 'hoje', 1)).toEqual(['indicadores', 'semana', 'hoje']);
  });

  it('nas pontas não faz nada, em vez de embrulhar a lista', () => {
    expect(moverBloco(reais, 'indicadores', -1)).toEqual(reais);
    expect(moverBloco(reais, 'semana', 1)).toEqual(reais);
  });

  it('bloco fora da lista não move nada', () => {
    expect(moverBloco(reais, 'contexto', -1)).toEqual(reais);
    expect(lista).toHaveLength(3);
  });

  it('não muda a lista que recebeu', () => {
    const original = [...reais];
    moverBloco(reais, 'hoje', -1);
    expect(reais).toEqual(original);
  });

  it('subir e descer de volta devolve a mesma ordem', () => {
    const subiu = moverBloco(reais, 'semana', -1);
    expect(moverBloco(subiu, 'semana', 1)).toEqual(reais);
  });
});
