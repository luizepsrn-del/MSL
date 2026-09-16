import React from 'react';
import { Button } from '../core/Button';

export interface PromoBannerProps {
  title: React.ReactNode;
  body?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  /** the logistics collage — import it from design-system/assets/img */
  image?: string;
  style?: React.CSSProperties;
}

export function PromoBanner({
  title,
  body,
  actionLabel,
  onAction,
  image,
  style,
}: PromoBannerProps) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: 160,
        padding: 'var(--sp-10) var(--sp-12)',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--r-panel)',
        ...style,
      }}
    >
      {image && (
        <img
          src={image}
          alt=""
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            height: '100%',
            width: '62%',
            objectFit: 'cover',
            objectPosition: 'right center',
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ position: 'relative', maxWidth: 420 }}>
        <h2
          style={{
            font: 'var(--fw-medium) var(--fs-heading)/1.3 var(--font-core)',
            color: 'var(--text-heading)',
          }}
        >
          {title}
        </h2>
        {body && (
          <p
            style={{
              font: 'var(--type-body)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-5)',
              lineHeight: 'var(--lh-normal)',
            }}
          >
            {body}
          </p>
        )}
        {actionLabel && (
          <Button
            variant="primary"
            size="md"
            onClick={onAction}
            style={{ marginTop: 'var(--sp-8)' }}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
