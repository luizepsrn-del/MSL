import React from 'react';

export interface FieldProps {
  /** Always present. The source's placeholder-as-label is not allowed here. */
  label: React.ReactNode;
  /** `id` of the control, wired to the label's `htmlFor` */
  htmlFor?: string;
  /** shown under the control when there is no error */
  help?: React.ReactNode;
  /** replaces `help` and turns the control's hairline red */
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * The wrapper around a form control: label above, control in the middle,
 * help or error below.
 *
 * Addition, not from the source — see DESIGN.md → Form fields.
 */
export function Field({
  label,
  htmlFor,
  help,
  error,
  required,
  disabled,
  children,
  style,
}: FieldProps) {
  const message = error ?? help;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-3)',
        minWidth: 0,
        opacity: disabled ? 0.42 : 1,
        ...style,
      }}
    >
      <label
        htmlFor={htmlFor}
        style={{
          font: 'var(--type-label)',
          color: 'var(--text-body)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--sp-2)',
        }}
      >
        {label}
        {required && (
          <span aria-hidden="true" style={{ color: 'var(--status-danger-fg)' }}>
            *
          </span>
        )}
      </label>

      {children}

      {message && (
        <span
          role={error ? 'alert' : undefined}
          style={{
            font: 'var(--fw-regular) var(--fs-xs)/var(--lh-normal) var(--font-core)',
            color: error ? 'var(--status-danger-fg)' : 'var(--text-muted)',
          }}
        >
          {message}
        </span>
      )}
    </div>
  );
}
