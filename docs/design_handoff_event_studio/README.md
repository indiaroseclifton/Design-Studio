# Handoff: Event Scenes 3D Studio

## Overview
A browser-based 3D event design studio. Planners and couples pick a venue scene, choose a table layout and guest count, then drag décor from a catalogue onto tables, the floor or the ceiling. The studio includes:

- **Studio (main):** a 3D scene with Catalogue, Venue/Layout/View panels, an Inspector for the selected piece, and a venue strip.
- **Flower Studio:** a full-screen tool for building custom arrangements, which are saved to the catalogue.
- **Storybook:** a 3D page-turning book that tells the wedding day through 9 chapters, with music and 3D pop-ups.
- **Brass Lantern:** an embedded cocktail-bar menu module.
- **AR viewer:** shows the design, or a single piece, in the room through a phone or tablet camera (`model-viewer`).
- **Modals:** Designs (save/load), Quote (pricing plus CSV/PDF export), Add-ons (switchable catalogue packs) and Tweaks (mood, interface mode, accent colour).

## About the Design Files
The files in this bundle are **design references created in HTML**. They are working prototypes that show the intended look and behaviour; they are not production code to copy directly. The task is to **recreate these designs in the target codebase's existing environment** (e.g. React + react-three-fiber, Vue + TresJS, Svelte + Threlte) using its established patterns. If no environment exists yet, a good default is **React + TypeScript + three.js via @react-three/fiber + drei, with Zustand for state**.

The prototype is a single file (`Event Scenes.html`, about 2,100 lines, three.js r169 from a CDN). It's written for speed of iteration, not maintainability. Treat it as the spec for behaviour, 3D model proportions and visual styling.

## Fidelity
**High-fidelity** for the UI (colours, type, spacing and states are final) and for interaction behaviour.
The **3D models are procedural placeholders**, built from primitives in code (lathes, boxes, cylinders and instanced "petals" or "leaves"). Their proportions, colours and palette behaviour are intended. In production, replace them with authored GLB assets where quality matters (chairs, glassware, florals). Keep the same footprint and surface metadata for each item (see Data model).

Note: the attached design-system project is empty, so all tokens below come from the prototype itself.

---

## Screens / Views

### 1. Studio (main 3D view)
Full-viewport WebGL canvas (`#c`), with UI panels floating above it as frosted "glass" panels.

**Layout (desktop ≥1100px)**
- **Catalogue panel:** left side, fixed. `left:16px; top:16px; bottom:var(--hb,130px)`, 330px wide (290px at ≤1100px). Column flex, overflow hidden.
- **Top toolbar:** fixed at `top:16px`, centred in the gap between the panels (`left:calc(28px + var(--lw)); right:calc(28px + var(--rw)); width:max-content; margin-inline:auto`). Flex-wrap, gap 2px, padding 4px.
- **Right column:** `right:16px; top:16px`, 276px wide (250px at ≤1100px). Column of glass panels with a 10px gap, scrolls if too tall.
- **Venue strip:** bottom, `left/right/bottom:16px`. Horizontal scroll of venue cards (`flex:1 0 118px`).
- **Hint pill:** centred above the strip. **Toast:** centred 40px above the hint.

**Top toolbar buttons (in order)**
- ↶ Undo · ↷ Redo
- *(divider)*
- ✿ Flower Studio · Designs · Quote · Snapshot · Storybook · Brass Lantern · View in AR
- *(divider)*
- ＋ Add-ons

Toolbar button style: transparent background, radius 9px, padding 8px 12px, Jost 500 12.5px. Hover background `rgba(255,240,220,.1)`. Active/open state (`.on`): background `rgba(var(--acr),.18)`, colour `var(--ac)`. Divider: 1×18px, `rgba(255,240,220,.15)`, margin 0 4px.

**Catalogue panel**
- Header: "Catalogue" (Cormorant 28px) with a piece count (label style), and a "Flower Studio" button on the right.
- Search input. Placeholder: "Search — chiavari, arch, menorah, lace…"
- Category chips. Base tabs: Templates, Linens, Chairs, Florals, Tableware, Candles & light, Furniture & lighting, Structures, Wedding, Holiday, Faith & culture, Corporate, Parties & kids, Desserts, My uploads, My Flowers. Enabled add-on packs add extra chips with a dashed border in the accent colour.
- Palette row: horizontally scrolling palette pills plus an "Edit custom" link that opens a 7-swatch colour editor.
- Host bar (only shown when a piece with a surface is selected): "Decorating **{name}** — tap tabletop pieces, lanterns or small décor to set them on top." plus a **Done** link.
- Body: cards in a 2-column grid under section headings (`.sec`).

