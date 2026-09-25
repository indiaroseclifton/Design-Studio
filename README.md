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

- **Venues** — 14 of the 15 venues, fully procedural and ported from the handoff (Rustic Barn, Tuscan
  Villa, Beach at Sunset, English Garden, Grand Ballroom, Glass Conservatory, Vineyard at Dusk, Enchanted
  Woodland, City Rooftop, Desert Oasis, Garden Marquee, French Château, Lakeside Dock, Industrial Loft),
  each with its own sky shader, fog, lighting rig and geometry (`src/data/venues.ts`). Five chair styles
  (cross, chiavari, rattan, bent bistro, ghost acrylic) cover all of them.
- **Catalogue** — 108 placeable pieces across Templates, Linens, Chairs, Tableware, Florals, Candles &
  light, Furniture & lighting, Wedding, Holiday, Faith & culture, Corporate, Parties & kids, Desserts, and
  five add-on packs (`src/data/catalogue.ts`), each with a live three.js-rendered thumbnail
  (`src/three/thumbnail.ts`). Two categories use special placement mechanics instead of adding a single
  piece: **Chairs** sets the table's chair style (any of 5 styles, or "Match the venue" to reset), and
  **Templates** places a whole bundle of table items at once (Rustic, Modern Glam, Boho, Classic).
- **Flower Studio** — a full-screen custom floral-arrangement builder (`src/components/flowerStudio/`,
  `src/data/flowerStudio.ts`, `src/store/flowerStudioStore.ts`) opened from the toolbar or the catalogue
  panel. Pick a starting preset (Garden Rose, Modern White, Boho Wild, Simple Bud) or build from scratch:
  choose a vessel (compote, cylinder vase, urn, bud vase, low bowl), finish (glass, gold, matte white/black,
  terracotta) and shape (round & lush, cascading, tall & elegant, compact posy), then add/remove flower
  types (8 varieties) and greenery (4 varieties) with per-stem counts and colour swatches, resize the whole
  arrangement, and shuffle the procedural placement seed. A live three.js preview updates as you edit.
  "Save to catalogue" adds the arrangement as a new item under a "My Flowers" category (persisted to
  `localStorage`); "Save & place" also drops it straight onto the active table. Placed arrangements can be
  reopened for editing from the inspector panel's "Edit in Flower Studio" button.
- **Add-ons** — toggle packs (Lounge & rooms, Signage & displays, Tabletop shapes, Event lighting, Stage &
  AV) from the Add-ons modal to reveal extra catalogue categories and pieces, persisted to `localStorage`
  (`src/data/addonPacks.ts`).
- **Placement** — click a catalogue card to place it on the table, floor or ceiling; select a "host"
  item (one with a `top` surface) to enter decorating mode and stack stackable pieces on it.
- **Tables & guests** — Round / Banquet / Ceremony / Empty layouts, a guests slider that adds tables,
  "Dress every table alike" mirroring, and "Set a place at every chair" (`src/lib/layout.ts`).
- **Selection & editing** — click to select, rotate (↺/↻), duplicate, remove, recolour via palette or a
  custom colour, and edit text on signage/menu cards.
- **Undo/redo** — snapshot-based history wired to the toolbar.
- **Camera** — Wide / Guest's eye / Couple's view / Overhead presets, orbit controls, slow-orbit toggle.
- **Snapshot** — downloads a PNG of the current 3D view; also used as the thumbnail when saving a design.
- **Designs modal** — save/load/rename/delete named designs (with a live snapshot thumbnail) to
  `localStorage`, plus JSON export/import of the current design (`src/components/ui/DesignsModal.tsx`).
- **Quote modal** — a priced, category-grouped line-item table computed from what's actually placed
  (respecting mirrored table counts), with editable unit prices, service/tax percentages, CSV export, and
  a print/Save-as-PDF button (`src/components/ui/QuoteModal.tsx`).

## Deferred

Storybook, Brass Lantern, and the AR viewer are stubbed with a "coming soon" overlay from the toolbar —
they're substantial features in their own right and were scoped out by design. Also deferred: My Uploads
(needs file upload), the rest of the ~277-item catalogue, and the "Your Venue" custom photo-upload venue,
drag-and-drop placement (click-to-place is implemented instead), plan view, multi-select, per-table
rotation, and the placement-zone/weather visualizations.

See `docs/design_handoff_event_studio/README.md` (the original handoff bundle) for the full original spec,
including the working HTML/three.js prototype and screenshots.
