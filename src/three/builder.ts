import * as THREE from 'three';
import { M, jit, pick, rnd } from './utils';

const _c = new THREE.Color(),
  _hsl = { h: 0, s: 0, l: 0 };
/** Round 'leaf' clumps: greyish-brown ones are rocks, everything else is foliage (see engine/foliage.ts). */
const clumpKind = (c: string) => {
  _c.set(c).getHSL(_hsl);
  const green = _hsl.h > 0.13 && _hsl.h < 0.5 && _hsl.s > 0.12;
  return !green && _hsl.s < 0.3 && _hsl.l < 0.6 && KINDS.stone ? 'stone' : 'foliage';
};

export type Vec3Tuple = [number, number, number];
type KindFactory = () => [THREE.BufferGeometry, THREE.Material];

const KINDS: Record<string, KindFactory> = {
  leaf: () => [new THREE.IcosahedronGeometry(1, 1), M('#fff', 0.9, 0, { flatShading: true })],
  trunk: () => [new THREE.CylinderGeometry(0.6, 1, 1, 10), M('#fff', 0.95)],
  rod: () => [new THREE.CylinderGeometry(1, 1, 1, 12), M('#fff', 0.7)],
  cone: () => [new THREE.ConeGeometry(1, 1, 8), M('#fff', 0.9, 0, { flatShading: true })],
  ball: () => [new THREE.SphereGeometry(1, 16, 10), M('#fff', 0.75)],
  hill: () => [new THREE.SphereGeometry(1, 48, 24), M('#fff', 1)],
  box: () => [new THREE.BoxGeometry(1, 1, 1), M('#fff', 0.85)],
  metal: () => [new THREE.CylinderGeometry(1, 1, 1, 16), M('#fff', 0.3, 0.9)],
  crystal: () => [new THREE.OctahedronGeometry(1, 0), new THREE.MeshPhysicalMaterial({ color: '#fff', roughness: 0.02, metalness: 0.2, clearcoat: 1, iridescence: 0.4 })],
  glow: () => [new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff', toneMapped: false })],
  flame: () => [flameGeo(), flameMat()],
};

/*
 * Candle flames: a teardrop (base at y=0, tip at y=1, radius ~0.5) drawn additively with a white-hot core,
 * an orange rim that fades at the silhouette, and a blue base, so a flame reads as light rather than as a
 * solid egg. The instance colour carries the flame's tint times its brightness, which feeds the bloom.
 */
let _flameGeo: THREE.BufferGeometry | null = null;
const flameGeo = () => {
  if (_flameGeo) return _flameGeo;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push(new THREE.Vector2(0.5 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 1.1) * (1 - 0.15 * t), t));
  }
  _flameGeo = new THREE.LatheGeometry(pts, 14);
  return _flameGeo;
};
const flameMat = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: `
      varying float vY; varying float vRim; varying vec3 vTint;
      void main(){
        vY = position.y;
        vec4 wp = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        vec4 mv = modelViewMatrix * wp;
        vec3 n = normal;
        #ifdef USE_INSTANCING
          n = mat3(instanceMatrix) * n;
        #endif
        vec3 vn = normalize(normalMatrix * n);
        vRim = abs(dot(vn, normalize(-mv.xyz)));
        #ifdef USE_INSTANCING_COLOR
          vTint = instanceColor;
        #else
          vTint = vec3(1.0);
        #endif
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vY; varying float vRim; varying vec3 vTint;
      void main(){
        float core = pow(vRim, 3.0) * (1.0 - smoothstep(0.35, 0.95, vY));
        vec3 hot = vec3(1.0, 0.97, 0.86);
        vec3 col = mix(vTint * 0.55, hot * (0.6 + 0.4 * length(vTint) / 1.7), core);
        col = mix(vec3(0.25, 0.4, 1.0) * 0.9, col, smoothstep(0.0, 0.16, vY));
        float a = pow(vRim, 1.4) * smoothstep(0.0, 0.08, vY) * (1.0 - smoothstep(0.75, 1.0, vY) * 0.7);
        gl_FragColor = vec4(col * a, a);
      }`,
  });

/** Register an extra instanced kind (flower heads, baubles…); later builders can `add` it by name. */
export function registerKind(name: string, factory: KindFactory) {
  KINDS[name] = factory;
}

/** Scales steady and flickering venue lights for the time of day, as the prototype's `lightK`. */
export let lightK = 1;
export const setLightK = (k: number) => {
  lightK = k;
};

type Entry = [Vec3Tuple | THREE.Matrix4, number | Vec3Tuple, string, Vec3Tuple | null, number];

export interface Builder {
  add: (k: string, p: Vec3Tuple | number[], s?: number | Vec3Tuple | number[], c?: string, r?: Vec3Tuple | number[] | null, e?: number) => void;
  addM: (k: string, m: THREE.Matrix4, c?: string, e?: number) => void;
  tree: (x: number, z: number, op?: { h?: number; s?: number; y?: number; n?: number; bark?: string; leaf?: string }) => void;
  cypress: (x: number, z: number, h?: number, y0?: number) => void;
  palm: (x: number, z: number, h?: number, dx?: number, dz?: number) => void;
  rose: (x: number, z: number, col: string, s?: number, y0?: number) => void;
  fern: (x: number, z: number, s?: number, col?: string, y0?: number) => void;
  hills: (n: number, cols: string[], rmin: number, rmax: number, y: number, skip?: (a: number) => boolean) => void;
  festoon: (a: Vec3Tuple | number[], b: Vec3Tuple | number[], sag: number, n: number, c?: string, e?: number) => void;
  wire: (a: Vec3Tuple | number[], b: Vec3Tuple | number[]) => void;
  flush: () => void;
}

