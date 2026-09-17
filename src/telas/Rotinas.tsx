import React from 'react';
import {
  Card,
  Button,
  Badge,
  Field,
  TextInput,
  Select,
  Checkbox,
  Icon,
  IconButton,
  Modal,
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import { CONTEXTOS, ROTULO_CONTEXTO, type Contexto, type Recorrencia } from '../dados/esquema';
import {
  DIAS_CURTOS,
  DIAS_DA_SEMANA,
  descreverRecorrencia,
  deveOcorrerEm,
  foiFeita,
  sequencia,
  diaValido,
} from '../dominio/rotina';
import { ordenarPor } from '../formato';

/** Rotina — a lista do que se repete, e o formulário para criar mais. */
export function Rotinas() {
  const { banco, hoje, criarRotina, arquivarRotina, alternarExecucao } = useBanco();
  const [criando, setCriando] = React.useState(false);

  const ativas = ordenarPor(
    banco.rotinas.filter((r) => !r.arquivada),
    (r) => r.titulo,
  );
  const deHoje = ativas.filter((r) => deveOcorrerEm(r, hoje));

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
            {deHoje.length} {deHoje.length === 1 ? 'rotina hoje' : 'rotinas hoje'}
          </strong>
          <span style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>
            de {ativas.length} {ativas.length === 1 ? 'ativa' : 'ativas'}
          </span>
          <Button
            variant="primary"
            iconRight="plus"
            onClick={() => setCriando(true)}
            style={{ marginLeft: 'auto' }}
          >
            Nova rotina
          </Button>
        </div>
      </Card>

      {ativas.length === 0 ? (
        <Card>
          <p
            style={{
              padding: 'var(--sp-14) var(--sp-8)',
              textAlign: 'center',
              font: 'var(--type-body)',
              color: 'var(--text-subtle)',
            }}
          >
            Nenhuma rotina ainda. Crie a primeira.
          </p>
        </Card>
      ) : (
        <Card flush bodyStyle={{ padding: 'var(--card-pad-lg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {ativas.map((r) => {
              const hojeTem = deveOcorrerEm(r, hoje);
              const feita = foiFeita(banco.execucoes, r.id, hoje);
              const seq = sequencia(banco, r, hoje);
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--sp-6)',
                    minHeight: 'var(--row-h)',
                    padding: 'var(--sp-5)',
                    borderRadius: 'var(--r-nav)',
                    background: hojeTem && feita ? 'var(--surface-hover)' : 'transparent',
                    opacity: hojeTem ? 1 : 0.62,
                  }}
                >
                  {(() => {
                    const descricao = (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--sp-6)',
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            color: 'var(--text-muted)',
                            display: 'flex',
                            flex: '0 0 auto',
                          }}
                        >
                          <Icon name={r.icone} size={18} />
                        </span>
                        <span style={{ minWidth: 0 }}>
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
                            {r.titulo}
                          </span>
                          <span
                            style={{
                              display: 'block',
                              font: 'var(--type-body)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {descreverRecorrencia(r.recorrencia)}
                            {!hojeTem && ' · não é hoje'}
                          </span>
                        </span>
                      </span>
                    );

                    // Quando é dia dela, o título é o rótulo da caixa — clicar
                    // no texto alterna e o leitor de tela anuncia com nome.
                    // Quando não é, não há caixa: um controle morto seria pior.
                    return hojeTem ? (
                      <Checkbox
                        checked={feita}
                        onChange={() => alternarExecucao(r.id, hoje)}
                        style={{ flex: 1, minWidth: 0, alignItems: 'center' }}
                        label={descricao}
                      />
                    ) : (
                      <span style={{ flex: 1, minWidth: 0, paddingLeft: 'var(--sp-9)' }}>
                        {descricao}
                      </span>
                    );
                  })()}

                  {seq > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        font: 'var(--fw-medium) var(--fs-body)/1 var(--font-core)',
                        color: 'var(--orange-500)',
                        flex: '0 0 auto',
                      }}
                      title={`${seq} dias seguidos`}
                    >
                      <Icon name="flame" size={14} />
                      {seq}
                    </span>
                  )}

                  <Badge tone={r.contexto === 'pessoal' ? 'ontime' : 'delivered'} dot={false}>
                    {ROTULO_CONTEXTO[r.contexto]}
                  </Badge>

                  <IconButton
                    icon="archive"
                    label={`Arquivar ${r.titulo}`}
                    variant="ghost"
                    size={34}
                    onClick={() => arquivarRotina(r.id)}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <FormularioRotina
        aberto={criando}
        aoFechar={() => setCriando(false)}
        aoCriar={async (dados) => {
          await criarRotina(dados);
          setCriando(false);
        }}
        hoje={hoje}
      />
    </div>
  );
}

interface DadosNovos {
  titulo: string;
  contexto: Contexto;
  icone: string;
  inicioEm: string;
  arquivada: boolean;
  recorrencia: Recorrencia;
}

const ICONES = [
  'repeat',
  'book-open',
  'dumbbell',
  'heart-pulse',
  'brain',
  'briefcase',
  'clipboard-check',
  'moon',
];

