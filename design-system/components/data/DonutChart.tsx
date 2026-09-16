import React from 'react';

export interface DonutSegment {
  value: number;
  /** any CSS colour; use var(--chart-1…5) */
  color: string;
  label?: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  /** px, default 180 */
  size?: number;
  /** ring width, default 26 */
  thickness?: number;
  /** px gap between segments, default 3 */
  gap?: number;
  centerValue?: React.ReactNode;
  centerLabel?: React.ReactNode;
  style?: React.CSSProperties;
}

export function DonutChart({
  segments = [],
  size = 180,
  thickness = 26,
  gap = 3,
  centerValue,
  centerLabel,
  style,
}: DonutChartProps) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto', ...style }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-raised)"
          strokeWidth={thickness}
        />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const dash = Math.max(0, len - gap);
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeLinecap="butt"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {(centerValue || centerLabel) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          {centerValue && (
            <strong style={{ font: 'var(--type-metric-lg)', color: 'var(--text-heading)' }}>
              {centerValue}
            </strong>
          )}
          {centerLabel && (
            <span style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
