/*
 * Design operations, ported from the prototype's state code. Each function mutates a draft `Design`
 * (the store hands in a deep copy and commits it to history), mirroring the prototype's behaviour:
 * mirrored table pieces are separate items sharing a `link`, stacked pieces store their host in `on`,
 * and every placement goes through `clampIt` so pieces stay on tables, off the aisle and inside the room.
 */
import { ITEMS, TEMPLATES, canStack, optDef, topE } from '../engine/catalogue';
import { HANG, genTables, hasTbl, placeSpots, topY } from '../engine/studio';
import type { Design, PlacedItem, TableConfig, TableLayout } from '../types';

export const DEF_TABLE: TableConfig = {
  mode: 'round',
  cloth: null,
  customCloth: '#c9b8a0',
  overlay: 'none',
  chair: null,
  decor: 'none',
  decorPal: 'blush',
  place: 'place_classic',
};

export const newId = () => crypto.randomUUID().slice(0, 12);
export const newSeed = () => Math.floor(Math.random() * 1e9);
export const md = (S: Design): TableLayout => S.table.mode;

export const hostOf = (S: Design, it: PlacedItem): PlacedItem | undefined =>
  it.on ? S.items.find((i) => i.id === it.on && ITEMS[i.type]?.top) : undefined;

export function hW(h: PlacedItem, lx: number, lz: number): [number, number] {
  const c = Math.cos(h.ry),
    s = Math.sin(h.ry);
  return [h.x + lx * c + lz * s, h.z - lx * s + lz * c];
}
export function hL(h: PlacedItem, wx: number, wz: number): [number, number] {
  const dx = wx - h.x,
    dz = wz - h.z,
    c = Math.cos(h.ry),
    s = Math.sin(h.ry);
  return [dx * c - dz * s, dx * s + dz * c];
}
export function tWorld(S: Design, t: number, lx: number, lz: number): [number, number] {
  const T = S.tables[t] || S.tables[0],
    c = Math.cos(T.ry),
    s = Math.sin(T.ry);
  return [T.x + lx * c + lz * s, T.z - lx * s + lz * c];
}
export function tLocal(S: Design, t: number, wx: number, wz: number): [number, number] {
  const T = S.tables[t] || S.tables[0],
    dx = wx - T.x,
    dz = wz - T.z,
    c = Math.cos(T.ry),
    s = Math.sin(T.ry);
  return [dx * c - dz * s, dx * s + dz * c];
}

/** Height a piece rests at: host top, tabletop, hanging height or the floor. */
export function surfY(S: Design, it: PlacedItem): number {
  const d = ITEMS[it.type],
    H = hostOf(S, it);
  if (H) return surfY(S, H) + ITEMS[H.type].top!.h;
  return d.surf === 'table' ? topY(S.table) : d.surf === 'hang' ? d.hy || HANG : 0;
}

export function worldOf(S: Design, it: PlacedItem): [number, number] {
  const H = hostOf(S, it);
  if (H) {
    const [hx, hz] = worldOf(S, H);
    return hW({ ...H, x: hx, z: hz }, it.x, it.z);
  }
  return ITEMS[it.type].surf === 'table' ? tWorld(S, it.t, it.x, it.z) : [it.x, it.z];
}

/** World transform and visibility for rendering. */
export function placement(S: Design, it: PlacedItem): { x: number; y: number; z: number; ry: number; visible: boolean } {
  const d = ITEMS[it.type];
  const H = hostOf(S, it);
  if (H) {
    const hp = placement(S, H);
    const [wx, wz] = hW({ ...H, x: hp.x, z: hp.z, ry: hp.ry }, it.x, it.z);
    return { x: wx, y: surfY(S, it), z: wz, ry: hp.ry + it.ry, visible: hp.visible };
  }
  if (d.surf === 'table') {
    const t = it.t >= 0 && it.t < S.tables.length ? it.t : 0;
    const [wx, wz] = tWorld(S, t, it.x, it.z);
    return { x: wx, y: surfY(S, it), z: wz, ry: (S.tables[t]?.ry || 0) + it.ry, visible: hasTbl(md(S)) };
  }
  return { x: it.x, y: surfY(S, it), z: it.z, ry: it.ry, visible: true };
}

export function nearestTable(S: Design, x: number, z: number) {
  let b = 0,
    bd = 1e9;
  S.tables.forEach((T, i) => {
    const d = (T.x - x) ** 2 + (T.z - z) ** 2;
    if (d < bd) {
      bd = d;
      b = i;
    }
  });
  return b;
}

