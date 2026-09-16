import React from 'react';

export type ProgressTone = 'purple' | 'green' | 'orange' | 'neutral' | 'accent';

export interface ProgressBarProps {
  /** 0–100 */
  value?: number;
  tone?: ProgressTone;
  /** px track height, default 8 */
  height?: number;
  label?: React.ReactNode;
  /** right-aligned figure, e.g. "57%" */
  valueLabel?: React.ReactNode;
  style?: React.CSSProperties;
}

const FILLS: Record<ProgressTone, string> = {
  purple: 'var(--gradient-bar-purple)',
  green: 'var(--gradient-bar-green)',
  orange: 'var(--gradient-bar-orange)',
  neutral: 'var(--gradient-bar-neutral)',
  accent: 'var(--accent)',
};

const LABEL_COLOR: Record<ProgressTone, string> = {
  purple: 'var(--purple-300)',
  green: 'var(--green-500)',
  orange: 'var(--orange-500)',
  neutral: 'var(--text-body)',
  accent: 'var(--ink-200)',
};

export function ProgressBar({
  value = 0,
  tone = 'purple',
  height = 8,
  label,
  valueLabel,
  style,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ minWidth: 0, ...style }}>
      {(label || valueLabel) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--sp-4)',
            marginBottom: 6,
          }}
        >
          {label && (
            <span style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>{label}</span>
          )}
          {valueLabel && (
            <span
              style={{
                font: 'var(--fw-medium) var(--fs-body)/1 var(--font-core)',
                color: LABEL_COLOR[tone] || LABEL_COLOR.neutral,
              }}
            >
              {valueLabel}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height,
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
            background: FILLS[tone] || FILLS.purple,
            transition: 'width var(--dur-slow) var(--ease-out)',
          }}
        />
      </div>
    </div>
  );
}
