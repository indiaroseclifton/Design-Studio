import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { seed } from '../three/utils';
import { Builder } from '../three/builder';
import { ITEMS, PACKS, TEMPLATES } from './catalogue.gen';
import { CHAIRS, CLOTHS, DECOR, OVERLAYS, palOf, tableLen, type Pal } from './studio';
import type { CatalogueItem, TableLayout } from '../types';

export { ITEMS, PACKS, TEMPLATES };

/* ------------------------------------------------------------------ categories */

export const CATL: Record<string, string> = {
  templates: 'Templates',
  linens: 'Linens',
  chairs: 'Chairs',
  florals: 'Florals',
  tableware: 'Tableware',
  desserts: 'Desserts',
  light: 'Candles & light',
  furniture: 'Furniture & lighting',
  structures: 'Structures',
  wedding: 'Wedding',
  holiday: 'Holiday',
  faith: 'Faith & culture',
  corporate: 'Corporate',
  party: 'Parties & kids',
};
for (const p of PACKS) CATL[p.id] = p.name;

const BASE_ORDER = ['templates', 'linens', 'chairs', 'florals', 'tableware', 'desserts', 'light', 'furniture', 'structures', 'wedding', 'holiday', 'faith', 'corporate', 'party'];
export const isPack = (cat: string) => PACKS.some((p) => p.id === cat);
export const CAT_ORDER = [...BASE_ORDER, ...PACKS.map((p) => p.id)];

/* ------------------------------------------------------------------ item rules */

export type ItemId = keyof typeof ITEMS & string;

export const topE = (tp: NonNullable<CatalogueItem['top']>) => tp.r || Math.min(tp.w ?? 0, tp.d ?? 0) / 2;

/** Can this piece be set on top of a host surface (a cake table, a bar, a plinth…)? */
export function canStack(d: CatalogueItem | undefined): boolean {
  return (
    !!d &&
    !d.top &&
    !d.lock &&
    d.group !== 'place' &&
    (d.surf === 'table' || (d.surf === 'floor' && !d.aisle && d.fp <= 0.5 && !['backdrop', 'dance', 'structure', 'stage'].includes(d.group)))
  );
}

export function itemTag(d: CatalogueItem): string {
  if (d.opts) return 'Builder';
  if (d.top) return 'Floor · decorate on top';
  if (d.lock === 'center') return 'Snaps to table';
  if (d.lock === 'aisle') return 'Snaps to aisle';
  if (d.surf === 'hang') return 'Hangs';
  if (d.surf === 'floor') return d.aisle ? 'Floor · aisle' : 'Floor';
  return 'Table';
}

export const optDef = (d: CatalogueItem): Record<string, string> =>
  d.opts ? Object.fromEntries(Object.entries(d.opts).map(([k, v]) => [k, v.d])) : {};

/** Pieces that share a group can be swapped for each other in the inspector. */
export const swapsFor = (type: string): Array<[string, string]> => {
  const d = ITEMS[type];
  return d ? Object.entries(ITEMS).filter(([, x]) => x.group === d.group).map(([k, x]) => [k, x.name]) : [];
};

/* --------------------------------------------------------------- catalogue list */

export type EntryKind = 'tpl' | 'cloth' | 'overlay' | 'chair' | 'decor' | 'item';

export interface Entry {
  k: EntryKind;
  id: string;
  cat: string;
  sec: string;
  name: string;
  note?: string;
  tag: string;
  kw?: string;
  /** stable key: `${k}:${id}` */
  key: string;
}

const entry = (e: Omit<Entry, 'key'>): Entry => ({ ...e, key: `${e.k}:${e.id}` });

/** Everything the catalogue can show, in tab order. Pack tabs appear only when the pack is switched on. */
export function buildEntries(packsOn: Set<string>): Entry[] {
  const out: Entry[] = [];
  for (const t of TEMPLATES)
    out.push(entry({ k: 'tpl', id: t.id, cat: 'templates', sec: t.kind === 'Religious' ? 'Faith & culture' : t.kind, name: t.name, note: t.desc, tag: 'Template' }));
  for (const [id, d] of Object.entries(CLOTHS)) out.push(entry({ k: 'cloth', id, cat: 'linens', sec: 'Tablecloths', name: d.name, tag: 'Snaps to table' }));
  for (const [id, d] of Object.entries(OVERLAYS)) out.push(entry({ k: 'overlay', id, cat: 'linens', sec: 'Overlays', name: d.name, tag: 'Snaps to table' }));
  for (const [id, d] of Object.entries(CHAIRS)) out.push(entry({ k: 'chair', id, cat: 'chairs', sec: 'Chair styles', name: d.name, tag: 'Replaces all' }));
  for (const [id, d] of Object.entries(DECOR)) out.push(entry({ k: 'decor', id, cat: 'chairs', sec: 'Chair décor', name: d.name, tag: 'All chairs' }));
  for (const c of BASE_ORDER)
    for (const [id, d] of Object.entries(ITEMS))
      if (d.cat === c) out.push(entry({ k: 'item', id, cat: c, sec: d.sec, name: d.name, kw: d.kw, tag: itemTag(d) }));
  for (const P of PACKS) {
    if (!packsOn.has(P.id)) continue;
    for (const [id, d] of Object.entries(ITEMS)) if (d.cat === P.id) out.push(entry({ k: 'item', id, cat: P.id, sec: d.sec, name: d.name, kw: d.kw, tag: itemTag(d) }));
    for (const id of P.also ?? []) {
      const d = ITEMS[id];
      if (d) out.push(entry({ k: 'item', id, cat: P.id, sec: 'Also in the catalogue', name: d.name, kw: d.kw, tag: itemTag(d) }));
    }
  }
  return out;
}

