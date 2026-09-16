import React from 'react';
import { Icon } from '../core/Icon';

export type DeltaTone = 'delivered' | 'delay' | 'danger';

export interface StatCardProps {
  /** kebab-case Lucide name */
  icon: string;
  value: React.ReactNode;
  label: React.ReactNode;
  /** optional trend figure beside the value, e.g. "+12%" */
  delta?: React.ReactNode;
  deltaTone?: DeltaTone;
  /** purple corner wash — the lead tile only */
  glow?: boolean;
  style?: React.CSSProperties;
}

const DELTA_TONES: Record<DeltaTone, string> = {
  delivered: 'var(--green-500)',
  delay: 'var(--orange-500)',
  danger: 'var(--red-500)',
};

export function StatCard({
  icon,
  value,
  label,
  delta,
  deltaTone = 'delivered',
  glow,
  style,
}: StatCardProps) {
  const tone = DELTA_TONES[deltaTone] || 'var(--text-muted)';
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-9)',
        minWidth: 0,
        padding: 'var(--card-pad-lg)',
        overflow: 'hidden',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--r-card)',
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
    >
      {glow && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--gradient-kpi-glow)',
            pointerEvents: 'none',
          }}
        />
      )}
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 38,
          height: 38,
          borderRadius: '50%',
          flex: '0 0 auto',
          background: 'var(--surface-raised)',
          border: '1px solid var(--border-hairline)',
          color: 'var(--text-body)',
        }}
      >
        <Icon name={icon} size={19} />
      </span>
      <div style={{ position: 'relative', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--sp-5)',
            flexWrap: 'wrap',
          }}
        >
          <strong
            style={{
              font: 'var(--type-metric)',
              color: 'var(--text-heading)',
              letterSpacing: 'var(--ls-tight)',
            }}
          >
            {value}
          </strong>
          {delta && (
            <span
              style={{
                font: 'var(--fw-medium) var(--fs-body)/1 var(--font-core)',
                color: tone,
              }}
            >
              {delta}
            </span>
          )}
        </div>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', marginTop: 4 }}>{label}</p>
      </div>
    </div>
  );
}