Card anatomy:
- 4:3 thumbnail. Each is a live three.js render, captured once and cached as a data URL.
- Name: Jost 500 12.5px.
- Optional note (small): 10.5px at 62% opacity.
- Optional tag: 9.5px uppercase, accent colour.

Card states:
- Hover: border `rgba(var(--acr),.5)`.
- Selected: accent border and `rgba(var(--acr),.1)` fill.
- Unavailable for the current layout: 32% opacity, not clickable.
- Can't be stacked while decorating a surface: 35% opacity.

**Right column panels**
1. **Venue:** index label, venue name (Cormorant 32px), subtitle (12px, accent) and description (12.5px, 80% opacity).
   - Time segmented control: Venue / Day / Golden / Night.
   - Weather segmented control: Clear / Rain / Snow. Indoor venues show a note instead: "Indoor venue — weather is outside."
2. **Layout:**
   - Segmented control: Round / Banquet / Ceremony / Empty.
   - Guests slider (1–160) with a live value.
   - Checkboxes: "Dress every table alike", "Snap to grid".
   - Primary button: "Set a place at every chair".
3. **View:**
   - Buttons: Plan view, Reset camera, Placement zone, Slow orbit, Motion on/off.
   - Camera chips: Wide, Guest's eye, Couple's view, Overhead.
   - Footer: piece count and a "Clear all" link.
4. **Inspector (only when something is selected):**
   - Kind label, name (Cormorant 22px) and × close.
   - Option chips (A/B variants), text input (e.g. sign text), "apply to all" checkbox, custom colour, palette recolour.
   - Action row (4 columns, 1 / 1 / 1.3 / 1.5): ↺, ↻, Copy, Remove.
   - "Edit in Flower Studio" (custom arrangements only).
   - Table rotate buttons, shown when a table is selected.
   - Multi-select actions: Line up, Circle, Face centre, Remove all.

**Venue strip card:** 34px swatch with a gradient from the venue's sky colours, a small caps label, and the name (Cormorant 16px). Selected: border `rgba(var(--acr),.7)`.

**Venues (15):** Rustic Barn, Tuscan Villa, Beach at Sunset, English Garden, Grand Ballroom, Glass Conservatory, Vineyard at Dusk, Enchanted Woodland, City Rooftop, Desert Oasis, Garden Marquee, French Château, Lakeside Dock, Industrial Loft, Your Venue (the user uploads a photo backdrop). Each venue defines sky/fog/ground colours, lighting rigs, architecture meshes, an indoor flag and a placement zone.

### 2. Flower Studio (`#fs`, full screen, z-index 20)
- Grid: `minmax(0,1fr) 380px`. At ≤860px it stacks: 42vh viewer on top, panel below.
- Background: `radial-gradient(ellipse at 40% 35%, #3a312a, #15120f 70%)`.
- The main top toolbar stays visible above the studio (z-index 25). The side panel and title start 72px down so they clear it.
- **Viewer:** orbiting canvas. The arrangement name is an editable input (Cormorant 40px, underline on hover/focus). Hint text: "Drag to turn · Scroll to zoom · Esc to close".
- **Side panel, top to bottom:**
  - Start from (preset chips).
  - Vessel chips, then Finish chips.
  - Shape chips.
  - Size slider (0.6–1.6).
  - Flowers: one row per stem type, each with:
    - a 52×64 thumbnail of a single cut stem, rendered in 3D;
    - the name and colour dot;
    - a colour swatch row;
    - a − n + stepper;
    - a × to remove.
  - "Add a flower" (2-column grid of thumbnails).
  - Greenery rows.
- **Sticky action bar:** Shuffle placement, Cancel, Save to catalogue, and **Save & place** (primary).
- A saved arrangement becomes a catalogue item under "My Flowers", persisted to `localStorage`.

