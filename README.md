# My System Life

A logistics management admin dashboard — brokers, dispatchers and delivery teams
tracking shipments, monitoring fleets, managing orders and invoices, running
automations, reading analytics and talking to carriers and drivers.

React 19 · TypeScript · Vite 8.

## Getting started

```bash
npm install
npm run dev
```

| Route | What it is |
| --- | --- |
| `/app` | The product — the desktop admin shell |
| `/design-system` | The design-system showcase: every component, every state, both themes |
| `/design-system/reference/index.html` | The visual reference pages (needs the dev server, not `file://`) |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Typecheck, build to `dist/`, and copy the reference pages across |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, including the design-system adherence rules |
| `npm test` | Vitest — domain logic |
| `npm run test:e2e` | Playwright — Mac and iPhone |
| `npm run verificar` | lint + typecheck + test (roda no pre-commit) |
| `npm run preview` | Serve the production build |

Depois de clonar, ative o portão de commit uma vez:
`git config core.hooksPath .githooks`

## Layout

```
DESIGN.md         the visual contract — the source of truth for every token
AGENTS.md         instructions for agent tools (CLAUDE.md imports it)
design-system/    the component library — 34 components, tokens, patterns,
                  and the preserved visual reference pages
src/              the application
```

## Working on it

Everything visual comes from `design-system/`. Two rules carry most of the
weight:

- New components are created **inside the library**, not beside the screen that
  needed them.
- No colour, font, spacing or radius value is ever hardcoded — every value goes
  through a token.

`npm run lint` enforces both. [`DESIGN.md`](DESIGN.md) is the contract those
rules protect, [`design-system/README.md`](design-system/README.md) is the map
of the library and the procedure for adding to it, and [`AGENTS.md`](AGENTS.md)
is the short version that agent tools read.
