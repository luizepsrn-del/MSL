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
  dominio/             the tested logic: rotina, tarefa, repeticao, calendario,
                       projeto, modelo, financeiro, meta, foco, plano, regra,
                       criacao, ical, google, pedido, agente, preferencias
  telas/               one screen per pillar (Agente.tsx serves /app/pedir)
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
- **The agent is local, and answers only from the data.** `src/dominio/agente.ts`
  calls no model and holds no API key. It maps a sentence to a **declared**
  intent; anything else becomes a prompt for Claude Code rather than a guess.
  Commands return an `efeito` for the screen to apply — no answer writes.
  Ambiguity is never resolved silently: two tasks matching "renovar" make it
  ask which one.
- **`\b` in JavaScript only knows `[A-Za-z0-9_]`.** `/\bamanhã\b/` never
  matches, because `ã` is not a word character. Use `(?!\p{L})` with the `u`
  flag for word ends in Portuguese.
- **Parse dates out of the original text, not the normalized one.** The
  patterns tolerate accents; the text keeps them. Otherwise "pagar o IPVA do
  carrão" comes back as "pagar o ipva do carrao".
- **Interface preferences live in the bank, not in `localStorage`**, so they
  travel in the backup. Unknown block ids from a newer export are dropped, not
  fatal; an empty list is a choice, not an absence.
- **A project's rhythm and forecast are measured, not declared.** With no
  pending task or no rhythm there is no forecast — dividing by zero would put
  a date on the screen that nothing backs.
- **A goal's progress is measured, never stored**, and the window it counts
  **ends today**, not at the end of the period. With the whole month in the
  window, a salary posted for the 30th would mark a savings goal achieved on
  the 1st. `marcos` is a separate collection for the same reason `execucoes`
  is separate from `rotinas`: progress has a day, so it survives the turn of
  the month instead of lying across it.
- **A limit goal is `noAlvo`, never "achieved".** A spending cap starts the
  month inside the cap; calling that "achieved" on the 1st celebrates what has
  not happened. The field name carries the distinction.
- **The focus queue is an instruction, not a panel.** `precisaDeVoce` merges
  task, routine, bill, goal and project into one list ordered by how hard each
  one is pressing, and stops at `LIMITE_DO_FOCO`. A forty-item "what to do
  now" is a list of everything, which is what it was built to replace. When it
  swallowed the "Vencendo" and "Hoje" cards, those moved to `deFabrica: false`
  rather than being deleted — the same rows twice, centimetres apart, is how
  the home screen goes back to being a panel.
- **External calendar events never enter the bank.** They belong to another
  system, and a stored copy ages: deleting the appointment in Google would
  leave the ghost here forever. Only the subscription address is stored, in
  preferences — and it is a password, so the Settings screen says so.
- **The Google mirror's only link is a mark on the Google side.**
  `extendedProperties.private.msl` holds `tarefa:<id>` or `peca:<id>`. No
  schema field, no event id travelling between devices: two devices find the
  same event by the mark and *update* instead of creating a second, and
  deleting the Google account leaves no litter in the bank. An event without
  the mark belongs to Google and is never touched.
- **Two-way conflicts use the same rule as the device merge: last write wins.**
  Google's `updated` against the record's `alteradoEm`. It works because the
  comparison only runs when the content *differs* — writing to Google stamps a
  newer `updated`, but by then both sides are equal and the plan is empty.
- **What goes out to Google is decided on the client**, not the server: the
  server receives title, day and hour and knows nothing about tasks or pieces.
  Pending tasks with a deadline and unpublished pieces with a date. Never
  routines — the calendar would become the whole routine. A completed task
  stops being mirrored and the orphan-mirror rule deletes it from Google.
- **The mirrored window is fixed (30 days back, 180 forward) and is not the
  screen's window.** Paging to the next month would otherwise delete the
  previous month's events, which left the view but not the life.
- **Compare in percentage points, not percent.** Going from 50% to 58% is not
  an 8% rise, and calling it that makes the number lie in the flattering
  direction.
