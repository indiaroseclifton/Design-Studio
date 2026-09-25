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

## Deploying

The repository is connected to Vercel (project `designstudio`). Every push to `main` deploys to
production, and every pull request gets its own preview deployment, linked from the PR by the Vercel bot.
It's a static Vite build (`npm run build` → `dist/`), so no extra configuration is needed.

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
- **Placing by hand** (`src/engine/placed.ts`, `src/components/studio3d/drag.tsx`):
  - Clicking a flower still adds stems that the recipe places automatically. Dragging it onto the
    arrangement instead places one bloom exactly where it's dropped, facing out from the heart of the
    arrangement. Greenery sprigs (except trailing ivy) can be dragged in by their picture.
  - Placed blooms can be picked up and dragged anywhere on the arrangement; the camera holds still while
    you do. Click one to select it (a ring shows which); Delete removes it.
  - A **Placed by hand** list gives each one a colour and a remove button. Colour stories recolour them
    too, and they count towards the stem total and price.
  - Changing the vessel or size moves placed blooms onto the new shape.
  - Mouse and pen drags start after a few pixels. On touch screens, press and hold a flower to pick it up,
    so the list still scrolls.
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

Flowers can be placed by hand on a cake too. Drag one from **Decorate** onto any tier, the board or the top
and it sits in the icing, facing out; placed blooms can be dragged around, recoloured or removed, and they
stay on their tier when tiers are resized or the stand changes. Clicking a flower still adds stems in the
chosen style (switching on a crescent if the cake had none).

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

### Planning studios: Stationery, Menu & Bar, Music, Attire

These open from **Studios** in the toolbar, alongside the Flower and Cake Studios. Each is saved on the
design, so saved designs, exports and share links carry it, and each feeds the others.

- **Stationery Studio** (`src/stationery/`, `src/components/stationery/`):
  - A whole paper suite: save-the-date, invitation, RSVP, details card, order of service, menu, bar menu,
    place cards, table numbers, welcome sign, seating chart, favour tags and thank-you cards.
  - 7 themes plus paper, foil, type pairing, ornament, edge and ink. Watercolour florals are painted in
    the design's palette, and accents are kept legible on every paper.
  - Wording comes from the couple's names, date and venue. The invitation writes the date and time out in
    words.
  - Views: a flat lay of the suite (envelope, silk ribbon, wax seal) or one piece at a time.
  - Print-ready PDFs (jsPDF, loaded on demand) at 300 dpi, with 3 mm bleed and crop marks, several to a
    sheet. Place cards print one per guest and table numbers one per table. There's also a PNG for
    sending digitally.
  - The scene's place cards, table numbers, menu stands, welcome easel and seating chart show the suite
    (`paperCard` / `textTex` in `src/engine/florals.ts`).
  - The Quote gains a Stationery section.
  - Typefaces are bundled with Fontsource (`src/fonts.ts`), so canvases and print files never fall back
    to system fonts.
- **Menu & Bar** (`src/menu/`, `src/components/menu/`):
  - Courses from 7 cuisine presets, fully editable, with dietary tags on each dish. "Guests choose"
    courses put meal choices on the RSVP card.
  - The bar: style, hours, welcome drink, toast and wines, plus up to six signature drinks from a
    library, or named after the couple.
  - A per-course dietary coverage check, the drinks order, and costs. Costs go into the Quote under
    Catering.
  - The stationery menu, the bar menu (with illustrated glasses) and the Storybook's Feast chapter all
    print from it.
- **Music** (`src/music/`, `src/components/music/`):
  - The day's moments, from guests arriving to the last song, timed from the ceremony.
  - A library of about 195 wedding songs, with approximate tempo and energy. Curation scores energy fit,
    genre and era preferences and must-plays, never repeats a song, and shapes the party with a warm-up,
    peaks and breathers.
  - Recommendations for each moment, beside the playlist: wedding favourites, songs matching your genres
    and eras, and songs like the ones you've pinned, each with its reason. One tap adds a song (a set
    grows to fit it) or picks it for a single-song moment.
  - Pin, remove, reshuffle and add your own songs, with a do-not-play list.
  - **Previews in the app** (`src/music/preview.ts`): ▶ plays a 30-second clip without leaving the studio,
    from Apple's public iTunes Search API (no account or key). A ring fills as it plays, one clip plays at
    a time, Space pauses and resumes, and a player bar under the playlist has the artwork, a seekable
    progress line and a link to the full track on Apple Music. Once previewed, a song's record label shows
    its album artwork. Lookups skip karaoke and cover versions, are cached, and fall back to JSONP if the
    browser refuses the direct request; when there's no preview, the bar links to a Spotify search.
  - A warm black-and-gold look: a glowing energy wave across the day (click it to open a moment), moment
    chips, and a track table with energy bars, tempo and start times. A little crowd dances along the floor
    under the wave (swaying, bobbing or jumping to the energy), and one-song moments spin on a turntable.
  - Exports: a DJ brief PDF and a playlist CSV for import tools.
  - The order of service names the ceremony music, and the Storybook names the first-dance song.
