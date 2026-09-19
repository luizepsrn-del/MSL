import React from 'react';
import { Icon } from '../core/Icon';

export interface CheckboxProps {
  checked?: boolean;
  /** header "some selected" state — renders a dash */
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
  disabled,
  style,
}: CheckboxProps) {
  const on = checked || indeterminate;
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--sp-4)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.42 : 1,
        ...style,
      }}
    >
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          flex: '0 0 auto',
          borderRadius: 'var(--r-xs)',
          background: on ? 'var(--accent-soft-hover)' : 'transparent',
          border: `1px solid ${on ? 'var(--purple-400)' : 'var(--border-strong)'}`,
          color: 'var(--purple-300)',
          transition: 'var(--t-hover)',
        }}
      >
        {indeterminate ? (
          <Icon name="minus" size={12} />
        ) : checked ? (
          <Icon name="check" size={12} />
        ) : null}
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
