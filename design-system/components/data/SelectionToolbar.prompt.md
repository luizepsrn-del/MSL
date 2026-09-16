Bulk-action bar above a table. The source keeps the count label unpluralised — "3 Item selected".

```jsx
<SelectionToolbar count={3}
  actions={<><Button variant="secondary" size="sm">Dismiss</Button><Button variant="secondary" size="sm">Send Invoice</Button></>}
  trailing={<Select value="all" options={[{ value: 'all', label: 'All Orders' }]} />} />
```
