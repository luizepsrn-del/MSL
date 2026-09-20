import { describe, it, expect } from 'vitest';
import { precisaDeVoce, saudacao, comoEstaODia, LIMITE_DO_FOCO } from './foco';
import { bancoVazio, type Banco, type Tarefa, type Rotina } from '../dados/esquema';

/** `2026-09-17`, uma quinta-feira. */
const HOJE = '2026-09-17';

let n = 0;
const t = () => {
  n += 1;
  return `2026-01-01T00:00:${String(n).padStart(2, '0')}.000Z`;
};
const base = () => ({ id: `x${n}`, criadoEm: t(), alteradoEm: t() });

function tarefa(dados: Partial<Tarefa> & { titulo: string }): Tarefa {
  return { ...base(), id: dados.titulo, contexto: 'pessoal', ...dados };
}

function rotina(dados: Partial<Rotina> & { titulo: string }): Rotina {
  return {
    ...base(),
    id: dados.titulo,
    contexto: 'pessoal',
    icone: 'circle',
    inicioEm: '2026-01-01',
    arquivada: false,
    recorrencia: { tipo: 'diaria' },
    ...dados,
  };
}

const banco = (partes: Partial<Banco> = {}): Banco => ({ ...bancoVazio(), ...partes });

describe('a ordem em que as coisas cobram', () => {
  it('a atrasada vem antes da de hoje, e a mais atrasada antes da menos', () => {
    const b = banco({
      tarefas: [
        tarefa({ titulo: 'Hoje', prazo: HOJE }),
        tarefa({ titulo: 'Atrasada há 1', prazo: '2026-09-16' }),
        tarefa({ titulo: 'Atrasada há 9', prazo: '2026-09-08' }),
      ],
    });
    expect(precisaDeVoce(b, HOJE).map((i) => i.titulo)).toEqual([
      'Atrasada há 9',
      'Atrasada há 1',
      'Hoje',
    ]);
  });

  it('o que tem hora vem antes do que não tem, na ordem do relógio', () => {
    const b = banco({
      tarefas: [
        tarefa({ titulo: 'Sem hora', prazo: HOJE }),
        tarefa({ titulo: 'Às 15h', prazo: HOJE, hora: '15:00' }),
        tarefa({ titulo: 'Às 9h', prazo: HOJE, hora: '09:00' }),
      ],
      rotinas: [rotina({ titulo: 'Treino às 7h', hora: '07:00' }), rotina({ titulo: 'Ler' })],
    });

    expect(precisaDeVoce(b, HOJE).map((i) => i.titulo)).toEqual([
      'Treino às 7h',
      'Às 9h',
      'Às 15h',
      'Sem hora', // tarefa sem hora, faixa 3
      'Ler', // rotina sem hora, faixa 4
    ]);
  });

  it('a tarefa sem hora de hoje vem antes da rotina sem hora', () => {
    // A rotina volta amanhã; a tarefa venceu hoje e some da lista se passar.
    const b = banco({
      rotinas: [rotina({ titulo: 'Rotina' })],
      tarefas: [tarefa({ titulo: 'Tarefa', prazo: HOJE })],
    });
    expect(precisaDeVoce(b, HOJE).map((i) => i.titulo)).toEqual(['Tarefa', 'Rotina']);
  });

  it('a conta de hoje entra entre o que tem hora e a tarefa sem hora', () => {
    const b = banco({
      tarefas: [
        tarefa({ titulo: 'Às 9h', prazo: HOJE, hora: '09:00' }),
        tarefa({ titulo: 'Sem hora', prazo: HOJE }),
      ],
      lancamentos: [
        {
          ...base(),
          id: 'l1',
          descricao: 'Aluguel',
          valor: 220_000,
          tipo: 'saida',
          categoria: 'moradia',
          contexto: 'pessoal',
          data: HOJE,
        },
      ],
    });
    expect(precisaDeVoce(b, HOJE).map((i) => i.titulo)).toEqual(['Às 9h', 'Aluguel', 'Sem hora']);
  });
});

describe('o que não entra na lista', () => {
  it('a tarefa concluída não entra, mesmo atrasada', () => {
    const b = banco({
      tarefas: [
        tarefa({ titulo: 'Feita', prazo: '2026-09-01', concluidaEm: '2026-09-02T12:00:00.000Z' }),
      ],
    });
    expect(precisaDeVoce(b, HOJE)).toEqual([]);
  });

  it('a rotina já cumprida hoje não entra', () => {
    const r = rotina({ titulo: 'Treino' });
    const b = banco({
      rotinas: [r],
      execucoes: [{ ...base(), id: 'e1', rotinaId: r.id, dia: HOJE }],
    });
    expect(precisaDeVoce(b, HOJE)).toEqual([]);
  });

  it('a tarefa futura não entra: ela ainda não pede nada', () => {
    const b = banco({ tarefas: [tarefa({ titulo: 'Semana que vem', prazo: '2026-09-25' })] });
    expect(precisaDeVoce(b, HOJE)).toEqual([]);
  });

  it('a tarefa sem prazo não entra', () => {
    // Sem prazo ela não venceu nem atrasou. Entrar aqui faria a fila virar a
    // lista de tarefas inteira, que é exatamente o que esta tela não é.
    const b = banco({ tarefas: [tarefa({ titulo: 'Algum dia' })] });
    expect(precisaDeVoce(b, HOJE)).toEqual([]);
  });

  it('a lista para no limite, e o limite é o que a impede de virar painel', () => {
    const muitas = Array.from({ length: 20 }, (_, i) =>
      tarefa({ titulo: `T${String(i).padStart(2, '0')}`, prazo: HOJE }),
    );
    expect(precisaDeVoce(banco({ tarefas: muitas }), HOJE)).toHaveLength(LIMITE_DO_FOCO);
    // E o limite é quem chama que decide, para a frase do dia poder contar tudo.
    expect(precisaDeVoce(banco({ tarefas: muitas }), HOJE, 100)).toHaveLength(20);
  });
});

