# Admin Dashboard — mobile UI kit

The same product at 390pt, following the mobile frames in the source material
(`uploads/02`, `03`, `11`). Open `index.html`.

## What's here

| File | Surface |
| --- | --- |
| `index.html` | Phone shell, drawer nav, view routing, modal + confirmation |
| `MobileChrome.jsx` | Status bar, header (hamburger · notification pill · avatar), utility row, drawer |
| `MobileScreens.jsx` | Dashboard, Orders, Automations, Carriers, Messages, placeholder |

Sample data is shared with the desktop kit via `../admin_desktop/data.js`.

## How desktop parity is kept

The brief asks for full mobile access **without losing desktop features**, so nothing
is removed — only re-laid-out:

- **Navigation** — the 224px rail becomes a left drawer behind the hamburger, same
  sections, same items, same active gradient.
- **KPI row** — four tiles become a snap-scrolling rail with position dots, the
  pattern the source's phone frame shows.
- **Tables** — the Orders table becomes one card per order carrying *every* column
  as a labelled field; the bulk-action row scrolls horizontally. Automations keeps
  its tag and switch on a single row. No column is dropped and no horizontal table scroll.
- **Charts** — same components at reduced heights; the revenue series switch stays.
- **Chat** — the two-pane layout becomes list → thread with a back control.
- **Touch** — every control is at least 44px (`--tap-min`); `size="lg"` on buttons
  and inputs, `size={44}` on icon buttons.
