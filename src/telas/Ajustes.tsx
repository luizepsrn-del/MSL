import React from 'react';
import { Card, Button, Badge, Icon, SuccessDialog } from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import { VERSAO_ESQUEMA, COLECOES, nomearColecao } from '../dados/esquema';
import { formatarData, formatarNumero } from '../formato';
import {
  descreverUltimoBackup,
  precisaDeBackup,
  diasSemBackup,
  DIAS_ATE_COBRAR,
} from '../dominio/backup';

/**
 * Ajustes — e o backup, que é o que realmente importa aqui.
 *
 * A exportação existe no repositório desde o primeiro pilar, mas até agora não
 * tinha botão em lugar nenhum. Backup sem botão é backup que não existe.
 */
export function Ajustes() {
  const { banco, exportar, importar, definirPreferencias } = useBanco();
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
            Tudo fica no navegador deste aparelho. Nada sai daqui, e nada sincroniza com outro
            aparelho ainda — o que eu criar no Mac não aparece no telefone.
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
