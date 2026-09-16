import React from 'react';
import { Stack, Spec, Note } from './showcase-ui';

/* The token specimens. Values are read from the live CSS custom properties
   rather than duplicated here, so this page can never drift from the tokens. */

function useTokenValue(name: string, scope: React.RefObject<HTMLElement | null>) {
  const [value, setValue] = React.useState('');
  React.useEffect(() => {
    const el = scope.current || document.documentElement;
    setValue(getComputedStyle(el).getPropertyValue(name).trim());
  }, [name, scope]);
  return value;
}

function Swatch({ token, tall }: { token: string; tall?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const value = useTokenValue(token, ref);
  return (
    <div ref={ref} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          height: tall ? 64 : 48,
          borderRadius: 'var(--r-md)',
          border: `var(--bw-hairline) solid var(--border-hairline)`,
          background: `var(${token})`,
        }}
      />
      <span
        style={{
          font: 'var(--fw-regular) var(--fs-micro)/1.3 var(--font-mono)',
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {token}
      </span>
      <span
        style={{
          font: 'var(--fw-regular) var(--fs-micro)/1.3 var(--font-core)',
          color: 'var(--text-subtle)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SwatchGrid({ tokens, tall }: { tokens: string[]; tall?: boolean }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 'var(--sp-6)',
      }}
    >
      {tokens.map((t) => (
        <Swatch key={t} token={t} tall={tall} />
      ))}
    </div>
  );
}

function TokenRow({ token, children }: { token: string; children?: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const value = useTokenValue(token, ref);
  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-8)',
        minHeight: 34,
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          width: 150,
          flex: '0 0 auto',
          font: 'var(--fw-regular) var(--fs-micro)/1.3 var(--font-mono)',
          color: 'var(--text-muted)',
        }}
      >
        {token}
      </span>
      <span
        style={{
          width: 120,
          flex: '0 0 auto',
          font: 'var(--type-body)',
          color: 'var(--text-body)',
        }}
      >
        {value}
      </span>
      {children}
    </div>
  );
}

const PURPLE = [
  '--purple-900',
  '--purple-800',
  '--purple-700',
  '--purple-600',
  '--purple-500',
  '--purple-400',
  '--purple-300',
  '--purple-200',
  '--purple-100',
];
const INK = [
  '--ink-1000',
  '--ink-900',
  '--ink-850',
  '--ink-800',
  '--ink-700',
  '--ink-600',
  '--ink-500',
  '--ink-400',
  '--ink-300',
  '--ink-200',
  '--ink-100',
];
const SEMANTIC = [
  '--green-500',
  '--green-600',
  '--orange-500',
  '--orange-600',
  '--red-500',
  '--red-600',
  '--blue-500',
];
const SURFACES = [
  '--surface-app',
  '--surface-card',
  '--surface-raised',
  '--surface-input',
  '--surface-hover',
  '--surface-active',
  '--surface-scrim',
];
const STATUS = [
  '--status-ontime-bg',
  '--status-delay-bg',
  '--status-delivered-bg',
  '--status-danger-bg',
];
const GRADIENTS = [
  '--gradient-primary',
  '--gradient-primary-hover',
  '--gradient-nav-active',
  '--gradient-kpi-glow',
  '--gradient-promo',
  '--gradient-bar-purple',
  '--gradient-bar-green',
  '--gradient-bar-orange',
  '--gradient-bar-neutral',
  '--gradient-chart-fill',
];
const CHART = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'];

const SPACING = [
  '--sp-1',
  '--sp-2',
  '--sp-3',
  '--sp-4',
  '--sp-5',
  '--sp-6',
  '--sp-7',
  '--sp-8',
  '--sp-9',
  '--sp-10',
  '--sp-11',
  '--sp-12',
  '--sp-14',
  '--sp-16',
  '--sp-20',
];
const RADII = [
  '--r-xs',
  '--r-sm',
  '--r-md',
  '--r-lg',
  '--r-xl',
  '--r-2xl',
  '--r-3xl',
  '--r-4xl',
];
const TYPE_ROLES: [string, string][] = [
  ['--type-page-title', 'Overview'],
  ['--type-page-subtitle', 'Data analytics and insights'],
  ['--type-card-title', 'Top Carriers'],
  ['--type-metric', '$8,126,420'],
  ['--type-metric-lg', '100%'],
  ['--type-body', 'Total amount of orders'],
  ['--type-nav', 'Automations'],
  ['--type-badge', 'DELIVERED'],
];
const ELEVATION = [
  '--shadow-card',
  '--shadow-raised',
  '--shadow-pop',
  '--shadow-modal',
  '--glow-accent',
  '--glow-accent-strong',
  '--glow-success',
  '--glow-danger',
];
const MOTION = [
  '--dur-instant',
  '--dur-fast',
  '--dur-base',
  '--dur-slow',
  '--dur-slower',
  '--ease-standard',
  '--ease-out',
  '--ease-in',
  '--press-scale',
];
const LAYOUT = [
  '--sidebar-w',
  '--topbar-h',
  '--shell-gutter',
  '--card-pad',
  '--card-pad-lg',
  '--card-gap',
  '--row-h',
  '--control-h',
  '--control-h-lg',
  '--tap-min',
  '--content-max',
];

