import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { M, box, cyl, getSeedState, jit, mesh, rnd, seed, setSeedState, shared } from '../three/utils';
import { T } from '../three/textures';
import { ghostM, woodM } from './materials';
import type { ChairStyle, TableConfig, TableLayout, TablePos } from '../types';

/* ------------------------------------------------------------------ palettes */

export interface Pal {
  name: string;
  /** bloom colours */
  b: string[];
  /** greenery */
  g: string;
  /** fabric */
  f: string;
  /** charger [colour, roughness, metalness] */
  ch: [string, number, number];
}

export const PALS: Record<string, Pal> = {
  blush: { name: 'Blush', b: ['#f4c7cf', '#e89aa9', '#fff3ec', '#f7d5bd', '#d97a8c'], g: '#6f8a5a', f: '#e8cbc4', ch: ['#c9a25a', 0.3, 0.85] },
  ivory: { name: 'Ivory', b: ['#fbf7ee', '#f1ead8', '#fffaf0', '#e6e9d6', '#f3e6cf'], g: '#7d9468', f: '#e9e2d0', ch: ['#d8d2c4', 0.25, 0.9] },
  jewel: { name: 'Jewel', b: ['#7a1f35', '#a8324a', '#5a2a5e', '#d9772e', '#e8b04a'], g: '#4a6a3a', f: '#5a2436', ch: ['#9a6a3a', 0.35, 0.8] },
  meadow: { name: 'Meadow', b: ['#f2c94c', '#7a9ad8', '#f39ab0', '#ffffff', '#c9a0e0'], g: '#6a8a44', f: '#b7c49a', ch: ['#b8925a', 0.8, 0] },
  winter: { name: 'Winter', b: ['#b3192b', '#e8e2d6', '#8a1020', '#d9b35a', '#ffffff'], g: '#2f5230', f: '#9a1c28', ch: ['#c9a25a', 0.3, 0.85] },
  marigold: { name: 'Marigold', b: ['#f39a1e', '#ffc31f', '#e0561c', '#c2185b', '#ffe08a'], g: '#4f7a2a', f: '#c2185b', ch: ['#c9a25a', 0.3, 0.85] },
  sapphire: { name: 'Sapphire', b: ['#ffffff', '#9fb8e6', '#2a4a8f', '#dfe8f7', '#c9d4e8'], g: '#6d8a7a', f: '#27427f', ch: ['#cfd4da', 0.25, 0.95] },
  custom: { name: 'Custom', b: ['#d8a7b1', '#b6c9bb', '#f5efe6', '#e3c29b', '#9c6b8e'], g: '#6f8a5a', f: '#d8c3b0', ch: ['#c9a25a', 0.3, 0.85] },
};
export const DEFAULT_PAL = 'blush';

/** Resolve a palette id, applying the user's custom colours to the "custom" palette. */
export function palOf(id: string | undefined, custom?: { b?: string[]; g?: string; f?: string }): Pal {
  if (id === 'custom' && custom) return { ...PALS.custom, ...custom, b: custom.b?.length === 5 ? custom.b : PALS.custom.b };
  return PALS[id ?? DEFAULT_PAL] ?? PALS[DEFAULT_PAL];
}

/* ------------------------------------------------------------------- fabric */

export interface FabricDef {
  name?: string;
  c?: string;
  tex?: 'linen' | 'hessian' | 'sequin' | 'tartan' | 'gingham' | 'kente' | 'picado' | 'lace' | 'rangoli';
  r?: number;
  m?: number;
  velvet?: string;
  op?: number;
  bare?: boolean;
}

type Draw = (x: CanvasRenderingContext2D, w: number, h: number) => void;
const texCache = new Map<string, THREE.Texture>();

