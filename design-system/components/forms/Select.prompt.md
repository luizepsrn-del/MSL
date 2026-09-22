Dropdown filter for table toolbars.

```jsx
<Select value={filter} onChange={setFilter}
  options={[{ value: 'all', label: 'All Orders' }, { value: 'delay', label: 'Delayed' }]} />
```

Pass `id` and wire it to the surrounding `Field`'s `htmlFor`, otherwise the label names nothing. Where the control sits inline in a row with no Field, pass `aria-label` instead — without it the button is announced by its current value alone, so a list of selects that all read "None" tells a screen reader nothing about which row it is on. Menu opens 6px below, 10px radius, purple-tinted selected row with a trailing tick.
