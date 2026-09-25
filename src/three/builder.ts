import * as THREE from 'three';
import { M, jit, pick, rnd } from './utils';

type Vec3Tuple = [number, number, number];
type Kind = 'leaf' | 'trunk' | 'rod' | 'cone' | 'ball' | 'hill' | 'box' | 'metal' | 'crystal' | 'glow';

const KINDS: Record<Kind, () => [THREE.BufferGeometry, THREE.Material]> = {
  leaf: () => [new THREE.IcosahedronGeometry(1, 1), M('#fff', 0.9, 0, { flatShading: true })],
  trunk: () => [new THREE.CylinderGeometry(0.6, 1, 1, 8), M('#fff', 0.95)],
  rod: () => [new THREE.CylinderGeometry(1, 1, 1, 12), M('#fff', 0.7)],
  cone: () => [new THREE.ConeGeometry(1, 1, 8), M('#fff', 0.9, 0, { flatShading: true })],
  ball: () => [new THREE.SphereGeometry(1, 16, 10), M('#fff', 0.75)],
  hill: () => [new THREE.SphereGeometry(1, 48, 24), M('#fff', 1)],
  box: () => [new THREE.BoxGeometry(1, 1, 1), M('#fff', 0.85)],
  metal: () => [new THREE.CylinderGeometry(1, 1, 1, 12), M('#fff', 0.3, 0.9)],
  crystal: () => [new THREE.OctahedronGeometry(1, 0), M('#fff', 0.04, 1)],
  glow: () => [new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff' })],
};

type Entry = [Vec3Tuple, number | Vec3Tuple, string, Vec3Tuple | null, number];

export interface Builder {
  add: (k: Kind, p: Vec3Tuple, s?: number | Vec3Tuple, c?: string, r?: Vec3Tuple | null, e?: number) => void;
  tree: (x: number, z: number, op?: { h?: number; s?: number; y?: number; n?: number; bark?: string; leaf?: string }) => void;
  cypress: (x: number, z: number, h?: number, y0?: number) => void;
  palm: (x: number, z: number, h?: number, dx?: number, dz?: number) => void;
  rose: (x: number, z: number, col: string, s?: number, y0?: number) => void;
  fern: (x: number, z: number, s?: number, col?: string, y0?: number) => void;
  hills: (n: number, cols: string[], rmin: number, rmax: number, y: number, skip?: (a: number) => boolean) => void;
  festoon: (a: Vec3Tuple, b: Vec3Tuple, sag: number, n: number, c?: string, e?: number) => void;
  wire: (a: Vec3Tuple, b: Vec3Tuple) => void;
  flush: () => void;
}

export function Builder(g: THREE.Object3D): Builder {
  const acc: Partial<Record<Kind, Entry[]>> = {};
  const wires: number[] = [];
  const o = new THREE.Object3D();
  o.rotation.order = 'YXZ';

  const B: Builder = {
    add(k, p, s = 1, c = '#fff', r = null, e = 1) {
      (acc[k] ??= []).push([p, s, c, r, e]);
    },
    tree(x, z, op = {}) {
      const h = op.h ?? 4.5,
        s = op.s ?? 1,
        y0 = op.y ?? 0;
      B.add('trunk', [x, y0 + h / 2, z], [0.22 * s, h, 0.22 * s], op.bark ?? '#5b4634');
      const n = op.n ?? 7;
      for (let i = 0; i < n; i++)
        B.add(
          'leaf',
          [x + (rnd() - 0.5) * 2.4 * s, y0 + h + (rnd() - 0.3) * 1.6 * s, z + (rnd() - 0.5) * 2.4 * s],
          (0.9 + rnd() * 0.9) * s,
          jit(op.leaf ?? '#4f6b35', 0.12),
        );
    },
    cypress(x, z, h = 7, y0 = 0) {
      B.add('trunk', [x, y0 + 0.6, z], [0.12, 1.2, 0.12], '#4a3a2a');
      B.add('leaf', [x, y0 + h / 2 + 0.6, z], [h * 0.1, h / 2, h * 0.1], jit('#2d4527', 0.06));
    },
    palm(x, z, h = 6, dx = 0.8, dz = 0) {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        B.add(
          'trunk',
          [x + dx * t * t, (i + 0.5) * (h / n), z + dz * t * t],
          [0.17 - 0.05 * t, h / n + 0.06, 0.17 - 0.05 * t],
          jit('#8a7050', 0.05),
        );
      }
      const tx = x + dx,
        tz = z + dz;
      B.add('ball', [tx, h, tz], 0.28, '#5a4a30');
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + rnd() * 0.3;
        B.add(
          'leaf',
          [tx + Math.sin(a) * 1.35, h - 0.35, tz + Math.cos(a) * 1.35],
          [0.34, 0.05, 1.55],
          jit('#3f6b2e', 0.1),
          [0.4 + rnd() * 0.35, a, 0],
        );
      }
    },
    rose(x, z, col, s = 0.5, y0 = 0) {
      B.add('leaf', [x, y0 + s * 0.9, z], s, jit('#3d5a2c', 0.1));
      for (let i = 0; i < 12; i++) {
        const u = rnd() * Math.PI * 2,
          v = rnd() * 1.3;
        B.add(
          'ball',
          [x + Math.cos(u) * Math.sin(v) * s, y0 + s * 0.9 + Math.cos(v) * s, z + Math.sin(u) * Math.sin(v) * s],
          0.14 * s,
          jit(col, 0.08),
        );
      }
    },
    fern(x, z, s = 1, col = '#4c7a34', y0 = 0) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + rnd();
        B.add(
          'leaf',
          [x + Math.sin(a) * 0.5 * s, y0 + 0.25 * s, z + Math.cos(a) * 0.5 * s],
          [0.16 * s, 0.03 * s, 0.6 * s],
          jit(col, 0.1),
          [-0.5, a, 0],
        );
      }
    },
    hills(n, cols, rmin, rmax, y, skip) {
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2;
        if (skip && skip(a)) continue;
        const r = rmin + rnd() * (rmax - rmin),
          R = 25 + rnd() * 40;
        B.add('hill', [Math.sin(a) * r, y - R * 0.05, Math.cos(a) * r], [R, R * 0.24, R * (0.7 + rnd() * 0.6)], jit(pick(cols), 0.05), [0, rnd() * 3, 0]);
      }
    },
    festoon(a, b, sag, n, c = '#ffcf8a', e = 4) {
      let prev: Vec3Tuple | null = null;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const p: Vec3Tuple = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
        if (prev) wires.push(...prev, ...p);
        if (i > 0 && i < n) B.add('glow', [p[0], p[1] - 0.07, p[2]], 0.045, c, null, e);
        prev = p;
      }
    },
    wire(a, b) {
      wires.push(...a, ...b);
    },
    flush() {
      for (const k in acc) {
        const L = acc[k as Kind]!;
        const [geo, mat] = KINDS[k as Kind]();
        const im = new THREE.InstancedMesh(geo, mat, L.length);
        const color = new THREE.Color();
        L.forEach(([p, s, c, r, e], i) => {
          o.position.set(...p);
          if (r) o.rotation.set(r[0], r[1], r[2]);
          else o.rotation.set(0, 0, 0);
          if (Array.isArray(s)) o.scale.set(...s);
          else o.scale.setScalar(s);
          o.updateMatrix();
          im.setMatrixAt(i, o.matrix);
          color.set(c);
          if (e !== 1) color.multiplyScalar(e);
          im.setColorAt(i, color);
        });
        im.castShadow = k !== 'glow' && k !== 'hill';
        im.receiveShadow = k !== 'glow';
        g.add(im);
      }
      if (wires.length) {
        const bg = new THREE.BufferGeometry();
        bg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
        g.add(new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: '#1b1712' })));
      }
    },
  };
  return B;
}

export const plight = (g: THREE.Object3D, c: string, i: number, d: number, x: number, y: number, z: number) => {
  const l = new THREE.PointLight(c, i, d, 1.6);
  l.position.set(x, y, z);
  g.add(l);
  return l;
};

export const flick = (tk: Array<(t: number) => void>, l: THREE.PointLight, base: number, sp = 1) => {
  const ph = Math.random() * 9;
  l.userData.flick = true;
  tk.push((t) => {
    l.intensity = base * (0.82 + 0.1 * Math.sin(t * 9 * sp + ph) + 0.08 * Math.sin(t * 23 * sp + ph * 2));
  });
};

export function flame(B: Builder, x: number, y: number, z: number, s = 1) {
  B.add('glow', [x, y, z], [0.07 * s, 0.13 * s, 0.07 * s], '#ffb050', null, 6);
  B.add('glow', [x, y - 0.03 * s, z], [0.1 * s, 0.1 * s, 0.1 * s], '#ff7a2a', null, 3);
}