- **Attire & colour** (`src/attire/`, `src/components/attire/`):
  - The wedding party by role, each with garment, fabric and colour.
  - Palette-based schemes: matching, mismatched, ombré or neutrals.
  - A harmony check per outfit, plus a warning when an outfit would blend into the backdrop.
  - A fashion-illustration line-up beside a paint-chip colour story, downloadable as an image.

### Storybook, Brass Lantern and AR

All three open from the toolbar (Storybook directly; the others under **More**) and replace whatever
full-screen view was open.

- **Storybook** (`src/storybook/`, `src/components/overlays/StorybookOverlay.tsx`):
  - A 3D hardback on a candle-lit table, ported from the prototype. Its leaves curl as they turn: drag a
    corner, click a page, or use the arrows, chapter dots or arrow keys. Space plays or pauses; Esc closes.
  - It tells the design in nine chapters. Photographs are rendered from the studio's camera presets, and the
    text uses the venue, layout, linens and chairs. Pop-ups include the venue's silhouette and miniatures of
    the whole layout and of one table.
  - It has generative piano music with page-turn sounds; sound on or off is remembered.
  - The couple's names and date are remembered in `vs2_story`.
- **Brass Lantern:** the handoff's self-contained cocktail menu designer
  (`public/modules/brass-lantern.html`), shown full screen under the toolbar.
- **AR viewer** (`src/components/overlays/ArViewer.tsx`):
  - The tables and pieces, or just the selected pieces, are exported to GLB and shown in `<model-viewer>`.
    On phones, model-viewer hands off to WebXR, Scene Viewer or Quick Look.
  - Options: life-size or a 1:10 tabletop model.
  - model-viewer is loaded from jsDelivr on first use, as in the prototype. If it can't load, the `.glb`
    can still be downloaded.

### Minimising panels and full screen

- Each panel has a handle on its edge: the catalogue, the settings column and the venue strip. Clicking a
  handle slides that panel off screen, and the handle stays at the edge to bring it back. The toolbar
  re-centres over the space.
- In the Flower, Cake, Stationery, Menu, Music and Attire studios, the side panel minimises the same way,
  and the preview widens to fill the screen.
- **View** in the toolbar (under **More** on phones) lists each panel, with minimise or show all, and
  **Full screen**. It lights up while anything is minimised or full screen is on.
- Keys: **F** for full screen and **H** to hide or show the panels. In a studio, **H** toggles its side
  panel.
- Which panels are minimised is remembered between visits. Where the browser has no full-screen mode
  (iPhone Safari), **Full screen** minimises the panels instead.

### Phones, tablets and drag-and-drop

- **Screens up to 860px wide:**
  - The catalogue and the settings column become drawers, opened by **Catalogue** and **Venue** in the
    toolbar. Placing a piece closes the catalogue so you can see the result.
  - Selecting a piece opens the settings drawer with its inspector first.
  - The venue strip is compact, and less-used actions move under **More**.
- **Drag-and-drop:** catalogue cards can also be dragged onto the scene. A piece lands where it's dropped:
  on a stand that takes it, on the nearest table (for tabletop pieces), or on the floor. Clicking a card
  still places it automatically.
- Studios, overlays and modals are code-split and load the first time they're opened.

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
- **Scenery** (`src/engine/foliage.ts`):
  - Trees, hedges and shrubs are smooth, lumpy clumps with a leaf normal map, shaded darker underneath and
    in the creases, instead of faceted 20-sided balls.
  - Tree crowns have limbs and more, smaller clumps.
  - Rocks are smooth boulders, the lakeside pines have tiered drooping boughs, and hay bales are softened
    blocks of straw.
- **Timber:** long boards in closely related tones with fine grain, knots and bevelled edges, tiling
  seamlessly (barn walls, decks and dance floors).
- **Water:** rougher, less mirror-like sea and lake materials, so a low sun leaves a glitter path instead of
  a blown-out column.
- **Tabletop:**
  - Candle flames are additive teardrops with a hot core and a blue base, instead of solid glowing blobs.
    This applies to every candle, lantern and torch.
  - Folded napkins have a turned-back flap and a rose.
  - Hydrangeas are built from four-petal florets.
  - Lace overlays use alpha-to-coverage, so they don't shimmer.
- **Performance:** the catalogue's rose, peony and ranunculus heads bake from a coarser petal and stay
  indexed. A rose drops from 66,000 to 4,000 vertices, which also brings the AR export of a full table
  from about 200 MB to about 23 MB.
- **Render quality tweak:** High adds ambient occlusion, 8× MSAA and 4K shadows; Standard suits laptops
  and tablets.

## Deferred

- GLB uploads.
- The lookbook PDF.
- Brass Lantern menus linked to the Quote. The handoff notes that in production they should share state.

See `docs/design_handoff_event_studio/README.md` (the original handoff bundle) for the full original spec,
including the working HTML/three.js prototype and screenshots.
