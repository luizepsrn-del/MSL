import { describe, it, expect } from 'vitest';
import { VERSAO_ESQUEMA, bancoVazio, novoId, diaLocal, type Banco } from './esquema';
import { migrar, ErroDeMigracao } from './migracoes';
import {
  RepositorioMemoria,
  serializar,
  desserializar,
  rotinasAtivas,
  execucoesDoDia,
} from './repositorio';

function bancoDeExemplo(): Banco {
  return {
    versao: VERSAO_ESQUEMA,
    rotinas: [
      {
        id: 'r1',
        criadoEm: '2026-01-01T00:00:00.000Z',
        alteradoEm: '2026-01-01T00:00:00.000Z',
        titulo: 'Ler 20 páginas',
        contexto: 'pessoal',
        icone: 'book-open',
        inicioEm: '2026-01-01',
        arquivada: false,
        recorrencia: { tipo: 'diaria' },
      },
      {
        id: 'r2',
        criadoEm: '2026-01-01T00:00:00.000Z',
        alteradoEm: '2026-01-01T00:00:00.000Z',
        titulo: 'Revisar pipeline',
        contexto: 'profissional',
        icone: 'clipboard-check',
        inicioEm: '2026-01-01',
        arquivada: true,
        recorrencia: { tipo: 'semanal', dias: [1] },
      },
    ],
    execucoes: [
      {
        id: 'e1',
        criadoEm: '2026-01-05T12:00:00.000Z',
        alteradoEm: '2026-01-05T12:00:00.000Z',
        rotinaId: 'r1',
        dia: '2026-01-05',
      },
    ],
    tarefas: [
      {
        id: 't1',
        criadoEm: '2026-01-04T09:00:00.000Z',
        alteradoEm: '2026-01-04T09:00:00.000Z',
        titulo: 'Renovar o contrato',
        contexto: 'profissional',
        prazo: '2026-01-20',
      },
    ],
  };
}

describe('esquema', () => {
  it('gera identificador único', () => {
    const ids = new Set(Array.from({ length: 1000 }, novoId));
    expect(ids.size).toBe(1000);
  });

  it('dá o dia local no fuso de exibição, não em UTC', () => {
    // 2026-01-04T01:00:00Z ainda é dia 3 em São Paulo.
    expect(diaLocal(new Date('2026-01-04T01:00:00Z'))).toBe('2026-01-03');
    expect(diaLocal(new Date('2026-01-04T12:00:00Z'))).toBe('2026-01-04');
  });
});

describe('migração', () => {
  it('sobe um arquivo sem versão para a versão atual', () => {
    const antigo = { rotinas: [], execucoes: [] };
    expect(migrar(antigo).versao).toBe(VERSAO_ESQUEMA);
  });

  it('completa coleção que falta em vez de quebrar', () => {
    const capenga = { versao: 0 };
    const banco = migrar(capenga);
    expect(banco.rotinas).toEqual([]);
    expect(banco.execucoes).toEqual([]);
  });

  it('preserva campo que ainda não entende', () => {
    // Uma migração não pode comer dado que uma versão futura acrescentou e
    // que o usuário ainda vai querer de volta.
    const comExtra = { versao: 0, rotinas: [], execucoes: [], anotacoes: ['guardar'] };
    const banco = migrar(comExtra) as unknown as Record<string, unknown>;
    expect(banco.anotacoes).toEqual(['guardar']);
  });

  it('recusa arquivo de uma versão futura em vez de corromper', () => {
    const doFuturo = { versao: VERSAO_ESQUEMA + 5, rotinas: [], execucoes: [] };
    expect(() => migrar(doFuturo)).toThrow(ErroDeMigracao);
    expect(() => migrar(doFuturo)).toThrow(/Atualize o sistema/);
  });

  it('recusa o que não é banco', () => {
    expect(() => migrar(null)).toThrow(ErroDeMigracao);
    expect(() => migrar('texto')).toThrow(ErroDeMigracao);
    expect(() => migrar([1, 2, 3])).toThrow(ErroDeMigracao);
  });

  it('sobe um banco v1 de verdade para v2 sem perder nada', () => {
    // O caso que importa: um arquivo gravado antes de Tarefas existir. As
    // rotinas e execuções precisam chegar do outro lado intactas, e a coleção
    // nova precisa aparecer vazia em vez de ausente.
    const v1 = {
      versao: 1,
      rotinas: [
        {
          id: 'r1',
          criadoEm: '2026-01-01T00:00:00.000Z',
          alteradoEm: '2026-01-01T00:00:00.000Z',
          titulo: 'Ler 20 páginas',
          contexto: 'pessoal',
          icone: 'book-open',
          inicioEm: '2026-01-01',
          arquivada: false,
          recorrencia: { tipo: 'diaria' },
        },
      ],
      execucoes: [
        {
          id: 'e1',
          criadoEm: '2026-01-05T12:00:00.000Z',
          alteradoEm: '2026-01-05T12:00:00.000Z',
          rotinaId: 'r1',
          dia: '2026-01-05',
        },
      ],
    };

    const banco = migrar(v1);

    expect(banco.versao).toBe(2);
    expect(banco.rotinas).toHaveLength(1);
    expect(banco.rotinas[0].titulo).toBe('Ler 20 páginas');
    expect(banco.execucoes).toHaveLength(1);
    expect(banco.execucoes[0].dia).toBe('2026-01-05');
    expect(banco.tarefas).toEqual([]);
  });

  it('sobe do zero até a versão atual atravessando todos os degraus', () => {
    // Sem versão nenhuma até a atual, passando por cada migração no caminho.
    const banco = migrar({ rotinas: [], execucoes: [] });
    expect(banco.versao).toBe(VERSAO_ESQUEMA);
    expect(banco.tarefas).toEqual([]);
  });

  it('é idempotente — migrar duas vezes dá o mesmo banco', () => {
    const uma = migrar({ rotinas: [], execucoes: [] });
    const duas = migrar(uma);
    expect(duas).toEqual(uma);
  });
});