export const linked = (S: Design, it: PlacedItem) => (S.mirror && it.link ? S.items.filter((i) => i.link === it.link) : [it]);

/** Keep a piece on its table, inside its host, out of the aisle and seating, and inside the room. */
export function clampIt(S: Design, it: Pick<PlacedItem, 'type' | 'x' | 'z' | 'ry' | 'on'>) {
  const d = ITEMS[it.type],
    m = md(S),
    fp = d.fp,
    H = it.on ? S.items.find((i) => i.id === it.on && ITEMS[i.type]?.top) : undefined;
  if (H) {
    const tp = ITEMS[H.type].top!,
      e = topE(tp),
      mg = Math.min(fp * 0.55, e * 0.75);
    if (tp.r) {
      const R = Math.max(0, tp.r - mg),
        r = Math.hypot(it.x, it.z);
      if (r > R) {
        it.x *= R / (r || 1);
        it.z *= R / (r || 1);
      }
    } else {
      const mx = Math.max(0, tp.w! / 2 - mg),
        mz = Math.max(0, tp.d! / 2 - mg);
      it.x = Math.max(-mx, Math.min(mx, it.x));
      it.z = Math.max(-mz, Math.min(mz, it.z));
    }
    return;
  }
  if (d.lock === 'center') {
    it.x = 0;
    it.z = 0;
    if (m === 'banquet') it.ry = Math.round(it.ry / Math.PI) * Math.PI;
    return;
  }
  if (d.lock === 'aisle') {
    it.x = 0;
    it.z = m === 'ceremony' ? 2.6 : S.tables.length > 1 ? Math.max(...S.tables.map((t) => t.z)) + 4 : 4.6;
    it.ry = 0;
    return;
  }
  if (d.surf === 'table') {
    if (m === 'banquet') {
      const mx = Math.max(0, 1.9 - fp),
        mz = Math.max(0, 0.55 - fp);
      it.x = Math.max(-mx, Math.min(mx, it.x));
      it.z = Math.max(-mz, Math.min(mz, it.z));
    } else {
      const R = Math.max(0, 0.93 - fp),
        r = Math.hypot(it.x, it.z);
      if (r > R) {
        it.x *= R / r;
        it.z *= R / r;
      }
    }
    return;
  }
  if (d.surf === 'hang') {
    const r = Math.hypot(it.x, it.z);
    if (r > 12) {
      it.x *= 12 / r;
      it.z *= 12 / r;
    }
    return;
  }
  if (m === 'ceremony') {
    const rows = Math.max(2, Math.ceil(S.guests / 8)),
      W = 2.8 + fp,
      F = 0.1 - fp,
      Bk = 0.7 + rows + fp;
    if (Math.abs(it.x) < W && it.z > F && it.z < Bk && !(d.aisle && Math.abs(it.x) < 0.55)) {
      const dl = W - Math.abs(it.x),
        df = it.z - F,
        db = Bk - it.z,
        mn = Math.min(dl, df, db);
      if (mn === dl) it.x = Math.sign(it.x || 1) * W;
      else if (mn === df) it.z = F;
      else it.z = Bk;
    }
  } else if (hasTbl(m) && !d.aisle) {
    const rr = (m === 'banquet' ? 2.6 : 2.1) + fp * 0.5;
    for (const T of S.tables) {
      const dx = it.x - T.x,
        dz = it.z - T.z,
        r = Math.hypot(dx, dz);
      if (r < rr) {
        if (r < 0.01) it.z = T.z - rr;
        else {
          it.x = T.x + (dx * rr) / r;
          it.z = T.z + (dz * rr) / r;
        }
      }
    }
  }
  const r = Math.hypot(it.x, it.z);
  if (r > 18) {
    it.x *= 18 / r;
    it.z *= 18 / r;
  }
}

