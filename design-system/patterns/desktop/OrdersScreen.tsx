import React from 'react';
import {
  Card,
  Button,
  Badge,
  IconButton,
  SearchInput,
  Select,
  SelectionToolbar,
  DataTable,
  Pagination,
} from '../../components';
import type { DataTableColumn } from '../../components';
import { orders, type OrderRow } from '../data';

export interface OrdersScreenProps {
  onEdit?: () => void;
}

/** Orders — search + create bar, selection toolbar, sortable Orders table, pagination. */
export function OrdersScreen({ onEdit }: OrdersScreenProps) {
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [sel, setSel] = React.useState(['44511828177', '4501829693', '4500221765']);
  const [page, setPage] = React.useState(2);

  const rows = orders.filter(
    (o) =>
      (filter === 'all' || o.tone === filter) &&
      (q === '' || o.id.includes(q) || o.to.toLowerCase().includes(q.toLowerCase())),
  );

  const columns: DataTableColumn<OrderRow>[] = [
    { key: 'id', header: 'Order', width: 'minmax(110px,1.1fr)', sortable: true },
    {
      key: 'dest',
      header: 'Destinations',
      width: 'minmax(190px,1.5fr)',
      sortable: true,
      sortValue: (r) => r.to,
      render: (r) => (
        <span style={{ font: 'var(--type-body)', lineHeight: 'var(--lh-snug)' }}>
          <span style={{ color: 'var(--text-muted)' }}>From: </span>
          {r.from}
          <br />
          <span style={{ color: 'var(--text-muted)' }}>To: </span>
          {r.to}
        </span>
      ),
    },
    {
      key: 'cargo',
      header: 'Cargo',
      width: 'minmax(150px,1.3fr)',
      sortable: true,
      render: (r) => (
        <span style={{ font: 'var(--type-body)', lineHeight: 'var(--lh-snug)' }}>
          {r.cargo}
          <br />
          <span style={{ color: 'var(--text-muted)' }}>{r.weight}</span>
        </span>
      ),
    },
    { key: 'price', header: 'Price', width: '92px', sortable: true },
    { key: 'date', header: 'Delivery Date', width: '128px', sortable: true },
    {
      key: 'status',
      header: 'Status',
      width: '116px',
      sortable: true,
      render: (r) => <Badge tone={r.tone}>{r.status}</Badge>,
    },
    {
      key: 'action',
      header: 'Action',
      width: '56px',
      align: 'right',
      render: () => (
        <IconButton icon="more-vertical" label="Order actions" variant="ghost" size={28} />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <Card>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-9)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 220, maxWidth: 380 }}>
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search or type command"
              fullWidth
            />
          </div>
          <Button variant="primary" iconRight="plus" style={{ marginLeft: 'auto' }}>
            Create New Order
          </Button>
        </div>
      </Card>
      <Card flush bodyStyle={{ padding: 'var(--card-pad-lg)' }}>
        <SelectionToolbar
          count={sel.length}
          style={{ marginBottom: 'var(--sp-9)' }}
          actions={
            <>
              <Button variant="secondary" size="sm" onClick={() => setSel([])}>
                Dismiss
              </Button>
              <Button variant="secondary" size="sm">
                Send Invoice
              </Button>
              <Button variant="secondary" size="sm">
                Report
              </Button>
              <Button variant="secondary" size="sm" onClick={onEdit}>
                Edit
              </Button>
            </>
          }
          trailing={
            <Select
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All Orders' },
                { value: 'delay', label: 'Delayed' },
                { value: 'ontime', label: 'On Time' },
                { value: 'delivered', label: 'Delivered' },
              ]}
            />
          }
        />
        <DataTable
          selectable
          selected={sel}
          onSelectedChange={setSel}
          rows={rows}
          columns={columns}
        />
        <div style={{ marginTop: 'var(--sp-9)' }}>
          <Pagination page={page} total={6} onChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
