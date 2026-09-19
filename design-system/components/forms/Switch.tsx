import React from 'react';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  size = 'md',
  style,
}: SwitchProps) {
  const w = size === 'sm' ? 32 : 40;
  const h = size === 'sm' ? 18 : 22;
  const k = h - 6;

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--sp-5)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.42 : 1,
        ...style,
      }}
    >
      <input
        type="checkbox"
        role="switch"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      <span
        style={{
          position: 'relative',
          display: 'inline-block',
          width: w,
          height: h,
          flex: '0 0 auto',
          borderRadius: 'var(--r-pill)',
          background: checked ? 'var(--gradient-bar-purple)' : 'var(--ink-600)',
          transition: 'background var(--dur-base) var(--ease-standard)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? w - k - 3 : 3,
            width: k,
            height: k,
            borderRadius: '50%',
            background: checked ? 'var(--white)' : 'var(--ink-300)',
            transition: 'left var(--dur-base) var(--ease-out)',
            boxShadow: '0 1px 2px rgba(0,0,0,.4)',
          }}
        />
      </span>
      {/* `min-width: 0` porque este é um item de flex: sem ele o padrão é
          `auto`, o rótulo comprido se recusa a encolher, transborda a caixa e
          pinta por cima do que estiver ao lado. */}
      {label && (
        <span style={{ font: 'var(--type-body)', color: 'var(--text-body)', minWidth: 0 }}>
          {label}
        </span>
      )}
    </label>
  );
}
