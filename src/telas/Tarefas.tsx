import React from 'react';
import {
  Card,
  Button,
  Badge,
  Checkbox,
  IconButton,
  Field,
  TextInput,
  Select,
  Modal,
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import { CONTEXTOS, ROTULO_CONTEXTO, type Contexto, type Tarefa } from '../dados/esquema';
import {
  ordenarTarefas,
  situacao,
  descreverPrazo,
  resumoTarefas,
  type Situacao,
} from '../dominio/tarefa';
import { diaValido } from '../dominio/rotina';

type Filtro = 'pendentes' | 'todas' | 'concluidas';

/** Tarefa — o que tem fim, com prazo quando faz sentido ter. */
export function Tarefas() {
  const { banco, hoje, criarTarefa, alternarTarefa, removerTarefa } = useBanco();
  const [criando, setCriando] = React.useState(false);
  const [filtro, setFiltro] = React.useState<Filtro>('pendentes');

  const resumo = resumoTarefas(banco, hoje);

  const visiveis = ordenarTarefas(
    banco.tarefas.filter((t) => {
      if (filtro === 'pendentes') return !t.concluidaEm;
      if (filtro === 'concluidas') return !!t.concluidaEm;
      return true;
    }),
    hoje,
  );

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
            {resumo.pendentes} {resumo.pendentes === 1 ? 'pendente' : 'pendentes'}
          </strong>

          {resumo.atrasadas > 0 && (
            <Badge tone="delay">
              {resumo.atrasadas} {resumo.atrasadas === 1 ? 'atrasada' : 'atrasadas'}
            </Badge>
          )}
          {resumo.paraHoje > 0 && <Badge tone="ontime">{resumo.paraHoje} para hoje</Badge>}

          <div style={{ minWidth: 170 }}>
            <Select
              id="tar-filtro"
              value={filtro}
              onChange={(v) => setFiltro(v as Filtro)}
              options={[
                { value: 'pendentes', label: 'Pendentes' },
                { value: 'todas', label: 'Todas' },
                { value: 'concluidas', label: 'Concluídas' },
              ]}
            />
          </div>

          <Button
            variant="primary"
            iconRight="plus"
            onClick={() => setCriando(true)}
            style={{ marginLeft: 'auto' }}
          >
            Nova tarefa
          </Button>
        </div>
      </Card>

      {visiveis.length === 0 ? (
        <Card>
          <p
            style={{
              padding: 'var(--sp-14) var(--sp-8)',
              textAlign: 'center',
              font: 'var(--type-body)',
              color: 'var(--text-subtle)',
            }}
          >
            {filtro === 'pendentes' && banco.tarefas.length > 0
              ? 'Nada pendente. Bom sinal.'
              : filtro === 'concluidas'
                ? 'Nada concluído ainda.'
                : 'Nenhuma tarefa ainda. Crie a primeira.'}
          </p>
        </Card>
      ) : (
        <Card flush bodyStyle={{ padding: 'var(--card-pad-lg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {visiveis.map((t) => (
              <LinhaTarefa
                key={t.id}
                tarefa={t}
                hoje={hoje}
                aoAlternar={() => alternarTarefa(t.id)}
                aoRemover={() => removerTarefa(t.id)}
              />
            ))}
          </div>
        </Card>
      )}

      <FormularioTarefa
        aberto={criando}
        aoFechar={() => setCriando(false)}
        aoCriar={async (dados) => {
          await criarTarefa(dados);
          setCriando(false);
        }}
      />
    </div>
  );
}

const TOM_SITUACAO: Record<Situacao, 'delay' | 'ontime' | 'delivered' | 'neutral'> = {
  atrasada: 'delay',
  hoje: 'ontime',
  futura: 'neutral',
  'sem-prazo': 'neutral',
  concluida: 'delivered',
};

