import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FCOL, FL, I4, ITEMS, fc, frame } from './catalogue.gen';
import { Builder, registerKind, type Builder as BuilderT } from '../three/builder';
import { M, getSeedState, jit, lathe, mesh, noSh, pick, rnd, seed, setSeedState, shared } from '../three/utils';
import { T } from '../three/textures';

/*
 * The Cake Studio's model and 3D builder. A cake is a stack of tiers (round, square, hexagonal or heart),
 * each with a finish (fondant, buttercream, ruffles, semi-naked, drip, comb stripes, quilted, ombre,
 * marble, rough), borders, fresh flowers from the Flower Studio, extras, a topper and a stand.
 * All sizes in the model are centimetres; the builder works in metres.
 */

export type TierShape = 'round' | 'square' | 'hexagon' | 'heart';
export type Finish = 'fondant' | 'buttercream' | 'ruffles' | 'seminaked' | 'drip' | 'stripes' | 'quilted' | 'ombre' | 'marble' | 'rough';
export type Border = 'none' | 'pearls' | 'shell' | 'ribbon' | 'dragees';
export type FlowerStyle = 'none' | 'crown' | 'cascade' | 'crescent' | 'scatter' | 'base';
export type ToppperKind = 'none' | 'script' | 'mrmrs' | 'monogram' | 'heart' | 'stars';
export type StandKind = 'none' | 'board' | 'pedestal-white' | 'pedestal-gold' | 'wood' | 'glass';
export type MetalFinish = 'gold' | 'silver' | 'rosegold' | 'white' | 'black';

export interface Tier {
  shape: TierShape;
  /** diameter (or width) in cm */
  d: number;
  /** height in cm */
  h: number;
  finish: Finish;
  /** frosting / fondant colour */
  c: string;
  /** accent: drip, ombre base, marble veins, stripe colour */
  a: string;
  border: Border;
  /** border colour (pearls, piping, ribbon) */
  bc: string;
}

export interface CakeDesign {
  seed: number;
  /** bottom tier first */
  tiers: Tier[];
  stand: StandKind;
  flowers: { style: FlowerStyle; stems: Array<{ t: string; c: string; n: number }>; greenery: boolean };
  extras: { goldLeaf: boolean; berries: boolean; macarons: boolean; sprinkles: boolean };
  topper: { kind: ToppperKind; text: string; metal: MetalFinish };
}

export interface SavedCake extends CakeDesign {
  id: string;
  name: string;
}

/* ------------------------------------------------------------------ vocab */

export const SHAPES: Record<TierShape, string> = { round: 'Round', square: 'Square', hexagon: 'Hexagon', heart: 'Heart' };

export const FINISHES: Record<Finish, { n: string; note: string; accent?: string }> = {
  fondant: { n: 'Smooth fondant', note: 'Crisp, satin-smooth sugarpaste' },
  buttercream: { n: 'Smooth buttercream', note: 'Soft, spatula-smoothed icing' },
  ruffles: { n: 'Ruffles', note: 'Layered frills around the tier' },
  seminaked: { n: 'Semi-naked', note: 'Thin scrape showing the sponge' },
  drip: { n: 'Drip', note: 'Ganache running over the edge', accent: 'Drip colour' },
  stripes: { n: 'Comb stripes', note: 'Combed vertical ridges', accent: 'Stripe colour' },
  quilted: { n: 'Quilted', note: 'Diamond-quilted fondant' },
  ombre: { n: 'Ombré', note: 'Fades from the accent up to the colour', accent: 'Base colour' },
  marble: { n: 'Marble', note: 'Veined fondant', accent: 'Vein colour' },
  rough: { n: 'Rough buttercream', note: 'Rustic palette-knife texture' },
};

export const BORDERS: Record<Border, string> = { none: 'None', pearls: 'Pearls', shell: 'Shell piping', ribbon: 'Ribbon & bow', dragees: 'Gold dragées' };

export const FLOWER_STYLES: Record<FlowerStyle, { n: string; note: string }> = {
  none: { n: 'No flowers', note: '' },
  crown: { n: 'Crown', note: 'A cluster on the top tier' },
  cascade: { n: 'Cascade', note: 'Tumbling down the front' },
  crescent: { n: 'Crescent', note: 'Arcs on each tier ledge' },
  scatter: { n: 'Scattered', note: 'Single blooms dotted around' },
  base: { n: 'Base ring', note: 'A ring around the bottom' },
};

export const TOPPERS: Record<ToppperKind, string> = { none: 'None', script: 'Script words', mrmrs: 'Mr & Mrs', monogram: 'Monogram', heart: 'Heart', stars: 'Stars' };
export const METALS: Record<MetalFinish, { n: string; c: string; m: number; r: number }> = {
  gold: { n: 'Gold', c: '#d4af37', m: 1, r: 0.22 },
  silver: { n: 'Silver', c: '#d9dbde', m: 1, r: 0.2 },
  rosegold: { n: 'Rose gold', c: '#e3a88f', m: 1, r: 0.24 },
  white: { n: 'White acrylic', c: '#fbfaf6', m: 0, r: 0.3 },
  black: { n: 'Black acrylic', c: '#1c1b1d', m: 0, r: 0.25 },
};

export const STANDS: Record<StandKind, string> = {
  none: 'No stand',
  board: 'Cake board',
  'pedestal-white': 'White pedestal',
  'pedestal-gold': 'Gold pedestal',
  wood: 'Wood slice',
  glass: 'Glass stand',
};