export function TokensSection() {
  return (
    <Stack>
      <Spec name="Brand purple" states="the one brand hue — #682EC7 is the source value">
        <SwatchGrid tokens={PURPLE} />
      </Spec>

      <Spec name="Ink ramp" states="surfaces at the 1000 end, text at the 100 end">
        <SwatchGrid tokens={INK} />
        <Note>
          This is the ramp the light theme mirrors. Every semantic alias below points into it,
          which is why no component needed editing to support light mode.
        </Note>
      </Spec>

      <Spec name="Semantic accents" states="green · orange · red · blue">
        <SwatchGrid tokens={SEMANTIC} />
      </Spec>

      <Spec name="Surfaces" states="canvas → card → raised, three deep and no further">
        <SwatchGrid tokens={SURFACES} />
      </Spec>

      <Spec name="Status fills" states="Delay · On Time · Delivered · danger">
        <SwatchGrid tokens={STATUS} />
      </Spec>

      <Spec name="Gradients" states="the only two functional gradients, plus the bar fills">
        <SwatchGrid tokens={GRADIENTS} tall />
      </Spec>

      <Spec name="Chart series" states="purple → green → orange → white → grey, in that order">
        <SwatchGrid tokens={CHART} />
      </Spec>

      <Spec name="Typography roles" states="each role rendered at its own token">
        <Stack gap="var(--sp-8)">
          {TYPE_ROLES.map(([token, sample]) => (
            <div key={token}>
              <span
                style={{
                  display: 'block',
                  font: 'var(--fw-regular) var(--fs-micro)/1.3 var(--font-mono)',
                  color: 'var(--text-muted)',
                  marginBottom: 4,
                }}
              >
                {token}
              </span>
              <span style={{ font: `var(${token})`, color: 'var(--text-heading)' }}>{sample}</span>
            </div>
          ))}
        </Stack>
        <Note>
          Body copy really is 12px — this is a dense data product, and the scale is built around
          that rather than a 16px web default.
        </Note>
      </Spec>

      <Spec name="Spacing scale" states="2px → 64px">
        <Stack gap="var(--sp-4)">
          {SPACING.map((t) => (
            <TokenRow key={t} token={t}>
              <span
                style={{
                  height: 12,
                  width: `var(${t})`,
                  background: 'var(--gradient-bar-purple)',
                  borderRadius: 'var(--r-xs)',
                }}
              />
            </TokenRow>
          ))}
        </Stack>
      </Spec>

      <Spec name="Radius scale" states="4px → 24px, plus pill">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 'var(--sp-6)',
          }}
        >
          {RADII.map((t) => (
            <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  height: 56,
                  borderRadius: `var(${t})`,
                  background: 'var(--surface-raised)',
                  border: `var(--bw-hairline) solid var(--border-default)`,
                }}
              />
              <span
                style={{
                  font: 'var(--fw-regular) var(--fs-micro)/1.3 var(--font-mono)',
                  color: 'var(--text-muted)',
                }}
              >
                {t}
              </span>
            </div>
          ))}
        </div>
      </Spec>

      <Spec name="Elevation and glow" states="shadows layer, glow signals importance">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 'var(--sp-10)',
          }}
        >
          {ELEVATION.map((t) => (
            <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  height: 64,
                  borderRadius: 'var(--r-card)',
                  background: 'var(--surface-card)',
                  border: `var(--bw-hairline) solid var(--border-hairline)`,
                  boxShadow: `var(${t})`,
                }}
              />
              <span
                style={{
                  font: 'var(--fw-regular) var(--fs-micro)/1.3 var(--font-mono)',
                  color: 'var(--text-muted)',
                }}
              >
                {t}
              </span>
            </div>
          ))}
        </div>
      </Spec>

      <Spec name="Motion" states="short and mechanical — no bounce, no spring, no overshoot">
        <Stack gap="var(--sp-4)">
          {MOTION.map((t) => (
            <TokenRow key={t} token={t} />
          ))}
        </Stack>
        <Note>All durations collapse to 0 under prefers-reduced-motion: reduce.</Note>
      </Spec>

      <Spec name="Layout metrics" states="the fixed shell">
        <Stack gap="var(--sp-4)">
          {LAYOUT.map((t) => (
            <TokenRow key={t} token={t} />
          ))}
        </Stack>
      </Spec>
    </Stack>
  );
}
