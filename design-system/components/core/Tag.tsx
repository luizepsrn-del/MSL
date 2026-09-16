import React from 'react';

export type TagTone = 'order' | 'invoice' | 'carrier' | 'driver' | 'role' | 'neutral';

export interface TagProps {
  children?: React.ReactNode;
  /** order = purple tint · invoice = solid orange · carrier = solid green · driver / role = tinted · neutral */
  tone?: TagTone;
  /** trailing count chip, as in "Order 17" */
  count?: number | string;
  style?: React.CSSProperties;
}

const TONES: Record<TagTone, { fg: string; bg: string; chip: string }> = {
  order: { fg: 'var(--purple-200)', bg: 'rgba(104,46,199,.22)', chip: 'var(--purple-500)' },
  invoice: { fg: '#2B1B02', bg: 'var(--orange-500)', chip: 'rgba(0,0,0,.22)' },
  carrier: { fg: '#13300B', bg: 'var(--green-500)', chip: 'rgba(0,0,0,.18)' },
  driver: { fg: 'var(--green-500)', bg: 'rgba(125,226,96,.14)', chip: 'rgba(125,226,96,.28)' },
  role: { fg: 'var(--purple-300)', bg: 'rgba(104,46,199,.18)', chip: 'rgba(104,46,199,.4)' },
  neutral: { fg: 'var(--text-muted)', bg: 'var(--surface-raised)', chip: 'var(--ink-600)' },
};

export function Tag({ children, tone = 'neutral', count, style }: TagProps) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 22,
        padding: count == null ? '0 9px' : '0 4px 0 9px',
        borderRadius: 'var(--r-sm)',
        background: t.bg,
        color: t.fg,
        font: 'var(--fw-medium) var(--fs-xs)/1 var(--font-core)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
      {count != null && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            borderRadius: 'var(--r-xs)',
            background: t.chip,
            color: 'var(--white)',
            font: 'var(--type-badge)',
          }}
        >
          {count}
        </span>
      )}
    </span>
  );
}