/** Icing colours that read as real frosting (softer than the florist palette). */
export const CAKE_COLOURS: Record<string, [string, string]> = {
  white: ['White', '#fbf9f4'],
  ivory: ['Ivory', '#f4ecd8'],
  champagne: ['Champagne', '#eadbbd'],
  blush: ['Blush', '#f3d3cf'],
  rose: ['Dusty rose', '#d9a3a6'],
  peach: ['Peach', '#f6cdb0'],
  butter: ['Butter', '#f5e6a8'],
  sage: ['Sage', '#b9c8ad'],
  mint: ['Mint', '#cfe6d8'],
  blue: ['Dusty blue', '#a9bdd1'],
  lavender: ['Lavender', '#cbbfe0'],
  terracotta: ['Terracotta', '#c9744f'],
  burgundy: ['Burgundy', '#6e1f2c'],
  caramel: ['Caramel', '#b9783c'],
  chocolate: ['Chocolate', '#4a2c20'],
  darkchoc: ['Dark chocolate', '#2e1a12'],
  black: ['Black', '#1d1b1c'],
  gold: ['Gold', '#d4af37'],
};
export const cakeHex = (c: string) => CAKE_COLOURS[c]?.[1] ?? (/^#[0-9a-f]{6}$/i.test(c) ? c : '#fbf9f4');

/* ------------------------------------------------------------------ presets */

const tier = (shape: TierShape, d: number, h: number, finish: Finish, c: string, a: string, border: Border, bc = 'white'): Tier => ({ shape, d, h, finish, c, a, border, bc });
const NO_EXTRAS = { goldLeaf: false, berries: false, macarons: false, sprinkles: false };
const NO_TOPPER = { kind: 'none' as ToppperKind, text: '', metal: 'gold' as MetalFinish };

export const CAKE_PRESETS: Array<Omit<CakeDesign, 'seed'> & { name: string; note: string }> = [
  {
    name: 'Classic elegance',
    note: 'White fondant, pearls, ivory roses',
    tiers: [tier('round', 30, 12, 'fondant', 'white', 'gold', 'pearls', 'white'), tier('round', 23, 12, 'fondant', 'white', 'gold', 'pearls', 'white'), tier('round', 16, 11, 'fondant', 'white', 'gold', 'pearls', 'white')],
    stand: 'pedestal-white',
    flowers: { style: 'crescent', stems: [{ t: 'rose', c: 'ivory', n: 7 }, { t: 'peony', c: 'blush', n: 3 }, { t: 'spray', c: 'white', n: 5 }], greenery: true },
    extras: NO_EXTRAS,
    topper: NO_TOPPER,
  },
  {
    name: 'Rustic semi-naked',
    note: 'Sponge showing, berries, wood slice',
    tiers: [tier('round', 26, 13, 'seminaked', 'ivory', 'ivory', 'none'), tier('round', 20, 13, 'seminaked', 'ivory', 'ivory', 'none'), tier('round', 14, 12, 'seminaked', 'ivory', 'ivory', 'none')],
    stand: 'wood',
    flowers: { style: 'cascade', stems: [{ t: 'rose', c: 'blush', n: 6 }, { t: 'ranunculus', c: 'peach', n: 4 }, { t: 'babys', c: 'white', n: 4 }], greenery: true },
    extras: { ...NO_EXTRAS, berries: true },
    topper: { kind: 'mrmrs', text: '', metal: 'gold' },
  },
  {
    name: 'Blush ruffles',
    note: 'Frilled tiers with a flower crown',
    tiers: [tier('round', 26, 14, 'ruffles', 'blush', 'blush', 'none'), tier('round', 19, 13, 'ruffles', 'blush', 'blush', 'none'), tier('round', 13, 12, 'ruffles', 'blush', 'blush', 'none')],
    stand: 'board',
    flowers: { style: 'crown', stems: [{ t: 'peony', c: 'blush', n: 3 }, { t: 'rose', c: 'white', n: 4 }, { t: 'spray', c: 'pink', n: 4 }], greenery: true },
    extras: NO_EXTRAS,
    topper: NO_TOPPER,
  },
  {
    name: 'Modern drip',
    note: 'Chocolate drip, macarons, sprinkles',
    tiers: [tier('round', 20, 15, 'drip', 'white', 'darkchoc', 'none'), tier('round', 15, 13, 'drip', 'blush', 'darkchoc', 'none')],
    stand: 'pedestal-gold',
    flowers: { style: 'crown', stems: [{ t: 'rose', c: 'blush', n: 3 }], greenery: false },
    extras: { ...NO_EXTRAS, macarons: true, sprinkles: true },
    topper: NO_TOPPER,
  },
  {
    name: 'Gold leaf hexagon',
    note: 'Ivory hexagons, gold leaf band',
    tiers: [tier('hexagon', 30, 12, 'fondant', 'ivory', 'gold', 'dragees', 'gold'), tier('hexagon', 23, 13, 'fondant', 'ivory', 'gold', 'dragees', 'gold'), tier('hexagon', 16, 11, 'fondant', 'ivory', 'gold', 'dragees', 'gold')],
    stand: 'pedestal-gold',
    flowers: { style: 'crescent', stems: [{ t: 'rose', c: 'burgundy', n: 4 }, { t: 'dahlia', c: 'coral', n: 2 }], greenery: true },
    extras: { ...NO_EXTRAS, goldLeaf: true },
    topper: NO_TOPPER,
  },
  {
    name: 'Marble & monogram',
    note: 'Square marble tiers, gold ribbon',
    tiers: [tier('square', 25, 13, 'marble', 'white', 'black', 'ribbon', 'gold'), tier('square', 18, 12, 'marble', 'white', 'black', 'ribbon', 'gold')],
    stand: 'board',
    flowers: { style: 'none', stems: [], greenery: false },
    extras: NO_EXTRAS,
    topper: { kind: 'monogram', text: 'A&J', metal: 'gold' },
  },
  {
    name: 'Lavender ombré',
    note: 'Four tiers fading to white',
    tiers: [
      tier('round', 30, 12, 'ombre', 'white', 'lavender', 'shell', 'white'),
      tier('round', 24, 12, 'ombre', 'white', 'lavender', 'shell', 'white'),
      tier('round', 18, 11, 'ombre', 'white', 'lavender', 'shell', 'white'),
      tier('round', 12, 10, 'ombre', 'white', 'lavender', 'shell', 'white'),
    ],
    stand: 'glass',
    flowers: { style: 'scatter', stems: [{ t: 'lavender', c: 'purple', n: 5 }, { t: 'rose', c: 'white', n: 5 }], greenery: false },
    extras: NO_EXTRAS,
    topper: NO_TOPPER,
  },
  {
    name: 'Sweetheart',
    note: 'A single heart with a gold topper',
    tiers: [tier('heart', 26, 10, 'buttercream', 'rose', 'blush', 'pearls', 'white')],
    stand: 'board',
    flowers: { style: 'base', stems: [{ t: 'rose', c: 'red', n: 8 }], greenery: true },
    extras: NO_EXTRAS,
    topper: { kind: 'heart', text: '', metal: 'rosegold' },
  },
  {
    name: 'Birthday stripes',
    note: 'Combed pastel stripes and sprinkles',
    tiers: [tier('round', 22, 14, 'stripes', 'mint', 'peach', 'none'), tier('round', 15, 12, 'stripes', 'mint', 'peach', 'none')],
    stand: 'pedestal-white',
    flowers: { style: 'none', stems: [], greenery: false },
    extras: { ...NO_EXTRAS, sprinkles: true },
    topper: { kind: 'script', text: 'Happy Birthday', metal: 'gold' },
  },
  {
    name: 'Chocolate ganache',
    note: 'Rough buttercream, caramel drip',
    tiers: [tier('round', 25, 13, 'rough', 'chocolate', 'caramel', 'none'), tier('round', 19, 13, 'drip', 'chocolate', 'caramel', 'none'), tier('round', 13, 12, 'rough', 'chocolate', 'caramel', 'none')],
    stand: 'wood',
    flowers: { style: 'crown', stems: [{ t: 'rose', c: 'burgundy', n: 3 }], greenery: true },
    extras: { ...NO_EXTRAS, berries: true },
    topper: NO_TOPPER,
  },
];

export const MAX_TIERS = 5;
export const TIER_D: [number, number] = [8, 40];
export const TIER_H: [number, number] = [6, 20];

/** A sensible next tier on top: about 6–7 cm narrower and a touch shorter, same shape and finish. */
export function suggestTier(below: Tier): Tier {
  return { ...below, d: Math.max(TIER_D[0], Math.round((below.d - 6.5) * 2) / 2), h: Math.max(TIER_H[0], below.h - 0.5) };
}

/* ------------------------------------------------------------------ guidance */

/** Wedding-portion servings (2.5 × 5 cm fingers at a 10 cm tier height), the way bakers quote. */
export function servings(c: Pick<CakeDesign, 'tiers'>) {
  return Math.round(
    c.tiers.reduce((sum, t) => {
      const r = t.d / 2;
      const area = t.shape === 'round' ? Math.PI * r * r : t.shape === 'square' ? t.d * t.d : t.shape === 'hexagon' ? 2.598 * r * r : 0.78 * t.d * t.d;
      return sum + (area / 12.5) * (t.h / 10);
    }, 0),
  );
}

export const cakeHeightCm = (c: CakeDesign) => Math.round(c.tiers.reduce((a, t) => a + t.h, 0) + STAND_H[c.stand] * 100);

export function cakePrice(c: CakeDesign) {
  let p = servings(c) * 5.5;
  for (const t of c.tiers) {
    if (t.finish === 'drip') p += 15;
    if (t.finish === 'ruffles' || t.finish === 'quilted') p += 20;
    if (t.finish === 'marble' || t.finish === 'ombre') p += 12;
    if (t.border !== 'none') p += 6;
  }
  p += c.flowers.style === 'none' ? 0 : c.flowers.stems.reduce((a, s) => a + s.n * 3, 0);
  if (c.extras.goldLeaf) p += 25;
  if (c.extras.berries) p += 18;
  if (c.extras.macarons) p += 20;
  if (c.extras.sprinkles) p += 6;
  if (c.topper.kind !== 'none') p += 30;
  return Math.round(p);
}

/** Advice for proportions that bakers would push back on. */
export function cakeAdvice(c: CakeDesign): string | null {
  for (let i = 1; i < c.tiers.length; i++) {
    const lo = c.tiers[i - 1],
      hi = c.tiers[i];
    if (hi.d >= lo.d) return `Tier ${i + 1} is as wide as the one below — upper tiers are usually 5–8 cm narrower.`;
    if (lo.d - hi.d < 4) return `Tiers ${i} and ${i + 1} are very close in size; a 5–8 cm step reads better.`;
  }
  if (c.tiers.length >= 4 && c.stand === 'glass') return 'Four or more tiers are heavy for a glass stand — a board or pedestal is safer.';
  return null;
}

/* ------------------------------------------------------------------ validation & storage */

const oneOf = <K extends string>(v: unknown, table: Record<K, unknown>, d: K): K => (typeof v === 'string' && v in table ? (v as K) : d);
const colour = (v: unknown, d: string) => (typeof v === 'string' && (v in CAKE_COLOURS || v in FCOL || /^#[0-9a-f]{6}$/i.test(v)) ? v : d);
const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

/** Coerce untrusted cake data (localStorage, an imported design) into a safe, buildable cake. */
export function sanitizeCake(raw: unknown): SavedCake | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || !/^[\w-]{1,40}$/.test(o.id)) return null;
  const tiers = (Array.isArray(o.tiers) ? o.tiers : [])
    .slice(0, MAX_TIERS)
    .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
    .map((t) => ({
      shape: oneOf(t.shape, SHAPES, 'round'),
      d: num(t.d, TIER_D[0], TIER_D[1], 20),
      h: num(t.h, TIER_H[0], TIER_H[1], 12),
      finish: oneOf(t.finish, FINISHES, 'fondant'),
      c: colour(t.c, 'white'),
      a: colour(t.a, 'gold'),
      border: oneOf(t.border, BORDERS, 'none'),
      bc: colour(t.bc, 'white'),
    }));
  if (!tiers.length) return null;
  const f = (o.flowers ?? {}) as Record<string, unknown>;
  const x = (o.extras ?? {}) as Record<string, unknown>;
  const tp = (o.topper ?? {}) as Record<string, unknown>;
  return {
    id: o.id,
    name: typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 60) : 'Untitled cake',
    seed: Math.floor(num(o.seed, 0, 1e9, 7)),
    tiers,
    stand: oneOf(o.stand, STANDS, 'board'),
    flowers: {
      style: oneOf(f.style, FLOWER_STYLES, 'none'),
      stems: (Array.isArray(f.stems) ? f.stems : [])
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object' && typeof (s as Record<string, unknown>).t === 'string' && ((s as Record<string, unknown>).t as string) in FL)
        .slice(0, 8)
        .map((s) => ({ t: s.t as string, c: colour(s.c, FL[s.t as string].c), n: Math.round(num(s.n, 1, 20, 3)) })),
      greenery: f.greenery !== false,
    },
    extras: { goldLeaf: x.goldLeaf === true, berries: x.berries === true, macarons: x.macarons === true, sprinkles: x.sprinkles === true },
    topper: { kind: oneOf(tp.kind, TOPPERS, 'none'), text: typeof tp.text === 'string' ? tp.text.slice(0, 24) : '', metal: oneOf(tp.metal, METALS, 'gold') },
  };
}

