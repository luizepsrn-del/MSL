import React from 'react';
import { Icon } from '../core/Icon';
import { Avatar } from '../core/Avatar';

export type ThemeName = 'light' | 'dark';

export interface TopBarUser {
  name: string;
  role?: string;
  avatar?: string;
  rating?: number | string;
}

export interface TopBarProps {
  /** brand slot sized to the sidebar column */
  brand?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  theme?: ThemeName;
  /** omit to hide the theme segment */
  onThemeChange?: (theme: ThemeName) => void;
  /** credits / energy count shown beside the green bolt */
  credits?: number | string;
  /** unread count — renders as a red "N New" chip */
  notifications?: number;
  user?: TopBarUser;
  onUserClick?: () => void;
  /** slot before the brand — the mobile hamburger */
  leading?: React.ReactNode;
  style?: React.CSSProperties;
}

function Pill({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--sp-4)',
        height: 36,
        padding: '0 12px',
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--r-lg)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const THEMES: ThemeName[] = ['light', 'dark'];

export function TopBar({
  brand,
  title,
  subtitle,
  theme = 'dark',
  onThemeChange,
  credits,
  notifications,
  user,
  onUserClick,
  leading,
  style,
}: TopBarProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-9)',
        height: 'var(--topbar-h)',
        padding: '0 var(--shell-gutter)',
        flex: '0 0 auto',
        background: 'var(--surface-app)',
        borderBottom: '1px solid var(--border-hairline)',
        ...style,
      }}
    >
      {leading}
      {brand && (
        <div style={{ width: 'calc(var(--sidebar-w) - var(--shell-gutter))', flex: '0 0 auto' }}>
          {brand}
        </div>
      )}
      {(title || subtitle) && (
        <div style={{ minWidth: 0, flex: 1 }}>
          {title && (
            <h1 style={{ font: 'var(--type-page-title)', color: 'var(--text-heading)' }}>{title}</h1>
          )}
          {subtitle && (
            <p style={{ font: 'var(--type-page-subtitle)', color: 'var(--text-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-5)',
          marginLeft: 'auto',
          flex: '0 0 auto',
        }}
      >
        {onThemeChange && (
          <Pill style={{ padding: 4, gap: 2 }}>
            {THEMES.map((m) => (
              <button
                key={m}
                type="button"
                aria-label={`${m} theme`}
                aria-pressed={theme === m}
                onClick={() => onThemeChange(m)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--r-md)',
                  cursor: 'pointer',
                  border: 0,
                  background: theme === m ? 'var(--accent)' : 'transparent',
                  color: theme === m ? 'var(--white)' : 'var(--text-muted)',
                  transition: 'var(--t-hover)',
                }}
              >
                <Icon name={m === 'light' ? 'sun' : 'moon'} size={15} />
              </button>
            ))}
          </Pill>
        )}
        {credits != null && (
          <Pill>
            <Icon name="zap" size={15} color="var(--green-500)" />
            <span
              style={{
                font: 'var(--fw-medium) var(--fs-sm)/1 var(--font-core)',
                color: 'var(--text-body)',
              }}
            >
              {credits}
            </span>
          </Pill>
        )}
        {notifications != null && (
          <Pill>
            <Icon name="bell" size={15} color="var(--text-muted)" />
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 20,
                padding: '0 7px',
                borderRadius: 'var(--r-sm)',
                background: 'var(--red-500)',
                color: 'var(--white)',
                font: 'var(--fw-medium) var(--fs-micro)/1 var(--font-core)',
              }}
            >
              {notifications} New
            </span>
          </Pill>
        )}
        {user && (
          <button
            type="button"
            onClick={onUserClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-5)',
              height: 44,
              padding: '0 8px 0 6px',
              cursor: 'pointer',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--r-lg)',
              transition: 'var(--t-hover)',
            }}
          >
            <Avatar name={user.name} src={user.avatar} size={32} />
            <span style={{ textAlign: 'left', minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  font: 'var(--fw-medium) var(--fs-sm)/1.2 var(--font-core)',
                  color: 'var(--text-body)',
                }}
              >
                {user.name}
              </span>
              {user.role && (
                <span
                  style={{
                    display: 'block',
                    font: 'var(--fw-regular) var(--fs-xs)/1.2 var(--font-core)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {user.role}
                </span>
              )}
            </span>
            {user.rating != null && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'var(--red-500)',
                  color: 'var(--white)',
                  font: 'var(--fw-medium) var(--fs-micro)/1 var(--font-core)',
                }}
              >
                {user.rating}
              </span>
            )}
            <Icon name="chevron-right" size={15} color="var(--text-muted)" />
          </button>
        )}
      </div>
    </header>
  );
}
