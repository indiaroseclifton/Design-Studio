import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { M, jit, mesh, noSh, pick, rnd, shared, cyl } from '../three/utils';
import { flame, registerKind, type Builder, type Vec3Tuple } from '../three/builder';
import { brass, china, chargerGeo, dinnerPlateGeo, forkGeo, glassM, knifeGeo, saladPlateGeo, silver, spoonGeo, tumblerGeo, wax, wineGeo } from './materials';
import type { Pal } from './studio';
import { petalGeometry, petalMaterial } from './botany';

/**
 * A hydrangea head: a dome of ~40 florets, each four small cupped petals around a tiny centre, so the head
 * reads as a mass of little flowers instead of a faceted ball.
 */
function hydraGeo() {
  const parts: THREE.BufferGeometry[] = [],
    up = new THREE.Vector3(0, 1, 0),
    petal = petalGeometry({ res: [4, 5], cup: 0.5, reflex: 0.2, ruffle: 0, round: 1 });
  petal.deleteAttribute('uv');
  const N = 40;
  for (let i = 0; i < N; i++) {
    const u = i * 2.39996,
      v = Math.acos(1 - ((i + 0.5) / N) * 1.45),
      n = new THREE.Vector3(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)),
      q = new THREE.Quaternion().setFromUnitVectors(up, n),
      tw = (i * 0.7) % (Math.PI / 2);
    for (let k = 0; k < 4; k++) {
      const g = petal.clone();
      // Petal lies in its own x-y plane pointing +y; lay it flat and out from the floret's centre.
      g.translate(0, 1, 0);
      g.scale(0.085, 0.1, 0.085);
      g.rotateX(-Math.PI / 2 + 0.25);
      g.rotateY(tw + (k * Math.PI) / 2);
      g.applyQuaternion(q);
      g.translate(n.x * 0.78, n.y * 0.78, n.z * 0.78);
      parts.push(g);
    }
  }
  petal.dispose();
  const m = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return shared(m);
}

const lazy = <T,>(f: () => T) => {
  let v: T | undefined;
  return () => (v ??= f());
};
const hydraG = lazy(hydraGeo);
// The 'rose', 'peony' and 'ranun' kinds are baked from the Flower Studio heads in engine/flowers.ts.
registerKind('hydra', () => [hydraG(), petalMaterial()]);

const BK = ['rose', 'rose', 'rose', 'peony', 'peony', 'ranun', 'ranun', 'hydra'];

export function addBloom(B: Builder, p: Vec3Tuple | number[], r: number, col: string, n: Vec3Tuple | number[] = [0, 1, 0]) {
  const k = pick(BK),
    l = Math.hypot(n[0], n[1], n[2]) || 1,
    ny = n[1] / l,
    c = k === 'hydra' ? '#' + new THREE.Color(col).lerp(new THREE.Color('#ffffff'), 0.15).getHexString() : col;
  B.add(k, p, r * (k === 'hydra' ? 1.35 : k === 'peony' ? 1.25 : 1.1), jit(c, 0.05), [Math.acos(Math.max(-1, Math.min(1, ny))), Math.atan2(n[0] / l, n[2] / l), 0]);
}

export function cluster(B: Builder, c: Vec3Tuple | number[], rad: Vec3Tuple | number[], n: number, p: Pal, sz: number, full?: boolean) {
  for (let i = 0; i < n; i++) {
    const u = rnd() * 6.283,
      v = full ? Math.acos(1 - 1.6 * rnd()) : Math.acos(rnd()),
      pos: Vec3Tuple = [c[0] + Math.sin(v) * Math.cos(u) * rad[0], c[1] + Math.cos(v) * rad[1], c[2] + Math.sin(v) * Math.sin(u) * rad[2]],
      r = sz * (0.7 + rnd() * 0.6),
      col = pick(p.b);
    addBloom(B, pos, r, col, [pos[0] - c[0], (pos[1] - c[1]) * 2 + 0.3 * rad[1], pos[2] - c[2]]);
  }
  for (let i = 0; i < n * 1.4; i++) {
    const u = rnd() * 6.283,
      v = full ? Math.acos(1 - 1.8 * rnd()) : Math.acos(rnd() * 0.9),
      k = 1 + rnd() * 0.15;
    B.add(
      'leaf',
      [c[0] + Math.sin(v) * Math.cos(u) * rad[0] * k, c[1] + Math.cos(v) * rad[1] * k, c[2] + Math.sin(v) * Math.sin(u) * rad[2] * k],
      [sz * 0.35, sz * 0.1, sz * 1.1],
      jit(p.g, 0.1),
      [rnd() * 1.2 - 0.6, rnd() * 6.28, 0],
    );
  }
  for (let i = 0; i < n; i++) {
    const u = rnd() * 6.283,
      v = full ? Math.acos(1 - 1.6 * rnd()) : Math.acos(rnd()),
      k = 1.05 + rnd() * 0.1;
    B.add(
      'ball',
      [c[0] + Math.sin(v) * Math.cos(u) * rad[0] * k, c[1] + Math.cos(v) * rad[1] * k, c[2] + Math.sin(v) * Math.sin(u) * rad[2] * k],
      sz * 0.16,
      jit(p.b[2], 0.05),
    );
  }
}

