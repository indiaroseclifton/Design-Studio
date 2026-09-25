import * as THREE from 'three';
import { registerKind } from '../three/builder';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { shared } from '../three/utils';

/*
 * Foliage and stone clumps for venue scenery.
 *
 * The prototype drew every tree canopy, hedge, shrub and boulder as a flat-shaded 20-sided ball ('leaf'). Here a
 * round 'leaf' becomes one of two smooth, lumpy clumps chosen by colour (see Builder.add):
 *  - 'foliage': a cauliflower of overlapping leafy lobes, shaded darker underneath and in the creases, with a
 *    leaf-scatter normal map so the surface reads as masses of small leaves rather than a plastic ball.
 *  - 'stone': the same idea with a few broad, low lumps and a grainy rock normal map.
 * Both geometries are built once and shared by every venue; they use a local PRNG so building them never
 * disturbs the seeded layout of the scene.
 */

function prng(s: number) {
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomDirs(n: number, r: () => number) {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1,
      a = r() * Math.PI * 2,
      s = Math.sqrt(1 - u * u);
    out.push(new THREE.Vector3(s * Math.cos(a), u, s * Math.sin(a)));
  }
  return out;
}

/** A unit clump: lobes are raised caps around random directions; vertex colour carries the occlusion. */
function clumpGeometry(o: { detail: number; lobes: number; lobeR: [number, number]; amp: number; flatBottom: number; seed: number; ao: number }) {
  const r = prng(o.seed);
  const g = new THREE.IcosahedronGeometry(1, o.detail);
  const lobes = randomDirs(o.lobes, r).map((d) => ({ d, c: Math.cos(o.lobeR[0] + r() * (o.lobeR[1] - o.lobeR[0])), h: 0.6 + r() * 0.4 }));
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  const disp: number[] = [];
  let min = Infinity,
    max = -Infinity;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    let d = 0;
    for (const L of lobes) {
      const k = v.dot(L.d);
      if (k > L.c) {
        const t = (k - L.c) / (1 - L.c);
        d = Math.max(d, L.h * Math.sqrt(t * (2 - t)));
      }
    }
    disp.push(d);
    min = Math.min(min, d);
    max = Math.max(max, d);
  }
  const col: number[] = [];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const n = (disp[i] - min) / (max - min || 1);
    let rad = 1 - o.amp + o.amp * n;
    // Squash the underside a little so clumps sit on the ground (hedges, boulders) instead of balancing.
    if (v.y < 0) rad *= 1 - o.flatBottom * v.y * v.y;
    p.setXYZ(i, v.x * rad, v.y * rad, v.z * rad);
    // Occlusion: darker in the creases between lobes and towards the underside.
    const under = THREE.MathUtils.clamp(0.5 - v.y * 0.5, 0, 1);
    const k = THREE.MathUtils.lerp(1 - o.ao, 1, Math.pow(n, 0.7)) * (1 - 0.35 * under * under);
    col.push(k, k, k);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return shared(g);
}

/** A tiling normal map drawn from a height field of many small stamps (leaves or rock grain). */
function stampNormalMap(kind: 'leaf' | 'grain', size = 256) {
  const r = prng(kind === 'leaf' ? 91 : 17);
  const h = new Float32Array(size * size);
  const stamp = (cx: number, cy: number, rx: number, ry: number, a: number, amp: number) => {
    const ca = Math.cos(a),
      sa = Math.sin(a),
      R = Math.ceil(Math.max(rx, ry));
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) {
        const u = (dx * ca + dy * sa) / rx,
          w = (-dx * sa + dy * ca) / ry,
          q = u * u + w * w;
        if (q >= 1) continue;
        const x = (((cx + dx) % size) + size) % size,
          y = (((cy + dy) % size) + size) % size;
        const val = amp * Math.sqrt(1 - q) * (kind === 'leaf' ? 1 - 0.3 * Math.abs(w) : 1);
        h[y * size + x] = Math.max(h[y * size + x], val + r() * 0.02);
      }
  };
  if (kind === 'leaf') for (let i = 0; i < 900; i++) stamp(r() * size, r() * size, 5 + r() * 5, 2.5 + r() * 2, r() * Math.PI, 0.5 + r() * 0.5);
  else for (let i = 0; i < 1400; i++) stamp(r() * size, r() * size, 2 + r() * 5, 2 + r() * 4, r() * Math.PI, 0.2 + r() * 0.8);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d')!;
  const img = x.createImageData(size, size);
  const at = (i: number, j: number) => h[((j + size) % size) * size + ((i + size) % size)];
  const str = kind === 'leaf' ? 2.2 : 1.4;
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const nx = (at(i - 1, j) - at(i + 1, j)) * str,
        ny = (at(i, j - 1) - at(i, j + 1)) * str,
        l = Math.hypot(nx, ny, 1);
      const o = (j * size + i) * 4;
      img.data[o] = ((nx / l) * 0.5 + 0.5) * 255;
      img.data[o + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      img.data[o + 2] = (1 / l) * 0.5 * 255 + 127;
      img.data[o + 3] = 255;
    }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(kind === 'leaf' ? 5 : 3, kind === 'leaf' ? 2.5 : 1.5);
  t.anisotropy = 4;
  return shared(t);
}

