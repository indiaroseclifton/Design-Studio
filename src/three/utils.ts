import * as THREE from 'three';

let _s = 1;
export const seed = (n: number) => {
  _s = n >>> 0 || 1;
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

export function noSh<T extends THREE.Object3D>(o: T): T {
  o.castShadow = false;
  return o;
}

export function disposeObject3D(root: THREE.Object3D) {
  root.traverse((o) => {
    const anyO = o as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
    anyO.geometry?.dispose();
    if (anyO.material) {
      (Array.isArray(anyO.material) ? anyO.material : [anyO.material]).forEach((mm) => mm.dispose());
    }
  });
}