const LS_KEY = 'vs2_cakes';
export const cakeKey = (id: string) => `cake_${id}`;
export const cakeIdOf = (type: string) => (type.startsWith('cake_') ? type.slice(5) : null);

export function loadCakes(): SavedCake[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    return Array.isArray(raw) ? raw.map(sanitizeCake).filter((x): x is SavedCake => !!x) : [];
  } catch {
    return [];
  }
}
export function saveCakeList(list: SavedCake[]): boolean {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** Add (or refresh) a saved cake as a catalogue piece under "My Cakes". */
export function registerCake(c: SavedCake) {
  const base = c.tiers[0];
  const standR = c.stand === 'none' ? 0 : c.stand === 'wood' ? 5 : 3;
  ITEMS[cakeKey(c.id)] = {
    name: c.name,
    cat: 'mycakes',
    sec: c.tiers.length > 1 ? `${c.tiers.length}-tier cakes` : 'Single-tier cakes',
    group: 'cake',
    surf: 'table',
    fp: Math.min(0.6, (base.d / 2 + standR) / 100),
    pal: false,
    kw: `my cakes custom cake ${c.tiers.map((t) => FINISHES[t.finish].n).join(' ')} ${c.topper.text}`,
    price: cakePrice(c),
    build(g) {
      buildCake(g, c);
    },
  };
}

export function importCakes(raw: unknown): number {
  if (!Array.isArray(raw)) return 0;
  const list = loadCakes();
  let n = 0;
  for (const c of raw.map(sanitizeCake)) {
    if (!c || list.some((x) => x.id === c.id)) continue;
    list.push(c);
    registerCake(c);
    n++;
  }
  if (n) saveCakeList(list);
  return n;
}

export function cakesIn(types: Iterable<string>): SavedCake[] {
  const ids = new Set([...types].map(cakeIdOf).filter((x): x is string => !!x));
  return loadCakes().filter((c) => ids.has(c.id));
}

/* ------------------------------------------------------------------ materials & textures */

const texCache = new Map<string, THREE.Texture>();
function cachedTex(key: string, draw: (x: CanvasRenderingContext2D, w: number, h: number) => void, rep: [number, number] = [1, 1], size = 512) {
  const hit = texCache.get(key);
  if (hit) return hit;
  const keep = getSeedState();
  seed(key.length * 7919 + 13);
  const t = shared(T(draw, rep, size));
  setSeedState(keep);
  texCache.set(key, t);
  return t;
}

const hexToRgb = (h: string) => new THREE.Color(h);

/** Horizontal spatula strokes, as a bump map (grey = flat). */
const spatulaBump = () =>
  cachedTex('bump:spatula', (x, w, h) => {
    x.fillStyle = '#808080';
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const y = rnd() * h;
      x.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.14)';
      x.lineWidth = 2 + rnd() * 6;
      x.beginPath();
      x.moveTo(0, y);
      x.bezierCurveTo(w * 0.3, y + (rnd() - 0.5) * 6, w * 0.7, y + (rnd() - 0.5) * 6, w, y + (rnd() - 0.5) * 4);
      x.stroke();
    }
  });

/** Palette-knife swipes for rough buttercream. */
const roughBump = () =>
  cachedTex(
    'bump:rough',
    (x, w, h) => {
      x.fillStyle = '#808080';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        const cx = rnd() * w,
          cy = rnd() * h,
          len = 30 + rnd() * 80,
          a = (rnd() - 0.5) * 0.9;
        const g = x.createLinearGradient(cx, cy - 8, cx, cy + 8);
        g.addColorStop(0, 'rgba(255,255,255,.35)');
        g.addColorStop(1, 'rgba(0,0,0,.3)');
        x.fillStyle = g;
        x.save();
        x.translate(cx, cy);
        x.rotate(a);
        x.beginPath();
        x.ellipse(0, 0, len, 5 + rnd() * 7, 0, 0, Math.PI * 2);
        x.fill();
        x.restore();
      }
    },
    [2, 1],
  );

