import React from 'react';
import {
  Card,
  Button,
  Badge,
  Icon,
  MessageBubble,
  MessageComposer,
  MetricBarList,
  Field,
  Select,
  SuccessDialog,
  IconButton,
} from '../../design-system';
import { Link } from 'react-router-dom';
import { useBanco } from '../dados/BancoContexto';
import { useDitado, DITADO_DISPONIVEL } from '../dados/ditado';
import { useAgendaExterna } from '../dados/agendaExterna';
import { useGoogle } from '../dados/google';
import { semanaDe } from '../dominio/calendario';
import { COLECOES } from '../dados/esquema';
import {
  interpretar,
  responder,
  type Resposta,
  type Bloco,
  type Tom,
  type Efeito,
  type CompromissoExterno,
  exigeConfirmacao,
  rotuloDaConfirmacao,
} from '../dominio/agente';
import {
  montarPrompt,
  ROTULO_NIVEL,
  EXPLICACAO_NIVEL,
  type NivelDeDados,
  type ContextoDoPedido,
} from '../dominio/pedido';
import { PILARES, EXTENSAO, AJUSTES } from '../casca/navegacao';
import { formatarNumero, formatarHora } from '../formato';

/**
 * O agente — o meu, e só meu.
 *
 * Ele lê os meus dados e responde com o que eles dizem. Nenhum modelo é
 * chamado daqui, nenhuma chave de API vive no cliente, nada sai do aparelho e
 * nada custa por uso. Em troca ele não improvisa: o que não entende vira um
 * pedido pronto para o Claude Code, que é onde o sistema muda — com teste.
 *
 * Toda a inteligência mora em `src/dominio/agente.ts`, testada sem navegador.
 * Aqui só tem conversa, e a execução dos efeitos que o domínio pediu.
 */

/** Quantos componentes a biblioteca tem, por grupo. Bate com design-system/. */
const COMPONENTES: Record<string, number> = {
  core: 8,
  forms: 7,
  navigation: 4,
  data: 8,
  messaging: 3,
  feedback: 6,
};

const NIVEIS: NivelDeDados[] = ['estrutura', 'amostra', 'completo'];

const ATALHOS = [
  'Como foi minha semana?',
  'O que está atrasado?',
  'O que tenho hoje?',
  'Quanto gastei este mês?',
  'Como estão meus projetos?',
];

/**
 * Em que pé está o efeito deste turno.
 *
 * `aguardando` é o estado que faz a prévia existir: o domínio já decidiu o que
 * fazer e mostrou na tela, e nada foi gravado. Só sai dele por um toque meu.
 */
type EstadoDoTurno = 'sem-efeito' | 'aplicado' | 'aguardando' | 'confirmado' | 'cancelado';

interface Turno {
  id: string;
  /** o que eu escrevi */
  eu: string;
  hora: string;
  resposta: Resposta;
  estado: EstadoDoTurno;
}

