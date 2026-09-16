The product's 224px navigation rail. Two sections in the source: "Menu" and "Support".

```jsx
<Sidebar active="analytics" onSelect={setView} footer={<PromoCard />}
  sections={[
    { label: 'Menu', items: [{ id: 'overview', label: 'Overview', icon: 'layout-dashboard' }, { id: 'orders', label: 'Orders', icon: 'clipboard-list' }] },
    { label: 'Support', items: [{ id: 'settings', label: 'Settings', icon: 'settings' }] },
  ]} />
```

The active item is the purple gradient plus a 3px glowing tab that sits on the shell's left edge.
