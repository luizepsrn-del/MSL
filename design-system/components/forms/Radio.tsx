import React from 'react';

export interface RadioOption {
  value: string;
  label: React.ReactNode;
}

export interface RadioProps {
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

export function Radio({ options = [], value, onChange, style }: RadioProps) {
  return (
    <div
      role="radiogroup"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-9)',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <label
            key={o.value}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--sp-4)',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              checked={on}
              onChange={() => onChange && onChange(o.value)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                flex: '0 0 auto',
                borderRadius: '50%',
                border: `1.5px solid ${on ? 'var(--purple-400)' : 'var(--ink-500)'}`,
                transition: 'var(--t-hover)',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: on ? 'var(--purple-400)' : 'var(--ink-500)',
                }}
              />
            </span>
            <span
              style={{
                font: 'var(--type-body)',
                color: on ? 'var(--text-body)' : 'var(--text-muted)',
              }}
            >
              {o.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