/** A sensible first position for a new piece that doesn't overlap pieces already there. */
export function spotFor(S: Design, type: string): [number, number] {
  const d = ITEMS[type],
    m = md(S);
  let c: Array<[number, number]>;
  if (d.surf === 'table')
    c = (
      [
        [0, 0],
        [0.38, 0],
        [-0.38, 0],
        [0, 0.3],
        [0, -0.3],
        [0.3, 0.3],
        [-0.3, -0.3],
        [0.3, -0.3],
        [-0.3, 0.3],
      ] as Array<[number, number]>
    ).map(([x, z]) => (m === 'banquet' ? [x * 3, z * 0.6] : [x, z]));
  else if (d.surf === 'hang')
    c = [
      [0, 0],
      [0.9, 0],
      [-0.9, 0],
      [0, 0.9],
      [0, -0.9],
    ];
  else if (d.group === 'backdrop')
    c = [
      [0, m === 'ceremony' ? -3.8 : Math.min(...S.tables.map((t) => t.z)) - 3.6],
      [-3.8, -1],
      [3.8, -1],
    ];
  else if (d.aisle && m === 'ceremony')
    c =
      d.fp > 0.4
        ? [[0, type === 'rangoli' ? -1.2 : 2.6]]
        : [
            [-0.55, 0.6],
            [0.55, 0.6],
            [-0.55, 2.6],
            [0.55, 2.6],
            [-0.55, 4.6],
            [0.55, 4.6],
          ];
  else
    c =
      m === 'ceremony'
        ? [
            [-3.6, -2],
            [3.6, -2],
            [-3.6, 4],
            [3.6, 4],
          ]
        : [
            [-2.6, -1.8],
            [2.6, -1.8],
            [-2.6, 1.8],
            [2.6, 1.8],
            [-3.4, 0],
            [3.4, 0],
          ];
  const same = S.items.filter((i) => ITEMS[i.type].surf === d.surf && (d.surf !== 'table' || i.t === 0));
  return c.find(([x, z]) => same.every((i) => Math.hypot(i.x - x, i.z - z) > 0.3)) || c[Math.floor(Math.random() * c.length)];
}

export interface AddOpts extends Partial<PlacedItem> {
  /** mirror onto every table (defaults to the design's setting) */
  mirror?: boolean;
  /** restoring or templating: skip stacking onto the selected host */
  restore?: boolean;
  /** the selected host, for "decorating" mode */
  host?: PlacedItem | null;
}

/**
 * Placement for a piece dropped at world (x, z): onto the piece under the pointer if it's a surface that
 * takes it, onto the nearest table for tabletop pieces, otherwise on the floor where it landed.
 */
export function dropOpts(S: Design, type: string, at: { x: number; z: number; itemId?: string }): AddOpts {
  const d = ITEMS[type];
  const under = at.itemId ? S.items.find((i) => i.id === at.itemId) : undefined;
  const H = under && (ITEMS[under.type]?.top ? under : under.on ? S.items.find((i) => i.id === under.on) : undefined);
  if (H && canStack(d) && ITEMS[H.type]?.top && (d.surf === 'table' || d.fp * 0.8 <= topE(ITEMS[H.type].top!))) {
    const [lx, lz] = hL(H, at.x, at.z);
    return { host: H, x: lx, z: lz };
  }
  if (d.surf === 'table' && hasTbl(md(S))) {
    const t = nearestTable(S, at.x, at.z);
    const [lx, lz] = tLocal(S, t, at.x, at.z);
    return { host: null, t, x: lx, z: lz };
  }
  return { host: null, x: at.x, z: at.z };
}

/**
 * Add a piece (the prototype's `addItem`). Returns the item to select, or null if it can't be placed
 * (a table piece with no tables and no host).
 */
