import React from 'react';

export interface StepProgressProps {
  step?: number;
  total?: number;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  style?: React.CSSProperties;
}

export function StepProgress({
  step = 1,
  total = 1,
  title,
  subtitle,
  style,
}: StepProgressProps) {
  const pct = Math.max(0, Math.min(100, (step / total) * 100));

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)', ...style }}
    >
      <div
        style={{
          height: 10,
          borderRadius: 'var(--r-pill)',
          background: 'var(--surface-raised)',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            display: 'block',
            width: `${pct}%`,
            height: '100%',
            borderRadius: 'var(--r-pill)',
            background: 'var(--gradient-bar-purple)',
            boxShadow: 'var(--glow-accent-strong)',
            transition: 'width var(--dur-slow) var(--ease-out)',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--sp-9)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          {title && (
            <h2
              style={{
                font: 'var(--fw-semibold) var(--fs-heading)/1.25 var(--font-core)',
                color: 'var(--text-heading)',
              }}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              style={{
                font: 'var(--type-page-subtitle)',
                color: 'var(--text-muted)',
                marginTop: 6,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        <span
          style={{
            font: 'var(--fw-medium) var(--fs-subheading)/1 var(--font-core)',
            color: 'var(--text-heading)',
            flex: '0 0 auto',
          }}
        >
          {step}
          <span style={{ color: 'var(--text-subtle)' }}>/{total}</span>
        </span>
      </div>
    </div>
  );
}
