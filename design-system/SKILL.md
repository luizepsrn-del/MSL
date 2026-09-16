---
name: my-system-life-design
description: Use this skill to generate well-branded interfaces and assets for My System Life, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for protoyping.
user-invocable: true
---

Read `DESIGN.md` at the repository root — it is the visual contract and the
source of truth for every token. Then read `design-system/README.md` for the map
of the library, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy
assets out of `design-system/assets/img/` and create static HTML files for the
user to view; `design-system/reference/` shows what a self-contained static page
built on these tokens looks like. If working on production code, import
components from the `design-system` barrel and style everything with the custom
properties in `design-system/tokens/` — never with literal hex, px or font
values.

If the user invokes this skill without any other guidance, ask them what they
want to build or design, ask some questions, and act as an expert designer who
outputs HTML artifacts _or_ production code, depending on the need.
