import { describe, it, expect } from 'vitest';
import { COLECOES, ROTULO_COLECAO, nomearColecao } from './esquema';

describe('o nome das coleções na tela', () => {
  it('é em português, com acento', () => {
    // Os identificadores são chaves de dado; "25 execucoes" é jargão de banco.
    expect(nomearColecao('execucoes', 25)).toBe('25 execuções');
    expect(nomearColecao('lancamentos', 8)).toBe('8 lançamentos');
  });

  it('concorda no singular', () => {
    // "1 rotinas" é o mesmo erro do "1 concluídos" que já apareceu aqui.
    expect(nomearColecao('rotinas', 1)).toBe('1 rotina');
    expect(nomearColecao('tarefas', 1)).toBe('1 tarefa');
    expect(nomearColecao('projetos', 0)).toBe('0 projetos');
  });

  it('toda coleção tem nome', () => {
    for (const c of COLECOES) {
      expect(ROTULO_COLECAO[c], c).toHaveLength(2);
      expect(ROTULO_COLECAO[c][0].trim(), c).not.toBe('');
    }
  });
});
