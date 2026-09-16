import React from 'react';
import { Icon } from '../core/Icon';
import { Modal } from './Modal';
import { Button } from '../core/Button';

export interface SuccessDialogProps {
  open?: boolean;
  onClose?: () => void;
  title: React.ReactNode;
  message?: React.ReactNode;
  /** default "Thank you!" */
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'success' | 'danger';
}

export function SuccessDialog({
  open,
  onClose,
  title,
  message,
  actionLabel = 'Thank you!',
  onAction,
  tone = 'success',
}: SuccessDialogProps) {
  const color = tone === 'danger' ? 'var(--red-500)' : 'var(--purple-500)';
  const glow = tone === 'danger' ? 'var(--glow-danger)' : 'var(--glow-accent-strong)';

  return (
    <Modal open={open} onClose={onClose} width={380} align="center">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--sp-6)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: color,
            color: 'var(--white)',
            boxShadow: glow,
          }}
        >
          <Icon
            name={tone === 'danger' ? 'alert-triangle' : 'check'}
            size={26}
            strokeWidth={2.2}
          />
        </span>
        <h3
          style={{
            font: 'var(--fw-semibold) var(--fs-subheading)/1.25 var(--font-core)',
            color: 'var(--text-heading)',
          }}
        >
          {title}
        </h3>
        {message && (
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', maxWidth: 280 }}>
            {message}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onAction || onClose}
          style={{ marginTop: 'var(--sp-2)' }}
        >
          {actionLabel}
        </Button>
      </div>
    </Modal>
  );
}
