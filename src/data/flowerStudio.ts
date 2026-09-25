import * as THREE from 'three';
import { cyl, M, rnd, seed } from '../three/utils';
import type { Builder } from '../three/builder';
import type { Arrangement, CatalogueItem, StemEntry, GreeneryEntry } from '../types';

export interface VesselDef {
  id: string;
  name: string;
  fp: number;
  /** builds the vessel geometry into g using the given material; returns the y height where blooms should sit */
  build: (g: THREE.Group, mat: THREE.Material, s: number) => number;
}

export const VESSELS: VesselDef[] = [
  {
    id: 'compote',
    name: 'Compote',
    fp: 0.18,
    build(g, mat, s) {
      cyl(g, 0.11 * s, 0.09 * s, 0.16 * s, mat, 0, 0.08 * s, 0, 24);
      return 0.16 * s;
    },
  },
  {
    id: 'cylinder',
    name: 'Cylinder vase',
    fp: 0.12,
    build(g, mat, s) {
      cyl(g, 0.09 * s, 0.09 * s, 0.26 * s, mat, 0, 0.13 * s, 0, 20);
      return 0.26 * s;
    },
  },
  {
    id: 'urn',
    name: 'Urn',
    fp: 0.2,
    build(g, mat, s) {
      cyl(g, 0.16 * s, 0.2 * s, 0.5 * s, mat, 0, 0.25 * s, 0, 20);
      cyl(g, 0.2 * s, 0.17 * s, 0.14 * s, mat, 0, 0.57 * s, 0, 20);
      return 0.64 * s;
    },
  },
  {
    id: 'budvase',
    name: 'Bud vase',
    fp: 0.05,
    build(g, mat, s) {
      cyl(g, 0.012 * s, 0.02 * s, 0.18 * s, mat, 0, 0.09 * s, 0, 12);
      return 0.18 * s;
    },
  },
  {
    id: 'lowbowl',
    name: 'Low bowl',
    fp: 0.16,
    build(g, mat, s) {
      cyl(g, 0.14 * s, 0.1 * s, 0.06 * s, mat, 0, 0.03 * s, 0, 24);
      return 0.06 * s;
    },
  },
];

export interface FinishDef {
  id: string;
  name: string;
  build: () => THREE.Material;
}

export const FINISHES: FinishDef[] = [
  { id: 'natural', name: 'Natural glass', build: () => M('#eef4f2', 0.05, 0, { transparent: true, opacity: 0.35 }) },
  { id: 'gold', name: 'Gold', build: () => M('#c9a25a', 0.3, 0.9) },
  { id: 'white', name: 'Matte white', build: () => M('#f2ece0', 0.8) },
  { id: 'black', name: 'Matte black', build: () => M('#1e1c1b', 0.7) },
  { id: 'terracotta', name: 'Terracotta', build: () => M('#c9702e', 0.8) },
];

export interface ShapeDef {
  id: string;
  name: string;
  /** returns a local [x, z, yOffset] for stem index i of n total, at size scale s */
  place: (i: number, n: number, s: number, rnd: () => number) => [number, number, number];
}

export const SHAPES: ShapeDef[] = [
  {
    id: 'round',
    name: 'Round & lush',
    place(i, n, s, rnd) {
      const a = (i / n) * Math.PI * 2;
      const r = 0.09 * s * (0.4 + rnd() * 0.6);
      return [Math.cos(a) * r, Math.sin(a) * r, 0];
    },
  },
  {
    id: 'cascade',
    name: 'Cascading',
    place(i, n, s) {
      const a = (i / n) * Math.PI * 2;
      const r = 0.1 * s;
      const drop = i % 3 === 0 ? -0.1 * s : 0;
      return [Math.cos(a) * r, Math.sin(a) * r, drop];
    },
  },
  {
    id: 'tall',
    name: 'Tall & elegant',
    place(i, n, s, rnd) {
      const a = (i / n) * Math.PI * 2;
      const r = 0.05 * s;
      return [Math.cos(a) * r, Math.sin(a) * r, 0.14 * s * rnd()];
    },
  },
  {
    id: 'compact',
    name: 'Compact posy',
    place(i, n, s) {
      const a = (i / n) * Math.PI * 2;
      const r = 0.045 * s;
      return [Math.cos(a) * r, Math.sin(a) * r, 0];
    },
  },
];

export interface FlowerTypeDef {
  id: string;
  name: string;
  color: string;
  scale: number;
}

export const FLOWER_TYPES: FlowerTypeDef[] = [
  { id: 'rose', name: 'Garden rose', color: '#f2bcc0', scale: 1 },
  { id: 'ranunculus', name: 'Ranunculus', color: '#f7d9a0', scale: 0.7 },
  { id: 'peony', name: 'Peony', color: '#f4c9d6', scale: 1.3 },
  { id: 'tulip', name: 'Tulip', color: '#e2506a', scale: 0.8 },
  { id: 'anemone', name: 'Anemone', color: '#fbfaf6', scale: 0.75 },
  { id: 'dahlia', name: 'Dahlia', color: '#c9a25a', scale: 1.1 },
  { id: 'hydrangea', name: 'Hydrangea', color: '#9ec9d9', scale: 1.4 },
  { id: 'lisianthus', name: 'Lisianthus', color: '#e8dccb', scale: 0.85 },
];

export interface GreeneryTypeDef {
  id: string;
  name: string;
  color: string;
}