### 3. Storybook (`#sb`, full screen, z-index 40, background `#0c0907`)
- A 3D book on its own canvas, with pages of 28 segments that bend when turned.
- **Intro card:** couple names and date inputs, then a "Begin" button.
- **Chapters (9):** Cover, Once upon a time, The Venue, The Ceremony, The Layout, The Tablescape, The Feast, The First Dance, Ever After.
- Venue, layout and table pages pull in the user's current design, with 3D pop-ups.
- **Navigation:** drag a page corner or click a page, or use the ‹ › buttons (44×44px), the chapter dots (active dot is 22px wide in the accent colour) or the arrow keys. Space toggles autoplay; Esc closes.
- Background music toggle; falling petals and dust.

### 4. Brass Lantern (`#bl`, z-index 22)
- Full-screen iframe of `modules/Brass Lantern.html`, a self-contained cocktail menu designer.
- The top toolbar stays visible; the iframe's top padding matches the toolbar's height plus 10px.
- Toggled by the toolbar button. Esc or any other toolbar button closes it.
- Its data is independent for now. In production it should share state with Quote and the Storybook's "The Feast" chapter.

### 5. AR viewer (`#ar`, z-index 45)
- The current scene (or the selected piece) is exported to GLB with `GLTFExporter` and shown in `<model-viewer ar ar-modes="webxr scene-viewer quick-look">`.
- Top-left: title "Your design, in your space" and a note about device support. Bottom bar: a Whole design / Selected piece toggle, a scale option, and a button to enter AR.

### 6. Modals (`#modal`, z-index 20, dimmed background `rgba(10,8,6,.55)`)
- Box: `min(780px,100%)`, background `rgba(28,23,18,.97)`, header title in Cormorant 30px.
- **Designs:** grid of saved designs (`minmax(210px,1fr)`), each with a 16:10 snapshot and Load/Rename/Delete. Also JSON import/export.
- **Quote:** a table grouped by category (heading rows in accent caps), with editable unit prices and quantities. Totals block: subtotal, service %, tax %, and the total in Cormorant 28px. CSV and PDF export.
- **Add-ons:** grid of pack cards (`minmax(230px,1fr)`), each with a checkbox, name and one-line description. Enabled cards get an accent border and a tinted fill.

### 7. Tweaks panel (`#tw`)
- 268px wide, bottom-right. Controls:
  - **Mood:** Natural / Film / Moody / Dreamy.
  - **Interface:** Studio / Focus / Cinematic.
  - **Accent:** Champagne / Rose / Sage / Silver.

---

## Interactions & Behavior

**Placing items**
- Drag a catalogue card into the scene (a ghost pill follows the cursor), or click the card to auto-place it.
- Each item has a `surf` value:
  - `table`: snaps to the tabletop, or to every table when "Dress every table alike" is on.
  - `floor`: raycast to the ground plane, clamped to the venue's placement zone.
  - `hang`: fixed ceiling height, with a wire drawn up to the ceiling.

**Stacking and decorating**
- An item with a `top` definition — `{h, r}` for round or `{h, w, d}` for rectangular — is a *host*.
- Selecting a host puts the catalogue into decorating mode: new pieces that can stack are placed on the host's top surface.
- Stackable means any `surf:'table'` item, plus `surf:'floor'` items with footprint ≤0.5m that aren't backdrops, dance floors, structures or stages.
- A child stores `on: hostId` and moves, rotates, copies and deletes with its host.
- Dragging a floor item off its host drops it back to the floor.

**Selection**
- Click to select, Shift-click to multi-select, Esc to deselect.
- Keys: Q/E rotate by 15°, D duplicates, Delete removes.
- Plan view switches to an orthographic top-down camera, where tables can be dragged.

**Undo and redo**
- Snapshot-based history of the design JSON. Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z or Ctrl+Y redoes.
- Toasts include an Undo link.

**Venue navigation**
- Click a strip card to change venue. The ArrowLeft/ArrowRight keys also change venue (`go(cur±1)`).
- ⚠ Suspected cause of a reported "venue changes unexpectedly" bug: arrow keys switch venue whenever focus isn't in a text field. In production, limit this to a focused strip or remove it.
- Venue change transition: fade overlay (`#fade`, 0.45s ease) → rebuild → fade in.

