import * as THREE from 'three';
import { FCOL, FL, GR, I4, VESS, buildArrangement, fc, frame, type Arrangement } from './catalogue.gen';
import { Builder } from '../three/builder';
import { getSeedState, seed, setSeedState } from '../three/utils';

/*
 * Blooms placed by hand in the 3D studios: dragged in from the flower list and dropped exactly where the
 * pointer lands, then free to be dragged around. They sit alongside the automatic recipe, which keeps
 * placing its own stems. Each is built into its own group (tagged with its index) so the viewer can pick
 * one out and move it without rebuilding everything.
 */

export type Vec3 = [number, number, number];
export interface Placed {
  /** flower type (FL) or, with `g`, greenery type (GR) */
  t: string;
  /** colour key or hex; greenery keeps its own colour */
  c: string;
  /** where the head sits, in the model's coordinates */
  p: Vec3;
  /** the way it faces, a unit vector */
  n: Vec3;
  /** twist about the facing direction, radians */
  tw: number;
  g?: boolean;
}
export const MAX_PLACED = 40;

/** Marks an object as the i-th hand-placed piece. */
export const PLACED_TAG = 'placedIndex';
export function placedIndexOf(o: THREE.Object3D | null): number | null {
  for (let x = o; x; x = x.parent) if (typeof x.userData[PLACED_TAG] === 'number') return x.userData[PLACED_TAG] as number;
  return null;
}

/** Orient a group so its local +Y faces `n`. */
export function orientTo(g: THREE.Object3D, p: Vec3, n: Vec3, tw: number) {
  g.position.set(p[0], p[1], p[2]);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...n).normalize());
  g.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), tw));
}

/**
 * Build the hand-placed pieces into `g`. `size` is the bloom scale (heads are built along +Y at the origin
 * and then turned to face `n`); greenery uses `greenSize`.
 */
export function addPlaced(g: THREE.Object3D, placed: Placed[] | undefined, size: number, greenSize = size * 4) {
  if (!placed?.length) return;
  const keep = getSeedState();
  placed.forEach((pl, i) => {
    seed(1000 + i * 97 + Math.round(pl.tw * 1000));
    const pg = new THREE.Group();
    pg.userData[PLACED_TAG] = i;
    pg.userData.tw = pl.tw;
    const B = Builder(pg);
    const up = frame(I4, 0, 0, 0, 0, 1, 0, 0);
    if (pl.g) {
      const G = GR[pl.t];
      if (!G?.h) return;
      G.h(B, up, greenSize * (pl.t === 'pampas' ? 1.5 : 1), G.c);
    } else {
      const f = FL[pl.t];
      if (!f) return;
      f.h(B, up, size * f.s, fc(pl.c));
    }
    B.flush();
    orientTo(pg, pl.p, pl.n, pl.tw);
    g.add(pg);
  });
  setSeedState(keep);
}

/* ------------------------------------------------------------------ arrangements */

export interface FullArrangement extends Arrangement {
  placed?: Placed[];
}

/** The arrangement's envelope centre and radii per vessel (mirrors buildArrangement in catalogue.gen). */
const ENVELOPE: Record<string, { c: Vec3; rad: Vec3 }> = {
  compote: { c: [0, 0.17, 0], rad: [0.24, 0.13, 0.2] },
  lowbowl: { c: [0, 0.1, 0], rad: [0.28, 0.11, 0.24] },
  budvase: { c: [0, 0.28, 0], rad: [0.07, 0.06, 0.07] },
  tallvase: { c: [0, 0.72, 0], rad: [0.28, 0.2, 0.28] },
  urn: { c: [0, 1.3, 0], rad: [0.46, 0.28, 0.4] },
  hanging: { c: [0, 0, 0], rad: [0.7, 0.32, 0.5] },
  handtied: { c: [0, 0.2, 0], rad: [0.13, 0.09, 0.13] },
};

