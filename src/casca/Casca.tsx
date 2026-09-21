import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Sidebar,
  TopBar,
  PageHeader,
  Icon,
  Avatar,
  SearchInput,
} from '../../design-system';
import { useTheme } from '../theme';
import { useBanco } from '../dados/BancoContexto';
import { useLarguraDesktop } from './useLarguraDesktop';
import { SECOES, porId, PILAR_INICIAL, type Pilar } from './navegacao';
import { TelaEmBranco } from './TelaEmBranco';
import { Inicio } from '../telas/Inicio';
import { Rotinas } from '../telas/Rotinas';
import { Tarefas } from '../telas/Tarefas';
import { Calendario } from '../telas/Calendario';
import { Projetos } from '../telas/Projetos';
import { Financeiro } from '../telas/Financeiro';
import { Metas } from '../telas/Metas';
import { Criacao } from '../telas/Criacao';
import { Agente } from '../telas/Agente';
import { Regras } from '../telas/Regras';
import { Ajustes } from '../telas/Ajustes';

/**
 * A casca do produto.
 *
 * Escolhe entre desktop e mobile pela largura real da janela, coisa que o
 * `AdminShell` da biblioteca nunca fez — ele servia o rail de 224px também no
 * telefone, com 302px vazando de lado. Aqui a troca é por `--bp-desktop`.
 *
 * O `AdminShell` continua existindo e funcionando em
 * `design-system/patterns/desktop/`, servindo a aba Patterns do showcase. Ele
 * é a demonstração da biblioteca; esta é a aplicação.
 */

/** A marca: sem logo na fonte, é o wordmark com o ponto roxo. */
function Marca({ compacta }: { compacta?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        font: `var(--fw-bold) ${compacta ? 'var(--fs-sm)' : 'var(--fs-md)'}/1 var(--font-core)`,
        color: 'var(--ink-100)',
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          flex: '0 0 auto',
          background: 'var(--purple-500)',
          boxShadow: 'var(--glow-accent-strong)',
        }}
      />
      My System Life
    </span>
  );
}

/** O que cada pilar renderiza. O que ainda não existe declara o vazio. */
function Conteudo({ pilar }: { pilar: Pilar }) {
  switch (pilar.id) {
    case 'inicio':
      return <Inicio />;
    case 'rotina':
      return <Rotinas />;
    case 'tarefas':
      return <Tarefas />;
    case 'calendario':
      return <Calendario />;
    case 'projetos':
      return <Projetos />;
    case 'financeiro':
      return <Financeiro />;
    case 'metas':
      return <Metas />;
    case 'criacao':
      return <Criacao />;
    case 'pedir':
      return <Agente />;
    case 'regras':
      return <Regras />;
    case 'ajustes':
      return <Ajustes />;
    default:
      return <TelaEmBranco pilar={pilar} />;
  }
}

/**
 * Quem está usando.
 *
 * Vem das preferências, nunca do código: o repositório é público, e o nome de
 * quem usa o sistema não é dado de programa. Sem nome escolhido, a casca usa o
 * nome do produto — que é verdade, e não um lugar vazio.
 */
function useQuemUsa(): { name: string; role: string } {
  const { banco } = useBanco();
  const nome = banco.preferencias?.nome?.trim();
  return { name: nome || 'My System Life', role: 'Pessoal e profissional' };
}

function CascaDesktop({ pilar, aoNavegar }: { pilar: Pilar; aoNavegar: (id: string) => void }) {
  const { theme, setTheme } = useTheme();
  const quem = useQuemUsa();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--surface-app)',
      }}
    >
      <TopBar
        brand={<Marca />}
        title={pilar.rotulo}
        subtitle={pilar.subtitulo}
        theme={theme}
        onThemeChange={setTheme}
        themeLabel={(m) => (m === 'light' ? 'Tema claro' : 'Tema escuro')}
        user={quem}
      />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar
          sections={SECOES}
          active={pilar.id}
          onSelect={aoNavegar}
          searchPlaceholder="Buscar"
          style={{ paddingTop: 'var(--sp-9)' }}
        />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflowY: 'auto',
            padding: 'var(--shell-gutter)',
          }}
        >
          <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
            <Conteudo pilar={pilar} />
          </div>
        </main>
      </div>
    </div>
  );
}