describe('o que dá para marcar da própria lista', () => {
  it('tarefa e rotina são marcáveis; lançamento, meta e projeto não', () => {
    const b = banco({
      rotinas: [rotina({ titulo: 'Rotina' })],
      tarefas: [tarefa({ titulo: 'Tarefa', prazo: HOJE })],
      lancamentos: [
        {
          ...base(),
          id: 'l1',
          descricao: 'Conta',
          valor: 100,
          tipo: 'saida',
          categoria: 'outros',
          contexto: 'pessoal',
          data: HOJE,
        },
      ],
    });
    const porTipo = Object.fromEntries(
      precisaDeVoce(b, HOJE).map((i) => [i.tipo, i.marcavel]),
    );
    // Um lançamento não se "conclui": ele aconteceu ou não. Marcar daqui
    // inventaria um estado que o financeiro não tem.
    expect(porTipo).toEqual({ rotina: true, tarefa: true, lancamento: false });
  });
});

describe('a estabilidade da ordem', () => {
  it('a mesma lista sai na mesma ordem em dois desenhos', () => {
    const tarefas = [
      tarefa({ titulo: 'A', prazo: HOJE }),
      tarefa({ titulo: 'B', prazo: HOJE }),
      tarefa({ titulo: 'C', prazo: HOJE }),
    ];
    const uma = precisaDeVoce(banco({ tarefas }), HOJE).map((i) => i.chave);
    const outra = precisaDeVoce(banco({ tarefas: [...tarefas].reverse() }), HOJE).map((i) => i.chave);
    expect(uma).toEqual(outra);
  });
});

describe('todo item diz por que está ali', () => {
  it('o motivo nunca é vazio', () => {
    const b = banco({
      rotinas: [rotina({ titulo: 'Rotina', hora: '07:00' })],
      tarefas: [
        tarefa({ titulo: 'Atrasada', prazo: '2026-09-10' }),
        tarefa({ titulo: 'Hoje', prazo: HOJE }),
      ],
    });
    for (const item of precisaDeVoce(b, HOJE)) {
      expect(item.motivo.trim(), item.titulo).not.toBe('');
    }
  });

  it('o atraso vem por extenso, com concordância', () => {
    const b = banco({
      tarefas: [
        tarefa({ titulo: 'Um', prazo: '2026-09-16' }),
        tarefa({ titulo: 'Muitos', prazo: '2026-09-10' }),
      ],
    });
    const motivos = precisaDeVoce(b, HOJE).map((i) => i.motivo);
    expect(motivos).toContain('Atrasada há 1 dia');
    expect(motivos).toContain('Atrasada há 7 dias');
  });
});

describe('a saudação', () => {
  it('cobre as quatro faixas do dia', () => {
    expect(saudacao(3)).toBe('Boa noite'); // madrugada ainda é noite
    expect(saudacao(5)).toBe('Bom dia');
    expect(saudacao(11)).toBe('Bom dia');
    expect(saudacao(12)).toBe('Boa tarde');
    expect(saudacao(17)).toBe('Boa tarde');
    expect(saudacao(18)).toBe('Boa noite');
    expect(saudacao(23)).toBe('Boa noite');
  });
});

describe('a frase sobre o dia', () => {
  it('dia limpo diz que está limpo', () => {
    expect(comoEstaODia(banco(), HOJE)).toBe('Nada pendente. O dia está limpo.');
  });

  it('conta tudo, e não só o que cabe na lista', () => {
    // A frase resume o dia; a lista mostra os sete primeiros. Se a frase
    // parasse no limite, ela diria "7 coisas" num dia de vinte.
    const muitas = Array.from({ length: 20 }, (_, i) => tarefa({ titulo: `T${i}`, prazo: HOJE }));
    expect(comoEstaODia(banco({ tarefas: muitas }), HOJE)).toContain('20 coisas');
  });

  it('destaca atraso e hora marcada, com concordância', () => {
    const b = banco({
      tarefas: [
        tarefa({ titulo: 'Atrasada', prazo: '2026-09-10' }),
        tarefa({ titulo: 'Com hora', prazo: HOJE, hora: '09:00' }),
      ],
    });
    expect(comoEstaODia(b, HOJE)).toBe('2 coisas pedindo você · 1 atrasada · 1 com hora.');
  });

  it('uma coisa só concorda no singular', () => {
    const b = banco({ tarefas: [tarefa({ titulo: 'Só uma', prazo: HOJE })] });
    expect(comoEstaODia(b, HOJE)).toBe('1 coisa pedindo você.');
  });
});