/** Where an arrangement's blooms gather, so a dropped bloom can face outward from it. */
export function arrangementCentre(r: Pick<Arrangement, 'vessel' | 'size'>): Vec3 {
  const e = ENVELOPE[r.vessel] ?? ENVELOPE.compote;
  const sz = r.size || 1;
  // A hand-tied bouquet is built lying on its side: buildArrangement turns its root by π/2 − 0.35 about Z
  // and moves it to (0.02, 0.1), with the blooms gathered 0.06 + 1.5 × rad.y up the (now tilted) stem.
  if (r.vessel === 'handtied') {
    const a = Math.PI / 2 - 0.35,
      up = 0.06 + e.rad[1] * sz * 1.5;
    return [0.02 - Math.sin(a) * up, 0.1 + Math.cos(a) * up, 0];
  }
  if (r.vessel === 'hanging') return e.c;
  return [e.c[0], e.c[1] + (sz - 1) * 0.5 * e.rad[1] * sz, e.c[2]];
}

/** The size of a placed head in this arrangement: the vessel's bloom size, as the recipe uses. */
function bloomSize(r: Pick<Arrangement, 'vessel' | 'size'>) {
  return (VESS[r.vessel]?.b ?? 0.042) * Math.sqrt(r.size || 1);
}
function greenSize(r: Pick<Arrangement, 'vessel' | 'size'>) {
  const e = ENVELOPE[r.vessel] ?? ENVELOPE.compote;
  return Math.max(e.rad[0], e.rad[2]) * (r.size || 1);
}

/** The recipe's arrangement plus the blooms placed by hand. */
export function buildFullArrangement(g: THREE.Object3D, r: FullArrangement) {
  buildArrangement(g, r);
  addPlaced(g, r.placed, bloomSize(r), greenSize(r));
}

/* ------------------------------------------------------------------ validation */

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const vec = (v: unknown, lim: number): Vec3 | null => (Array.isArray(v) && v.length === 3 && v.every(isNum) ? (v.map((x) => Math.max(-lim, Math.min(lim, x))) as Vec3) : null);

/** Coerce untrusted hand-placed pieces (saved data, imported designs) into safe ones. */
export function sanitizePlaced(raw: unknown): Placed[] {
  if (!Array.isArray(raw)) return [];
  const out: Placed[] = [];
  for (const x of raw.slice(0, MAX_PLACED)) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const g = o.g === true;
    if (typeof o.t !== 'string' || !(g ? o.t in GR && GR[o.t].h : o.t in FL)) continue;
    const p = vec(o.p, 4),
      n = vec(o.n, 1);
    if (!p || !n || Math.hypot(...n) < 1e-3) continue;
    const c = typeof o.c === 'string' && (o.c in FCOL || /^#[0-9a-f]{6}$/i.test(o.c)) ? o.c : g ? GR[o.t].c : FL[o.t].c;
    out.push({ t: o.t, c, p, n, tw: isNum(o.tw) ? o.tw % 7 : 0, ...(g ? { g: true } : {}) });
  }
  return out;
}

/**
 * Move hand-placed blooms onto a new vessel or size: each keeps its place relative to the arrangement's
 * centre, scaled to the new envelope, so blooms don't float off when the arrangement changes.
 */
export function refitPlaced(placed: Placed[] | undefined, from: Pick<Arrangement, 'vessel' | 'size'>, to: Pick<Arrangement, 'vessel' | 'size'>): Placed[] | undefined {
  if (!placed?.length) return placed;
  const e0 = ENVELOPE[from.vessel] ?? ENVELOPE.compote,
    e1 = ENVELOPE[to.vessel] ?? ENVELOPE.compote;
  const c0 = arrangementCentre(from),
    c1 = arrangementCentre(to);
  const k = [0, 1, 2].map((i) => (e1.rad[i] * (to.size || 1)) / (e0.rad[i] * (from.size || 1)));
  return placed.map((pl) => ({ ...pl, p: [0, 1, 2].map((i) => c1[i] + (pl.p[i] - c0[i]) * k[i]) as Vec3 }));
}
