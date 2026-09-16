import React from 'react';
import { Icon } from '../core/Icon';

export interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  /** default "Search" */
  placeholder?: string;
  /** trailing kbd chip — the sidebar field shows "F" */
  shortcut?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  shortcut,
  size = 'md',
  fullWidth,
  style,
}: SearchInputProps) {
  const [focus, setFocus] = React.useState(false);
  const h =
    size === 'lg' ? 'var(--control-h-lg)' : size === 'sm' ? 'var(--control-h-sm)' : 'var(--control-h)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-4)',
        height: h,
        padding: '0 8px 0 12px',
        width: fullWidth ? '100%' : undefined,
        minWidth: 0,
        background: 'var(--surface-input)',
        borderRadius: 'var(--r-control)',
        border: `1px solid ${focus ? 'var(--border-focus)' : 'var(--border-default)'}`,
        transition: 'var(--t-hover)',
        ...style,
      }}
    >
      <Icon name="search" size={15} color="var(--text-muted)" />
      <input
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 0,
          outline: 'none',
          font: 'var(--type-body)',
          color: 'var(--text-body)',
        }}
      />
      {shortcut && (
        <kbd
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 22,
            height: 22,
            padding: '0 6px',
            borderRadius: 'var(--r-xs)',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-hairline)',
            color: 'var(--text-muted)',
            font: 'var(--fw-medium) var(--fs-micro)/1 var(--font-core)',
          }}
        >
          {shortcut}
        </kbd>
      )}
    </div>
  );
}
