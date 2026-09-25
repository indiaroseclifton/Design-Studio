import * as THREE from 'three';
import { registerKind } from '../three/builder';
import { shared } from '../three/utils';

/*
 * Botanical primitives. The prototype drew every petal as a squashed sphere and every leaf as a flat-shaded
 * icosahedron, which is most of why arrangements read as plastic. These replace them with thin, curved,
 * shaded surfaces that fit the same unit bounding box, so every existing flower builder keeps its layout:
 *
 *   petal: base at y = -1, tip at y = +1, width along x (±1), cup depth along z (the inside faces -z)
 *   blade: length along z (±1), width along x (±1), thin along y (fold and arch live in y)
 *
 * Both carry vertex colours that the per-instance colour multiplies, giving each petal a deeper, slightly
 * green-yellow base and a lighter edge, and each leaf a pale midrib.
 */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

interface PetalOpts {
  /** how strongly the edges curl toward the flower's centre (local -z) */
  cup?: number;
  /** how far the last part of the petal rolls back outward */
  reflex?: number;
  /** edge ripple amplitude */
  ruffle?: number;
  /** 0 = pointed tip, 1 = broad rounded tip */
  round?: number;
}

/** Width profile along the petal, 0 at the base to 1 at the tip: narrow claw, widest past the middle, rounded tip. */
function petalWidth(t: number, round: number) {
  const widest = 0.62;
  if (t < widest) return lerp(0.18, 1, Math.sin((t / widest) * (Math.PI / 2)));
  const u = (t - widest) / (1 - widest);
  // A superellipse end: `round` squares the tip off (roses), 0 gives a pointed lanceolate tip (dahlias).
  const p = lerp(1, 2.6, round);
  return Math.pow(Math.max(0, 1 - Math.pow(u, p)), 1 / p);
}

export function petalGeometry({ cup = 1.1, reflex = 0.9, ruffle = 0.07, round = 0.8 }: PetalOpts = {}) {
  const nu = 12,
    nv = 14;
  const pos: number[] = [],
    col: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  for (let j = 0; j <= nv; j++) {
    const t = j / nv;
    const w = petalWidth(t, round);
    for (let i = 0; i <= nu; i++) {
      const s = (i / nu) * 2 - 1; // -1..1 across
      const x = s * w;
      const y = t * 2 - 1;
      // Cup across the width (deeper toward the tip), roll back near the tip, and a gentle ripple at the edge.
      let z = -cup * s * s * lerp(0.35, 1, t);
      z += reflex * Math.pow(Math.max(0, t - 0.68) / 0.32, 2) * 0.8;
      z += ruffle * Math.sin(s * 9 + t * 5) * Math.abs(s) * t;
      pos.push(x, y, z);
      // Base deep and slightly green-gold, body full colour, edge a touch lighter than the veins.
      const base = smooth(Math.min(1, t / 0.35));
      const vein = 1 - 0.06 * Math.pow(Math.cos(s * Math.PI * 2.5), 8) * (1 - t);
      const r = lerp(0.66, 1, base) * vein,
        g = lerp(0.74, 1, base) * vein,
        b = lerp(0.5, 0.97, base) * vein;
      col.push(r, g, b);
      uv.push(i / nu, t);
    }
  }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i,
        b = a + 1,
        c = a + nu + 1,
        d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A leaf blade: short petiole, pointed tip, folded along the midrib and arched along its length. */
export function bladeGeometry() {
  const nu = 8,
    nv = 16;
  const pos: number[] = [],
    col: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  for (let j = 0; j <= nv; j++) {
    const t = j / nv;
    // Petiole (first 8%), then an ovate blade widest at ~40% tapering to a point.
    const w = t < 0.08 ? 0.06 : Math.pow(Math.sin(Math.PI * Math.pow((t - 0.08) / 0.92, 0.8)), 0.75);
    for (let i = 0; i <= nu; i++) {
      const s = (i / nu) * 2 - 1;
      const x = s * w;
      const z = t * 2 - 1;
      const y = 0.55 * Math.abs(s) * w + 0.7 * (1 - z * z) - 0.35;
      pos.push(x, y, z);
      const rib = 1 - Math.min(1, Math.abs(s) * 4); // 1 on the midrib
      const edge = Math.abs(s);
      const k = lerp(0.9, 1.12, rib) * lerp(1, 0.84, edge) * lerp(0.92, 1, Math.sin(t * Math.PI));
      col.push(Math.min(1, k * 0.96), Math.min(1, k), Math.min(1, k * 0.9));
      uv.push(i / nu, t);
    }
  }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i,
        b = a + 1,
        c = a + nu + 1,
        d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Petals: soft sheen and a little specular, double-sided so the inside of the cup is lit. */
export const petalMaterial = () =>
  new THREE.MeshPhysicalMaterial({
    color: '#fff',
    vertexColors: true,
    roughness: 0.62,
    // Enough sheen for a velvety petal edge without washing deep colours (burgundy, plum) out to pink.
    sheen: 0.45,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color('#ffffff'),
    specularIntensity: 0.35,
    side: THREE.DoubleSide,
  });

export const leafMaterial = () =>
  new THREE.MeshPhysicalMaterial({
    color: '#fff',
    vertexColors: true,
    roughness: 0.48,
    sheen: 0.3,
    sheenRoughness: 0.6,
    specularIntensity: 0.6,
    side: THREE.DoubleSide,
  });

let petalGeo: THREE.BufferGeometry | null = null;
let bladeGeo: THREE.BufferGeometry | null = null;
export const PETAL = () => (petalGeo ??= shared(petalGeometry()));
export const BLADE = () => (bladeGeo ??= shared(bladeGeometry()));

// Replaces the prototype's sphere petal (registered by catalogue.gen.ts; the later registration wins).
registerKind('petal', () => [PETAL(), petalMaterial()]);
registerKind('blade', () => [BLADE(), leafMaterial()]);