export function trail(B: Builder, s: Vec3Tuple | number[], dir: number[], steps: number, p: Pal, sz: number) {
  let [x, y, z] = s;
  for (let i = 0; i < steps; i++) {
    x += dir[0] * sz * 1.1;
    z += dir[1] * sz * 1.1;
    y -= sz * (0.5 + i * 0.22);
    B.add('leaf', [x, y, z], [sz * 0.4, sz * 0.1, sz * 0.9], jit(p.g, 0.1), [rnd(), rnd() * 6.28, 0]);
    if (rnd() < 0.3) B.add('ball', [x, y, z], sz * 0.3, jit(pick(p.b), 0.05));
  }
}

export function bloomsAlong(B: Builder, cv: THREE.Curve<THREE.Vector3>, a: number, b: number, st: number, sp: number, sz: number, p: Pal) {
  for (let t = a; t <= b; t += st) {
    const q = cv.getPointAt(t);
    for (let j = 0; j < 2; j++) {
      const c = pick(p.b),
        r = sz * (0.7 + rnd() * 0.6),
        pp: Vec3Tuple = [q.x + (rnd() - 0.5) * sp, q.y + (rnd() - 0.5) * sp, q.z + (rnd() - 0.5) * sp * 0.8];
      addBloom(B, pp, r, c, [0, 0.35, 1]);
    }
    for (let j = 0; j < 4; j++)
      B.add(
        'leaf',
        [q.x + (rnd() - 0.5) * sp * 1.4, q.y + (rnd() - 0.5) * sp * 1.4, q.z + (rnd() - 0.5) * sp],
        [sz * 0.4, sz * 0.12, sz * 1.2],
        jit(p.g, 0.1),
        [rnd() * 2, rnd() * 6.28, 0],
      );
    B.add('ball', [q.x + (rnd() - 0.5) * sp * 1.3, q.y + (rnd() - 0.5) * sp * 1.3, q.z + (rnd() - 0.5) * sp], sz * 0.18, p.b[2]);
  }
}

export const needle = (B: Builder, x: number, y: number, z: number, col = '#2f5230') =>
  B.add('cone', [x, y, z], [0.01, 0.07, 0.01], jit(col, 0.1), [rnd() * 3, rnd() * 6, rnd() * 3]);

export function runnerB(g: THREE.Object3D, m: THREE.Material, L: number, w = 0.38, drop = 0.26) {
  noSh(mesh(g, new THREE.PlaneGeometry(L, w), m, 0, 0.003, 0)).rotation.x = -Math.PI / 2;
  for (const s of [-1, 1]) {
    const d = noSh(mesh(g, new THREE.PlaneGeometry(w, drop), m, s * (L / 2 + 0.004), 0.003 - drop / 2, 0));
    d.rotation.y = Math.PI / 2;
  }
}

export interface PlaceOpts {
  /** charger [colour, roughness, metalness] */
  ch?: [string, number, number];
  plate?: THREE.Material;
  rim?: boolean;
  /** 'fold' lays a folded napkin with a sprig; anything else a gathered napkin */
  nap?: string;
  cut?: THREE.Material;
  gm?: THREE.Material;
}

const napBase = lazy(() => shared(new RoundedBoxGeometry(0.13, 0.008, 0.075, 2, 0.0035)));
const napFlap = lazy(() => shared(new RoundedBoxGeometry(0.122, 0.005, 0.05, 2, 0.0025)));

