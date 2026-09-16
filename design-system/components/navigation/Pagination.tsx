import React from 'react';
import { Button } from '../core/Button';

export interface PaginationProps {
  page?: number;
  total?: number;
  onChange?: (page: number) => void;
  style?: React.CSSProperties;
}

const ELLIPSIS = '…';

function pages(total: number, current: number): (number | typeof ELLIPSIS)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, ELLIPSIS, total - 2, total - 1, total];
  if (current >= total - 2) return [1, 2, 3, ELLIPSIS, total - 2, total - 1, total];
  return [1, ELLIPSIS, current, ELLIPSIS, total];
}

export function Pagination({ page = 1, total = 1, onChange, style }: PaginationProps) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--sp-6)',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      <Button
        variant="secondary"
        size="sm"
        iconLeft="arrow-left"
        disabled={page <= 1}
        onClick={() => onChange && onChange(page - 1)}
      >
        Previous
      </Button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        {pages(total, page).map((p, i) =>
          p === ELLIPSIS ? (
            <span
              key={`e${i}`}
              style={{
                width: 28,
                textAlign: 'center',
                font: 'var(--type-body)',
                color: 'var(--text-subtle)',
              }}
            >
              {ELLIPSIS}
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange && onChange(p)}
              style={{
                minWidth: 30,
                height: 30,
                padding: '0 6px',
                cursor: 'pointer',
                border: 0,
                borderRadius: 'var(--r-sm)',
                background: p === page ? 'var(--gradient-primary)' : 'transparent',
                color: p === page ? 'var(--white)' : 'var(--text-muted)',
                font: 'var(--fw-medium) var(--fs-body)/1 var(--font-core)',
                transition: 'var(--t-hover)',
              }}
            >
              {pad(p)}
            </button>
          ),
        )}
      </div>
      <Button
        variant="primary"
        size="sm"
        iconRight="arrow-right"
        disabled={page >= total}
        onClick={() => onChange && onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
