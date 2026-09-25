import * as THREE from 'three';
import type { CatalogueItem } from '../types';
import { box, cyl, mesh, M } from '../three/utils';
import { T, tm, noise } from '../three/textures';
import { flame } from '../three/builder';

export interface Category {
  id: string;
  label: string;
}

export const CATEGORIES: Category[] = [
  { id: 'linens', label: 'Linens' },
  { id: 'tableware', label: 'Tableware' },
  { id: 'florals', label: 'Florals' },
  { id: 'candles', label: 'Candles & light' },
  { id: 'furniture', label: 'Furniture & lighting' },
];

function textTexture(text: string, opts: { bg?: string; fg?: string; size?: number; serif?: boolean } = {}) {
  return T(
    (ctx, w, h) => {
      ctx.fillStyle = opts.bg ?? '#faf6ee';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = opts.fg ?? '#221a10';
      ctx.font = `${opts.size ?? 40}px ${opts.serif ? "'Cormorant Garamond',serif" : 'Jost,sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text || '—', w / 2, h / 2, w * 0.85);
    },
    [1, 1],
    256,
  );
}

const glass = () => M('#eef4f2', 0.05, 0, { transparent: true, opacity: 0.35 });

export const ITEMS: Record<string, CatalogueItem> = {
  runner_linen: {
    id: 'runner_linen',
    name: 'Table runner',
    cat: 'linens',
    sec: 'Runners',
    group: 'runner',
    surf: 'table',
    fp: 0.05,
    price: 18,
    kw: 'runner linen table',
    pal: true,
    build(g, { palette, color }) {
      box(g, 0.46, 0.012, 1.7, M(color ?? palette.f, 0.9), 0, 0.001, 0);
    },
  },
  runner_lace: {
    id: 'runner_lace',
    name: 'Lace runner',
    cat: 'linens',
    sec: 'Runners',
    group: 'runner',
    surf: 'table',
    fp: 0.05,
    price: 24,
    kw: 'lace runner vintage',
    pal: false,
    build(g) {
      box(g, 0.46, 0.012, 1.7, tm(T(noise('#fbfaf6', ['#f2efe6', '#ffffff'], 4000, 1), [2, 6])), 0, 0.002, 0);
    },
  },
  overlay_sequin: {
    id: 'overlay_sequin',
    name: 'Sequin overlay',
    cat: 'linens',
    sec: 'Overlays',
    group: 'overlay',
    surf: 'table',
    fp: 0.3,
    price: 32,
    kw: 'sequin sparkle glam overlay',
    tag: 'Glam',
    pal: false,
    build(g) {
      box(g, 1.55, 0.01, 1.55, M('#e7d9b8', 0.25, 0.6, { map: T(noise('#e7d9b8', ['#f6ecc8', '#d8c396'], 6000, 1), [8, 8]) }), 0, 0.0015, 0);
    },
  },
  napkin_fold: {
    id: 'napkin_fold',
    name: 'Folded napkin',
    cat: 'linens',
    sec: 'Place settings',
    group: 'napkin',
    surf: 'table',
    fp: 0.03,
    price: 2,
    kw: 'napkin fold',
    pal: true,
    build(g, { palette, color }) {
      box(g, 0.14, 0.06, 0.14, M(color ?? palette.f, 0.85), 0, 0.03, 0);
    },
  },

  charger_gold: {
    id: 'charger_gold',
    name: 'Gold charger',
    cat: 'tableware',
    sec: 'Place settings',
    group: 'charger',
    surf: 'table',
    fp: 0.09,
    price: 6,
    kw: 'charger plate gold',
    pal: false,
    top: { h: 0.015, r: 0.16 },
    build(g) {
      cyl(g, 0.16, 0.16, 0.012, M('#c9a25a', 0.3, 1), 0, 0.006, 0, 40);
    },
  },
  dinner_plate: {
    id: 'dinner_plate',
    name: 'Dinner plate set',
    cat: 'tableware',
    sec: 'Place settings',
    group: 'plate',
    surf: 'table',
    fp: 0.07,
    price: 4,
    kw: 'plate dinner setting',
    pal: false,
    build(g) {
      cyl(g, 0.13, 0.13, 0.012, M('#f7f2e8', 0.4), 0, 0.02, 0, 32);
      cyl(g, 0.09, 0.09, 0.012, M('#f7f2e8', 0.4), 0, 0.032, 0, 32);
    },
  },
  stem_glassware: {
    id: 'stem_glassware',
    name: 'Stemware',
    cat: 'tableware',
    sec: 'Glassware',
    group: 'glass',
    surf: 'table',
    fp: 0.03,
    price: 5,
    kw: 'glass wine water stemware',
    pal: false,
    build(g) {
      cyl(g, 0.03, 0.02, 0.01, glass(), 0, 0.005, 0, 16);
      cyl(g, 0.004, 0.004, 0.09, glass(), 0, 0.06, 0, 8);
      mesh(g, new THREE.SphereGeometry(0.035, 16, 12), glass(), 0, 0.14, 0);
    },
  },
  menu_card: {
    id: 'menu_card',
    name: 'Menu card',
    cat: 'tableware',
    sec: 'Paper goods',
    group: 'paper',
    surf: 'table',
    fp: 0.02,
    price: 3,
    kw: 'menu card paper',
    note: 'Editable text',
    hasText: true,
    pal: false,
    build(g, { text }) {
      box(g, 0.09, 0.13, 0.004, M('#fff', 0.7, 0, { map: textTexture(text ?? 'Menu', { size: 44, serif: true }) }), 0, 0.065, 0);
    },
  },

  centerpiece_garden: {
    id: 'centerpiece_garden',
    name: 'Garden centerpiece',
    cat: 'florals',
    sec: 'Table arrangements',
    group: 'centerpiece',
    surf: 'table',
    fp: 0.2,
    price: 85,
    kw: 'centerpiece florals arrangement roses',
    pal: true,
    top: { h: 0.3, r: 0.24 },
    build(g, { builder, palette }) {
      cyl(g, 0.11, 0.09, 0.16, M('#e9e2d2', 0.6), 0, 0.08, 0, 24);
      const cols = palette.b;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        builder.rose(Math.cos(a) * 0.09, Math.sin(a) * 0.09, cols[i % cols.length], 0.16, 0.16);
      }
      builder.rose(0, 0, cols[0], 0.2, 0.2);
      builder.flush();
    },
  },
  centerpiece_bud: {
    id: 'centerpiece_bud',
    name: 'Bud vase trio',
    cat: 'florals',
    sec: 'Table arrangements',
    group: 'centerpiece',
    surf: 'table',
    fp: 0.05,
    price: 22,
    kw: 'bud vase minimal florals',
    pal: true,
    top: { h: 0.22, r: 0.05 },
    build(g, { builder, palette }) {
      const cols = palette.b;
      [-0.08, 0, 0.08].forEach((x, i) => {
        cyl(g, 0.012, 0.016, 0.16, glass(), x, 0.08, 0, 12);
        builder.rose(x, 0, cols[i % cols.length], 0.09, 0.16);
      });
      builder.flush();
    },
  },
  garland_table: {
    id: 'garland_table',
    name: 'Table garland',
    cat: 'florals',
    sec: 'Table arrangements',
    group: 'garland',
    surf: 'table',
    fp: 0.06,
    price: 40,
    kw: 'garland greenery table runner',
    pal: true,
    build(_g, { builder, palette }) {
      for (let z = -0.75; z <= 0.75; z += 0.14) builder.fern(0, z, 0.55, '#4c7a34', 0.02);
      if (palette.b[0]) for (let z = -0.6; z <= 0.6; z += 0.3) builder.rose(0, z, palette.b[0], 0.09, 0.05);
      builder.flush();
    },
  },
  urn_arrangement: {
    id: 'urn_arrangement',
    name: 'Floor urn arrangement',
    cat: 'florals',
    sec: 'Floor arrangements',
    group: 'urn',
    surf: 'floor',
    fp: 0.35,
    price: 220,
    kw: 'urn pedestal floral floor arrangement tall',
    pal: true,
    build(g, { builder, palette }) {
      cyl(g, 0.16, 0.2, 0.85, M('#cfc6b4', 0.7), 0, 0.425, 0, 20);
      cyl(g, 0.22, 0.18, 0.22, M('#cfc6b4', 0.7), 0, 0.9, 0, 20);
      const cols = palette.b;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        builder.rose(Math.cos(a) * 0.16, Math.sin(a) * 0.16, cols[i % cols.length], 0.24, 1.05);
      }
      builder.rose(0, 0, cols[0], 0.3, 1.3);
      builder.flush();
    },
  },
  hanging_florals: {
    id: 'hanging_florals',
    name: 'Suspended floral hoop',
    cat: 'florals',
    sec: 'Suspended',
    group: 'hanging',
    surf: 'hang',
    fp: 0.25,
    price: 180,
    kw: 'hanging floral hoop suspended ceiling',
    pal: true,
    build(g, { builder, palette }) {
      mesh(g, new THREE.TorusGeometry(0.35, 0.02, 8, 32), M('#4a3a2a', 0.8), 0, 0, 0);
      const cols = palette.b;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        builder.rose(Math.cos(a) * 0.35, Math.sin(a) * 0.35, cols[i % cols.length], 0.13, 0);
      }
      builder.wire([0, 0, 0], [0, 0.5, 0]);
      builder.flush();
    },
  },

  pillar_candle: {
    id: 'pillar_candle',
    name: 'Pillar candle',
    cat: 'candles',
    sec: 'Candles',
    group: 'candle',
    surf: 'table',
    fp: 0.04,
    price: 8,
    kw: 'candle pillar wax',
    pal: false,
    top: { h: 0.24, r: 0.045 },
    build(g, { builder }) {
      cyl(g, 0.045, 0.045, 0.22, M('#f7f0dd', 0.6), 0, 0.11, 0, 20);
      flame(builder, 0, 0.23, 0, 0.7);
      builder.flush();
    },
  },
  tealight: {
    id: 'tealight',
    name: 'Tealight',
    cat: 'candles',
    sec: 'Candles',
    group: 'candle',
    surf: 'table',
    fp: 0.02,
    price: 2,
    kw: 'tealight small candle',
    pal: false,
    build(g, { builder }) {
      cyl(g, 0.025, 0.025, 0.03, M('#f7f0dd', 0.6), 0, 0.015, 0, 16);
      flame(builder, 0, 0.035, 0, 0.4);
      builder.flush();
    },
  },
  lantern_brass: {
    id: 'lantern_brass',
    name: 'Brass lantern',
    cat: 'candles',
    sec: 'Lanterns',
    group: 'lantern',
    surf: 'table',
    fp: 0.08,
    price: 26,
    kw: 'lantern brass metal candle',
    pal: false,
    top: { h: 0.32, r: 0.09 },
    build(g, { builder }) {
      const frame = M('#8a6a3a', 0.4, 0.7);
      box(g, 0.16, 0.28, 0.16, frame, 0, 0.14, 0);
      box(g, 0.17, 0.28, 0.005, glass(), 0, 0.14, 0.08);
      box(g, 0.17, 0.28, 0.005, glass(), 0, 0.14, -0.08);
      box(g, 0.005, 0.28, 0.17, glass(), 0.08, 0.14, 0);
      box(g, 0.005, 0.28, 0.17, glass(), -0.08, 0.14, 0);
      cyl(g, 0.1, 0.1, 0.02, frame, 0, 0.29, 0, 4);
      flame(builder, 0, 0.16, 0, 0.6);
      builder.flush();
    },
  },
  hanging_lantern: {
    id: 'hanging_lantern',
    name: 'Hanging lantern',
    cat: 'candles',
    sec: 'Lanterns',
    group: 'lantern',
    surf: 'hang',
    fp: 0.12,
    price: 34,
    kw: 'hanging lantern candle ceiling',
    pal: false,
    build(g, { builder }) {
      const frame = M('#8a6a3a', 0.4, 0.7);
      box(g, 0.14, 0.22, 0.14, frame, 0, -0.11, 0);
      box(g, 0.15, 0.22, 0.005, glass(), 0, -0.11, 0.07);
      box(g, 0.15, 0.22, 0.005, glass(), 0, -0.11, -0.07);
      builder.wire([0, 0, 0], [0, -0.22, 0]);
      flame(builder, 0, -0.13, 0, 0.55);
      builder.flush();
    },
  },

  floral_arch: {
    id: 'floral_arch',
    name: 'Floral ceremony arch',
    cat: 'furniture',
    sec: 'Structures',
    group: 'arch',
    surf: 'floor',
    fp: 1.2,
    price: 450,
    kw: 'arch ceremony floral structure backdrop',
    pal: true,
    build(g, { builder, palette }) {
      mesh(g, new THREE.TorusGeometry(1.1, 0.05, 8, 40, Math.PI), M('#5b4634', 0.8), 0, 2.1, 0);
      const cols = palette.b;
      for (let i = 0; i <= 20; i++) {
        const a = Math.PI - (i / 20) * Math.PI;
        builder.rose(Math.cos(a) * 1.1, 2.1 + Math.sin(a) * 1.1, cols[i % cols.length], 0.16, 0);
      }
      cyl(g, 0.06, 0.06, 2.1, M('#5b4634', 0.8), -1.1, 1.05, 0, 12);
      cyl(g, 0.06, 0.06, 2.1, M('#5b4634', 0.8), 1.1, 1.05, 0, 12);
      builder.flush();
    },
  },
  lounge_sofa: {
    id: 'lounge_sofa',
    name: 'Lounge sofa',
    cat: 'furniture',
    sec: 'Lounge',
    group: 'lounge',
    surf: 'floor',
    fp: 0.5,
    price: 320,
    kw: 'sofa lounge seating furniture',
    pal: true,
    build(g, { palette, color }) {
      const c = color ?? palette.f;
      box(g, 1.8, 0.4, 0.75, M(c, 0.85), 0, 0.2, 0);
      box(g, 1.8, 0.35, 0.15, M(c, 0.85), 0, 0.55, -0.3);
      box(g, 0.15, 0.35, 0.75, M(c, 0.85), -0.9, 0.45, 0);
      box(g, 0.15, 0.35, 0.75, M(c, 0.85), 0.9, 0.45, 0);
    },
  },
  uplight: {
    id: 'uplight',
    name: 'LED uplight',
    cat: 'furniture',
    sec: 'Lighting',
    group: 'lighting',
    surf: 'floor',
    fp: 0.06,
    price: 15,
    kw: 'uplight led lighting mood',
    pal: false,
    build(g, { builder }) {
      cyl(g, 0.06, 0.07, 0.14, M('#222', 0.5, 0.4), 0, 0.07, 0, 16);
      builder.add('glow', [0, 0.15, 0], [0.05, 0.02, 0.05], '#ffb866', null, 5);
      builder.flush();
    },
  },
  welcome_sign: {
    id: 'welcome_sign',
    name: 'Welcome sign',
    cat: 'furniture',
    sec: 'Signage',
    group: 'signage',
    surf: 'floor',
    fp: 0.15,
    price: 60,
    kw: 'welcome sign easel signage',
    note: 'Editable text',
    hasText: true,
    pal: true,
    build(g, { palette, color, text }) {
      const frame = M(color ?? palette.f, 0.7);
      box(g, 0.05, 1.1, 0.05, frame, -0.35, 0.55, 0);
      box(g, 0.05, 1.1, 0.05, frame, 0.35, 0.55, 0);
      box(g, 0.75, 0.02, 0.5, M('#fff', 0.6, 0, { map: textTexture(text ?? 'Welcome', { size: 48, serif: true }) }), 0, 0.85, 0).rotation.x = -0.12;
    },
  },
};

export const ITEM_LIST: CatalogueItem[] = Object.values(ITEMS);
