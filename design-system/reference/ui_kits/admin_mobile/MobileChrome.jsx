const { Icon, IconButton, Avatar, SearchInput } = window.MySystemLifeDesignSystem_265e57 || {};

function StatusBar() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 44, padding: '0 26px', flex: '0 0 auto',
      font: 'var(--fw-medium) var(--fs-md)/1 var(--font-core)', color: 'var(--ink-100)',
    }}>
      <span>9:41</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon name="signal" size={15} /><Icon name="wifi" size={15} /><Icon name="battery-full" size={17} />
      </span>
    </div>
  );
}

function MobileHeader({ onMenu, notifications = 2, onProfile }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 'var(--sp-6)', padding: 'var(--sp-6) var(--sp-8)', flex: '0 0 auto',
    }}>
      <button type="button" aria-label="Open menu" onClick={onMenu} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44,
        marginLeft: -10, background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink-100)',
      }}><Icon name="menu" size={22} /></button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-6)' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 8px 0 10px',
          borderRadius: 'var(--r-lg)', background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)',
        }}>
          <Icon name="bell" size={16} color="var(--text-muted)" />
          <span style={{
            display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 7px',
            borderRadius: 'var(--r-sm)', background: 'var(--red-500)', color: 'var(--white)',
            font: 'var(--fw-medium) var(--fs-micro)/1 var(--font-core)',
          }}>{notifications} New</span>
        </span>
        <button type="button" onClick={onProfile} aria-label="Profile" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
          <Avatar name="Ronald Richards" size={38} />
        </button>
      </div>
    </div>
  );
}

function MobileUtilityRow({ query, onQuery, theme, onTheme, credits = 40 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)', padding: '0 var(--sp-8) var(--sp-6)', flex: '0 0 auto' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <SearchInput value={query} onChange={onQuery} placeholder="Search" shortcut="F" size="lg" fullWidth />
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2, height: 44, padding: 4, flex: '0 0 auto',
        borderRadius: 'var(--r-lg)', background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)',
      }}>
        {['light', 'dark'].map(m => (
          <button key={m} type="button" aria-label={m + ' theme'} onClick={() => onTheme(m)} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34,
            borderRadius: 'var(--r-md)', border: 0, cursor: 'pointer',
            background: theme === m ? 'var(--accent)' : 'transparent',
            color: theme === m ? 'var(--white)' : 'var(--text-muted)', transition: 'var(--t-hover)',
          }}><Icon name={m === 'light' ? 'sun' : 'moon'} size={16} /></button>
        ))}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 14px', flex: '0 0 auto',
        borderRadius: 'var(--r-lg)', background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)',
      }}>
        <Icon name="zap" size={16} color="var(--green-500)" />
        <span style={{ font: 'var(--fw-medium) var(--fs-md)/1 var(--font-core)', color: 'var(--text-body)' }}>{credits}</span>
      </div>
    </div>
  );
}

function MobileDrawer({ open, onClose, children }) {
  return (
    <div aria-hidden={!open} style={{
      position: 'absolute', inset: 0, zIndex: 60, pointerEvents: open ? 'auto' : 'none',
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'var(--surface-scrim)',
        opacity: open ? 1 : 0, transition: 'opacity var(--dur-base) var(--ease-standard)',
      }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: 268, display: 'flex',
        background: 'var(--surface-app)', boxShadow: 'var(--shadow-modal)',
        transform: open ? 'none' : 'translateX(-100%)',
        transition: 'transform var(--dur-slow) var(--ease-out)',
      }}>{children}</div>
    </div>
  );
}

Object.assign(window, { StatusBar, MobileHeader, MobileUtilityRow, MobileDrawer });