function FormularioRotina({
  aberto,
  aoFechar,
  aoCriar,
  hoje,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoCriar: (dados: DadosNovos) => Promise<void>;
  hoje: string;
}) {
  const [titulo, setTitulo] = React.useState('');
  const [contexto, setContexto] = React.useState<Contexto>('pessoal');
  const [tipo, setTipo] = React.useState<Recorrencia['tipo']>('diaria');
  const [dias, setDias] = React.useState<number[]>([1, 2, 3, 4, 5]);
  const [diaDoMes, setDiaDoMes] = React.useState('1');
  const [aCadaDias, setACadaDias] = React.useState('3');
  const [inicioEm, setInicioEm] = React.useState(hoje);
  const [icone, setIcone] = React.useState('repeat');
  const [tentou, setTentou] = React.useState(false);

  React.useEffect(() => {
    if (aberto) {
      setTitulo('');
      setTentou(false);
      setInicioEm(hoje);
    }
  }, [aberto, hoje]);

  const erroTitulo = tentou && titulo.trim() === '' ? 'Dê um nome à rotina' : undefined;
  const erroDias =
    tentou && tipo === 'semanal' && dias.length === 0 ? 'Escolha ao menos um dia' : undefined;
  const erroInicio = tentou && !diaValido(inicioEm) ? 'Data inválida' : undefined;

  const montarRecorrencia = (): Recorrencia => {
    switch (tipo) {
      case 'semanal':
        return { tipo: 'semanal', dias };
      case 'mensal':
        return { tipo: 'mensal', diaDoMes: Math.min(31, Math.max(1, Number(diaDoMes) || 1)) };
      case 'intervalo':
        return { tipo: 'intervalo', aCadaDias: Math.max(1, Number(aCadaDias) || 1) };
      default:
        return { tipo: 'diaria' };
    }
  };

  const enviar = async () => {
    setTentou(true);
    if (titulo.trim() === '' || !diaValido(inicioEm)) return;
    if (tipo === 'semanal' && dias.length === 0) return;

    await aoCriar({
      titulo: titulo.trim(),
      contexto,
      icone,
      inicioEm,
      arquivada: false,
      recorrencia: montarRecorrencia(),
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
            Nova rotina
          </h2>
          <p
            style={{
              font: 'var(--type-page-subtitle)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
            }}
          >
            O que se repete, e com que frequência
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={aoFechar}>
            Cancelar
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={enviar}>
            Criar rotina
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
        <Field label="O que é" htmlFor="rot-titulo" required error={erroTitulo}>
          <TextInput
            id="rot-titulo"
            value={titulo}
            onChange={setTitulo}
            placeholder="Ler 20 páginas"
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
          <Field label="Contexto" htmlFor="rot-contexto">
            <Select
              id="rot-contexto"
              value={contexto}
              onChange={(v) => setContexto(v as Contexto)}
              size="lg"
              fullWidth
              options={CONTEXTOS.map((c) => ({ value: c, label: ROTULO_CONTEXTO[c] }))}
            />
          </Field>

          <Field label="Frequência" htmlFor="rot-tipo">
            <Select
              id="rot-tipo"
              value={tipo}
              onChange={(v) => setTipo(v as Recorrencia['tipo'])}
              size="lg"
              fullWidth
              options={[
                { value: 'diaria', label: 'Todo dia' },
                { value: 'semanal', label: 'Dias da semana' },
                { value: 'mensal', label: 'Uma vez por mês' },
                { value: 'intervalo', label: 'A cada N dias' },
              ]}
            />
          </Field>
        </div>

        {tipo === 'semanal' && (
          <Field label="Em quais dias" htmlFor="rot-dias" error={erroDias}>
            <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
              {DIAS_CURTOS.map((curto, i) => {
                const ativo = dias.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={DIAS_DA_SEMANA[i]}
                    aria-pressed={ativo}
                    onClick={() =>
                      setDias((d) => (ativo ? d.filter((x) => x !== i) : [...d, i]))
                    }
                    style={{
                      width: 'var(--tap-min)',
                      height: 'var(--tap-min)',
                      borderRadius: 'var(--r-control)',
                      cursor: 'pointer',
                      border: `var(--bw-hairline) solid ${
                        ativo ? 'transparent' : 'var(--border-default)'
                      }`,
                      background: ativo ? 'var(--gradient-nav-active)' : 'transparent',
                      color: ativo ? 'var(--white)' : 'var(--text-muted)',
                      font: 'var(--fw-medium) var(--fs-md)/1 var(--font-core)',
                      transition: 'var(--t-hover)',
                    }}
                  >
                    {curto}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {tipo === 'mensal' && (
          <Field
            label="Dia do mês"
            htmlFor="rot-diames"
            help="Dia 31 cai no último dia dos meses mais curtos"
          >
            <TextInput
              id="rot-diames"
              type="number"
              value={diaDoMes}
              onChange={setDiaDoMes}
              size="lg"
            />
          </Field>
        )}

        {tipo === 'intervalo' && (
          <Field label="A cada quantos dias" htmlFor="rot-intervalo" help="Contando a partir do início">
            <TextInput
              id="rot-intervalo"
              type="number"
              value={aCadaDias}
              onChange={setACadaDias}
              size="lg"
            />
          </Field>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min), 1fr))',
            gap: 'var(--sp-8)',
          }}
        >
          <Field label="Começa em" htmlFor="rot-inicio" error={erroInicio}>
            <TextInput
              id="rot-inicio"
              type="date"
              value={inicioEm}
              onChange={setInicioEm}
              invalid={!!erroInicio}
              size="lg"
              fullWidth
            />
          </Field>

          <Field label="Ícone" htmlFor="rot-icone">
            <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
              {ICONES.map((nome) => (
                <IconButton
                  key={nome}
                  icon={nome}
                  label={nome}
                  size={38}
                  active={icone === nome}
                  onClick={() => setIcone(nome)}
                />
              ))}
            </div>
          </Field>
        </div>

        <p style={{ font: 'var(--type-body)', color: 'var(--text-subtle)' }}>
          Vai acontecer: {descreverRecorrencia(montarRecorrencia()).toLowerCase()}
        </p>
      </div>
    </Modal>
  );
}
