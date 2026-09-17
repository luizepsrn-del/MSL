import React from 'react';

declare global {
  interface Window {
    lucide?: {
      icons?: Record<string, unknown>;
      createElement: (node: unknown) => SVGElement;
    };
  }
}

export interface IconProps {
  /** kebab-case Lucide name, e.g. "truck", "bell", "layout-dashboard" */
  name: string;
  /** px, default 18 */
  size?: number;
  /** default 1.6 — the kit's outline weight */
  strokeWidth?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * kebab-case → the PascalCase key Lucide registers its icons under.
 *
 * Exported so it can be tested without a DOM. It has to handle a segment that
 * starts with a digit: `trash-2` is `Trash2`, and a conversion that only
 * uppercases *letters* after a dash yields `Trash-2`, which matches nothing.
 * The icon then renders as an empty box, silently. Every numbered Lucide icon
 * hit that.
 */
export function lucideKey(name: string): string {
  return name
    .split('-')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join('');
}

/** ~2s at 60ms. Past that the name is wrong, not slow. */
const MAX_TENTATIVAS = 32;

/* Lucide is the closest CDN match to the source kit's thin, rounded outline glyphs.
   Load it once per page: <script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.js"></script> */
export function Icon({
  name,
  size = 18,
  strokeWidth = 1.6,
  color = 'currentColor',
  style,
  className,
}: IconProps) {
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const draw = () => {
      const lib = window.lucide;
      if (!lib || !ref.current) return false;
      const node = (lib.icons && (lib.icons[lucideKey(name)] || lib.icons[name])) || null;
      if (!node) return false;
      ref.current.innerHTML = '';
      ref.current.appendChild(lib.createElement(node));
      const svg = ref.current.firstChild as SVGElement | null;
      if (svg) {
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));
        svg.setAttribute('stroke-width', String(strokeWidth));
        svg.setAttribute('stroke', color);
        svg.style.display = 'block';
      }
      return true;
    };

    if (draw()) return;

    // Lucide arrives from a script tag, so the first paint can happen before
    // it is there. Retry — but bounded: an unknown name used to poll forever
    // at 60ms, render nothing, and give no way to notice.
    let tentativas = 0;
    const t = setInterval(() => {
      tentativas += 1;
      if (draw() || tentativas >= MAX_TENTATIVAS) {
        clearInterval(t);
        if (tentativas >= MAX_TENTATIVAS && import.meta.env?.DEV) {
          console.warn(`[Icon] "${name}" (${lucideKey(name)}) não existe no Lucide carregado.`);
        }
      }
    }, 60);
    return () => clearInterval(t);
  }, [name, size, strokeWidth, color]);

  return (
    <span
      ref={ref}
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-flex', width: size, height: size, flex: '0 0 auto', ...style }}
    />
  );
}
