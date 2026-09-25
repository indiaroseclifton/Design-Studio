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

## What's implemented

### First pass: scaffold + Studio core

- **Venues:** procedural venues ported from the handoff (`src/data/venues.ts`), each with its own sky
  shader, fog, lighting rig and geometry. Rustic Barn and Grand Ballroom (indoor), and Beach at Sunset and
  English Garden (outdoor).
- **Catalogue:** ~20 placeable pieces across Linens, Tableware, Florals, Candles & light, and
  Furniture & lighting (`src/data/catalogue.ts`), each with a live three.js-rendered thumbnail
  (`src/three/thumbnail.ts`).
- **Placement:** click a catalogue card to place it on the table, floor or ceiling. Select a "host"
  item (one with a `top` surface) to enter decorating mode and stack stackable pieces on it.
- **Tables & guests:** Round / Banquet / Ceremony / Empty layouts, a guests slider that adds tables,
  "Dress every table alike" mirroring, and "Set a place at every chair" (`src/lib/layout.ts`).
- **Selection & editing:** click to select, rotate (↺/↻), duplicate, remove, recolour via palette or a
  custom colour, and edit text on signage and menu cards.
- **Undo/redo:** snapshot-based history wired to the toolbar.

### Second pass: Studio completeness, Designs, Quote

- **Time of day & weather** (`src/lib/environment.ts`, `src/three/Weather.tsx`): Venue / Day / Golden /
  Night re-light the sky, sun, fog, exposure and the venue's own lamps, and add a star dome at night.
  Rain and snow particle systems run on outdoor venues and grey out the sky, as in the prototype's `envFor`.
- **Keyboard shortcuts** (`src/lib/useKeyboardShortcuts.ts`): Esc (closes the modal, then exits
  cinematic, then plan view, then deselects), Q/E rotate, D duplicate, Delete/Backspace remove,
  Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo. The prototype's global ArrowLeft/Right venue switching is
  deliberately left out, because the handoff flags it as the likely cause of unexpected venue changes.
- **Tweaks panel:** Mood (CSS filter plus exposure), Interface (Studio / Focus, where panels fade to 18% until
  hovered / Cinematic, with letterbox bars, hidden panels and the strip kept) and Accent (Champagne / Rose / Sage /
  Silver, applied through the `--ac` CSS variables).
- **Camera:** preset tweens (instant when Motion is off), Reset camera, and an orthographic top-down
  **Plan view**.
- **Designs modal:** save the current design with a scene thumbnail, then open, rename or delete it
  (`vs2_designs` in localStorage). Also a gzip share link (`#d=…`, opened on load), JSON export and JSON import.
  Imported data is validated by `normalizeDesign`.
- **Quote modal:** lines are built from what's actually in the scene (mirrored table pieces count once per
  table), grouped by category, with editable unit prices, currency, service % and tax %. Includes CSV export
  and a print/PDF view with a snapshot. Settings persist in `vs2_quote`.
- **Snapshot:** downloads a PNG of the current view.
- **Autosave:** the current design, tweaks and motion setting survive a reload (`vs2_state`).

## Deferred

Flower Studio, Storybook, Brass Lantern, the AR viewer and the Add-ons modal still show a "coming soon"
overlay from the toolbar. Also deferred: the full 277-item catalogue and the remaining 11 venues, the add-on
packs, drag-and-drop placement (click-to-place is implemented instead), dragging tables in plan view, multi-select,
per-table rotation, the custom palette editor, the placement-zone visualization, bloom/vignette post-processing,
the lookbook PDF, and the ≤860px responsive drawer layout.

See `docs/design_handoff_event_studio/README.md` (the original handoff bundle) for the full original spec,
including the working HTML/three.js prototype and screenshots.