export function clothTex(kind: NonNullable<FabricDef['tex']>, c: string): THREE.Texture {
  const k = kind + c;
  const hit = texCache.get(k);
  if (hit) return hit;
  const keep = getSeedState();
  seed(99);
  let d: Draw;
  if (kind === 'linen')
    d = (x, w, h) => {
      x.fillStyle = c;
      x.fillRect(0, 0, w, h);
      x.globalAlpha = 0.07;
      for (let i = 0; i < h; i += 2) {
        x.fillStyle = (i / 2) % 2 ? '#000' : '#fff';
        x.fillRect(0, i, w, 1);
      }
      for (let i = 0; i < w; i += 2) {
        x.fillStyle = rnd() < 0.5 ? '#000' : '#fff';
        x.fillRect(i, 0, 1, h);
      }
      x.globalAlpha = 1;
    };
  else if (kind === 'hessian')
    d = (x, w, h) => {
      x.fillStyle = c;
      x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(60,40,20,.28)';
      for (let i = 0; i < w; i += 4) {
        x.fillRect(i, 0, 1.5, h);
        x.fillRect(0, i, w, 1.5);
      }
      x.globalAlpha = 0.15;
      for (let i = 0; i < 400; i++) {
        x.fillStyle = rnd() < 0.5 ? '#000' : '#fff';
        x.fillRect(rnd() * w, rnd() * h, rnd() * 14, 1.5);
      }
      x.globalAlpha = 1;
    };
  else if (kind === 'sequin')
    d = (x, w, h) => {
      x.fillStyle = c;
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < w; i += 8)
        for (let j = 0; j < h; j += 8) {
          x.fillStyle = jit(c, 0.4);
          x.beginPath();
          x.arc(i + 4 + ((j / 8) % 2) * 4, j + 4, 3.4, 0, 7);
          x.fill();
        }
    };
  else if (kind === 'tartan')
    d = (x, w, h) => {
      x.fillStyle = '#a3141e';
      x.fillRect(0, 0, w, h);
      for (const [o, s, col] of [
        [0, 40, 'rgba(20,50,30,.75)'],
        [60, 14, 'rgba(15,25,60,.7)'],
        [100, 4, 'rgba(240,210,120,.8)'],
        [150, 40, 'rgba(20,50,30,.75)'],
        [210, 6, 'rgba(255,255,255,.55)'],
      ] as Array<[number, number, string]>) {
        x.fillStyle = col;
        x.fillRect(o, 0, s, h);
        x.fillRect(0, o, w, s);
      }
    };
  else if (kind === 'gingham')
    d = (x, w, h) => {
      x.fillStyle = '#fbfaf5';
      x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(140,160,120,.5)';
      for (let i = 0; i < w; i += 32) {
        x.fillRect(i, 0, 16, h);
        x.fillRect(0, i, w, 16);
      }
    };
  else if (kind === 'kente')
    d = (x, w, h) => {
      const cs = ['#e8b020', '#1f7a3a', '#c8261e', '#111111', '#e8b020', '#2a4a9a'];
      for (let i = 0; i < 16; i++) {
        x.fillStyle = cs[i % cs.length];
        x.fillRect(0, (i * h) / 16, w, h / 16);
      }
      for (let i = 0; i < 8; i++)
        for (let j = 0; j < 16; j++)
          if ((i + j) % 3 === 0) {
            x.fillStyle = cs[(i * 2 + j + 1) % cs.length];
            x.fillRect((i * w) / 8, (j * h) / 16, w / 16, h / 16);
          }
      x.fillStyle = 'rgba(0,0,0,.22)';
      for (let i = 0; i < w; i += 3) x.fillRect(i, 0, 1, h);
    };
  else if (kind === 'picado')
    d = (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.fillStyle = '#fff';
      x.fillRect(0, 0, w, h * 0.86);
      for (let i = 0; i < 8; i++) {
        x.beginPath();
        x.arc(((i + 0.5) * w) / 8, h * 0.86, w / 16, 0, Math.PI);
        x.fill();
      }
      x.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 5; j++) {
          const cx = ((i + 0.5) * w) / 4,
            cy = ((j + 0.6) * h) / 6;
          x.beginPath();
          if ((i + j) % 2) {
            x.moveTo(cx, cy - 14);
            x.lineTo(cx + 10, cy);
            x.lineTo(cx, cy + 14);
            x.lineTo(cx - 10, cy);
          } else x.arc(cx, cy, 9, 0, 7);
          x.fill();
        }
      x.globalCompositeOperation = 'source-over';
    };
  else if (kind === 'lace')
    d = (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.strokeStyle = c;
      x.fillStyle = c;
      for (let i = 0; i < w; i += 32)
        for (let j = 0; j < h; j += 32) {
          x.lineWidth = 2.2;
          x.beginPath();
          x.arc(i + 16, j + 16, 11, 0, 7);
          x.stroke();
          x.beginPath();
          x.arc(i + 16, j + 16, 4, 0, 7);
          x.fill();
          for (let q = 0; q < 6; q++) {
            const a = (q / 6) * 6.28;
            x.beginPath();
            x.arc(i + 16 + Math.cos(a) * 11, j + 16 + Math.sin(a) * 11, 2, 0, 7);
            x.fill();
          }
        }
      x.lineWidth = 1;
      for (let i = -h; i < w; i += 16) {
        x.beginPath();
        x.moveTo(i, 0);
        x.lineTo(i + h, h);
        x.stroke();
      }
    };
  else
    d = (x, w) => {
      x.clearRect(0, 0, w, w);
      const cx = w / 2,
        cols = ['#e0561c', '#ffc31f', '#c2185b', '#2a8a5a', '#2a4a8f', '#ffffff', '#f39a1e'];
      for (let r = 7; r > 0; r--) {
        const R = ((r / 7) * w) / 2 - 2,
          n = 6 + r * 2;
        x.fillStyle = cols[r % cols.length];
        x.beginPath();
        x.arc(cx, cx, R, 0, 7);
        x.fill();
        x.fillStyle = cols[(r + 3) % cols.length];
        for (let q = 0; q < n; q++) {
          const a = (q / n) * 6.283;
          x.beginPath();
          x.ellipse(cx + Math.cos(a) * R * 0.86, cx + Math.sin(a) * R * 0.86, R * 0.1, R * 0.05, a, 0, 7);
          x.fill();
        }
      }
    };
  const rep = kind === 'rangoli' ? 1 : 8;
  const t = shared(T(d, [rep, rep], 256));
  texCache.set(k, t);
  setSeedState(keep);
  return t;
}

