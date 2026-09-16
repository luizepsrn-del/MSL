
export interface BrandProps {
  compact?: boolean;
}

/**
 * No logo was supplied with the source material, so the brand appears as a
 * wordmark: Rubik Bold, uppercase, 0.06em tracking, with a single glowing
 * purple dot as a neutral placeholder device.
 *
 * If you have a logo, drop the SVG in and replace the dot + wordmark here.
 * See DESIGN.md → Brand mark.
 */
export function Brand({ compact }: BrandProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        font: `var(--fw-bold) ${compact ? 'var(--fs-sm)' : 'var(--fs-md)'}/1 var(--font-core)`,
        color: 'var(--ink-100)',
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          flex: '0 0 auto',
          background: 'var(--purple-500)',
          boxShadow: 'var(--glow-accent-strong)',
        }}
      />
      My System Life
    </span>
  );
}
