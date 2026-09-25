import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M, jit, mesh, noSh, pick, rnd, shared, cyl } from '../three/utils';
import { flame, registerKind, type Builder, type Vec3Tuple } from '../three/builder';
import { brass, china, chargerGeo, dinnerPlateGeo, forkGeo, glassM, knifeGeo, saladPlateGeo, silver, spoonGeo, tumblerGeo, wax, wineGeo } from './materials';
import type { Pal } from './studio';

/* Flower heads: petals arranged on a golden-angle spiral and merged into one normalised geometry. */
function petalFlower(n: number, r0: number, r1: number, t0: number, t1: number, s0: number, s1: number, dep = 0.12) {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1),
      a = i * 2.39996,
      sx = s0 + (s1 - s0) * t,
      sy = sx * 1.25;
    // Cupped petals (a squashed hemisphere) read far better than the prototype's flat discs.
    const g = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.62);
    g.scale(sx, sy, dep);
    g.translate(0, sy * 0.9, 0);
    g.rotateX(t0 + (t1 - t0) * t);
    g.rotateY(a);
    const r = r0 + (r1 - r0) * t;
    g.translate(Math.sin(a) * r, 0, Math.cos(a) * r);
    parts.push(g.toNonIndexed());
  }
  const m = mergeGeometries(parts)!;
  m.computeVertexNormals();
  m.computeBoundingSphere();
  const bs = m.boundingSphere!;
  m.translate(-bs.center.x, -bs.center.y, -bs.center.z);
  m.scale(1 / bs.radius, 1 / bs.radius, 1 / bs.radius);
  return shared(m);
}

function hydraGeo() {
  const parts: THREE.BufferGeometry[] = [],
    up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 22; i++) {
    const u = i * 2.39996,
      v = Math.acos(1 - ((i + 0.5) / 22) * 1.4),
      n = new THREE.Vector3(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)),
      q = new THREE.Quaternion().setFromUnitVectors(up, n);
    for (let k = 0; k < 4; k++) {
      const g = new THREE.SphereGeometry(1, 6, 4);
      g.scale(0.13, 0.03, 0.2);
      g.translate(0, 0, 0.14);
      g.rotateY((k * Math.PI) / 2);
      g.applyQuaternion(q);
      g.translate(n.x * 0.75, n.y * 0.75, n.z * 0.75);
      parts.push(g);
    }
  }
  return shared(mergeGeometries(parts)!);
}

const lazy = <T,>(f: () => T) => {
  let v: T | undefined;
  return () => (v ??= f());
};
const roseG = lazy(() => petalFlower(16, 0.02, 0.36, 0.15, 1.05, 0.22, 0.42));
const peonyG = lazy(() => petalFlower(28, 0.05, 0.5, 0.35, 1.35, 0.3, 0.5, 0.1));
const ranunG = lazy(() => petalFlower(34, 0.01, 0.36, 0.08, 0.95, 0.12, 0.3, 0.1));
const hydraG = lazy(hydraGeo);
// Petals get a touch of sheen and translucency-like softness.
const petalMat = (r: number) => new THREE.MeshPhysicalMaterial({ color: '#fff', roughness: r, sheen: 0.6, sheenRoughness: 0.5, side: THREE.DoubleSide });
registerKind('rose', () => [roseG(), petalMat(0.6)]);
registerKind('peony', () => [peonyG(), petalMat(0.7)]);
registerKind('ranun', () => [ranunG(), petalMat(0.6)]);
registerKind('hydra', () => [hydraG(), petalMat(0.75)]);

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
    const n = mesh(g, new THREE.BoxGeometry(0.13, 0.018, 0.075), nm, 0, 0.049, 0.01);
    n.rotation.y = 0.25;
    B.add('leaf', [0.035, 0.064, 0], 0.016, pick(p.b));
    B.add('leaf', [0.012, 0.061, 0.012], [0.008, 0.003, 0.028], p.g, [0, 0.8, 0]);
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