let foliageGeo: THREE.BufferGeometry | null = null,
  stoneGeo: THREE.BufferGeometry | null = null,
  leafN: THREE.Texture | null = null,
  grainN: THREE.Texture | null = null;

registerKind('foliage', () => [
  (foliageGeo ??= clumpGeometry({ detail: 4, lobes: 30, lobeR: [0.35, 0.6], amp: 0.2, flatBottom: 0.15, seed: 7, ao: 0.55 })),
  new THREE.MeshStandardMaterial({
    color: '#fff',
    vertexColors: true,
    roughness: 0.82,
    normalMap: (leafN ??= stampNormalMap('leaf')),
    normalScale: new THREE.Vector2(1.1, 1.1),
  }),
]);

registerKind('stone', () => [
  (stoneGeo ??= clumpGeometry({ detail: 3, lobes: 9, lobeR: [0.6, 1.0], amp: 0.14, flatBottom: 0.45, seed: 3, ao: 0.3 })),
  new THREE.MeshStandardMaterial({ color: '#fff', vertexColors: true, roughness: 0.9, normalMap: (grainN ??= stampNormalMap('grain')), normalScale: new THREE.Vector2(0.8, 0.8) }),
]);

/** Hay bales: a softened block of straw, with two bands of twine. */
let baleGeo: THREE.BufferGeometry | null = null,
  strawMap: THREE.Texture | null = null;
function straw() {
  const r = prng(5),
    S = 256,
    c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d')!;
  x.fillStyle = '#eadcb8';
  x.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const px = r() * S,
      py = r() * S,
      a = (r() - 0.5) * 0.8,
      l = 6 + r() * 22;
    const k = r();
    x.strokeStyle = k < 0.45 ? '#fff6dc' : k < 0.8 ? '#e8d4a4' : '#a88c5c';
    x.globalAlpha = 0.5 + r() * 0.5;
    x.lineWidth = 0.8 + r() * 1.2;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
    x.stroke();
  }
  x.globalAlpha = 0.85;
  x.fillStyle = '#8a6a44';
  for (const u of [0.3, 0.7]) x.fillRect(u * S - 2, 0, 4, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return shared(t);
}
registerKind('bale', () => [
  (baleGeo ??= shared(new RoundedBoxGeometry(1, 1, 1, 3, 0.08))),
  new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.95, map: (strawMap ??= straw()), bumpMap: strawMap, bumpScale: 1.5 }),
]);

/**
 * Conifers: a unit-height pine (base at -0.5, tip at +0.5, radius 1 at the bottom) built from overlapping,
 * drooping tiers of boughs with a ragged edge, so a row of pines has a real silhouette instead of cones.
 */
let pineGeo: THREE.BufferGeometry | null = null;
function pineGeometry() {
  const r = prng(11);
  const tiers = 7,
    seg = 40,
    parts: THREE.BufferGeometry[] = [];
  for (let t = 0; t < tiers; t++) {
    const f = t / tiers;
    const y0 = -0.42 + f * 0.8, // skirt height of this tier
      top = y0 + 0.28 - f * 0.08,
      R = (1 - f * 0.85) * (0.95 + r() * 0.1);
    const pos: number[] = [],
      col: number[] = [],
      idx: number[] = [];
    const rings = 4;
    const jag = Array.from({ length: seg }, () => 0.82 + r() * 0.3);
    for (let j = 0; j <= rings; j++) {
      const q = j / rings; // 0 at the tip of the tier, 1 at the skirt
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        const rr = R * q * (q > 0.6 ? jag[i % seg] : 1);
        // Boughs droop: the skirt curls down past a straight cone.
        const y = top - (top - y0) * q - 0.06 * q * q * q;
        pos.push(Math.sin(a) * rr, y, Math.cos(a) * rr);
        const k = 0.55 + 0.45 * q; // darker towards the trunk
        col.push(k, k, k);
      }
    }
    for (let j = 0; j < rings; j++)
      for (let i = 0; i < seg; i++) {
        const a = j * (seg + 1) + i,
          b = a + 1,
          c = a + seg + 1,
          d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    // The dark underside of each tier.
    const base = pos.length / 3;
    pos.push(0, y0 + 0.02, 0);
    col.push(0.3, 0.3, 0.3);
    for (let i = 0; i < seg; i++) idx.push(base, rings * (seg + 1) + i, rings * (seg + 1) + i + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    parts.push(g.toNonIndexed());
    g.dispose();
  }
  const m = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  // Planar-ish uv for the needle normal map.
  const p = m.attributes.position,
    uv: number[] = [];
  for (let i = 0; i < p.count; i++) uv.push(Math.atan2(p.getX(i), p.getZ(i)) / Math.PI + 1, p.getY(i) * 2);
  m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  m.computeVertexNormals();
  return shared(m);
}
registerKind('pine', () => [
  (pineGeo ??= pineGeometry()),
  new THREE.MeshStandardMaterial({ color: '#fff', vertexColors: true, roughness: 0.85, side: THREE.DoubleSide, normalMap: (leafN ??= stampNormalMap('leaf')), normalScale: new THREE.Vector2(0.9, 0.9) }),
]);
