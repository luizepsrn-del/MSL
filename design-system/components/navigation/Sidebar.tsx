import React from 'react';
import { Icon } from '../core/Icon';
import { SearchInput } from '../forms/SearchInput';

export interface SidebarItem {
  id: string;
  label: string;
  /** kebab-case Lucide name */
  icon: string;
  badge?: number | string;
}

export interface SidebarSection {
  /** small eyebrow, e.g. "Menu" or "Support" */
  label?: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  sections: SidebarSection[];
  /** id of the active item */
  active?: string;
  onSelect?: (id: string) => void;
  /** show the search field, default true */
  search?: boolean;
  /** bottom slot — usually a PromoCard */
  footer?: React.ReactNode;
  width?: string;
  style?: React.CSSProperties;
}

function NavItem({
  item,
  active,
  onSelect,
}: {
  item: SidebarItem;
  active?: string;
  onSelect?: (id: string) => void;
}) {
  const [hover, setHover] = React.useState(false);
  const on = active === item.id;
  return (
    <li style={{ position: 'relative' }}>
      {on && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: -20,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 'var(--bw-tab)',
            height: 22,
            borderRadius: '0 var(--r-pill) var(--r-pill) 0',
            background: 'var(--purple-400)',
            boxShadow: 'var(--glow-accent-strong)',
          }}
        />
      )}
      <button
        type="button"
        onClick={() => onSelect && onSelect(item.id)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-5)',
          width: '100%',
          height: 40,
          padding: '0 12px',
          cursor: 'pointer',
          textAlign: 'left',
          background: on
            ? 'var(--gradient-nav-active)'
            : hover
              ? 'var(--surface-hover)'
              : 'transparent',
          border: `1px solid ${on ? 'rgba(224,225,238,.10)' : 'transparent'}`,
          borderRadius: 'var(--r-nav)',
          font: 'var(--type-nav)',
          color: on ? 'var(--white)' : hover ? 'var(--text-body)' : 'var(--text-muted)',
          boxShadow: on ? 'var(--inset-top-sheen)' : 'none',
          transition: 'var(--t-hover)',
        }}
      >
        <Icon name={item.icon} size={18} />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.label}
        </span>
        {item.badge != null && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 'var(--r-pill)',
              background: 'var(--red-500)',
              color: 'var(--white)',
              font: 'var(--type-badge)',
            }}
          >
            {item.badge}
          </span>
        )}
      </button>
    </li>
  );
}

export function Sidebar({
  sections = [],
  active,
  onSelect,
  search = true,
  footer,
  width,
  style,
}: SidebarProps) {
  return (
    <nav
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-9)',
        width: width || 'var(--sidebar-w)',
        flex: '0 0 auto',
        minHeight: 0,
        padding: 'var(--sp-9) var(--sp-9) var(--sp-9)',
        background: 'var(--surface-app)',
        borderRight: '1px solid var(--border-hairline)',
        overflowY: 'auto',
        overflowX: 'hidden',
        ...style,
      }}
    >
      {search && <SearchInput placeholder="Search" shortcut="F" fullWidth />}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-9)',
          flex: '1 0 auto',
        }}
      >
        {sections.map((sec) => (
          <div key={sec.label || 'main'}>
            {sec.label && (
              <p
                style={{
                  font: 'var(--type-eyebrow)',
                  color: 'var(--text-subtle)',
                  padding: '0 12px',
                  marginBottom: 'var(--sp-4)',
                }}
              >
                {sec.label}
              </p>
            )}
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--sp-1)',
                listStyle: 'none',
                margin: 0,
                padding: 0,
              }}
            >
              {sec.items.map((it) => (
                <NavItem key={it.id} item={it} active={active} onSelect={onSelect} />
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ flex: '0 0 auto' }}>{footer}</div>
    </nav>
  );
}
