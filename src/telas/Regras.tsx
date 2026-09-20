import React from 'react';
import {
  Card,
  Button,
  Badge,
  Field,
  TextInput,
  Select,
  Switch,
  Checkbox,
  Icon,
  IconButton,
  Modal,
  OptionCard,
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import {
  CONTEXTOS,
  ROTULO_CONTEXTO,
  type Contexto,
  type Regra,
  type Gatilho,
  type Acao,
} from '../dados/esquema';
import {
  oQueAsRegrasQuerem,
  descreverRegra,
  descreverGatilho,
  descreverAcao,
  type Efeito,
} from '../dominio/regra';
import { ordenarPor } from '../formato';

/**
 * Automações — quando tal coisa acontecer, faça tal outra.
 *
 * **Nenhuma regra escreve sozinha.** A tela mostra o que elas querem fazer e
 * eu aplico o que quiser, marcando. Um sistema que edita os meus dados
 * enquanto eu durmo é exatamente o que "não suponha em silêncio" proíbe — e
 * desfazer uma automação que rodou sozinha custa mais que confirmar uma que
 * não rodou.
 */

/** Os pares que fazem sentido, para o formulário não oferecer o impossível. */
const ACOES_POR_GATILHO: Record<Gatilho['tipo'], Acao['tipo'][]> = {
  'projeto-parado': ['criar-tarefa', 'arquivar-projeto'],
  'projeto-terminado': ['arquivar-projeto', 'criar-tarefa'],
  'tarefa-atrasada': ['trazer-para-hoje', 'criar-tarefa'],
  'meta-atrasada': ['criar-tarefa'],
};

const ROTULO_GATILHO: Record<Gatilho['tipo'], string> = {
  'projeto-parado': 'Um projeto ficar parado',
  'projeto-terminado': 'Um projeto terminar',
  'tarefa-atrasada': 'Uma tarefa atrasar',
  'meta-atrasada': 'Uma meta ficar para trás',
};

const ROTULO_ACAO: Record<Acao['tipo'], string> = {
  'criar-tarefa': 'Criar uma tarefa',
  'arquivar-projeto': 'Arquivar o projeto',
  'trazer-para-hoje': 'Trazer o prazo para hoje',
};

/** Os gatilhos que pedem um número de dias. */
const PEDE_DIAS = (t: Gatilho['tipo']) => t === 'projeto-parado' || t === 'tarefa-atrasada';

export function Regras() {
  const { banco, hoje, criarRegra, editarRegra, removerRegra, aplicarRegras } = useBanco();
  const [criando, setCriando] = React.useState(false);
  const [corrigindo, setCorrigindo] = React.useState<Regra | null>(null);

  const querem = oQueAsRegrasQuerem(banco, hoje);
  // Tudo marcado de saída: aplicar é o caminho comum, e desmarcar o que eu
  // não quero é menos trabalho que marcar o que eu quero.
  const [recusados, setRecusados] = React.useState<string[]>([]);
  const escolhidos = querem.filter((e) => !recusados.includes(e.chave));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <PropostaDasRegras
        efeitos={querem}
        recusados={recusados}
        aoAlternar={(chave) =>
          setRecusados((r) => (r.includes(chave) ? r.filter((c) => c !== chave) : [...r, chave]))
        }
        aoAplicar={async () => {
          await aplicarRegras(escolhidos.map((e) => e.chave));
          setRecusados([]);
        }}
      />

      <Card
        title="As minhas regras"
        subtitle={
          banco.regras.length === 0
            ? 'Nenhuma ainda'
            : `${banco.regras.length} ${banco.regras.length === 1 ? 'regra' : 'regras'}`
        }
        action={
          <Button variant="primary" size="sm" iconRight="plus" onClick={() => setCriando(true)}>
            Nova regra
          </Button>
        }
      >
        {banco.regras.length === 0 ? (
          <Vazio />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {ordenarPor<Regra>(banco.regras, (r) => r.titulo).map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  // Quebra em vez de espremer: três controles à direita já
                  // esmagaram o texto a uma letra por linha noutra tela.
                  flexWrap: 'wrap',
                  gap: 'var(--sp-6)',
                  minHeight: 'var(--tap-min)',
                  padding: 'var(--sp-4) var(--sp-5)',
                  borderRadius: 'var(--r-nav)',
                  background: r.ativa ? 'var(--surface-raised)' : 'transparent',
                  opacity: r.ativa ? 1 : 0.6,
                }}
              >
                <Switch
                  checked={r.ativa}
                  onChange={() => editarRegra(r.id, { ativa: !r.ativa })}
                  style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}
                  label={
                    <span style={{ display: 'block', minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                          color: 'var(--text-body)',
                          overflowWrap: 'anywhere',
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
                        {descreverRegra(r)}
                      </span>
                    </span>
                  }
                />

                <span style={{ display: 'flex', gap: 'var(--sp-3)', flex: '0 0 auto' }}>
                  <IconButton
                    icon="pencil"
                    label={`Corrigir ${r.titulo}`}
                    variant="ghost"
                    size={34}
                    onClick={() => setCorrigindo(r)}
                  />
                  <IconButton
                    icon="trash-2"
                    label={`Apagar ${r.titulo}`}
                    variant="ghost"
                    size={34}
                    onClick={() => removerRegra(r.id)}
                  />
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {(criando || corrigindo) && (
        <FormularioDeRegra
          regra={corrigindo}
          aoFechar={() => {
            setCriando(false);
            setCorrigindo(null);
          }}
          aoEnviar={async (dados) => {
            if (corrigindo) await editarRegra(corrigindo.id, dados);
            else await criarRegra({ ...dados, ativa: true });
            setCriando(false);
            setCorrigindo(null);
          }}
        />
      )}
    </div>
  );
}

function Vazio() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--sp-6)',
        padding: 'var(--sp-14) var(--sp-8)',
        textAlign: 'center',
      }}
    >
      <span style={{ color: 'var(--text-subtle)' }}>
        <Icon name="zap" size={28} />
      </span>
      <p
        style={{
          font: 'var(--type-body)',
          color: 'var(--text-subtle)',
          maxWidth: 480,
          lineHeight: 'var(--lh-normal)',
        }}
      >
        Uma regra é uma coisa que você repararia se tivesse tempo: "quando um projeto ficar sete
        dias parado, crie uma tarefa de retomada", "quando a última tarefa terminar, arquive o
        projeto". Elas nunca escrevem sozinhas — mostram o que fariam, e você aplica.
      </p>
    </div>
  );
}

