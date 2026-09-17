import React from 'react';
import {
  Card,
  Button,
  Badge,
  Checkbox,
  Icon,
  IconButton,
  ProgressBar,
  Field,
  TextInput,
  Select,
  Modal,
  SuccessDialog,
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import { CONTEXTOS, ROTULO_CONTEXTO, type Contexto, type Projeto } from '../dados/esquema';
import {
  ordenarProjetos,
  progressoProjeto,
  situacaoProjeto,
  tarefasDoProjeto,
  tarefasSoltas,
  resumoProjetos,
  ROTULO_SITUACAO_PROJETO,
  type SituacaoProjeto,
} from '../dominio/projeto';
import { situacao, descreverPrazo } from '../dominio/tarefa';
import { diaValido } from '../dominio/rotina';
import { formatarPorcento } from '../formato';

const TOM: Record<SituacaoProjeto, 'delay' | 'ontime' | 'delivered' | 'neutral'> = {
  atrasado: 'delay',
  'em-andamento': 'ontime',
  concluido: 'delivered',
  vazio: 'neutral',
  arquivado: 'neutral',
};

/** Projetos — trabalho maior que uma tarefa. */
export function Projetos() {
  const { banco, hoje, criarProjeto, arquivarProjeto, removerProjeto, alternarTarefa } =
    useBanco();
  const [criando, setCriando] = React.useState(false);
  const [aRemover, setARemover] = React.useState<Projeto | null>(null);
  const [aberto, setAberto] = React.useState<string | null>(null);

  const resumo = resumoProjetos(banco, hoje);
  const projetos = ordenarProjetos(banco, hoje).filter((p) => !p.arquivadoEm);
  const soltas = tarefasSoltas(banco).filter((t) => !t.concluidaEm);

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
            {resumo.ativos} {resumo.ativos === 1 ? 'projeto ativo' : 'projetos ativos'}
          </strong>
          {resumo.atrasados > 0 && (
            <Badge tone="delay">
              {resumo.atrasados} {resumo.atrasados === 1 ? 'atrasado' : 'atrasados'}
            </Badge>
          )}
          {resumo.concluidos > 0 && (
            <Badge tone="delivered">{resumo.concluidos} concluídos</Badge>
          )}
          <Button
            variant="primary"
            iconRight="plus"
            onClick={() => setCriando(true)}
            style={{ marginLeft: 'auto' }}
          >
            Novo projeto
          </Button>
        </div>
      </Card>

      {projetos.length === 0 ? (
        <Card>
          <p
            style={{
              padding: 'var(--sp-14) var(--sp-8)',
              textAlign: 'center',
              font: 'var(--type-body)',
              color: 'var(--text-subtle)',
            }}
          >
            Nenhum projeto ainda. Um projeto agrupa tarefas que terminam juntas.
          </p>
        </Card>
      ) : (
        projetos.map((p) => (
          <CartaoProjeto
            key={p.id}
            projeto={p}
            hoje={hoje}
            expandido={aberto === p.id}
            aoExpandir={() => setAberto(aberto === p.id ? null : p.id)}
            aoArquivar={() => arquivarProjeto(p.id)}
            aoRemover={() => setARemover(p)}
            aoAlternarTarefa={alternarTarefa}
          />
        ))
      )}

      {soltas.length > 0 && (
        <Card
          title="Tarefas sem projeto"
          subtitle={`${soltas.length} ${soltas.length === 1 ? 'pendente' : 'pendentes'}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {soltas.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--sp-6)',
                  minHeight: 'var(--tap-min)',
                  padding: 'var(--sp-4) var(--sp-5)',
                }}
              >
                <span style={{ color: 'var(--text-muted)', display: 'flex' }}>
                  <Icon name="clipboard-check" size={16} />
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
                    {t.titulo}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      font: 'var(--type-body)',
                      color:
                        situacao(t, hoje) === 'atrasada'
                          ? 'var(--orange-500)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {descreverPrazo(t, hoje)}
                  </span>
                </span>
                <Badge tone={t.contexto === 'pessoal' ? 'ontime' : 'delivered'} dot={false}>
                  {ROTULO_CONTEXTO[t.contexto]}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <FormularioProjeto
        aberto={criando}
        aoFechar={() => setCriando(false)}
        aoCriar={async (dados) => {
          await criarProjeto(dados);
          setCriando(false);
        }}
      />

      <SuccessDialog
        open={!!aRemover}
        tone="danger"
        onClose={() => setARemover(null)}
        title={`Remover "${aRemover?.titulo}"?`}
        message="As tarefas dele não são apagadas — ficam soltas na lista de tarefas."
        actionLabel="Remover projeto"
        onAction={async () => {
          if (aRemover) await removerProjeto(aRemover.id);
          setARemover(null);
        }}
      />
    </div>
  );
}

function CartaoProjeto({
  projeto,
  hoje,
  expandido,
  aoExpandir,
  aoArquivar,
  aoRemover,
  aoAlternarTarefa,
}: {
  projeto: Projeto;
  hoje: string;
  expandido: boolean;
  aoExpandir: () => void;
  aoArquivar: () => void;
  aoRemover: () => void;
  aoAlternarTarefa: (id: string) => void;
}) {
  const { banco } = useBanco();
  const progresso = progressoProjeto(banco, projeto.id);
  const s = situacaoProjeto(banco, projeto, hoje);
  const tarefas = tarefasDoProjeto(banco, projeto.id);

  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--sp-6)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-5)',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  font: 'var(--fw-medium) var(--fs-lg)/1.2 var(--font-core)',
                  color: 'var(--text-heading)',
                }}
              >
                {projeto.titulo}
              </span>
              <Badge tone={TOM[s]}>{ROTULO_SITUACAO_PROJETO[s]}</Badge>
              <Badge
                tone={projeto.contexto === 'pessoal' ? 'ontime' : 'delivered'}
                dot={false}
              >
                {ROTULO_CONTEXTO[projeto.contexto]}
              </Badge>
            </span>
            {projeto.descricao && (
              <span
                style={{
                  display: 'block',
                  font: 'var(--type-body)',
                  color: 'var(--text-muted)',
                  marginTop: 'var(--sp-3)',
                  lineHeight: 'var(--lh-normal)',
                }}
              >
                {projeto.descricao}
              </span>
            )}
          </span>

          <span style={{ display: 'flex', gap: 'var(--sp-4)', flex: '0 0 auto' }}>
            <IconButton
              icon="archive"
              label={`Arquivar ${projeto.titulo}`}
              variant="ghost"
              size={34}
              onClick={aoArquivar}
            />
            <IconButton
              icon="trash-2"
              label={`Remover ${projeto.titulo}`}
              variant="ghost"
              size={34}
              onClick={aoRemover}
            />
          </span>
        </div>

        <ProgressBar
          value={Math.round(progresso.fracao * 100)}
          valueLabel={`${progresso.concluidas}/${progresso.total}`}
          tone={s === 'concluido' ? 'green' : s === 'atrasado' ? 'orange' : 'purple'}
          label={progresso.total === 0 ? 'Sem tarefas ainda' : formatarPorcento(progresso.fracao)}
        />

        {tarefas.length > 0 && (
          <div>
            <button
              type="button"
              onClick={aoExpandir}
              aria-expanded={expandido}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--sp-4)',
                minHeight: 'var(--control-h)',
                padding: 0,
                background: 'none',
                border: 0,
                cursor: 'pointer',
                font: 'var(--type-body)',
                color: 'var(--text-muted)',
              }}
            >
              <Icon name={expandido ? 'chevron-down' : 'chevron-right'} size={15} />
              {tarefas.length} {tarefas.length === 1 ? 'tarefa' : 'tarefas'}
            </button>

            {expandido && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--sp-2)',
                  marginTop: 'var(--sp-5)',
                }}
              >
                {tarefas.map((t) => {
                  const feita = !!t.concluidaEm;
                  return (
                    <div
                      key={t.id}
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
                      <Checkbox
                        checked={feita}
                        onChange={() => aoAlternarTarefa(t.id)}
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
                              {t.titulo}
                            </span>
                            <span
                              style={{
                                display: 'block',
                                font: 'var(--type-body)',
                                color:
                                  situacao(t, hoje) === 'atrasada'
                                    ? 'var(--orange-500)'
                                    : 'var(--text-muted)',
                              }}
                            >
                              {descreverPrazo(t, hoje)}
                            </span>
                          </span>
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

interface DadosNovos {
  titulo: string;
  contexto: Contexto;
  descricao?: string;
  prazo?: string;
}

function FormularioProjeto({
  aberto,
  aoFechar,
  aoCriar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoCriar: (dados: DadosNovos) => Promise<void>;
}) {
  const [titulo, setTitulo] = React.useState('');
  const [contexto, setContexto] = React.useState<Contexto>('profissional');
  const [descricao, setDescricao] = React.useState('');
  const [prazo, setPrazo] = React.useState('');
  const [tentou, setTentou] = React.useState(false);

  React.useEffect(() => {
    if (aberto) {
      setTitulo('');
      setDescricao('');
      setPrazo('');
      setTentou(false);
    }
  }, [aberto]);

  const erroTitulo = tentou && titulo.trim() === '' ? 'Dê um nome ao projeto' : undefined;
  const erroPrazo = tentou && prazo !== '' && !diaValido(prazo) ? 'Data inválida' : undefined;

  const enviar = async () => {
    setTentou(true);
    if (titulo.trim() === '') return;
    if (prazo !== '' && !diaValido(prazo)) return;
    await aoCriar({
      titulo: titulo.trim(),
      contexto,
      descricao: descricao.trim() === '' ? undefined : descricao.trim(),
      prazo: prazo === '' ? undefined : prazo,
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
            Novo projeto
          </h2>
          <p
            style={{
              font: 'var(--type-page-subtitle)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
            }}
          >
            Trabalho maior que uma tarefa, que termina quando as tarefas terminam
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={aoFechar}>
            Cancelar
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={enviar}>
            Criar projeto
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
        <Field label="Nome do projeto" htmlFor="proj-titulo" required error={erroTitulo}>
          <TextInput
            id="proj-titulo"
            value={titulo}
            onChange={setTitulo}
            placeholder="Reforma do escritório"
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
          <Field label="Contexto" htmlFor="proj-contexto">
            <Select
              id="proj-contexto"
              value={contexto}
              onChange={(v) => setContexto(v as Contexto)}
              size="lg"
              fullWidth
              options={CONTEXTOS.map((c) => ({ value: c, label: ROTULO_CONTEXTO[c] }))}
            />
          </Field>

          <Field label="Prazo" htmlFor="proj-prazo" help="Opcional" error={erroPrazo}>
            <TextInput
              id="proj-prazo"
              type="date"
              value={prazo}
              onChange={setPrazo}
              invalid={!!erroPrazo}
              size="lg"
              fullWidth
            />
          </Field>
        </div>

        <Field label="Descrição" htmlFor="proj-desc" help="Opcional">
          <TextInput
            id="proj-desc"
            type="multiline"
            value={descricao}
            onChange={setDescricao}
            placeholder="O que este projeto entrega quando terminar"
            fullWidth
          />
        </Field>
      </div>
    </Modal>
  );
}
