The kit's action control — one gradient primary per view, everything else secondary/outline/ghost.

```jsx
<Button variant="primary" iconRight="plus">Create New Order</Button>
<Button variant="secondary" size="sm">Send Invoice</Button>
<Button variant="outline" size="sm">Thank you!</Button>
```

Sizes: sm 30px (table toolbars, pagination), md 36px (default), lg 44px (modal footers, mobile). Primary carries `--gradient-primary` plus a 1px top sheen and gains a purple glow on hover; press shrinks to 0.97.
