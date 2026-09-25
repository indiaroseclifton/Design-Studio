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
- `@react-three/postprocessing` for bloom, vignette and ambient occlusion
- Tailwind CSS v4 for the glass-panel UI chrome

## Run it

```sh
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run lint      # oxlint
```

## What's implemented

### Everything in the prototype's Studio

- **15 venues** (`src/engine/venues.gen.ts`): every scene from the prototype, including **Your Venue**, which
  uses an uploaded photo as the backdrop. A 2:1 panorama wraps all the way round; a normal photo becomes a
  curved backdrop. The photo is kept in IndexedDB. Venues build from the same seeds as the prototype, so they
  lay out identically.
- **The full catalogue** (`src/engine/catalogue.gen.ts`): all 286 pieces, the 14 add-on packs (switched on from
  the Add-ons modal, each adding a catalogue tab), 21 templates, 16 tablecloths, 5 overlays, 10 chair styles
  and 4 kinds of chair décor. It also includes configurable "builder" pieces (place settings, tents, stages,
  walls, pipe-and-drape) whose options appear in the inspector.
- **The prototype's design model** (`src/lib/designOps.ts`):
  - Positioned tables that can be rotated and dragged in plan view.
  - Mirrored table pieces that share a `link`.
  - Host surfaces: select a cake table, bar or plinth and click pieces to set them on top.
  - Aisle- and centre-locked pieces, and one-of-a-kind runners.
  - "Set a place at every chair", templates, and the clamping rules that keep pieces on tables, out of the
    aisle and inside the room.
- **Scene interaction** (`src/components/Studio/Interaction.tsx`):
  - Click to select a piece; click a table or its chairs to edit them.
  - Drag pieces across tables and onto or off host surfaces.
  - Shift-click to multi-select, then drag the group, or line it up, circle it or face it to the centre.
  - Drag tables in plan view.
  - Snap to grid.
- **Inspector:**
  - Swap a piece for others in its group, optionally for every matching piece.
  - Builder options, editable text and per-piece palette.
  - For chairs: style, décor and décor colours. For tables: cloth, custom cloth colour, overlay and rotation.
- **Palettes:** the prototype's 7, plus a custom palette edited with colour pickers.
- **Time of day and weather**, **tweaks** (mood, interface mode, accent, render quality), **camera presets**
  framed on the layout, **plan view**, **Designs** (save/open/rename/delete, share link, JSON import/export,
  including files exported from the prototype), **Quote** (cloths, overlays, chair styles and décor priced as
  in the prototype, CSV and print/PDF), **Snapshot** and **autosave**.

### Flower Studio

Open it from the toolbar (**✿ Flower Studio**), the catalogue header, or **New arrangement** under My Flowers.
Its components are in `src/components/flower/` and its logic in `src/engine/flowers.ts`.

- **Realistic flowers** (`src/engine/botany.ts`):
  - Petals are thin parametric surfaces: a narrow claw base, widest past the middle, a rounded tip, cupped
    edges, a rolled-back tip and a slight ruffle. They're shaded from a deeper, green-tinged base to a light edge.
  - Leaves are blades with a petiole, a pointed tip, a folded midrib and an arch.
  - These replace the prototype's squashed spheres and flat-shaded blobs. Elongated foliage everywhere is
    upgraded automatically, including catalogue centrepieces, palms and ferns.
  - The catalogue's roses, peonies and ranunculus are baked from the same Flower Studio heads, so tables
    match the studio.
- **Viewer:** a soft fading studio surface with contact shadows, and key, rim and fill lighting. A toolbar has
  Shuffle, Front / ¾ / Top views, Turntable, and a light or dark backdrop.
- **Editor:**
  - Style / Flowers / Greenery tabs, with a sticky footer showing stems, estimated price and use, plus
    in-studio undo/redo (Ctrl+Z).
  - Recipes and vessels as rendered 3D cards, finish swatches, shape notes, and size in centimetres.
  - Compact stem rows with a colour popover (17 named colours or any colour; custom colours are labelled by
    their nearest named colour), and a recipe colour bar.
  - Vessel-aware stem-count advice, a one-click **colour story** from any event palette, and a searchable
    flower grid showing what's already in the recipe.
  - Cancel and Esc ask before discarding unsaved changes.
