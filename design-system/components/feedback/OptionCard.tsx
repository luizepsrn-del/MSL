import React from 'react';
import { Icon } from '../core/Icon';

export interface OptionCardProps {
  /** kebab-case Lucide name */
  icon: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function OptionCard({
  icon,
  title,
  description,
  selected,
  onClick,
  style,
}: OptionCardProps) {
  const [hover, setHover] = React.useState(false);
  const on = selected || hover;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-8)',
        width: '100%',
        padding: 'var(--sp-8)',
        cursor: 'pointer',
        textAlign: 'left',
        background: selected ? 'var(--accent-soft)' : 'var(--surface-raised)',
        border: `1px solid ${on ? 'var(--border-accent)' : 'var(--border-hairline)'}`,
        borderRadius: 'var(--r-xl)',
        transition: 'var(--t-hover)',
        ...style,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 48,
          height: 48,
          flex: '0 0 auto',
          borderRadius: '50%',
          border: '1px solid var(--border-accent)',
          color: 'var(--purple-300)',
        }}
      >
        <Icon name={icon} size={22} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            font: 'var(--fw-medium) var(--fs-lg)/1.3 var(--font-core)',
            color: 'var(--text-heading)',
          }}
        >
          {title}
        </span>
        {description && (
          <span
            style={{
              display: 'block',
              font: 'var(--type-body)',
              color: 'var(--text-muted)',
              marginTop: 4,
              lineHeight: 'var(--lh-normal)',
            }}
          >
            {description}
          </span>
        )}
      </span>
    </button>
  );
}
