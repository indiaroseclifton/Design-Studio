# Design Studio

A React + TypeScript + three.js (via `@react-three/fiber` and `@react-three/drei`) recreation of the
**Event Scenes 3D Studio** design handoff — a browser-based 3D wedding/event design tool where planners
pick a venue, choose a table layout, and drag décor from a catalogue onto tables, the floor or the ceiling.

The original handoff is a single-file HTML/three.js prototype meant as a spec for behaviour, 3D model
proportions and visual styling — not production code. This project recreates it properly: typed React
components, a Zustand store, and reusable three.js building blocks (procedural textures, an instanced
mesh builder, a venue system).

## Stack

- Vite + React 19 + TypeScript
- three.js via `@react-three/fiber` + `@react-three/drei`
- Zustand for state (design, selection, undo/redo history, tweaks)
- Tailwind CSS v4 for the glass-panel UI chrome

## Run it

```sh
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run lint      # oxlint
```

## What's implemented (first pass: scaffold + Studio core)

- **Venues** — two fully procedural venues ported from the handoff (Rustic Barn, Grand Ballroom), each
  with its own sky shader, fog, lighting rig and geometry (`src/data/venues.ts`).
- **Catalogue** — ~20 placeable pieces across Linens, Tableware, Florals, Candles & light, and
  Furniture & lighting (`src/data/catalogue.ts`), each with a live three.js-rendered thumbnail
  (`src/three/thumbnail.ts`).
- **Placement** — click a catalogue card to place it on the table, floor or ceiling; select a "host"
  item (one with a `top` surface) to enter decorating mode and stack stackable pieces on it.
- **Tables & guests** — Round / Banquet / Ceremony / Empty layouts, a guests slider that adds tables,
  "Dress every table alike" mirroring, and "Set a place at every chair" (`src/lib/layout.ts`).
- **Selection & editing** — click to select, rotate (↺/↻), duplicate, remove, recolour via palette or a
  custom colour, and edit text on signage/menu cards.
- **Undo/redo** — snapshot-based history wired to the toolbar.
- **Camera** — Wide / Guest's eye / Couple's view / Overhead presets, orbit controls, slow-orbit toggle.

## Deferred (not in this pass)

Flower Studio, Storybook, Brass Lantern, the AR viewer, and the Designs/Quote/Add-ons modals are stubbed
with a "coming soon" overlay from the toolbar — they're substantial features in their own right and were
scoped out of this first pass by design. Also deferred: the full 277-item catalogue and all 15 venues
(two are implemented as a proof of the pattern), drag-and-drop placement (click-to-place is implemented
instead), plan view, multi-select, per-table rotation, and the placement-zone/weather visualizations.

See `docs/design_handoff_event_studio/README.md` (the original handoff bundle) for the full original spec,
including the working HTML/three.js prototype and screenshots.