- **A recurring task is generated, not derived** — the one declared exception,
  and the reason is in the schema. A task occurrence needs identity: it goes
  overdue, collects a note, moves on the board. The next one is born when the
  current is **completed**, not before, so the future does not fill with tasks
  nobody asked for and skipping three weeks leaves one overdue item, not three.
  `aoPular` exists for pushing one without pretending it was done.
- **The 31st in a 30-day month clamps to the last day — the opposite of what
  the iCal reader does.** There, a date that does not exist did not happen;
  here, a bill does not vanish for want of a day in the calendar. Both rules
  are right in their own file, and each says so.
- **A template's deadlines are relative to the delivery, never dates.** A
  template with fixed dates serves once and then becomes a list of expired
  deadlines. Project → template → project round-trips, and there is a test.
- **The day plan is a proposal, and nothing writes it.** A suggested time
  stored as data would be an appointment where there was a guess. Same reason
  there is no per-task estimate: every task asks for the same block, because a
  number nobody measured is invented precision.
- **Rules never write on their own.** They compute what they would do and show
  it; applying is one tap. There is no fired-log either — every effect is
  idempotent instead, which swaps a forever-growing collection that would have
  to sync for a property of the calculation. A device that was offline repeats
  nothing on return, because the question is always about the state now.
- **A "piece" with a publish date is in the calendar and in the queue.** That
  is what makes Criação part of the system instead of a notepad beside it. A
  `semente` never enters the queue — it is raw material, and an idea that turns
  into nagging is the shortest path to not writing ideas down.

Routes: `/app/<pilar>` is the product — `inicio`, `rotina`, `tarefas`, `calendario`, `projetos`, `financeiro`, `criacao`, `metas`, `pedir`, `regras`, `ajustes`. Each has its own URL.
`/design-system` is the library showcase.

## Editing

Every form serves two modes, create and correct — one form per record, never
two. Two forms for the same record diverge on the first new rule only one of
them gets.

- `aplicarEdicao` in `src/dominio/edicao.ts` holds what a correction may *not*
  do: it never touches `id` or `criadoEm`, always stamps `alteradoEm`, and
  tells "I did not send this field" apart from "I sent it empty" — that
  difference is how a deadline gets removed at all.
- The form's state is born from the record, and the form is **mounted only
  while open**. It used to be filled by an effect that ran after the dialog
  appeared, and anything typed in that gap was overwritten by the stored value.
- Correcting a routine's recurrence rewrites past and future at once, because
  the calendar is derived — and the ticks already recorded are **not** deleted.
  Losing recorded work to fix a schedule would be the worst kind of trade.
- Money goes through the same `validarValor` on the way in and on the way
  back: a check that only guards the front door is not a check.

## Sync

Two devices, one account, and the merge is the whole game.

- **Per record, by `alteradoEm` — never "the newest whole bank wins".** That
  lazy rule loses work: three tasks ticked underground, then the Mac syncs and
  wipes all three. The test that opens `sincronizacao.test.ts` is exactly that.
- **`juntar` is commutative and idempotent**, and both are tested. It once
  picked the right records but returned them in a different order depending on
  which side came first — the two devices would store different documents with
  the same content, fighting forever over which is newer.
- **Deleting leaves a tombstone** in `banco.removidos`, beside the collections
  and not inside them, so no screen had to learn to filter dead records. A
  tombstone only wins if the removal came *after* the last edit.
- **Server logic lives in `src/servidor/`, behind an `Armazem` interface**, the
  same seam as the client's `Repositorio`. The files in `api/` are three-line
  adapters. That is what makes signup, wrong password, cool-off, expiry and
  revocation provable in Vitest, with no network.
- **Per-method exports (`export const POST`)** in `api/`, never `export
  default`: with the default, Vercel may hand the Node objects instead of a
  `Request`, and the returned `Response` is ignored.
