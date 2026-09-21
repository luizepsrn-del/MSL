import React from 'react';
import { Icon, Avatar, SearchInput } from '../../components';
import type { ThemeName } from '../../components';

/** The iOS status bar, reproduced so the phone frame reads as a device. */
export function StatusBar() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 44,
        padding: '0 26px',
        flex: '0 0 auto',
        font: 'var(--fw-medium) var(--fs-md)/1 var(--font-core)',
        color: 'var(--ink-100)',
      }}
    >
      <span>9:41</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon name="signal" size={15} />
        <Icon name="wifi" size={15} />
        <Icon name="battery-full" size={17} />
      </span>
    </div>
  );
}

export interface MobileHeaderProps {
  onMenu?: () => void;
  notifications?: number;
  onProfile?: () => void;
}

/** Hamburger · notification pill · avatar. Every control is at least 44px. */
export function MobileHeader({ onMenu, notifications = 2, onProfile }: MobileHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--sp-6)',
        padding: 'var(--sp-6) var(--sp-8)',
        flex: '0 0 auto',
      }}
    >
      <button
        type="button"
        aria-label="Open menu"
        onClick={onMenu}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 'var(--tap-min)',
          height: 'var(--tap-min)',
          marginLeft: -10,
          background: 'none',
          border: 0,
          cursor: 'pointer',
          color: 'var(--ink-100)',
        }}
      >
        <Icon name="menu" size={22} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-6)' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            height: 36,
            padding: '0 8px 0 10px',
            borderRadius: 'var(--r-lg)',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          <Icon name="bell" size={16} color="var(--text-muted)" />
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
        </span>
        <button
          type="button"
          onClick={onProfile}
          aria-label="Profile"
          style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
        >
          <Avatar name="Ronald Richards" size={38} />
        </button>
      </div>
    </div>
  );
}

export interface MobileUtilityRowProps {
  query?: string;
  onQuery?: (value: string) => void;
  theme?: ThemeName;
  onTheme?: (theme: ThemeName) => void;
  credits?: number | string;
}

const THEMES: ThemeName[] = ['light', 'dark'];

/** Search + theme segment + credits, the row under the mobile header. */
export function MobileUtilityRow({
  query,
  onQuery,
  theme = 'dark',
  onTheme,
  credits = 40,
}: MobileUtilityRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-5)',
        padding: '0 var(--sp-8) var(--sp-6)',
        flex: '0 0 auto',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <SearchInput
          value={query}
          onChange={onQuery}
          placeholder="Search"
          shortcut="F"
          size="lg"
          fullWidth
        />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          height: 'var(--tap-min)',
          padding: 4,
          flex: '0 0 auto',
          borderRadius: 'var(--r-lg)',
          background: 'var(--surface-raised)',
          border: '1px solid var(--border-hairline)',
        }}
      >
        {THEMES.map((m) => (
          <button
            key={m}
            type="button"
            aria-label={`${m} theme`}
            aria-pressed={theme === m}
            onClick={() => onTheme && onTheme(m)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 'var(--r-md)',
              border: 0,
              cursor: 'pointer',
              background: theme === m ? 'var(--accent)' : 'transparent',
              color: theme === m ? 'var(--white)' : 'var(--text-muted)',
              transition: 'var(--t-hover)',
            }}
          >
            <Icon name={m === 'light' ? 'sun' : 'moon'} size={16} />
          </button>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 'var(--tap-min)',
          padding: '0 14px',
          flex: '0 0 auto',
          borderRadius: 'var(--r-lg)',
          background: 'var(--surface-raised)',
          border: '1px solid var(--border-hairline)',
        }}
      >
        <Icon name="zap" size={16} color="var(--green-500)" />
        <span
          style={{
            font: 'var(--fw-medium) var(--fs-md)/1 var(--font-core)',
            color: 'var(--text-body)',
          }}
        >
          {credits}
        </span>
      </div>
    </div>
  );
}

export interface MobileDrawerProps {
  open?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

/** The 224px rail becomes a left drawer — same sections, same items, same active gradient. */
export function MobileDrawer({ open, onClose, children }: MobileDrawerProps) {
  return (
    <div
      // `inert`, not `aria-hidden`: tapping a drawer item navigates *and*
      // closes the drawer, so the tapped button still holds focus when the
      // ancestor becomes hidden. Chrome blocks that and says so. `inert` both
      // hides from assistive technology and drops the focus.
      inert={!open}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 60,
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--surface-scrim)',
          opacity: open ? 1 : 0,
          transition: 'opacity var(--dur-base) var(--ease-standard)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 268,
          display: 'flex',
          background: 'var(--surface-app)',
          boxShadow: 'var(--shadow-modal)',
          transform: open ? 'none' : 'translateX(-100%)',
          transition: 'transform var(--dur-slow) var(--ease-out)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