/**
 * O que as regras querem fazer agora.
 *
 * Some inteiro quando não há nada a propor: um cartão permanente dizendo
 * "nada por enquanto" é ruído que se aprende a não ler.
 */
function PropostaDasRegras({
  efeitos,
  recusados,
  aoAlternar,
  aoAplicar,
}: {
  efeitos: Efeito[];
  recusados: string[];
  aoAlternar: (chave: string) => void;
  aoAplicar: () => Promise<void>;
}) {
  if (efeitos.length === 0) return null;
  const quantos = efeitos.filter((e) => !recusados.includes(e.chave)).length;

  return (
    <Card
      title="As regras querem fazer isto"
      subtitle="Nada acontece até você aplicar"
      action={
        <Button variant="primary" size="sm" disabled={quantos === 0} onClick={() => void aoAplicar()}>
          {quantos === 0 ? 'Nada marcado' : `Aplicar ${quantos}`}
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {efeitos.map((e) => (
          <div
            key={e.chave}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-6)',
              minHeight: 'var(--tap-min)',
              padding: 'var(--sp-4) var(--sp-5)',
              borderRadius: 'var(--r-nav)',
              background: recusados.includes(e.chave) ? 'transparent' : 'var(--surface-raised)',
              opacity: recusados.includes(e.chave) ? 0.55 : 1,
            }}
          >
            <Checkbox
              checked={!recusados.includes(e.chave)}
              onChange={() => aoAlternar(e.chave)}
              style={{ flex: 1, minWidth: 0, alignItems: 'center' }}
              label={
                <span
                  style={{
                    display: 'block',
                    font: 'var(--type-body)',
                    color: 'var(--text-body)',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {e.descricao}
                </span>
              }
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── O formulário ────────────────────────────────────────────────────────── */

type DadosDaRegra = Omit<Regra, 'id' | 'criadoEm' | 'alteradoEm' | 'ativa'>;

function FormularioDeRegra({
  regra,
  aoFechar,
  aoEnviar,
}: {
  regra: Regra | null;
  aoFechar: () => void;
  aoEnviar: (dados: DadosDaRegra) => Promise<void>;
}) {
  const [titulo, setTitulo] = React.useState(regra?.titulo ?? '');
  const [gatilho, setGatilho] = React.useState<Gatilho['tipo']>(regra?.gatilho.tipo ?? 'projeto-parado');
  const [dias, setDias] = React.useState(
    String(regra && 'dias' in regra.gatilho ? regra.gatilho.dias : 7),
  );
  const [acao, setAcao] = React.useState<Acao['tipo']>(regra?.acao.tipo ?? 'criar-tarefa');
  const [tituloDaTarefa, setTituloDaTarefa] = React.useState(
    regra?.acao.tipo === 'criar-tarefa' ? regra.acao.titulo : 'Retomar {projeto}',
  );
  const [contexto, setContexto] = React.useState<Contexto>(
    regra?.acao.tipo === 'criar-tarefa' ? regra.acao.contexto : 'profissional',
  );
  const [tentou, setTentou] = React.useState(false);

  // Trocar o gatilho pode deixar a ação sem sentido — "quando uma meta
  // atrasar, arquive o projeto" não tem projeto para arquivar. Em vez de
  // recusar depois, a lista só oferece o que combina.
  const acoesPossiveis = ACOES_POR_GATILHO[gatilho];
  const acaoValida = acoesPossiveis.includes(acao) ? acao : acoesPossiveis[0];

  const erroTitulo = tentou && titulo.trim() === '' ? 'Dê um nome à regra' : undefined;
  const erroTarefa =
    tentou && acaoValida === 'criar-tarefa' && tituloDaTarefa.trim() === ''
      ? 'A tarefa criada precisa de um título'
      : undefined;

  const montarGatilho = (): Gatilho => {
    const quantos = Math.max(Math.trunc(Number(dias)) || 1, 1);
    switch (gatilho) {
      case 'projeto-parado':
        return { tipo: 'projeto-parado', dias: quantos };
      case 'tarefa-atrasada':
        return { tipo: 'tarefa-atrasada', dias: quantos };
      case 'projeto-terminado':
        return { tipo: 'projeto-terminado' };
      default:
        return { tipo: 'meta-atrasada' };
    }
  };

  const montarAcao = (): Acao =>
    acaoValida === 'criar-tarefa'
      ? { tipo: 'criar-tarefa', titulo: tituloDaTarefa.trim(), contexto }
      : acaoValida === 'arquivar-projeto'
        ? { tipo: 'arquivar-projeto' }
        : { tipo: 'trazer-para-hoje' };

  const previa = `${descreverGatilho(montarGatilho())}, ${descreverAcao(montarAcao())}.`;

  return (
    <Modal
      open
      onClose={aoFechar}
      closeLabel="Fechar"
      width={600}
      header={
        <div>
          <h2
            style={{
              font: 'var(--fw-semibold) var(--fs-heading)/1.25 var(--font-core)',
              color: 'var(--text-heading)',
            }}
          >
            {regra ? 'Corrigir regra' : 'Nova regra'}
          </h2>
          <p
            style={{
              font: 'var(--type-page-subtitle)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
            }}
          >
            Ela mostra o que faria; quem aplica é você
          </p>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => {
              setTentou(true);
              if (titulo.trim() === '') return;
              if (acaoValida === 'criar-tarefa' && tituloDaTarefa.trim() === '') return;
              void aoEnviar({ titulo: titulo.trim(), gatilho: montarGatilho(), acao: montarAcao() });
            }}
          >
            {regra ? 'Salvar' : 'Criar regra'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
        <Field label="Nome da regra" htmlFor="reg-titulo" required error={erroTitulo}>
          <TextInput
            id="reg-titulo"
            value={titulo}
            onChange={setTitulo}
            placeholder="Retomar projeto parado"
            invalid={!!erroTitulo}
            size="lg"
            fullWidth
          />
        </Field>

        <Field label="Quando" htmlFor="reg-gatilho">
          <Select
            id="reg-gatilho"
            value={gatilho}
            onChange={(v) => setGatilho(v as Gatilho['tipo'])}
            size="lg"
            fullWidth
            options={(Object.keys(ROTULO_GATILHO) as Gatilho['tipo'][]).map((t) => ({
              value: t,
              label: ROTULO_GATILHO[t],
            }))}
          />
        </Field>

        {PEDE_DIAS(gatilho) && (
          <Field label="Depois de quantos dias" htmlFor="reg-dias">
            <TextInput id="reg-dias" type="number" value={dias} onChange={setDias} size="lg" fullWidth />
          </Field>
        )}

        <Field label="Faça" htmlFor="reg-acao">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
            {acoesPossiveis.map((t) => (
              <OptionCard
                key={t}
                icon={
                  t === 'criar-tarefa'
                    ? 'clipboard-check'
                    : t === 'arquivar-projeto'
                      ? 'archive'
                      : 'calendar'
                }
                title={ROTULO_ACAO[t]}
                selected={acaoValida === t}
                onClick={() => setAcao(t)}
              />
            ))}
          </div>
        </Field>

        {acaoValida === 'criar-tarefa' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min), 1fr))',
              gap: 'var(--sp-8)',
            }}
          >
            <Field
              label="Título da tarefa"
              htmlFor="reg-tarefa"
              error={erroTarefa}
              help="{projeto} vira o nome do projeto"
            >
              <TextInput
                id="reg-tarefa"
                value={tituloDaTarefa}
                onChange={setTituloDaTarefa}
                invalid={!!erroTarefa}
                size="lg"
                fullWidth
              />
            </Field>
            <Field label="Contexto" htmlFor="reg-contexto">
              <Select
                id="reg-contexto"
                value={contexto}
                onChange={(v) => setContexto(v as Contexto)}
                size="lg"
                fullWidth
                options={CONTEXTOS.map((c) => ({ value: c, label: ROTULO_CONTEXTO[c] }))}
              />
            </Field>
          </div>
        )}

        {/* A frase inteira, antes de salvar: uma regra que só se entende
            depois de rodar é uma regra que ninguém confere. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--sp-6)',
            padding: 'var(--sp-6)',
            borderRadius: 'var(--r-nav)',
            background: 'var(--surface-raised)',
          }}
        >
          <Badge tone="ontime" dot={false}>
            Fica assim
          </Badge>
          <span
            style={{
              font: 'var(--type-body)',
              color: 'var(--text-body)',
              minWidth: 0,
              lineHeight: 'var(--lh-normal)',
            }}
          >
            {previa}
          </span>
        </div>
      </div>
    </Modal>
  );
}
