import React from 'react';
import { Icon } from '../core/Icon';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

export function Select({
  options = [],
  value,
  onChange,
  placeholder = 'Select',
  size = 'md',
  fullWidth,
  style,
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const away = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const current = options.find((o) => o.value === value);
  const h =
    size === 'sm' ? 'var(--control-h-sm)' : size === 'lg' ? 'var(--control-h-lg)' : 'var(--control-h)';

  return (
    <div ref={ref} style={{ position: 'relative', width: fullWidth ? '100%' : undefined, ...style }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--sp-5)',
          height: h,
          padding: '0 12px',
          width: '100%',
          cursor: 'pointer',
          background: 'var(--surface-card)',
          border: `1px solid ${open ? 'var(--border-focus)' : 'var(--border-default)'}`,
          borderRadius: 'var(--r-control)',
          font: 'var(--type-body)',
          color: current ? 'var(--text-body)' : 'var(--text-muted)',
          transition: 'var(--t-hover)',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current ? current.label : placeholder}
        </span>
        <Icon
          name="chevron-down"
          size={15}
          color="var(--text-muted)"
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'var(--t-transform)',
          }}
        />
      </button>
      {open && (
        <ul
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: '100%',
            zIndex: 40,
            margin: 0,
            padding: 6,
            listStyle: 'none',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--r-lg)',
            boxShadow: 'var(--shadow-pop)',
          }}
        >
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => {
                  onChange?.(o.value);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--sp-5)',
                  width: '100%',
                  height: 32,
                  padding: '0 10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: o.value === value ? 'var(--accent-soft)' : 'transparent',
                  border: 0,
                  borderRadius: 'var(--r-sm)',
                  font: 'var(--type-body)',
                  color: o.value === value ? 'var(--purple-200)' : 'var(--text-body)',
                }}
              >
                {o.label}
                {o.value === value && <Icon name="check" size={13} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
