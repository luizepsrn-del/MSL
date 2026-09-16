import React from 'react';

export interface BarChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  /** index rendered in the purple gradient, with an optional value pill above it */
  highlightIndex?: number;
  valueLabel?: React.ReactNode;
  style?: React.CSSProperties;
}

export function BarChart({
  data = [],
  labels = [],
  height = 180,
  highlightIndex,
  valueLabel,
  style,
}: BarChartProps) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ minWidth: 0, ...style }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 'var(--sp-4)',
          height,
          minWidth: 0,
        }}
      >
        {data.map((v, i) => {
          const on = i === highlightIndex;
          return (
            <div
              key={i}
              style={{
                position: 'relative',
                flex: 1,
                minWidth: 0,
                height: '100%',
                display: 'flex',
                alignItems: 'flex-end',
              }}
            >
              {on && valueLabel && (
                <span
                  style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bottom: `calc(${(v / max) * 100}% + 8px)`,
                    padding: '4px 8px',
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--purple-500)',
                    color: 'var(--white)',
                    font: 'var(--fw-medium) var(--fs-micro)/1 var(--font-core)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {valueLabel}
                </span>
              )}
              <span
                style={{
                  width: '100%',
                  height: `${(v / max) * 100}%`,
                  borderRadius: 'var(--r-sm)',
                  background: on ? 'var(--gradient-bar-purple)' : 'var(--ink-700)',
                  transition: 'height var(--dur-slow) var(--ease-out)',
                }}
              />
            </div>
          );
        })}
      </div>
      {labels.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--sp-4)', marginTop: 'var(--sp-5)' }}>
          {labels.map((l, i) => (
            <span
              key={l + i}
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: 'center',
                font: 'var(--type-body)',
                color: i === highlightIndex ? 'var(--purple-300)' : 'var(--text-muted)',
              }}
            >
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