describe('exportação e importação', () => {
  it('ida e volta preserva o banco inteiro', async () => {
    const repo = new RepositorioMemoria(bancoDeExemplo());
    const arquivo = await repo.exportar();

    const vazio = new RepositorioMemoria();
    const recuperado = await vazio.importar(arquivo);

    expect(recuperado).toEqual(bancoDeExemplo());
  });

  it('o arquivo exportado é JSON legível, não um blob', async () => {
    // Se eu precisar recuperar meu dado na mão, tem que dar para ler.
    const arquivo = await new RepositorioMemoria(bancoDeExemplo()).exportar();
    expect(arquivo).toContain('Ler 20 páginas');
    expect(arquivo.split('\n').length).toBeGreaterThan(10);
    expect(() => JSON.parse(arquivo)).not.toThrow();
  });

  it('o arquivo carrega a versão do esquema', async () => {
    const arquivo = await new RepositorioMemoria(bancoDeExemplo()).exportar();
    expect(JSON.parse(arquivo).versao).toBe(VERSAO_ESQUEMA);
  });

  it('importar um arquivo antigo migra na entrada', async () => {
    const antigo = JSON.stringify({ rotinas: [], execucoes: [] });
    const banco = await new RepositorioMemoria().importar(antigo);
    expect(banco.versao).toBe(VERSAO_ESQUEMA);
  });

  it('importar substitui o banco, não mistura', async () => {
    const repo = new RepositorioMemoria(bancoDeExemplo());
    await repo.importar(serializar(bancoVazio()));
    expect((await repo.carregar()).rotinas).toEqual([]);
  });

  it('recusa arquivo corrompido com mensagem legível', () => {
    expect(() => desserializar('{{{')).toThrow(/JSON válido/);
  });

  it('o repositório não devolve referência ao próprio estado', async () => {
    // Senão a tela mutaria o banco sem passar por salvar, e o dado divergiria
    // do que está gravado sem ninguém perceber.
    const repo = new RepositorioMemoria(bancoDeExemplo());
    const a = await repo.carregar();
    a.rotinas[0].titulo = 'mexido por fora';
    const b = await repo.carregar();
    expect(b.rotinas[0].titulo).toBe('Ler 20 páginas');
  });
});

describe('consultas compartilhadas', () => {
  it('lista só as rotinas ativas', () => {
    expect(rotinasAtivas(bancoDeExemplo()).map((r) => r.id)).toEqual(['r1']);
  });

  it('filtra execuções por dia', () => {
    expect(execucoesDoDia(bancoDeExemplo(), '2026-01-05')).toHaveLength(1);
    expect(execucoesDoDia(bancoDeExemplo(), '2026-01-06')).toHaveLength(0);
  });
});
