import React from 'react';

export interface SelectionToolbarProps {
  count?: number;
  /** row of secondary Buttons — Dismiss / Send Invoice / Report / Edit in the source */
  actions?: React.ReactNode;
  /** right-aligned slot, usually a Select filter */
  trailing?: React.ReactNode;
  style?: React.CSSProperties;
}

export function SelectionToolbar({
  count = 0,
  actions,
  trailing,
  style,
}: SelectionToolbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-8)',
        flexWrap: 'wrap',
        minHeight: 'var(--control-h)',
        ...style,
      }}
    >
      <strong
        style={{
          font: 'var(--fw-medium) var(--fs-lg)/1 var(--font-core)',
          color: 'var(--text-heading)',
        }}
      >
        {count} Item selected
      </strong>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-5)',
          flexWrap: 'wrap',
        }}
      >
        {actions}
      </div>
      {trailing && <div style={{ marginLeft: 'auto' }}>{trailing}</div>}
    </div>
  );
}
