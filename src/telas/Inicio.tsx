import {
  Card,
  StatCard,
  Button,
  Badge,
  ProgressBar,
  Checkbox,
  Icon,
  DonutChart,
  BarChart,
  MetricBarList,
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import { CONTEXTOS, ROTULO_CONTEXTO, type Contexto } from '../dados/esquema';
import { tarefasDoDia, resumoTarefas } from '../dominio/tarefa';
import { LinhaTarefa } from './Tarefas';
import {
  agendaDoDia,
  progressoDoDia,
  sequencia,
  somarDias,
  descreverRecorrencia,
} from '../dominio/rotina';
import {
  formatarDataLonga,
  formatarDiaDaSemana,
  formatarPorcento,
  formatarNumero,
} from '../formato';
import { Link } from 'react-router-dom';
import { useLarguraDesktop } from '../casca/useLarguraDesktop';

/**
 * Início — a parte central.
 *
 * O dia de hoje em uma tela: quanto já foi cumprido, o que falta, como as duas
 * últimas semanas se comportaram, e como pessoal e profissional se dividem.
 *
 * Só usa componentes da biblioteca. Nenhum valor de cor, fonte, espaçamento ou
 * raio escrito à mão.
 */
/** Cresce para preencher no desktop, transborda em trilho no telefone. */
const ITEM_TRILHO = { flex: '1 0 var(--grid-min)', scrollSnapAlign: 'start' } as const;

export function Inicio() {
  const { banco, hoje, alternarExecucao, alternarTarefa } = useBanco();
  // A mesma decisão que a casca toma, pela mesma fonte: onde a casca serve o
  // telefone, o conteúdo é de uma coluna só. Duas colunas em 393px espremiam
  // a data a uma palavra por linha e faziam o Badge cavalgar o título.
  const desktop = useLarguraDesktop() !== false;

  const itens = agendaDoDia(banco, hoje);
  const feitas = itens.filter((i) => i.feita).length;
  const progresso = progressoDoDia(banco, hoje);
  const pendentes = itens.filter((i) => !i.feita);

  // Quatorze dias, do mais antigo para o mais novo, como o gráfico lê.
  const quinzena = Array.from({ length: 14 }, (_, i) => somarDias(hoje, i - 13));
  const serie = quinzena.map((d) => Math.round(progressoDoDia(banco, d) * 100));

  const tarefas = tarefasDoDia(banco, hoje);
  const resumo = resumoTarefas(banco, hoje);

  const melhorSequencia = banco.rotinas
    .filter((r) => !r.arquivada)
    .reduce((maior, r) => Math.max(maior, sequencia(banco, r, hoje)), 0);

  // Rotinas e tarefas juntas: o donut diz como o dia se divide entre pessoal e
  // profissional, e um dia com tarefa e sem rotina não pode aparecer vazio.
  const porContexto = CONTEXTOS.map((c: Contexto) => {
    const rotinasDoContexto = itens.filter((i) => i.rotina.contexto === c);
    const tarefasDoContexto = tarefas.filter((t) => t.contexto === c);
    return {
      contexto: c,
      total: rotinasDoContexto.length + tarefasDoContexto.length,
      feitas: rotinasDoContexto.filter((i) => i.feita).length,
    };
  });

  const temRotina = banco.rotinas.some((r) => !r.arquivada);
  const temTarefa = banco.tarefas.length > 0;

  if (!temRotina && !temTarefa) {
    return <PrimeiroUso />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      {/*
        Indicadores do dia.

        Um trilho, não uma grade. Cada tile pede --grid-min e cresce para
        preencher: no desktop os quatro cabem lado a lado e nada rola; no
        telefone eles transbordam e viram o trilho com snap que o DESIGN.md
        prescreve, em vez de empilharem e empurrarem o "Hoje" para fora da
        primeira tela. Sem media query e sem JavaScript — o próprio flex
        decide.
      */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--card-gap)',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          margin: '0 calc(-1 * var(--shell-gutter))',
          padding: '0 var(--shell-gutter)',
          scrollbarWidth: 'none',
        }}
      >
        <StatCard
          glow
          style={ITEM_TRILHO}
          icon="circle-check"
          value={`${feitas}/${itens.length}`}
          label="Rotinas cumpridas hoje"
        />
        <StatCard
          style={ITEM_TRILHO}
          icon="trending-up"
          value={formatarPorcento(progresso)}
          label="Do dia concluído"
          delta={progresso === 1 ? 'completo' : undefined}
        />
        <StatCard
          style={ITEM_TRILHO}
          icon="flame"
          value={formatarNumero(melhorSequencia)}
          label="Maior sequência em dias"
        />
        <StatCard
          style={ITEM_TRILHO}
          icon="clipboard-check"
          value={formatarNumero(resumo.pendentes)}
          label="Tarefas pendentes"
          delta={resumo.atrasadas > 0 ? `${resumo.atrasadas} atrasada${resumo.atrasadas > 1 ? 's' : ''}` : undefined}
          deltaTone="delay"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: desktop ? 'minmax(0, 1.75fr) minmax(0, 1fr)' : '1fr',
          gap: 'var(--card-gap)',
          alignItems: 'start',
        }}
      >
        {/* O que falta hoje */}
        <Card
          title="Hoje"
          subtitle={`${formatarDiaDaSemana(new Date())}, ${formatarDataLonga(new Date())}`}
          action={
            <Link to="/app/rotina" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" size="sm" iconRight="arrow-right">
                Ver rotinas
              </Button>
            </Link>
          }
        >
          <ProgressBar
            value={Math.round(progresso * 100)}
            valueLabel={formatarPorcento(progresso)}
            tone={progresso === 1 ? 'green' : 'purple'}
            style={{ marginBottom: 'var(--sp-9)' }}
          />

          {pendentes.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--sp-5)',
                padding: 'var(--sp-12) 0',
                textAlign: 'center',
              }}
            >
              <span style={{ color: 'var(--green-500)' }}>
                <Icon name="circle-check" size={28} />
              </span>
              <span
                style={{
                  font: 'var(--fw-medium) var(--fs-lg)/1.3 var(--font-core)',
                  color: 'var(--text-heading)',
                }}
              >
                Dia cumprido
              </span>
              <span style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>
                Nada pendente para hoje.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {pendentes.map(({ rotina }) => (
                <LinhaRotina
                  key={rotina.id}
                  titulo={rotina.titulo}
                  icone={rotina.icone}
                  detalhe={descreverRecorrencia(rotina.recorrencia)}
                  contexto={rotina.contexto}
                  feita={false}
                  aoAlternar={() => alternarExecucao(rotina.id, hoje)}
                />
              ))}
            </div>
          )}

          {feitas > 0 && (
            <details style={{ marginTop: 'var(--sp-9)' }}>
              <summary
                style={{
                  font: 'var(--type-body)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {feitas} já {feitas === 1 ? 'cumprida' : 'cumpridas'}
              </summary>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--sp-2)',
                  marginTop: 'var(--sp-5)',
                }}
              >
                {itens
                  .filter((i) => i.feita)
                  .map(({ rotina }) => (
                    <LinhaRotina
                      key={rotina.id}
                      titulo={rotina.titulo}
                      icone={rotina.icone}
                      detalhe={descreverRecorrencia(rotina.recorrencia)}
                      contexto={rotina.contexto}
                      feita
                      aoAlternar={() => alternarExecucao(rotina.id, hoje)}
                    />
                  ))}
              </div>
            </details>
          )}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
          {/* O que vence — atrasado e de hoje, nada além disso */}
          {tarefas.length > 0 && (
            <Card
              title="Vencendo"
              subtitle={`${tarefas.length} ${tarefas.length === 1 ? 'tarefa' : 'tarefas'}`}
              action={
                <Link to="/app/tarefas" style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" size="sm" iconRight="arrow-right">
                    Ver tarefas
                  </Button>
                </Link>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {tarefas.map((t) => (
                  <LinhaTarefa
                    key={t.id}
                    tarefa={t}
                    hoje={hoje}
                    aoAlternar={() => alternarTarefa(t.id)}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Pessoal x profissional */}
          <Card title="Pessoal e profissional" subtitle="Rotinas e tarefas de hoje">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--sp-10)',
              }}
            >
              <DonutChart
                size={150}
                thickness={24}
                centerValue={`${feitas}/${itens.length + tarefas.length}`}
                centerLabel="hoje"
                segments={porContexto.map((p, i) => ({
                  value: Math.max(p.total, 0.0001),
                  color: i === 0 ? 'var(--chart-1)' : 'var(--chart-2)',
                }))}
              />
              <MetricBarList
                style={{ width: '100%' }}
                items={porContexto.map((p, i) => ({
                  label: ROTULO_CONTEXTO[p.contexto],
                  value: p.total === 0 ? 0 : Math.round((p.feitas / p.total) * 100),
                  valueLabel: `${p.feitas}/${p.total}`,
                  tone: i === 0 ? 'purple' : 'green',
                }))}
              />
            </div>
          </Card>

          {/* Últimas duas semanas */}
          <Card title="Últimos 14 dias" subtitle="Quanto do dia foi cumprido">
            <BarChart
              height={140}
              data={serie}
              highlightIndex={13}
              valueLabel={formatarPorcento(progresso)}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function LinhaRotina({
  titulo,
  icone,
  detalhe,
  contexto,
  feita,
  aoAlternar,
}: {
  titulo: string;
  icone: string;
  detalhe: string;
  contexto: Contexto;
  feita: boolean;
  aoAlternar: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-6)',
        minHeight: 'var(--tap-min)',
        padding: 'var(--sp-4) var(--sp-5)',
        borderRadius: 'var(--r-nav)',
        transition: 'var(--t-hover)',
        background: feita ? 'var(--surface-hover)' : 'transparent',
      }}
    >
      {/* O título é o rótulo do Checkbox, não um irmão dele: assim clicar no
          texto alterna, e um leitor de tela anuncia a caixa com nome. */}
      <Checkbox
        checked={feita}
        onChange={aoAlternar}
        style={{ flex: 1, minWidth: 0, alignItems: 'center' }}
        label={
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-6)',
              minWidth: 0,
            }}
          >
            <span style={{ color: 'var(--text-muted)', display: 'flex', flex: '0 0 auto' }}>
              <Icon name={icone} size={18} />
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
                  color: 'var(--text-muted)',
                }}
              >
                {detalhe}
              </span>
            </span>
          </span>
        }
      />
      <Badge tone={contexto === 'pessoal' ? 'ontime' : 'delivered'} dot={false}>
        {ROTULO_CONTEXTO[contexto]}
      </Badge>
    </div>
  );
}

function PrimeiroUso() {
  return (
    <Card style={{ minHeight: 320 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--sp-8)',
          minHeight: 300,
          textAlign: 'center',
          padding: 'var(--sp-9)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--surface-raised)',
            border: 'var(--bw-hairline) solid var(--border-hairline)',
            color: 'var(--purple-300)',
          }}
        >
          <Icon name="repeat" size={24} />
        </span>
        <div>
          <h3 style={{ font: 'var(--type-card-title)', color: 'var(--text-heading)' }}>
            Nada cadastrado ainda
          </h3>
          <p
            style={{
              font: 'var(--type-body)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
              maxWidth: 420,
              lineHeight: 'var(--lh-normal)',
            }}
          >
            O Início mostra o dia de hoje assim que existir uma rotina ou uma tarefa. Comece
            por uma só — a rotina que você já faz e quer parar de esquecer, ou aquela tarefa
            que está pendurada.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/app/rotina" style={{ textDecoration: 'none' }}>
            <Button variant="primary" iconRight="plus">
              Criar uma rotina
            </Button>
          </Link>
          <Link to="/app/tarefas" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" iconRight="plus">
              Criar uma tarefa
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
