import * as THREE from 'three';
import type { CatalogueItem } from '../types';
import { box, cyl, mesh, M, pick } from '../three/utils';
import { T, tm, noise } from '../three/textures';
import { flame } from '../three/builder';
import { buildChair } from './chairs';

export interface Category {
  id: string;
  label: string;
}

export const CATEGORIES: Category[] = [
  { id: 'linens', label: 'Linens' },
  { id: 'chairs', label: 'Chairs' },
  { id: 'tableware', label: 'Tableware' },
  { id: 'florals', label: 'Florals' },
  { id: 'candles', label: 'Candles & light' },
  { id: 'furniture', label: 'Furniture & lighting' },
  { id: 'wedding', label: 'Wedding' },
  { id: 'holiday', label: 'Holiday' },
  { id: 'faith', label: 'Faith & culture' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'parties', label: 'Parties & kids' },
  { id: 'desserts', label: 'Desserts' },
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

const angle = (i: number, n: number) => (i / n) * Math.PI * 2;

function repeatingLogoTexture(text: string, fg: string) {
  return T(
    (ctx, w, h) => {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = fg;
      ctx.font = "600 34px Jost,sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 2; col++) {
          ctx.save();
          ctx.translate((col + 0.5) * (w / 2), (row + 0.5) * (h / 4));
          if (row % 2) ctx.rotate(Math.PI);
          ctx.fillText(text, 0, 0, w * 0.45);
          ctx.restore();
        }
      }
    },
    [1, 1],
    512,
  );
}

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
  napkin_ring: {
    id: 'napkin_ring',
    name: 'Napkin ring',
    cat: 'linens',
    sec: 'Place settings',
    group: 'napkin',
    surf: 'table',
    fp: 0.02,
    price: 3,
    kw: 'napkin ring accessory metal',
    pal: true,
    build(g, { palette, color }) {
      mesh(g, new THREE.TorusGeometry(0.045, 0.008, 8, 20), M(color ?? palette.b[0] ?? '#c9a25a', 0.3, 0.8), 0, 0.045, 0).rotation.x = Math.PI / 2;
    },
  },
  runner_velvet: {
    id: 'runner_velvet',
    name: 'Velvet runner',
    cat: 'linens',
    sec: 'Runners',
    group: 'runner',
    surf: 'table',
    fp: 0.05,
    price: 26,
    kw: 'velvet runner jewel tone rich',
    tag: 'Rich',
    pal: false,
    build(g) {
      box(g, 0.46, 0.014, 1.7, M('#5e1b26', 0.95), 0, 0.001, 0);
    },
  },
  overlay_lace_full: {
    id: 'overlay_lace_full',
    name: 'Full lace overlay',
    cat: 'linens',
    sec: 'Overlays',
    group: 'overlay',
    surf: 'table',
    fp: 0.3,
    price: 38,
    kw: 'lace overlay vintage full tablecloth',
    pal: false,
    build(g) {
      box(g, 1.55, 0.01, 1.55, tm(T(noise('#fbfaf6', ['#f2efe6', '#ffffff', '#efe9dc'], 6000, 1), [6, 6])), 0, 0.0015, 0);
    },
  },

  chair_cross: {
    id: 'chair_cross',
    name: 'Cross-back chair',
    cat: 'chairs',
    sec: 'Chair styles',
    group: 'chair',
    surf: 'floor',
    fp: 0,
    price: 8,
    kw: 'chair cross back farmhouse wood',
    pal: false,
    chairStyle: { type: 'cross', color: '#7a5234', seat: '#d8c7a8' },
    build(g, { chairStyle }) {
      buildChair(g, chairStyle!);
    },
  },
  chair_chiavari_gold: {
    id: 'chair_chiavari_gold',
    name: 'Gold chiavari chair',
    cat: 'chairs',
    sec: 'Chair styles',
    group: 'chair',
    surf: 'floor',
    fp: 0,
    price: 9,
    kw: 'chair chiavari gold ballroom metal',
    pal: false,
    chairStyle: { type: 'chiavari', color: '#c8a45a', seat: '#f2eadb', metal: true },
    build(g, { chairStyle }) {
      buildChair(g, chairStyle!);
    },
  },
  chair_chiavari_white: {
    id: 'chair_chiavari_white',
    name: 'White chiavari chair',
    cat: 'chairs',
    sec: 'Chair styles',
    group: 'chair',
    surf: 'floor',
    fp: 0,
    price: 8,
    kw: 'chair chiavari white wood',
    pal: false,
    chairStyle: { type: 'chiavari', color: '#f2efe9', seat: '#f7f3ec' },
    build(g, { chairStyle }) {
      buildChair(g, chairStyle!);
    },
  },
  chair_rattan: {
    id: 'chair_rattan',
    name: 'Rattan chair',
    cat: 'chairs',
    sec: 'Chair styles',
    group: 'chair',
    surf: 'floor',
    fp: 0,
    price: 10,
    kw: 'chair rattan woven natural boho',
    pal: false,
    chairStyle: { type: 'rattan', color: '#c9a877', seat: '#f1e9d8' },
    build(g, { chairStyle }) {
      buildChair(g, chairStyle!);
    },
  },
  chair_bent: {
    id: 'chair_bent',
    name: 'Bistro chair',
    cat: 'chairs',
    sec: 'Chair styles',
    group: 'chair',
    surf: 'floor',
    fp: 0,
    price: 9,
    kw: 'chair bistro bentwood cafe industrial',
    pal: false,
    chairStyle: { type: 'bent', color: '#1e1c1b', seat: '#2a2622' },
    build(g, { chairStyle }) {
      buildChair(g, chairStyle!);
    },
  },
  chair_ghost: {
    id: 'chair_ghost',
    name: 'Ghost chair',
    cat: 'chairs',
    sec: 'Chair styles',
    group: 'chair',
    surf: 'floor',
    fp: 0,
    price: 12,
    kw: 'chair ghost acrylic clear modern',
    pal: false,
    chairStyle: { type: 'ghost', color: '#dfe9ee' },
    build(g, { chairStyle }) {
      buildChair(g, chairStyle!);
    },
  },
  chair_venue_default: {
    id: 'chair_venue_default',
    name: 'Match the venue',
    cat: 'chairs',
    sec: 'Chair styles',
    group: 'chair',
    surf: 'floor',
    fp: 0,
    price: 0,
    kw: 'chair default venue reset',
    note: 'Resets to the venue default',
    pal: false,
    resetChair: true,
    build(g) {
      const wire = new THREE.LineBasicMaterial({ color: '#9a8a70' });
      const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.42, 0.9, 0.42));
      const box3 = new THREE.LineSegments(edges, wire);
      box3.position.set(0, 0.45, 0);
      g.add(box3);
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
  place_card: {
    id: 'place_card',
    name: 'Place card',
    cat: 'tableware',
    sec: 'Paper goods',
    group: 'paper',
    surf: 'table',
    fp: 0.015,
    price: 2,
    kw: 'place card name paper escort',
    note: 'Editable text',
    hasText: true,
    pal: false,
    build(g, { text }) {
      box(g, 0.09, 0.004, 0.05, M('#fff', 0.7, 0, { map: textTexture(text ?? 'Name', { size: 44, serif: true }) }), 0, 0.03, 0).rotation.x = -1.15;
    },
  },
  water_goblet: {
    id: 'water_goblet',
    name: 'Water goblet',
    cat: 'tableware',
    sec: 'Glassware',
    group: 'glass',
    surf: 'table',
    fp: 0.028,
    price: 4,
    kw: 'water goblet glass tumbler',
    pal: false,
    build(g) {
      cyl(g, 0.028, 0.022, 0.11, glass(), 0, 0.055, 0, 16);
      cyl(g, 0.03, 0.03, 0.008, glass(), 0, 0.004, 0, 16);
    },
  },
  flatware_set: {
    id: 'flatware_set',
    name: 'Flatware set',
    cat: 'tableware',
    sec: 'Place settings',
    group: 'flatware',
    surf: 'table',
    fp: 0.02,
    price: 6,
    kw: 'flatware fork knife spoon cutlery',
    pal: false,
    build(g) {
      const metal = M('#dcdcdc', 0.22, 1);
      box(g, 0.015, 0.004, 0.2, metal, -0.12, 0.002, 0);
      box(g, 0.015, 0.004, 0.2, metal, 0.12, 0.002, 0);
      box(g, 0.012, 0.004, 0.18, metal, 0.09, 0.002, 0);
    },
  },
  charger_silver: {
    id: 'charger_silver',
    name: 'Silver charger',
    cat: 'tableware',
    sec: 'Place settings',
    group: 'charger',
    surf: 'table',
    fp: 0.09,
    price: 6,
    kw: 'charger plate silver modern',
    pal: false,
    top: { h: 0.015, r: 0.16 },
    build(g) {
      cyl(g, 0.16, 0.16, 0.012, M('#dcdcdc', 0.22, 1), 0, 0.006, 0, 40);
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
  centerpiece_wildflower: {
    id: 'centerpiece_wildflower',
    name: 'Wildflower centerpiece',
    cat: 'florals',
    sec: 'Table arrangements',
    group: 'centerpiece',
    surf: 'table',
    fp: 0.16,
    price: 55,
    kw: 'wildflower loose centerpiece meadow boho',
    tag: 'Boho',
    pal: true,
    top: { h: 0.26, r: 0.18 },
    build(g, { builder, palette }) {
      cyl(g, 0.07, 0.06, 0.14, glass(), 0, 0.07, 0, 16);
      const cols = palette.b;
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4;
        const r = 0.04 + (i % 5) * 0.025;
        builder.rose(Math.cos(a) * r, Math.sin(a) * r, cols[i % cols.length], 0.1 + (i % 3) * 0.02, 0.14);
      }
      builder.fern(0, 0, 0.5, '#5d7a3a', 0.14);
      builder.flush();
    },
  },
  pampas_arrangement: {
    id: 'pampas_arrangement',
    name: 'Pampas grass arrangement',
    cat: 'florals',
    sec: 'Floor arrangements',
    group: 'pampas',
    surf: 'floor',
    fp: 0.3,
    price: 95,
    kw: 'pampas grass boho floor arrangement neutral',
    tag: 'Boho',
    pal: false,
    build(g, { builder }) {
      cyl(g, 0.14, 0.18, 0.5, M('#cfc6b4', 0.7), 0, 0.25, 0, 20);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2,
          r = 0.1;
        builder.add('rod', [Math.cos(a) * r, 0.9, Math.sin(a) * r], [0.02, 0.9, 0.02], '#d9c9a3', [Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15]);
        builder.add('leaf', [Math.cos(a) * r * 1.3, 1.35, Math.sin(a) * r * 1.3], [0.06, 0.22, 0.06], '#efe6d2');
      }
      builder.flush();
    },
  },
  garland_hanging_greenery: {
    id: 'garland_hanging_greenery',
    name: 'Hanging greenery garland',
    cat: 'florals',
    sec: 'Suspended',
    group: 'hanging',
    surf: 'hang',
    fp: 0.15,
    price: 120,
    kw: 'hanging garland greenery installation ceiling',
    pal: true,
    build(_g, { builder, palette }) {
      for (let z = -0.6; z <= 0.6; z += 0.12) builder.fern(0, z, 0.4, '#4c7a34', -0.15 - Math.abs(z) * 0.3);
      if (palette.b[0]) for (let z = -0.5; z <= 0.5; z += 0.25) builder.rose(0, z, palette.b[0], 0.08, -0.2);
      builder.wire([0, 0, -0.6], [0, 0, 0.6]);
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
  votive_cluster: {
    id: 'votive_cluster',
    name: 'Votive cluster',
    cat: 'candles',
    sec: 'Candles',
    group: 'candle',
    surf: 'table',
    fp: 0.05,
    price: 6,
    kw: 'votive cluster small candles trio',
    pal: false,
    build(g, { builder }) {
      const spots: [number, number][] = [
        [-0.04, -0.02],
        [0.03, 0.03],
        [0.01, -0.04],
      ];
      for (const [x, z] of spots) {
        cyl(g, 0.02, 0.02, 0.025, glass(), x, 0.0125, z, 12);
        flame(builder, x, 0.03, z, 0.35);
      }
      builder.flush();
    },
  },
  taper_candle: {
    id: 'taper_candle',
    name: 'Taper candle',
    cat: 'candles',
    sec: 'Candles',
    group: 'candle',
    surf: 'table',
    fp: 0.03,
    price: 10,
    kw: 'taper candle elegant tall holder',
    pal: false,
    top: { h: 0.34, r: 0.03 },
    build(g, { builder }) {
      cyl(g, 0.012, 0.012, 0.3, M('#f7f0dd', 0.6), 0, 0.15, 0, 12);
      cyl(g, 0.035, 0.045, 0.03, M('#c9a25a', 0.3, 0.9), 0, 0.015, 0, 20);
      flame(builder, 0, 0.31, 0, 0.6);
      builder.flush();
    },
  },
  chandelier_candle: {
    id: 'chandelier_candle',
    name: 'Candle chandelier',
    cat: 'candles',
    sec: 'Lanterns',
    group: 'lantern',
    surf: 'hang',
    fp: 0.3,
    price: 220,
    kw: 'candle chandelier hanging ring elegant',
    tag: 'Statement',
    pal: false,
    build(g, { builder }) {
      const gold = M('#c9a25a', 0.3, 0.9);
      mesh(g, new THREE.TorusGeometry(0.32, 0.015, 8, 32), gold, 0, 0, 0).rotation.x = Math.PI / 2;
      builder.wire([0, 0, 0], [0, -0.4, 0]);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2,
          x = Math.cos(a) * 0.32,
          z = Math.sin(a) * 0.32;
        builder.add('rod', [x, -0.04, z], [0.008, 0.08, 0.008], '#f7f0dd');
        flame(builder, x, 0.01, z, 0.45);
      }
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
  dance_floor: {
    id: 'dance_floor',
    name: 'Dance floor',
    cat: 'furniture',
    sec: 'Structures',
    group: 'structure',
    surf: 'floor',
    fp: 2,
    price: 600,
    kw: 'dance floor structure checkerboard',
    build(g) {
      box(g, 4, 0.04, 4, M('#fff', 0.3, 0, { map: T((ctx, w, _h) => {
        const n = 8, s = w / n;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          ctx.fillStyle = (i + j) % 2 === 0 ? '#2a2620' : '#f2ece0';
          ctx.fillRect(i * s, j * s, s, s);
        }
      }, [1, 1], 256) }), 0, 0.02, 0);
    },
  },
  stage_platform: {
    id: 'stage_platform',
    name: 'Stage platform',
    cat: 'furniture',
    sec: 'Structures',
    group: 'structure',
    surf: 'floor',
    fp: 1.5,
    price: 450,
    kw: 'stage platform riser structure band',
    pal: true,
    build(g, { palette, color }) {
      box(g, 3, 0.4, 2, M(color ?? palette.f, 0.7), 0, 0.2, 0);
      box(g, 3.05, 0.05, 2.05, M('#2a2420', 0.6), 0, 0.42, 0);
    },
  },
  drapery_panel: {
    id: 'drapery_panel',
    name: 'Drapery panel',
    cat: 'furniture',
    sec: 'Structures',
    group: 'structure',
    surf: 'floor',
    fp: 0.3,
    price: 180,
    kw: 'drapery panel backdrop pipe fabric',
    pal: true,
    build(g, { palette, color }) {
      const c = color ?? palette.f;
      cyl(g, 0.03, 0.03, 3, M('#2a2420', 0.6), -1, 1.5, 0, 8);
      cyl(g, 0.03, 0.03, 3, M('#2a2420', 0.6), 1, 1.5, 0, 8);
      box(g, 0.03, 0.03, 2, M('#2a2420', 0.6), 0, 3, 0).rotation.y = Math.PI / 2;
      const drape = mesh(g, new THREE.PlaneGeometry(2, 2.9, 8, 1), M(c, 0.9, 0, { side: THREE.DoubleSide }), 0, 1.5, 0);
      const pos = drape.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((i % 9) * 1.4) * 0.06);
      drape.geometry.computeVertexNormals();
    },
  },
  market_umbrella: {
    id: 'market_umbrella',
    name: 'Market umbrella',
    cat: 'furniture',
    sec: 'Lighting',
    group: 'lighting',
    surf: 'floor',
    fp: 0.4,
    price: 150,
    kw: 'umbrella shade market patio outdoor',
    pal: true,
    build(g, { palette, color }) {
      cyl(g, 0.02, 0.02, 2.2, M('#6b4a30', 0.7), 0, 1.1, 0);
      mesh(g, new THREE.ConeGeometry(1, 0.4, 8), M(color ?? palette.f, 0.8), 0, 2.4, 0);
    },
  },

  ottoman: {
    id: 'ottoman',
    name: 'Velvet ottoman',
    cat: 'lounge',
    sec: 'Seating',
    group: 'lounge',
    surf: 'floor',
    fp: 0.22,
    price: 65,
    kw: 'ottoman pouf lounge seating',
    addon: 'lounge-plus',
    pal: true,
    build(g, { palette, color }) {
      cyl(g, 0.22, 0.22, 0.32, M(color ?? palette.f, 0.75), 0, 0.16, 0, 20);
    },
  },
  coffee_table: {
    id: 'coffee_table',
    name: 'Lounge coffee table',
    cat: 'lounge',
    sec: 'Tables',
    group: 'lounge',
    surf: 'floor',
    fp: 0.3,
    price: 90,
    kw: 'coffee table lounge low table',
    addon: 'lounge-plus',
    pal: false,
    top: { h: 0.32, w: 0.6, d: 0.6 },
    build(g) {
      const wood = M('#5b4634', 0.7);
      box(g, 0.6, 0.03, 0.6, wood, 0, 0.32, 0);
      for (const [x, z] of [
        [-0.26, -0.26],
        [0.26, -0.26],
        [-0.26, 0.26],
        [0.26, 0.26],
      ] as [number, number][]) {
        cyl(g, 0.018, 0.018, 0.3, wood, x, 0.15, z);
      }
    },
  },
  bar_cart: {
    id: 'bar_cart',
    name: 'Bar cart',
    cat: 'lounge',
    sec: 'Bar',
    group: 'lounge',
    surf: 'floor',
    fp: 0.25,
    price: 140,
    kw: 'bar cart drinks trolley lounge',
    addon: 'lounge-plus',
    pal: false,
    top: { h: 0.75, r: 0.22 },
    build(g) {
      const metal = M('#c9a25a', 0.3, 0.8);
      cyl(g, 0.22, 0.22, 0.02, metal, 0, 0.75, 0, 24);
      cyl(g, 0.18, 0.18, 0.02, metal, 0, 0.4, 0, 24);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        cyl(g, 0.012, 0.012, 0.75, metal, Math.cos(a) * 0.19, 0.375, Math.sin(a) * 0.19);
      }
    },
  },

  neon_sign: {
    id: 'neon_sign',
    name: 'Neon sign',
    cat: 'signage',
    sec: 'Signage',
    group: 'signage',
    surf: 'floor',
    fp: 0.1,
    price: 140,
    kw: 'neon sign light up custom text',
    addon: 'signage-plus',
    hasText: true,
    pal: true,
    build(g, { builder, palette, color }) {
      const c = color ?? palette.b[0] ?? '#f2bcc0';
      const neon = M(c, 0.3, 0, { emissive: c, emissiveIntensity: 2 });
      const stand = M('#222', 0.6);
      box(g, 0.9, 0.5, 0.03, M('#111', 0.7), 0, 1.1, 0);
      box(g, 0.8, 0.02, 0.02, neon, 0, 1.3, 0.02);
      box(g, 0.8, 0.02, 0.02, neon, 0, 0.9, 0.02);
      box(g, 0.02, 0.42, 0.02, neon, -0.42, 1.1, 0.02);
      box(g, 0.02, 0.42, 0.02, neon, 0.42, 1.1, 0.02);
      for (let i = 0; i < 6; i++) builder.add('glow', [-0.35 + i * 0.14, 1.1, 0.03], 0.02, c, null, 4);
      box(g, 0.04, 1.1, 0.04, stand, -0.4, 0.55, -0.05);
      box(g, 0.04, 1.1, 0.04, stand, 0.4, 0.55, -0.05);
      builder.flush();
    },
  },
  escort_display: {
    id: 'escort_display',
    name: 'Escort card display',
    cat: 'signage',
    sec: 'Signage',
    group: 'signage',
    surf: 'floor',
    fp: 0.5,
    price: 220,
    kw: 'escort card display wall seating chart',
    addon: 'signage-plus',
    pal: true,
    build(g, { palette, color }) {
      const c = color ?? palette.f;
      box(g, 1.6, 1.4, 0.04, M(c, 0.8), 0, 0.9, 0);
      for (let x = -0.7; x <= 0.7; x += 0.28) box(g, 0.02, 1.3, 0.02, M('#c9a25a', 0.4, 0.6), x, 0.9, 0.03);
    },
  },

  wedding_cake: {
    id: 'wedding_cake',
    name: 'Wedding cake',
    cat: 'desserts',
    sec: 'Cakes',
    group: 'cake',
    surf: 'table',
    fp: 0.16,
    price: 380,
    kw: 'wedding cake tiered dessert',
    pal: true,
    top: { h: 0.42, r: 0.1 },
    build(g, { palette, color }) {
      const icing = M(color ?? palette.f, 0.6);
      cyl(g, 0.18, 0.19, 0.16, icing, 0, 0.08, 0, 32);
      cyl(g, 0.13, 0.14, 0.14, icing, 0, 0.23, 0, 32);
      cyl(g, 0.08, 0.09, 0.12, icing, 0, 0.36, 0, 32);
      if (palette.b[0]) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          box(g, 0.015, 0.015, 0.015, M(palette.b[i % palette.b.length], 0.7), Math.cos(a) * 0.17, 0.16, Math.sin(a) * 0.17);
        }
      }
    },
  },
  dessert_stand: {
    id: 'dessert_stand',
    name: 'Dessert stand',
    cat: 'desserts',
    sec: 'Desserts',
    group: 'dessert',
    surf: 'table',
    fp: 0.1,
    price: 45,
    kw: 'dessert stand tiered treats sweets',
    pal: false,
    top: { h: 0.3, r: 0.13 },
    build(g) {
      const metal = M('#c9a25a', 0.3, 0.8);
      cyl(g, 0.13, 0.13, 0.01, glass(), 0, 0.2, 0, 24);
      cyl(g, 0.08, 0.08, 0.01, glass(), 0, 0.1, 0, 24);
      cyl(g, 0.012, 0.012, 0.2, metal, 0, 0.1, 0, 8);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        mesh(g, new THREE.SphereGeometry(0.025, 10, 8), M(i % 2 ? '#e6c9a0' : '#c98e5a', 0.7), Math.cos(a) * 0.06, 0.225, Math.sin(a) * 0.06);
      }
    },
  },
  donut_wall: {
    id: 'donut_wall',
    name: 'Donut wall',
    cat: 'desserts',
    sec: 'Desserts',
    group: 'dessert',
    surf: 'floor',
    fp: 0.6,
    price: 260,
    kw: 'donut wall dessert display board',
    tag: 'Fun',
    pal: true,
    build(g, { palette, color }) {
      box(g, 1.6, 1.2, 0.06, M(color ?? palette.f, 0.7), 0, 1, 0);
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 6; col++) {
          const x = -0.65 + col * 0.26,
            y = 0.6 + row * 0.34;
          box(g, 0.02, 0.02, 0.03, M('#8a6a4a', 0.6), x, y, 0.05);
          mesh(g, new THREE.TorusGeometry(0.09, 0.035, 8, 16), M(['#e2a06a', '#e88ba0', '#c98e5a'][(row + col) % 3], 0.6), x, y, 0.09).rotation.y = Math.PI / 2;
        }
    },
  },

  unity_candle_set: {
    id: 'unity_candle_set',
    name: 'Unity candle set',
    cat: 'wedding',
    sec: 'Ceremony',
    group: 'wedding',
    surf: 'table',
    fp: 0.08,
    price: 45,
    kw: 'unity candle ceremony wedding set',
    pal: false,
    build(g, { builder }) {
      cyl(g, 0.03, 0.03, 0.26, M('#f7f0dd', 0.6), 0, 0.13, 0, 16);
      flame(builder, 0, 0.27, 0, 0.6);
      for (const x of [-0.09, 0.09]) {
        cyl(g, 0.018, 0.018, 0.16, M('#f7f0dd', 0.6), x, 0.08, 0, 12);
        flame(builder, x, 0.17, 0, 0.4);
      }
      builder.flush();
    },
  },
  ring_pillow: {
    id: 'ring_pillow',
    name: 'Ring bearer pillow',
    cat: 'wedding',
    sec: 'Ceremony',
    group: 'wedding',
    surf: 'table',
    fp: 0.05,
    price: 20,
    kw: 'ring bearer pillow cushion wedding',
    pal: true,
    build(g, { palette, color }) {
      box(g, 0.16, 0.04, 0.16, M(color ?? palette.f, 0.85), 0, 0.02, 0);
      box(g, 0.16, 0.008, 0.16, M(palette.b[0] ?? '#c9a25a', 0.5, 0.6), 0, 0.045, 0);
    },
  },
  flower_girl_basket: {
    id: 'flower_girl_basket',
    name: 'Flower girl basket',
    cat: 'wedding',
    sec: 'Ceremony',
    group: 'wedding',
    surf: 'table',
    fp: 0.06,
    price: 25,
    kw: 'flower girl basket petals wedding',
    pal: true,
    build(g, { builder, palette }) {
      cyl(g, 0.06, 0.05, 0.08, M('#c9a877', 0.8), 0, 0.04, 0, 16);
      const cols = palette.b;
      for (let i = 0; i < 6; i++) {
        const a = angle(i, 6);
        builder.rose(Math.cos(a) * 0.02, Math.sin(a) * 0.02, cols[i % cols.length], 0.05, 0.08);
      }
      builder.flush();
    },
  },
  guest_book_stand: {
    id: 'guest_book_stand',
    name: 'Guest book stand',
    cat: 'wedding',
    sec: 'Reception',
    group: 'wedding',
    surf: 'table',
    fp: 0.08,
    price: 55,
    kw: 'guest book stand wedding reception',
    hasText: true,
    pal: true,
    build(g, { palette, color, text }) {
      const frame = M(color ?? palette.f, 0.7);
      cyl(g, 0.015, 0.015, 0.32, frame, -0.09, 0.16, 0);
      cyl(g, 0.015, 0.015, 0.32, frame, 0.09, 0.16, 0);
      box(g, 0.24, 0.02, 0.16, M('#fff', 0.6, 0, { map: textTexture(text ?? 'Guest Book', { size: 40 }) }), 0, 0.32, 0).rotation.x = -0.4;
    },
  },
  cake_topper: {
    id: 'cake_topper',
    name: 'Cake topper',
    cat: 'wedding',
    sec: 'Reception',
    group: 'wedding',
    surf: 'table',
    fp: 0.02,
    price: 18,
    kw: 'cake topper monogram wedding',
    hasText: true,
    pal: false,
    build(g, { text }) {
      box(g, 0.1, 0.06, 0.006, M('#c9a25a', 0.3, 0.9, { map: textTexture(text ?? 'M+R', { size: 44, serif: true, bg: 'transparent' }) }), 0, 0.05, 0);
    },
  },
  aisle_runner: {
    id: 'aisle_runner',
    name: 'Aisle runner',
    cat: 'wedding',
    sec: 'Ceremony',
    group: 'wedding',
    surf: 'floor',
    fp: 0.5,
    price: 60,
    kw: 'aisle runner fabric ceremony wedding',
    pal: true,
    build(g, { palette, color }) {
      box(g, 1, 0.006, 6, M(color ?? palette.f, 0.85), 0, 0.003, 0);
    },
  },
  seating_chart_easel: {
    id: 'seating_chart_easel',
    name: 'Seating chart easel',
    cat: 'wedding',
    sec: 'Reception',
    group: 'wedding',
    surf: 'floor',
    fp: 0.2,
    price: 70,
    kw: 'seating chart easel sign wedding',
    hasText: true,
    pal: true,
    build(g, { palette, color, text }) {
      const frame = M(color ?? palette.f, 0.7);
      box(g, 0.05, 1.3, 0.05, frame, -0.4, 0.65, 0);
      box(g, 0.05, 1.3, 0.05, frame, 0.4, 0.65, 0);
      box(g, 0.85, 0.02, 0.6, M('#fff', 0.6, 0, { map: textTexture(text ?? 'Find your seat', { size: 40, serif: true }) }), 0, 1, 0).rotation.x = -0.12;
    },
  },
  ceremony_bells: {
    id: 'ceremony_bells',
    name: 'Ceremony bell cluster',
    cat: 'wedding',
    sec: 'Ceremony',
    group: 'wedding',
    surf: 'hang',
    fp: 0.1,
    price: 30,
    kw: 'ceremony bells hanging wedding decor',
    pal: false,
    build(g, { builder }) {
      const gold = M('#c9a25a', 0.3, 0.9);
      for (let i = -1; i <= 1; i++) {
        mesh(g, new THREE.ConeGeometry(0.03, 0.05, 12), gold, i * 0.06, -0.05 - Math.abs(i) * 0.03, 0);
        builder.wire([i * 0.06, 0, 0], [i * 0.06, -0.03 - Math.abs(i) * 0.03, 0]);
      }
      builder.flush();
    },
  },

  christmas_tree: {
    id: 'christmas_tree',
    name: 'Christmas tree',
    cat: 'holiday',
    sec: 'Christmas',
    group: 'holiday',
    surf: 'floor',
    fp: 0.4,
    price: 180,
    kw: 'christmas tree holiday decor',
    pal: false,
    build(g, { builder }) {
      cyl(g, 0.1, 0.14, 0.2, M('#6b4a30', 0.7), 0, 0.1, 0, 12);
      for (let i = 0; i < 4; i++) {
        const y = 0.3 + i * 0.35,
          r = 0.5 - i * 0.11;
        mesh(g, new THREE.ConeGeometry(r, 0.4, 12), M('#2d4a2a', 0.8), 0, y, 0);
      }
      for (let i = 0; i < 14; i++) {
        const a = angle(i, 14),
          y = 0.35 + (i % 4) * 0.35;
        builder.add('glow', [Math.cos(a) * (0.35 - (i % 4) * 0.08), y, Math.sin(a) * (0.35 - (i % 4) * 0.08)], 0.025, pick(['#ffd79a', '#f2bcc0', '#c9d9b2']), null, 4);
      }
      mesh(g, new THREE.OctahedronGeometry(0.06, 0), M('#f3d9a4', 0.3, 0.8), 0, 1.85, 0);
      builder.flush();
    },
  },
  string_lights_wrap: {
    id: 'string_lights_wrap',
    name: 'Wrapped string lights',
    cat: 'holiday',
    sec: 'Christmas',
    group: 'holiday',
    surf: 'hang',
    fp: 0.1,
    price: 25,
    kw: 'string lights fairy holiday hanging',
    pal: false,
    build(_g, { builder }) {
      for (let i = 0; i < 10; i++) {
        const t = i / 9;
        builder.add('glow', [(t - 0.5) * 0.6, -Math.sin(t * Math.PI) * 0.1, 0], 0.02, '#ffd79a', null, 4);
      }
      builder.wire([-0.3, 0, 0], [0.3, 0, 0]);
      builder.flush();
    },
  },
  ornament_centerpiece: {
    id: 'ornament_centerpiece',
    name: 'Ornament centerpiece',
    cat: 'holiday',
    sec: 'Christmas',
    group: 'holiday',
    surf: 'table',
    fp: 0.12,
    price: 35,
    kw: 'ornament centerpiece bowl christmas glass',
    pal: true,
    build(g, { palette }) {
      cyl(g, 0.1, 0.08, 0.05, glass(), 0, 0.025, 0, 24);
      const cols = palette.b.length ? palette.b : ['#c9a25a', '#5e1b26', '#f3d9a4'];
      for (let i = 0; i < 9; i++) {
        const a = angle(i, 9),
          r = 0.02 + (i % 3) * 0.025;
        mesh(g, new THREE.SphereGeometry(0.025, 12, 10), M(cols[i % cols.length], 0.3, 0.6), Math.cos(a) * r, 0.06, Math.sin(a) * r);
      }
    },
  },
  wreath: {
    id: 'wreath',
    name: 'Holiday wreath',
    cat: 'holiday',
    sec: 'Christmas',
    group: 'holiday',
    surf: 'hang',
    fp: 0.15,
    price: 40,
    kw: 'wreath holiday hanging christmas',
    pal: false,
    build(_g, { builder }) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        builder.add('leaf', [Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0], 0.06, '#2d4a2a', null, 1);
      }
      builder.add('ball', [0, -0.2, 0.02], [0.03, 0.05, 0.02], '#8a2030');
      builder.flush();
    },
  },
  pumpkin_centerpiece: {
    id: 'pumpkin_centerpiece',
    name: 'Pumpkin centerpiece',
    cat: 'holiday',
    sec: 'Autumn',
    group: 'holiday',
    surf: 'table',
    fp: 0.1,
    price: 30,
    kw: 'pumpkin autumn fall centerpiece harvest',
    pal: false,
    build(g) {
      for (const [x, s] of [
        [-0.06, 0.7],
        [0.06, 0.8],
        [0, 1],
      ] as [number, number][]) {
        mesh(g, new THREE.SphereGeometry(0.06 * s, 16, 12), M('#c9702e', 0.7), x, 0.06 * s, 0);
        cyl(g, 0.008, 0.008, 0.03, M('#5b4634', 0.8), x, 0.11 * s, 0);
      }
    },
  },
  snowflake_hanging: {
    id: 'snowflake_hanging',
    name: 'Hanging snowflake',
    cat: 'holiday',
    sec: 'Christmas',
    group: 'holiday',
    surf: 'hang',
    fp: 0.08,
    price: 20,
    kw: 'snowflake hanging ornament winter',
    pal: false,
    build(g) {
      const mat = M('#eef4f9', 0.3, 0.6);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        box(g, 0.01, 0.01, 0.24, mat, 0, 0, 0).rotation.y = a;
      }
    },
  },

  menorah: {
    id: 'menorah',
    name: 'Menorah',
    cat: 'faith',
    sec: 'Judaica',
    group: 'faith',
    surf: 'table',
    fp: 0.14,
    price: 65,
    kw: 'menorah hanukkah judaica candles',
    pal: false,
    build(g, { builder }) {
      const gold = M('#c9a25a', 0.3, 0.9);
      box(g, 0.28, 0.02, 0.04, gold, 0, 0.1, 0);
      for (let i = -4; i <= 4; i++) {
        const h = i === 0 ? 0.16 : 0.11;
        cyl(g, 0.006, 0.006, h, gold, i * 0.03, 0.1 + h / 2, 0);
        cyl(g, 0.012, 0.012, 0.05, M('#f7f0dd', 0.6), i * 0.03, 0.1 + h + 0.005, 0);
        flame(builder, i * 0.03, 0.1 + h + 0.05, 0, 0.35);
      }
      builder.flush();
    },
  },
  chuppah: {
    id: 'chuppah',
    name: 'Chuppah',
    cat: 'faith',
    sec: 'Ceremony structures',
    group: 'faith',
    surf: 'floor',
    fp: 1.4,
    price: 480,
    kw: 'chuppah canopy jewish wedding ceremony structure',
    pal: true,
    build(g, { builder, palette, color }) {
      const wood = M('#6b4a30', 0.7);
      const posts: [number, number][] = [
        [-1.1, -1.1],
        [1.1, -1.1],
        [-1.1, 1.1],
        [1.1, 1.1],
      ];
      for (const [x, z] of posts) cyl(g, 0.05, 0.05, 2.4, wood, x, 1.2, z, 12);
      box(g, 2.3, 0.06, 0.06, wood, 0, 2.4, -1.1);
      box(g, 2.3, 0.06, 0.06, wood, 0, 2.4, 1.1);
      box(g, 0.06, 0.06, 2.3, wood, -1.1, 2.4, 0);
      box(g, 0.06, 0.06, 2.3, wood, 1.1, 2.4, 0);
      const canopy = mesh(g, new THREE.PlaneGeometry(2.4, 2.4, 6, 6), M(color ?? palette.f, 0.9, 0, { side: THREE.DoubleSide }), 0, 2.35, 0);
      canopy.rotation.x = Math.PI / 2;
      const pos = canopy.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, -Math.sin((pos.getX(i) / 2.4 + 0.5) * Math.PI) * 0.15);
      canopy.geometry.computeVertexNormals();
      const cols = palette.b;
      if (cols.length) for (const [x, z] of posts) builder.rose(x, z, cols[0], 0.14, 2.4);
      builder.flush();
    },
  },
  unity_cross: {
    id: 'unity_cross',
    name: 'Unity cross',
    cat: 'faith',
    sec: 'Christian',
    group: 'faith',
    surf: 'table',
    fp: 0.05,
    price: 40,
    kw: 'unity cross christian wedding ceremony',
    pal: false,
    build(g) {
      const wood = M('#8a6a4a', 0.7);
      box(g, 0.02, 0.24, 0.02, wood, 0, 0.12, 0);
      box(g, 0.14, 0.02, 0.02, wood, 0, 0.17, 0);
    },
  },
  prayer_candle_stand: {
    id: 'prayer_candle_stand',
    name: 'Prayer candle stand',
    cat: 'faith',
    sec: 'General',
    group: 'faith',
    surf: 'table',
    fp: 0.09,
    price: 30,
    kw: 'prayer candle stand votive faith',
    pal: false,
    build(g, { builder }) {
      cyl(g, 0.06, 0.07, 0.02, M('#c9a25a', 0.3, 0.8), 0, 0.01, 0, 20);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        cyl(g, 0.015, 0.015, 0.03, glass(), Math.cos(a) * 0.04, 0.035, Math.sin(a) * 0.04, 10);
        flame(builder, Math.cos(a) * 0.04, 0.055, Math.sin(a) * 0.04, 0.35);
      }
      builder.flush();
    },
  },
  paper_lantern_string: {
    id: 'paper_lantern_string',
    name: 'Paper lantern string',
    cat: 'faith',
    sec: 'Celebration',
    group: 'faith',
    surf: 'hang',
    fp: 0.15,
    price: 35,
    kw: 'paper lantern string asian celebration hanging',
    pal: true,
    build(g, { palette, color }) {
      const cols = [color ?? palette.b[0] ?? '#e2506a', palette.b[1] ?? '#f2bcc0', palette.b[2] ?? '#f3d9a4'];
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.22;
        mesh(g, new THREE.SphereGeometry(0.09, 16, 12), M(cols[i % cols.length], 0.6, 0, { emissive: cols[i % cols.length], emissiveIntensity: 0.4 }), x, -0.1 + Math.abs(i - 1) * 0.05, 0);
      }
    },
  },
  mandap_pillar: {
    id: 'mandap_pillar',
    name: 'Mandap pillar',
    cat: 'faith',
    sec: 'Ceremony structures',
    group: 'faith',
    surf: 'floor',
    fp: 0.15,
    price: 140,
    kw: 'mandap pillar indian wedding ceremony decor',
    pal: true,
    build(g, { builder, palette, color }) {
      const c = color ?? palette.f;
      cyl(g, 0.08, 0.1, 2.2, M(c, 0.7), 0, 1.1, 0, 16);
      for (let y = 0.3; y < 2.1; y += 0.3) builder.rose(0.1, y, palette.b[0] ?? '#f2bcc0', 0.08, y - 1.1);
      builder.flush();
    },
  },

  podium: {
    id: 'podium',
    name: 'Podium',
    cat: 'corporate',
    sec: 'Staging',
    group: 'corporate',
    surf: 'floor',
    fp: 0.15,
    price: 220,
    kw: 'podium lectern speaker stage corporate',
    pal: true,
    build(g, { palette, color }) {
      const c = color ?? palette.f;
      box(g, 0.5, 1.1, 0.4, M(c, 0.6), 0, 0.55, 0);
      box(g, 0.52, 0.06, 0.42, M('#2a2420', 0.6), 0, 1.13, 0).rotation.x = -0.15;
    },
  },
  projector_screen: {
    id: 'projector_screen',
    name: 'Projector screen',
    cat: 'corporate',
    sec: 'Staging',
    group: 'corporate',
    surf: 'floor',
    fp: 0.9,
    price: 150,
    kw: 'projector screen presentation corporate av',
    pal: false,
    build(g) {
      cyl(g, 0.03, 0.03, 2.2, M('#2a2a2e', 0.6), -1.6, 1.1, 0, 8);
      cyl(g, 0.03, 0.03, 2.2, M('#2a2a2e', 0.6), 1.6, 1.1, 0, 8);
      box(g, 3.2, 1.8, 0.03, M('#f2f2ee', 0.8), 0, 1.8, 0);
    },
  },
  step_repeat_banner: {
    id: 'step_repeat_banner',
    name: 'Step & repeat banner',
    cat: 'corporate',
    sec: 'Branding',
    group: 'corporate',
    surf: 'floor',
    fp: 0.3,
    price: 180,
    kw: 'step repeat banner backdrop logo branding corporate',
    hasText: true,
    pal: true,
    build(g, { palette, color, text }) {
      const frame = M('#2a2420', 0.6);
      cyl(g, 0.03, 0.03, 2.6, frame, -1, 1.3, 0, 8);
      cyl(g, 0.03, 0.03, 2.6, frame, 1, 1.3, 0, 8);
      box(g, 2, 2.4, 0.03, M('#fff', 0.6, 0, { map: repeatingLogoTexture(text ?? 'LOGO', color ?? palette.f) }), 0, 1.5, 0);
    },
  },
  registration_desk: {
    id: 'registration_desk',
    name: 'Registration desk',
    cat: 'corporate',
    sec: 'Logistics',
    group: 'corporate',
    surf: 'floor',
    fp: 0.4,
    price: 220,
    kw: 'registration desk check-in corporate logistics',
    pal: true,
    top: { h: 0.75, w: 1.4, d: 0.5 },
    build(g, { palette, color }) {
      box(g, 1.4, 0.75, 0.5, M(color ?? palette.f, 0.7), 0, 0.375, 0);
    },
  },
  charging_station: {
    id: 'charging_station',
    name: 'Charging station',
    cat: 'corporate',
    sec: 'Logistics',
    group: 'corporate',
    surf: 'floor',
    fp: 0.15,
    price: 60,
    kw: 'charging station kiosk phone corporate logistics',
    pal: false,
    build(g, { builder }) {
      box(g, 0.3, 1, 0.3, M('#2a2a2e', 0.6), 0, 0.5, 0);
      builder.add('glow', [0, 1.02, 0], [0.28, 0.02, 0.28], '#6fb8ff', null, 2);
      builder.flush();
    },
  },
  branded_centerpiece: {
    id: 'branded_centerpiece',
    name: 'Branded centerpiece',
    cat: 'corporate',
    sec: 'Branding',
    group: 'corporate',
    surf: 'table',
    fp: 0.09,
    price: 40,
    kw: 'branded centerpiece logo corporate event',
    hasText: true,
    pal: true,
    build(g, { palette, color, text }) {
      cyl(g, 0.08, 0.08, 0.16, glass(), 0, 0.08, 0, 20);
      box(g, 0.1, 0.1, 0.004, M('#fff', 0.6, 0, { map: textTexture(text ?? 'LOGO', { size: 40, fg: color ?? palette.f }) }), 0, 0.16, 0.081);
    },
  },

  balloon_arch: {
    id: 'balloon_arch',
    name: 'Balloon arch',
    cat: 'parties',
    sec: 'Decor',
    group: 'parties',
    surf: 'floor',
    fp: 1,
    price: 220,
    kw: 'balloon arch birthday party decor colorful',
    tag: 'Fun',
    pal: true,
    build(g, { palette, color }) {
      const cols = palette.b.length ? palette.b : [color ?? '#f2bcc0'];
      for (let i = 0; i <= 20; i++) {
        const a = Math.PI - (i / 20) * Math.PI;
        mesh(g, new THREE.SphereGeometry(0.11, 12, 10), M(cols[i % cols.length], 0.4), Math.cos(a) * 1.1, 1.6 + Math.sin(a) * 1.1, 0);
      }
    },
  },
  pinata: {
    id: 'pinata',
    name: 'Piñata',
    cat: 'parties',
    sec: 'Decor',
    group: 'parties',
    surf: 'hang',
    fp: 0.15,
    price: 35,
    kw: 'pinata birthday party fiesta colorful hanging',
    tag: 'Fun',
    pal: true,
    build(g, { palette }) {
      const cols = palette.b.length ? palette.b : ['#f2bcc0', '#c9d9b2', '#f3d9a4'];
      mesh(g, new THREE.SphereGeometry(0.14, 16, 12), M(cols[0], 0.7), 0, 0, 0);
      for (let ring = 0; ring < 3; ring++) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2,
            y = -0.05 + ring * 0.08;
          box(g, 0.03, 0.02, 0.03, M(cols[(ring + i) % cols.length], 0.7), Math.cos(a) * 0.13, y, Math.sin(a) * 0.13);
        }
      }
    },
  },
  kids_table_chairs: {
    id: 'kids_table_chairs',
    name: 'Kids table & chairs',
    cat: 'parties',
    sec: 'Seating',
    group: 'parties',
    surf: 'floor',
    fp: 0.4,
    price: 120,
    kw: 'kids table chairs mini party seating',
    pal: true,
    build(g, { palette, color }) {
      const c = color ?? palette.f;
      cyl(g, 0.3, 0.3, 0.35, M(c, 0.8), 0, 0.175, 0, 24);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        box(g, 0.16, 0.2, 0.16, M(palette.b[i % palette.b.length] ?? c, 0.8), Math.cos(a) * 0.42, 0.1, Math.sin(a) * 0.42);
      }
    },
  },
  cotton_candy_cart: {
    id: 'cotton_candy_cart',
    name: 'Cotton candy cart',
    cat: 'parties',
    sec: 'Treats',
    group: 'parties',
    surf: 'floor',
    fp: 0.3,
    price: 180,
    kw: 'cotton candy cart treats party sweets',
    tag: 'Fun',
    pal: false,
    build(g) {
      box(g, 0.6, 0.7, 0.4, M('#f2bcc0', 0.7), 0, 0.35, 0);
      cyl(g, 0.02, 0.02, 0.4, M('#c9a25a', 0.4, 0.7), 0, 0.9, 0);
      mesh(g, new THREE.SphereGeometry(0.18, 16, 12), M('#f7e6ee', 0.9), 0, 1.15, 0);
    },
  },
  photo_booth_sign: {
    id: 'photo_booth_sign',
    name: 'Photo booth sign',
    cat: 'parties',
    sec: 'Decor',
    group: 'parties',
    surf: 'floor',
    fp: 0.12,
    price: 50,
    kw: 'photo booth sign party props decor',
    hasText: true,
    pal: true,
    build(g, { palette, color, text }) {
      const frame = M(color ?? palette.f, 0.7);
      box(g, 0.03, 0.9, 0.03, frame, -0.28, 0.45, 0);
      box(g, 0.03, 0.9, 0.03, frame, 0.28, 0.45, 0);
      box(g, 0.6, 0.02, 0.4, M('#fff', 0.6, 0, { map: textTexture(text ?? 'Smile!', { size: 44, serif: true }) }), 0, 0.75, 0).rotation.x = -0.12;
    },
  },
  cupcake_tower: {
    id: 'cupcake_tower',
    name: 'Cupcake tower',
    cat: 'parties',
    sec: 'Treats',
    group: 'parties',
    surf: 'table',
    fp: 0.1,
    price: 60,
    kw: 'cupcake tower treats party dessert',
    pal: true,
    build(g, { palette }) {
      const cols = palette.b.length ? palette.b : ['#f2bcc0', '#f3d9a4', '#c9d9b2'];
      for (let tier = 0; tier < 3; tier++) {
        const r = 0.18 - tier * 0.05,
          y = 0.03 + tier * 0.08;
        cyl(g, r, r, 0.01, M('#fff', 0.6), 0, y, 0, 24);
        const n = 8 - tier * 2;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          mesh(g, new THREE.CylinderGeometry(0.025, 0.02, 0.03, 10), M('#f7ecd8', 0.6), Math.cos(a) * r * 0.7, y + 0.02, Math.sin(a) * r * 0.7);
          mesh(g, new THREE.SphereGeometry(0.022, 10, 8), M(cols[(tier + i) % cols.length], 0.6), Math.cos(a) * r * 0.7, y + 0.045, Math.sin(a) * r * 0.7);
        }
      }
    },
  },
};

export const ITEM_LIST: CatalogueItem[] = Object.values(ITEMS);