export function Builder(g: THREE.Object3D): Builder {
  const acc: Record<string, Entry[]> = {};
  const wires: number[] = [];
  const o = new THREE.Object3D();
  o.rotation.order = 'YXZ';

  const B: Builder = {
    add(k, p, s = 1, c = '#fff', r = null, e = 1) {
      // A flat, elongated "leaf" is a leaf blade (foliage in arrangements, fronds, ferns); round ones stay
      // as clumps (shrubs, canopies). See engine/botany.ts.
      if (k === 'leaf') {
        if (Array.isArray(s) && s[1] * 2.2 < Math.max(s[0], s[2])) {
          if (KINDS.blade) k = 'blade';
        } else if (KINDS.foliage) k = clumpKind(c);
      }
      (acc[k] ??= []).push([p as Vec3Tuple, s as number | Vec3Tuple, c, r as Vec3Tuple | null, e]);
    },
    addM(k, m, c = '#fff', e = 1) {
      (acc[k] ??= []).push([m, 1, c, null, e]);
    },
    tree(x, z, op = {}) {
      const h = op.h ?? 4.5,
        s = op.s ?? 1,
        y0 = op.y ?? 0,
        leaf = op.leaf ?? '#4f6b35';
      B.add('trunk', [x, y0 + h / 2, z], [0.22 * s, h, 0.22 * s], op.bark ?? '#5b4634');
      // Two or three limbs splaying into the crown.
      const limbs = 2 + Math.floor(rnd() * 2);
      for (let i = 0; i < limbs; i++) {
        const a = (i / limbs) * Math.PI * 2 + rnd();
        B.add('trunk', [x + Math.sin(a) * 0.35 * s, y0 + h - 0.1 * s, z + Math.cos(a) * 0.35 * s], [0.09 * s, 1.1 * s, 0.09 * s], op.bark ?? '#5b4634', [0.6, a, 0]);
      }
      // A crown of overlapping clumps on a dome: a dense core, then lobes around it that are lighter on top
      // (where the sun catches new growth) and darker underneath.
      const cy = y0 + h + 0.35 * s;
      B.add('leaf', [x, cy, z], [1.35 * s, 1.1 * s, 1.35 * s], jit(leaf, 0.06), [0, rnd() * 6, 0]);
      const n = Math.round((op.n ?? 7) * 1.6);
      for (let i = 0; i < n; i++) {
        const a = i * 2.39996 + rnd() * 0.5,
          u = 1 - 2 * ((i + 0.5) / n) * 0.8,
          r = Math.sqrt(1 - u * u);
        const col = '#' + new THREE.Color(jit(leaf, 0.1)).offsetHSL(0, 0, u * 0.05).getHexString();
        B.add('leaf', [x + Math.sin(a) * r * 1.25 * s, cy + u * 0.95 * s, z + Math.cos(a) * r * 1.25 * s], (0.55 + rnd() * 0.4) * s, col, [rnd() * 3, rnd() * 6, 0]);
      }
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
        if (i > 0 && i < n) B.add('glow', [p[0], p[1] - 0.07, p[2]], 0.034, c, null, e);
        prev = p;
      }
    },
    wire(a, b) {
      wires.push(...a, ...b);
    },
    flush() {
      for (const k in acc) {
        const L = acc[k];
        const factory = KINDS[k];
        if (!factory) throw new Error(`Unknown builder kind "${k}"`);
        const [geo, mat] = factory();
        const im = new THREE.InstancedMesh(geo, mat, L.length);
        const color = new THREE.Color();
        L.forEach(([p, s, c, r, e], i) => {
          if (p instanceof THREE.Matrix4) im.setMatrixAt(i, p);
          else {
            o.position.set(...p);
            if (r) o.rotation.set(r[0], r[1], r[2]);
            else o.rotation.set(0, 0, 0);
            if (Array.isArray(s)) o.scale.set(...s);
            else o.scale.setScalar(s);
            o.updateMatrix();
            im.setMatrixAt(i, o.matrix);
          }
          color.set(c);
          if (e !== 1) color.multiplyScalar(e);
          im.setColorAt(i, color);
        });
        im.castShadow = k !== 'glow' && k !== 'hill' && k !== 'flame';
        im.receiveShadow = k !== 'glow' && k !== 'flame';
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
  l.userData.base = i;
  g.add(l);
  return l;
};

export const flick = (tk: Array<(t: number) => void>, l: THREE.PointLight, base: number, sp = 1) => {
  const ph = Math.random() * 9;
  l.userData.flick = true;
  tk.push((t) => {
    l.intensity = lightK * base * (0.82 + 0.1 * Math.sin(t * 9 * sp + ph) + 0.08 * Math.sin(t * 23 * sp + ph * 2));
  });
};

export function flame(B: Builder, x: number, y: number, z: number, s = 1) {
  // A teardrop 0.24·s tall and ~0.1·s wide whose base sits where the prototype's glow blob began.
  B.add('flame', [x, y - 0.12 * s, z], [0.11 * s, 0.26 * s, 0.11 * s], '#ffa040', null, 2.2);
  // A faint halo around it so the bloom has something to spread.
  B.add('glow', [x, y - 0.02 * s, z], 0.012 * s + 0.004, '#ffb866', null, 3);
}
