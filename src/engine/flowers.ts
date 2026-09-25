import * as THREE from 'three';
import { FCOL, FINS, FL, GR, I4, ITEMS, SHAPES, VESS, buildArrangement, fc, frame, stemTo, type Arrangement } from './catalogue.gen';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Builder, registerKind } from '../three/builder';
import { petalMaterial } from './botany';
import { disposeObject3D, getSeedState, jit, rnd, seed, setSeedState, shared } from '../three/utils';

export { FCOL, FINS, FL, GR, SHAPES, VESS };

/** A saved Flower Studio arrangement. Stored in localStorage under `vs2_custom`, as in the prototype. */
export interface SavedArrangement extends Arrangement {
  id: string;
  name: string;
  seed: number;
  size: number;
  fin: string;
  shape: string;
  stems: Array<{ t: string; c: string; n: number }>;
  greens: Record<string, number>;
}

export type Draft = Omit<SavedArrangement, 'id' | 'name'>;

export const FS_PRESETS: Array<Omit<Draft, 'seed'> & { name: string }> = [
  { name: 'Blush garden', vessel: 'compote', fin: 'ivory', shape: 'dome', size: 1, stems: [{ t: 'rose', c: 'blush', n: 8 }, { t: 'peony', c: 'pink', n: 4 }, { t: 'ranunculus', c: 'peach', n: 6 }, { t: 'spray', c: 'ivory', n: 6 }], greens: { eucalyptus: 6, ivy: 3 } },
  { name: 'White & green', vessel: 'tallvase', fin: 'ivory', shape: 'round', size: 1, stems: [{ t: 'hydrangea', c: 'white', n: 3 }, { t: 'rose', c: 'white', n: 8 }, { t: 'calla', c: 'white', n: 5 }, { t: 'babys', c: 'white', n: 4 }], greens: { ruscus: 8, eucalyptus: 5 } },
  { name: 'Autumn harvest', vessel: 'lowbowl', fin: 'terracotta', shape: 'wild', size: 1.1, stems: [{ t: 'dahlia', c: 'orange', n: 5 }, { t: 'rose', c: 'burgundy', n: 6 }, { t: 'ranunculus', c: 'butter', n: 5 }, { t: 'berries', c: 'plum', n: 5 }], greens: { olive: 6, pampas: 3 } },
  { name: 'Tropical', vessel: 'tallvase', fin: 'ivory', shape: 'wild', size: 1, stems: [{ t: 'orchid', c: 'fuchsia', n: 4 }, { t: 'protea', c: 'blush', n: 3 }, { t: 'anemone', c: 'white', n: 4 }], greens: { palm: 5, ruscus: 4 } },
  { name: 'Bridal cascade', vessel: 'handtied', fin: 'ivory', shape: 'cascade', size: 1, stems: [{ t: 'rose', c: 'ivory', n: 8 }, { t: 'peony', c: 'blush', n: 3 }, { t: 'spray', c: 'white', n: 6 }, { t: 'orchid', c: 'white', n: 2 }], greens: { eucalyptus: 5, ivy: 4 } },
  { name: 'Meadow bud', vessel: 'budvase', fin: 'ivory', shape: 'wild', size: 1, stems: [{ t: 'tulip', c: 'coral', n: 2 }, { t: 'lavender', c: 'purple', n: 2 }, { t: 'babys', c: 'white', n: 1 }], greens: {} },
  { name: 'Statement urn', vessel: 'urn', fin: 'stone', shape: 'cascade', size: 1, stems: [{ t: 'hydrangea', c: 'blush', n: 4 }, { t: 'rose', c: 'blush', n: 10 }, { t: 'delphinium', c: 'blue', n: 4 }, { t: 'peony', c: 'white', n: 5 }], greens: { eucalyptus: 8, ivy: 5, fern: 3 } },
];

export const MAX_STEMS = 30;
export const MAX_GREENS = 20;
const LS_KEY = 'vs2_custom';

export const customKey = (id: string) => `my_${id}`;
export const customIdOf = (type: string) => (type.startsWith('my_') ? type.slice(3) : null);