/** Total number of distinct catalogue pieces (items, linens, chairs and décor; templates excluded). */
export const PIECE_COUNT = Object.keys(ITEMS).length + Object.keys(CLOTHS).length + Object.keys(OVERLAYS).length + Object.keys(CHAIRS).length + Object.keys(DECOR).length;

/* ------------------------------------------------------------------- building */

/**
 * Merge plain meshes that share a material into one mesh (the prototype's `mergeStatic`).
 * Builders create many small boxes and cylinders; merging keeps draw calls down with dozens of pieces.
 */
function mergeStatic(g: THREE.Group) {
  const by = new Map<THREE.Material, THREE.Mesh[]>();
  for (const o of g.children.slice()) {
    if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh || Array.isArray(o.material) || !o.geometry.index) continue;
    if (!by.has(o.material)) by.set(o.material, []);
    by.get(o.material)!.push(o);
  }
  by.forEach((list, m) => {
    if (list.length < 2) return;
    if (!list.every((o) => o.geometry.attributes.uv && o.geometry.attributes.normal)) return;
    const attrs = Object.keys(list[0].geometry.attributes).sort().join();
    if (!list.every((o) => Object.keys(o.geometry.attributes).sort().join() === attrs)) return;
    const geos = list.map((o) => {
      o.updateMatrix();
      const gg = o.geometry.clone();
      gg.applyMatrix4(o.matrix);
      return gg;
    });
    const mg = mergeGeometries(geos);
    geos.forEach((gg) => gg.dispose());
    if (!mg) return;
    list.forEach((o) => g.remove(o));
    const mm = new THREE.Mesh(mg, m);
    mm.castShadow = !m.transparent;
    mm.receiveShadow = true;
    g.add(mm);
  });
}

export interface ItemBuildExtra {
  text?: string;
  tnum?: number;
  o?: Record<string, string>;
}

/** Build one catalogue piece as a fresh group, deterministically from its seed. */
export function itemGroup(type: string, pal: string | Pal, sd: number, m: TableLayout, extra: ItemBuildExtra = {}, customPal?: Parameters<typeof palOf>[1]): THREE.Group {
  const g = new THREE.Group();
  const d = ITEMS[type];
  if (!d) return g;
  seed(sd);
  const B = Builder(g);
  const p = typeof pal === 'string' ? palOf(pal, customPal) : pal;
  try {
    d.build(g, B, p, { m, len: tableLen(m), text: extra.text, tnum: extra.tnum, o: { ...optDef(d), ...(extra.o ?? {}) } });
    B.flush();
    mergeStatic(g);
  } catch (err) {
    console.warn(`Could not build "${type}"`, err);
  }
  return g;
}

/* --------------------------------------------------------------------- prices */

const GROUP_PRICE: Record<string, number> = {
  centre: 95, accent: 22, garland: 75, runner: 14, place: 9, candles: 28, hang: 240, floorfl: 260, aisle: 60, backdrop: 850,
  floor: 160, cake: 480, furniture: 220, dance: 900, lighting: 65, feature: 300,
};
const ITEM_PRICE: Record<string, number> = {
  arch: 950, moongate: 850, arbour: 780, flowerwall: 1400, chuppah: 1200, mandap: 2800, altar: 400, xtree: 350, champagne: 420, cake: 520,
  urn: 320, petals: 180, rangoli: 150, cloud: 750, tall: 160, low: 110, hoop: 120, floatbowl: 70, bud: 24, menorah: 45, advent: 55,
  unity: 40, diyas: 30, fanous: 48, gifts: 90, aisle_runner: 120, runner_velvet: 18, runner_gold: 16, runner_chiffon: 18,
};

/** Default rental price for a quote line key such as `item:low`, `cloth:ivory` or `chair:ghost`. */
export function defaultPrice(key: string): number {
  const [k, id] = key.split(':');
  if (k === 'table') return id === 'round' ? 14 : 20;
  if (k === 'cloth') {
    const c = CLOTHS[id];
    if (!c) return 16;
    if (c.bare) return 0;
    if (c.velvet) return 32;
    if (c.tex === 'sequin') return 36;
    if (c.r) return 22;
    return 18;
  }
  if (k === 'overlay') return ({ lace: 18, chiffon: 14, organza: 14, sequin: 24 } as Record<string, number>)[id] || 15;
  if (k === 'chair') {
    const c = CHAIRS[id];
    return c ? ({ chiavari: 7.5, cross: 9, bent: 6.5, ghost: 11, rattan: 12, cover: 5.5 } as Record<string, number>)[c.type] : 0;
  }
  if (k === 'decor') return ({ sash: 3.5, sprig: 4.5, posy: 12 } as Record<string, number>)[id] || 0;
  const d = ITEMS[id];
  return d ? (d.price ?? ITEM_PRICE[id] ?? GROUP_PRICE[d.group] ?? 50) : 0;
}
