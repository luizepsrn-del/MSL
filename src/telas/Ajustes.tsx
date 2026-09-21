import React from 'react';
import {
  Card,
  Button,
  Badge,
  Icon,
  Field,
  TextInput,
  SuccessDialog,
} from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import { IconButton } from '../../design-system';
import {
  VERSAO_ESQUEMA,
  COLECOES,
  nomearColecao,
  CORES_DE_ROTULO,
  type CorDeRotulo,
  type Rotulo,
} from '../dados/esquema';
import { quemUsa } from '../dominio/insights';
import { formatarData, formatarNumero, formatarDataRelativa } from '../formato';
import type { Conta as ContaDoUsuario, SessaoDeAparelho } from '../dados/sincronia';
import {
  descreverUltimoBackup,
  precisaDeBackup,
  diasSemBackup,
  DIAS_ATE_COBRAR,
} from '../dominio/backup';
import { limparCache } from '../dados/agendaExterna';
import { JORNADA_PADRAO } from '../dominio/plano';
import { horaValida } from '../dominio/calendario';
import { useGoogle } from '../dados/google';
import { diaLocal } from '../dados/esquema';

/**
 * Ajustes — e o backup, que é o que realmente importa aqui.
 *
 * A exportação existe no repositório desde o primeiro pilar, mas até agora não
 * tinha botão em lugar nenhum. Backup sem botão é backup que não existe.
 */
