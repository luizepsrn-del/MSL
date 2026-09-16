import React from 'react';
import { ProgressBar } from '../core/ProgressBar';

export interface MetricBarItem {
  label: string;
  /** 0–100 */
  value: number;
  valueLabel?: string;
  tone?: 'purple' | 'green' | 'orange' | 'neutral';
}

export interface MetricBarListProps {
  items: MetricBarItem[];
  style?: React.CSSProperties;
}

export function MetricBarList({ items = [], style }: MetricBarListProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-6)',
        minWidth: 0,
        ...style,
      }}
    >
      {items.map((it) => (
        <ProgressBar
          key={it.label}
          label={it.label}
          value={it.value}
          valueLabel={it.valueLabel ?? `${it.value}%`}
          tone={it.tone || 'neutral'}
        />
      ))}
    </div>
  );
}
