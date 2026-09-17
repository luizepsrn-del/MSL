import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
}

export interface SelectProps {
  /**
   * Wire this to the surrounding Field's `htmlFor`. Without it the label is
   * not associated with any control, and a screen reader announces the
   * dropdown with no name.
   */
  id?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

/** Where the list is drawn, in viewport coordinates. */
interface Posicao {
  left: number;
  top: number;
  width: number;
  /** true when there is no room below and the list opens upwards */
  acima: boolean;
}

export function Select({
  id,
  options = [],
  value,
  onChange,
  placeholder = 'Select',
  size = 'md',
  fullWidth,
  style,
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [posicao, setPosicao] = React.useState<Posicao | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const lista = React.useRef<HTMLUListElement>(null);

  /**
   * The list is drawn in a portal on `document.body`.
   *
   * It used to be an absolutely positioned child, and inside a `Card` — which
   * clips with `overflow: hidden` for its rounded corners and glow — only a
   * 20px sliver of it survived. A dropdown that its own library's container
   * eats is a dropdown that cannot be used.
   */
  const medir = React.useCallback(() => {
    const gatilho = ref.current;
    if (!gatilho) return;
    const r = gatilho.getBoundingClientRect();
    const altura = Math.min(options.length * 34 + 12, 260);
    const cabeAbaixo = r.bottom + altura + 8 <= window.innerHeight;
    setPosicao({
      left: r.left,
      top: cabeAbaixo ? r.bottom + 6 : r.top - 6,
      width: r.width,
      acima: !cabeAbaixo,
    });
  }, [options.length]);

  React.useLayoutEffect(() => {
    if (open) medir();
  }, [open, medir]);

  React.useEffect(() => {
    if (!open) return;

    const away = (e: MouseEvent) => {
      const alvo = e.target as Node;
      // O portal fica fora de `ref`, então a lista precisa ser checada à parte.
      if (ref.current?.contains(alvo) || lista.current?.contains(alvo)) return;
      setOpen(false);
    };
    const acompanhar = () => medir();
    const pelaTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', away);
    // `true` para pegar a rolagem de qualquer container, não só a da janela.
    window.addEventListener('scroll', acompanhar, true);
    window.addEventListener('resize', acompanhar);
    document.addEventListener('keydown', pelaTecla);
    return () => {
      document.removeEventListener('mousedown', away);
      window.removeEventListener('scroll', acompanhar, true);
      window.removeEventListener('resize', acompanhar);
      document.removeEventListener('keydown', pelaTecla);
    };
  }, [open, medir]);

  const current = options.find((o) => o.value === value);
  const h =
    size === 'sm' ? 'var(--control-h-sm)' : size === 'lg' ? 'var(--control-h-lg)' : 'var(--control-h)';

  return (
    <div ref={ref} style={{ position: 'relative', width: fullWidth ? '100%' : undefined, ...style }}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--sp-5)',
          height: h,
          padding: '0 12px',
          width: '100%',
          cursor: 'pointer',
          background: 'var(--surface-card)',
          border: `1px solid ${open ? 'var(--border-focus)' : 'var(--border-default)'}`,
          borderRadius: 'var(--r-control)',
          font: 'var(--type-body)',
          color: current ? 'var(--text-body)' : 'var(--text-muted)',
          transition: 'var(--t-hover)',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current ? current.label : placeholder}
        </span>
        <Icon
          name="chevron-down"
          size={15}
          color="var(--text-muted)"
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'var(--t-transform)',
          }}
        />
      </button>
      {open &&
        posicao &&
        createPortal(
          <ul
            ref={lista}
            role="listbox"
            style={{
              position: 'fixed',
              left: posicao.left,
              top: posicao.acima ? undefined : posicao.top,
              bottom: posicao.acima ? window.innerHeight - posicao.top : undefined,
              minWidth: posicao.width,
              maxHeight: 260,
              overflowY: 'auto',
              // Above the Modal's 100: a Select inside a dialog must draw over
              // it, and the library keeps z-index as literals (see Modal).
              zIndex: 200,
              margin: 0,
              padding: 6,
              listStyle: 'none',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--shadow-pop)',
            }}
          >
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => {
                    onChange?.(o.value);
                    setOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--sp-5)',
                    width: '100%',
                    minHeight: 32,
                    padding: '0 10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: o.value === value ? 'var(--accent-soft)' : 'transparent',
                    border: 0,
                    borderRadius: 'var(--r-sm)',
                    font: 'var(--type-body)',
                    color: o.value === value ? 'var(--purple-200)' : 'var(--text-body)',
                  }}
                >
                  {o.label}
                  {o.value === value && <Icon name="check" size={13} />}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