export function fabricMat(d: FabricDef): THREE.Material {
  const side = THREE.DoubleSide;
  if (d.velvet)
    return new THREE.MeshPhysicalMaterial({ color: d.c, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(d.velvet), sheenRoughness: 0.35, side });
  if (d.tex === 'lace')
    // Alpha-to-coverage (the composer renders with MSAA) softens the lace's cut-outs instead of the hard
    // alpha test, which shimmered as the camera moved.
    return new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.9, map: clothTex('lace', d.c || '#fbf6ea'), alphaTest: 0.35, alphaToCoverage: true, side });
  if (d.op) return new THREE.MeshStandardMaterial({ color: d.c, roughness: 0.9, transparent: true, opacity: d.op, side, depthWrite: false });
  // Woven cloth gets a faint sheen so folds read under raking light.
  const m = new THREE.MeshPhysicalMaterial({
    color: d.tex ? '#fff' : d.c,
    roughness: d.r ?? 0.95,
    metalness: d.m ?? 0,
    sheen: d.m ? 0 : 0.35,
    sheenRoughness: 0.8,
    side,
  });
  if (d.tex) m.map = clothTex(d.tex, d.c ?? '#fff');
  return m;
}

export const CLOTHS: Record<string, FabricDef & { name: string }> = {
  ivory: { name: 'Ivory linen', c: '#efe8da', tex: 'linen' },
  white: { name: 'White satin', c: '#f7f6f2', r: 0.4 },
  blush: { name: 'Blush linen', c: '#e9c3c0', tex: 'linen' },
  sage: { name: 'Sage linen', c: '#a9b89a', tex: 'linen' },
  dusty: { name: 'Dusty blue linen', c: '#9fb3c8', tex: 'linen' },
  champagne: { name: 'Champagne sequin', c: '#d9c29a', tex: 'sequin', r: 0.35, m: 0.6 },
  crimson: { name: 'Crimson satin', c: '#9a1422', r: 0.4 },
  sapphire: { name: 'Sapphire satin', c: '#23407a', r: 0.4 },
  black: { name: 'Black velvet', c: '#1c1b1f', velvet: '#6a6470' },
  burgundy: { name: 'Burgundy velvet', c: '#4a1320', velvet: '#a0485a' },
  emerald: { name: 'Emerald velvet', c: '#0f3b2c', velvet: '#4a8a6a' },
  hessian: { name: 'Hessian', c: '#b39a74', tex: 'hessian' },
  tartan: { name: 'Red tartan', c: '#a3141e', tex: 'tartan' },
  gingham: { name: 'Sage gingham', c: '#fbfaf5', tex: 'gingham' },
  bare: { name: 'Bare wood — no cloth', bare: true },
  custom: { name: 'Custom colour', c: '#c9b8a0', tex: 'linen' },
};

