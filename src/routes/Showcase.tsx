import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Button,
  Icon,
  AdminShell,
  MobileShell,
  PhoneFrame,
  Brand,
} from '../../design-system';
import type { ThemeName } from '../../design-system';
import { useTheme } from '../theme';
import { Stack, Note } from './showcase-ui';
import {
  CoreSection,
  FormsSection,
  NavigationSection,
  DataSection,
  MessagingSection,
  FeedbackSection,
} from './showcase-sections';
import { TokensSection } from './showcase-tokens';

type Tab =
  | 'tokens'
  | 'core'
  | 'forms'
  | 'navigation'
  | 'data'
  | 'messaging'
  | 'feedback'
  | 'patterns';

const TABS: { id: Tab; label: string; count?: number }[] = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'core', label: 'Core', count: 8 },
  { id: 'forms', label: 'Forms', count: 5 },
  { id: 'navigation', label: 'Navigation', count: 4 },
  { id: 'data', label: 'Data', count: 8 },
  { id: 'messaging', label: 'Messaging', count: 3 },
  { id: 'feedback', label: 'Feedback', count: 6 },
  { id: 'patterns', label: 'Patterns' },
];

function PatternsSection() {
  const [device, setDevice] = React.useState<'desktop' | 'mobile'>('desktop');
  return (
    <Stack>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-6)',
          flexWrap: 'wrap',
        }}
      >
        <Button
          variant={device === 'desktop' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setDevice('desktop')}
        >
          Desktop kit
        </Button>
        <Button
          variant={device === 'mobile' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setDevice('mobile')}
        >
          Mobile kit
        </Button>
      </div>
      <Note>
        The five designed views — Overview, Orders, Automations, Analytics, Messages — plus the
        Account Set Up modal and the &ldquo;Order updated!&rdquo; confirmation. Carriers,
        Invoice, Reporting, Settings and Help render a stated placeholder because the source
        never draws them. These shells follow the page theme.
      </Note>
      {device === 'desktop' ? (
        <div
          style={{
            height: 760,
            overflow: 'hidden',
            border: `var(--bw-hairline) solid var(--border-hairline)`,
            borderRadius: 'var(--r-panel)',
          }}
        >
          <AdminShell />
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-10) 0' }}>
          <PhoneFrame>
            <MobileShell />
          </PhoneFrame>
        </div>
      )}
    </Stack>
  );
}

function SectionBody({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'tokens':
      return <TokensSection />;
    case 'core':
      return <CoreSection />;
    case 'forms':
      return <FormsSection />;
    case 'navigation':
      return <NavigationSection />;
    case 'data':
      return <DataSection />;
    case 'messaging':
      return <MessagingSection />;
    case 'feedback':
      return <FeedbackSection />;
    case 'patterns':
      return <PatternsSection />;
  }
}

/** One themed pane. `forced` pins a theme regardless of the page theme. */
function Pane({ tab, forced }: { tab: Tab; forced?: ThemeName }) {
  return (
    <div
      data-theme={forced}
      style={{
        minWidth: 0,
        padding: forced ? 'var(--sp-10)' : 0,
        borderRadius: forced ? 'var(--r-panel)' : undefined,
        border: forced ? `var(--bw-hairline) solid var(--border-hairline)` : undefined,
      }}
    >
      {forced && (
        <p
          style={{
            font: 'var(--fw-medium) var(--fs-xs)/1 var(--font-core)',
            color: 'var(--text-muted)',
            letterSpacing: 'var(--ls-caps)',
            textTransform: 'uppercase',
            marginBottom: 'var(--sp-9)',
          }}
        >
          {forced}
        </p>
      )}
      <SectionBody tab={tab} />
    </div>
  );
}

const THEMES: ThemeName[] = ['light', 'dark'];

/**
 * /design-system — the whole library, every state, both themes.
 *
 * "Compare themes" renders the current section twice side by side, one pane
 * pinned light and one pinned dark, using the scoped [data-theme] blocks in
 * design-system/tokens/themes.css.
 */
