Dropdown filter for table toolbars.

```jsx
<Select value={filter} onChange={setFilter}
  options={[{ value: 'all', label: 'All Orders' }, { value: 'delay', label: 'Delayed' }]} />
```

Pass `id` and wire it to the surrounding `Field`'s `htmlFor`, otherwise the label names nothing. Menu opens 6px below, 10px radius, purple-tinted selected row with a trailing tick.
