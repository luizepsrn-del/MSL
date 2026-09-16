The panel every widget sits in. Never nest a Card inside a Card.

```jsx
<Card title="Top Carriers" action={<Button variant="secondary" size="sm" iconRight="arrow-right">See All</Button>}>
  …
</Card>
<Card title="Monthly Revenue" onMenuClick={() => {}}>…</Card>
<Card flush>{/* DataTable bleeding to the card edge */}</Card>
```

`glow` adds the purple corner wash that marks the lead KPI tile.
