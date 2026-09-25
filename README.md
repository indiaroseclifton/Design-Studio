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

- **Venues** — all 15 venues, fully procedural and ported from the handoff (Rustic Barn, Tuscan
  Villa, Beach at Sunset, English Garden, Grand Ballroom, Glass Conservatory, Vineyard at Dusk, Enchanted
  Woodland, City Rooftop, Desert Oasis, Garden Marquee, French Château, Lakeside Dock, Industrial Loft),
  each with its own sky shader, fog, lighting rig and geometry (`src/data/venues.ts`). Five chair styles
  (cross, chiavari, rattan, bent bistro, ghost acrylic) cover all of them. The 15th, **Your Venue**, lets you
  upload a photo of a real space instead: a 2:1 panorama is mapped as an equirectangular dome background
  that wraps all the way around, while any other photo becomes a curved backdrop panel behind the tables.
  The photo persists to `localStorage` and can be swapped via the "Change" link on its venue card
  (`src/store/venuePhotoStore.ts`).
- **Catalogue** — 199 placeable pieces (up from the original build's 108, ~72% of the way to the handoff's
  full ~277-item set) across Templates, Linens, Chairs, Tableware, Florals, Candles &
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
- **Selection & editing** — click to select, rotate (Q/↺, E/↻), duplicate (D), remove (Delete), recolour via
  palette or a custom colour, and edit text on signage/menu cards. Shift-click adds pieces to a multi-select;
  the inspector then offers "Line up", "Circle", "Face centre" and "Remove all" for the group
  (`src/store/designStore.ts`, `src/lib/useKeyboardShortcuts.ts`).
- **Tables** — click a table to select and rotate just that one (independent of the others in a multi-table
  layout) via the inspector or Q/E.
- **Undo/redo** — snapshot-based history wired to the toolbar and Ctrl/Cmd+Z / Ctrl+Shift+Z.
- **Camera** — Wide / Guest's eye / Couple's view / Overhead presets, orbit controls, slow-orbit toggle, and
  a **Plan view** that clips away roofs and hanging décor above head height and drops into a top-down,
  pan-only floor plan of the layout (`src/components/Studio/CameraRig.tsx`).
- **Storybook** — a toolbar button that cycles the camera through four presets (including a plan-view shot
  of the layout) and captures a small photo set of the current design, each downloadable individually or
  all at once (`src/components/ui/StorybookModal.tsx`).
- **Snapshot** — downloads a PNG of the current 3D view; also used as the thumbnail when saving a design.
- **Designs modal** — save/load/rename/delete named designs (with a live snapshot thumbnail) to
  `localStorage`, plus JSON export/import of the current design (`src/components/ui/DesignsModal.tsx`).
- **Quote modal** — a priced, category-grouped line-item table computed from what's actually placed
  (respecting mirrored table counts), with editable unit prices, service/tax percentages, CSV export, and
  a print/Save-as-PDF button (`src/components/ui/QuoteModal.tsx`).

## Deferred

Brass Lantern (a bespoke cocktail-menu design sub-app, unrelated to the venue-planning core) and the AR
viewer (needs WebXR and a real device/camera to test) are stubbed with a "coming soon" overlay from the
toolbar and were scoped out by design. Also deferred: My Uploads (a general-purpose upload gallery beyond
the venue photo), the rest of the ~277-item catalogue, drag-and-drop placement (click-to-place is
implemented instead), and the placement-zone/weather visualizations.

See `docs/design_handoff_event_studio/README.md` (the original handoff bundle) for the full original spec,
including the working HTML/three.js prototype and screenshots.