export function addItem(S: Design, type: string, o: AddOpts = {}): PlacedItem | null {
  const d = ITEMS[type];
  if (!d) return null;
  const m = md(S);
  let opts: AddOpts = { ...o };
  if (canStack(d) && !opts.on && !opts.restore) {
    const sh = opts.host;
    const H =
      (sh && ITEMS[sh.type]?.top && (d.surf === 'table' || d.fp * 0.8 <= topE(ITEMS[sh.type].top!)) ? sh : null) ||
      (d.surf === 'table' && !hasTbl(m) ? [...S.items].reverse().find((i) => ITEMS[i.type].top) : null);
    if (H) {
      const tp = ITEMS[H.type].top!,
        n = S.items.filter((i) => i.on === H.id).length,
        a = n * 2.4,
        rr = n ? topE(tp) * 0.5 : 0;
      opts = { ...opts, on: H.id, t: -1, mirror: false };
      if (opts.x === undefined) {
        opts.x = Math.cos(a) * rr;
        opts.z = Math.sin(a) * rr;
      }
    }
  }
  if (d.surf === 'table' && !hasTbl(m) && !opts.on) return null;
  const mir = opts.mirror ?? S.mirror;

  if (d.single && !opts.restore) {
    const ex = S.items.filter((i) => ITEMS[i.type].group === d.group);
    if (ex.length) {
      for (const i of ex) {
        i.type = type;
        i.pal = opts.pal || S.palette;
      }
      return ex[0];
    }
  }

  const base: PlacedItem = {
    id: opts.id ?? newId(),
    type,
    x: opts.x as number,
    z: opts.z as number,
    ry: opts.ry ?? 0,
    pal: opts.pal ?? S.palette,
    seed: opts.seed ?? newSeed(),
    t: opts.t ?? -1,
    ...(opts.link ? { link: opts.link } : {}),
    ...(opts.text ? { text: opts.text } : {}),
    ...(opts.on ? { on: opts.on } : {}),
    ...(opts.o ? { o: opts.o } : {}),
  };

  if (d.surf === 'table' && !base.on) {
    if (!(base.t >= 0)) base.t = 0;
    if (base.x === undefined) [base.x, base.z] = spotFor(S, type);
    clampIt(S, base);
    if (mir && S.tables.length > 1 && !opts.restore) {
      const link = base.link || newId();
      const made = S.tables.map((_, ti) => {
        const it = { ...base, id: newId(), t: ti, link };
        S.items.push(it);
        return it;
      });
      return made[base.t] || made[0];
    }
  } else if (base.x === undefined) [base.x, base.z] = spotFor(S, type);
  clampIt(S, base);
  S.items.push(base);
  return base;
}

/** Remove pieces and anything stacked on them. */
export function removeItems(S: Design, ids: string[]) {
  const set = new Set(ids);
  // Stacks can nest (a cake on a cake table on a riser), so sweep until stable.
  let grew = true;
  while (grew) {
    grew = false;
    for (const i of S.items)
      if (i.on && set.has(i.on) && !set.has(i.id)) {
        set.add(i.id);
        grew = true;
      }
  }
  S.items = S.items.filter((i) => !set.has(i.id));
  return set;
}

export const removeIt = (S: Design, it: PlacedItem) => removeItems(S, linked(S, it).map((i) => i.id));

/** Pieces that only make sense on existing tables are dropped; mirrored groups are topped up for new tables. */
export function syncTableItems(S: Design) {
  const n = S.tables.length;
  removeItems(
    S,
    S.items.filter((i) => ITEMS[i.type].surf === 'table' && !i.on && i.t >= n).map((i) => i.id),
  );
  const groups: Record<string, PlacedItem[]> = {};
  for (const i of S.items) if (i.link && ITEMS[i.type].surf === 'table') (groups[i.link] ??= []).push(i);
  for (const list of Object.values(groups)) {
    const p = list[0];
    for (let t = 0; t < n; t++) if (!list.some((i) => i.t === t)) S.items.push({ ...p, id: newId(), t });
  }
}

/** Lay the current place setting at every seat on every table. */
export function setAllPlaces(S: Design): number {
  const m = md(S);
  if (!hasTbl(m)) return 0;
  removeItems(
    S,
    S.items.filter((i) => ITEMS[i.type].group === 'place').map((i) => i.id),
  );
  const sp = placeSpots(m),
    stamp = newId();
  S.tables.forEach((_, ti) =>
    sp.forEach(([x, z, ry], j) =>
      addItem(S, S.table.place, {
        x,
        z,
        ry,
        t: ti,
        ...(S.table.placeO && S.table.place === 'place_build' ? { o: S.table.placeO } : {}),
        link: 'pl' + j + stamp,
        restore: true,
      }),
    ),
  );
  return sp.length * S.tables.length;
}

export function setTable(S: Design, p: Partial<TableConfig>) {
  const modeChange = p.mode && p.mode !== md(S);
  Object.assign(S.table, p);
  if (modeChange) {
    S.tables = genTables(p.mode!, S.guests);
    syncTableItems(S);
    if (S.items.some((i) => ITEMS[i.type].group === 'place')) setAllPlaces(S);
    for (const it of S.items) if (!it.on) clampIt(S, it);
  }
}

export function setGuests(S: Design, n: number) {
  S.guests = n;
  const m = md(S);
  if (hasTbl(m)) {
    S.tables = genTables(m, n);
    syncTableItems(S);
  }
  for (const it of S.items) if (!it.on && ITEMS[it.type].surf !== 'table') clampIt(S, it);
}

