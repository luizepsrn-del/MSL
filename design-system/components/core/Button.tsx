import React from 'react';
import { Icon } from './Icon';

export interface ButtonProps {
  children?: React.ReactNode;
  /** primary = purple gradient · secondary = card fill + hairline · outline = purple hairline · ghost = bare · danger = red */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** kebab-case Lucide name */
  iconLeft?: string;
  iconRight?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}

const SIZES = {
  sm: { h: 'var(--control-h-sm)', px: 12, fs: 'var(--fs-body)', icon: 14, gap: 6 },
  md: { h: 'var(--control-h)', px: 16, fs: 'var(--fs-sm)', icon: 16, gap: 8 },
  lg: { h: 'var(--control-h-lg)', px: 22, fs: 'var(--fs-md)', icon: 18, gap: 10 },
} as const;

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  disabled,
  fullWidth,
  onClick,
  type = 'button',
  style,
}: ButtonProps) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const s = SIZES[size] || SIZES.md;

  const skin: React.CSSProperties =
    {
      primary: {
        background: hover ? 'var(--gradient-primary-hover)' : 'var(--gradient-primary)',
        color: 'var(--text-on-accent)',
        border: '1px solid transparent',
        boxShadow: hover ? 'var(--glow-accent)' : 'var(--inset-top-sheen)',
      },
      secondary: {
        background: hover ? 'var(--surface-raised)' : 'var(--surface-card)',
        color: 'var(--text-body)',
        border: '1px solid var(--border-default)',
      },
      outline: {
        background: hover ? 'var(--accent-soft)' : 'transparent',
        color: 'var(--purple-300)',
        border: '1px solid var(--border-accent)',
      },
      ghost: {
        background: hover ? 'var(--surface-hover)' : 'transparent',
        color: 'var(--text-muted)',
        border: '1px solid transparent',
      },
      danger: {
        background: hover ? 'var(--red-600)' : 'var(--red-500)',
        color: 'var(--white)',
        border: '1px solid transparent',
      },
    }[variant] || {};

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPress(false);
      }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        height: s.h,
        padding: `0 ${s.px}px`,
        width: fullWidth ? '100%' : undefined,
        font: `var(--fw-medium) ${s.fs}/1 var(--font-core)`,
        borderRadius: 'var(--r-control)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.42 : 1,
        transform: press && !disabled ? 'scale(var(--press-scale))' : 'none',
        transition:
          'var(--t-hover), transform var(--dur-fast) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard)',
        whiteSpace: 'nowrap',
        ...skin,
        ...style,
      }}
    >
      {iconLeft && <Icon name={iconLeft} size={s.icon} />}
      {children}
      {iconRight && <Icon name={iconRight} size={s.icon} />}
    </button>
  );
}