export const GREENERY_TYPES: GreeneryTypeDef[] = [
  { id: 'fern', name: 'Fern', color: '#4c7a34' },
  { id: 'eucalyptus', name: 'Eucalyptus', color: '#8fae8a' },
  { id: 'ivy', name: 'Trailing ivy', color: '#3f6a2a' },
  { id: 'olive', name: 'Olive branch', color: '#7a8a5a' },
];

export function getVessel(id: string): VesselDef {
  return VESSELS.find((v) => v.id === id) ?? VESSELS[0];
}
export function getFinish(id: string): FinishDef {
  return FINISHES.find((f) => f.id === id) ?? FINISHES[0];
}
export function getShape(id: string): ShapeDef {
  return SHAPES.find((s) => s.id === id) ?? SHAPES[0];
}
export function getFlowerType(id: string): FlowerTypeDef {
  return FLOWER_TYPES.find((f) => f.id === id) ?? FLOWER_TYPES[0];
}
export function getGreeneryType(id: string): GreeneryTypeDef {
  return GREENERY_TYPES.find((g) => g.id === id) ?? GREENERY_TYPES[0];
}

export interface FlowerPreset {
  id: string;
  name: string;
  vessel: string;
  finish: string;
  shape: string;
  stems: StemEntry[];
  greenery: GreeneryEntry[];
}

export const FLOWER_PRESETS: FlowerPreset[] = [
  {
    id: 'garden_rose',
    name: 'Garden Rose',
    vessel: 'compote',
    finish: 'natural',
    shape: 'round',
    stems: [
      { type: 'rose', n: 8 },
      { type: 'ranunculus', n: 4 },
    ],
    greenery: [{ type: 'fern', n: 2 }],
  },
  {
    id: 'modern_white',
    name: 'Modern White',
    vessel: 'cylinder',
    finish: 'gold',
    shape: 'tall',
    stems: [
      { type: 'anemone', n: 6 },
      { type: 'lisianthus', n: 4 },
    ],
    greenery: [{ type: 'eucalyptus', n: 2 }],
  },
  {
    id: 'boho_wild',
    name: 'Boho Wild',
    vessel: 'lowbowl',
    finish: 'terracotta',
    shape: 'compact',
    stems: [
      { type: 'ranunculus', n: 5 },
      { type: 'dahlia', n: 3 },
    ],
    greenery: [{ type: 'olive', n: 3 }],
  },
  {
    id: 'simple_bud',
    name: 'Simple Bud',
    vessel: 'budvase',
    finish: 'natural',
    shape: 'compact',
    stems: [{ type: 'rose', n: 1 }],
    greenery: [],
  },
];

let seq = 0;
export function newArrangement(preset?: FlowerPreset): Arrangement {
  seq += 1;
  const p = preset ?? FLOWER_PRESETS[0];
  return {
    id: `myflower_${Date.now()}_${seq}`,
    name: preset ? preset.name : 'My Arrangement',
    vessel: p.vessel,
    finish: p.finish,
    shape: p.shape,
    size: 1,
    stems: p.stems.map((s) => ({ ...s })),
    greenery: p.greenery.map((g) => ({ ...g })),
    seed: Math.floor(Math.random() * 1e6),
  };
}

export function stemCount(a: Arrangement): number {
  return a.stems.reduce((sum, s) => sum + s.n, 0);
}

export function greeneryCount(a: Arrangement): number {
  return a.greenery.reduce((sum, g) => sum + g.n, 0);
}

/** Renders an arrangement's vessel, stems and greenery into g using the given builder (already bound to g). */
export function buildArrangement(g: THREE.Group, builder: Builder, a: Arrangement): number {
  seed(a.seed || 1);
  const vessel = getVessel(a.vessel);
  const finish = getFinish(a.finish);
  const shape = getShape(a.shape);
  const mat = finish.build();
  const topY = vessel.build(g, mat, a.size);

  const stems: StemEntry[] = [];
  for (const s of a.stems) for (let i = 0; i < s.n; i++) stems.push(s);
  const n = stems.length || 1;
  stems.forEach((stem, i) => {
    const ft = getFlowerType(stem.type);
    const [x, z, dy] = shape.place(i, n, a.size, rnd);
    builder.rose(x, z, stem.color ?? ft.color, 0.09 * ft.scale * a.size, topY + dy);
  });

  const greens: string[] = [];
  for (const entry of a.greenery) for (let i = 0; i < entry.n; i++) greens.push(entry.type);
  const gn = greens.length;
  greens.forEach((type, i) => {
    const gt = getGreeneryType(type);
    const a2 = (i / Math.max(gn, 1)) * Math.PI * 2 + 0.3;
    const r = 0.08 * a.size;
    builder.fern(Math.cos(a2) * r, Math.sin(a2) * r, 0.16 * a.size, gt.color, topY - 0.02);
  });

  builder.flush();
  return topY;
}

export function arrangementToItem(a: Arrangement): CatalogueItem {
  const vessel = getVessel(a.vessel);
  return {
    id: a.id,
    name: a.name,
    cat: 'myflowers',
    sec: 'My Flowers',
    group: 'myflower',
    surf: 'table',
    fp: Math.min(0.3, vessel.fp * a.size),
    price: Math.round(18 + stemCount(a) * 4.5 + greeneryCount(a) * 2),
    kw: `${a.name} custom flowers arrangement`.toLowerCase(),
    note: 'Custom arrangement',
    pal: false,
    top: { h: 0.3 * a.size, r: Math.max(0.06, vessel.fp * 0.75) },
    arrangementId: a.id,
    build(g, ctx) {
      buildArrangement(g, ctx.builder, a);
    },
  };
}
