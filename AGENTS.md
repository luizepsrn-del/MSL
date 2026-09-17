# AGENTS.md

My System Life — a personal and professional life-management system: routine,
tasks, projects, finances and calendar. React 19 + TypeScript, built with Vite.
Everything visual comes from the design system in `design-system/`.

**The product is in Portuguese (pt-BR); the design system's API is in English.**
That split is deliberate and load-bearing — see *Language* below.

**The library was reconstructed from a logistics dashboard, and that domain was
never deleted.** `design-system/patterns/` still holds the working logistics
kit; it is the library's demonstration, reachable from `/design-system`. The
product lives in `src/casca/`. Do not confuse the two, and do not delete the
demonstration to "clean up".

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Typecheck, build, and copy the reference pages into `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, including the design-system adherence rules |
| `npm test` | Vitest — domain logic, Node environment |
| `npm run test:e2e` | Playwright — `mac` (Chromium) and `iphone` (WebKit) |
| `npm run verificar` | lint + typecheck + test, the pre-commit gate |
| `npm run preview` | Serve the production build |

Run `npm run verificar && npm run build` before calling work done, and
`npm run test:e2e` at any gate that touches a surface.

**Test layout.** Domain logic is tested next to the code it covers
(`**/*.test.ts`, Node environment — recurrence, balance, deadlines, schema
migration). End-to-end specs live in `e2e/` and run against both real clients:
the iPhone project uses WebKit, not Chromium, because that is what the phone
actually runs.

**Pre-commit gate.** `.githooks/pre-commit` runs lint + typecheck + domain
tests, and it does block. A fresh clone must opt in once:

```bash
git config core.hooksPath .githooks
```

End-to-end is deliberately not in the hook — it boots a server and would kill
the habit of small commits. `git commit --no-verify` skips the gate for a
draft.

## Layout

```
DESIGN.md              the visual contract — token source of truth
MAPA.md                what the library holds, and what fits the life domain
DECISOES.md            the structural decisions and why each was taken
design-system/         the component library (see its README for the map)
src/
  casca/               the product shell: navigation, desktop and mobile
  dados/               schema, migrations, repository seam, React context
  dominio/             the tested logic: rotina, tarefa, calendario,
                       projeto, financeiro, pedido
  telas/               one screen per pillar
  formato/             pt-BR formatting — dates, money, sorting
  routes/Showcase.tsx  the /design-system showcase page
adherence.rules.json   the design-system lint rules, from the original export
```

## Domain rules that already bit once

Each of these is a decision with a test behind it. Changing one without
reading its test is how the system starts lying.

- **Derived, never stored.** A task's situation, a project's progress, a
  calendar day's contents — all computed from the data. A stored "overdue"
  ages on its own and would need someone sweeping the database at midnight.
- **Money is an integer in cents.** Never a float, never negative — the sign
  comes from `tipo`. `src/dominio/financeiro.ts` has the one function that
  converts a record into a signed number.
- **Today is not late.** A routine not yet done today does not break the
  streak; a task due today is "today", not overdue. The day is not over.
- **A day with nothing scheduled is complete (100%); a project with no tasks
  is 0%.** Opposite defaults, on purpose: nothing to do is a finished day, but
  an empty project has not started.
- **Removing a project frees its tasks, never deletes them.**
- **Schema changes are additive**, bump `VERSAO_ESQUEMA` and add a migration.
  A test walks every version from 0 to current and fails if a step has no path.
- **Dates are local `AAAA-MM-DD` strings**, never `Date`, in every domain
  module. Recurrence is a calendar question, not an instant.
- **An ISO instant's local day is not its first ten characters.** `concluidaEm`
  is UTC; slicing it puts a task finished at 22:00 in São Paulo on the next
  day. Use `diaLocalDe` in `src/dominio/rotina.ts`.
- **`concluidaEm` is the only truth about "done".** The kanban's `estado` only
  tells `a-fazer` from `fazendo` among pending tasks — two sources for the same
  answer would diverge. `aoMoverPara` holds the transition so the board and the
  checkbox can never disagree.
- **Repetition is derived, never stored.** A recurring entry expands into
  occurrences in the window being looked at, anchored to its original date.
  Storing twelve rents would create twelve records that age together. Same
  principle as the calendar.
- **A project's rhythm and forecast are measured, not declared.** With no
  pending task or no rhythm there is no forecast — dividing by zero would put
  a date on the screen that nothing backs.

Routes: `/app/<pilar>` is the product — `inicio`, `rotina`, `tarefas`, `calendario`, `projetos`, `financeiro`, `pedir`, `ajustes`. Each has its own URL.
`/design-system` is the library showcase.

## Width traps on the phone, each one measured

- **A grid track written `1fr` has min-content as its floor.** A card whose
  header holds a button that will not shrink pushes the track past the
  viewport, and the button is clipped. Measured: 419px in a 393px screen.
  Always `minmax(0, 1fr)`, including the single-column case.
- **Scroll snapping ignores the container's padding.** A snap rail bled to the
  edge with `margin: 0 calc(-1 * var(--shell-gutter))` snaps its first item to
  the screen edge, out of line with every other card, unless it also carries
  `scroll-padding-left: var(--shell-gutter)`.
- **A value bubble over the last point or bar leaves the card.** `BarChart`'s
  `valueLabel` and `LineChart`'s `tooltip` are centred on the highlighted
  item; on the last one, half of it lands outside. Put the number in the
  card's subtitle instead.
- **The rail is for the phone.** On the desktop it has no scrollbar, so
  anything past the fold is simply invisible: five tiles of `--grid-min`
  already did not fit. There, use the reflowing grid DESIGN.md prescribes.

## Language

- **Everything the user sees, and every identifier in `src/`, is pt-BR.**
- **The design system's API stays in English** — component names, prop names,
  prop values, token names. It is a library, and it is read by tooling:
  **49 of the 52 selectors in `adherence.rules.json` match on English component
  and prop names.** Renaming them does not break those rules, it silences them —
  they would keep passing while protecting nothing. `reference/_ds_bundle.js` is
  a compiled artifact with no source here, so the reference pages would break
  irreparably too.
- **Never call `Intl` from a screen.** Dates, times, money, numbers and sorting
  go through `src/formato`. Money is an integer in cents, never a float.

## Design system rules

These are not style preferences. `npm run lint` fails on them.

1. **`DESIGN.md` at the root is the visual contract and the source of truth for
   the tokens.** It is versioned. If a value in the code disagrees with it, the
   code is the bug. Change `DESIGN.md` before changing a token.

2. **New components are created in `design-system/`**, not next to the screen
   that needed them. There are 34 already — check
   `design-system/components/*/*.prompt.md` before adding a 35th, and check that
   `DESIGN.md` actually defines the thing. The library deliberately has no
   Tooltip, Toast, Accordion, Breadcrumb or Tabs, because the product has none.
   `design-system/README.md` has the step-by-step procedure.

3. **No colour, font, spacing or radius value is ever hardcoded.** Use the
   tokens: `var(--purple-500)`, `var(--sp-8)`, `var(--r-card)`,
   `var(--type-body)`. Never `#682EC7`, `16px`, or a font stack. If a value you
   need does not exist as a token, add it to `design-system/tokens/` and record
   it in `DESIGN.md` — do not inline it.

