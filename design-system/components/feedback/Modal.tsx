import React from 'react';
import { Icon } from '../core/Icon';

export interface ModalProps {
  open?: boolean;
  onClose?: () => void;
  /** max width in px, default 520 */
  width?: number;
  children?: React.ReactNode;
  /** block above a hairline rule */
  header?: React.ReactNode;
  /** button row at the bottom */
  footer?: React.ReactNode;
  align?: 'left' | 'center';
  /** accessible name for the close button */
  closeLabel?: string;
  style?: React.CSSProperties;
}

export function Modal({
  open,
  onClose,
  width = 520,
  children,
  header,
  footer,
  align = 'left',
  closeLabel = 'Close',
  style,
}: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--sp-9)',
        background: 'var(--surface-scrim)',
        backdropFilter: 'var(--blur-scrim)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: width,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--r-modal)',
          boxShadow: 'var(--shadow-modal)',
          textAlign: align,
          ...style,
        }}
      >
        {onClose && (
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'none',
              border: 0,
              padding: 4,
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              zIndex: 1,
            }}
          >
            <Icon name="x" size={17} />
          </button>
        )}
        {header && (
          <div
            style={{
              padding: 'var(--sp-12) var(--sp-12) var(--sp-9)',
              borderBottom: '1px solid var(--border-hairline)',
            }}
          >
            {header}
          </div>
        )}
        <div style={{ padding: 'var(--sp-12)' }}>{children}</div>
        {footer && (
          <div
            style={{
              display: 'flex',
              gap: 'var(--sp-6)',
              padding: '0 var(--sp-12) var(--sp-12)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
