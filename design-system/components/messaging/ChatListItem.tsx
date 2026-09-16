import React from 'react';
import { Avatar } from '../core/Avatar';
import { Tag } from '../core/Tag';

export interface ChatListItemProps {
  name: string;
  preview?: string;
  /** "05:11 PM", "Yesterday", "Dec 20, 2024" — the source mixes all three */
  time?: string;
  /** "Carrier" or "Driver" */
  role?: string;
  unread?: number;
  active?: boolean;
  /** replaces the preview with a purple "Typing…" */
  typing?: boolean;
  avatar?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function ChatListItem({
  name,
  preview,
  time,
  role,
  unread,
  active,
  typing,
  avatar,
  onClick,
  style,
}: ChatListItemProps) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-6)',
        width: '100%',
        padding: 'var(--sp-6) var(--sp-8)',
        cursor: 'pointer',
        textAlign: 'left',
        border: 0,
        borderBottom: '1px solid var(--border-hairline)',
        background: active
          ? 'var(--surface-active)'
          : hover
            ? 'var(--surface-hover)'
            : 'transparent',
        transition: 'var(--t-hover)',
        ...style,
      }}
    >
      <Avatar name={name} src={avatar} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-4)',
            minWidth: 0,
          }}
        >
          <span
            style={{
              font: 'var(--fw-medium) var(--fs-sm)/1.3 var(--font-core)',
              color: 'var(--text-body)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </span>
          {role && <Tag tone={role.toLowerCase() === 'driver' ? 'driver' : 'role'}>{role}</Tag>}
        </div>
        <p
          style={{
            font: 'var(--type-body)',
            color: typing ? 'var(--purple-300)' : 'var(--text-muted)',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {typing ? 'Typing…' : preview}
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 5,
          flex: '0 0 auto',
        }}
      >
        {time && (
          <span
            style={{
              font: 'var(--fw-regular) var(--fs-xs)/1 var(--font-core)',
              color: 'var(--text-muted)',
            }}
          >
            {time}
          </span>
        )}
        {unread ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: '50%',
              background: 'var(--red-500)',
              color: 'var(--white)',
              font: 'var(--type-badge)',
            }}
          >
            {unread}
          </span>
        ) : null}
      </div>
    </button>
  );
}
