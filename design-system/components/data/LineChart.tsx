import React from 'react';

export interface LineSeries {
  data: number[];
  /** default: var(--chart-1) for the first series, var(--chart-5) after */
  color?: string;
  width?: number;
  label?: string;
}

export interface LineChartProps {
  series: LineSeries[];
  /** x-axis labels, e.g. month abbreviations */
  labels?: string[];
  /** y-axis tick labels, top to bottom */
  yTicks?: string[];
  height?: number;
  /** index that gets the vertical band, marker dot and tooltip */
  highlightIndex?: number;
  /** tooltip content, e.g. "$30,89 per munth" */
  tooltip?: React.ReactNode;
  style?: React.CSSProperties;
}

function smooth(pts: [number, number][]) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const mx = (x0 + x1) / 2;
    d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

export function LineChart({
  series = [],
  labels = [],
  yTicks = [],
  height = 240,
  highlightIndex,
  tooltip,
  style,
}: LineChartProps) {
  const W = 1000;
  const H = height;
  const padL = 62;
  const padB = 28;
  const padT = 16;
  const padR = 8;

  const n = Math.max(...series.map((s) => s.data.length), 1);
  const all = series.flatMap((s) => s.data);
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const x = (i: number) => padL + (i / Math.max(n - 1, 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / (max - min || 1)) * (H - padT - padB);

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height, display: 'block', overflow: 'visible' }}
      >
        {yTicks.map((t, i) => {
          const gy = padT + (i / Math.max(yTicks.length - 1, 1)) * (H - padT - padB);
          return (
            <g key={t}>
              <line
                x1={padL}
                x2={W - padR}
                y1={gy}
                y2={gy}
                stroke="var(--chart-grid)"
                strokeDasharray="3 6"
              />
              <text
                x={padL - 12}
                y={gy + 4}
                textAnchor="end"
                fill="var(--chart-axis)"
                style={{ font: '400 13px var(--font-core)' }}
              >
                {t}
              </text>
            </g>
          );
        })}
        {highlightIndex != null && (
          <rect
            x={x(highlightIndex) - 22}
            y={padT}
            width={44}
            height={H - padT - padB}
            fill="rgba(104,46,199,.20)"
            rx="6"
          />
        )}
        {series.map((s, si) => (
          <path
            key={si}
            d={smooth(s.data.map((v, i) => [x(i), y(v)]))}
            fill="none"
            stroke={s.color || (si === 0 ? 'var(--chart-1)' : 'var(--chart-5)')}
            strokeWidth={s.width || 2.5}
            strokeLinecap="round"
          />
        ))}
        {highlightIndex != null && series[0] && (
          <circle
            cx={x(highlightIndex)}
            cy={y(series[0].data[highlightIndex])}
            r="7"
            fill="var(--white)"
            stroke="var(--purple-500)"
            strokeWidth="3"
          />
        )}
        {labels.map((l, i) => (
          <text
            key={l + i}
            x={x(i)}
            y={H - 6}
            textAnchor="middle"
            fill={i === highlightIndex ? 'var(--purple-300)' : 'var(--chart-axis)'}
            style={{ font: '400 13px var(--font-core)' }}
          >
            {l}
          </text>
        ))}
      </svg>
      {tooltip && highlightIndex != null && series[0] && (
        <div
          style={{
            position: 'absolute',
            left: `${((padL + (highlightIndex / Math.max(n - 1, 1)) * (W - padL - padR)) / W) * 100}%`,
            top: `${((y(series[0].data[highlightIndex]) - 46) / H) * 100}%`,
            transform: 'translateX(-50%)',
            padding: '6px 10px',
            borderRadius: 'var(--r-md)',
            background: 'var(--purple-500)',
            color: 'var(--white)',
            font: 'var(--fw-medium) var(--fs-body)/1 var(--font-core)',
            whiteSpace: 'nowrap',
            boxShadow: 'var(--glow-accent)',
            pointerEvents: 'none',
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