export const OVERLAYS: Record<string, FabricDef & { name: string }> = {
  none: { name: 'No overlay' },
  lace: { name: 'Ivory lace', tex: 'lace', c: '#fbf6ea' },
  chiffon: { name: 'Blush chiffon', c: '#f3d3d3', op: 0.45 },
  organza: { name: 'Silver organza', c: '#dfe3ea', op: 0.35 },
  sequin: { name: 'Gold sequin', c: '#c9a25a', tex: 'sequin', r: 0.35, m: 0.8 },
};

export const CHAIRS: Record<string, ChairStyle & { name: string }> = {
  chiavari_gold: { name: 'Chiavari · gold', type: 'chiavari', color: '#c8a45a', metal: true, seat: '#f2eadb' },
  chiavari_silver: { name: 'Chiavari · silver', type: 'chiavari', color: '#cfd2d6', metal: true, seat: '#f4f2ee' },
  chiavari_white: { name: 'Chiavari · white', type: 'chiavari', color: '#f2efe9', seat: '#f7f3ec' },
  chiavari_wood: { name: 'Chiavari · fruitwood', type: 'chiavari', color: '#b98a5a', seat: '#efe6d6' },
  cross_dark: { name: 'Cross-back · walnut', type: 'cross', color: '#6e4b33', seat: '#d9ccb4' },
  cross_white: { name: 'Cross-back · limewash', type: 'cross', color: '#e6ddcc', seat: '#f4efe6' },
  bent_black: { name: 'Bentwood · black', type: 'bent', color: '#1e1c1b', seat: '#2a2622' },
  ghost: { name: 'Ghost · clear acrylic', type: 'ghost' },
  rattan: { name: 'Rattan', type: 'rattan', color: '#c9a877', seat: '#f1e9d8' },
  cover: { name: 'Covered, with sash', type: 'cover', color: '#f7f4ee' },
};

export const DECOR: Record<string, { name: string }> = {
  none: { name: 'No décor' },
  sash: { name: 'Satin sash & bow' },
  sprig: { name: 'Eucalyptus sprig' },
  posy: { name: 'Floral posy' },
};

/* -------------------------------------------------------------------- chair */

type Part = [THREE.BufferGeometry, THREE.Material];

/**
 * A banquet chair, built from merged parts per material so hundreds can be instanced cheaply.
 * Same footprint and heights as the prototype (seat 0.47–0.52 m, back to ~0.97 m), with rounded
 * cushions, tapered turned legs and proper spindles in place of the prototype's boxes.
 */
