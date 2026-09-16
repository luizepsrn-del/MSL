import React from 'react';
import { Icon } from './Icon';

export interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** right-hand slot in the header — usually a "See All →" Button */
  action?: React.ReactNode;
  children?: React.ReactNode;
  /** CSS length; defaults to var(--card-pad-lg) */
  padding?: string;
  /** adds the purple corner glow used on the first KPI tile */
  glow?: boolean;
  /** removes body padding — for tables that bleed to the card edge */
  flush?: boolean;
  /** renders a ⋮ menu button in the header */
  onMenuClick?: () => void;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}

export function Card({
  title,
  subtitle,
  action,
  children,
  padding,
  glow,
  flush,
  style,
  bodyStyle,
  onMenuClick,
}: CardProps) {
  const pad = padding ?? 'var(--card-pad-lg)';
  return (
    <section
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--r-card)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {glow && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--gradient-kpi-glow)',
            pointerEvents: 'none',
          }}
        />
      )}
      {(title || action) && (
        <header
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--sp-6)',
            padding: `${pad} ${pad} ${subtitle ? 'var(--sp-4)' : 'var(--sp-6)'}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            {title && (
              <h3 style={{ font: 'var(--type-card-title)', color: 'var(--text-heading)' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', marginTop: 2 }}>
                {subtitle}
              </p>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-4)',
              flex: '0 0 auto',
            }}
          >
            {action}
            {onMenuClick && (
              <button
                type="button"
                aria-label="Card menu"
                onClick={onMenuClick}
                style={{
                  background: 'none',
                  border: 0,
                  padding: 4,
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                }}
              >
                <Icon name="more-vertical" size={16} />
              </button>
            )}
          </div>
        </header>
      )}
      <div
        style={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          padding: flush ? 0 : title ? `0 ${pad} ${pad}` : pad,
          ...bodyStyle,
        }}
      >
        {children}
      </div>
    </section>
  );
}