/** Combed vertical ridges; the map paints alternate stripes in the accent colour. */
const combBump = () =>
  cachedTex('bump:comb', (x, w, h) => {
    const n = 48;
    for (let i = 0; i < n; i++) {
      const g = x.createLinearGradient((i * w) / n, 0, ((i + 1) * w) / n, 0);
      g.addColorStop(0, '#3a3a3a');
      g.addColorStop(0.5, '#e0e0e0');
      g.addColorStop(1, '#3a3a3a');
      x.fillStyle = g;
      x.fillRect((i * w) / n, 0, w / n + 1, h);
    }
  });

/** Diamond quilting: stitched grooves with a raised pillow in between. */
const quiltBump = () =>
  cachedTex('bump:quilt', (x, w, h) => {
    x.fillStyle = '#9a9a9a';
    x.fillRect(0, 0, w, h);
    const n = 8;
    x.strokeStyle = '#2a2a2a';
    x.lineWidth = 5;
    for (let i = -n; i <= n * 2; i++) {
      x.beginPath();
      x.moveTo((i * w) / n, 0);
      x.lineTo((i * w) / n + h, h);
      x.stroke();
      x.beginPath();
      x.moveTo((i * w) / n, 0);
      x.lineTo((i * w) / n - h, h);
      x.stroke();
    }
  });

/** Semi-naked: sponge layers with jam/cream fillings, thinly scraped with frosting that thickens toward the top. */
function semiNakedMap(frost: string, jam: string) {
  return cachedTex(`map:seminaked:${frost}:${jam}`, (x, w, h) => {
    const sponge = '#d6a466';
    x.fillStyle = sponge;
    x.fillRect(0, 0, w, h);
    // Crumb.
    for (let i = 0; i < 9000; i++) {
      x.fillStyle = rnd() < 0.5 ? 'rgba(120,70,20,.22)' : 'rgba(255,230,180,.22)';
      x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2);
    }
    // Filling lines between three layers (v = 0 is the bottom of the tier, the top of the canvas is v = 1).
    for (const f of [0.34, 0.67]) {
      const y = h * (1 - f);
      x.fillStyle = frost;
      x.fillRect(0, y - 6, w, 12);
      x.fillStyle = jam;
      x.globalAlpha = 0.55;
      x.fillRect(0, y - 2, w, 4);
      x.globalAlpha = 1;
    }
    // Frosting scraped thin in streaks, heavier near the top edge.
    for (let i = 0; i < 700; i++) {
      const y = rnd() * h,
        top = 1 - y / h;
      const cover = 0.25 + top * 0.55;
      x.globalAlpha = Math.min(0.95, cover * (0.4 + rnd() * 0.6));
      x.fillStyle = frost;
      x.fillRect(rnd() * w - 40, y, 30 + rnd() * 140, 2 + rnd() * 6);
    }
    x.globalAlpha = 1;
    x.fillStyle = frost;
    x.fillRect(0, 0, w, h * 0.04);
  });
}

function ombreMap(top: string, base: string) {
  return cachedTex(`map:ombre:${top}:${base}`, (x, w, h) => {
    // Banded like a real palette-knife ombré, with soft blending between bands.
    const g = x.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, base);
    g.addColorStop(1, top);
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    const bands = 5;
    for (let b = 0; b < bands; b++) {
      const c = hexToRgb(base).lerp(hexToRgb(top), b / (bands - 1));
      x.fillStyle = '#' + c.getHexString();
      x.globalAlpha = 0.55;
      x.fillRect(0, h - ((b + 1) * h) / bands, w, h / bands);
    }
    x.globalAlpha = 1;
  });
}

function marbleMap(base: string, vein: string) {
  return cachedTex(`map:marble:${base}:${vein}`, (x, w, h) => {
    x.fillStyle = base;
    x.fillRect(0, 0, w, h);
    for (let k = 0; k < 14; k++) {
      let px = rnd() * w,
        py = rnd() * h;
      x.strokeStyle = vein;
      x.globalAlpha = 0.18 + rnd() * 0.45;
      x.lineWidth = 0.6 + rnd() * 2.4;
      x.beginPath();
      x.moveTo(px, py);
      for (let s = 0; s < 22; s++) {
        px += (rnd() - 0.3) * 38;
        py += (rnd() - 0.5) * 30;
        x.lineTo(px, py);
      }
      x.stroke();
    }
    x.globalAlpha = 1;
  });
}

function stripeMap(base: string, stripe: string) {
  return cachedTex(`map:stripes:${base}:${stripe}`, (x, w, h) => {
    const n = 48;
    for (let i = 0; i < n; i++) {
      x.fillStyle = i % 4 === 1 ? stripe : base;
      x.fillRect((i * w) / n, 0, w / n + 1, h);
    }
  });
}

/** Frosting material for a finish. Maps are laid out so v = 0 is the bottom of the tier's side and v = 1 its top. */
function frostingMaterial(t: Tier): THREE.MeshPhysicalMaterial {
  const c = cakeHex(t.c),
    a = cakeHex(t.a);
  const base = { color: c, roughness: 0.72, sheen: 0.25, sheenRoughness: 0.8, sheenColor: new THREE.Color('#ffffff') };
  switch (t.finish) {
    case 'fondant':
      return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.42, clearcoat: 0.12, clearcoatRoughness: 0.5, sheen: 0.35 });
    case 'buttercream':
    case 'drip':
      return new THREE.MeshPhysicalMaterial({ ...base, bumpMap: spatulaBump(), bumpScale: 0.6 });
    case 'ruffles':
      return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.66, sheen: 0.4 });
    case 'rough':
      return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.62, bumpMap: roughBump(), bumpScale: 1.4 });
    case 'seminaked':
      return new THREE.MeshPhysicalMaterial({ ...base, color: '#ffffff', map: semiNakedMap(c, '#b8324a'), roughness: 0.82 });
    case 'stripes':
      return new THREE.MeshPhysicalMaterial({ ...base, color: '#ffffff', map: stripeMap(c, a), bumpMap: combBump(), bumpScale: 1.2 });
    case 'quilted':
      return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.45, clearcoat: 0.1, bumpMap: quiltBump(), bumpScale: 1.5 });
    case 'ombre':
      return new THREE.MeshPhysicalMaterial({ ...base, color: '#ffffff', map: ombreMap(c, a), bumpMap: spatulaBump(), bumpScale: 0.5 });
    case 'marble':
      return new THREE.MeshPhysicalMaterial({ ...base, color: '#ffffff', map: marbleMap(c, a), roughness: 0.35, clearcoat: 0.2 });
  }
}

const metalMat = (k: MetalFinish) => {
  const m = METALS[k];
  return new THREE.MeshPhysicalMaterial({ color: m.c, metalness: m.m, roughness: m.r, clearcoat: m.m ? 0 : 1, side: THREE.DoubleSide });
};

registerKind('pearl', () => [new THREE.SphereGeometry(1, 14, 10), new THREE.MeshPhysicalMaterial({ color: '#fff', roughness: 0.18, clearcoat: 1, iridescence: 0.7, iridescenceIOR: 1.6 })]);
registerKind('dragee', () => [new THREE.SphereGeometry(1, 12, 8), M('#fff', 0.2, 1)]);
registerKind('goldflake', () => [new THREE.CircleGeometry(1, 5), new THREE.MeshStandardMaterial({ color: '#fff', metalness: 1, roughness: 0.3, side: THREE.DoubleSide })]);
registerKind('shell', () => {
  // A piped shell: a teardrop swirl lying along +z.
  const g = lathe([[0, -1], [0.55, -0.7], [0.8, -0.2], [0.65, 0.3], [0.35, 0.7], [0, 1]], 12);
  g.rotateX(Math.PI / 2);
  return [g, new THREE.MeshPhysicalMaterial({ color: '#fff', roughness: 0.7, sheen: 0.3 })];
});
registerKind('glossball', () => [new THREE.SphereGeometry(1, 12, 8), new THREE.MeshPhysicalMaterial({ color: '#fff', roughness: 0.25, clearcoat: 0.6 })]);