export function makeChairParts(cd: ChairStyle, decor = 'none', p: Pal = PALS.blush): Array<[THREE.BufferGeometry, THREE.Material, boolean]> {
  const parts: Part[] = [];
  const ghost = cd.type === 'ghost';
  const fm = ghost ? ghostM : M(cd.color ?? '#fff', cd.metal ? 0.3 : 0.55, cd.metal ? 0.9 : 0);
  const sm = ghost ? ghostM : new THREE.MeshPhysicalMaterial({ color: cd.seat || cd.color, roughness: 0.9, sheen: 0.5, sheenRoughness: 0.7 });
  const dm = new THREE.MeshPhysicalMaterial({ color: p.f, roughness: 0.45, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') });
  const gm = M(p.g, 0.9, 0, { flatShading: true });
  const o = new THREE.Object3D();
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, r?: [number, number, number]) => {
    o.position.set(x, y, z);
    o.rotation.set(0, 0, 0);
    if (r) o.rotation.set(...r);
    o.updateMatrix();
    geo.applyMatrix4(o.matrix);
    parts.push([geo.index ? geo.toNonIndexed() : geo, m]);
  };
  const leg = (x: number, z: number, h: number, splay = 0) => add(new THREE.CylinderGeometry(0.014, 0.019, h, 12), fm, x, h / 2, z, [splay * Math.sign(z), 0, -splay * Math.sign(x)]);
  const bow = (y: number, z: number) => {
    for (const s of [-1, 1]) {
      add(new THREE.TorusGeometry(0.03, 0.011, 8, 16), dm, s * 0.03, y, z, [0, Math.PI / 2, 0]);
      add(new RoundedBoxGeometry(0.025, 0.17, 0.006, 1, 0.002), dm, s * 0.02, y - 0.09, z, [0, 0, s * 0.18]);
    }
  };
  const cushion = () => add(new RoundedBoxGeometry(0.42, 0.055, 0.42, 3, 0.02), sm, 0, 0.52, 0);

  if (cd.type === 'cover') {
    const fab = new THREE.MeshPhysicalMaterial({ color: cd.color, roughness: 0.9, sheen: 0.6, sheenRoughness: 0.6 });
    // Skirt flares slightly to the floor like a real spandex/linen cover.
    add(new THREE.CylinderGeometry(0.35, 0.37, 0.47, 4, 1), fab, 0, 0.235, 0, [0, Math.PI / 4, 0]);
    add(new RoundedBoxGeometry(0.5, 0.06, 0.5, 2, 0.02), fab, 0, 0.5, 0);
    add(new RoundedBoxGeometry(0.48, 0.55, 0.07, 3, 0.025), fab, 0, 0.8, 0.21);
    add(new RoundedBoxGeometry(0.5, 0.1, 0.09, 2, 0.02), dm, 0, 0.72, 0.21);
    bow(0.72, 0.265);
  } else {
    for (const x of [-0.2, 0.2]) {
      leg(x, -0.2, 0.47, 0.03);
      add(new THREE.CylinderGeometry(0.014, 0.019, 1, 12), fm, x, 0.5, 0.2);
    }
    add(new RoundedBoxGeometry(0.44, 0.04, 0.44, 2, 0.012), fm, 0, 0.47, 0);
    if (!ghost) cushion();
    if (cd.type === 'chiavari') {
      for (const y of [0.62, 0.72, 0.82]) add(new THREE.CylinderGeometry(0.011, 0.011, 0.4, 10), fm, 0, y, 0.2, [0, 0, Math.PI / 2]);
      add(new RoundedBoxGeometry(0.42, 0.05, 0.03, 2, 0.01), fm, 0, 0.97, 0.2);
      for (const x of [-0.1, 0, 0.1]) add(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8), fm, x, 0.9, 0.2);
      // Stretchers between the legs, as on a real chiavari.
      for (const z of [-0.2, 0.2]) add(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 8), fm, 0, 0.18, z, [0, 0, Math.PI / 2]);
    } else if (cd.type === 'cross') {
      add(new RoundedBoxGeometry(0.42, 0.07, 0.03, 2, 0.01), fm, 0, 0.95, 0.2);
      for (const s of [-1, 1]) add(new RoundedBoxGeometry(0.52, 0.035, 0.02, 2, 0.006), fm, 0, 0.72, 0.2, [0, 0, s * 0.72]);
      for (const z of [-0.2, 0.2]) add(new THREE.BoxGeometry(0.4, 0.03, 0.02), fm, 0, 0.2, z);
    } else if (cd.type === 'rattan') {
      // Woven back: a slab plus a lattice of thin canes for texture.
      add(new RoundedBoxGeometry(0.44, 0.42, 0.035, 2, 0.012), fm, 0, 0.78, 0.2);
      for (let i = -4; i <= 4; i++) add(new THREE.CylinderGeometry(0.004, 0.004, 0.42, 5), M('#a8875a', 0.95), i * 0.045, 0.78, 0.18);
      add(new THREE.TorusGeometry(0.2, 0.02, 8, 24, Math.PI), fm, 0, 0.98, 0.2);
    } else if (cd.type === 'bent') {
      add(new THREE.TorusGeometry(0.2, 0.014, 8, 32, Math.PI), fm, 0, 0.8, 0.2);
      add(new THREE.TorusGeometry(0.13, 0.01, 8, 24, Math.PI), fm, 0, 0.72, 0.2);
      add(new THREE.TorusGeometry(0.2, 0.012, 8, 32), fm, 0, 0.3, 0, [Math.PI / 2, 0, 0]);
    } else {
      add(new RoundedBoxGeometry(0.44, 0.46, 0.03, 2, 0.012), fm, 0, 0.75, 0.21);
      add(new THREE.BoxGeometry(0.03, 0.25, 0.4), fm, -0.21, 0.63, 0);
      add(new THREE.BoxGeometry(0.03, 0.25, 0.4), fm, 0.21, 0.63, 0);
    }
    if (decor === 'sash') {
      add(new RoundedBoxGeometry(0.46, 0.07, 0.05, 2, 0.015), dm, 0, 0.76, 0.2);
      bow(0.76, 0.235);
    }
  }
  if (decor === 'sprig' || decor === 'posy') {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.28;
      add(new THREE.SphereGeometry(1, 6, 4).scale(0.018, 0.006, 0.05), gm, 0.12 + Math.cos(a) * 0.03, 0.92 + Math.sin(a) * 0.05, 0.235, [a, 0, 0.3]);
    }
    if (decor === 'posy') {
      const bm = p.b.slice(0, 3).map((c) => M(c, 0.7, 0, { flatShading: true }));
      [
        [0.1, 0.93],
        [0.14, 0.95],
        [0.12, 0.89],
        [0.16, 0.91],
      ].forEach(([x, y], i) => add(new THREE.IcosahedronGeometry(0.028, 1), bm[i % 3], x, y, 0.245));
      add(new THREE.BoxGeometry(0.02, 0.14, 0.004), dm, 0.12, 0.82, 0.24, [0, 0, 0.2]);
    }
  }

  // Normalise attributes so geometries sharing a material can merge (some have uv2/no uv).
  const by = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const [geo, m] of parts) {
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((geo.attributes.position.count ?? 0) * 2), 2));
    if (!by.has(m)) by.set(m, []);
    by.get(m)!.push(geo);
  }
  return [...by].map(([m, geos]) => [mergeGeometries(geos)!, m, ghost]);
}