/** Flatware laid either side of the plate: forks left, knife and spoon right. */
export function flatware(g: THREE.Object3D, cm: THREE.Material) {
  const put = (geo: THREE.BufferGeometry, x: number) => noSh(mesh(g, geo, cm, x, 0.002, 0));
  put(forkGeo, -0.2);
  put(forkGeo, -0.232).scale.set(0.9, 1, 0.92);
  put(knifeGeo, 0.2);
  put(spoonGeo, 0.235);
}

/** A place setting: charger, lathe-turned plates, napkin, flatware and glassware. */
export function placeB(g: THREE.Object3D, B: Builder, p: Pal, o: PlaceOpts) {
  if (o.ch) mesh(g, chargerGeo, M(...o.ch), 0, 0, 0);
  const pm = o.plate || china;
  mesh(g, dinnerPlateGeo, pm, 0, 0.012, 0);
  mesh(g, saladPlateGeo, pm, 0, 0.028, 0);
  if (o.rim) {
    const r = mesh(g, new THREE.TorusGeometry(0.128, 0.003, 4, 48), brass, 0, 0.028, 0);
    r.rotation.x = Math.PI / 2;
  }
  const nm = new THREE.MeshPhysicalMaterial({ color: p.f, roughness: 0.95, sheen: 0.5 });
  if (o.nap === 'fold') {
    // A folded napkin: a soft rectangle with its top layer turned back to show the fold.
    const n = new THREE.Group();
    n.position.set(0, 0.041, 0.01);
    n.rotation.y = 0.25;
    g.add(n);
    mesh(n, napBase(), nm, 0, 0.004, 0);
    const flap = mesh(n, napFlap(), nm, 0.004, 0.0105, -0.006);
    flap.rotation.y = 0.04;
    // A single rose and a leaf tucked on the fold.
    B.add('rose', [0.035, 0.066, 0.004], 0.014, pick(p.b));
    B.add('leaf', [0.014, 0.059, 0.014], [0.008, 0.003, 0.028], p.g, [0, 0.8, 0]);
  } else {
    B.add('ball', [0, 0.052, 0], [0.055, 0.018, 0.035], p.f);
    B.add('ball', [0, 0.058, 0], 0.02, jit(p.f, 0.1));
  }
  flatware(g, o.cut || silver);
  const gw = o.gm || glassM;
  noSh(mesh(g, wineGeo, gw, 0.1, 0, -0.22));
  noSh(mesh(g, tumblerGeo, gw, 0.19, 0.05, -0.16));
  noSh(cyl(g, 0.03, 0.03, 0.006, gw, 0.19, 0.003, -0.16, 24));
}

export const taper = (g: THREE.Object3D, B: Builder, x: number, y: number, z: number, h = 0.22, m: THREE.Material = wax) => {
  cyl(g, 0.01, 0.011, h, m, x, y + h / 2, z, 12);
  flame(B, x, y + h + 0.025, z, 0.32);
};

/** Canvas text on paper, for menus, signs and escort cards. Script text auto-shrinks to fit. */
export function textTex(main: string, sub = '', o: { w?: number; h?: number; bg?: string; border?: string; ink?: string; fs?: number } = {}) {
  const w = o.w || 512,
    h = o.h || 360,
    c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d')!;
  x.fillStyle = o.bg || '#fbf8f1';
  x.fillRect(0, 0, w, h);
  if (o.border) {
    x.strokeStyle = o.border;
    x.lineWidth = 5;
    x.strokeRect(16, 16, w - 32, h - 32);
  }
  x.fillStyle = o.ink || '#3a3028';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  let fs = o.fs || h * 0.3;
  const F = (s: number) => `italic 500 ${s}px "Cormorant Garamond",Georgia,serif`;
  x.font = F(fs);
  while (x.measureText(main).width > w * 0.84 && fs > 12) {
    fs -= 2;
    x.font = F(fs);
  }
  x.fillText(main, w / 2, sub ? h * 0.44 : h / 2);
  if (sub) {
    x.font = `500 ${Math.round(h * 0.065)}px Jost,sans-serif`;
    x.fillText(sub.toUpperCase().split('').join(' '), w / 2, h * 0.7);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
