import React from 'react';

export type AvatarStatus = 'online' | 'away' | 'offline';

export interface AvatarProps {
  /** used for initials and for the fallback colour */
  name?: string;
  src?: string;
  /** px, default 36 */
  size?: number;
  /** corner presence dot */
  status?: AvatarStatus;
  /** full colour ring around the avatar */
  ring?: AvatarStatus | string;
  style?: React.CSSProperties;
}

const RING: Record<AvatarStatus, string> = {
  online: 'var(--green-500)',
  away: 'var(--orange-500)',
  offline: 'var(--ink-600)',
};

export function Avatar({ name = '', src, size = 36, status, ring, style }: AvatarProps) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?';
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const ringColor = ring ? RING[ring as AvatarStatus] || ring : undefined;
  const dotColor = status ? RING[status] || status : undefined;

  return (
    <span style={{ position: 'relative', display: 'inline-flex', flex: '0 0 auto', ...style }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          background: src
            ? 'var(--surface-raised)'
            : `linear-gradient(140deg, oklch(0.42 0.13 ${hue}), oklch(0.28 0.09 ${hue + 24}))`,
          color: 'var(--ink-100)',
          font: `var(--fw-medium) ${Math.max(10, Math.round(size * 0.36))}px/1 var(--font-core)`,
          boxShadow: ringColor
            ? `0 0 0 2px var(--surface-app), 0 0 0 3.5px ${ringColor}`
            : undefined,
        }}
      >
        {src ? (
          <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          initials
        )}
      </span>
      {status && (
        <span
          aria-label={status}
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: Math.max(8, size * 0.28),
            height: Math.max(8, size * 0.28),
            borderRadius: '50%',
            background: dotColor,
            border: '2px solid var(--surface-app)',
          }}
        />
      )}
    </span>
  );
}
