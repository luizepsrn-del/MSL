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
      const key = name.replace(/(^|-)([a-z])/g, (_, __, c: string) => c.toUpperCase());
      const node = (lib.icons && (lib.icons[key] || lib.icons[name])) || null;
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
    if (!draw()) {
      const t = setInterval(() => {
        if (draw()) clearInterval(t);
      }, 60);
      return () => clearInterval(t);
    }
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
