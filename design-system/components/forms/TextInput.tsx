import React from 'react';

export type TextInputType =
  | 'text'
  | 'multiline'
  | 'number'
  | 'date'
  | 'time'
  | 'money'
  | 'password';

export interface TextInputProps {
  /** wire this to the Field's `htmlFor` */
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  /** money and date carry a pt-BR mask; multiline grows with its content */
  type?: TextInputType;
  placeholder?: string;
  /** turns the hairline red — pass the message to the surrounding Field */
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  size?: 'md' | 'lg';
  fullWidth?: boolean;
  /** multiline only — the height it starts at, in rows */
  rows?: number;
  onBlur?: () => void;
  style?: React.CSSProperties;
}

const NATIVO: Record<Exclude<TextInputType, 'multiline' | 'money'>, string> = {
  text: 'text',
  // Password hands the browser and the password manager the one hint they
  // need; a text input styled to look secret is neither.
  password: 'password',
  number: 'number',
  date: 'date',
  time: 'time',
};

/**
 * The kit's free-text control.
 *
 * Addition, not from the source — see DESIGN.md → Form fields. Every value
 * below is an existing token; `SearchInput` is the proof the combination works.
 */
export function TextInput({
  id,
  value = '',
  onChange,
  type = 'text',
  placeholder,
  invalid,
  disabled,
  readOnly,
  size = 'md',
  fullWidth,
  rows = 3,
  onBlur,
  style,
}: TextInputProps) {
  const [focus, setFocus] = React.useState(false);
  const multiline = type === 'multiline';
  const areaRef = React.useRef<HTMLTextAreaElement>(null);

  // Multi-line grows with its content instead of scrolling inside a fixed box.
  React.useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, multiline]);

  const borda = invalid
    ? 'var(--status-danger-bd)'
    : focus
      ? 'var(--border-focus)'
      : 'var(--border-default)';

  const comum: React.CSSProperties = {
    width: '100%',
    minWidth: 0,
    padding: multiline ? 'var(--sp-5) var(--sp-6)' : '0 var(--sp-6)',
    background: 'var(--surface-input)',
    border: `var(--bw-hairline) solid ${borda}`,
    borderRadius: 'var(--r-control)',
    font: 'var(--type-body)',
    color: 'var(--text-body)',
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'auto',
    opacity: disabled ? 0.42 : 1,
    transition: 'var(--t-hover)',
    ...style,
  };

  const manipuladores = {
    id,
    value,
    placeholder,
    disabled,
    readOnly,
    'aria-invalid': invalid || undefined,
    onFocus: () => setFocus(true),
    onBlur: () => {
      setFocus(false);
      onBlur?.();
    },
  };

  if (multiline) {
    return (
      <textarea
        {...manipuladores}
        ref={areaRef}
        rows={rows}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          ...comum,
          minHeight: `calc(var(--control-h) * ${rows === 1 ? 1 : 1.6})`,
          resize: 'none',
          overflow: 'hidden',
          lineHeight: 'var(--lh-normal)',
          display: 'block',
        }}
      />
    );
  }

  // Money stays a text input on purpose: `type="number"` would fight the
  // pt-BR comma and strip the thousands separator as you type.
  const inputMode = type === 'money' || type === 'number' ? 'decimal' : undefined;

  return (
    <input
      {...manipuladores}
      type={type === 'money' ? 'text' : NATIVO[type]}
      inputMode={inputMode}
      onChange={(e) => onChange?.(e.target.value)}
      style={{
        ...comum,
        height: size === 'lg' ? 'var(--control-h-lg)' : 'var(--control-h)',
        width: fullWidth ? '100%' : comum.width,
      }}
    />
  );
}
