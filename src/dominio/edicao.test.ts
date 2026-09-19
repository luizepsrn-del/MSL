import { describe, it, expect } from 'vitest';
import { aplicarEdicao, editarNaLista } from './edicao';
import type { Tarefa } from '../dados/esquema';

const AGORA = '2026-09-19T15:00:00.000Z';

function tarefa(extras: Partial<Tarefa> = {}): Tarefa {
  return {
    id: 't1',
    criadoEm: '2026-09-01T09:00:00.000Z',
    alteradoEm: '2026-09-01T09:00:00.000Z',
    titulo: 'Entregar o relatório',
    contexto: 'profissional',
    prazo: '2026-09-20',
    ...extras,
  };
}

describe('aplicar uma correção', () => {
  it('muda o que foi pedido e deixa o resto como estava', () => {
    const corrigida = aplicarEdicao(tarefa({ anotacao: 'com o anexo' }), { titulo: 'Entregar o balanço' }, AGORA);
    expect(corrigida.titulo).toBe('Entregar o balanço');
    expect(corrigida.prazo).toBe('2026-09-20');
    expect(corrigida.anotacao).toBe('com o anexo');
    expect(corrigida.contexto).toBe('profissional');
  });

  it('marca alteradoEm, que o esquema tinha e ninguém escrevia', () => {
    const corrigida = aplicarEdicao(tarefa(), { titulo: 'Outro' }, AGORA);
    expect(corrigida.alteradoEm).toBe(AGORA);
  });

  it('não mexe na identidade do registro', () => {
    // Trocar `id` desligaria a tarefa das suas ligações; trocar `criadoEm`
    // reescreveria a história para o ritmo do projeto e para os gráficos.
    const corrigida = aplicarEdicao(
      tarefa(),
      { id: 'outro', criadoEm: '2020-01-01T00:00:00.000Z' } as never,
      AGORA,
    );
    expect(corrigida.id).toBe('t1');
    expect(corrigida.criadoEm).toBe('2026-09-01T09:00:00.000Z');
  });

  it('campo com undefined é apagado, de propósito', () => {
    // É assim que se tira o prazo de uma tarefa que deixou de ter data.
    const corrigida = aplicarEdicao(tarefa({ hora: '14:30' }), { prazo: undefined, hora: undefined }, AGORA);
    expect('prazo' in corrigida).toBe(false);
    expect(corrigida.hora).toBeUndefined();
  });

  it('campo ausente da mudança não é apagado', () => {
    // A diferença entre "não mandei" e "mandei vazio" é o motivo de a mudança
    // ser um objeto parcial, e não o registro inteiro.
    const corrigida = aplicarEdicao(tarefa(), { titulo: 'Novo nome' }, AGORA);
    expect(corrigida.prazo).toBe('2026-09-20');
  });

  it('não muda o registro que recebeu', () => {
    const original = tarefa();
    aplicarEdicao(original, { titulo: 'Outro' }, AGORA);
    expect(original.titulo).toBe('Entregar o relatório');
    expect(original.alteradoEm).toBe('2026-09-01T09:00:00.000Z');
  });

  it('corrigir uma tarefa concluída não a ressuscita', () => {
    // Consertar um nome não pode desfazer o trabalho.
    const feita = tarefa({ concluidaEm: '2026-09-10T12:00:00.000Z' });
    const corrigida = aplicarEdicao(feita, { titulo: 'Nome certo' }, AGORA);
    expect(corrigida.concluidaEm).toBe('2026-09-10T12:00:00.000Z');
  });

  it('mudança vazia só carimba a data', () => {
    const corrigida = aplicarEdicao(tarefa(), {}, AGORA);
    expect(corrigida).toEqual({ ...tarefa(), alteradoEm: AGORA });
  });
});

describe('corrigir dentro de uma lista', () => {
  const lista = [tarefa({ id: 'a' }), tarefa({ id: 'b', titulo: 'Outra' }), tarefa({ id: 'c' })];

  it('mexe só no registro do id', () => {
    const nova = editarNaLista(lista, 'b', { titulo: 'Corrigida' }, AGORA);
    expect(nova.map((t) => t.titulo)).toEqual(['Entregar o relatório', 'Corrigida', 'Entregar o relatório']);
    expect(nova[0].alteradoEm).toBe('2026-09-01T09:00:00.000Z');
    expect(nova[1].alteradoEm).toBe(AGORA);
  });

  it('id que não existe não muda nada', () => {
    expect(editarNaLista(lista, 'fantasma', { titulo: 'x' }, AGORA)).toEqual(lista);
  });

  it('preserva a ordem', () => {
    expect(editarNaLista(lista, 'a', { titulo: 'x' }, AGORA).map((t) => t.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('não muda a lista que recebeu', () => {
    const copia = JSON.parse(JSON.stringify(lista));
    editarNaLista(lista, 'a', { titulo: 'x' }, AGORA);
    expect(lista).toEqual(copia);
  });
});
