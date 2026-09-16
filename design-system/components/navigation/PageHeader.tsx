import React from 'react';

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

export function PageHeader({ title, subtitle, actions, style }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 'var(--sp-9)',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 style={{ font: 'var(--type-page-title)', color: 'var(--text-heading)' }}>{title}</h1>
        {subtitle && (
          <p
            style={{
              font: 'var(--type-page-subtitle)',
              color: 'var(--text-muted)',
              marginTop: 2,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)' }}>{actions}</div>
      )}
    </div>
  );
}