- **Saving:** Save to My Flowers or Save & place. A saved arrangement is a normal catalogue piece: it can be
  placed, dragged, stacked, quoted and re-edited via **✿ Edit in Flower Studio**. Arrangements persist in
  `localStorage` (`vs2_custom`) and are validated on load.
- **Travelling with designs:** exports, share links and saved designs embed the arrangements they use. The
  handoff lists this as a gap in the prototype.
- The main scene pauses rendering while the studio covers it.

### Cake Studio

Open it from the toolbar (**Cake Studio**), or from **New cake** under My Cakes or Desserts. The editor is in
`src/components/cake/CakeStudio.tsx`, and the cake model and geometry are in `src/engine/cakes.ts`. It shares a
3D stage with the Flower Studio (`src/components/studio3d/`).

- **Tiers:**
  - Up to 5 tiers, each round, square, hexagonal or heart-shaped.
  - Width is 8–40 cm and height 6–20 cm, set per tier.
  - Advice flags top-heavy or oversized stacks.
- **Stands:** a cake board, a wood slice, or a white, gold or glass pedestal.
- **Finishes:**
  - Smooth fondant, smooth or rough buttercream (palette-knife texture), semi-naked, ombré, marble, ruffles,
    quilted, comb stripes, and a ganache drip.
  - Each finish has its own procedural bump or colour map and an icing colour. Some also take an accent colour.
  - You can apply a finish to all tiers or to one tier.
- **Decoration:**
  - Borders: pearls, gold dragées, shell piping, or ribbon with a bow.
  - Fresh flowers from the Flower Studio's botanical heads, arranged as a crown, cascade, ledge crescents,
    scattered or around the base, with optional greenery.
  - Gold leaf, berries, macarons and sprinkles.
- **Toppers:** your own script words, Mr & Mrs, monogram initials, a heart or stars, cut out on picks.
  Each comes in gold, rose gold, silver, or white or black acrylic.
- **Presets:** 10 designs, rendered as live thumbnails.
- **Footer:** estimated servings, height and price, with undo/redo.
- **Saving:** Save to My Cakes or Save & place. A placed cake stacks onto a selected cake table. It re-opens
  with **Edit in Cake Studio**. Cakes persist in `localStorage` (`vs2_cakes`), and exports and share links
  carry them.

### Porting approach

`scripts/port-prototype.py` copies the prototype's item, pack, template, flower-engine and venue builders
verbatim into the two `*.gen.ts` modules, then applies a list of explicit, reviewable fixes for TypeScript.
Keeping the builders verbatim means they stay diffable against the handoff. Shared helpers (materials,
fabrics, chairs, tables and floral geometry) are hand-ported into typed modules in `src/engine/`.

The port surfaced one bug in the prototype, which is fixed in the script: City Rooftop cloned a material and
called texture methods on it, so that venue failed to build.

### Quality and realism upgrades over the prototype

- **Lighting:** a RoomEnvironment reflection map, so glass, china, silver and brass pick up highlights.
  Bloom and vignette follow the handoff's mood spec. Screen-space ambient occlusion (N8AO) gives contact
  shadows under plates, vases and chairs. Shadows use tuned bounds and bias.
- **Materials:** physically based glass with clearcoat, glazed china, velvet and linen with sheen, and flower
  petals with soft sheen.
- **Geometry:**
  - Lathe-turned plates and chargers with a real rim.
  - Shaped knife, fork and spoon.
  - Round tablecloths that fall to the floor in soft pleats, with a rolled edge.
  - Cupped rose, peony and ranunculus petals.
  - Chairs with rounded cushions, turned legs, stretchers and a woven rattan back.
- **Render quality tweak:** High adds ambient occlusion, 8× MSAA and 4K shadows; Standard suits laptops
  and tablets.

## Deferred

Storybook, Brass Lantern and the AR viewer still show a "coming soon" overlay. Also still to do:
drag-and-drop from the catalogue (click-to-place is implemented), GLB uploads, the lookbook PDF, and the
≤860px responsive drawer layout.

See `docs/design_handoff_event_studio/README.md` (the original handoff bundle) for the full original spec,
including the working HTML/three.js prototype and screenshots.