**Camera**
- OrbitControls with preset tweens: wide, guest's eye, couple's view, overhead.
- "Slow orbit" auto-rotates. "Motion off" (`body.nomo`) disables all transitions, particles and autoplay.

**Interface modes**
- **Focus:** panels drop to 18% opacity unless hovered.
- **Cinematic:** 8vh letterbox bars, panels hidden, strip kept.
- Neither applies while Flower Studio or Brass Lantern is open.

**Moods**
- Each mood applies a CSS filter on the canvas, plus exposure, bloom and vignette values:
  - Natural: no filter, exposure 1, bloom 1, vignette 0.
  - Film: `sepia(.2) saturate(1.12) contrast(1.06)`, exposure 1.05, bloom 1.2, vignette .45.
  - Moody: `saturate(.78) contrast(1.16) brightness(.9)`, exposure .82, bloom 1.35, vignette .75.
  - Dreamy: `saturate(1.06) brightness(1.07) contrast(.9)`, exposure 1.12, bloom 2.1, vignette .2.

**Weather**
- Rain and snow particle systems (outdoor venues only). Time of day changes the sky, sun and exposure.

**Responsive behaviour**
- ≤1180px: toolbar buttons get tighter padding.
- ≤1100px: side panels narrow and toolbar dividers hide.
- ≤860px: the catalogue becomes a toggleable drawer (the "Catalogue" button); the right column moves to the bottom-right at max 45vh.
- Height ≤760px: descriptions and hints are hidden, and category chips become one scrolling row.

**Transitions**
- Hover backgrounds: 0.15s.
- Panels fade: 0.35s.
- Toast: 0.25s opacity plus an 8px rise.
- Letterbox bars: 0.6s `cubic-bezier(.2,.8,.2,1)`.

## State Management
Suggested store shape (Zustand or similar):

```ts
type Item = { id: string; type: string; x: number; z: number; rot: number;
  pal?: string; opt?: {a?: string; b?: string; text?: string; color?: string};
  on?: string /* host item id */; t?: number /* table index */ };
type Design = { venue: number; time: 'venue'|'day'|'golden'|'night'; wx: 'clear'|'rain'|'snow';
  table: { layout: 'round'|'banquet'|'ceremony'|'none'; guests: number; mirror: boolean; linen; chair; rot };
  items: Item[]; palette: string; customPalette: string[] };
type App = { design: Design; history: Design[]; future: Design[]; selection: {k:'item'|'table'|'multi', ids:string[]}|null;
  packsOn: Set<string>; customFlowers: Arrangement[]; tweaks: {mood, ui, accent}; motion: boolean;
  overlays: { flowerStudio: boolean; storybook: boolean; bar: boolean; ar: boolean; modal: null|'designs'|'quote'|'addons' } };
```

- **Persisted today in `localStorage`:**
  - `vs2_designs`: saved designs.
  - `vs2_custom`: custom flowers and uploads.
  - `vs2_story`: storybook names and date.
  - Tweaks and add-on packs are persisted as well.
- **Needed on a backend:** named designs with share links, custom flowers inside exports and shares, uploaded GLBs and photos, and Brass Lantern menus linked to the Quote.
- Only one full-screen overlay may be open at a time. Opening any toolbar overlay closes Flower Studio or Brass Lantern first.

## Data model: catalogue item definition
Each of the ~277 items is declared like this:

```js
id: { name, cat, sec /* section heading */, group, surf: 'table'|'floor'|'hang',
      fp /* footprint radius m */, price, kw /* search keywords */, pal /* false = fixed colours */,
      top?: {h, r} | {h, w, d},   // makes it a host surface
      build(group, builder, palette) }
```

- `palette` is `{f: fabric, b: [bloom colours…]}`, taken from the active palette.
- Add-on packs register items under their own `cat` ids and only appear once enabled. The 14 packs are:
  - Tables & seating shapes; Tabletop builder
  - Bars, stations & cake; Lounges & rooms
  - Stage & AV; Event lighting
  - Florals & hanging work; Signage & escort displays
  - Production & content; Weather kit
  - Architecture; Floors & stages builder
  - Tent builder; Drapery & rigging

## Design Tokens

