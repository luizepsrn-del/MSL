import React from 'react';
import { Icon } from '../core/Icon';
import { Checkbox } from '../forms/Checkbox';

export interface DataTableColumn<R> {
  key: string;
  header: React.ReactNode;
  /** CSS grid track, e.g. "120px" or "minmax(0,2fr)" */
  width?: string;
  align?: 'left' | 'right';
  sortable?: boolean;
  /** cell renderer — return a Badge, Tag, Avatar block, etc. */
  render?: (row: R) => React.ReactNode;
  sortValue?: (row: R) => string | number;
}

export interface DataTableProps<R> {
  columns: DataTableColumn<R>[];
  rows: R[];
  selectable?: boolean;
  /** array of row keys */
  selected?: string[];
  onSelectedChange?: (selected: string[]) => void;
  rowKey?: (row: R) => string;
  onRowClick?: (row: R) => void;
  emptyMessage?: string;
  style?: React.CSSProperties;
}

interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

export function DataTable<R extends Record<string, unknown>>({
  columns = [],
  rows = [],
  selectable,
  selected = [],
  onSelectedChange,
  rowKey = (r) => String((r as { id?: unknown }).id),
  onRowClick,
  emptyMessage = 'Nothing here yet',
  style,
}: DataTableProps<R>) {
  const [sort, setSort] = React.useState<SortState | null>(null);
  const sel = new Set(selected);
  const allOn = rows.length > 0 && rows.every((r) => sel.has(rowKey(r)));
  const someOn = rows.some((r) => sel.has(rowKey(r)));

  const toggle = (k: string, on: boolean) => {
    const next = new Set(sel);
    if (on) next.add(k);
    else next.delete(k);
    onSelectedChange?.([...next]);
  };

  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const get = (r: R) => (col.sortValue ? col.sortValue(r) : (r[col.key] as string | number));
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const c = x == null ? -1 : y == null ? 1 : x > y ? 1 : x < y ? -1 : 0;
      return sort.dir === 'desc' ? -c : c;
    });
  }, [rows, sort, columns]);

  const grid =
    (selectable ? '40px ' : '') + columns.map((c) => c.width || 'minmax(0,1fr)').join(' ');

  return (
    <div
      style={{
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: grid,
          alignItems: 'center',
          gap: 'var(--sp-6)',
          minHeight: 44,
          padding: '0 var(--sp-8)',
          background: 'var(--surface-raised)',
        }}
      >
        {selectable && (
          <Checkbox
            checked={allOn}
            indeterminate={!allOn && someOn}
            onChange={(on) => onSelectedChange && onSelectedChange(on ? rows.map(rowKey) : [])}
          />
        )}
        {columns.map((c) => (
          <button
            key={c.key}
            type="button"
            disabled={!c.sortable}
            onClick={() =>
              setSort((s) =>
                s && s.key === c.key
                  ? s.dir === 'asc'
                    ? { key: c.key, dir: 'desc' }
                    : null
                  : { key: c.key, dir: 'asc' },
              )
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              minWidth: 0,
              padding: 0,
              border: 0,
              background: 'none',
              textAlign: c.align === 'right' ? 'right' : 'left',
              justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
              cursor: c.sortable ? 'pointer' : 'default',
              font: 'var(--type-body)',
              color: sort && sort.key === c.key ? 'var(--text-body)' : 'var(--text-muted)',
            }}
          >
            <span
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {c.header}
            </span>
            {c.sortable && <Icon name="arrow-up-down" size={12} />}
          </button>
        ))}
      </div>
      {sorted.length === 0 ? (
        <p
          style={{
            padding: 'var(--sp-14) var(--sp-8)',
            textAlign: 'center',
            font: 'var(--type-body)',
            color: 'var(--text-subtle)',
          }}
        >
          {emptyMessage}
        </p>
      ) : (
        sorted.map((r) => {
          const k = rowKey(r);
          const on = sel.has(k);
          return (
            <div
              key={k}
              onClick={() => onRowClick && onRowClick(r)}
              style={{
                display: 'grid',
                gridTemplateColumns: grid,
                alignItems: 'center',
                gap: 'var(--sp-6)',
                minHeight: 'var(--row-h)',
                padding: 'var(--sp-5) var(--sp-8)',
                borderTop: '1px solid var(--border-hairline)',
                background: on ? 'var(--surface-active)' : 'transparent',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'var(--t-hover)',
              }}
            >
              {selectable && <Checkbox checked={on} onChange={(v) => toggle(k, v)} />}
              {columns.map((c) => (
                <div
                  key={c.key}
                  style={{
                    minWidth: 0,
                    font: 'var(--type-body)',
                    color: 'var(--text-body)',
                    textAlign: c.align === 'right' ? 'right' : 'left',
                    display: 'flex',
                    justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
                    alignItems: 'center',
                  }}
                >
                  {c.render ? c.render(r) : (r[c.key] as React.ReactNode)}
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
