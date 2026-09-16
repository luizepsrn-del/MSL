const { useState } = React;

/* No logo was supplied with the source material, so the brand appears as a wordmark. */
function Brand({ compact }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      font: 'var(--fw-bold) ' + (compact ? '13px' : '15px') + '/1 var(--font-core)',
      color: 'var(--ink-100)', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 10, height: 10, borderRadius: '50%', flex: '0 0 auto',
        background: 'var(--purple-500)', boxShadow: 'var(--glow-accent-strong)',
      }} />
      My System Life
    </span>
  );
}

Object.assign(window, { Brand });
