import * as THREE from 'three';

let _s = 1;
export const seed = (n: number) => {
  _s = n >>> 0 || 1;
};
/** Raw PRNG state, so code that needs its own deterministic stream can save and restore the caller's. */
export const getSeedState = () => _s;
export const setSeedState = (v: number) => {
  _s = v;
};
export const rnd = () => {
  _s |= 0;
  _s = (_s + 0x6d2b79f5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];

const _c = new THREE.Color();
const _hsl = { h: 0, s: 0, l: 0 };
export const jit = (h: string, a = 0.06) => {
  _c.set(h);
  _c.getHSL(_hsl);
  _c.setHSL(_hsl.h, _hsl.s, Math.min(1, Math.max(0, _hsl.l + (rnd() - 0.5) * a)));
  return '#' + _c.getHexString();
};

export const M = (c: string, r = 0.85, m = 0, x: Record<string, unknown> = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...x });

export function mesh(
  p: THREE.Object3D,
  geo: THREE.BufferGeometry,
  m: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  p.add(o);
  return o;
}

export const box = (
  p: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  m: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) => mesh(p, new THREE.BoxGeometry(w, h, d), m, x, y, z);

export const cyl = (
  p: THREE.Object3D,
  rt: number,
  rb: number,
  h: number,
  m: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  seg = 16,
) => mesh(p, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);

export function ground(p: THREE.Object3D, m: THREE.Material, size: number, y = 0) {
  const o = mesh(p, new THREE.PlaneGeometry(size, size), m, 0, y, 0);
  o.rotation.x = -Math.PI / 2;
  o.castShadow = false;
  return o;
}

/** Module-level materials, geometries and textures reused by many builds; `disposeObject3D` leaves them alone. */
const SHARED = new WeakSet<object>();
export const shared = <T extends object>(x: T): T => {
  SHARED.add(x);
  return x;
};

export function disposeObject3D(root: THREE.Object3D) {
  root.traverse((o) => {
    const anyO = o as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
    if (anyO.geometry && !SHARED.has(anyO.geometry)) anyO.geometry.dispose();
    if (anyO.material) {
      for (const mm of Array.isArray(anyO.material) ? anyO.material : [anyO.material]) {
        if (SHARED.has(mm)) continue;
        for (const v of Object.values(mm)) if (v instanceof THREE.Texture && !SHARED.has(v)) v.dispose();
        mm.dispose();
      }
    }
  });
}

export const lathe = (pts: Array<[number, number]>, s = 24) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), s);

/** Turn off shadow casting (glass, fabric sheers, emissive pieces) and return the object. */
export const noSh = <T extends THREE.Object3D>(o: T): T => {
  o.castShadow = false;
  return o;
};
