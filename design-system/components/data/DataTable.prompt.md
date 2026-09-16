The kit's table. Put it in a `<Card flush>` with a SelectionToolbar above and Pagination below.

```jsx
<DataTable selectable selected={sel} onSelectedChange={setSel} rows={orders}
  columns={[
    { key: 'id', header: 'Order', width: '120px', sortable: true },
    { key: 'status', header: 'Status', width: '110px', sortable: true, render: r => <Badge tone={r.tone}>{r.status}</Badge> },
    { key: 'action', header: 'Action', width: '60px', align: 'right', render: () => <IconButton icon="more-vertical" label="Actions" variant="ghost" size={28} /> },
  ]} />
```

On narrow viewports swap the table for a stacked card list rather than letting it scroll sideways.
