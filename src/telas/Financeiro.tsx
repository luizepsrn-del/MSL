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
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import {
  CATEGORIAS,
  CONTEXTOS,
  ROTULO_CATEGORIA,
  ROTULO_CONTEXTO,
  type Categoria,
  type Contexto,
  type TipoLancamento,
} from '../dados/esquema';
import {
  lancamentosDoMes,
  resumoFinanceiro,
  saidasPorCategoria,
  ordenarLancamentos,
} from '../dominio/financeiro';
import { mesVizinho, nomeDoMes, anoMesDe } from '../dominio/calendario';
import { diaValido } from '../dominio/rotina';
import { formatarMoeda, lerMoeda, formatarData } from '../formato';
import { useLarguraDesktop } from '../casca/useLarguraDesktop';

/** As cinco cores de série do sistema, na ordem de importância do DESIGN.md. */
const CORES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
const TONS = ['purple', 'green', 'orange', 'neutral', 'neutral'] as const;

/** Financeiro — entradas, saídas e o saldo que já é, contra o que ainda vai ser. */
export function Financeiro() {
  const { banco, hoje, criarLancamento, removerLancamento } = useBanco();
  const desktop = useLarguraDesktop() !== false;

  const [anoHoje, mesHoje] = anoMesDe(hoje);
  const [[ano, mes], setMes] = React.useState<[number, number]>([anoHoje, mesHoje]);
  const [criando, setCriando] = React.useState(false);

  const doMes = lancamentosDoMes(banco, ano, mes);
  const resumo = resumoFinanceiro(doMes, hoje);
  const categorias = saidasPorCategoria(doMes).slice(0, 5);
  const lista = ordenarLancamentos(doMes);
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
          gridTemplateColumns: desktop ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : '1fr',
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
              {lista.map((l) => {
                const futuro = l.data > hoje;
                const entrada = l.tipo === 'entrada';
                return (
                  <div
                    key={l.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
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

                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                          color: 'var(--text-body)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
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
                        {formatarData(new Date(`${l.data}T12:00:00Z`))} ·{' '}
                        {ROTULO_CATEGORIA[l.categoria]}
                        {futuro ? ' · previsto' : ''}
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

                    <IconButton
                      icon="trash-2"
                      label={`Remover ${l.descricao}`}
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

        <Card title="Para onde foi" subtitle="Saídas do mês por categoria">
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

      <FormularioLancamento
        aberto={criando}
        hoje={hoje}
        aoFechar={() => setCriando(false)}
        aoCriar={async (dados) => {
          await criarLancamento(dados);
          setCriando(false);
        }}
      />
    </div>
  );
}

const ITEM_TRILHO = { flex: '1 0 var(--grid-min)', scrollSnapAlign: 'start' } as const;

interface DadosNovos {
  descricao: string;
  valor: number;
  tipo: TipoLancamento;
  categoria: Categoria;
  contexto: Contexto;
  data: string;
}

function FormularioLancamento({
  aberto,
  hoje,
  aoFechar,
  aoCriar,
}: {
  aberto: boolean;
  hoje: string;
  aoFechar: () => void;
  aoCriar: (dados: DadosNovos) => Promise<void>;
}) {
  const [descricao, setDescricao] = React.useState('');
  const [valor, setValor] = React.useState('');
  const [tipo, setTipo] = React.useState<TipoLancamento>('saida');
  const [categoria, setCategoria] = React.useState<Categoria>('outros');
  const [contexto, setContexto] = React.useState<Contexto>('pessoal');
  const [data, setData] = React.useState(hoje);
  const [tentou, setTentou] = React.useState(false);

  React.useEffect(() => {
    if (!aberto) return;
    // Reseta TUDO, não só o que se digita.
    //
    // Sem isto o tipo, a categoria e o contexto ficavam pendurados do
    // lançamento anterior: quem registrasse uma entrada e depois uma saída
    // gravava duas entradas. O campo mostra o valor herdado, mas ninguém
    // relê um campo que não tocou — e em dinheiro esse erro custa caro.
    setDescricao('');
    setValor('');
    setTipo('saida');
    setCategoria('outros');
    setContexto('pessoal');
    setData(hoje);
    setTentou(false);
  }, [aberto, hoje]);

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
    await aoCriar({
      descricao: descricao.trim(),
      valor: centavos,
      tipo,
      categoria,
      contexto,
      data,
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
            Novo lançamento
          </h2>
          <p
            style={{
              font: 'var(--type-page-subtitle)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
            }}
          >
            Data futura vira previsão, e não entra no saldo realizado
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={aoFechar}>
            Cancelar
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={enviar}>
            Lançar
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
      </div>
    </Modal>
  );
}