/* ------------------------------------------------------------------ geometry */

interface TierGeo {
  y0: number;
  h: number;
  r: number;
  /** outline samples [x, z, nx, nz] around the side, evenly spaced */
  ring: Array<[number, number, number, number]>;
  tier: Tier;
}

/** Closed outline of a tier's footprint, as [x, z] points; `r` is half the tier's diameter. */
function outline(shape: TierShape, r: number, n = 160): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  if (shape === 'round') for (let i = 0; i < n; i++) pts.push([Math.sin((i / n) * Math.PI * 2) * r, Math.cos((i / n) * Math.PI * 2) * r]);
  else if (shape === 'square') {
    const cr = r * 0.08,
      s = r - cr;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      // Rounded square as a superellipse: flat sides, softly rounded corners.
      const p = 10;
      const c = Math.cos(a),
        sn = Math.sin(a);
      const k = 1 / Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(sn), p), 1 / p);
      pts.push([sn * k * (s + cr * 0.6), c * k * (s + cr * 0.6)]);
    }
  } else if (shape === 'hexagon') {
    const corners = Array.from({ length: 6 }, (_, k) => [Math.sin((k / 6) * Math.PI * 2) * r, Math.cos((k / 6) * Math.PI * 2) * r]);
    for (let i = 0; i < n; i++) {
      const f = (i / n) * 6,
        k = Math.floor(f),
        t = f - k;
      const A = corners[k],
        B = corners[(k + 1) % 6];
      pts.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
    }
  } else {
    // Heart: classic parametric curve, point toward the front (+z), lobes at the back.
    const raw: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      raw.push([x, -y]);
    }
    const ext = Math.max(...raw.map(([x, z]) => Math.max(Math.abs(x), Math.abs(z + 2.5))));
    for (const [x, z] of raw) pts.push([(x / ext) * r, ((z + 2.5) / ext) * r]);
  }
  return pts;
}

/** Resample a closed outline to `n` evenly spaced points with outward normals. */
function ringOf(pts: Array<[number, number]>, n: number, grow = 0): Array<[number, number, number, number]> {
  const seg: number[] = [0];
  for (let i = 1; i <= pts.length; i++) {
    const [ax, az] = pts[i - 1],
      [bx, bz] = pts[i % pts.length];
    seg.push(seg[i - 1] + Math.hypot(bx - ax, bz - az));
  }
  const L = seg[seg.length - 1];
  const out: Array<[number, number, number, number]> = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const d = (i / n) * L;
    while (seg[j + 1] < d) j++;
    const t = (d - seg[j]) / (seg[j + 1] - seg[j] || 1);
    const [ax, az] = pts[j],
      [bx, bz] = pts[(j + 1) % pts.length];
    const tx = bx - ax,
      tz = bz - az,
      tl = Math.hypot(tx, tz) || 1;
    const nx = tz / tl,
      nz = -tx / tl;
    out.push([ax + tx * t + nx * grow, az + tz * t + nz * grow, nx, nz]);
  }
  // Make sure normals point outward (the outline's winding differs by shape).
  const cx = out.reduce((a, p) => a + p[0], 0) / n,
    cz = out.reduce((a, p) => a + p[1], 0) / n;
  const flip = (out[0][0] - cx) * out[0][2] + (out[0][1] - cz) * out[0][3] < 0;
  if (flip)
    for (const p of out) {
      // Undo the inward offset, then point the normal outward.
      p[0] -= 2 * p[2] * grow;
      p[1] -= 2 * p[3] * grow;
      p[2] = -p[2];
      p[3] = -p[3];
    }
  return out;
}

const perimeter = (ring: Array<[number, number, number, number]>) =>
  ring.reduce((a, p, i) => {
    const q = ring[(i + 1) % ring.length];
    return a + Math.hypot(q[0] - p[0], q[1] - p[1]);
  }, 0);



/** The tier body. Side UVs run v = 0 at the bottom to v = 1 at the top so finish maps line up. */
function tierGeometry(t: Tier, r: number, h: number): THREE.BufferGeometry {
  const bev = Math.min(0.008, h * 0.08);
  let g: THREE.BufferGeometry;
  if (t.shape === 'round') {
    const pts: Array<[number, number]> = [[0, 0], [r - 0.002, 0], [r, 0.002]];
    const side = 40;
    for (let i = 1; i <= side; i++) pts.push([r, 0.002 + ((h - bev - 0.002) * i) / side]);
    for (let i = 1; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      pts.push([r - bev + Math.cos(a) * bev, h - bev + Math.sin(a) * bev]);
    }
    pts.push([0, h]);
    g = lathe(pts, 128);
    if (t.finish === 'ruffles') {
      // Overlapping frills: a sawtooth in height (each frill lifts at its bottom edge) with a soft wave around.
      const p = g.attributes.position;
      const rows = Math.max(5, Math.round(h / 0.022));
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i),
          rr = Math.hypot(x, z);
        if (rr < r - 0.001 || y > h - bev) continue;
        const f = (y / h) * rows,
          frac = f - Math.floor(f);
        const a = Math.atan2(x, z);
        const amp = 0.009 * Math.pow(1 - frac, 1.6) * (1 + 0.35 * Math.sin(a * 18 + Math.floor(f) * 1.7));
        p.setXYZ(i, (x / rr) * (rr + amp), y, (z / rr) * (rr + amp));
      }
      g.computeVertexNormals();
    }
  } else {
    const pts = outline(t.shape, r - bev, 160);
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    g = new THREE.ExtrudeGeometry(shape, { depth: h - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 4 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, bev, 0);
    g.computeVertexNormals();
    // Replace the extrude UVs: u around the cake, v by height, so maps wrap the side like a band.
    const p = g.attributes.position,
      uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, Math.atan2(p.getX(i), p.getZ(i)) / (Math.PI * 2) + 0.5, p.getY(i) / h);
  }
  if (t.shape === 'round') {
    const p = g.attributes.position,
      uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setY(i, p.getY(i) / h);
  }
  // Maps repeat around the circumference roughly every 30 cm so textures keep their scale on every size.
  return g;
}

/** Ganache drip: a glossy cap over the top edge plus drips of random length running down the side. */
function dripGeometry(ring: TierGeo['ring'], y0: number, h: number, r: number, shape: TierShape): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const capPts = outline(shape, r + 0.002, 128);
  const cap = new THREE.ExtrudeGeometry(new THREE.Shape(capPts.map(([x, z]) => new THREE.Vector2(x, -z))), { depth: 0.004, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 3 });
  cap.rotateX(-Math.PI / 2);
  cap.translate(0, y0 + h - 0.002, 0);
  parts.push(cap.toNonIndexed());
  const n = Math.max(12, Math.round(ring.length / 3));
  for (let i = 0; i < n; i++) {
    if (rnd() < 0.18) continue;
    const [x, z, nx, nz] = ring[Math.floor((i / n) * ring.length)];
    const len = 0.012 + Math.pow(rnd(), 1.6) * h * 0.55;
    const rad = 0.0045 + rnd() * 0.003;
    const d = new THREE.CapsuleGeometry(rad, len, 4, 10);
    d.scale(1, 1, 0.55);
    d.rotateY(Math.atan2(nx, nz));
    d.translate(x + nx * 0.0025, y0 + h - len / 2 - rad * 0.4, z + nz * 0.0025);
    parts.push(d.toNonIndexed());
  }
  for (const p of parts) for (const k of Object.keys(p.attributes)) if (!['position', 'normal', 'uv'].includes(k)) p.deleteAttribute(k);
  const m = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  m.computeVertexNormals();
  return m;
}

