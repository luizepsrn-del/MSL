import React from 'react';
import { Icon } from '../core/Icon';
import { Avatar } from '../core/Avatar';

export interface MessageQuote {
  author: string;
  text: string;
}

export interface MessageAttachment {
  name: string;
  kind: string;
}

export interface MessageBubbleProps {
  /** true = sent by the current user (purple, right-aligned) */
  own?: boolean;
  author?: string;
  time?: string;
  /** shows the double-tick read receipt on own messages */
  read?: boolean;
  /** avatar src, or false to hide the avatar */
  avatar?: string | false;
  children?: React.ReactNode;
  quote?: MessageQuote;
  attachment?: MessageAttachment;
  style?: React.CSSProperties;
}

export function MessageBubble({
  own,
  author,
  time,
  read,
  avatar,
  children,
  quote,
  attachment,
  style,
}: MessageBubbleProps) {
  const bg = own ? 'var(--purple-500)' : 'var(--surface-raised)';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: own ? 'flex-end' : 'flex-start',
        gap: 'var(--sp-4)',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: own ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 'var(--sp-5)',
        }}
      >
        {avatar !== false && (
          <Avatar
            name={author || (own ? 'You' : '')}
            src={typeof avatar === 'string' ? avatar : undefined}
            size={28}
          />
        )}
        <span
          style={{
            font: 'var(--fw-medium) var(--fs-body)/1 var(--font-core)',
            color: 'var(--text-body)',
          }}
        >
          {own ? 'You' : author}
        </span>
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
        {own && read && <Icon name="check-check" size={14} color="var(--purple-300)" />}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: own ? 'flex-end' : 'flex-start',
          gap: 'var(--sp-4)',
          maxWidth: 'min(520px, 82%)',
        }}
      >
        {quote && (
          <div
            style={{
              padding: 'var(--sp-6) var(--sp-8)',
              borderRadius: 'var(--r-lg)',
              background: bg,
              borderLeft: '3px solid rgba(255,255,255,.55)',
            }}
          >
            <span
              style={{
                display: 'block',
                font: 'var(--fw-medium) var(--fs-body)/1.4 var(--font-core)',
                color: 'var(--white)',
              }}
            >
              {quote.author}
            </span>
            <span
              style={{
                display: 'block',
                font: 'var(--type-body)',
                color: 'rgba(255,255,255,.88)',
              }}
            >
              {quote.text}
            </span>
          </div>
        )}
        {children && (
          <div
            style={{
              padding: 'var(--sp-6) var(--sp-8)',
              borderRadius: 'var(--r-lg)',
              background: bg,
              font: 'var(--type-body)',
              color: own ? 'var(--white)' : 'var(--text-body)',
              lineHeight: 'var(--lh-normal)',
            }}
          >
            {children}
          </div>
        )}
        {attachment && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-6)',
              minWidth: 260,
              padding: 'var(--sp-6) var(--sp-8)',
              borderRadius: 'var(--r-lg)',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                borderRadius: 'var(--r-md)',
                background: 'var(--surface-card)',
                color: 'var(--text-muted)',
                flex: '0 0 auto',
              }}
            >
              <Icon name="file-text" size={17} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  font: 'var(--fw-medium) var(--fs-body)/1.3 var(--font-core)',
                  color: 'var(--text-body)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {attachment.name}
              </span>
              <span
                style={{
                  display: 'block',
                  font: 'var(--fw-regular) var(--fs-xs)/1.3 var(--font-core)',
                  color: 'var(--text-muted)',
                }}
              >
                {attachment.kind}
              </span>
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: '1px solid var(--border-accent)',
                color: 'var(--purple-300)',
                flex: '0 0 auto',
              }}
            >
              <Icon name="arrow-down" size={15} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
