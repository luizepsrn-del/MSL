import React from 'react';
import { Icon } from '../core/Icon';
import { IconButton } from '../core/IconButton';

export interface MessageComposerProps {
  value?: string;
  onChange?: (value: string) => void;
  onSend?: (value: string) => void;
  /** default "Your message.." */
  placeholder?: string;
  /** kebab-case Lucide names for the tool run; default mic / map-pin / paperclip / smile */
  tools?: string[];
  style?: React.CSSProperties;
}

export function MessageComposer({
  value,
  onChange,
  onSend,
  placeholder = 'Your message..',
  tools = ['mic', 'map-pin', 'paperclip', 'smile'],
  style,
}: MessageComposerProps) {
  const send = () => {
    if (value && value.trim() && onSend) onSend(value.trim());
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-6)',
        padding: 'var(--sp-5) var(--sp-5) var(--sp-5) var(--sp-8)',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--r-lg)',
        ...style,
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter') send();
        }}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 0,
          outline: 'none',
          font: 'var(--type-body)',
          color: 'var(--text-body)',
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-3)',
          flex: '0 0 auto',
        }}
      >
        {tools.map((t) => (
          <button
            key={t}
            type="button"
            aria-label={t}
            style={{
              background: 'none',
              border: 0,
              padding: 4,
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
            }}
          >
            <Icon name={t} size={16} />
          </button>
        ))}
        <IconButton icon="send" label="Send message" variant="accent" size={34} onClick={send} />
      </div>
    </div>
  );
}
