import React from 'react';
import {
  Card,
  Button,
  Badge,
  Icon,
  IconButton,
  StatCard,
  DonutChart,
  MetricBarList,
  Field,
  TextInput,
  Select,
  Modal,
  LineChart,
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import {
  CATEGORIAS,
  CONTEXTOS,
  ROTULO_CATEGORIA,
  ROTULO_CONTEXTO,
  ROTULO_PERIODO,
  type Categoria,
  type Contexto,
  type TipoLancamento,
  type PeriodoRecorrencia,
  type RecorrenciaLancamento,
  type Lancamento,
} from '../dados/esquema';
import {
  resumoFinanceiro,
  saidasPorCategoria,
  realizados,
  ocorrenciasDoMes,
  ordenarOcorrencias,
  evolucaoMensal,
  lancamentosRecorrentes,
  comprometidoPorMes,
} from '../dominio/financeiro';
import { mesVizinho, nomeDoMes, anoMesDe } from '../dominio/calendario';
import { diaValido } from '../dominio/rotina';
import { formatarMoeda, formatarMoedaCompacta, lerMoeda, formatarData } from '../formato';
import { useLarguraDesktop } from '../casca/useLarguraDesktop';

/** As cinco cores de série do sistema, na ordem de importância do DESIGN.md. */
const CORES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
const TONS = ['purple', 'green', 'orange', 'neutral', 'neutral'] as const;

/** Financeiro — entradas, saídas e o saldo que já é, contra o que ainda vai ser. */
export function Financeiro() {
  const { banco, hoje, criarLancamento, editarLancamento, removerLancamento } = useBanco();
  const desktop = useLarguraDesktop() !== false;

  const [anoHoje, mesHoje] = anoMesDe(hoje);
  const [[ano, mes], setMes] = React.useState<[number, number]>([anoHoje, mesHoje]);
  const [criando, setCriando] = React.useState(false);
  /** o lançamento aberto para correção, ou null */
  const [corrigindo, setCorrigindo] = React.useState<Lancamento | null>(null);

  // Ocorrências, não lançamentos: o que se repete aparece no mês em que cai,
  // sem eu relançar. A repetição é derivada — guardar doze aluguéis criaria
  // doze registros que envelhecem juntos.
  const ocorrencias = ocorrenciasDoMes(banco, ano, mes);
  const lista = ordenarOcorrencias(ocorrencias);
  // Para as contas, cada ocorrência vale como um lançamento na data dela.
  const doMes = ocorrencias.map((o) => ({ ...o.lancamento, data: o.data }));
  const resumo = resumoFinanceiro(doMes, hoje);

  const evolucao = evolucaoMensal(banco, ano, mes, 6);
  const recorrentes = lancamentosRecorrentes(banco);
  const comprometido = comprometidoPorMes(banco);

  // Só o realizado, e todas as categorias.
  //
  // Duas coisas que estavam erradas juntas: incluir o previsto fazia os
  // segmentos somarem mais que o total escrito no centro — o gráfico mentia
  // sobre a própria soma. E cortar no quinto fazia categorias sumirem do donut
  // e da lista sem nenhum aviso, o que esconde gasto em vez de mostrar.
  const categorias = saidasPorCategoria(realizados(doMes, hoje));
  const noMesAtual = ano === anoHoje && mes === mesHoje;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <Card>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-8)',
            flexWrap: 'wrap',
          }}
        >
          <strong
            style={{
              font: 'var(--fw-medium) var(--fs-lg)/1 var(--font-core)',
              color: 'var(--text-heading)',
            }}
          >
            {nomeDoMes(ano, mes)}
          </strong>
          {!noMesAtual && (
            <Button variant="secondary" size="sm" onClick={() => setMes([anoHoje, mesHoje])}>
              Mês atual
            </Button>
          )}
          <span style={{ display: 'flex', gap: 'var(--sp-4)' }}>
            <IconButton
              icon="chevron-left"
              label="Mês anterior"
              variant="ghost"
              size={34}
              onClick={() => setMes(mesVizinho(ano, mes, -1))}
            />
            <IconButton
              icon="chevron-right"
              label="Próximo mês"
              variant="ghost"
              size={34}
              onClick={() => setMes(mesVizinho(ano, mes, 1))}
            />
          </span>
          <Button
            variant="primary"
            iconRight="plus"
            onClick={() => setCriando(true)}
            style={{ marginLeft: 'auto' }}
          >
            Novo lançamento
          </Button>
        </div>
      </Card>

      {/* Indicadores: o que já é, e o que ainda vai ser */}
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
          icon="wallet"
          value={formatarMoeda(resumo.saldoRealizado)}
          label="Saldo realizado"
          delta={resumo.saldoRealizado >= 0 ? undefined : 'no vermelho'}
          deltaTone="danger"
        />
        <StatCard
          style={ITEM_TRILHO}
          icon="trending-up"
          value={formatarMoeda(resumo.entradas)}
          label="Entradas no mês"
        />
        <StatCard
          style={ITEM_TRILHO}
          icon="trending-down"
          value={formatarMoeda(resumo.saidas)}
          label="Saídas no mês"
        />
        <StatCard
          style={ITEM_TRILHO}
          icon="calendar-clock"
          value={formatarMoeda(resumo.saldoPrevisto)}
          label="Saldo previsto no fim do mês"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: desktop ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
          gap: 'var(--card-gap)',
          alignItems: 'start',
        }}
      >
        <Card
          title="Entradas e saídas"
          // O saldo mora aqui, e não num balão sobre o último ponto: o balão
          // do último mês fica meio para fora da borda do cartão.
          subtitle={`Os seis meses até aqui · saldo de ${MESES_CURTOS[mes - 1]}: ${formatarMoeda(
            evolucao[evolucao.length - 1].saldo,
          )}`}
        >
          <LineChart
            height={220}
            labels={evolucao.map((p) => MESES_CURTOS[p.mes - 1])}
            yTicks={ticksDe(evolucao)}
            highlightIndex={evolucao.length - 1}
            series={[
              { data: evolucao.map((p) => p.entradas), color: 'var(--chart-2)', label: 'Entradas' },
              { data: evolucao.map((p) => p.saidas), color: 'var(--chart-3)', label: 'Saídas' },
            ]}
          />
          <div
            style={{
              display: 'flex',
              gap: 'var(--sp-8)',
              flexWrap: 'wrap',
              marginTop: 'var(--sp-8)',
            }}
          >
            <Legenda cor="var(--chart-2)" texto="Entradas" />
            <Legenda cor="var(--chart-3)" texto="Saídas" />
          </div>
        </Card>

        <Card
          title="Todo mês"
          subtitle={
            recorrentes.length === 0
              ? 'Nada se repete ainda'
              : `${recorrentes.length} ${recorrentes.length === 1 ? 'lançamento repete' : 'lançamentos repetem'}`
          }
        >
          {recorrentes.length === 0 ? (
            <p
              style={{
                padding: 'var(--sp-12) 0',
                textAlign: 'center',
                font: 'var(--type-body)',
                color: 'var(--text-subtle)',
                lineHeight: 'var(--lh-normal)',
              }}
            >
              Marque um lançamento como repetido e ele aparece sozinho em todos os meses
              seguintes.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {recorrentes.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--sp-6)',
                      minHeight: 'var(--tap-min)',
                      padding: 'var(--sp-4) var(--sp-5)',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                          color: 'var(--text-body)',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {l.descricao}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          font: 'var(--type-body)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {ROTULO_PERIODO[l.recorrencia!.periodo]}
                        {l.recorrencia!.ate
                          ? ` · até ${formatarData(new Date(`${l.recorrencia!.ate}T12:00:00Z`))}`
                          : ''}
                      </span>
                    </span>
                    <span
                      style={{
                        font: 'var(--fw-medium) var(--fs-md)/1 var(--font-core)',
                        color: l.tipo === 'entrada' ? 'var(--green-500)' : 'var(--text-body)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {l.tipo === 'entrada' ? '+' : '−'}
                      {formatarMoeda(l.valor)}
                    </span>
                  </div>
                ))}
              </div>

              {/* O número que eu quero saber antes de assumir mais alguma coisa. */}
              <MetricBarList
                items={[
                  {
                    label: 'Entra todo mês',
                    value: 100,
                    valueLabel: formatarMoeda(comprometido.entradas),
                    tone: 'green',
                  },
                  {
                    label: 'Já comprometido',
                    value:
                      comprometido.entradas > 0
                        ? Math.min(
                            100,
                            Math.round((comprometido.saidas / comprometido.entradas) * 100),
                          )
                        : 100,
                    valueLabel: formatarMoeda(comprometido.saidas),
                    tone: comprometido.saidas > comprometido.entradas ? 'orange' : 'purple',
                  },
                ]}
              />
            </div>
          )}
        </Card>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: desktop ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
          gap: 'var(--card-gap)',
          alignItems: 'start',
        }}
      >
        <Card
          title="Lançamentos"
          subtitle={`${lista.length} ${lista.length === 1 ? 'lançamento' : 'lançamentos'}`}
        >
          {lista.length === 0 ? (
            <p
              style={{
                padding: 'var(--sp-14) 0',
                textAlign: 'center',
                font: 'var(--type-body)',
                color: 'var(--text-subtle)',
              }}
            >
              Nada lançado neste mês.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {lista.map((o) => {
                const l = o.lancamento;
                const futuro = o.data > hoje;
                const entrada = l.tipo === 'entrada';
                return (
                  <div
                    key={`${l.id}@${o.data}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      // Quebra em vez de espremer: com o lápis e a lixeira, a
                      // descrição chegava a zero de largura no telefone e
                      // sumia. Medido: 0px de largura para 163 de conteúdo.
                      flexWrap: 'wrap',
                      gap: 'var(--sp-6)',
                      minHeight: 'var(--tap-min)',
                      padding: 'var(--sp-4) var(--sp-5)',
                      borderRadius: 'var(--r-nav)',
                      // Previsto fica esmaecido: ainda não é dinheiro.
                      opacity: futuro ? 0.62 : 1,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        flex: '0 0 auto',
                        borderRadius: '50%',
                        background: 'var(--surface-raised)',
                        color: entrada ? 'var(--green-500)' : 'var(--text-muted)',
                      }}
                    >
                      <Icon name={entrada ? 'arrow-down' : 'arrow-up'} size={16} />
                    </span>

                    <span style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                          color: 'var(--text-body)',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {l.descricao}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          font: 'var(--type-body)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {formatarData(new Date(`${o.data}T12:00:00Z`))} ·{' '}
                        {ROTULO_CATEGORIA[l.categoria]}
                        {futuro ? ' · previsto' : ''}
                        {l.recorrencia ? ` · ${ROTULO_PERIODO[l.recorrencia.periodo].toLowerCase()}` : ''}
                      </span>
                    </span>

                    <span
                      style={{
                        font: 'var(--fw-medium) var(--fs-md)/1 var(--font-core)',
                        color: entrada ? 'var(--green-500)' : 'var(--text-body)',
                        whiteSpace: 'nowrap',
                        flex: '0 0 auto',
                      }}
                    >
                      {entrada ? '+' : '−'}
                      {formatarMoeda(l.valor)}
                    </span>

                    <Badge
                      tone={l.contexto === 'pessoal' ? 'ontime' : 'delivered'}
                      dot={false}
                    >
                      {ROTULO_CONTEXTO[l.contexto]}
                    </Badge>

                    {/* Não dá para apagar uma repetição sozinha: ela não
                        existe como registro. Apagar remove a série inteira, e
                        o rótulo diz isso antes do clique. */}
                    <IconButton
                      icon="pencil"
                      label={
                        l.recorrencia
                          ? `Corrigir ${l.descricao} e todas as repetições`
                          : `Corrigir ${l.descricao}`
                      }
                      variant="ghost"
                      size={34}
                      onClick={() => setCorrigindo(l)}
                    />

                    <IconButton
                      icon="trash-2"
                      label={
                        l.recorrencia
                          ? `Remover ${l.descricao} e todas as repetições`
                          : `Remover ${l.descricao}`
                      }
                      variant="ghost"
                      size={34}
                      onClick={() => removerLancamento(l.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Para onde foi" subtitle="Saídas já realizadas, por categoria">
          {categorias.length === 0 ? (
            <p
              style={{
                padding: 'var(--sp-12) 0',
                textAlign: 'center',
                font: 'var(--type-body)',
                color: 'var(--text-subtle)',
              }}
            >
              Nenhuma saída neste mês.
            </p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--sp-10)',
              }}
            >
              <DonutChart
                size={160}
                thickness={26}
                centerValue={formatarMoeda(resumo.saidas)}
                centerLabel="em saídas"
                segments={categorias.map((c, i) => ({
                  value: c.total,
                  color: CORES[i % CORES.length],
                }))}
              />
              <MetricBarList
                style={{ width: '100%' }}
                items={categorias.map((c, i) => ({
                  label: ROTULO_CATEGORIA[c.categoria],
                  value: Math.round(c.fracao * 100),
                  valueLabel: formatarMoeda(c.total),
                  tone: TONS[i % TONS.length],
                }))}
              />
            </div>
          )}
        </Card>
      </div>

      {criando && (
        <FormularioLancamento
          aberto
          hoje={hoje}
          aoFechar={() => setCriando(false)}
          aoEnviar={async (dados) => {
            await criarLancamento(dados);
            setCriando(false);
          }}
        />
      )}

      {corrigindo && (
        <FormularioLancamento
          aberto
          hoje={hoje}
          lancamento={corrigindo}
          aoFechar={() => setCorrigindo(null)}
          aoEnviar={async (dados) => {
            await editarLancamento(corrigindo.id, dados);
            setCorrigindo(null);
          }}
        />
      )}
    </div>
  );
}

const ITEM_TRILHO = { flex: '1 0 var(--grid-min)', scrollSnapAlign: 'start' } as const;

const MESES_CURTOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/**
 * Três marcas no eixo: o teto, o meio e o zero.
 *
 * O piso é de um real, e não de um centavo: com o teto em R$ 0,01 as três
 * marcas viravam "R$ 0,01", "R$ 0,01" e "R$ 0,00" — duas iguais, e o React
 * reclamava de chave repetida num mês sem nenhum lançamento.
 */
function ticksDe(pontos: { entradas: number; saidas: number }[]): string[] {
  const teto = Math.max(...pontos.flatMap((p) => [p.entradas, p.saidas]), 100);
  // Compacto: `R$ 11.300,00` na marca do eixo encosta na borda do cartão e
  // invade o desenho. Aqui o número é referência, não o assunto.
  return [
    formatarMoedaCompacta(teto),
    formatarMoedaCompacta(Math.round(teto / 2)),
    formatarMoedaCompacta(0),
  ];
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
      <span style={{ width: 10, height: 3, borderRadius: 'var(--r-pill)', background: cor }} />
      <span style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>{texto}</span>
    </span>
  );
}

interface DadosNovos {
  descricao: string;
  valor: number;
  tipo: TipoLancamento;
  categoria: Categoria;
  contexto: Contexto;
  data: string;
  recorrencia?: RecorrenciaLancamento;
}

/** Valor do Select quando o lançamento acontece uma vez só. */
const UMA_VEZ = 'uma-vez';

const PERIODOS: PeriodoRecorrencia[] = ['semanal', 'mensal', 'anual'];

/**
 * O formulário de lançamento, nos dois modos.
 *
 * Nada de efeito de limpeza: o estado nasce do registro, e quem o monta só o
 * monta quando aberto. O bug que o efeito existia para consertar — tipo e
 * categoria pendurados do lançamento anterior, transformando uma saída em
 * entrada — não volta, porque cada abertura é uma montagem nova.
 */
export function FormularioLancamento({
  aberto,
  hoje,
  lancamento,
  diaInicial,
  aoFechar,
  aoEnviar,
}: {
  aberto: boolean;
  hoje: string;
  lancamento?: Lancamento;
  /** a data com que um lançamento **novo** nasce; sem ela, hoje */
  diaInicial?: string;
  aoFechar: () => void;
  aoEnviar: (dados: DadosNovos) => Promise<void>;
}) {
  const corrigindo = !!lancamento;
  const [descricao, setDescricao] = React.useState(lancamento?.descricao ?? '');
  const [valor, setValor] = React.useState(
    lancamento ? (lancamento.valor / 100).toFixed(2).replace('.', ',') : '',
  );
  const [tipo, setTipo] = React.useState<TipoLancamento>(lancamento?.tipo ?? 'saida');
  const [categoria, setCategoria] = React.useState<Categoria>(lancamento?.categoria ?? 'outros');
  const [contexto, setContexto] = React.useState<Contexto>(lancamento?.contexto ?? 'pessoal');
  const [data, setData] = React.useState(lancamento?.data ?? diaInicial ?? hoje);
  const [repete, setRepete] = React.useState<string>(
    lancamento?.recorrencia?.periodo ?? UMA_VEZ,
  );
  const [tentou, setTentou] = React.useState(false);

  const centavos = lerMoeda(valor);
  const erroDescricao = tentou && descricao.trim() === '' ? 'Descreva o lançamento' : undefined;
  const erroValor =
    tentou && centavos === null
      ? 'Informe um valor'
      : tentou && centavos !== null && centavos <= 0
        ? 'O valor precisa ser maior que zero'
        : undefined;
  const erroData = tentou && !diaValido(data) ? 'Data inválida' : undefined;

  const enviar = async () => {
    setTentou(true);
    if (descricao.trim() === '' || centavos === null || centavos <= 0) return;
    if (!diaValido(data)) return;
    await aoEnviar({
      descricao: descricao.trim(),
      valor: centavos,
      tipo,
      categoria,
      contexto,
      data,
      recorrencia:
        repete === UMA_VEZ
          ? undefined
          : { periodo: repete as PeriodoRecorrencia },
    });
  };

  return (
    <Modal
      open={aberto}
      onClose={aoFechar}
      closeLabel="Fechar"
      width={560}
      header={
        <div>
          <h2
            style={{
              font: 'var(--fw-semibold) var(--fs-heading)/1.25 var(--font-core)',
              color: 'var(--text-heading)',
            }}
          >
            {corrigindo ? 'Corrigir lançamento' : 'Novo lançamento'}
          </h2>
          <p
            style={{
              font: 'var(--type-page-subtitle)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
            }}
          >
            {corrigindo
              ? 'O que estiver errado. O valor passa pela mesma conferência da entrada'
              : 'Data futura vira previsão. O que se repete aparece sozinho nos meses seguintes'}
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={aoFechar}>
            Cancelar
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={enviar}>
            {corrigindo ? 'Salvar' : 'Lançar'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
        <Field label="Descrição" htmlFor="fin-desc" required error={erroDescricao}>
          <TextInput
            id="fin-desc"
            value={descricao}
            onChange={setDescricao}
            placeholder="Aluguel"
            invalid={!!erroDescricao}
            size="lg"
            fullWidth
          />
        </Field>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min), 1fr))',
            gap: 'var(--sp-8)',
          }}
        >
          <Field
            label="Valor"
            htmlFor="fin-valor"
            required
            error={erroValor}
            help={centavos !== null && centavos > 0 ? formatarMoeda(centavos) : 'Ex.: 1.234,56'}
          >
            <TextInput
              id="fin-valor"
              type="money"
              value={valor}
              onChange={setValor}
              placeholder="0,00"
              invalid={!!erroValor}
              size="lg"
              fullWidth
            />
          </Field>

          <Field label="Tipo" htmlFor="fin-tipo">
            <Select
              id="fin-tipo"
              value={tipo}
              onChange={(v) => setTipo(v as TipoLancamento)}
              size="lg"
              fullWidth
              options={[
                { value: 'saida', label: 'Saída' },
                { value: 'entrada', label: 'Entrada' },
              ]}
            />
          </Field>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min), 1fr))',
            gap: 'var(--sp-8)',
          }}
        >
          <Field label="Categoria" htmlFor="fin-cat">
            <Select
              id="fin-cat"
              value={categoria}
              onChange={(v) => setCategoria(v as Categoria)}
              size="lg"
              fullWidth
              options={CATEGORIAS.map((c) => ({ value: c, label: ROTULO_CATEGORIA[c] }))}
            />
          </Field>

          <Field label="Contexto" htmlFor="fin-ctx">
            <Select
              id="fin-ctx"
              value={contexto}
              onChange={(v) => setContexto(v as Contexto)}
              size="lg"
              fullWidth
              options={CONTEXTOS.map((c) => ({ value: c, label: ROTULO_CONTEXTO[c] }))}
            />
          </Field>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min), 1fr))',
            gap: 'var(--sp-8)',
          }}
        >
          <Field
            label="Data"
            htmlFor="fin-data"
            error={erroData}
            help="Data futura vira previsão"
          >
            <TextInput
              id="fin-data"
              type="date"
              value={data}
              onChange={setData}
              invalid={!!erroData}
              size="lg"
              fullWidth
            />
          </Field>

          <Field
            label="Se repete"
            htmlFor="fin-repete"
            help="Lance uma vez; ele aparece nos meses seguintes sozinho"
          >
            <Select
              id="fin-repete"
              value={repete}
              onChange={setRepete}
              size="lg"
              fullWidth
              options={[
                { value: UMA_VEZ, label: 'Uma vez só' },
                ...PERIODOS.map((p) => ({ value: p, label: ROTULO_PERIODO[p] })),
              ]}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