export function Agente() {
  const {
    banco,
    hoje,
    criarTarefa,
    alternarTarefa,
    editarTarefa,
    removerTarefa,
    criarLancamento,
  } = useBanco();
  const [turnos, setTurnos] = React.useState<Turno[]>([]);
  const [texto, setTexto] = React.useState('');
  const [nivel, setNivel] = React.useState<NivelDeDados>('estrutura');
  const [copiado, setCopiado] = React.useState(false);
  const fim = React.useRef<HTMLDivElement>(null);

  // O que já estava escrito quando o microfone ligou. A fala é encaixada
  // depois disso, para ditar no meio de uma frase digitada não apagar o começo.
  const baseDoDitado = React.useRef('');
  const ditado = useDitado((frase) => {
    const base = baseDoDitado.current;
    setTexto(base === '' ? frase : `${base} ${frase}`);
  });

  const alternarDitado = () => {
    if (ditado.estado === 'parado') baseDoDitado.current = texto.trim();
    ditado.alternar();
  };

  // A janela é a semana de hoje: é o alcance das perguntas que olham a agenda
  // ("o que tenho hoje?", "e nesta semana?"), e pedir mais seria buscar rede
  // para responder o que ninguém perguntou.
  const semana = semanaDe(hoje);
  const google = useGoogle(semana[0], semana[6]);
  const assinatura = useAgendaExterna(semana[0], semana[6]);

  // A mesma regra do calendário: conectado ao Google, ele manda; senão vale a
  // agenda assinada. Duas fontes ao mesmo tempo mostrariam tudo em dobro.
  const compromissos: readonly CompromissoExterno[] = google.conectado
    ? google.eventos
    : (assinatura.agenda?.eventos ?? []);

  const contexto: ContextoDoPedido = {
    modulos: [...PILARES, EXTENSAO, AJUSTES].map((p) => p.rotulo),
    componentes: COMPONENTES,
  };

  const totalRegistros = COLECOES.reduce(
    (t, c) => t + ((banco as unknown as Record<string, unknown[]>)[c]?.length ?? 0),
    0,
  );

  const aplicar = async (efeito: Efeito) => {
    switch (efeito.tipo) {
      case 'criar-tarefa':
        await criarTarefa({
          titulo: efeito.titulo,
          contexto: efeito.contexto,
          prazo: efeito.prazo,
          hora: efeito.hora,
        });
        return;
      case 'concluir-tarefa':
        await alternarTarefa(efeito.id);
        return;
      case 'adiar-tarefa':
        // A hora só é tocada quando a frase trouxe uma: adiar "para sexta" não
        // pode apagar o horário que o compromisso já tinha.
        await editarTarefa(efeito.id, {
          prazo: efeito.prazo,
          ...(efeito.hora ? { hora: efeito.hora } : {}),
        });
        return;
      case 'excluir-tarefa':
        await removerTarefa(efeito.id);
        return;
      case 'criar-lancamento':
        await criarLancamento({
          descricao: efeito.descricao,
          valor: efeito.valor,
          tipo: efeito.entrada ? 'entrada' : 'saida',
          categoria: efeito.categoria,
          contexto: 'pessoal',
          data: hoje,
        });
        return;
      case 'montar-pedido':
        // O pedido é montado na hora de desenhar, a partir do nível escolhido:
        // mudar o nível regera o texto sem precisar perguntar de novo.
        return;
    }
  };

  const enviar = async (frase: string) => {
    const limpo = frase.trim();
    if (limpo === '') return;

    // A resposta é calculada **antes** do efeito: "concluir o seguro" precisa
    // achar a tarefa enquanto ela ainda está pendente.
    const intencao = interpretar(limpo, hoje);
    const resposta = responder(banco, intencao, hoje, compromissos);

    // Nada é gravado enquanto o efeito pedir confirmação. O turno entra na
    // conversa já dizendo em que pé está, e a prévia é a própria resposta —
    // ela mostra a tarefa, o antes e o depois.
    const espera = resposta.efeito !== undefined && exigeConfirmacao(resposta.efeito);
    const estado: EstadoDoTurno = !resposta.efeito
      ? 'sem-efeito'
      : espera
        ? 'aguardando'
        : 'aplicado';

    setTurnos((anteriores) => [
      ...anteriores,
      {
        id: `${Date.now()}-${anteriores.length}`,
        eu: limpo,
        hora: formatarHora(new Date()),
        resposta,
        estado,
      },
    ]);
    setTexto('');

    if (resposta.efeito && !espera) await aplicar(resposta.efeito);
  };

  const marcar = (id: string, estado: EstadoDoTurno) =>
    setTurnos((anteriores) => anteriores.map((t) => (t.id === id ? { ...t, estado } : t)));

  const confirmar = async (turno: Turno) => {
    if (!turno.resposta.efeito) return;
    // O estado muda antes de aplicar: gravar é assíncrono, e sem isto um toque
    // duplo no botão executa o efeito duas vezes.
    marcar(turno.id, 'confirmado');
    await aplicar(turno.resposta.efeito);
  };

  React.useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end' });
  }, [turnos.length]);

  const copiar = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiado(true);
    } catch {
      // Área de transferência bloqueada acontece: o texto continua visível e
      // selecionável abaixo, então o caminho manual permanece aberto.
      setCopiado(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <Card
        title="O seu agente"
        subtitle={
          ditado.estado === 'ouvindo'
            ? 'Ouvindo — a frase ditada sai do aparelho para virar texto'
            : 'Os seus dados ficam aqui. Só o que você ditar sai, enquanto dita.'
        }
        action={
          <Badge tone="ontime" dot={false}>
            {formatarNumero(totalRegistros)} registros
          </Badge>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
          {turnos.length === 0 ? (
            <Resposta resposta={responder(banco, { tipo: 'ajuda' }, hoje, compromissos)} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
              {turnos.map((t) => (
                <div
                  key={t.id}
                  style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}
                >
                  <MessageBubble own time={t.hora} avatar={false} ownLabel="Eu">
                    {t.eu}
                  </MessageBubble>

                  {/* A resposta não vai num balão: relatório com métrica e
                      barra não cabe nos 62% de largura de uma bolha de
                      conversa. O balão continua sendo o que eu digo. */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--sp-8)',
                      padding: 'var(--sp-8)',
                      borderRadius: 'var(--r-card)',
                      background: 'var(--surface-raised)',
                      border: 'var(--bw-hairline) solid var(--border-hairline)',
                      minWidth: 0,
                    }}
                  >
                    <Resposta resposta={t.resposta} />

                    {t.estado === 'aguardando' && t.resposta.efeito && (
                      <div
                        style={{
                          display: 'flex',
                          gap: 'var(--sp-6)',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                        }}
                      >
                        <Button onClick={() => void confirmar(t)}>
                          {rotuloDaConfirmacao(t.resposta.efeito)}
                        </Button>
                        <Button variant="ghost" onClick={() => marcar(t.id, 'cancelado')}>
                          Cancelar
                        </Button>
                        <span
                          style={{
                            color: 'var(--text-muted)',
                            font: 'var(--fw-regular) var(--fs-micro)/1.4 var(--font-core)',
                          }}
                        >
                          Nada foi gravado ainda.
                        </span>
                      </div>
                    )}

                    {t.estado === 'confirmado' && (
                      <Badge tone="ontime" dot={false}>
                        Feito
                      </Badge>
                    )}
                    {t.estado === 'cancelado' && (
                      <Badge tone="neutral" dot={false}>
                        Cancelado — nada mudou
                      </Badge>
                    )}

                    {t.resposta.efeito?.tipo === 'montar-pedido' && (
                      <Pedido
                        descricao={t.resposta.efeito.descricao}
                        nivel={nivel}
                        aoTrocarNivel={setNivel}
                        prompt={montarPrompt(
                          banco,
                          t.resposta.efeito.descricao,
                          nivel,
                          contexto,
                        )}
                        aoCopiar={copiar}
                      />
                    )}
                  </div>
                </div>
              ))}
              <div ref={fim} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--sp-6)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <MessageComposer
                value={texto}
                onChange={setTexto}
                onSend={enviar}
                placeholder={ditado.estado === 'ouvindo' ? 'Pode falar…' : 'Pergunte, ou mande fazer…'}
                tools={[]}
              />
            </div>
            {DITADO_DISPONIVEL && (
              <IconButton
                icon="mic"
                label={ditado.estado === 'ouvindo' ? 'Parar de ditar' : 'Ditar'}
                variant={ditado.estado === 'ouvindo' ? 'accent' : 'ghost'}
                size={34}
                onClick={alternarDitado}
              />
            )}
          </div>

          {ditado.erro && (
            <span
              style={{
                color: 'var(--orange-500)',
                font: 'var(--fw-regular) var(--fs-micro)/1.4 var(--font-core)',
              }}
            >
              {ditado.erro}
            </span>
          )}

          <div style={{ display: 'flex', gap: 'var(--sp-5)', flexWrap: 'wrap' }}>
            {ATALHOS.map((atalho) => (
              <button
                key={atalho}
                type="button"
                onClick={() => enviar(atalho)}
                style={{
                  minHeight: 'var(--control-h)',
                  padding: '0 var(--sp-6)',
                  cursor: 'pointer',
                  borderRadius: 'var(--r-pill)',
                  border: 'var(--bw-hairline) solid var(--border-default)',
                  background: 'transparent',
                  font: 'var(--type-body)',
                  color: 'var(--text-muted)',
                  transition: 'var(--t-hover)',
                }}
              >
                {atalho}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <SuccessDialog
        open={copiado}
        onClose={() => setCopiado(false)}
        title="Pedido copiado"
        message="Cole no Claude Code. A mudança volta pelo build, com teste."
        actionLabel="Fechar"
      />
    </div>
  );
}

/* ── Os blocos de uma resposta ───────────────────────────────────────────── */

const COR_DO_TOM: Record<Tom, string> = {
  neutro: 'var(--text-muted)',
  bom: 'var(--green-500)',
  atencao: 'var(--purple-200)',
  ruim: 'var(--orange-500)',
};

function Resposta({ resposta }: { resposta: Resposta }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
      <strong
        style={{
          font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
          color: 'var(--text-heading)',
        }}
      >
        {resposta.titulo}
      </strong>
      {resposta.blocos.map((bloco, i) => (
        <BlocoDaResposta key={i} bloco={bloco} />
      ))}
    </div>
  );
}

function BlocoDaResposta({ bloco }: { bloco: Bloco }) {
  switch (bloco.tipo) {
    case 'texto':
      return (
        <p
          style={{
            font: 'var(--type-body)',
            color: 'var(--text-muted)',
            lineHeight: 'var(--lh-normal)',
          }}
        >
          {bloco.texto}
        </p>
      );

    case 'metricas':
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min), 1fr))',
            gap: 'var(--sp-6)',
          }}
        >
          {bloco.itens.map((item) => (
            <span
              key={item.rotulo}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--sp-3)',
                padding: 'var(--sp-6)',
                borderRadius: 'var(--r-nav)',
                background: 'var(--surface-raised)',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  font: 'var(--fw-medium) var(--fs-lg)/1 var(--font-core)',
                  color: COR_DO_TOM[item.tom ?? 'neutro'],
                  overflowWrap: 'anywhere',
                }}
              >
                {item.valor}
              </span>
              <span style={{ font: 'var(--type-body)', color: 'var(--text-subtle)' }}>
                {item.rotulo}
              </span>
            </span>
          ))}
        </div>
      );

    case 'lista':
      return (
        <div>
          {bloco.titulo && (
            <p
              style={{
                font: 'var(--fw-regular) var(--fs-micro)/1 var(--font-core)',
                color: 'var(--text-subtle)',
                letterSpacing: 'var(--ls-caps)',
                textTransform: 'uppercase',
                marginBottom: 'var(--sp-5)',
              }}
            >
              {bloco.titulo}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            {bloco.itens.map((item, i) => (
              <span
                key={`${item.texto}-${i}`}
                style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-5)', minWidth: 0 }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    flex: '0 0 auto',
                    borderRadius: '50%',
                    background: COR_DO_TOM[item.tom ?? 'neutro'],
                  }}
                />
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                      color: 'var(--text-body)',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {item.texto}
                  </span>
                  {item.detalhe && (
                    <span
                      style={{
                        display: 'block',
                        font: 'var(--type-body)',
                        color: COR_DO_TOM[item.tom ?? 'neutro'],
                      }}
                    >
                      {item.detalhe}
                    </span>
                  )}
                </span>
              </span>
            ))}
          </div>
          {!!bloco.restantes && bloco.restantes > 0 && (
            <p
              style={{
                marginTop: 'var(--sp-5)',
                font: 'var(--type-body)',
                color: 'var(--text-subtle)',
              }}
            >
              e mais {bloco.restantes}
            </p>
          )}
        </div>
      );

    case 'barras':
      return (
        <MetricBarList
          items={bloco.itens.map((item, i) => ({
            label: item.rotulo,
            value: Math.round(item.fracao * 100),
            valueLabel: item.valor,
            tone: (['purple', 'green', 'orange', 'neutral'] as const)[i % 4],
          }))}
        />
      );

    case 'atalho':
      return (
        <div>
          <Link to={bloco.destino} style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm" iconRight="arrow-right">
              {bloco.rotulo}
            </Button>
          </Link>
        </div>
      );
  }
}