/** Ribbon band around the tier base, with a bow at the front. */
function ribbon(g: THREE.Object3D, B: BuilderT, ring: TierGeo['ring'], y0: number, colourHex: string) {
  const bandH = 0.022,
    pos: number[] = [],
    idx: number[] = [];
  ring.forEach(([x, z, nx, nz]) => {
    const px = x + nx * 0.0015,
      pz = z + nz * 0.0015;
    pos.push(px, y0 + 0.002, pz, px, y0 + 0.002 + bandH, pz);
  });
  for (let i = 0; i < ring.length; i++) {
    const a = i * 2,
      b = ((i + 1) % ring.length) * 2;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({ color: colourHex, roughness: 0.35, sheen: 1, sheenRoughness: 0.3, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide });
  noSh(mesh(g, geo, mat));
  // Bow at the front: two loops and two tails.
  const front = ring.reduce((best, p) => (p[1] > best[1] ? p : best), ring[0]);
  const [fx, fz, nx, nz] = front;
  const ry = Math.atan2(nx, nz);
  const bow = new THREE.Group();
  bow.position.set(fx + nx * 0.004, y0 + 0.002 + bandH / 2, fz + nz * 0.004);
  bow.rotation.y = ry;
  g.add(bow);
  for (const s of [-1, 1]) {
    const loop = mesh(bow, new THREE.TorusGeometry(0.014, 0.004, 8, 20), mat, s * 0.013, 0.002, 0);
    loop.scale.set(1, 0.7, 0.45);
    loop.rotation.z = s * 0.25;
    const tail = mesh(bow, new THREE.BoxGeometry(0.009, 0.03, 0.002), mat, s * 0.007, -0.018, 0.002);
    tail.rotation.z = s * 0.35;
  }
  B.add('glossball', [bow.position.x, bow.position.y, bow.position.z], 0.0055, colourHex);
}

/* ------------------------------------------------------------------ flowers */

function bloom(B: BuilderT, t: string, c: string, p: number[], n: number[], s: number) {
  const f = FL[t];
  if (!f) return;
  f.h(B, frame(I4, p[0], p[1], p[2], n[0], n[1], n[2], rnd() * 6.283), s * f.s, fc(c));
}

function leafAt(B: BuilderT, p: number[], dirY: number, s: number) {
  B.add('leaf', p, [s * 0.45, s * 0.1, s * 1.1], jit('#5f7d45', 0.12), [0.35 + rnd() * 0.5, dirY + (rnd() - 0.5) * 0.9, 0]);
}

/** A list of flower types to draw from, repeated by count, shuffled deterministically. */
function stemBag(c: CakeDesign) {
  const bag: Array<{ t: string; c: string }> = [];
  for (const s of c.flowers.stems) for (let i = 0; i < s.n; i++) bag.push({ t: s.t, c: s.c });
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function placeFlowers(B: BuilderT, c: CakeDesign, tiers: TierGeo[]) {
  const bag = stemBag(c);
  if (!bag.length || c.flowers.style === 'none') return;
  let k = 0;
  const next = () => bag[k++ % bag.length];
  const size = 0.03;
  const green = c.flowers.greenery;
  const top = tiers[tiers.length - 1];
  const sidePoint = (T: TierGeo, ang: number) => {
    // The ring sample closest to this angle around the cake (0 = front).
    let best = T.ring[0],
      bd = Infinity;
    for (const p of T.ring) {
      const d = Math.abs(Math.atan2(Math.sin(Math.atan2(p[0], p[1]) - ang), Math.cos(Math.atan2(p[0], p[1]) - ang)));
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  };

  if (c.flowers.style === 'crown') {
    const n = Math.min(bag.length, 14);
    const R = top.r * 0.55;
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996,
        rr = Math.sqrt((i + 0.5) / n) * R;
      const x = Math.sin(a) * rr,
        z = Math.cos(a) * rr;
      const lift = (1 - rr / R) * 0.02;
      const s = next();
      bloom(B, s.t, s.c, [x, top.y0 + top.h + 0.012 + lift, z], [x * 1.4, 1, z * 1.4], size);
      if (green && i % 2 === 0) leafAt(B, [x * 1.35, top.y0 + top.h + 0.006, z * 1.35], a, 0.028);
    }
  } else if (c.flowers.style === 'cascade') {
    // From the top tier's back-left down across the front of each tier, alternating sides.
    let side = -1;
    const per = Math.max(2, Math.ceil(bag.length / tiers.length));
    for (let ti = tiers.length - 1; ti >= 0; ti--) {
      const T = tiers[ti];
      for (let i = 0; i < per; i++) {
        const f = i / per;
        const ang = side * (0.9 - f * 1.1);
        const [x, z, nx, nz] = sidePoint(T, ang);
        const y = T.y0 + T.h * (0.95 - f * 0.75);
        const s = next();
        bloom(B, s.t, s.c, [x + nx * 0.012, y, z + nz * 0.012], [nx, 0.35, nz], size);
        if (green) leafAt(B, [x + nx * 0.01, y - 0.01, z + nz * 0.01], Math.atan2(nx, nz), 0.03);
      }
      // A cluster on the ledge where this tier meets the next one down.
      if (ti > 0) {
        const [x, z, nx, nz] = sidePoint(T, side * 0.2);
        const s = next();
        bloom(B, s.t, s.c, [x + nx * 0.02, T.y0 + 0.012, z + nz * 0.02], [nx * 0.6, 1, nz * 0.6], size * 1.05);
      }
      side = -side;
    }
  } else if (c.flowers.style === 'crescent') {
    tiers.forEach((T, ti) => {
      const ledgeY = T.y0 + T.h;
      const above = tiers[ti + 1];
      const rIn = above ? above.r : T.r * 0.4;
      const n = Math.max(3, Math.min(7, Math.round(bag.length / tiers.length)));
      for (let i = 0; i < n; i++) {
        const ang = (ti % 2 ? 1 : -1) * 0.6 + (i / (n - 1) - 0.5) * 1.5;
        const [x, z, nx, nz] = sidePoint(T, ang);
        const mid = (rIn + T.r) / 2 / T.r;
        const px = x * mid + nx * 0.004,
          pz = z * mid + nz * 0.004;
        const s = next();
        bloom(B, s.t, s.c, [px, ledgeY + 0.012, pz], [nx * 0.8, 1, nz * 0.8], size * (1 - Math.abs(i / (n - 1) - 0.5) * 0.4));
        if (green) leafAt(B, [x * 0.98, ledgeY + 0.005, z * 0.98], Math.atan2(nx, nz), 0.03);
      }
    });
  } else if (c.flowers.style === 'scatter') {
    const n = Math.min(bag.length, 18);
    for (let i = 0; i < n; i++) {
      const T = tiers[i % tiers.length];
      const ang = rnd() * Math.PI * 2;
      const [x, z, nx, nz] = sidePoint(T, ang);
      const y = T.y0 + T.h * (0.25 + rnd() * 0.6);
      const s = next();
      bloom(B, s.t, s.c, [x + nx * 0.008, y, z + nz * 0.008], [nx, 0.15, nz], size * 0.75);
    }
  } else if (c.flowers.style === 'base') {
    const T = tiers[0];
    const n = Math.max(8, Math.min(28, bag.length));
    for (let i = 0; i < n; i++) {
      const [x, z, nx, nz] = T.ring[Math.floor((i / n) * T.ring.length)];
      const s = next();
      bloom(B, s.t, s.c, [x + nx * 0.02, T.y0 + 0.012, z + nz * 0.02], [nx, 0.9, nz], size);
      if (green) leafAt(B, [x + nx * 0.035, T.y0 + 0.004, z + nz * 0.035], Math.atan2(nx, nz), 0.032);
    }
  }
}

/* ------------------------------------------------------------------ extras, topper, stand */

const STAND_H: Record<StandKind, number> = { none: 0, board: 0.012, 'pedestal-white': 0.11, 'pedestal-gold': 0.11, wood: 0.045, glass: 0.1 };

function buildStand(g: THREE.Object3D, kind: StandKind, baseR: number) {
  if (kind === 'none') return;
  const R = baseR + (kind === 'wood' ? 0.05 : 0.03);
  if (kind === 'board') {
    const m = new THREE.MeshPhysicalMaterial({ color: '#dcdcdc', metalness: 0.9, roughness: 0.25 });
    mesh(g, new THREE.CylinderGeometry(R, R, 0.012, 96), m, 0, 0.006, 0);
    return;
  }
  if (kind === 'wood') {
    const rings = cachedTex('map:woodslice', (x, w, h) => {
      x.fillStyle = '#c89a64';
      x.fillRect(0, 0, w, h);
      for (let i = 60; i > 0; i--) {
        x.strokeStyle = i % 3 ? 'rgba(120,80,40,.25)' : 'rgba(90,55,25,.45)';
        x.lineWidth = 1 + rnd() * 2;
        x.beginPath();
        x.ellipse(w / 2 + (rnd() - 0.5) * 6, h / 2 + (rnd() - 0.5) * 6, (i / 60) * w * 0.48, (i / 60) * h * 0.47, 0, 0, Math.PI * 2);
        x.stroke();
      }
    });
    const top = new THREE.MeshStandardMaterial({ map: rings, roughness: 0.8 });
    const bark = M('#5a3f2a', 0.95);
    // Cylinder material groups: 0 = bark side, 1 = top (rings), 2 = bottom.
    const slice = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.02, 0.045, 64), [bark, top, bark]);
    slice.position.y = 0.0225;
    slice.castShadow = slice.receiveShadow = true;
    g.add(slice);
    return;
  }
  const white = kind === 'pedestal-white',
    glass = kind === 'glass';
  const m = glass
    ? new THREE.MeshPhysicalMaterial({ color: '#eef6f7', roughness: 0.03, transparent: true, opacity: 0.35, clearcoat: 1, depthWrite: false })
    : white
      ? new THREE.MeshPhysicalMaterial({ color: '#fbfaf6', roughness: 0.3, clearcoat: 0.6 })
      : new THREE.MeshPhysicalMaterial({ color: '#d4af37', metalness: 1, roughness: 0.25 });
  const H = STAND_H[kind];
  const foot = R * 0.55;
  const prof: Array<[number, number]> = [
    [0, 0],
    [foot, 0],
    [foot * 0.98, 0.012],
    [foot * 0.5, 0.02],
    [0.022, H * 0.45],
    [0.02, H * 0.75],
    [0.04, H - 0.012],
    [R, H - 0.008],
    [R + 0.004, H - 0.004],
    [R, H],
    [0, H],
  ];
  const p = noSh(mesh(g, lathe(prof, 96), m));
  p.castShadow = !glass;
}

