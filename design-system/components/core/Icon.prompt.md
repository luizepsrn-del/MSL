One Lucide outline glyph at the kit's 1.6px stroke weight — use it for every icon rather than inlining SVG.

```jsx
<Icon name="truck" size={18} />
<Icon name="bell" size={16} color="var(--text-muted)" />
```

Needs `<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.js"></script>` on the page. Default stroke 1.6; sidebar and table glyphs are 18px, inline/meta glyphs 14–16px, KPI tile glyphs 20px.
