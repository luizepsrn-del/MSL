import React from 'react';

export type BadgeTone = 'ontime' | 'delay' | 'delivered' | 'danger' | 'neutral' | 'solid';

export interface BadgeProps {
  children?: React.ReactNode;
  /** ontime = purple · delay = orange · delivered = green · danger = red · solid = filled red count pill */
  tone?: BadgeTone;
  /** leading dot, default true; false for count pills like "2 New" */
  dot?: boolean;
  style?: React.CSSProperties;
}

const TONES: Record<BadgeTone, { fg: string; bg: string; bd: string }> = {
  ontime: {
    fg: 'var(--status-ontime-fg)',
    bg: 'var(--status-ontime-bg)',
    bd: 'var(--status-ontime-bd)',
  },
  delay: {
    fg: 'var(--status-delay-fg)',
    bg: 'var(--status-delay-bg)',
    bd: 'var(--status-delay-bd)',
  },
  delivered: {
    fg: 'var(--status-delivered-fg)',
    bg: 'var(--status-delivered-bg)',
    bd: 'var(--status-delivered-bd)',
  },
  danger: {
    fg: 'var(--status-danger-fg)',
    bg: 'var(--status-danger-bg)',
    bd: 'var(--status-danger-bd)',
  },
  neutral: { fg: 'var(--text-muted)', bg: 'var(--surface-raised)', bd: 'var(--border-default)' },
  solid: { fg: 'var(--white)', bg: 'var(--red-500)', bd: 'transparent' },
};

export function Badge({ children, tone = 'neutral', dot = true, style }: BadgeProps) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 22,
        padding: '0 9px',
        borderRadius: 'var(--r-pill)',
        background: t.bg,
        border: `1px solid ${t.bd}`,
        color: t.fg,
        font: 'var(--fw-medium) var(--fs-xs)/1 var(--font-core)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'currentColor',
            flex: '0 0 auto',
          }}
        />
      )}
      {children}
    </span>
  );
}