export function makeChair(cd: ChairStyle, decor = 'none', p: Pal = PALS.blush): THREE.Group {
  const g = new THREE.Group();
  for (const [geo, m, ghost] of makeChairParts(cd, decor, p)) {
    const o = new THREE.Mesh(geo, m);
    o.castShadow = !ghost;
    o.receiveShadow = true;
    g.add(o);
  }
  return g;
}

/* -------------------------------------------------------------------- table */

export const hasTbl = (m: TableLayout) => m === 'round' || m === 'banquet';
export const tableLen = (m: TableLayout) => (m === 'banquet' ? 3.9 : 1.96);
export const HANG = 2.35;

/** Height of the tabletop surface, allowing for cloth and overlay thickness. */
export function topY(t: Pick<TableConfig, 'cloth' | 'overlay' | 'mode'>) {
  const bare = t.cloth && CLOTHS[t.cloth]?.bare;
  if (!bare && t.overlay && t.overlay !== 'none') return 0.781;
  if (bare) return 0.776;
  return t.mode === 'banquet' ? 0.761 : 0.771;
}

/** Place-setting spots around one table: [x, z, facing]. */
export function placeSpots(m: TableLayout): Array<[number, number, number]> {
  const s: Array<[number, number, number]> = [];
  if (m === 'round') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      s.push([Math.sin(a) * 0.72, Math.cos(a) * 0.72, a]);
    }
  } else if (m === 'banquet') {
    for (let x = -1.5; x <= 1.51; x += 0.75) for (const k of [-1, 1]) s.push([x, k * 0.33, k > 0 ? 0 : Math.PI]);
    for (const k of [-1, 1]) s.push([k * 1.62, 0, (k * Math.PI) / 2]);
  }
  return s;
}

function chairLocal(m: TableLayout): Array<[number, number, number]> {
  const loc: Array<[number, number, number]> = [];
  if (m === 'round')
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      loc.push([Math.sin(a) * 1.4, Math.cos(a) * 1.4, a]);
    }
  else {
    for (let x = -1.5; x <= 1.51; x += 0.75) for (const k of [-1, 1]) loc.push([x, k * 0.9, k > 0 ? 0 : Math.PI]);
    for (const k of [-1, 1]) loc.push([k * 2.3, 0, (k * Math.PI) / 2]);
  }
  return loc;
}

export function chairSpots(m: TableLayout, tables: TablePos[], guests: number): Array<[number, number, number]> {
  const s: Array<[number, number, number]> = [];
  if (m === 'ceremony') {
    const rows = Math.max(2, Math.ceil(guests / 8));
    for (let r = 0; r < rows; r++) for (const k of [-1, 1]) for (let j = 0; j < 4; j++) s.push([k * (0.85 + j * 0.55), 0.7 + r, 0]);
    return s;
  }
  if (!hasTbl(m)) return s;
  const loc = chairLocal(m);
  for (const T of tables) {
    const c = Math.cos(T.ry),
      sn = Math.sin(T.ry);
    for (const [x, z, r] of loc) s.push([T.x + x * c + z * sn, T.z - x * sn + z * c, r + T.ry]);
  }
  return s;
}

