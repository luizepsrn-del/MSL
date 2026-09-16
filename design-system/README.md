# design-system

The implementation of the visual contract in [`../DESIGN.md`](../DESIGN.md).
That file is the source of truth for every token value; this one is the map.

The whole library renders at **`/design-system`** — every component, every state,
both themes, and the two UI kits. Start `npm run dev` and open it.

## What is in each folder

| Folder | What it holds |
| --- | --- |
| `tokens/` | The nine CSS files that define every value. `colors` · `typography` · `spacing` · `radius` · `elevation` · `motion` · `fonts` · `base` · `themes` |
| `styles.css` | The single entry point. `@import` lines only. Imported once, in `src/main.tsx` |
| `index.ts` | **The barrel.** The only import surface application code may use |
| `components/core/` | Icon · Button · IconButton · Card · Badge · Tag · Avatar · ProgressBar |
| `components/forms/` | SearchInput · Checkbox · Switch · Radio · Select |
| `components/navigation/` | Sidebar · TopBar · PageHeader · Pagination |
| `components/data/` | StatCard · DataTable · SelectionToolbar · DonutChart · LineChart · BarChart · MetricBarList · CarrierRow |
| `components/messaging/` | ChatListItem · MessageBubble · MessageComposer |
| `components/feedback/` | Modal · SuccessDialog · OptionCard · StepProgress · PromoCard · PromoBanner |
| `patterns/` | Composition patterns — the assembled shells and screens the primitives compose into |
| `assets/img/` | The two images in the system, imported through Vite (never by a written path) |
| `reference/` | **The visual reference pages.** Static specimens, preserved as-is |
| `adherence-metadata.json` | The prop contracts and token inventory the lint rules were generated from |
| `SKILL.md` | Agent Skill front matter, for using this system outside the project |

34 components. Every component file has a sibling `.prompt.md` saying when to
reach for it, with a usage example — read that before using one.

## Patterns

`patterns/` is not a second component layer. It holds the assembled screens from
the source UI kits, and they are the starting point for a new screen:

- `patterns/desktop/AdminShell.tsx` — the 72px top bar, 224px rail, routed
  content area, Account Set Up modal and confirmation dialog.
- `patterns/desktop/` — the five designed views: Overview, Orders, Automations,
  Analytics, Messages. `PlaceholderScreen` is what the four undesigned
  destinations render.
- `patterns/mobile/MobileShell.tsx` — the same product at 390pt. Nothing is
  removed, only re-laid out: the rail becomes a drawer, the KPI row a snap rail,
  tables become one card per row.
- `patterns/data.ts` — the sample data the patterns render. Demo data, not
  application state.

## The visual reference

`reference/` holds the original static specimen pages from the design-system
export — 21 foundation cards (colour ramps, type scale, spacing, elevation,
motion), one card per component group, and both UI kits as click-through pages.

They are documentation, not the library. Nothing imports them and they are not
linted. They are kept because they are the clearest single view of a foundation,
and because they render without the app.

**Open them at `/design-system/reference/index.html`** with `npm run dev`
running. They need a server, not `file://` — the component cards and UI kits
compile their own JSX in the browser, which the file protocol blocks. They are
also copied into `dist/` by the build, so `npm run preview` serves them too.

## Adding a component

1. **Check it does not already exist.** 34 is most of what this product needs.
   Read the `.prompt.md` files for the group you are working in.
2. **Check `../DESIGN.md` defines it.** The source material is screens, not a
   component library — if the product has no such element, the answer is usually
   that it should not exist. There is deliberately no Tooltip, Toast, Accordion,
   Breadcrumb or Tabs component.
3. Create `components/<group>/<Name>.tsx`. Export a named function component and
   an exported `<Name>Props` interface. Match the house style: a typed props
   interface, inline styles that reference tokens, local `useState` for hover
   and press.
4. **Every value is a token.** `var(--purple-500)`, `var(--sp-8)`,
   `var(--r-card)`. No hex, no px, no font stack. If you need a value the tokens
   do not have, add it to `tokens/` and record it in `../DESIGN.md` first — the
   contract changes before the code does.
5. Cover the states the component actually has: default, hover, active, focus,
   disabled, and where they apply loading, error, empty and selected. Do not
   invent a state the design does not define.
6. Write `components/<group>/<Name>.prompt.md` next to it, saying when to use it
   with a short example.
7. Export it from `components/index.ts` — both the component and its props type.
8. Add a `<Spec>` for it in `src/routes/showcase-sections.tsx`, listing the
   states it shows.
9. Run `npm run lint && npm run typecheck && npm run build`.

## Adding or changing a token

Change `../DESIGN.md` first, then `tokens/`. If the token is one of the ten that
resolve into the ink ramp — the surfaces, body/muted/subtle text, and the chart
neutrals — it also has to be declared in **both** blocks of `tokens/themes.css`.
A custom property containing `var()` is substituted in the scope where it is
declared, so a copy left only on `:root` will ignore the scoped theme override
and the light theme will silently half-apply. `tokens/themes.css` says which ten
and why.