export function LinhaTarefa({
  tarefa,
  hoje,
  aoAlternar,
  aoRemover,
}: {
  tarefa: Tarefa;
  hoje: string;
  aoAlternar: () => void;
  aoRemover?: () => void;
}) {
  const s = situacao(tarefa, hoje);
  const feita = s === 'concluida';

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
        transition: 'var(--t-hover)',
      }}
    >
      <Checkbox
        checked={feita}
        onChange={aoAlternar}
        style={{ flex: 1, minWidth: 0, alignItems: 'center' }}
        label={
          <span style={{ minWidth: 0, display: 'block' }}>
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
              {tarefa.titulo}
            </span>
            <span
              style={{
                display: 'block',
                font: 'var(--type-body)',
                color: s === 'atrasada' ? 'var(--orange-500)' : 'var(--text-muted)',
              }}
            >
              {descreverPrazo(tarefa, hoje)}
              {tarefa.anotacao ? ` · ${tarefa.anotacao}` : ''}
            </span>
          </span>
        }
      />

      {!feita && s !== 'sem-prazo' && s !== 'futura' && (
        <Badge tone={TOM_SITUACAO[s]}>{s === 'atrasada' ? 'Atrasada' : 'Hoje'}</Badge>
      )}

      <Badge tone={tarefa.contexto === 'pessoal' ? 'ontime' : 'delivered'} dot={false}>
        {ROTULO_CONTEXTO[tarefa.contexto]}
      </Badge>

      {aoRemover && (
        <IconButton
          icon="trash-2"
          label={`Remover ${tarefa.titulo}`}
          variant="ghost"
          size={34}
          onClick={aoRemover}
        />
      )}
    </div>
  );
}

interface DadosNovos {
  titulo: string;
  contexto: Contexto;
  prazo?: string;
  anotacao?: string;
}

function FormularioTarefa({
  aberto,
  aoFechar,
  aoCriar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoCriar: (dados: DadosNovos) => Promise<void>;
}) {
  const [titulo, setTitulo] = React.useState('');
  const [contexto, setContexto] = React.useState<Contexto>('pessoal');
  const [prazo, setPrazo] = React.useState('');
  const [anotacao, setAnotacao] = React.useState('');
  const [tentou, setTentou] = React.useState(false);

  React.useEffect(() => {
    if (aberto) {
      setTitulo('');
      setPrazo('');
      setAnotacao('');
      setTentou(false);
    }
  }, [aberto]);

  const erroTitulo = tentou && titulo.trim() === '' ? 'Dê um nome à tarefa' : undefined;
  const erroPrazo =
    tentou && prazo !== '' && !diaValido(prazo) ? 'Data inválida' : undefined;

  const enviar = async () => {
    setTentou(true);
    if (titulo.trim() === '') return;
    if (prazo !== '' && !diaValido(prazo)) return;

    await aoCriar({
      titulo: titulo.trim(),
      contexto,
      prazo: prazo === '' ? undefined : prazo,
      anotacao: anotacao.trim() === '' ? undefined : anotacao.trim(),
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
            Nova tarefa
          </h2>
          <p
            style={{
              font: 'var(--type-page-subtitle)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
            }}
          >
            O que tem fim. Prazo só quando faz sentido ter um
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={aoFechar}>
            Cancelar
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={enviar}>
            Criar tarefa
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
        <Field label="O que precisa ser feito" htmlFor="tar-titulo" required error={erroTitulo}>
          <TextInput
            id="tar-titulo"
            value={titulo}
            onChange={setTitulo}
            placeholder="Renovar o contrato"
            invalid={!!erroTitulo}
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
          <Field label="Contexto" htmlFor="tar-contexto">
            <Select
              id="tar-contexto"
              value={contexto}
              onChange={(v) => setContexto(v as Contexto)}
              size="lg"
              fullWidth
              options={CONTEXTOS.map((c) => ({ value: c, label: ROTULO_CONTEXTO[c] }))}
            />
          </Field>

          <Field
            label="Prazo"
            htmlFor="tar-prazo"
            help="Opcional — sem prazo é sem prazo, não atraso"
            error={erroPrazo}
          >
            <TextInput
              id="tar-prazo"
              type="date"
              value={prazo}
              onChange={setPrazo}
              invalid={!!erroPrazo}
              size="lg"
              fullWidth
            />
          </Field>
        </div>

        <Field label="Anotação" htmlFor="tar-nota" help="Opcional">
          <TextInput
            id="tar-nota"
            type="multiline"
            value={anotacao}
            onChange={setAnotacao}
            placeholder="O que mais eu preciso lembrar sobre isto"
            fullWidth
          />
        </Field>
      </div>
    </Modal>
  );
}