- **Every module reachable from `api/` imports with the `.ts` extension.**
  Vite guesses the missing one; Vercel does not, and the function dies with no
  clue. `src/servidor/api.test.ts` boots real Node per function and catches it
  — it caught `from './rotina'` inside the iCal reader on the way in.
- **OAuth needs `access_type=offline` *and* `prompt=consent`.** Without the
  first the access dies in an hour and never returns; without the second a
  *re*-connection comes back with no refresh token, so the reconnection meant
  to fix the access leaves it half broken. The refresh token is preserved when
  a renewal arrives without one, which is the normal case.
- **The OAuth `state` is server-generated, bound to the user and spent on
  first check.** Without it someone could make your browser finish a flow they
  started, and their calendar would be linked to your account.
- **Google credentials live in Redis, never in the bank.** The bank rides in
  the exported file and in the device sync; restoring a backup on a borrowed
  device must not hand over someone's calendar.
- The public address forces three things: only allow-listed e-mails may sign
  up (`EMAILS_PERMITIDOS`, and an empty list closes the door), a missing
  account answers exactly like a wrong password, and five wrong tries cool the
  account for fifteen minutes.
- The session token lives in `localStorage`, **outside the bank**. Inside, it
  would ride along in the exported backup, and restoring on a borrowed device
  would hand it your session.
- **`/api/agenda` fetches a URL the client sends, which is an SSRF invitation.**
  Four fences, all tested: a valid session, `https` plus a host allowlist, the
  *final* URL re-checked after redirects, and caps on bytes and seconds. The
  allowlist is the one that matters — with it no internal address is reachable,
  however creative the body. `https://calendar.google.com@evil.com` is a URL
  whose host is `evil.com`; that is how this fence is usually jumped.

## Storage

The data lives in this device's browser, and there are three ways it can go:

- **Safari erases local storage after seven days without visiting the site** —
  but only for sites that are *not installed*. Installing to the home screen is
  what removes that rule, which is why the manifest, the icons and the service
  worker exist. `navigator.storage.persist()` does **not** help here.
- The browser can be cleared, and the device can break. Only the exported file
  covers those. `src/dominio/backup.ts` counts the days and the Settings screen
  shows the number — a generic "back up your data" is a notice people learn to
  ignore; "nine days ago" is not. It stays quiet while there is nothing to save.
- `ultimoBackupEm` rides inside the exported file on purpose: the file carries
  the moment it was made, so restoring on a new device tells the truth about
  when that data was last saved.

The service worker caches **files, not data**, and reads the hashed chunk names
out of `index.html` at install: otherwise they only land in the cache on the
second visit, and installing then boarding a plane opens a blank screen. It has
no `skipWaiting` — a new version takes over on the next launch, never under an
open session.

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
  The three style objects live in `src/casca/trilho.ts` — two copies of the
  rule is how it goes back to diverging.
- **Hide a panel with `inert`, never `aria-hidden`.** Tapping an item in the
  mobile drawer navigates *and* closes the drawer, so the tapped button still
  holds focus when its ancestor becomes hidden — Chrome blocks that and logs
  it. `aria-hidden` hides from assistive technology without removing
  focusability, which strands keyboard and screen-reader users in a panel that,
  for everyone else, is gone. `inert` does both. `e2e/acessibilidade.spec.ts`
  guards it, **in Chromium at phone width**: the drawer only exists below
  `--bp-desktop`, and in WebKit clicking a button does not even focus it, so
  the first version of that test passed with the defect in place.
- **A row with badges and buttons must wrap, or the text is crushed to one
  letter per line.** It happened twice: the Finance row when it got the pencil,
  and the task row when it got the skip button — photographed, with the title
  running vertically down the screen. `flexWrap: 'wrap'` plus
  `flex: '1 1 var(--grid-min)'` on the text column. `e2e/tarefa.spec.ts`
  measures the title's width so it cannot come back.

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
- `design-system/components/` — the 36 primitives, in six groups: `core`,
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
