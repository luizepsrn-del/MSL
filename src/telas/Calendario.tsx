import React from 'react';
import { Card, Button, Badge, Icon, IconButton, Checkbox } from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import { ROTULO_CONTEXTO } from '../dados/esquema';
import {
  gradeDoMes,
  mesVizinho,
  itensDoDia,
  resumoDoDia,
  nomeDoMes,
  anoMesDe,
  CABECALHO_SEMANA,
} from '../dominio/calendario';
import { descreverRecorrencia } from '../dominio/rotina';
import { descreverPrazo, situacao } from '../dominio/tarefa';
import { formatarDataLonga, formatarDiaDaSemana } from '../formato';
import { useLarguraDesktop } from '../casca/useLarguraDesktop';

/**
 * Calendário — rotina e tarefa no tempo.
 *
 * Não tem dado próprio: lê a recorrência das rotinas e o prazo das tarefas.
 * Por isso mudar uma recorrência muda o passado e o futuro na hora, sem nada
 * para regenerar.
 */
export function Calendario() {
  const { banco, hoje, alternarExecucao, alternarTarefa } = useBanco();
  const desktop = useLarguraDesktop() !== false;

  const [anoHoje, mesHoje] = anoMesDe(hoje);
  const [[ano, mes], setMes] = React.useState<[number, number]>([anoHoje, mesHoje]);
  const [selecionado, setSelecionado] = React.useState(hoje);

  const grade = gradeDoMes(ano, mes);
  const detalhe = itensDoDia(banco, selecionado);
  const noMesAtual = ano === anoHoje && mes === mesHoje;

  const andar = (passo: number) => {
    const [a, m] = mesVizinho(ano, mes, passo);
    setMes([a, m]);
  };

  const irParaHoje = () => {
    setMes([anoHoje, mesHoje]);
    setSelecionado(hoje);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: desktop ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : '1fr',
          gap: 'var(--card-gap)',
          alignItems: 'start',
        }}
      >
        <Card
          title={nomeDoMes(ano, mes)}
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
              {!noMesAtual && (
                <Button variant="secondary" size="sm" onClick={irParaHoje}>
                  Hoje
                </Button>
              )}
              <IconButton
                icon="chevron-left"
                label="Mês anterior"
                variant="ghost"
                size={34}
                onClick={() => andar(-1)}
              />
              <IconButton
                icon="chevron-right"
                label="Próximo mês"
                variant="ghost"
                size={34}
                onClick={() => andar(1)}
              />
            </div>
          }
        >
          {/* Cabeçalho da semana */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 'var(--sp-2)',
              marginBottom: 'var(--sp-4)',
            }}
          >
            {CABECALHO_SEMANA.map((d, i) => (
              <span
                key={d}
                style={{
                  textAlign: 'center',
                  font: 'var(--type-body)',
                  color: i === 0 || i === 6 ? 'var(--text-subtle)' : 'var(--text-muted)',
                }}
              >
                {d}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {grade.map((semana) => (
              <div
                key={semana[0].dia}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: 'var(--sp-2)',
                }}
              >
                {semana.map(({ dia, doMes }) => (
                  <Celula
                    key={dia}
                    dia={dia}
                    doMes={doMes}
                    hoje={hoje}
                    selecionado={dia === selecionado}
                    resumo={resumoDoDia(banco, dia, hoje)}
                    aoEscolher={() => {
                      setSelecionado(dia);
                      const [a, m] = anoMesDe(dia);
                      if (a !== ano || m !== mes) setMes([a, m]);
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </Card>

        {/* O dia escolhido, por extenso */}
        <Card
          title={selecionado === hoje ? 'Hoje' : formatarDiaDaSemana(comoData(selecionado))}
          subtitle={formatarDataLonga(comoData(selecionado))}
        >
          {detalhe.rotinas.length === 0 && detalhe.tarefas.length === 0 ? (
            <p
              style={{
                padding: 'var(--sp-12) 0',
                textAlign: 'center',
                font: 'var(--type-body)',
                color: 'var(--text-subtle)',
              }}
            >
              Nada neste dia.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
              {detalhe.rotinas.length > 0 && (
                <Secao titulo="Rotinas">
                  {detalhe.rotinas.map(({ rotina, feita }) => (
                    <Linha
                      key={rotina.id}
                      icone={rotina.icone}
                      titulo={rotina.titulo}
                      detalhe={descreverRecorrencia(rotina.recorrencia)}
                      contexto={rotina.contexto}
                      feita={feita}
                      // Só dá para marcar o dia de hoje: marcar o passado ou o
                      // futuro registraria algo que não aconteceu.
                      aoAlternar={
                        selecionado === hoje
                          ? () => alternarExecucao(rotina.id, selecionado)
                          : undefined
                      }
                    />
                  ))}
                </Secao>
              )}

              {detalhe.tarefas.length > 0 && (
                <Secao titulo="Vencem neste dia">
                  {detalhe.tarefas.map((t) => (
                    <Linha
                      key={t.id}
                      icone="clipboard-check"
                      titulo={t.titulo}
                      detalhe={descreverPrazo(t, hoje)}
                      contexto={t.contexto}
                      feita={situacao(t, hoje) === 'concluida'}
                      atrasada={situacao(t, hoje) === 'atrasada'}
                      aoAlternar={() => alternarTarefa(t.id)}
                    />
                  ))}
                </Secao>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        style={{
          font: 'var(--fw-regular) var(--fs-micro)/1 var(--font-core)',
          color: 'var(--text-subtle)',
          letterSpacing: 'var(--ls-caps)',
          textTransform: 'uppercase',
          marginBottom: 'var(--sp-5)',
        }}
      >
        {titulo}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {children}
      </div>
    </div>
  );
}

function Celula({
  dia,
  doMes,
  hoje,
  selecionado,
  resumo,
  aoEscolher,
}: {
  dia: string;
  doMes: boolean;
  hoje: string;
  selecionado: boolean;
  resumo: ReturnType<typeof resumoDoDia>;
  aoEscolher: () => void;
}) {
  const ehHoje = dia === hoje;
  const numero = Number(dia.slice(8));
  const completo = resumo.rotinas > 0 && resumo.rotinasFeitas === resumo.rotinas;

  return (
    <button
      type="button"
      onClick={aoEscolher}
      aria-label={`Dia ${numero}`}
      aria-pressed={selecionado}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--sp-2)',
        minHeight: 'var(--tap-min)',
        padding: 'var(--sp-3) var(--sp-2)',
        cursor: 'pointer',
        borderRadius: 'var(--r-nav)',
        border: `var(--bw-hairline) solid ${
          selecionado ? 'var(--border-accent)' : 'transparent'
        }`,
        background: selecionado
          ? 'var(--accent-soft)'
          : ehHoje
            ? 'var(--surface-raised)'
            : 'transparent',
        opacity: doMes ? 1 : 0.35,
        transition: 'var(--t-hover)',
      }}
    >
      <span
        style={{
          font: `${ehHoje ? 'var(--fw-semibold)' : 'var(--fw-regular)'} var(--fs-md)/1 var(--font-core)`,
          color: ehHoje ? 'var(--purple-200)' : 'var(--text-body)',
        }}
      >
        {numero}
      </span>

      {/* Marcas do dia: uma por tipo, nunca um número que ninguém lê. */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 3, height: 6 }}>
        {resumo.rotinas > 0 && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: completo ? 'var(--green-500)' : 'var(--purple-400)',
            }}
          />
        )}
        {resumo.tarefas > 0 && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: resumo.temAtraso ? 'var(--orange-500)' : 'var(--ink-400)',
            }}
          />
        )}
      </span>
    </button>
  );
}

function Linha({
  icone,
  titulo,
  detalhe,
  contexto,
  feita,
  atrasada,
  aoAlternar,
}: {
  icone: string;
  titulo: string;
  detalhe: string;
  contexto: 'pessoal' | 'profissional';
  feita: boolean;
  atrasada?: boolean;
  aoAlternar?: () => void;
}) {
  const corpo = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-6)', minWidth: 0 }}>
      <span style={{ color: 'var(--text-muted)', display: 'flex', flex: '0 0 auto' }}>
        <Icon name={icone} size={16} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
            color: feita ? 'var(--text-muted)' : 'var(--text-body)',
            textDecoration: feita ? 'line-through' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {titulo}
        </span>
        <span
          style={{
            display: 'block',
            font: 'var(--type-body)',
            color: atrasada ? 'var(--orange-500)' : 'var(--text-muted)',
          }}
        >
          {detalhe}
        </span>
      </span>
    </span>
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-6)',
        minHeight: 'var(--tap-min)',
        padding: 'var(--sp-4) var(--sp-5)',
        borderRadius: 'var(--r-nav)',
        background: feita ? 'var(--surface-hover)' : 'transparent',
      }}
    >
      {aoAlternar ? (
        <Checkbox
          checked={feita}
          onChange={aoAlternar}
          style={{ flex: 1, minWidth: 0, alignItems: 'center' }}
          label={corpo}
        />
      ) : (
        <span style={{ flex: 1, minWidth: 0, paddingLeft: 'var(--sp-9)' }}>{corpo}</span>
      )}
      <Badge tone={contexto === 'pessoal' ? 'ontime' : 'delivered'} dot={false}>
        {ROTULO_CONTEXTO[contexto]}
      </Badge>
    </div>
  );
}

/** `AAAA-MM-DD` → Date no meio-dia UTC, longe de qualquer virada de fuso. */
function comoData(dia: string): Date {
  return new Date(`${dia}T12:00:00Z`);
}
