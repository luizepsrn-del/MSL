import React from 'react';

/* Layout helpers for the showcase page itself. These are page furniture, not
   design-system components — they stay here rather than in the library. */

export function Row({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-6)',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Stack({
  children,
  gap = 'var(--sp-12)',
  style,
}: {
  children?: React.ReactNode;
  gap?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, minWidth: 0, ...style }}>
      {children}
    </div>
  );
}

export function Note({ children }: { children?: React.ReactNode }) {
  return (
    <p
      style={{
        font: 'var(--type-body)',
        color: 'var(--text-subtle)',
        lineHeight: 'var(--lh-normal)',
        maxWidth: 680,
      }}
    >
      {children}
    </p>
  );
}

export function Spec({
  name,
  states,
  children,
}: {
  name: string;
  states: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-8)',
        padding: 'var(--sp-10)',
        background: 'var(--surface-card)',
        border: `var(--bw-hairline) solid var(--border-hairline)`,
        borderRadius: 'var(--r-panel)',
        minWidth: 0,
      }}
    >
      <header>
        <h3
          style={{
            font: 'var(--fw-semibold) var(--fs-lg)/1.2 var(--font-core)',
            color: 'var(--text-heading)',
          }}
        >
          {name}
        </h3>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', marginTop: 4 }}>
          {states}
        </p>
      </header>
      {children}
    </section>
  );
}