export function Ajustes() {
  const {
    banco,
    exportar,
    importar,
    definirPreferencias,
    conta,
    sincronizando,
    ultimaSincronia,
    erroDeSincronia,
    cadastrar,
    entrarNaConta,
    sairDaConta,
    sincronizarAgora,
    listarAparelhos,
    revogarAparelho,
  } = useBanco();
  const entrada = React.useRef<HTMLInputElement>(null);

  const [aviso, setAviso] = React.useState<{ titulo: string; texto: string; erro?: boolean } | null>(
    null,
  );
  const [arquivoPendente, setArquivoPendente] = React.useState<string | null>(null);

  const instalado =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true);

  const totalRegistros = COLECOES.reduce(
    (t, c) => t + ((banco as unknown as Record<string, unknown[]>)[c]?.length ?? 0),
    0,
  );

  const agora = new Date();
  const atrasado = precisaDeBackup(banco.preferencias, agora);
  const dias = diasSemBackup(banco.preferencias, agora);

  const baixar = async () => {
    // Anota antes de gerar: assim o arquivo carrega a data em que ele mesmo
    // foi feito, e não a do arquivo anterior.
    await definirPreferencias({ ultimoBackupEm: new Date().toISOString() });
    const json = await exportar();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-system-life-${formatarData(new Date()).replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const escolherArquivo = () => entrada.current?.click();

  const aoEscolher = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setArquivoPendente(await arquivo.text());
  };

  const confirmarImportacao = async () => {
    if (!arquivoPendente) return;
    const conteudo = arquivoPendente;
    setArquivoPendente(null);
    try {
      await importar(conteudo);
      setAviso({ titulo: 'Dados restaurados', texto: 'O arquivo substituiu o que estava aqui.' });
    } catch (erro) {
      setAviso({
        titulo: 'Não deu para importar',
        texto: erro instanceof Error ? erro.message : 'Arquivo inválido.',
        erro: true,
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      {!instalado && (
        <Card>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--sp-6)',
            }}
          >
            <span style={{ color: 'var(--orange-500)', display: 'flex', flex: '0 0 auto' }}>
              <Icon name="alert-triangle" size={20} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                  color: 'var(--text-heading)',
                }}
              >
                O navegador pode apagar estes dados
              </span>
              <span
                style={{
                  display: 'block',
                  font: 'var(--type-body)',
                  color: 'var(--text-muted)',
                  marginTop: 'var(--sp-3)',
                  lineHeight: 'var(--lh-normal)',
                }}
              >
                O Safari apaga o armazenamento local após sete dias sem uso do site. Sites
                adicionados à tela de início ficam de fora dessa regra — no iPhone, use
                Compartilhar › Adicionar à Tela de Início. Enquanto isso, exporte com
                frequência.
              </span>
            </span>
          </div>
        </Card>
      )}

      {/*
        O lembrete de exportar.

        Mostra um número, e não um aviso genérico: "faça backup" a gente
        aprende a ignorar, "há nove dias" não. Aparece mesmo com o sistema
        instalado — instalar resolve os sete dias do Safari, não o aparelho
        que quebra.

        Some quando não há registro nenhum: cobrar backup de um sistema vazio
        é o tipo de aviso que ensina a ignorar avisos.
      */}
      {totalRegistros > 0 && (
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-6)' }}>
          <span
            style={{
              color: atrasado ? 'var(--orange-500)' : 'var(--green-500)',
              display: 'flex',
              flex: '0 0 auto',
            }}
          >
            <Icon name={atrasado ? 'alert-triangle' : 'circle-check'} size={20} />
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span
              style={{
                display: 'block',
                font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                color: 'var(--text-heading)',
              }}
            >
              {descreverUltimoBackup(banco.preferencias, agora)}
            </span>
            <span
              style={{
                display: 'block',
                font: 'var(--type-body)',
                color: 'var(--text-muted)',
                marginTop: 'var(--sp-3)',
                lineHeight: 'var(--lh-normal)',
              }}
            >
              {dias === null
                ? `O seu dado vive só neste aparelho. Exporte uma vez e o sistema passa a cobrar a cada ${DIAS_ATE_COBRAR} dias.`
                : atrasado
                  ? 'O aparelho pode quebrar e o navegador pode ser limpo. Vale exportar de novo.'
                  : `O sistema cobra de novo depois de ${DIAS_ATE_COBRAR} dias.`}
            </span>
          </span>
          <Button variant={atrasado ? 'primary' : 'secondary'} iconLeft="download" onClick={baixar}>
            Exportar agora
          </Button>
        </div>
      </Card>
      )}

      <NomeNoInicio
        nome={banco.preferencias?.nome ?? ''}
        aoSalvar={(nome) => definirPreferencias({ nome: nome.trim() || undefined })}
      />

      <OsRotulos />

      <AJornada
        atual={banco.preferencias?.jornada ?? JORNADA_PADRAO}
        aoSalvar={(jornada) => definirPreferencias({ jornada })}
      />

      <ContaDoGoogle />

      <AgendaDoGoogle
        atual={banco.preferencias?.agendaExterna?.url ?? ''}
        aoSalvar={(url) => {
          // Trocar ou tirar o endereço invalida o cache na hora: sem isto, o
          // calendário mostraria a agenda antiga até o próximo rebusque.
          limparCache(window.localStorage);
          return definirPreferencias({ agendaExterna: url.trim() ? { url: url.trim() } : undefined });
        }}
      />

      <Card title="Meus dados" subtitle={`Esquema na versão ${VERSAO_ESQUEMA}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
          <div style={{ display: 'flex', gap: 'var(--sp-5)', flexWrap: 'wrap' }}>
            {COLECOES.map((c) => {
              const n = (banco as unknown as Record<string, unknown[]>)[c]?.length ?? 0;
              return (
                <Badge key={c} tone={n > 0 ? 'ontime' : 'neutral'} dot={false}>
                  {nomearColecao(c, n)}
                </Badge>
              );
            })}
          </div>

          <p
            style={{
              font: 'var(--type-body)',
              color: 'var(--text-muted)',
              lineHeight: 'var(--lh-normal)',
            }}
          >
            {totalRegistros === 0
              ? 'Nada guardado ainda.'
              : `${formatarNumero(totalRegistros)} registros no total. O arquivo exportado é JSON legível: dá para abrir e ler à mão se precisar.`}
          </p>

          <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
            <Button variant="primary" iconLeft="download" onClick={baixar}>
              Exportar tudo
            </Button>
            <Button variant="secondary" iconLeft="upload" onClick={escolherArquivo}>
              Importar de um arquivo
            </Button>
            <input
              ref={entrada}
              type="file"
              accept="application/json,.json"
              onChange={aoEscolher}
              style={{ display: 'none' }}
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>
        </div>
      </Card>

      <Conta
        conta={conta}
        sincronizando={sincronizando}
        ultimaSincronia={ultimaSincronia}
        erro={erroDeSincronia}
        aoCadastrar={cadastrar}
        aoEntrar={entrarNaConta}
        aoSair={sairDaConta}
        aoSincronizar={sincronizarAgora}
        listarAparelhos={listarAparelhos}
        aoRevogar={revogarAparelho}
      />

      <Card title="Como o dado vive" subtitle="Onde ele está, e o que ainda falta">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-6)',
            font: 'var(--type-body)',
            color: 'var(--text-muted)',
            lineHeight: 'var(--lh-normal)',
          }}
        >
          <p>
            {conta
              ? 'Tudo fica no navegador deste aparelho, e uma cópia junta vai para a sua conta a cada mudança. O que eu criar no Mac aparece no telefone na próxima sincronização.'
              : 'Tudo fica no navegador deste aparelho. Sem conta, nada sai daqui — e o que eu criar no Mac não aparece no telefone.'}
          </p>
          <p>
            As telas nunca falam com o armazenamento direto: falam com uma interface. É o que
            torna a sincronização uma ligação, e não uma reforma, quando ela chegar. Até lá,
            exportar e importar é o caminho entre os dois aparelhos.
          </p>
        </div>
      </Card>

      {/* Importar substitui tudo: é destrutivo e pede confirmação explícita. */}
      <SuccessDialog
        open={!!arquivoPendente}
        tone="danger"
        onClose={() => setArquivoPendente(null)}
        title="Substituir tudo pelo arquivo?"
        message="O que está guardado agora será trocado pelo conteúdo do arquivo. Exporte antes, se ainda não exportou."
        actionLabel="Substituir"
        onAction={confirmarImportacao}
      />

      <SuccessDialog
        open={!!aviso}
        tone={aviso?.erro ? 'danger' : 'success'}
        onClose={() => setAviso(null)}
        title={aviso?.titulo ?? ''}
        message={aviso?.texto}
        actionLabel="Entendi"
      />
    </div>
  );
}

/* ── A conta, e a sincronização ──────────────────────────────────────────── */

/**
 * Entrar, sair, sincronizar e cortar o acesso de um aparelho.
 *
 * O texto evita prometer o que não acontece: sem conta, o dado fica só aqui, e
 * isso é dito com todas as letras em vez de deixar a pessoa descobrir no
 * telefone que nada atravessou.
 */
/**
 * Como eu quero ser chamado.
 *
 * Mora nas preferências, e não no código, por dois motivos: o repositório é
 * público, e a escolha é minha — ela viaja no backup e na sincronização como
 * qualquer outra. Em branco, o Início mostra só a data, sem nome pendurado.
 *
 * Salva ao sair do campo, e não a cada tecla: gravar por letra digitada
 * dispararia uma sincronização por letra.
 */
function NomeNoInicio({ nome, aoSalvar }: { nome: string; aoSalvar: (nome: string) => void }) {
  const [texto, setTexto] = React.useState(nome);

  return (
    <Card title="Como quer ser chamado" subtitle="Aparece na saudação do Início">
      <div style={{ display: 'flex', gap: 'var(--sp-6)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
          <Field label="Nome" htmlFor="ajustes-nome">
            <TextInput
              id="ajustes-nome"
              value={texto}
              onChange={setTexto}
              onBlur={() => aoSalvar(texto)}
              placeholder="Deixe em branco para não usar nome"
              size="lg"
              fullWidth
            />
          </Field>
        </div>
        <Button variant="secondary" size="lg" onClick={() => aoSalvar(texto)}>
          Salvar
        </Button>
      </div>
    </Card>
  );
}

/**
 * Os rótulos.
 *
 * O eixo livre, ao lado do contexto, que é fixo. É por eles que o Calendário
 * consegue dizer para onde foi o tempo — sem rótulo nenhum, a rosca teria uma
 * fatia só.
 *
 * Apagar um rótulo **solta** o que estava marcado, nunca o apaga: ele era uma
 * etiqueta, não um dono. É o mesmo princípio de remover um projeto.
 */
function OsRotulos() {
  const { banco, criarRotulo, editarRotulo, removerRotulo } = useBanco();
  const [nome, setNome] = React.useState('');
  const [cor, setCor] = React.useState<CorDeRotulo>(CORES_DE_ROTULO[0]);
  const [aRemover, setARemover] = React.useState<Rotulo | null>(null);

  const vivos = banco.rotulos.filter((r) => !r.arquivado);
  const soltaria = aRemover ? quemUsa(banco, aRemover.id).length : 0;

  return (
    <Card
      title="Rótulos"
      subtitle={
        banco.rotulos.length === 0
          ? 'Para o Calendário poder dizer onde foi o seu tempo'
          : `${vivos.length} ${vivos.length === 1 ? 'rótulo' : 'rótulos'}`
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
        {banco.rotulos.length === 0 && (
          <p style={{ font: 'var(--type-body)', color: 'var(--text-subtle)', lineHeight: 'var(--lh-normal)' }}>
            "Reunião com cliente", "Estudos", "Operação" — o que você quiser medir, com o nome que
            você usa. Depois é só escolher um em cada tarefa, rotina ou compromisso do Google, e o
            Calendário passa a mostrar para onde a semana foi.
          </p>
        )}

        {vivos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {vivos.map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--sp-6)',
                  minHeight: 'var(--tap-min)',
                  padding: 'var(--sp-4) var(--sp-5)',
                  borderRadius: 'var(--r-nav)',
                  background: 'var(--surface-raised)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 12,
                    height: 12,
                    flex: '0 0 auto',
                    borderRadius: '50%',
                    background: r.cor,
                  }}
                />
                <div style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
                  <TextInput
                    id={`rotulo-${r.id}`}
                    value={r.nome}
                    onChange={(v) => editarRotulo(r.id, { nome: v })}
                    fullWidth
                  />
                </div>

                <span style={{ display: 'flex', gap: 'var(--sp-3)', flex: '0 0 auto', flexWrap: 'wrap' }}>
                  {CORES_DE_ROTULO.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Cor ${CORES_DE_ROTULO.indexOf(c) + 1} para ${r.nome}`}
                      aria-pressed={r.cor === c}
                      onClick={() => editarRotulo(r.id, { cor: c })}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        cursor: 'pointer',
                        background: c,
                        border: `var(--bw-thick) solid ${
                          r.cor === c ? 'var(--text-heading)' : 'transparent'
                        }`,
                      }}
                    />
                  ))}
                  <IconButton
                    icon="trash-2"
                    label={`Apagar o rótulo ${r.nome}`}
                    variant="ghost"
                    size={34}
                    onClick={() => setARemover(r)}
                  />
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--sp-6)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
            <Field label="Novo rótulo" htmlFor="rotulo-novo">
              <TextInput
                id="rotulo-novo"
                value={nome}
                onChange={setNome}
                placeholder="Reunião com cliente"
                size="lg"
                fullWidth
              />
            </Field>
          </div>
          <span style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', flex: '0 0 auto' }}>
            {CORES_DE_ROTULO.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Cor ${CORES_DE_ROTULO.indexOf(c) + 1}`}
                aria-pressed={cor === c}
                onClick={() => setCor(c)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  background: c,
                  border: `var(--bw-thick) solid ${cor === c ? 'var(--text-heading)' : 'transparent'}`,
                }}
              />
            ))}
          </span>
          <Button
            variant="primary"
            size="lg"
            disabled={nome.trim() === ''}
            onClick={async () => {
              await criarRotulo({ nome, cor, arquivado: false });
              setNome('');
            }}
          >
            Criar
          </Button>
        </div>
      </div>

      <SuccessDialog
        open={!!aRemover}
        tone="danger"
        onClose={() => setARemover(null)}
        title={`Apagar o rótulo "${aRemover?.nome}"?`}
        message={
          soltaria === 0
            ? 'Nada está marcado com ele.'
            : `${soltaria} ${soltaria === 1 ? 'item fica' : 'itens ficam'} sem rótulo. Nada é apagado — o rótulo era uma etiqueta, não um dono.`
        }
        actionLabel="Apagar rótulo"
        onAction={async () => {
          if (aRemover) await removerRotulo(aRemover.id);
          setARemover(null);
        }}
      />
    </Card>
  );
}

/**
 * A que horas o dia aceita trabalho.
 *
 * Só isso: nada de estimativa por tarefa. Todas pedem o mesmo bloco, porque
 * um número por tarefa que ninguém mediu é precisão inventada — e "cabem
 * cinco coisas hoje" é a informação que serve.
 */
function AJornada({
  atual,
  aoSalvar,
}: {
  atual: { de: string; ate: string; minutosPorItem: number };
  aoSalvar: (j: { de: string; ate: string; minutosPorItem: number }) => Promise<void>;
}) {
  const [de, setDe] = React.useState(atual.de);
  const [ate, setAte] = React.useState(atual.ate);
  const [bloco, setBloco] = React.useState(String(atual.minutosPorItem));

  const minutos = Math.max(Math.trunc(Number(bloco)) || 0, 0);
  const erroHoras =
    !horaValida(de) || !horaValida(ate)
      ? 'Use o formato 08:00'
      : de >= ate
        ? 'O fim precisa vir depois do começo'
        : undefined;
  const erroBloco = minutos < 5 ? 'Pelo menos 5 minutos' : undefined;

  return (
    <Card title="O seu dia" subtitle="A janela que o plano automático usa">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min), 1fr))',
            gap: 'var(--sp-8)',
          }}
        >
          <Field label="Começa às" htmlFor="jor-de" error={erroHoras}>
            <TextInput id="jor-de" type="time" value={de} onChange={setDe} size="lg" fullWidth />
          </Field>
          <Field label="Termina às" htmlFor="jor-ate">
            <TextInput id="jor-ate" type="time" value={ate} onChange={setAte} size="lg" fullWidth />
          </Field>
          <Field
            label="Cada tarefa ocupa"
            htmlFor="jor-bloco"
            error={erroBloco}
            help="Em minutos"
          >
            <TextInput
              id="jor-bloco"
              type="number"
              value={bloco}
              onChange={setBloco}
              size="lg"
              fullWidth
            />
          </Field>
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="lg"
            disabled={!!erroHoras || !!erroBloco}
            onClick={() => void aoSalvar({ de, ate, minutosPorItem: minutos })}
          >
            Salvar
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              setDe(JORNADA_PADRAO.de);
              setAte(JORNADA_PADRAO.ate);
              setBloco(String(JORNADA_PADRAO.minutosPorItem));
              void aoSalvar(JORNADA_PADRAO);
            }}
          >
            Voltar ao padrão
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Conectar o Google com login — os dois sentidos.
 *
 * O que sai daqui para lá: tarefa com prazo e peça com data de publicar.
 * Rotina não, de propósito: a agenda viraria a rotina inteira.
 */
function ContaDoGoogle() {
  const google = useGoogle(hojeLocal(), hojeLocal());

  return (
    <Card
      title="Google Agenda"
      subtitle={google.conectado ? 'Conectada, nos dois sentidos' : 'Não conectada'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', lineHeight: 'var(--lh-normal)' }}>
          {google.conectado ? (
            <>
              O que você criar no Google aparece no calendário daqui, e as{' '}
              <strong>tarefas com prazo</strong> e as <strong>peças com data de publicar</strong>{' '}
              viram evento lá. Mover de um lado move do outro — vence quem mexeu por último.
            </>
          ) : (
            <>
              Para ligar nos dois sentidos é preciso criar uma credencial no Google Cloud, uma vez.
              O passo a passo está em <code>docs/google-agenda.md</code>, no repositório. Leva uns
              vinte e cinco minutos e não se repete.
            </>
          )}
        </p>

        {google.erro && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-6)' }}>
            <span style={{ color: 'var(--orange-500)', display: 'flex', flex: '0 0 auto' }}>
              <Icon name="alert-triangle" size={20} />
            </span>
            <span
              style={{
                font: 'var(--type-body)',
                color: 'var(--orange-500)',
                lineHeight: 'var(--lh-normal)',
                minWidth: 0,
              }}
            >
              {google.erro}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
          {google.conectado ? (
            <>
              <Button
                variant="secondary"
                size="lg"
                iconLeft="refresh-cw"
                disabled={google.sincronizando}
                onClick={google.sincronizarAgora}
              >
                Sincronizar agora
              </Button>
              <Button variant="ghost" size="lg" onClick={google.desconectar}>
                Desconectar
              </Button>
            </>
          ) : (
            <Button variant="primary" size="lg" iconRight="arrow-right" onClick={google.conectar}>
              Conectar
            </Button>
          )}
        </div>

        {google.conectado && (
          <p style={{ font: 'var(--type-body)', color: 'var(--text-subtle)', lineHeight: 'var(--lh-normal)' }}>
            A credencial fica no servidor, presa à sua conta — nunca no banco e nunca no arquivo
            que você exporta. Desconectar apaga só ela: os eventos que o MSL criou ficam no seu
            Google.
          </p>
        )}
      </div>
    </Card>
  );
}

/** O dia local de hoje, para o gancho pedir uma janela de um dia só. */
function hojeLocal(): string {
  return diaLocal(new Date());
}

/**
 * Assinar a agenda do Google.
 *
 * Só entra: os eventos do Google aparecem aqui, e o que eu crio aqui não vai
 * para lá. Fazer os dois sentidos exigiria um projeto no Google Cloud, tela de
 * consentimento e reconectar a cada sete dias enquanto o app estivesse em
 * modo de teste — foi a escolha, e ela está registrada.
 *
 * O aviso sobre o endereço ser uma senha não é firula: quem o tiver lê a
 * agenda inteira sem login nenhum, e ele viaja no arquivo exportado.
 */
function AgendaDoGoogle({
  atual,
  aoSalvar,
}: {
  atual: string;
  aoSalvar: (url: string) => Promise<void>;
}) {
  const [texto, setTexto] = React.useState(atual);
  const [salvo, setSalvo] = React.useState(false);
  const [aberto, setAberto] = React.useState(atual !== '');

  const mudou = texto.trim() !== atual;
  const pareceGoogle = texto.trim() === '' || /^https:\/\/calendar\.google\.com\//i.test(texto.trim());

  return (
    <Card
      title="Só ler a agenda, sem login"
      subtitle={atual ? 'Assinada pelo endereço secreto' : 'O caminho antigo, mais simples'}
      action={
        <Button variant="ghost" size="sm" onClick={() => setAberto((a) => !a)}>
          {aberto ? 'Esconder' : 'Mostrar'}
        </Button>
      }
    >
      {!aberto ? (
        <p style={{ font: 'var(--type-body)', color: 'var(--text-subtle)', lineHeight: 'var(--lh-normal)' }}>
          Traz os eventos do Google para cá sem criar credencial nenhuma, mas só num sentido. Se
          você conectou com login acima, isto não é necessário — e o calendário ignora esta
          assinatura enquanto a conexão estiver de pé, para não mostrar o mesmo compromisso duas
          vezes.
        </p>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
        <p
          style={{
            font: 'var(--type-body)',
            color: 'var(--text-muted)',
            lineHeight: 'var(--lh-normal)',
          }}
        >
          No Google Agenda, abra <strong>Configurações</strong> › a sua agenda ›{' '}
          <strong>Endereço secreto no formato iCal</strong>, copie e cole aqui. Os eventos passam a
          aparecer no calendário e na semana.
        </p>

        <Field
          label="Endereço secreto no formato iCal"
          htmlFor="ajustes-agenda"
          error={!pareceGoogle ? 'Esperava um endereço de calendar.google.com' : undefined}
        >
          <TextInput
            id="ajustes-agenda"
            value={texto}
            onChange={(v) => {
              setTexto(v);
              setSalvo(false);
            }}
            placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
            invalid={!pareceGoogle}
            size="lg"
            fullWidth
          />
        </Field>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-6)' }}>
          <span style={{ color: 'var(--orange-500)', display: 'flex', flex: '0 0 auto' }}>
            <Icon name="alert-triangle" size={20} />
          </span>
          <span
            style={{
              font: 'var(--type-body)',
              color: 'var(--text-muted)',
              lineHeight: 'var(--lh-normal)',
              minWidth: 0,
            }}
          >
            <strong>Esse endereço é uma senha.</strong> Quem o tiver lê a sua agenda inteira, sem
            login. Ele fica no seu banco, então chega sozinho no outro aparelho pela sincronização —
            e viaja junto no arquivo exportado. Se vazar, o Google deixa você gerar um novo em{' '}
            <em>Redefinir endereço secreto</em>, e o antigo para de funcionar.
          </span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            size="lg"
            disabled={!mudou || !pareceGoogle}
            onClick={async () => {
              await aoSalvar(texto);
              setSalvo(true);
            }}
          >
            {atual && texto.trim() === '' ? 'Parar de assinar' : 'Assinar'}
          </Button>
          {atual !== '' && (
            <Button variant="secondary" size="lg" onClick={() => setTexto('')}>
              Limpar
            </Button>
          )}
          {salvo && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-4)',
                font: 'var(--type-body)',
                color: 'var(--green-500)',
              }}
            >
              <Icon name="circle-check" size={18} />
              Pronto — abra o Calendário
            </span>
          )}
        </div>
      </div>
      )}
    </Card>
  );
}

function Conta({
  conta,
  sincronizando,
  ultimaSincronia,
  erro,
  aoCadastrar,
  aoEntrar,
  aoSair,
  aoSincronizar,
  listarAparelhos,
  aoRevogar,
}: {
  conta: ContaDoUsuario | null;
  sincronizando: boolean;
  ultimaSincronia: string | null;
  erro: string | null;
  aoCadastrar: (email: string, senha: string) => Promise<void>;
  aoEntrar: (email: string, senha: string) => Promise<void>;
  aoSair: () => Promise<void>;
  aoSincronizar: () => Promise<void>;
  listarAparelhos: () => Promise<SessaoDeAparelho[]>;
  aoRevogar: (token: string) => Promise<void>;
}) {
  const [email, setEmail] = React.useState('');
  const [senha, setSenha] = React.useState('');
  const [ocupado, setOcupado] = React.useState(false);
  const [falha, setFalha] = React.useState<string | null>(null);
  const [aparelhos, setAparelhos] = React.useState<SessaoDeAparelho[] | null>(null);

  const tentar = async (acao: () => Promise<void>) => {
    setOcupado(true);
    setFalha(null);
    try {
      await acao();
    } catch (problema) {
      setFalha(problema instanceof Error ? problema.message : 'Não deu certo. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  };

  const verAparelhos = () =>
    tentar(async () => {
      setAparelhos(await listarAparelhos());
    });

  if (!conta) {
    return (
      <Card
        title="Sincronizar entre aparelhos"
        subtitle="Entre com a sua conta para o Mac e o telefone verem o mesmo"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min), 1fr))',
              gap: 'var(--sp-8)',
            }}
          >
            <Field label="E-mail" htmlFor="conta-email">
              <TextInput
                id="conta-email"
                value={email}
                onChange={setEmail}
                placeholder="voce@exemplo.com"
                size="lg"
                fullWidth
              />
            </Field>

            <Field label="Senha" htmlFor="conta-senha" help="Pelo menos 10 caracteres">
              <TextInput
                id="conta-senha"
                type="password"
                value={senha}
                onChange={setSenha}
                size="lg"
                fullWidth
              />
            </Field>
          </div>

          {falha && (
            <p role="alert" style={{ font: 'var(--type-body)', color: 'var(--orange-500)' }}>
              {falha}
            </p>
          )}

          <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              disabled={ocupado}
              onClick={() => tentar(() => aoEntrar(email, senha))}
            >
              Entrar
            </Button>
            <Button
              variant="secondary"
              disabled={ocupado}
              onClick={() => tentar(() => aoCadastrar(email, senha))}
            >
              Criar conta
            </Button>
          </div>

          <p
            style={{
              font: 'var(--type-body)',
              color: 'var(--text-subtle)',
              lineHeight: 'var(--lh-normal)',
            }}
          >
            Sem conta o sistema funciona igual, só não atravessa para o outro aparelho. Entrar não
            apaga nada: o que já existe aqui é juntado com o que estiver na conta.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Sincronização"
      subtitle={conta.email}
      action={
        <Button
          variant="secondary"
          size="sm"
          iconLeft="repeat"
          disabled={sincronizando}
          onClick={() => tentar(aoSincronizar)}
        >
          {sincronizando ? 'Sincronizando…' : 'Sincronizar agora'}
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-6)' }}>
          <span
            style={{
              color: erro ? 'var(--orange-500)' : 'var(--green-500)',
              display: 'flex',
              flex: '0 0 auto',
            }}
          >
            <Icon name={erro ? 'alert-triangle' : 'circle-check'} size={20} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                color: 'var(--text-heading)',
              }}
            >
              {erro
                ? erro
                : ultimaSincronia
                  ? `Sincronizado ${formatarDataRelativa(new Date(ultimaSincronia))}`
                  : 'Ainda não sincronizou'}
            </span>
            <span
              style={{
                display: 'block',
                font: 'var(--type-body)',
                color: 'var(--text-muted)',
                marginTop: 'var(--sp-3)',
                lineHeight: 'var(--lh-normal)',
              }}
            >
              Sozinho ao abrir, alguns segundos depois de cada mudança, e quando a rede volta.
            </span>
          </span>
        </div>

        {falha && (
          <p role="alert" style={{ font: 'var(--type-body)', color: 'var(--orange-500)' }}>
            {falha}
          </p>
        )}

        {aparelhos === null ? (
          <div>
            <Button variant="ghost" size="sm" disabled={ocupado} onClick={verAparelhos}>
              Ver os aparelhos conectados
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {aparelhos.map((a) => (
              <div
                key={a.token}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--sp-6)',
                  minHeight: 'var(--tap-min)',
                  padding: 'var(--sp-4) var(--sp-5)',
                  borderRadius: 'var(--r-nav)',
                  background: a.atual ? 'var(--surface-raised)' : 'transparent',
                }}
              >
                <span style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      font: 'var(--fw-medium) var(--fs-md)/1.3 var(--font-core)',
                      color: 'var(--text-body)',
                    }}
                  >
                    {a.aparelho}
                  </span>
                  <span style={{ display: 'block', font: 'var(--type-body)', color: 'var(--text-muted)' }}>
                    Entrou {formatarDataRelativa(new Date(a.criadaEm))}
                  </span>
                </span>

                {a.atual ? (
                  <Badge tone="ontime" dot={false}>
                    Este aparelho
                  </Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={ocupado}
                    onClick={() =>
                      tentar(async () => {
                        await aoRevogar(a.token);
                        setAparelhos(await listarAparelhos());
                      })
                    }
                  >
                    Desconectar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <div>
          <Button variant="ghost" size="sm" disabled={ocupado} onClick={() => tentar(aoSair)}>
            Sair da conta neste aparelho
          </Button>
        </div>
      </div>
    </Card>
  );
}