**Colours**
| Token | Value | Use |
|---|---|---|
| bg | `#15120f` | app background, fade overlay |
| storybook bg | `#0c0907` | |
| bar bg | `#0f0a07` | |
| text | `#f4ede2` | primary text |
| text on accent | `#221a10` | |
| glass | `rgba(22,18,14,.6)`, `backdrop-filter: blur(14px) saturate(1.2)` | panels |
| glass border | `1px solid rgba(255,240,220,.12)` | |
| hairline | `rgba(255,240,220,.08)` | card borders, dividers |
| hover | `rgba(255,240,220,.08–.1)` | |
| well | `rgba(0,0,0,.18–.28)` | inputs, cards, segmented control track |
| modal box | `rgba(28,23,18,.97)` | |
| thumb bg | `radial-gradient(circle at 50% 38%, #5a4d42, #2a241f 75%)` | |
| accent `--ac` / `--acr` / `--ac2` | Champagne `#f3d9a4` / `243,217,164` / `#f8e6c0` (default) | |
| | Rose `#f2bcc0` / `242,188,192` / `#f8d6d8` | |
| | Sage `#c9d9b2` / `201,217,178` / `#dde8cc` | |
| | Silver `#dfe4ec` / `223,228,236` / `#eef1f6` | |

**Typography**
- Display: **Cormorant Garamond** 500 (plus italic 500). Sizes 16 / 22 / 28 / 30 / 32 / 34 / 36 / 40px, line-height 1–1.1.
- UI: **Jost** 400/500. Body 12–13.5px.
- Label: 10.5px, `letter-spacing:.16em`, uppercase, 60% opacity.
- Tag: 9.5px, `.1em`, uppercase.

**Radius**
- 99px: chips, pills
- 14px: glass panels
- 10px: cards, pack cards
- 9px: inputs, segmented control track, toolbar buttons
- 7px: segmented control buttons, thumbnails
- 6px: swatches

**Spacing**
- Base gaps 2 / 3 / 4 / 6 / 8 / 10 / 12 / 16px.
- Panel padding 14px; screen inset 16px.

**Shadows**
- Ghost pill and table labels: `0 6px 20px rgba(0,0,0,.35)`, `0 2px 10px rgba(0,0,0,.3)`.

**Controls**
- Chip: `padding:5px 10px`, 11.5px, border `rgba(255,240,220,.14)`. On state: accent fill with dark text.
- Segmented control: 3px padding track; selected button has accent fill.
- Button `.btn`: 500 12px, `padding:8px 4px`, radius 7px, well background with a hairline border. `.btn.primary`: accent fill, `--ac2` on hover. Disabled: 35% opacity.
- Focus: input border becomes `rgba(var(--acr),.6)`.

## Assets
- **Fonts:** Google Fonts (Cormorant Garamond, Jost).
- **3D:** three.js r169 (CDN import map) with OrbitControls, GLTFExporter and post-processing bloom. `<model-viewer>` is used for AR.
- **Textures:** all procedural (canvas-generated linen, planks, tiles, bricks, kilim, sequin and so on). No image files.
- **Models:** all procedural (see Fidelity). Users can upload their own GLB files and venue photos.
- **Audio:** Storybook background music, generated or streamed in the prototype. License real music for production.

## Files
- `Event Scenes.html`: the entire prototype (CSS lines 9–242, markup 246–330, module script after that).
  - `SCENES` array: the 15 venue definitions.
  - `ITEMS` object: the catalogue.
  - `PACKS`: the add-on packs.
  - `FL` / `GR`: flower and greenery builders used by Flower Studio.
  - Storybook: the block under `// ---------- Storybook ----------`.
- `modules/Brass Lantern.html`: the self-contained cocktail menu module that is embedded as an iframe.

## Screenshots
In `screenshots/`: 01-studio, 02-flower-studio, 03-addons, 04-quote, 05-designs, 06-storybook-intro.
These show the UI chrome only. The 3D canvases (venue, flower viewer, book) and the Brass Lantern iframe capture blank, so open `Event Scenes.html` in a browser to see them rendered.

## Known issues / next steps
- Suspected cause of the unexpected venue switching: global ArrowLeft/Right handling (see Interactions).
- Custom flowers aren't included in exports or shared links.
- Brass Lantern data is isolated from the Quote and the Storybook.
- Wanted: a menu editor for "The Feast", PDF lookbooks with multi-angle snapshots, real GLB models, and a floor-plan view with guest counts.
