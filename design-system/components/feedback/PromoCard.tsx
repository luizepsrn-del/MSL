import React from 'react';
import { Button } from '../core/Button';

export interface PromoCardProps {
  /** the rocket illustration — import it from design-system/assets/img */
  image?: string;
  /** default "Go Premium!" */
  title?: React.ReactNode;
  body?: React.ReactNode;
  /** default "Upgrade Now" */
  actionLabel?: string;
  onAction?: () => void;
  style?: React.CSSProperties;
}

export function PromoCard({
  image,
  title = 'Go Premium!',
  body,
  actionLabel = 'Upgrade Now',
  onAction,
  style,
}: PromoCardProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--sp-6)',
        padding: 'var(--sp-9) var(--sp-8)',
        textAlign: 'center',
        background: 'var(--gradient-promo)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--r-panel)',
        ...style,
      }}
    >
      {image && (
        <img src={image} alt="" style={{ width: '70%', maxWidth: 120, display: 'block' }} />
      )}
      <h4
        style={{
          font: 'var(--fw-medium) var(--fs-lg)/1.2 var(--font-core)',
          color: 'var(--text-heading)',
        }}
      >
        {title}
      </h4>
      {body && (
        <p
          style={{
            font: 'var(--type-body)',
            color: 'var(--text-muted)',
            lineHeight: 'var(--lh-normal)',
          }}
        >
          {body}
        </p>
      )}
      <Button variant="primary" size="sm" onClick={onAction} style={{ marginTop: 'var(--sp-2)' }}>
        {actionLabel}
      </Button>
    </div>
  );
}
