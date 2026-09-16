import React from 'react';
import {
  Card,
  Button,
  Tag,
  Switch,
  IconButton,
  SearchInput,
  Select,
  DataTable,
  Pagination,
} from '../../components';
import type { DataTableColumn, TagTone } from '../../components';
import { automations, type AutomationRow } from '../data';

/** Automations — table with operation-type tags and status switches. */
export function AutomationsScreen() {
  const [q, setQ] = React.useState('');
  const [rows, setRows] = React.useState<AutomationRow[]>(automations);
  const [sel, setSel] = React.useState(['a3']);
  const [page, setPage] = React.useState(2);
  const [scope, setScope] = React.useState('all');

  const toggle = (id: string, on: boolean) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, on } : r)));

  const shown = rows.filter((r) => q === '' || r.name.toLowerCase().includes(q.toLowerCase()));

  const columns: DataTableColumn<AutomationRow>[] = [
    { key: 'name', header: 'Automation Name', width: 'minmax(220px,2fr)', sortable: true },
    {
      key: 'type',
      header: 'Operation Type',
      width: '150px',
      sortable: true,
      render: (r) => (
        <Tag tone={r.type.toLowerCase() as TagTone} count={r.count}>
          {r.type}
        </Tag>
      ),
    },
    { key: 'created', header: 'Creation Date', width: '160px', sortable: true },
    {
      key: 'status',
      header: 'Status',
      width: '90px',
      render: (r) => <Switch checked={r.on} onChange={(on) => toggle(r.id, on)} />,
    },
    {
      key: 'action',
      header: 'Action',
      width: '56px',
      align: 'right',
      render: () => (
        <IconButton icon="more-vertical" label="Automation actions" variant="ghost" size={28} />
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
            <SearchInput value={q} onChange={setQ} placeholder="Search…" fullWidth />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--sp-5)' }}>
            <Select
              value={scope}
              onChange={setScope}
              options={[
                { value: 'all', label: 'Execute New Automation' },
                { value: 'order', label: 'Order automations' },
                { value: 'carrier', label: 'Carrier automations' },
              ]}
            />
            <Button variant="primary" iconRight="plus">
              Create New Automation
            </Button>
          </div>
        </div>
      </Card>
      <Card flush bodyStyle={{ padding: 'var(--card-pad-lg)' }}>
        <DataTable
          selectable
          selected={sel}
          onSelectedChange={setSel}
          rows={shown}
          columns={columns}
        />
        <div style={{ marginTop: 'var(--sp-9)' }}>
          <Pagination page={page} total={6} onChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