4. **Import from the barrel**, never from a component file:
   `import { Button, Card } from '../design-system'` — not
   `from '../design-system/components/core/Button'`.

5. **Do not invent design values.** The system was reconstructed from screenshots
   and `DESIGN.md` records exactly what the source defines and what it does not.
   Where it says a thing does not exist — no light-mode screens, no loading
   state on `Button`, no logo — that is a finding, not a gap to fill. Ask first.

The library itself is exempt from rule 3: `design-system/` is where tokens are
defined and where raw geometry (icon sizes, 1px hairlines, grid tracks) is
legitimate. Everything outside it is held to the full rule set.

## The library map

- `design-system/tokens/` — every value, in nine CSS files.
- `design-system/components/` — the 34 primitives, in six groups: `core`,
  `forms`, `navigation`, `data`, `messaging`, `feedback`. Each has a sibling
  `.prompt.md` saying when to use it.
- `design-system/patterns/` — the assembled shells and screens. Start a new
  screen from one of these rather than from an empty file.
- `design-system/assets/img/` — the two images in the system. Import them from
  the barrel; never write an asset path by hand.
- `design-system/reference/` — **the visual reference pages.** The original
  static specimens: 21 foundation cards, 6 component cards, both UI kits. Open
  them at `/design-system/reference/index.html` with the dev server running —
  they need a server, not `file://`.
- `/design-system` route — the live showcase: every component, every state, both
  themes side by side.

`design-system/README.md` is the full map and the procedure for adding a
component or a token.

## Responsive shell

`src/casca/Casca.tsx` picks the desktop or the mobile layout from the real
window width, at `--bp-desktop` (1224px). That number is **derived, not
invented**: rail 224 + gutter 20 + the desktop shell's own 960px content
minimum + gutter 20. Below it the desktop shell cannot fit, and the mobile
layout is the correct one, not a degraded one.

`useLarguraDesktop` returns `null` until it can read the token, and the shell
renders nothing while undecided. In development Vite injects CSS via
JavaScript, so the token is absent on the first evaluation — reading once and
giving up picked desktop forever, which is exactly how the iPhone kept getting
the 224px rail. Do not "simplify" that retry away.

The mobile shell honours `safe-area-inset` on all four sides and uses `100dvh`;
`index.html` carries `viewport-fit=cover`, without which the inset is always
zero.

## Theming

Dark is the canonical theme and the default. A light theme was added on top as a
mechanical derivation of the ink ramp — brand hues are identical in both. The
theme lives on `<html data-theme>`, owned by `src/theme.tsx`. A subtree can be
pinned to a theme with `data-theme`, which is how the showcase renders both at
once.

Adding a token that resolves into the ink ramp means declaring it in **both**
blocks of `design-system/tokens/themes.css` — a `var()` alias left only on
`:root` resolves against `:root` and silently ignores the scoped override.