export function applyTemplate(S: Design, id: string): string | null {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) return null;
  S.items = [];
  S.table = {
    ...DEF_TABLE,
    mode: t.mode,
    cloth: t.cloth ?? null,
    overlay: t.overlay || 'none',
    chair: t.chair ?? null,
    decor: t.decor || 'none',
    decorPal: t.pal,
    place: t.place || 'place_classic',
  };
  S.tables = genTables(t.mode, S.guests);
  S.palette = t.pal;
  for (const [type, x, z, ry = 0] of t.items) addItem(S, type, { x, z, ry, pal: t.pal, mirror: true });
  if (t.place) setAllPlaces(S);
  return t.name;
}

export function swapItem(S: Design, it: PlacedItem, type: string, all: boolean) {
  const list = all ? S.items.filter((i) => i.type === it.type) : linked(S, it);
  if (!S.mirror) list.forEach((i) => (i.link = undefined));
  for (const i of list) {
    i.type = type;
    if (ITEMS[type].opts) i.o = { ...optDef(ITEMS[type]), ...(i.o ?? {}) };
    clampIt(S, i);
  }
  if (ITEMS[type].group === 'place') S.table.place = type;
  return list.length;
}

export function recolor(S: Design, it: PlacedItem, pal: string, all: boolean) {
  const list = all ? S.items.filter((i) => i.type === it.type) : linked(S, it);
  for (const i of list) i.pal = pal;
}

export function setOpt(S: Design, it: PlacedItem, k: string, v: string) {
  const d = ITEMS[it.type];
  const list = d.group === 'place' ? S.items.filter((i) => i.type === it.type) : linked(S, it);
  for (const i of list) i.o = { ...(i.o || {}), [k]: v };
  if (d.group === 'place') S.table.placeO = { ...(it.o || {}), [k]: v };
}

export function rotateItem(S: Design, it: PlacedItem, d: number) {
  for (const i of linked(S, it)) i.ry += d;
}

export function duplicate(S: Design, it: PlacedItem): PlacedItem | null {
  const d = ITEMS[it.type];
  if (d.lock || d.single) return null;
  return addItem(S, it.type, {
    pal: it.pal,
    ry: it.ry,
    t: it.t,
    on: it.on,
    text: it.text,
    o: it.o,
    x: it.x + (d.surf === 'table' ? 0.2 : 0.6),
    z: it.z + (d.surf === 'table' ? 0.1 : 0.4),
  });
}

/** Line up, circle or face-centre a multi-selection of floor and hanging pieces. */
export function arrange(S: Design, ids: string[], kind: 'row' | 'circle' | 'face'): boolean {
  const L = S.items.filter((i) => ids.includes(i.id) && ITEMS[i.type].surf !== 'table');
  if (L.length < 2) return false;
  const cx = L.reduce((a, i) => a + i.x, 0) / L.length,
    cz = L.reduce((a, i) => a + i.z, 0) / L.length;
  if (kind === 'circle') {
    const R = Math.max(1.2, L.reduce((a, i) => a + Math.hypot(i.x - cx, i.z - cz), 0) / L.length);
    L.forEach((i, k) => {
      const a = (k / L.length) * Math.PI * 2;
      i.x = cx + Math.sin(a) * R;
      i.z = cz + Math.cos(a) * R;
      i.ry = a + Math.PI;
    });
  } else if (kind === 'row') {
    const xs = L.map((i) => i.x),
      zs = L.map((i) => i.z),
      alongX = Math.max(...xs) - Math.min(...xs) >= Math.max(...zs) - Math.min(...zs);
    L.sort((a, b) => (alongX ? a.x - b.x : a.z - b.z));
    const a0 = alongX ? L[0].x : L[0].z,
      a1 = alongX ? L[L.length - 1].x : L[L.length - 1].z,
      span = Math.max(a1 - a0, (L.length - 1) * 1.2);
    L.forEach((i, k) => {
      const v = a0 + (span * k) / (L.length - 1);
      if (alongX) {
        i.x = v;
        i.z = cz;
      } else {
        i.z = v;
        i.x = cx;
      }
    });
  } else for (const i of L) i.ry = Math.atan2(-i.x, -i.z);
  for (const i of L) clampIt(S, i);
  return true;
}

/** Centre and half-extent of the current layout, for camera framing. */
export function layoutFrame(S: Design) {
  if (md(S) === 'ceremony') return { x: 0, z: 0.5, ext: Math.max(4, Math.ceil(S.guests / 8) * 0.8) };
  const xs = S.tables.map((t) => t.x),
    zs = S.tables.map((t) => t.z);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    z: (Math.min(...zs) + Math.max(...zs)) / 2,
    ext: Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2,
  };
}
