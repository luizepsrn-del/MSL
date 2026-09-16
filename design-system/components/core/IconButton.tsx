import React from 'react';
import { Icon } from './Icon';

export interface IconButtonProps {
  /** kebab-case Lucide name */
  icon: string;
  /** px square, default 36. Never below 44 on touch surfaces. */
  size?: number;
  variant?: 'secondary' | 'ghost' | 'accent';
  /** accessible name — required, the button has no text */
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function IconButton({
  icon,
  size = 36,
  variant = 'secondary',
  label,
  active,
  disabled,
  onClick,
  style,
}: IconButtonProps) {
  const [hover, setHover] = React.useState(false);

  const skin: React.CSSProperties = {
    secondary: {
      background: active ? 'var(--accent)' : hover ? 'var(--surface-raised)' : 'var(--surface-card)',
      border: `1px solid ${active ? 'transparent' : 'var(--border-default)'}`,
      color: active ? 'var(--white)' : 'var(--text-muted)',
    },
    ghost: {
      background: hover ? 'var(--surface-hover)' : 'transparent',
      border: '1px solid transparent',
      color: hover ? 'var(--text-body)' : 'var(--text-muted)',
    },
    accent: {
      background: 'var(--gradient-primary)',
      border: '1px solid transparent',
      color: 'var(--white)',
      boxShadow: hover ? 'var(--glow-accent)' : 'var(--inset-top-sheen)',
    },
  }[variant];

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flex: '0 0 auto',
        borderRadius: 'var(--r-lg)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.42 : 1,
        transition: 'var(--t-hover)',
        ...skin,
        ...style,
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.46)} />
    </button>
  );
}
