import React from 'react';
import { Icon } from '../core/Icon';
import { Avatar } from '../core/Avatar';

export interface CarrierRowProps {
  rank: number;
  name: string;
  location: string;
  rating: number | string;
  reviews?: number | string;
  vehicles: number | string;
  partners: number | string;
  onMenuClick?: () => void;
  style?: React.CSSProperties;
}

export function CarrierRow({
  rank,
  name,
  location,
  rating,
  reviews,
  vehicles,
  partners,
  onMenuClick,
  style,
}: CarrierRowProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px minmax(0,2fr) 90px minmax(0,1fr) minmax(0,1fr) 40px',
        alignItems: 'center',
        gap: 'var(--sp-6)',
        minHeight: 'var(--row-h)',
        padding: 'var(--sp-5) var(--sp-8)',
        borderTop: '1px solid var(--border-hairline)',
        ...style,
      }}
    >
      <span style={{ font: 'var(--type-body)', color: 'var(--text-subtle)' }}>
        {String(rank).padStart(2, '0')}
      </span>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)', minWidth: 0 }}
      >
        <Avatar name={name} size={32} />
        <span style={{ minWidth: 0 }}>
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
            {name}
          </span>
          <span
            style={{
              display: 'block',
              font: 'var(--fw-regular) var(--fs-xs)/1.3 var(--font-core)',
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {location}
          </span>
        </span>
      </div>
      <span>
        <span
          style={{
            display: 'block',
            font: 'var(--fw-medium) var(--fs-sm)/1.3 var(--font-core)',
            color: 'var(--text-body)',
          }}
        >
          {rating}
        </span>
        {reviews != null && (
          <span
            style={{
              display: 'block',
              font: 'var(--fw-regular) var(--fs-micro)/1.3 var(--font-core)',
              color: 'var(--text-muted)',
            }}
          >
            {reviews} Reviews
          </span>
        )}
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          font: 'var(--type-body)',
          color: 'var(--text-muted)',
          minWidth: 0,
        }}
      >
        <Icon name="truck" size={15} />
        {vehicles} Vehicles
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          font: 'var(--type-body)',
          color: 'var(--text-muted)',
          minWidth: 0,
        }}
      >
        <Icon name="users" size={15} />
        {partners} partners
      </span>
      <button
        type="button"
        aria-label="Carrier actions"
        onClick={onMenuClick}
        style={{
          justifySelf: 'end',
          background: 'none',
          border: 0,
          padding: 4,
          cursor: 'pointer',
          color: 'var(--text-muted)',
          display: 'flex',
        }}
      >
        <Icon name="more-vertical" size={16} />
      </button>
    </div>
  );
}