function CascaMobile({ pilar, aoNavegar }: { pilar: Pilar; aoNavegar: (id: string) => void }) {
  const { theme, setTheme } = useTheme();
  const quem = useQuemUsa();
  const [gaveta, setGaveta] = React.useState(false);
  const [busca, setBusca] = React.useState('');

  const ir = (id: string) => {
    aoNavegar(id);
    setGaveta(false);
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        // 100dvh acompanha a barra do Safari aparecendo e sumindo; 100vh não.
        height: '100dvh',
        overflow: 'hidden',
        background: 'var(--surface-app)',
        // Respeita o notch e o indicador inferior do iPhone.
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--sp-6)',
          padding: 'var(--sp-6) var(--sp-8)',
          flex: '0 0 auto',
        }}
      >
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setGaveta(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 'var(--tap-min)',
            height: 'var(--tap-min)',
            marginLeft: -10,
            background: 'none',
            border: 0,
            cursor: 'pointer',
            color: 'var(--ink-100)',
          }}
        >
          <Icon name="menu" size={22} />
        </button>

        <Marca compacta />

        <button
          type="button"
          aria-label="Alternar tema"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 'var(--tap-min)',
            height: 'var(--tap-min)',
            marginRight: -10,
            background: 'none',
            border: 0,
            cursor: 'pointer',
            color: 'var(--text-muted)',
          }}
        >
          <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={20} />
        </button>
      </header>

      <div style={{ padding: '0 var(--sp-8) var(--sp-6)', flex: '0 0 auto' }}>
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar"
          size="lg"
          fullWidth
        />
      </div>

      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0 var(--sp-8) var(--sp-12)',
        }}
      >
        <PageHeader
          title={pilar.rotulo}
          subtitle={pilar.subtitulo}
          style={{ marginBottom: 'var(--sp-9)' }}
        />
        <Conteudo pilar={pilar} />
      </main>

      {/* Gaveta: o rail de 224px vira menu lateral, mesmas seções, mesmo ativo.

          `inert`, e não `aria-hidden`.

          Tocar num item da gaveta navega **e** fecha a gaveta — e o botão
          tocado continua com o foco enquanto o pai vira escondido. Com
          `aria-hidden` o Chrome recusa e registra no console: "Blocked
          aria-hidden on an element because its descendant retained focus".
          Ele tem razão: esconder da tecnologia assistiva algo que ainda pode
          receber o foco deixa quem navega por teclado ou leitor de tela preso
          num lugar que, para todo mundo, não existe mais.

          `inert` faz as duas coisas — some da árvore de acessibilidade e tira
          o foco de dentro. O `pointer-events` fica como rede: ele já era
          necessário antes e continua protegendo o clique onde o `inert` não
          chegar. */}
      <div
        inert={!gaveta}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 60,
          pointerEvents: gaveta ? 'auto' : 'none',
        }}
      >
        <div
          onClick={() => setGaveta(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--surface-scrim)',
            opacity: gaveta ? 1 : 0,
            transition: 'opacity var(--dur-base) var(--ease-standard)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: 268,
            maxWidth: '85%',
            display: 'flex',
            background: 'var(--surface-app)',
            boxShadow: 'var(--shadow-modal)',
            transform: gaveta ? 'none' : 'translateX(-100%)',
            transition: 'transform var(--dur-slow) var(--ease-out)',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <Sidebar
            sections={SECOES}
            active={pilar.id}
            onSelect={ir}
            search={false}
            width="100%"
            style={{ borderRight: 0, paddingTop: 'var(--sp-12)' }}
            footer={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--sp-5)',
                  padding: 'var(--sp-6)',
                }}
              >
                <Avatar name={quem.name} size={32} />
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      font: 'var(--fw-medium) var(--fs-sm)/1.2 var(--font-core)',
                      color: 'var(--text-body)',
                    }}
                  >
                    {quem.name}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      font: 'var(--fw-regular) var(--fs-xs)/1.2 var(--font-core)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {quem.role}
                  </span>
                </span>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}

export function Casca() {
  const navegar = useNavigate();
  const { pilar: idPilar } = useParams();
  const desktop = useLarguraDesktop();

  const pilar = porId(idPilar ?? PILAR_INICIAL) ?? porId(PILAR_INICIAL)!;
  const aoNavegar = (id: string) => navegar(`/app/${id}`);

  // `null` = ainda não dá para saber qual casca cabe. Renderizar a tela pintada
  // na cor do fundo é melhor que piscar a casca errada por um quadro.
  if (desktop === null) {
    return <div style={{ minHeight: '100dvh', background: 'var(--surface-app)' }} />;
  }

  return desktop ? (
    <CascaDesktop pilar={pilar} aoNavegar={aoNavegar} />
  ) : (
    <CascaMobile pilar={pilar} aoNavegar={aoNavegar} />
  );
}