/* ── O pedido para o Claude Code ─────────────────────────────────────────── */

function Pedido({
  descricao,
  nivel,
  aoTrocarNivel,
  prompt,
  aoCopiar,
}: {
  descricao: string;
  nivel: NivelDeDados;
  aoTrocarNivel: (n: NivelDeDados) => void;
  prompt: string;
  aoCopiar: (prompt: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-8)',
        marginTop: 'var(--sp-8)',
      }}
    >
      <div style={{ maxWidth: 260 }}>
        <Field label="Quanto do meu dado entra" htmlFor={`nivel-${descricao.slice(0, 8)}`}>
          <Select
            id={`nivel-${descricao.slice(0, 8)}`}
            value={nivel}
            onChange={(v) => aoTrocarNivel(v as NivelDeDados)}
            fullWidth
            options={NIVEIS.map((n) => ({ value: n, label: ROTULO_NIVEL[n] }))}
          />
        </Field>
      </div>

      <p
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-5)',
          font: 'var(--type-body)',
          color: nivel === 'completo' ? 'var(--orange-500)' : 'var(--text-muted)',
        }}
      >
        {nivel === 'completo' && <Icon name="alert-triangle" size={15} />}
        {EXPLICACAO_NIVEL[nivel]}
      </p>

      <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
        <Button variant="primary" iconLeft="copy" onClick={() => aoCopiar(prompt)}>
          Copiar o pedido
        </Button>
      </div>

      <details>
        <summary
          style={{
            font: 'var(--type-body)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            minHeight: 'var(--control-h)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Ver o texto inteiro antes de colar
        </summary>
        <pre
          style={{
            marginTop: 'var(--sp-6)',
            padding: 'var(--sp-8)',
            maxHeight: 420,
            overflow: 'auto',
            background: 'var(--surface-raised)',
            border: 'var(--bw-hairline) solid var(--border-hairline)',
            borderRadius: 'var(--r-lg)',
            font: 'var(--fw-regular) var(--fs-body)/var(--lh-normal) var(--font-mono)',
            color: 'var(--text-body)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {prompt}
        </pre>
      </details>
    </div>
  );
}
