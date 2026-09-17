import React from 'react';
import {
  Card,
  Button,
  Badge,
  Icon,
  MessageBubble,
  MessageComposer,
  Field,
  Select,
  SuccessDialog,
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import { COLECOES } from '../dados/esquema';
import {
  montarPrompt,
  ROTULO_NIVEL,
  EXPLICACAO_NIVEL,
  type NivelDeDados,
  type ContextoDoPedido,
} from '../dominio/pedido';
import { PILARES, EXTENSAO, AJUSTES } from '../casca/navegacao';
import { formatarNumero } from '../formato';

/**
 * Pedir ao sistema — o compositor de pedido.
 *
 * Não conversa com modelo nenhum. Monta o texto que eu colo no Claude Code,
 * onde a mudança acontece no código, com teste, e volta pelo build. Sem chave
 * de API no cliente, sem custo por uso, e sem caminho para o sistema se
 * reescrever sozinho sem revisão.
 *
 * A interface é o grupo `messaging` da biblioteca, que já tinha tudo: o
 * composer com Enter-envia, a bolha com citação e anexo.
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

export function Pedir() {
  const { banco } = useBanco();
  const [descricao, setDescricao] = React.useState('');
  const [nivel, setNivel] = React.useState<NivelDeDados>('estrutura');
  // A descrição que gerou o pedido, ou null enquanto não gerei nenhum.
  const [enviado, setEnviado] = React.useState<string | null>(null);
  const [copiado, setCopiado] = React.useState(false);

  const contexto: ContextoDoPedido = {
    modulos: [...PILARES, EXTENSAO, AJUSTES].map((p) => p.rotulo),
    componentes: COMPONENTES,
  };

  const totalRegistros = COLECOES.reduce(
    (t, c) => t + ((banco as unknown as Record<string, unknown[]>)[c]?.length ?? 0),
    0,
  );

  // Derivado, não sincronizado: mudar o nível regera o texto sozinho, e o
  // anexo nunca fica defasado do controle. É o mesmo princípio que vale no
  // domínio — situação de tarefa também é derivada, nunca guardada.
  const prompt = enviado === null ? null : montarPrompt(banco, enviado, nivel, contexto);

  const gerar = (texto: string) => {
    setDescricao(texto);
    setEnviado(texto);
  };

  const copiar = async () => {
    if (!prompt) return;
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
      <Card title="Como isto funciona" subtitle="Nenhum modelo é chamado daqui">
        <p
          style={{
            font: 'var(--type-body)',
            color: 'var(--text-muted)',
            lineHeight: 'var(--lh-normal)',
          }}
        >
          Descreva o que você quer e o sistema monta um pedido pronto, com as regras do projeto,
          o que já existe e o recorte de dados que você escolher. Cole no Claude Code: a mudança
          acontece no código, com teste, e volta pelo build. Nenhuma chave de API vive aqui.
        </p>
      </Card>

      <Card
        title="O pedido"
        subtitle="Enter envia"
        action={
          <div style={{ minWidth: 230 }}>
            <Field label="Quanto do meu dado entra" htmlFor="pedir-nivel">
              <Select
                id="pedir-nivel"
                value={nivel}
                onChange={(v) => setNivel(v as NivelDeDados)}
                fullWidth
                options={NIVEIS.map((n) => ({ value: n, label: ROTULO_NIVEL[n] }))}
              />
            </Field>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
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

          {prompt && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
              <MessageBubble own time="agora" avatar={false}>
                {descricao}
              </MessageBubble>

              <MessageBubble
                author="Sistema"
                avatar={false}
                quote={{
                  author: 'Estado incluído',
                  text: `${contexto.modulos.length} módulos · esquema v${banco.versao} · ${formatarNumero(totalRegistros)} registros · ${ROTULO_NIVEL[nivel].toLowerCase()}`,
                }}
                attachment={{
                  name: 'pedido.md',
                  kind: `${formatarNumero(Math.ceil(prompt.length / 1024))} KB`,
                }}
              />

              <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
                <Button variant="primary" iconLeft="copy" onClick={copiar}>
                  Copiar o pedido
                </Button>
                <Button variant="ghost" size="md" onClick={() => setEnviado(null)}>
                  Começar de novo
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
          )}

          <MessageComposer
            value={descricao}
            onChange={setDescricao}
            onSend={gerar}
            placeholder="Quero uma área para registrar as leituras do mês…"
            tools={[]}
          />

          {!prompt && (
            <div style={{ display: 'flex', gap: 'var(--sp-5)', flexWrap: 'wrap' }}>
              {[
                'Uma área para registrar leituras',
                'Somar o saldo previsto dos próximos três meses',
                'Marcar tarefas como importantes',
              ].map((exemplo) => (
                <button
                  key={exemplo}
                  type="button"
                  onClick={() => setDescricao(exemplo)}
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
                  {exemplo}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card title="O que vai junto" subtitle="Para o pedido não precisar de contexto extra">
        <div style={{ display: 'flex', gap: 'var(--sp-5)', flexWrap: 'wrap' }}>
          <Badge tone="ontime" dot={false}>
            As 8 regras do projeto
          </Badge>
          <Badge tone="ontime" dot={false}>
            {contexto.modulos.length} módulos existentes
          </Badge>
          <Badge tone="ontime" dot={false}>
            36 componentes, por grupo
          </Badge>
          <Badge tone="ontime" dot={false}>
            Esquema v{banco.versao} e as coleções
          </Badge>
          <Badge tone={nivel === 'completo' ? 'delay' : 'neutral'} dot={false}>
            {ROTULO_NIVEL[nivel]}
          </Badge>
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