function extras(B: BuilderT, c: CakeDesign, tiers: TierGeo[]) {
  if (c.extras.goldLeaf) {
    // A band of torn gold leaf around the middle tier.
    const T = tiers[Math.floor((tiers.length - 1) / 2)];
    for (let i = 0; i < 90; i++) {
      const [x, z, nx, nz] = T.ring[Math.floor(rnd() * T.ring.length)];
      const y = T.y0 + T.h * (0.35 + (rnd() - 0.5) * 0.35);
      const s = 0.004 + rnd() * 0.008;
      B.add('goldflake', [x + nx * 0.0012, y, z + nz * 0.0012], [s, s * (0.6 + rnd() * 0.6), 1], jit('#e8c25a', 0.08), [0, Math.atan2(nx, nz), rnd() * 6]);
    }
  }
  const ledges = tiers.map((T, i) => ({ T, rIn: tiers[i + 1]?.r ?? 0 }));
  if (c.extras.berries) {
    for (const { T, rIn } of ledges) {
      const n = rIn ? 7 : 12;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd() * 0.3;
        const rr = rIn ? (rIn + T.r) / 2 : T.r * (0.25 + rnd() * 0.5);
        const x = Math.sin(a) * rr,
          z = Math.cos(a) * rr,
          y = T.y0 + T.h + 0.009;
        if (rnd() < 0.55) {
          // Raspberry: a cluster of drupelets.
          for (let d = 0; d < 16; d++) {
            const u = rnd() * Math.PI * 2,
              v = Math.acos(rnd() * 1.6 - 0.6);
            B.add('glossball', [x + Math.sin(v) * Math.cos(u) * 0.008, y + Math.cos(v) * 0.009, z + Math.sin(v) * Math.sin(u) * 0.008], 0.0034, jit('#b0203a', 0.08));
          }
        } else B.add('ball', [x, y - 0.002, z], 0.0065, jit('#3a3f7a', 0.1));
      }
    }
  }
  if (c.extras.macarons) {
    const cols = ['#f4c7cf', '#cfe6d8', '#f5e6a8', '#cbbfe0', '#f6cdb0'];
    // A row of macarons across the front of the bottom tier's ledge.
    const T = ledges[0];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = -0.9 + (i / (n - 1)) * 1.8;
      const rr = T.rIn ? (T.rIn + T.T.r) / 2 : T.T.r * 0.6;
      const x = Math.sin(a) * rr,
        z = Math.cos(a) * rr,
        y = T.T.y0 + T.T.h;
      const col = pick(cols),
        tilt = [0.5, a, 0] as [number, number, number];
      B.add('ball', [x, y + 0.012, z], [0.019, 0.008, 0.019], col, tilt);
      B.add('coin', [x, y + 0.018, z + 0.003], [0.017, 0.006, 0.017], '#fbf4e8', tilt);
      B.add('ball', [x, y + 0.024, z + 0.006], [0.019, 0.008, 0.019], col, tilt);
    }
  }
  if (c.extras.sprinkles) {
    const cols = ['#f39ab0', '#7ab8e8', '#f5d35a', '#8fd4a8', '#ffffff', '#c9a0e0'];
    for (const T of tiers) {
      for (let i = 0; i < 220; i++) {
        const a = rnd() * Math.PI * 2,
          rr = Math.sqrt(rnd()) * T.r * 0.97;
        const onTop = rnd() < 0.55;
        if (onTop) B.add('rod', [Math.sin(a) * rr, T.y0 + T.h + 0.0015, Math.cos(a) * rr], [0.0012, 0.007, 0.0012], pick(cols), [Math.PI / 2, rnd() * 6, 0]);
        else {
          const [x, z, nx, nz] = T.ring[Math.floor(rnd() * T.ring.length)];
          B.add('rod', [x + nx * 0.0015, T.y0 + T.h * (0.6 + rnd() * 0.38), z + nz * 0.0015], [0.0012, 0.007, 0.0012], pick(cols), [rnd() * 6, rnd() * 6, 0]);
        }
      }
    }
  }
}

