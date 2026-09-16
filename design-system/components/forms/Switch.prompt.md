Enable/disable control. In this product it lives in the Automations table's Status column.

```jsx
<Switch checked={row.enabled} onChange={v => setEnabled(row.id, v)} />
<Switch checked label="Email me on delay" />
```
