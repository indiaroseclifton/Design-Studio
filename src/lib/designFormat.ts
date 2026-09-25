import { ITEMS } from '../engine/catalogue';
import { CHAIRS, CLOTHS, DECOR, OVERLAYS, PALS, genTables } from '../engine/studio';
import { VENUES } from '../engine/venues.gen';
import { DEF_TABLE, newId, newSeed } from './designOps';
import type { Design, PlacedItem, TableLayout, TablePos, TimeOfDay, Weather } from '../types';

export const DEFAULT_DESIGN: Design = {
  venue: 0,
  time: 'venue',
  wx: 'clear',
  table: { ...DEF_TABLE },
  guests: 8,
  tables: [{ x: 0, z: 0, ry: 0 }],
  mirror: true,
  items: [],
  palette: 'blush',
  customPalette: { b: [...PALS.custom.b], g: PALS.custom.g, f: PALS.custom.f },
};

const LAYOUTS: TableLayout[] = ['round', 'banquet', 'ceremony', 'none'];
const TIMES: TimeOfDay[] = ['venue', 'day', 'golden', 'night'];
const WEATHERS: Weather[] = ['clear', 'rain', 'snow'];
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const idIn = (v: unknown, table: Record<string, unknown>) => (typeof v === 'string' && v in table ? v : null);
const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

/**
 * Coerce untrusted JSON (localStorage, an imported file, a share link) into a valid Design.
 * Accepts this app's format and the prototype's `snapObj` export (`weather`, `ry`, `v: 3`).
 * Unknown catalogue pieces are dropped. Returns null when the input isn't recognisably a design.
 */
export function normalizeDesign(raw: unknown): Design | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.items) || !o.table || typeof o.table !== 'object') return null;
  const t = o.table as Record<string, unknown>;
  const mode = oneOf(t.mode ?? t.layout, LAYOUTS, 'round');
  const guests = Math.min(160, Math.max(1, Math.round(num(o.guests ?? t.guests, 8))));

  const items: PlacedItem[] = [];
  for (const it of o.items as Array<Record<string, unknown>>) {
    if (!it || typeof it !== 'object' || typeof it.type !== 'string' || !ITEMS[it.type]) continue;
    const opts = it.o && typeof it.o === 'object' ? Object.fromEntries(Object.entries(it.o).filter(([, v]) => typeof v === 'string')) : undefined;
    items.push({
      id: str(it.id) ?? newId(),
      type: it.type,
      x: num(it.x, 0),
      z: num(it.z, 0),
      ry: num(it.ry ?? it.rot, 0),
      pal: idIn(it.pal, PALS) ?? 'blush',
      seed: Math.floor(num(it.seed, newSeed())),
      t: Math.floor(num(it.t, -1)),
      ...(str(it.link) ? { link: str(it.link) } : {}),
      ...(str(it.text) ? { text: str(it.text)!.slice(0, 80) } : {}),
      ...(str(it.on) ? { on: str(it.on) } : {}),
      ...(opts ? { o: opts as Record<string, string> } : {}),
    });
  }
  // Drop pieces whose host didn't survive, repeatedly, since stacks can nest.
  let kept = items;
  for (let pass = 0; pass < 4; pass++) {
    const ids = new Set(kept.map((i) => i.id));
    kept = kept.filter((i) => !i.on || ids.has(i.on));
  }

  const tablesIn = Array.isArray(o.tables) ? (o.tables as Array<Record<string, unknown>>) : [];
  const tables: TablePos[] = tablesIn.filter((x) => x && typeof x === 'object').map((x) => ({ x: num(x.x, 0), z: num(x.z, 0), ry: num(x.ry, 0) }));

  const cp = (o.customPalette ?? {}) as Record<string, unknown>;
  const byName = typeof o.venueName === 'string' ? VENUES.findIndex((v) => v.name === o.venueName) : -1;

  return {
    venue: byName >= 0 ? byName : Math.min(VENUES.length - 1, Math.max(0, Math.floor(num(o.venue, 0)))),
    time: oneOf(o.time, TIMES, 'venue'),
    wx: oneOf(o.wx ?? o.weather, WEATHERS, 'clear'),
    table: {
      mode,
      cloth: idIn(t.cloth, CLOTHS),
      customCloth: isHex(t.customCloth) ? t.customCloth : DEF_TABLE.customCloth,
      overlay: idIn(t.overlay, OVERLAYS) ?? 'none',
      chair: idIn(t.chair, CHAIRS),
      decor: idIn(t.decor, DECOR) ?? 'none',
      decorPal: idIn(t.decorPal, PALS) ?? 'blush',
      place: typeof t.place === 'string' && ITEMS[t.place]?.group === 'place' ? t.place : DEF_TABLE.place,
      ...(t.placeO && typeof t.placeO === 'object' ? { placeO: t.placeO as Record<string, string> } : {}),
    },
    guests,
    tables: tables.length ? tables : genTables(mode, guests),
    mirror: typeof o.mirror === 'boolean' ? o.mirror : true,
    items: kept,
    palette: idIn(o.palette, PALS) ?? 'blush',
    customPalette: {
      b: Array.isArray(cp.b) && cp.b.length === 5 && cp.b.every(isHex) ? (cp.b as string[]) : [...PALS.custom.b],
      g: isHex(cp.g) ? cp.g : PALS.custom.g,
      f: isHex(cp.f) ? cp.f : PALS.custom.f,
    },
  };
}