/** Coerce untrusted arrangement data (localStorage, imported designs) into a safe, buildable arrangement. */
export function sanitizeArrangement(raw: unknown): SavedArrangement | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || !/^[\w-]{1,40}$/.test(o.id)) return null;
  const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  const stems = (Array.isArray(o.stems) ? o.stems : [])
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object' && typeof (s as Record<string, unknown>).t === 'string' && ((s as Record<string, unknown>).t as string) in FL)
    .slice(0, 24)
    .map((s) => ({ t: s.t as string, c: typeof s.c === 'string' && (s.c in FCOL || /^#[0-9a-f]{6}$/i.test(s.c)) ? s.c : FL[s.t as string].c, n: Math.round(num(s.n, 1, MAX_STEMS, 3)) }));
  const greens: Record<string, number> = {};
  if (o.greens && typeof o.greens === 'object')
    for (const [k, v] of Object.entries(o.greens)) if (k in GR) greens[k] = Math.round(num(v, 0, MAX_GREENS, 0));
  if (!stems.length) return null;
  return {
    id: o.id,
    name: typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 60) : 'Untitled arrangement',
    seed: Math.floor(num(o.seed, 0, 1e9, 7)),
    size: num(o.size, 0.6, 1.6, 1),
    vessel: typeof o.vessel === 'string' && o.vessel in VESS ? o.vessel : 'compote',
    fin: typeof o.fin === 'string' && o.fin in FINS ? o.fin : 'ivory',
    shape: typeof o.shape === 'string' && o.shape in SHAPES ? o.shape : 'dome',
    stems,
    greens,
    ...(typeof o.ribbon === 'string' && o.ribbon in FCOL ? { ribbon: o.ribbon } : {}),
  };
}

/** Add (or refresh) a saved arrangement as a catalogue item under "My Flowers" (the prototype's `registerCustom`). */
export function registerCustom(r: SavedArrangement) {
  const V = VESS[r.vessel] || VESS.compote,
    sz = r.size || 1;
  ITEMS[customKey(r.id)] = {
    name: r.name,
    cat: 'mine',
    sec: r.vessel === 'handtied' ? 'Bouquets' : ({ table: 'Table arrangements', floor: 'Floor arrangements', hang: 'Suspended' } as const)[V.surf],
    group: 'mine_' + V.surf,
    surf: V.surf,
    fp: Math.min(0.6, V.fp * (r.vessel === 'budvase' ? 1 : sz)),
    pal: false,
    kw: 'my flowers custom arrangement ' + r.stems.map((s) => FL[s.t]?.n ?? '').join(' '),
    price: Math.round(18 + r.stems.reduce((a, s) => a + s.n * 4.5, 0) + (V.surf === 'floor' ? 120 : V.surf === 'hang' ? 200 : 0)),
    build(g) {
      buildArrangement(g, r);
    },
  };
}

export function loadCustom(): SavedArrangement[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    return Array.isArray(raw) ? raw.map(sanitizeArrangement).filter((x): x is SavedArrangement => !!x) : [];
  } catch {
    return [];
  }
}

export function saveCustomList(list: SavedArrangement[]): boolean {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** Register arrangements that travel with an imported design or share link, keeping any newer local copy. */
export function importArrangements(raw: unknown): number {
  if (!Array.isArray(raw)) return 0;
  const list = loadCustom();
  let n = 0;
  for (const r of raw.map(sanitizeArrangement)) {
    if (!r || list.some((x) => x.id === r.id)) continue;
    list.push(r);
    registerCustom(r);
    n++;
  }
  if (n) saveCustomList(list);
  return n;
}

/** The saved arrangements a design uses, so exports and share links carry them (a gap in the prototype). */
export function arrangementsIn(types: Iterable<string>): SavedArrangement[] {
  const ids = new Set([...types].map(customIdOf).filter((x): x is string => !!x));
  return loadCustom().filter((r) => ids.has(r.id));
}

// Register saved arrangements before anything reads ITEMS (the persisted design may already use them).
for (const r of loadCustom()) registerCustom(r);

/** A single cut stem for the studio's flower and greenery rows (the prototype's `cutStem`). */
export function cutStem(kind: 'flower' | 'green', t: string, c?: string): THREE.Group {
  const keep = getSeedState();
  seed(11);
  const g = new THREE.Group(),
    B = Builder(g),
    sc = '#5f7d45';
  if (kind === 'green') {
    const G = GR[t];
    if (G.tr) {
      let q = [0, 0.2, 0];
      for (let s = 0; s < 14; s++) {
        q = [q[0] + 0.008, q[1] - 0.014, q[2] + (rnd() - 0.5) * 0.006];
        B.add('leaf', q, [0.012, 0.004, 0.02], jit(G.c, 0.12), [rnd(), rnd() * 6.28, 0]);
      }
    } else if (G.h) {
      G.h(B, frame(I4, -0.01, 0, 0, 0.12, 1, 0.1, 0.3), 0.22, G.c);
      G.h(B, frame(I4, 0.012, 0, 0, -0.18, 1, 0.05, 2), 0.17, G.c);
    }
  } else {
    const f = FL[t],
      top = [0.03, 0.17, 0],
      mid = [0.012, 0.08, 0.004];
    stemTo(B, I4, [0, 0, 0], mid, 0.0032, sc);
    stemTo(B, I4, mid, top, 0.003, sc);
    for (const [s, y] of [
      [1, 0.055],
      [-1, 0.1],
    ])
      B.add('leaf', [s * 0.018 + 0.006, y, 0.004], [0.006, 0.003, 0.026], jit('#4f6e3a', 0.08), [0.2, 1.57, s * 0.9]);
    f.h(B, frame(I4, top[0], top[1], top[2], 0.35, 1, 0.7, 0.4), 0.05 * f.s, fc(c ?? f.c));
  }
  B.flush();
  setSeedState(keep);
  return g;
}

/*
 * One flower model everywhere: the catalogue's clustered "rose", "peony" and "ranun" kinds (used by every
 * centrepiece, garland and arch) are baked from the same Flower Studio heads, so tables match the studio.
 */
function bakeHead(t: string, seedN: number): THREE.BufferGeometry {
  const keep = getSeedState();
  seed(seedN);
  const g = new THREE.Group(),
    B = Builder(g);
  FL[t].h(B, I4, 1, '#ffffff');
  B.flush();
  setSeedState(keep);
  const parts: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4(),
    c = new THREE.Color();
  g.traverse((o) => {
    if (!(o instanceof THREE.InstancedMesh)) return;
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m);
      if (o.instanceColor) o.getColorAt(i, c);
      else c.set('#ffffff');
      const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(m);
      // Fold the instance colour into vertex colours so everything merges under one material.
      const n = geo.attributes.position.count,
        src = geo.attributes.color,
        col = new Float32Array(n * 3);
      for (let v = 0; v < n; v++) {
        col[v * 3] = (src ? src.getX(v) : 1) * c.r;
        col[v * 3 + 1] = (src ? src.getY(v) : 1) * c.g;
        col[v * 3 + 2] = (src ? src.getZ(v) : 1) * c.b;
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'color'].includes(k)) geo.deleteAttribute(k);
      parts.push(geo);
    }
  });
  disposeObject3D(g);
  const merged = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  merged.computeBoundingSphere();
  const bs = merged.boundingSphere!;
  merged.translate(-bs.center.x, -bs.center.y, -bs.center.z);
  merged.scale(1 / bs.radius, 1 / bs.radius, 1 / bs.radius);
  return shared(merged);
}

const baked = new Map<string, THREE.BufferGeometry>();
const headKind = (kind: string, t: string, seedN: number) =>
  registerKind(kind, () => {
    let geo = baked.get(kind);
    if (!geo) baked.set(kind, (geo = bakeHead(t, seedN)));
    return [geo, petalMaterial()];
  });
headKind('rose', 'rose', 3);
headKind('peony', 'peony', 5);
headKind('ranun', 'ranunculus', 9);