export function Showcase() {
  const { theme, setTheme } = useTheme();
  const [params, setParams] = useSearchParams();
  const [compare, setCompare] = React.useState(false);

  // The section lives in the URL so a specific part of the library can be
  // linked to directly — /design-system?section=data.
  const requested = params.get('section');
  const tab: Tab = TABS.some((t) => t.id === requested) ? (requested as Tab) : 'tokens';
  const setTab = (next: Tab) => setParams({ section: next }, { replace: true });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-app)' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-6)',
          padding: 'var(--sp-9) var(--shell-gutter)',
          background: 'var(--surface-app)',
          borderBottom: `var(--bw-hairline) solid var(--border-hairline)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-9)',
            flexWrap: 'wrap',
          }}
        >
          <Brand />
          <div style={{ minWidth: 0 }}>
            <h1 style={{ font: 'var(--type-page-title)', color: 'var(--text-heading)' }}>
              Design system
            </h1>
            <p style={{ font: 'var(--type-page-subtitle)', color: 'var(--text-muted)' }}>
              34 components · 2 UI kits · the tokens they are built from
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-5)',
              marginLeft: 'auto',
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant={compare ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setCompare((c) => !c)}
            >
              Compare themes
            </Button>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                padding: 4,
                background: 'var(--surface-raised)',
                border: `var(--bw-hairline) solid var(--border-hairline)`,
                borderRadius: 'var(--r-lg)',
              }}
            >
              {THEMES.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-label={`${m} theme`}
                  aria-pressed={theme === m}
                  onClick={() => setTheme(m)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 'var(--r-md)',
                    border: 0,
                    cursor: 'pointer',
                    background: theme === m ? 'var(--accent)' : 'transparent',
                    color: theme === m ? 'var(--white)' : 'var(--text-muted)',
                    transition: 'var(--t-hover)',
                  }}
                >
                  <Icon name={m === 'light' ? 'sun' : 'moon'} size={15} />
                </button>
              ))}
            </div>
            <Link to="/app" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" size="sm" iconRight="arrow-right">
                Open the app
              </Button>
            </Link>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 32,
                padding: '0 var(--sp-6)',
                cursor: 'pointer',
                borderRadius: 'var(--r-nav)',
                border: `1px solid ${tab === t.id ? 'transparent' : 'var(--border-hairline)'}`,
                background: tab === t.id ? 'var(--gradient-nav-active)' : 'transparent',
                color: tab === t.id ? 'var(--white)' : 'var(--text-muted)',
                font: 'var(--fw-medium) var(--fs-body)/1 var(--font-core)',
                transition: 'var(--t-hover)',
              }}
            >
              {t.label}
              {t.count != null && (
                <span style={{ color: tab === t.id ? 'var(--purple-200)' : 'var(--text-subtle)' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main
        style={{
          padding: 'var(--sp-12) var(--shell-gutter) var(--sp-20)',
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
        }}
      >
        {compare ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: 'var(--card-gap)',
              alignItems: 'start',
            }}
          >
            <Pane tab={tab} forced="light" />
            <Pane tab={tab} forced="dark" />
          </div>
        ) : (
          <Pane tab={tab} />
        )}

        <footer
          style={{
            marginTop: 'var(--sp-20)',
            paddingTop: 'var(--sp-12)',
            borderTop: `var(--bw-hairline) solid var(--border-hairline)`,
          }}
        >
          <Note>
            The visual contract lives in <strong>DESIGN.md</strong> at the repository root. The
            library map, including how to add a component, is in{' '}
            <strong>design-system/README.md</strong>. The original static specimen pages are
            preserved under <strong>design-system/reference/</strong> —{' '}
            <a href="/design-system/reference/index.html">open the reference index</a>.
          </Note>
        </footer>
      </main>
    </div>
  );
}