export function genTables(m: TableLayout, guests: number): TablePos[] {
  if (!hasTbl(m)) return [{ x: 0, z: 0, ry: 0 }];
  const per = m === 'round' ? 8 : 12,
    n = Math.max(1, Math.ceil(guests / per)),
    sx = m === 'round' ? 3.6 : 5.4,
    sz = m === 'round' ? 3.6 : 3.3,
    cols = m === 'round' ? Math.ceil(Math.sqrt(n)) : Math.max(1, Math.ceil(Math.sqrt(n / 2))),
    rows = Math.ceil(n / cols),
    out: TablePos[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols,
      r = Math.floor(i / cols),
      inRow = Math.min(cols, n - r * cols);
    out.push({ x: (c - (inRow - 1) / 2) * sx, z: (r - (rows - 1) / 2) * sz, ry: 0 });
  }
  return out;
}

/** Round tablecloth that falls to the floor in soft pleats (the prototype used a plain cone). */
function drapeGeo(rTop: number, rFloor: number, h: number) {
  const seg = 144,
    rows = 12;
  const geo = new THREE.CylinderGeometry(rTop, rFloor, h, seg, rows, true);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const t = 1 - (v.y + h / 2) / h; // 0 at the table edge, 1 at the floor
    const a = Math.atan2(v.z, v.x);
    const fold = 1 + (Math.sin(a * 22) * 0.6 + Math.sin(a * 37 + 1.3) * 0.4) * 0.018 * Math.pow(t, 1.4);
    p.setXYZ(i, v.x * fold, v.y, v.z * fold);
  }
  geo.computeVertexNormals();
  return geo;
}

/** A round top with a softly rolled edge where the cloth breaks over the table. */
function roundTopGeo(r: number) {
  const pts: Array<[number, number]> = [
    [0, 0.01],
    [r - 0.02, 0.01],
    [r - 0.004, 0.006],
    [r, -0.004],
    [r + 0.002, -0.02],
  ];
  return new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    96,
  );
}

export function tableUnit(tg: THREE.Group, m: TableLayout, cl: FabricDef, cm: THREE.Material | null, om: THREE.Material | null) {
  if (cl.bare) {
    if (m === 'round') {
      cyl(tg, 0.95, 0.95, 0.045, woodM, 0, 0.752, 0, 64);
      cyl(tg, 0.07, 0.09, 0.72, woodM, 0, 0.37, 0);
      cyl(tg, 0.35, 0.4, 0.04, woodM, 0, 0.02, 0, 32);
    } else {
      box(tg, 3.8, 0.05, 1.1, woodM, 0, 0.75, 0);
      for (const x of [-1.8, 1.8]) for (const z of [-0.48, 0.48]) box(tg, 0.07, 0.73, 0.07, woodM, x, 0.365, z);
    }
    return;
  }
  if (!cm) return;
  if (m === 'round') {
    mesh(tg, drapeGeo(0.955, 1.1, 0.76), cm, 0, 0.38, 0);
    mesh(tg, roundTopGeo(0.955), cm, 0, 0.76, 0);
  } else {
    mesh(tg, new RoundedBoxGeometry(3.8, 0.74, 1.1, 2, 0.01), cm, 0, 0.37, 0);
    mesh(tg, new RoundedBoxGeometry(3.84, 0.02, 1.14, 2, 0.008), cm, 0, 0.75, 0);
  }
  if (om) {
    if (m === 'round') {
      mesh(tg, drapeGeo(0.975, 1.04, 0.42), om, 0, 0.565, 0).castShadow = false;
      mesh(tg, new THREE.CylinderGeometry(0.976, 0.976, 0.008, 96), om, 0, 0.777, 0);
    } else box(tg, 3.9, 0.4, 1.2, om, 0, 0.58, 0);
  }
}

export function clothOf(t: Pick<TableConfig, 'cloth' | 'customCloth'>, venueCloth: string): FabricDef {
  if (t.cloth === 'custom') return { c: t.customCloth || '#c9b8a0', tex: 'linen' };
  return t.cloth ? CLOTHS[t.cloth] ?? { c: venueCloth, tex: 'linen' } : { c: venueCloth, tex: 'linen' };
}