/** Topper text (or monogram) cut from a sheet via an alpha map, standing on two picks. */
function textTopper(g: THREE.Object3D, text: string, metal: MetalFinish, y: number, round: boolean) {
  const W = 1024,
    H = round ? 1024 : 420;
  const cnv = document.createElement('canvas');
  cnv.width = W;
  cnv.height = H;
  const x = cnv.getContext('2d')!;
  x.fillStyle = '#000';
  x.fillRect(0, 0, W, H);
  x.fillStyle = '#fff';
  x.strokeStyle = '#fff';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  let fs = round ? 360 : 230;
  const font = (s: number) => `italic 500 ${s}px "Cormorant Garamond", Georgia, serif`;
  x.font = font(fs);
  while (x.measureText(text).width > W * (round ? 0.62 : 0.92) && fs > 40) x.font = font((fs -= 8));
  if (round) {
    x.lineWidth = 26;
    x.beginPath();
    x.arc(W / 2, H / 2, W * 0.44, 0, Math.PI * 2);
    x.stroke();
  }
  x.fillText(text, W / 2, H / 2 + (round ? 10 : 0));
  // Letters touch a bar at the bottom so the cut-out holds together, as real acrylic toppers do.
  if (!round) x.fillRect(W * 0.12, H * 0.8, W * 0.76, 8);
  const tex = new THREE.CanvasTexture(cnv);
  const w = round ? 0.12 : 0.2,
    h = (w * H) / W;
  const m = metalMat(metal);
  m.alphaMap = tex;
  m.alphaTest = 0.5;
  m.transparent = false;
  const plate = mesh(g, new THREE.PlaneGeometry(w, h), m, 0, y + 0.06 + h / 2, 0);
  plate.castShadow = true;
  for (const s of [-1, 1]) mesh(g, new THREE.CylinderGeometry(0.0015, 0.0015, 0.08, 6), metalMat(metal), s * w * 0.3, y + 0.035, 0);
}

function shapeTopper(g: THREE.Object3D, kind: 'heart' | 'stars', metal: MetalFinish, y: number) {
  const m = metalMat(metal);
  const extrude = (pts: Array<[number, number]>, s: number) => {
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a * s, b * s))), { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2 });
    geo.center();
    return geo;
  };
  if (kind === 'heart') {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      pts.push([16 * Math.pow(Math.sin(t), 3), 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]);
    }
    mesh(g, extrude(pts, 0.0028), m, 0, y + 0.1, 0);
    mesh(g, new THREE.CylinderGeometry(0.0016, 0.0016, 0.09, 6), m, 0, y + 0.04, 0);
  } else {
    const star = (r1: number, r2: number) => Array.from({ length: 10 }, (_, i) => [Math.sin((i / 10) * Math.PI * 2) * (i % 2 ? r2 : r1), Math.cos((i / 10) * Math.PI * 2) * (i % 2 ? r2 : r1)] as [number, number]);
    const spots: Array<[number, number, number, number]> = [
      [0, 0.13, 0, 1],
      [-0.035, 0.1, 0.01, 0.7],
      [0.04, 0.085, -0.01, 0.6],
      [0.015, 0.155, -0.012, 0.45],
    ];
    for (const [sx, sy, sz, s] of spots) {
      mesh(g, extrude(star(1, 0.42), 0.022 * s), m, sx, y + sy, sz).rotation.y = (rnd() - 0.5) * 0.6;
      const pickGeo = new THREE.CylinderGeometry(0.0012, 0.0012, sy, 6);
      const pk = mesh(g, pickGeo, m, sx / 2, y + sy / 2, sz / 2);
      pk.rotation.set(sz * 3, 0, -sx * 3);
    }
  }
}

/* ------------------------------------------------------------------ build */

/** Build a cake into `g`, standing on y = 0 (its stand's foot). */
export function buildCake(g: THREE.Group, c: CakeDesign) {
  const keep = getSeedState();
  seed(c.seed || 7);
  const B = Builder(g);
  const baseR = c.tiers[0].d / 200;
  buildStand(g, c.stand, baseR);
  let y = STAND_H[c.stand];
  const tiers: TierGeo[] = [];
  for (const t of c.tiers) {
    const r = t.d / 200,
      h = t.h / 100;
    const geo = tierGeometry(t, r, h);
    const mat = frostingMaterial(t);
    // Keep texture scale constant: roughly one repeat per 30 cm of circumference.
    if (mat.map || mat.bumpMap) {
      const around = Math.max(1, Math.round((Math.PI * 2 * r) / 0.3));
      for (const tex of [mat.map, mat.bumpMap]) {
        if (!tex) continue;
        const tt = tex.clone();
        tt.wrapS = THREE.RepeatWrapping;
        tt.wrapT = THREE.ClampToEdgeWrapping;
        tt.repeat.set(around, 1);
        tt.needsUpdate = true;
        if (tex === mat.map) mat.map = tt;
        else mat.bumpMap = tt;
      }
    }
    const body = mesh(g, geo, mat, 0, y, 0);
    body.castShadow = body.receiveShadow = true;
    const ring = ringOf(outline(t.shape, r, 240), Math.max(48, Math.round(r * 900)));
    const tg: TierGeo = { y0: y, h, r, ring, tier: t };
    tiers.push(tg);
    if (t.finish === 'drip') {
      const dm = new THREE.MeshPhysicalMaterial({ color: cakeHex(t.a), roughness: 0.14, clearcoat: 0.9, clearcoatRoughness: 0.1, metalness: t.a === 'gold' ? 0.8 : 0 });
      mesh(g, dripGeometry(ring, y, h, r, t.shape), dm);
    }
    // Borders sit at the base of each tier.
    const bc = cakeHex(t.bc);
    if (t.border === 'pearls' || t.border === 'dragees') {
      const pr = t.border === 'pearls' ? 0.0055 : 0.0038;
      const pring = ringOf(outline(t.shape, r, 240), Math.max(24, Math.floor(perimeter(ring) / (pr * 2.05))), pr * 0.9);
      for (const [x, z] of pring) B.add(t.border === 'pearls' ? 'pearl' : 'dragee', [x, y + pr, z], pr, t.border === 'dragees' && t.bc === 'white' ? '#d4af37' : bc);
    } else if (t.border === 'shell') {
      const sring = ringOf(outline(t.shape, r, 240), Math.max(24, Math.round((Math.PI * 2 * r) / 0.014)), 0.004);
      for (const [x, z, nx, nz] of sring) B.add('shell', [x, y + 0.006, z], [0.007, 0.006, 0.009], bc, [0, Math.atan2(nx, nz) + Math.PI / 2, 0]);
    } else if (t.border === 'ribbon') ribbon(g, B, ring, y, bc);
    y += h;
  }
  placeFlowers(B, c, tiers);
  extras(B, c, tiers);
  if (c.topper.kind !== 'none') {
    const top = y;
    if (c.topper.kind === 'script') textTopper(g, c.topper.text.trim() || 'Love', c.topper.metal, top, false);
    else if (c.topper.kind === 'mrmrs') textTopper(g, 'Mr & Mrs', c.topper.metal, top, false);
    else if (c.topper.kind === 'monogram') textTopper(g, (c.topper.text.trim() || 'A&B').slice(0, 5), c.topper.metal, top, true);
    else shapeTopper(g, c.topper.kind, c.topper.metal, top);
  }
  B.flush();
  setSeedState(keep);
}

export const cakeFootprintCm = (c: CakeDesign) => c.tiers[0].d + (c.stand === 'none' ? 0 : c.stand === 'wood' ? 10 : 6);

// Register saved cakes before a persisted design that uses them is loaded.
for (const c of loadCakes()) registerCake(c);
