import { describe, it, expect } from 'vitest';
import {
  diaValido,
  diasNoMes,
  diaDaSemana,
  distanciaEmDias,
  somarDias,
  deveOcorrerEm,
  ocorrenciasEntre,
  agendaDoDia,
  sequencia,
  progressoDoDia,
  descreverRecorrencia,
  descreverRotina,
} from './rotina';
import { bancoVazio, type Rotina, type Execucao, type Recorrencia } from '../dados/esquema';

function rotina(recorrencia: Recorrencia, extras: Partial<Rotina> = {}): Rotina {
  return {
    id: 'r1',
    criadoEm: '2026-01-01T00:00:00.000Z',
    alteradoEm: '2026-01-01T00:00:00.000Z',
    titulo: 'Rotina',
    contexto: 'pessoal',
    icone: 'repeat',
    inicioEm: '2026-01-01',
    arquivada: false,
    recorrencia,
    ...extras,
  };
}

function execucao(rotinaId: string, dia: string): Execucao {
  return {
    id: `e-${rotinaId}-${dia}`,
    criadoEm: `${dia}T12:00:00.000Z`,
    alteradoEm: `${dia}T12:00:00.000Z`,
    rotinaId,
    dia,
  };
}

describe('aritmética de dias', () => {
  it('reconhece dia que não existe', () => {
    expect(diaValido('2026-01-31')).toBe(true);
    expect(diaValido('2026-02-30')).toBe(false);
    expect(diaValido('2026-13-01')).toBe(false);
    expect(diaValido('03/01/2026')).toBe(false);
  });

  it('sabe quantos dias tem o mês, inclusive em ano bissexto', () => {
    expect(diasNoMes(2026, 2)).toBe(28);
    expect(diasNoMes(2028, 2)).toBe(29); // bissexto
    expect(diasNoMes(2026, 4)).toBe(30);
    expect(diasNoMes(2026, 12)).toBe(31);
  });

  it('dá o dia da semana com domingo em zero', () => {
    expect(diaDaSemana('2026-01-04')).toBe(0); // domingo
    expect(diaDaSemana('2026-01-05')).toBe(1); // segunda
    expect(diaDaSemana('2026-01-03')).toBe(6); // sábado
  });

  it('soma dias atravessando mês e ano', () => {
    expect(somarDias('2026-01-31', 1)).toBe('2026-02-01');
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(somarDias('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('não escorrega no horário de verão', () => {
    // O Brasil não tem horário de verão hoje, mas a aritmética não pode
    // depender disso: tudo passa por UTC e por data de calendário.
    expect(distanciaEmDias('2026-10-17', '2026-10-18')).toBe(1);
    expect(distanciaEmDias('2026-02-14', '2026-02-24')).toBe(10);
    expect(distanciaEmDias('2026-02-24', '2026-02-14')).toBe(-10);
  });
});

describe('recorrência diária', () => {
  const r = rotina({ tipo: 'diaria' });

  it('ocorre todo dia a partir do início', () => {
    expect(deveOcorrerEm(r, '2026-01-01')).toBe(true);
    expect(deveOcorrerEm(r, '2026-06-15')).toBe(true);
  });

  it('não ocorre antes do início', () => {
    expect(deveOcorrerEm(r, '2025-12-31')).toBe(false);
  });

  it('não ocorre se estiver arquivada', () => {
    expect(deveOcorrerEm(rotina({ tipo: 'diaria' }, { arquivada: true }), '2026-01-05')).toBe(
      false,
    );
  });
});

describe('recorrência semanal', () => {
  const uteis = rotina({ tipo: 'semanal', dias: [1, 2, 3, 4, 5] });

  it('ocorre nos dias escolhidos e só neles', () => {
    expect(deveOcorrerEm(uteis, '2026-01-05')).toBe(true); // segunda
    expect(deveOcorrerEm(uteis, '2026-01-09')).toBe(true); // sexta
    expect(deveOcorrerEm(uteis, '2026-01-10')).toBe(false); // sábado
    expect(deveOcorrerEm(uteis, '2026-01-11')).toBe(false); // domingo
  });

  it('atravessa a virada de semana sem pular', () => {
    const dias = ocorrenciasEntre(uteis, '2026-01-05', '2026-01-18');
    expect(dias).toHaveLength(10); // duas semanas de dias úteis
    expect(dias).toContain('2026-01-12'); // a segunda da semana seguinte
  });
});

describe('recorrência mensal', () => {
  it('ocorre no dia escolhido', () => {
    const r = rotina({ tipo: 'mensal', diaDoMes: 10 });
    expect(deveOcorrerEm(r, '2026-01-10')).toBe(true);
    expect(deveOcorrerEm(r, '2026-01-11')).toBe(false);
    expect(deveOcorrerEm(r, '2026-02-10')).toBe(true);
  });

  it('dia 31 cai no último dia do mês curto, em vez de sumir', () => {
    // É o caso que quebra a maioria das implementações: uma rotina mensal
    // marcada para 31 precisa acontecer em fevereiro também.
    const r = rotina({ tipo: 'mensal', diaDoMes: 31 });
    expect(deveOcorrerEm(r, '2026-01-31')).toBe(true);
    expect(deveOcorrerEm(r, '2026-02-28')).toBe(true); // fevereiro comum
    expect(deveOcorrerEm(r, '2026-04-30')).toBe(true); // abril tem 30
    expect(deveOcorrerEm(r, '2026-04-29')).toBe(false);
  });

  it('em ano bissexto cai no 29', () => {
    const r = rotina({ tipo: 'mensal', diaDoMes: 31 }, { inicioEm: '2028-01-01' });
    expect(deveOcorrerEm(r, '2028-02-29')).toBe(true);
    expect(deveOcorrerEm(r, '2028-02-28')).toBe(false);
  });

  it('ocorre uma vez por mês, nunca duas', () => {
    const r = rotina({ tipo: 'mensal', diaDoMes: 31 });
    const dias = ocorrenciasEntre(r, '2026-01-01', '2026-12-31');
    expect(dias).toHaveLength(12);
  });
});

describe('recorrência por intervalo', () => {
  const r = rotina({ tipo: 'intervalo', aCadaDias: 3 }, { inicioEm: '2026-01-01' });

  it('conta a partir do início da rotina', () => {
    expect(deveOcorrerEm(r, '2026-01-01')).toBe(true);
    expect(deveOcorrerEm(r, '2026-01-02')).toBe(false);
    expect(deveOcorrerEm(r, '2026-01-04')).toBe(true);
    expect(deveOcorrerEm(r, '2026-01-07')).toBe(true);
  });

  it('mantém a âncora ao virar o mês', () => {
    // Se o intervalo fosse ancorado no calendário e não no início, ele
    // saltaria aqui. 2026-01-31 é 30 dias depois do início: 30 % 3 === 0.
    expect(deveOcorrerEm(r, '2026-01-31')).toBe(true);
    expect(deveOcorrerEm(r, '2026-02-03')).toBe(true);
    expect(deveOcorrerEm(r, '2026-02-04')).toBe(false);
  });

  it('recusa intervalo inválido em vez de dividir por zero', () => {
    expect(deveOcorrerEm(rotina({ tipo: 'intervalo', aCadaDias: 0 }), '2026-01-05')).toBe(false);
  });
});

describe('agenda e progresso do dia', () => {
  const banco = {
    ...bancoVazio(),
    rotinas: [
      rotina({ tipo: 'diaria' }, { id: 'r1', titulo: 'Ler' }),
      rotina({ tipo: 'semanal', dias: [1] }, { id: 'r2', titulo: 'Planejar a semana' }),
      rotina({ tipo: 'diaria' }, { id: 'r3', titulo: 'Arquivada', arquivada: true }),
    ],
    execucoes: [execucao('r1', '2026-01-05')],
  };

  it('lista só o que ocorre no dia, sem as arquivadas', () => {
    const segunda = agendaDoDia(banco, '2026-01-05');
    expect(segunda.map((i) => i.rotina.id)).toEqual(['r1', 'r2']);

    const terca = agendaDoDia(banco, '2026-01-06');
    expect(terca.map((i) => i.rotina.id)).toEqual(['r1']);
  });

  it('marca o que já foi feito', () => {
    const segunda = agendaDoDia(banco, '2026-01-05');
    expect(segunda.find((i) => i.rotina.id === 'r1')!.feita).toBe(true);
    expect(segunda.find((i) => i.rotina.id === 'r2')!.feita).toBe(false);
  });

  it('calcula o progresso do dia', () => {
    expect(progressoDoDia(banco, '2026-01-05')).toBe(0.5); // 1 de 2
    expect(progressoDoDia(banco, '2026-01-06')).toBe(0); // 0 de 1
  });

  it('um dia sem rotina nenhuma está completo, não zerado', () => {
    // Senão o painel mostraria 0% num domingo em que nada era para acontecer.
    const so_segunda = {
      ...bancoVazio(),
      rotinas: [rotina({ tipo: 'semanal', dias: [1] })],
    };
    expect(progressoDoDia(so_segunda, '2026-01-04')).toBe(1);
  });
});

describe('sequência', () => {
  const r = rotina({ tipo: 'diaria' }, { id: 'r1', inicioEm: '2026-01-01' });

  it('conta dias seguidos cumpridos', () => {
    const banco = {
      ...bancoVazio(),
      rotinas: [r],
      execucoes: ['2026-01-03', '2026-01-04', '2026-01-05'].map((d) => execucao('r1', d)),
    };
    expect(sequencia(banco, r, '2026-01-05')).toBe(3);
  });

  it('quebra quando um dia devido foi pulado', () => {
    const banco = {
      ...bancoVazio(),
      rotinas: [r],
      execucoes: ['2026-01-03', '2026-01-05'].map((d) => execucao('r1', d)),
    };
    expect(sequencia(banco, r, '2026-01-05')).toBe(1);
  });

  it('o dia de hoje ainda não feito não quebra a sequência', () => {
    // O dia não acabou. Zerar a sequência às 8h da manhã seria punir por nada.
    const banco = {
      ...bancoVazio(),
      rotinas: [r],
      execucoes: ['2026-01-03', '2026-01-04'].map((d) => execucao('r1', d)),
    };
    expect(sequencia(banco, r, '2026-01-05')).toBe(2);
  });

  it('pular um dia em que ela não ocorre não quebra nada', () => {
    // Uma rotina de dias úteis não perde a sequência por causa do domingo.
    const uteis = rotina({ tipo: 'semanal', dias: [1, 2, 3, 4, 5] }, { id: 'r1' });
    const banco = {
      ...bancoVazio(),
      rotinas: [uteis],
      execucoes: ['2026-01-08', '2026-01-09', '2026-01-12'].map((d) => execucao('r1', d)),
    };
    // quinta, sexta, (sábado e domingo não contam), segunda
    expect(sequencia(banco, uteis, '2026-01-12')).toBe(3);
  });

  it('sem execução nenhuma a sequência é zero', () => {
    expect(sequencia({ ...bancoVazio(), rotinas: [r] }, r, '2026-01-05')).toBe(0);
  });
});

describe('descrição da recorrência', () => {
  it('descreve em português, sem frase solta na tela', () => {
    expect(descreverRecorrencia({ tipo: 'diaria' })).toBe('Todo dia');
    expect(descreverRecorrencia({ tipo: 'semanal', dias: [1, 2, 3, 4, 5] })).toBe(
      'De segunda a sexta',
    );
    expect(descreverRecorrencia({ tipo: 'semanal', dias: [0, 6] })).toBe('Fim de semana');
    expect(descreverRecorrencia({ tipo: 'semanal', dias: [3] })).toBe('quarta');
    expect(descreverRecorrencia({ tipo: 'mensal', diaDoMes: 10 })).toBe('Todo dia 10 do mês');
    expect(descreverRecorrencia({ tipo: 'intervalo', aCadaDias: 3 })).toBe('A cada 3 dias');
    expect(descreverRecorrencia({ tipo: 'intervalo', aCadaDias: 1 })).toBe('Todo dia');
  });
});

describe('descrever a rotina inteira', () => {
  const base = {
    id: 'r1',
    criadoEm: 'x',
    alteradoEm: 'x',
    titulo: 'Academia',
    contexto: 'pessoal' as const,
    icone: 'dumbbell',
    inicioEm: '2026-01-01',
    arquivada: false,
  };

  it('junta a recorrência e a hora', () => {
    expect(descreverRotina({ ...base, recorrencia: { tipo: 'diaria' }, hora: '07:00' })).toBe(
      'Todo dia · 07:00',
    );
  });

  it('sem hora, é só a recorrência', () => {
    expect(descreverRotina({ ...base, recorrencia: { tipo: 'diaria' } })).toBe('Todo dia');
  });
});
