import * as THREE from 'three';
import type { BuildCtx, CatalogueItem } from '../types';
import { box, cyl, mesh, M, pick, rnd } from '../three/utils';
import { T, tm, noise } from '../three/textures';
import { flame } from '../three/builder';
import { buildChair } from './chairs';

export interface Category {
  id: string;
  label: string;
}

export const CATEGORIES: Category[] = [
  { id: 'templates', label: 'Templates' },
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

const TEMPLATE_LAYOUT: [number, number][] = [
  [-0.16, -0.16],
  [0.16, -0.16],
  [-0.16, 0.16],
  [0.16, 0.16],
  [0, 0],
];

function buildTemplatePreview(ids: string[]) {
  return (g: THREE.Group, ctx: BuildCtx) => {
    ids.forEach((id, i) => {
      const def = ITEMS[id];
      if (!def) return;
      const sub = new THREE.Group();
      const [x, z] = TEMPLATE_LAYOUT[i % TEMPLATE_LAYOUT.length];
      sub.position.set(x, 0, z);
      g.add(sub);
      try {
        def.build(sub, ctx);
      } catch {
        // a contained item failing to preview shouldn't blank the whole template thumbnail
      }
    });
  };
}

export const ITEMS: Record<string, CatalogueItem> = {
  template_rustic: {
    id: 'template_rustic',
    name: 'Rustic tablescape',
    cat: 'templates',
    sec: 'Full tablescapes',
    group: 'template',
    surf: 'table',
    fp: 0,
    price: 0,
    kw: 'template rustic tablescape preset quick start',
    note: 'Places a full set',
    pal: true,
    template: ['runner_linen', 'charger_gold', 'centerpiece_wildflower', 'pillar_candle'],
    build: buildTemplatePreview(['runner_linen', 'charger_gold', 'centerpiece_wildflower', 'pillar_candle']),
  },
  template_glam: {
    id: 'template_glam',
    name: 'Modern glam tablescape',
    cat: 'templates',
    sec: 'Full tablescapes',
    group: 'template',
    surf: 'table',
    fp: 0,
    price: 0,
    kw: 'template glam modern tablescape preset quick start',
    note: 'Places a full set',
    tag: 'Glam',
    pal: true,
    template: ['overlay_sequin', 'charger_silver', 'centerpiece_garden', 'taper_candle'],
    build: buildTemplatePreview(['overlay_sequin', 'charger_silver', 'centerpiece_garden', 'taper_candle']),
  },
  template_boho: {
    id: 'template_boho',
    name: 'Boho tablescape',
    cat: 'templates',
    sec: 'Full tablescapes',
    group: 'template',
    surf: 'table',
    fp: 0,
    price: 0,
    kw: 'template boho tablescape preset quick start',
    note: 'Places a full set',
    tag: 'Boho',
    pal: true,
    template: ['runner_lace', 'charger_gold', 'centerpiece_wildflower', 'votive_cluster'],
    build: buildTemplatePreview(['runner_lace', 'charger_gold', 'centerpiece_wildflower', 'votive_cluster']),
  },
  template_classic: {
    id: 'template_classic',
    name: 'Classic place setting',
    cat: 'templates',
    sec: 'Full tablescapes',
    group: 'template',
    surf: 'table',
    fp: 0,
    price: 0,
    kw: 'template classic place setting tablescape preset quick start',
    note: 'Places a full set',
    pal: true,
    template: ['runner_linen', 'charger_gold', 'dinner_plate', 'stem_glassware', 'pillar_candle'],
    build: buildTemplatePreview(['runner_linen', 'charger_gold', 'dinner_plate', 'stem_glassware', 'pillar_candle']),
  },

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

  sweetheart_table: {
    id: 'sweetheart_table',
    name: 'Sweetheart table',
    cat: 'tabletop',
    sec: 'Tabletop shapes',
    group: 'tabletop',
    surf: 'floor',
    fp: 0.3,
    price: 180,
    kw: 'sweetheart table couple wedding reception',
    addon: 'tabletop-plus',
    pal: true,
    top: { h: 0.75, r: 0.4 },
    build(g, { palette, color }) {
      cyl(g, 0.4, 0.4, 0.03, M(color ?? palette.f, 0.85), 0, 0.75, 0, 32);
      cyl(g, 0.03, 0.04, 0.72, M('#5b4634', 0.7), 0, 0.37, 0, 16);
    },
  },
  cocktail_table: {
    id: 'cocktail_table',
    name: 'Cocktail high-top',
    cat: 'tabletop',
    sec: 'Tabletop shapes',
    group: 'tabletop',
    surf: 'floor',
    fp: 0.2,
    price: 90,
    kw: 'cocktail table high top reception lounge',
    addon: 'tabletop-plus',
    pal: true,
    top: { h: 1.1, r: 0.25 },
    build(g, { palette, color }) {
      cyl(g, 0.25, 0.25, 0.03, M(color ?? palette.f, 0.85), 0, 1.1, 0, 32);
      cyl(g, 0.025, 0.025, 1.08, M('#2a2420', 0.6), 0, 0.55, 0, 12);
      cyl(g, 0.18, 0.18, 0.02, M('#2a2420', 0.6), 0, 0.01, 0, 16);
    },
  },
  head_table: {
    id: 'head_table',
    name: 'Head table',
    cat: 'tabletop',
    sec: 'Tabletop shapes',
    group: 'tabletop',
    surf: 'floor',
    fp: 0.8,
    price: 220,
    kw: 'head table long wedding party reception',
    addon: 'tabletop-plus',
    pal: true,
    top: { h: 0.75, w: 2.4, d: 0.8 },
    build(g, { palette, color }) {
      box(g, 2.4, 0.04, 0.8, M(color ?? palette.f, 0.85), 0, 0.75, 0);
      box(g, 2.36, 0.7, 0.76, M('#5b4634', 0.7), 0, 0.37, 0);
    },
  },

  string_curtain_lights: {
    id: 'string_curtain_lights',
    name: 'String light curtain',
    cat: 'lighting-plus',
    sec: 'Event lighting',
    group: 'lighting',
    surf: 'hang',
    fp: 0.3,
    price: 60,
    kw: 'string curtain lights backdrop event lighting',
    addon: 'lighting-plus',
    pal: false,
    build(_g, { builder }) {
      for (let col = -3; col <= 3; col++) {
        for (let row = 0; row < 6; row++) {
          builder.add('glow', [col * 0.12, -row * 0.14, 0], 0.014, '#ffd79a', null, 4);
        }
      }
      builder.flush();
    },
  },
  gobo_light: {
    id: 'gobo_light',
    name: 'Gobo pattern light',
    cat: 'lighting-plus',
    sec: 'Event lighting',
    group: 'lighting',
    surf: 'floor',
    fp: 0.1,
    price: 45,
    kw: 'gobo light pattern projection event lighting',
    addon: 'lighting-plus',
    pal: true,
    build(g, { builder, palette, color }) {
      cyl(g, 0.06, 0.08, 0.14, M('#222', 0.5, 0.5), 0, 0.07, 0, 16);
      builder.add('glow', [0, 0.15, 0], [0.04, 0.02, 0.04], color ?? palette.b[0] ?? '#ffb866', null, 5);
      builder.flush();
    },
  },
  spotlight: {
    id: 'spotlight',
    name: 'Spotlight on stand',
    cat: 'lighting-plus',
    sec: 'Event lighting',
    group: 'lighting',
    surf: 'floor',
    fp: 0.12,
    price: 55,
    kw: 'spotlight stand event lighting stage',
    addon: 'lighting-plus',
    pal: false,
    build(g, { builder }) {
      cyl(g, 0.02, 0.03, 1.4, M('#1e1e20', 0.6), 0, 0.7, 0, 10);
      mesh(g, new THREE.CylinderGeometry(0.08, 0.1, 0.18, 16), M('#1e1e20', 0.5, 0.6), 0, 1.45, 0).rotation.z = 0.3;
      builder.add('glow', [0.06, 1.5, 0], [0.05, 0.03, 0.05], '#fff4dd', null, 4);
      builder.flush();
    },
  },

  dj_booth: {
    id: 'dj_booth',
    name: 'DJ booth',
    cat: 'av',
    sec: 'Stage & AV',
    group: 'av',
    surf: 'floor',
    fp: 0.4,
    price: 350,
    kw: 'dj booth music stage av equipment',
    addon: 'av-plus',
    pal: false,
    build(g, { builder }) {
      box(g, 1.4, 1, 0.6, M('#1e1e20', 0.5, 0.3), 0, 0.5, 0);
      box(g, 1.3, 0.05, 0.5, M('#2a2a2e', 0.4, 0.5), 0, 1.02, 0);
      for (const x of [-0.3, 0.3]) builder.add('glow', [x, 1.03, 0], [0.08, 0.01, 0.15], '#6fb8ff', null, 3);
      builder.flush();
    },
  },
  speaker_stack: {
    id: 'speaker_stack',
    name: 'Speaker stack',
    cat: 'av',
    sec: 'Stage & AV',
    group: 'av',
    surf: 'floor',
    fp: 0.2,
    price: 120,
    kw: 'speaker stack sound system av equipment',
    addon: 'av-plus',
    pal: false,
    build(g) {
      box(g, 0.45, 0.9, 0.4, M('#1a1a1c', 0.6), 0, 0.45, 0);
      box(g, 0.4, 0.55, 0.02, M('#0a0a0c', 0.7), 0, 0.6, 0.21);
      mesh(g, new THREE.CylinderGeometry(0.13, 0.13, 0.02, 20), M('#2a2a2e', 0.6), 0, 0.75, 0.22).rotation.x = Math.PI / 2;
    },
  },
  moving_head_light: {
    id: 'moving_head_light',
    name: 'Moving head light',
    cat: 'av',
    sec: 'Stage & AV',
    group: 'av',
    surf: 'hang',
    fp: 0.1,
    price: 90,
    kw: 'moving head light dance floor av stage',
    addon: 'av-plus',
    pal: true,
    build(g, { builder, palette, color }) {
      box(g, 0.14, 0.1, 0.1, M('#1e1e20', 0.5, 0.5), 0, 0, 0);
      mesh(g, new THREE.CylinderGeometry(0.05, 0.06, 0.14, 12), M('#1e1e20', 0.5, 0.5), 0, -0.1, 0).rotation.z = 0.4;
      builder.add('glow', [0.04, -0.18, 0], [0.03, 0.16, 0.03], color ?? palette.b[0] ?? '#c9d9b2', null, 5);
      builder.flush();
    },
  },

  tablecloth_full: {
    id: 'tablecloth_full',
    name: 'Floor-length tablecloth',
    cat: 'linens',
    sec: 'Tablecloths',
    group: 'tablecloth',
    surf: 'table',
    fp: 0.4,
    price: 35,
    kw: 'tablecloth full floor length linen base',
    pal: true,
    build(g, { palette, color }) {
      const c = color ?? palette.f;
      cyl(g, 0.72, 0.72, 0.008, M(c, 0.9), 0, 0.751, 0, 40);
      cyl(g, 0.71, 0.73, 0.75, M(c, 0.92), 0, 0.375, 0, 40);
    },
  },
  bread_plate: {
    id: 'bread_plate',
    name: 'Bread plate',
    cat: 'tableware',
    sec: 'Place settings',
    group: 'plate',
    surf: 'table',
    fp: 0.04,
    price: 3,
    kw: 'bread plate side setting',
    pal: false,
    build(g) {
      cyl(g, 0.07, 0.07, 0.008, M('#f7f2e8', 0.4), 0, 0.014, 0, 24);
    },
  },
  salt_pepper_set: {
    id: 'salt_pepper_set',
    name: 'Salt & pepper set',
    cat: 'tableware',
    sec: 'Place settings',
    group: 'condiment',
    surf: 'table',
    fp: 0.02,
    price: 4,
    kw: 'salt pepper shaker set condiment',
    pal: false,
    build(g) {
      cyl(g, 0.014, 0.016, 0.05, glass(), -0.02, 0.025, 0, 12);
      cyl(g, 0.014, 0.016, 0.05, M('#2a2420', 0.6), 0.02, 0.025, 0, 12);
    },
  },
  coffee_cup_saucer: {
    id: 'coffee_cup_saucer',
    name: 'Coffee cup & saucer',
    cat: 'tableware',
    sec: 'Glassware',
    group: 'coffee',
    surf: 'table',
    fp: 0.03,
    price: 4,
    kw: 'coffee cup saucer tea service',
    pal: false,
    build(g) {
      cyl(g, 0.06, 0.06, 0.006, M('#f7f2e8', 0.4), 0, 0.003, 0, 20);
      cyl(g, 0.032, 0.026, 0.03, M('#f7f2e8', 0.4), 0, 0.021, 0, 16);
    },
  },
  candelabra: {
    id: 'candelabra',
    name: 'Candelabra',
    cat: 'candles',
    sec: 'Candles',
    group: 'candle',
    surf: 'table',
    fp: 0.1,
    price: 55,
    kw: 'candelabra multi arm elegant candles',
    tag: 'Statement',
    pal: false,
    top: { h: 0.4, r: 0.14 },
    build(g, { builder }) {
      const gold = M('#c9a25a', 0.3, 0.9);
      cyl(g, 0.05, 0.07, 0.02, gold, 0, 0.01, 0, 20);
      cyl(g, 0.012, 0.012, 0.32, gold, 0, 0.17, 0, 10);
      for (const [x, z] of [
        [-0.11, 0],
        [0.11, 0],
        [0, -0.11],
        [0, 0.11],
      ] as [number, number][]) {
        builder.wire([0, 0.32, 0], [x, 0.34, z]);
        cyl(g, 0.008, 0.008, 0.02, gold, x, 0.35, z, 8);
        cyl(g, 0.012, 0.012, 0.16, M('#f7f0dd', 0.6), x, 0.44, z, 10);
        flame(builder, x, 0.53, z, 0.5);
      }
      cyl(g, 0.012, 0.012, 0.16, M('#f7f0dd', 0.6), 0, 0.4, 0, 10);
      flame(builder, 0, 0.49, 0, 0.5);
      builder.flush();
    },
  },

  balloon_centerpiece: {
    id: 'balloon_centerpiece',
    name: 'Balloon centerpiece',
    cat: 'parties',
    sec: 'Decor',
    group: 'parties',
    surf: 'table',
    fp: 0.12,
    price: 45,
    kw: 'balloon centerpiece table weighted party',
    tag: 'Fun',
    pal: true,
    build(g, { palette }) {
      const cols = palette.b.length ? palette.b : ['#f2bcc0', '#c9d9b2', '#f3d9a4'];
      cyl(g, 0.06, 0.08, 0.03, M('#2a2420', 0.6), 0, 0.015, 0, 20);
      for (let i = 0; i < 5; i++) {
        const a = angle(i, 5);
        const h = 0.3 + (i % 2) * 0.12;
        mesh(g, new THREE.SphereGeometry(0.09, 16, 12), M(cols[i % cols.length], 0.4), Math.cos(a) * 0.05, h, Math.sin(a) * 0.05);
      }
    },
  },

  grazing_table: {
    id: 'grazing_table',
    name: 'Grazing table spread',
    cat: 'desserts',
    sec: 'Catering',
    group: 'catering',
    surf: 'floor',
    fp: 0.5,
    price: 320,
    kw: 'grazing table cheese board catering spread',
    pal: false,
    build(g) {
      box(g, 1.6, 0.05, 0.7, M('#6b4a30', 0.6), 0, 0.75, 0);
      const foods = ['#e8c98a', '#c9702e', '#8a2a2a', '#e6dcc4', '#4c7a34'];
      for (let i = 0; i < 10; i++) {
        const x = -0.65 + (i % 5) * 0.32,
          z = i < 5 ? -0.18 : 0.18;
        mesh(g, new THREE.SphereGeometry(0.05, 10, 8), M(foods[i % foods.length], 0.7), x, 0.8, z);
      }
    },
  },
  cocktail_sign: {
    id: 'cocktail_sign',
    name: 'Signature cocktail sign',
    cat: 'furniture',
    sec: 'Signage',
    group: 'signage',
    surf: 'floor',
    fp: 0.12,
    price: 55,
    kw: 'signature cocktail sign bar menu',
    hasText: true,
    pal: true,
    build(g, { palette, color, text }) {
      const frame = M(color ?? palette.f, 0.7);
      box(g, 0.04, 0.9, 0.04, frame, -0.26, 0.45, 0);
      box(g, 0.04, 0.9, 0.04, frame, 0.26, 0.45, 0);
      box(g, 0.56, 0.02, 0.4, M('#fff', 0.6, 0, { map: textTexture(text ?? 'Signature Cocktail', { size: 34, serif: true }) }), 0, 0.75, 0).rotation.x = -0.12;
    },
  },
  table_number: {
    id: 'table_number',
    name: 'Table number',
    cat: 'tableware',
    sec: 'Paper goods',
    group: 'paper',
    surf: 'table',
    fp: 0.02,
    price: 5,
    kw: 'table number sign reception',
    hasText: true,
    pal: true,
    build(g, { palette, color, text }) {
      const frame = M(color ?? palette.b[0] ?? '#c9a25a', 0.4, 0.6);
      cyl(g, 0.02, 0.02, 0.08, frame, 0, 0.04, 0, 10);
      box(g, 0.08, 0.11, 0.004, M('#fff', 0.6, 0, { map: textTexture(text ?? '1', { size: 60, serif: true }) }), 0, 0.13, 0);
    },
  },

  favor_box: {
    id: 'favor_box',
    name: 'Guest favor box',
    cat: 'wedding',
    sec: 'Reception',
    group: 'wedding',
    surf: 'table',
    fp: 0.025,
    price: 4,
    kw: 'favor box guest gift wedding reception',
    pal: true,
    build(g, { palette, color }) {
      box(g, 0.06, 0.05, 0.06, M(color ?? palette.f, 0.85), 0, 0.025, 0);
      box(g, 0.062, 0.008, 0.062, M(palette.b[0] ?? '#c9a25a', 0.5, 0.6), 0, 0.054, 0);
    },
  },

  // ---------- Florals (round 2) ----------
  bud_vase_trio: {
    id: 'bud_vase_trio',
    name: 'Bud vase trio',
    cat: 'florals',
    sec: 'Centrepieces',
    group: 'florals',
    surf: 'table',
    fp: 0.08,
    price: 32,
    kw: 'bud vase trio single stem minimal',
    pal: true,
    build(g, { builder, palette, color }) {
      const cols = palette.b;
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.09;
        cyl(g, 0.012, 0.018, 0.14, glass(), x, 0.07, 0, 12);
        builder.rose(x, 0, color ?? cols[i % cols.length] ?? '#f2bcc0', 0.07, 0.14);
      }
      builder.flush();
    },
  },
  floating_blooms_bowl: {
    id: 'floating_blooms_bowl',
    name: 'Floating blooms bowl',
    cat: 'florals',
    sec: 'Centrepieces',
    group: 'florals',
    surf: 'table',
    fp: 0.16,
    price: 48,
    kw: 'floating flowers water bowl centerpiece',
    pal: true,
    build(g, { builder, palette, color }) {
      cyl(g, 0.16, 0.13, 0.08, glass(), 0, 0.04, 0, 32);
      const water = mesh(g, new THREE.CircleGeometry(0.14, 32), M('#bcdfe0', 0.05, 0, { transparent: true, opacity: 0.55 }), 0, 0.075, 0);
      water.rotation.x = -Math.PI / 2;
      const cols = palette.b;
      for (let i = 0; i < 5; i++) {
        const a = angle(i, 5);
        builder.rose(Math.cos(a) * 0.08, Math.sin(a) * 0.08, color ?? cols[i % cols.length], 0.05, 0.08);
      }
      builder.flush();
    },
  },
  floral_hoop: {
    id: 'floral_hoop',
    name: 'Floral hoop',
    cat: 'florals',
    sec: 'Ceremony',
    group: 'florals',
    surf: 'floor',
    fp: 0.6,
    price: 320,
    kw: 'floral hoop circle arch ceremony backdrop',
    pal: true,
    build(g, { palette, color }) {
      mesh(g, new THREE.TorusGeometry(0.9, 0.03, 10, 48), M('#6b4a30', 0.7), 0, 1.6, 0);
      const cols = palette.b;
      for (let i = 0; i < 12; i++) {
        const t = i / 11;
        const a = Math.PI * (0.15 + t * 0.7);
        const x = Math.cos(a) * 0.9,
          y = 1.6 + Math.sin(a) * 0.9;
        mesh(g, new THREE.IcosahedronGeometry(0.09, 0), M(cols[i % cols.length] ?? color ?? '#f2bcc0', 0.85, 0, { flatShading: true }), x, y, 0);
      }
    },
  },
  potted_orchid: {
    id: 'potted_orchid',
    name: 'Potted orchid',
    cat: 'florals',
    sec: 'Accents',
    group: 'florals',
    surf: 'table',
    fp: 0.09,
    price: 38,
    kw: 'orchid potted plant accent',
    pal: false,
    build(g) {
      cyl(g, 0.06, 0.05, 0.08, M('#8a7a6a', 0.8), 0, 0.04, 0, 16);
      const stem = cyl(g, 0.006, 0.006, 0.22, M('#3a5a2a', 0.7), 0.02, 0.15, 0, 6);
      stem.rotation.z = 0.15;
      for (let i = 0; i < 4; i++) {
        const y = 0.2 + i * 0.05;
        mesh(g, new THREE.SphereGeometry(0.035, 10, 8), M('#f4e6f0', 0.5), 0.02 + i * 0.015, y, 0);
      }
    },
  },
  succulent_planter: {
    id: 'succulent_planter',
    name: 'Succulent planter box',
    cat: 'florals',
    sec: 'Accents',
    group: 'florals',
    surf: 'table',
    fp: 0.14,
    price: 44,
    kw: 'succulent planter box greenery modern',
    pal: false,
    build(g) {
      box(g, 0.28, 0.08, 0.1, M('#8a7a68', 0.8), 0, 0.04, 0);
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.05;
        mesh(g, new THREE.IcosahedronGeometry(0.035, 0), M('#5a8a5a', 0.7, 0, { flatShading: true }), x, 0.1, 0);
      }
    },
  },
  glass_terrarium: {
    id: 'glass_terrarium',
    name: 'Glass terrarium',
    cat: 'florals',
    sec: 'Accents',
    group: 'florals',
    surf: 'table',
    fp: 0.1,
    price: 36,
    kw: 'glass terrarium greenery modern minimal',
    pal: false,
    build(g) {
      cyl(g, 0.08, 0.09, 0.02, M('#8a7a68', 0.7), 0, 0.01, 0, 20);
      mesh(g, new THREE.SphereGeometry(0.11, 20, 14), glass(), 0, 0.13, 0);
      mesh(g, new THREE.IcosahedronGeometry(0.05, 0), M('#4a7a3a', 0.7, 0, { flatShading: true }), 0, 0.07, 0);
    },
  },
  wildflower_bottle_trio: {
    id: 'wildflower_bottle_trio',
    name: 'Wildflower bottle trio',
    cat: 'florals',
    sec: 'Centrepieces',
    group: 'florals',
    surf: 'table',
    fp: 0.1,
    price: 34,
    kw: 'wildflower bottle trio rustic centerpiece',
    pal: true,
    build(g, { builder, palette, color }) {
      const cols = palette.b;
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.1;
        cyl(g, 0.018, 0.022, 0.16, glass(), x, 0.08, 0, 10);
        for (let k = 0; k < 3; k++) builder.rose(x + (k - 1) * 0.02, 0, color ?? cols[(i + k) % cols.length], 0.05, 0.16);
      }
      builder.flush();
    },
  },
  petal_aisle: {
    id: 'petal_aisle',
    name: 'Petal aisle',
    cat: 'florals',
    sec: 'Ceremony',
    group: 'florals',
    surf: 'floor',
    fp: 0.5,
    price: 60,
    kw: 'petal aisle runner ceremony floor scatter',
    pal: true,
    build(g, { palette, color }) {
      const cols = palette.b;
      for (let i = 0; i < 40; i++) {
        const x = (rnd() - 0.5) * 0.7,
          z = (rnd() - 0.5) * 2.6;
        const petal = mesh(g, new THREE.CircleGeometry(0.025, 6), M(color ?? cols[i % cols.length], 0.6, 0, { side: THREE.DoubleSide }), x, 0.002, z);
        petal.rotation.x = -Math.PI / 2;
        petal.castShadow = false;
      }
    },
  },

  // ---------- Holiday (round 2) ----------
  balloon_garland_arch: {
    id: 'balloon_garland_arch',
    name: 'Balloon garland arch',
    cat: 'holiday',
    sec: 'Party',
    group: 'holiday',
    surf: 'floor',
    fp: 0.9,
    price: 220,
    kw: 'balloon garland arch party birthday celebration',
    pal: true,
    build(g, { palette, color }) {
      const cols = [color ?? palette.b[0] ?? '#f2a6b8', palette.b[1] ?? '#f7d9a0', palette.b[2] ?? '#9ec9d9'];
      for (let i = 0; i < 24; i++) {
        const t = i / 23,
          a = Math.PI * (0.08 + t * 0.84);
        const x = Math.cos(a) * 1.3,
          y = Math.sin(a) * 1.3;
        mesh(g, new THREE.SphereGeometry(0.12, 14, 10), M(cols[i % cols.length], 0.4, 0), x, y, (rnd() - 0.5) * 0.15);
      }
    },
  },
  heart_balloon_bouquet: {
    id: 'heart_balloon_bouquet',
    name: 'Heart balloon bouquet',
    cat: 'holiday',
    sec: 'Party',
    group: 'holiday',
    surf: 'table',
    fp: 0.12,
    price: 28,
    kw: 'heart balloon bouquet valentine celebration',
    pal: true,
    build(g, { palette, color }) {
      const c = color ?? palette.b[0] ?? '#e2506a';
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.08;
        mesh(g, new THREE.SphereGeometry(0.09, 12, 10), M(c, 0.35, 0), x - 0.03, 0.55 + i * 0.03, 0);
        mesh(g, new THREE.SphereGeometry(0.09, 12, 10), M(c, 0.35, 0), x + 0.03, 0.55 + i * 0.03, 0);
        cyl(g, 0.003, 0.003, 0.5, M('#fff', 0.5), x, 0.28 + i * 0.015, 0, 6);
      }
    },
  },
  cornucopia: {
    id: 'cornucopia',
    name: 'Harvest cornucopia',
    cat: 'holiday',
    sec: 'Autumn',
    group: 'holiday',
    surf: 'table',
    fp: 0.2,
    price: 52,
    kw: 'cornucopia harvest thanksgiving autumn centerpiece',
    pal: false,
    build(g) {
      const horn = mesh(g, new THREE.ConeGeometry(0.11, 0.4, 16, 1, true), M('#a8763a', 0.7), 0, 0.12, 0);
      horn.rotation.z = Math.PI / 2.2;
      const gourds = ['#c9702e', '#e8b04a', '#8a5a2a', '#c2185b'];
      for (let i = 0; i < 6; i++) {
        mesh(g, new THREE.SphereGeometry(0.045, 10, 8), M(gourds[i % gourds.length], 0.75), -0.14 + i * 0.045, 0.14 + Math.abs(3 - i) * 0.01, 0);
      }
    },
  },
  easter_egg_nest: {
    id: 'easter_egg_nest',
    name: 'Easter egg nest',
    cat: 'holiday',
    sec: 'Spring',
    group: 'holiday',
    surf: 'table',
    fp: 0.1,
    price: 26,
    kw: 'easter egg nest spring centerpiece',
    pal: true,
    build(g, { palette, color }) {
      cyl(g, 0.08, 0.1, 0.03, M('#c9a25a', 0.85), 0, 0.015, 0, 20);
      const cols = [color ?? palette.b[0] ?? '#f2bcc0', palette.b[1] ?? '#f7d9a0', palette.b[2] ?? '#9ec9d9', palette.b[3] ?? '#fff'];
      for (let i = 0; i < 6; i++) {
        const a = angle(i, 6);
        const egg = mesh(g, new THREE.SphereGeometry(0.025, 10, 8), M(cols[i % cols.length], 0.6), Math.cos(a) * 0.05, 0.045, Math.sin(a) * 0.05);
        egg.scale.y = 1.3;
      }
    },
  },
  gift_boxes: {
    id: 'gift_boxes',
    name: 'Gift boxes',
    cat: 'holiday',
    sec: 'General',
    group: 'holiday',
    surf: 'table',
    fp: 0.12,
    price: 22,
    kw: 'gift boxes presents wrapped holiday birthday',
    pal: true,
    build(g, { palette, color }) {
      const cols = [color ?? palette.b[0] ?? '#e2506a', palette.b[1] ?? '#c9a25a', palette.b[2] ?? '#9ec9d9'];
      const sizes = [0.12, 0.09, 0.07];
      let y = 0;
      sizes.forEach((s, i) => {
        const h = s * 0.8;
        box(g, s, h, s, M(cols[i % cols.length], 0.7), 0, y + h / 2, 0);
        box(g, s * 1.02, 0.012, s * 0.2, M('#fff', 0.6), 0, y + h + 0.006, 0);
        box(g, s * 0.2, 0.012, s * 1.02, M('#fff', 0.6), 0, y + h + 0.006, 0);
        y += h + 0.012;
      });
    },
  },
  nutcracker_pair: {
    id: 'nutcracker_pair',
    name: 'Nutcracker pair',
    cat: 'holiday',
    sec: 'Winter',
    group: 'holiday',
    surf: 'table',
    fp: 0.1,
    price: 34,
    kw: 'nutcracker soldier christmas winter decor',
    pal: false,
    build(g) {
      for (const x of [-0.05, 0.05]) {
        box(g, 0.05, 0.16, 0.05, M('#1a2a5a', 0.7), x, 0.08, 0);
        mesh(g, new THREE.SphereGeometry(0.03, 12, 10), M('#f4d9c0', 0.6), x, 0.19, 0);
        cyl(g, 0.032, 0.026, 0.06, M('#0a0a0a', 0.6), x, 0.25, 0, 12);
      }
    },
  },
  poinsettia: {
    id: 'poinsettia',
    name: 'Poinsettia',
    cat: 'holiday',
    sec: 'Winter',
    group: 'holiday',
    surf: 'table',
    fp: 0.11,
    price: 30,
    kw: 'poinsettia red plant christmas winter',
    pal: false,
    build(g) {
      cyl(g, 0.07, 0.06, 0.08, M('#8a2020', 0.7), 0, 0.04, 0, 16);
      for (let i = 0; i < 8; i++) {
        const a = angle(i, 8);
        const petal = mesh(g, new THREE.ConeGeometry(0.05, 0.02, 6), M('#b8202a', 0.6, 0, { flatShading: true }), Math.cos(a) * 0.06, 0.1, Math.sin(a) * 0.06);
        petal.rotation.x = Math.PI / 2;
      }
    },
  },
  pumpkin_trio: {
    id: 'pumpkin_trio',
    name: 'Halloween pumpkin trio',
    cat: 'holiday',
    sec: 'Autumn',
    group: 'holiday',
    surf: 'table',
    fp: 0.14,
    price: 32,
    kw: 'halloween pumpkin trio carved autumn decor',
    pal: false,
    build(g) {
      const sizes = [0.07, 0.055, 0.045];
      sizes.forEach((r, i) => {
        const x = (i - 1) * 0.09;
        const p = mesh(g, new THREE.SphereGeometry(r, 14, 10), M('#d9722a', 0.75, 0, { flatShading: true }), x, r, 0);
        p.scale.y = 0.8;
        cyl(g, 0.006, 0.008, 0.03, M('#3a5a2a', 0.7), x, r * 1.7, 0, 6);
      });
    },
  },
  snowman: {
    id: 'snowman',
    name: 'Snowman',
    cat: 'holiday',
    sec: 'Winter',
    group: 'holiday',
    surf: 'floor',
    fp: 0.3,
    price: 70,
    kw: 'snowman winter christmas floor decor',
    pal: false,
    build(g) {
      mesh(g, new THREE.SphereGeometry(0.22, 20, 16), M('#f4f7f7', 0.5), 0, 0.22, 0);
      mesh(g, new THREE.SphereGeometry(0.16, 20, 16), M('#f4f7f7', 0.5), 0, 0.56, 0);
      mesh(g, new THREE.SphereGeometry(0.11, 18, 14), M('#f4f7f7', 0.5), 0, 0.82, 0);
      cyl(g, 0.09, 0.1, 0.05, M('#1a1a1a', 0.6), 0, 0.99, 0, 16);
      cyl(g, 0.075, 0.075, 0.1, M('#1a1a1a', 0.6), 0, 0.955, 0, 16);
      const nose = mesh(g, new THREE.ConeGeometry(0.02, 0.08, 8), M('#e8862a', 0.7), 0, 0.83, 0.1);
      nose.rotation.x = Math.PI / 2;
    },
  },
  evergreen_garland: {
    id: 'evergreen_garland',
    name: 'Evergreen & berry garland',
    cat: 'holiday',
    sec: 'Winter',
    group: 'holiday',
    surf: 'hang',
    fp: 0.12,
    price: 55,
    kw: 'evergreen berry garland christmas winter greenery',
    pal: false,
    build(_g, { builder }) {
      for (let x = -0.5; x <= 0.5; x += 0.1) {
        const y = -0.06 - Math.abs(x) * 0.08;
        builder.fern(x, 0, 0.35, '#2f5230', y);
        if (Math.round(x * 10) % 2 === 0) builder.rose(x, 0, '#a8202a', 0.04, y + 0.02);
      }
      builder.flush();
    },
  },
  papel_picado_banners: {
    id: 'papel_picado_banners',
    name: 'Papel picado banners',
    cat: 'holiday',
    sec: 'Fiesta',
    group: 'holiday',
    surf: 'hang',
    fp: 0.15,
    price: 32,
    kw: 'papel picado banner fiesta mexican celebration',
    pal: true,
    build(g, { palette, color }) {
      const cols = [color ?? palette.b[0] ?? '#e2506a', palette.b[1] ?? '#f7d9a0', palette.b[2] ?? '#9ec9d9', palette.b[3] ?? '#c9a25a', palette.b[4] ?? '#f2bcc0'];
      for (let i = 0; i < 6; i++) {
        const x = (i - 2.5) * 0.16;
        mesh(g, new THREE.PlaneGeometry(0.14, 0.1), M(cols[i % cols.length], 0.7, 0, { side: THREE.DoubleSide }), x, -0.1 - Math.abs(i - 2.5) * 0.01, 0);
      }
    },
  },
  red_paper_lanterns: {
    id: 'red_paper_lanterns',
    name: 'Red paper lanterns',
    cat: 'holiday',
    sec: 'Celebration',
    group: 'holiday',
    surf: 'hang',
    fp: 0.15,
    price: 38,
    kw: 'red paper lantern lunar new year celebration hanging',
    pal: false,
    build(g) {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.22;
        mesh(g, new THREE.SphereGeometry(0.09, 16, 12), M('#c2182a', 0.6, 0, { emissive: '#c2182a', emissiveIntensity: 0.35 }), x, -0.1 + Math.abs(i - 1) * 0.05, 0);
        cyl(g, 0.01, 0.01, 0.03, M('#c9a25a', 0.4, 0.7), x, -0.02 + Math.abs(i - 1) * 0.05, 0, 8);
      }
    },
  },

  // ---------- Tableware (round 2) ----------
  champagne_flutes: {
    id: 'champagne_flutes',
    name: 'Champagne flutes',
    cat: 'tableware',
    sec: 'Glassware',
    group: 'tableware',
    surf: 'table',
    fp: 0.03,
    price: 8,
    kw: 'champagne flute glass toast',
    pal: false,
    build(g) {
      for (const x of [-0.02, 0.02]) {
        cyl(g, 0.015, 0.008, 0.12, glass(), x, 0.09, 0, 12);
        cyl(g, 0.02, 0.02, 0.005, glass(), x, 0.0025, 0, 12);
        cyl(g, 0.004, 0.006, 0.06, glass(), x, 0.033, 0, 8);
      }
    },
  },
  wine_bottle_trio: {
    id: 'wine_bottle_trio',
    name: 'Wine bottle trio',
    cat: 'tableware',
    sec: 'Bar',
    group: 'tableware',
    surf: 'table',
    fp: 0.06,
    price: 45,
    kw: 'wine bottle trio bar service',
    pal: false,
    build(g) {
      const cols = ['#2a1a10', '#3a4a1a', '#1a1a1a'];
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.06;
        cyl(g, 0.028, 0.028, 0.24, M(cols[i], 0.3, 0.1), x, 0.12, 0, 14);
        cyl(g, 0.01, 0.014, 0.06, M(cols[i], 0.3, 0.1), x, 0.27, 0, 10);
      }
    },
  },
  water_carafe: {
    id: 'water_carafe',
    name: 'Water carafe & tumblers',
    cat: 'tableware',
    sec: 'Glassware',
    group: 'tableware',
    surf: 'table',
    fp: 0.08,
    price: 22,
    kw: 'water carafe tumbler glass service',
    pal: false,
    build(g) {
      cyl(g, 0.03, 0.04, 0.16, glass(), -0.03, 0.08, 0, 14);
      cyl(g, 0.02, 0.03, 0.03, glass(), -0.03, 0.175, 0, 14);
      for (const x of [0.03, 0.06]) cyl(g, 0.02, 0.018, 0.07, glass(), x, 0.035, 0, 10);
    },
  },
  chafing_dish_pair: {
    id: 'chafing_dish_pair',
    name: 'Chafing dish pair',
    cat: 'tableware',
    sec: 'Buffet',
    group: 'tableware',
    surf: 'table',
    fp: 0.28,
    price: 120,
    kw: 'chafing dish buffet warming service',
    pal: false,
    build(g, { builder }) {
      for (const x of [-0.13, 0.13]) {
        box(g, 0.22, 0.03, 0.16, M('#c8c8c8', 0.3, 0.9), x, 0.02, 0);
        box(g, 0.2, 0.1, 0.14, M('#dcdcdc', 0.25, 0.85), x, 0.09, 0);
        box(g, 0.2, 0.015, 0.14, M('#9a9a9a', 0.3, 0.9), x, 0.145, 0);
        flame(builder, x, 0.02, 0.1, 0.3);
      }
      builder.flush();
    },
  },
  coffee_tea_urns: {
    id: 'coffee_tea_urns',
    name: 'Coffee & tea urns',
    cat: 'tableware',
    sec: 'Buffet',
    group: 'tableware',
    surf: 'table',
    fp: 0.14,
    price: 85,
    kw: 'coffee tea urn buffet service',
    pal: false,
    build(g) {
      for (const x of [-0.09, 0.09]) {
        cyl(g, 0.06, 0.07, 0.22, M('#d8d8d8', 0.25, 0.9), x, 0.15, 0, 20);
        cyl(g, 0.065, 0.065, 0.02, M('#c0c0c0', 0.3, 0.9), x, 0.27, 0, 20);
        box(g, 0.03, 0.02, 0.03, M('#8a6a4a', 0.6), x, 0.06, 0.07);
      }
    },
  },
  ice_bucket_champagne: {
    id: 'ice_bucket_champagne',
    name: 'Champagne ice bucket',
    cat: 'tableware',
    sec: 'Bar',
    group: 'tableware',
    surf: 'table',
    fp: 0.1,
    price: 38,
    kw: 'ice bucket champagne bar chiller',
    pal: false,
    build(g) {
      cyl(g, 0.09, 0.07, 0.16, M('#dcdcdc', 0.2, 0.9), 0, 0.08, 0, 20);
      cyl(g, 0.028, 0.028, 0.24, M('#1a1a1a', 0.3, 0.1), 0, 0.24, 0, 14);
      cyl(g, 0.01, 0.014, 0.06, M('#1a1a1a', 0.3, 0.1), 0, 0.37, 0, 10);
    },
  },
  cocktail_tray: {
    id: 'cocktail_tray',
    name: 'Cocktail tray',
    cat: 'tableware',
    sec: 'Bar',
    group: 'tableware',
    surf: 'table',
    fp: 0.1,
    price: 26,
    kw: 'cocktail tray bar service glasses',
    pal: false,
    build(g) {
      cyl(g, 0.14, 0.14, 0.008, M('#8a6a4a', 0.5, 0.3), 0, 0.004, 0, 24);
      for (let i = 0; i < 4; i++) {
        const a = angle(i, 4);
        cyl(g, 0.018, 0.012, 0.08, glass(), Math.cos(a) * 0.07, 0.048, Math.sin(a) * 0.07, 10);
      }
    },
  },
  fruit_compote: {
    id: 'fruit_compote',
    name: 'Fruit & grape compote',
    cat: 'tableware',
    sec: 'Buffet',
    group: 'tableware',
    surf: 'table',
    fp: 0.13,
    price: 34,
    kw: 'fruit grape compote display buffet',
    pal: false,
    build(g) {
      cyl(g, 0.12, 0.09, 0.05, M('#f4f0e6', 0.4), 0, 0.14, 0, 24);
      cyl(g, 0.02, 0.03, 0.12, M('#f4f0e6', 0.4), 0, 0.06, 0, 14);
      const cols = ['#6a2a4a', '#c2185b', '#c9a25a', '#3a6a2a'];
      for (let i = 0; i < 10; i++) {
        const a = angle(i, 10);
        mesh(g, new THREE.SphereGeometry(0.025, 10, 8), M(cols[i % cols.length], 0.6), Math.cos(a) * 0.07, 0.19, Math.sin(a) * 0.07);
      }
    },
  },
  seafood_tower: {
    id: 'seafood_tower',
    name: 'Seafood tower',
    cat: 'tableware',
    sec: 'Buffet',
    group: 'tableware',
    surf: 'table',
    fp: 0.16,
    price: 180,
    kw: 'seafood tower tiered display raw bar',
    pal: false,
    build(g) {
      cyl(g, 0.16, 0.16, 0.02, glass(), 0, 0.01, 0, 28);
      cyl(g, 0.02, 0.02, 0.14, M('#dcdcdc', 0.3, 0.8), 0, 0.08, 0, 10);
      cyl(g, 0.11, 0.11, 0.02, glass(), 0, 0.15, 0, 24);
      cyl(g, 0.02, 0.02, 0.1, M('#dcdcdc', 0.3, 0.8), 0, 0.2, 0, 10);
      cyl(g, 0.07, 0.07, 0.02, glass(), 0, 0.25, 0, 20);
      const cols = ['#c2704a', '#e8b04a', '#8a2a2a'];
      for (let i = 0; i < 8; i++) {
        const a = angle(i, 8);
        mesh(g, new THREE.SphereGeometry(0.02, 8, 6), M(cols[i % cols.length], 0.6), Math.cos(a) * 0.13, 0.03, Math.sin(a) * 0.13);
      }
    },
  },
  chalkboard_sign: {
    id: 'chalkboard_sign',
    name: 'Chalkboard table sign',
    cat: 'tableware',
    sec: 'Paper goods',
    group: 'tableware',
    surf: 'table',
    fp: 0.03,
    price: 14,
    kw: 'chalkboard sign table menu rustic',
    hasText: true,
    pal: true,
    build(g, { color, text }) {
      const wood = M(color ?? '#5a4028', 0.7);
      box(g, 0.02, 0.16, 0.02, wood, -0.05, 0.08, 0);
      box(g, 0.02, 0.16, 0.02, wood, 0.05, 0.08, 0);
      box(g, 0.14, 0.1, 0.006, M('#1c1c1c', 0.7, 0, { map: textTexture(text ?? 'Table 1', { bg: '#1c1c1c', fg: '#fff', size: 34 }) }), 0, 0.13, 0.01);
    },
  },

  // ---------- Faith & culture (round 2) ----------
  akash_lanterns: {
    id: 'akash_lanterns',
    name: 'Akash kandil star lanterns',
    cat: 'faith',
    sec: 'Hindu',
    group: 'faith',
    surf: 'hang',
    fp: 0.15,
    price: 42,
    kw: 'akash kandil star lantern diwali indian celebration hanging',
    pal: true,
    build(g, { palette, color }) {
      const cols = [color ?? palette.b[0] ?? '#e8b04a', palette.b[1] ?? '#e2506a', palette.b[2] ?? '#9ec9d9'];
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.2;
        mesh(g, new THREE.OctahedronGeometry(0.08, 0), M(cols[i % cols.length], 0.5, 0, { emissive: cols[i % cols.length], emissiveIntensity: 0.4, flatShading: true }), x, -0.1 + Math.abs(i - 1) * 0.04, 0);
      }
    },
  },
  altar_stand: {
    id: 'altar_stand',
    name: 'Altar with cross',
    cat: 'faith',
    sec: 'Christian',
    group: 'faith',
    surf: 'floor',
    fp: 0.2,
    price: 180,
    kw: 'altar cross christian ceremony stage',
    pal: true,
    build(g, { palette, color }) {
      box(g, 0.6, 0.85, 0.35, M(color ?? palette.f, 0.7), 0, 0.425, 0);
      box(g, 0.62, 0.03, 0.37, M('#c9a25a', 0.4, 0.7), 0, 0.86, 0);
      const wood = M('#6a4a2e', 0.6);
      box(g, 0.04, 0.4, 0.04, wood, 0, 1.1, -0.15);
      box(g, 0.24, 0.04, 0.04, wood, 0, 1.24, -0.15);
    },
  },
  anand_karaj_canopy: {
    id: 'anand_karaj_canopy',
    name: 'Anand Karaj canopy',
    cat: 'faith',
    sec: 'Ceremony structures',
    group: 'faith',
    surf: 'floor',
    fp: 1.3,
    price: 460,
    kw: 'anand karaj sikh wedding canopy ceremony structure',
    pal: true,
    build(g, { palette, color }) {
      const wood = M('#8a6a3a', 0.6, 0.2);
      const posts: [number, number][] = [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ];
      for (const [x, z] of posts) cyl(g, 0.045, 0.045, 2.3, wood, x, 1.15, z, 12);
      box(g, 2.1, 0.05, 0.05, wood, 0, 2.3, -1);
      box(g, 2.1, 0.05, 0.05, wood, 0, 2.3, 1);
      box(g, 0.05, 0.05, 2.1, wood, -1, 2.3, 0);
      box(g, 0.05, 0.05, 2.1, wood, 1, 2.3, 0);
      const cloth = mesh(g, new THREE.PlaneGeometry(2.2, 2.2, 4, 4), M(color ?? palette.b[0] ?? '#e2506a', 0.85, 0, { side: THREE.DoubleSide }), 0, 2.26, 0);
      cloth.rotation.x = Math.PI / 2;
    },
  },
  calabash_centerpiece: {
    id: 'calabash_centerpiece',
    name: 'Calabash & protea centrepiece',
    cat: 'faith',
    sec: 'African',
    group: 'faith',
    surf: 'table',
    fp: 0.13,
    price: 56,
    kw: 'calabash protea african centerpiece culture',
    pal: false,
    build(g, { builder }) {
      const bowl = mesh(g, new THREE.SphereGeometry(0.08, 16, 12), M('#c9a25a', 0.75), 0, 0.06, 0);
      bowl.scale.y = 0.85;
      for (let i = 0; i < 3; i++) {
        const a = angle(i, 3);
        builder.rose(Math.cos(a) * 0.05, Math.sin(a) * 0.05, '#c2704a', 0.09, 0.1);
      }
      builder.flush();
    },
  },
  diya_lamps: {
    id: 'diya_lamps',
    name: 'Diya lamps',
    cat: 'faith',
    sec: 'Hindu',
    group: 'faith',
    surf: 'table',
    fp: 0.1,
    price: 24,
    kw: 'diya lamp diwali hindu celebration candles',
    pal: false,
    build(g, { builder }) {
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.045;
        cyl(g, 0.018, 0.022, 0.012, M('#c9702e', 0.75), x, 0.006, 0, 12);
        flame(builder, x, 0.02, 0, 0.3);
      }
      builder.flush();
    },
  },
  dreidels_gelt: {
    id: 'dreidels_gelt',
    name: 'Dreidels & gelt',
    cat: 'faith',
    sec: 'Judaica',
    group: 'faith',
    surf: 'table',
    fp: 0.07,
    price: 18,
    kw: 'dreidel gelt hanukkah judaica game',
    pal: false,
    build(g) {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.04;
        box(g, 0.025, 0.035, 0.025, M('#2a4a8a', 0.6), x, 0.0175, 0);
        const top = mesh(g, new THREE.ConeGeometry(0.018, 0.02, 4), M('#2a4a8a', 0.6), x, 0, 0);
        top.rotation.y = Math.PI / 4;
      }
      for (let i = 0; i < 6; i++) {
        const a = angle(i, 6);
        cyl(g, 0.012, 0.012, 0.003, M('#c9a25a', 0.3, 0.9), Math.cos(a) * 0.07, 0.0015, Math.sin(a) * 0.07, 16);
      }
    },
  },
  ramadan_lanterns: {
    id: 'ramadan_lanterns',
    name: 'Ramadan lanterns (fanous)',
    cat: 'faith',
    sec: 'Islamic',
    group: 'faith',
    surf: 'hang',
    fp: 0.15,
    price: 40,
    kw: 'ramadan fanous lantern islamic celebration hanging',
    pal: false,
    build(g) {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.22;
        cyl(g, 0.055, 0.07, 0.14, M('#c9a25a', 0.3, 0.85, { emissive: '#c9702e', emissiveIntensity: 0.3 }), x, -0.1 + Math.abs(i - 1) * 0.04, 0, 10);
        cyl(g, 0.02, 0.03, 0.03, M('#c9a25a', 0.3, 0.85), x, -0.02 + Math.abs(i - 1) * 0.04, 0, 10);
      }
    },
  },
  kiddush_set: {
    id: 'kiddush_set',
    name: 'Kiddush cup & challah',
    cat: 'faith',
    sec: 'Judaica',
    group: 'faith',
    surf: 'table',
    fp: 0.09,
    price: 36,
    kw: 'kiddush cup challah bread judaica shabbat',
    pal: false,
    build(g) {
      cyl(g, 0.025, 0.018, 0.06, M('#c9a25a', 0.3, 0.9), -0.05, 0.03, 0, 16);
      const loaf = mesh(g, new THREE.CapsuleGeometry(0.03, 0.1, 4, 10), M('#c9822a', 0.6), 0.04, 0.035, 0);
      loaf.rotation.z = Math.PI / 2;
    },
  },
  kinara_candle_holder: {
    id: 'kinara_candle_holder',
    name: 'Kinara',
    cat: 'faith',
    sec: 'African',
    group: 'faith',
    surf: 'table',
    fp: 0.12,
    price: 32,
    kw: 'kinara kwanzaa candle holder african american celebration',
    pal: false,
    build(g, { builder }) {
      box(g, 0.24, 0.02, 0.03, M('#1a1a1a', 0.6), 0, 0.01, 0);
      const cols = ['#c2182a', '#c2182a', '#c2182a', '#1a1a1a', '#3a6a2a', '#3a6a2a', '#3a6a2a'];
      for (let i = -3; i <= 3; i++) {
        const c = cols[i + 3];
        cyl(g, 0.008, 0.008, 0.1, M(c, 0.5), i * 0.035, 0.07, 0, 10);
        flame(builder, i * 0.035, 0.13, 0, 0.3);
      }
      builder.flush();
    },
  },
  nikah_stage: {
    id: 'nikah_stage',
    name: 'Nikah stage',
    cat: 'faith',
    sec: 'Islamic',
    group: 'faith',
    surf: 'floor',
    fp: 1.1,
    price: 420,
    kw: 'nikah stage islamic wedding ceremony decor',
    pal: true,
    build(g, { palette, color }) {
      box(g, 2.2, 0.12, 1.1, M('#c9a25a', 0.4, 0.6), 0, 0.06, 0);
      const cloth = M(color ?? palette.f, 0.85);
      box(g, 0.06, 1.6, 0.06, cloth, -1, 0.92, -0.4);
      box(g, 0.06, 1.6, 0.06, cloth, 1, 0.92, -0.4);
      mesh(g, new THREE.PlaneGeometry(2.1, 1.5, 4, 4), M(palette.b[0] ?? '#e2506a', 0.8, 0, { side: THREE.DoubleSide }), 0, 1.7, -0.4);
    },
  },
  palki_canopy: {
    id: 'palki_canopy',
    name: 'Palki canopy',
    cat: 'faith',
    sec: 'Hindu',
    group: 'faith',
    surf: 'floor',
    fp: 0.5,
    price: 280,
    kw: 'palki palanquin canopy indian wedding entrance',
    pal: true,
    build(g, { palette, color }) {
      const wood = M('#8a5a2a', 0.6, 0.2);
      const posts: [number, number][] = [
        [-0.4, -0.25],
        [0.4, -0.25],
        [-0.4, 0.25],
        [0.4, 0.25],
      ];
      for (const [x, z] of posts) cyl(g, 0.03, 0.03, 1.6, wood, x, 0.8, z, 10);
      const roof = mesh(g, new THREE.ConeGeometry(0.65, 0.45, 4), M(color ?? palette.b[0] ?? '#e2506a', 0.75), 0, 1.85, 0);
      roof.rotation.y = Math.PI / 4;
    },
  },
  seder_plate: {
    id: 'seder_plate',
    name: 'Seder plate',
    cat: 'faith',
    sec: 'Judaica',
    group: 'faith',
    surf: 'table',
    fp: 0.09,
    price: 44,
    kw: 'seder plate passover judaica ceremony',
    pal: false,
    build(g) {
      cyl(g, 0.11, 0.1, 0.015, M('#dcdcdc', 0.3, 0.8), 0, 0.0075, 0, 24);
      const cols = ['#3a6a2a', '#c9a25a', '#8a5a2a', '#c2182a', '#f4f0e6', '#7a3a2a'];
      for (let i = 0; i < 6; i++) {
        const a = angle(i, 6);
        cyl(g, 0.02, 0.02, 0.012, M(cols[i], 0.6), Math.cos(a) * 0.06, 0.021, Math.sin(a) * 0.06, 12);
      }
    },
  },
  tea_ceremony_set: {
    id: 'tea_ceremony_set',
    name: 'Tea ceremony set',
    cat: 'faith',
    sec: 'Japanese',
    group: 'faith',
    surf: 'table',
    fp: 0.1,
    price: 48,
    kw: 'japanese tea ceremony set matcha culture',
    pal: false,
    build(g) {
      cyl(g, 0.045, 0.05, 0.02, M('#c9a25a', 0.4, 0.5), 0, 0.01, 0, 20);
      cyl(g, 0.035, 0.03, 0.04, M('#3a2a1a', 0.6), 0, 0.04, 0, 16);
      for (const [x, z] of [
        [0.06, 0.03],
        [0.06, -0.03],
      ] as [number, number][])
        cyl(g, 0.018, 0.016, 0.025, M('#e8dcc8', 0.5), x, 0.0325, z, 12);
    },
  },
  rangoli_design: {
    id: 'rangoli_design',
    name: 'Rangoli',
    cat: 'faith',
    sec: 'Hindu',
    group: 'faith',
    surf: 'floor',
    fp: 0.4,
    price: 65,
    kw: 'rangoli floor pattern hindu diwali celebration',
    pal: true,
    build(g, { palette, color }) {
      const cols = [color ?? palette.b[0] ?? '#e2506a', palette.b[1] ?? '#e8b04a', palette.b[2] ?? '#9ec9d9', palette.b[3] ?? '#fff'];
      const tex = T(
        (ctx, w, h) => {
          ctx.fillStyle = '#1c1610';
          ctx.fillRect(0, 0, w, h);
          const cx = w / 2,
            cy = h / 2;
          for (let ring = 0; ring < 4; ring++) {
            const r = (ring + 1) * (w * 0.11);
            ctx.fillStyle = cols[ring % cols.length];
            for (let i = 0; i < 12; i++) {
              const a = (i / 12) * Math.PI * 2;
              ctx.beginPath();
              ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, w * 0.045, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        },
        [1, 1],
        256,
      );
      const disc = mesh(g, new THREE.CircleGeometry(0.5, 48), M('#fff', 0.9, 0, { map: tex }), 0, 0.003, 0);
      disc.rotation.x = -Math.PI / 2;
      disc.castShadow = false;
    },
  },

  // ---------- Furniture & lighting (round 2) ----------
  armchair_pair: {
    id: 'armchair_pair',
    name: 'Velvet armchair pair',
    cat: 'furniture',
    sec: 'Lounge',
    group: 'furniture',
    surf: 'floor',
    fp: 0.5,
    price: 240,
    kw: 'armchair lounge seating velvet pair',
    pal: true,
    build(g, { palette, color }) {
      const c = color ?? palette.f;
      for (const x of [-0.35, 0.35]) {
        box(g, 0.55, 0.35, 0.55, M(c, 0.85), x, 0.175, 0);
        box(g, 0.55, 0.5, 0.08, M(c, 0.85), x, 0.4, -0.24);
        box(g, 0.08, 0.4, 0.55, M(c, 0.85), x - 0.24, 0.35, 0);
        box(g, 0.08, 0.4, 0.55, M(c, 0.85), x + 0.24, 0.35, 0);
      }
    },
  },
  wine_barrel_hightop: {
    id: 'wine_barrel_hightop',
    name: 'Wine barrel high-top',
    cat: 'furniture',
    sec: 'Cocktail',
    group: 'furniture',
    surf: 'floor',
    fp: 0.2,
    price: 120,
    kw: 'wine barrel high top cocktail table rustic',
    pal: false,
    build(g) {
      cyl(g, 0.28, 0.24, 0.85, M('#7a4a26', 0.75), 0, 0.425, 0, 20);
      for (const y of [0.15, 0.42, 0.7]) cyl(g, 0.285, 0.285, 0.03, M('#3a2a1a', 0.6, 0.3), 0, y, 0, 20);
      cyl(g, 0.3, 0.3, 0.03, M('#4a3a28', 0.7), 0, 0.85, 0, 20);
    },
  },
  garden_bench: {
    id: 'garden_bench',
    name: 'Garden bench',
    cat: 'furniture',
    sec: 'Outdoor',
    group: 'furniture',
    surf: 'floor',
    fp: 0.4,
    price: 140,
    kw: 'garden bench outdoor seating wood',
    pal: false,
    build(g) {
      const wood = M('#5a4028', 0.75);
      box(g, 1.2, 0.05, 0.4, wood, 0, 0.42, 0);
      box(g, 1.2, 0.05, 0.4, wood, 0, 0.36, 0);
      box(g, 1.2, 0.3, 0.05, wood, 0, 0.6, -0.18);
      for (const x of [-0.55, 0.55]) box(g, 0.05, 0.4, 0.4, wood, x, 0.2, 0);
    },
  },
  console_table: {
    id: 'console_table',
    name: 'Welcome console table',
    cat: 'furniture',
    sec: 'Entrance',
    group: 'furniture',
    surf: 'floor',
    fp: 0.22,
    price: 110,
    kw: 'console table entrance welcome',
    pal: true,
    build(g, { palette, color }) {
      const wood = M(color ?? palette.f, 0.6);
      box(g, 1.1, 0.04, 0.32, wood, 0, 0.78, 0);
      for (const [x, z] of [
        [-0.5, -0.13],
        [0.5, -0.13],
        [-0.5, 0.13],
        [0.5, 0.13],
      ] as [number, number][])
        cyl(g, 0.015, 0.015, 0.78, wood, x, 0.39, z, 8);
    },
  },
  crate_riser: {
    id: 'crate_riser',
    name: 'Wooden crate riser',
    cat: 'furniture',
    sec: 'Buffet',
    group: 'furniture',
    surf: 'table',
    fp: 0.1,
    price: 18,
    kw: 'crate riser rustic display buffet',
    pal: false,
    build(g) {
      const wood = M('#8a6440', 0.8);
      box(g, 0.24, 0.16, 0.24, wood, 0, 0.08, 0);
      box(g, 0.26, 0.02, 0.02, wood, 0, 0.08, 0.13);
      box(g, 0.26, 0.02, 0.02, wood, 0, 0.08, -0.13);
    },
  },
  fairy_light_canopy: {
    id: 'fairy_light_canopy',
    name: 'Fairy light canopy',
    cat: 'furniture',
    sec: 'Lighting',
    group: 'furniture',
    surf: 'hang',
    fp: 0.3,
    price: 180,
    kw: 'fairy light canopy string ceiling',
    pal: false,
    build(g) {
      for (let i = 0; i < 24; i++) {
        const a = rnd() * Math.PI * 2,
          r = rnd() * 0.9;
        mesh(g, new THREE.SphereGeometry(0.012, 6, 6), M('#fff3d0', 0.4, 0, { emissive: '#ffdca0', emissiveIntensity: 1.4 }), Math.cos(a) * r, -rnd() * 0.25, Math.sin(a) * r);
      }
    },
  },
  fire_pit: {
    id: 'fire_pit',
    name: 'Fire pit',
    cat: 'furniture',
    sec: 'Outdoor',
    group: 'furniture',
    surf: 'floor',
    fp: 0.35,
    price: 160,
    kw: 'fire pit outdoor lounge warmth',
    pal: false,
    build(g, { builder }) {
      cyl(g, 0.32, 0.36, 0.3, M('#5a5148', 0.85), 0, 0.15, 0, 24);
      cyl(g, 0.26, 0.26, 0.04, M('#2a241e', 0.7), 0, 0.31, 0, 24);
      flame(builder, 0, 0.36, 0, 1.4);
      flame(builder, 0.08, 0.34, 0.05, 1.1);
      flame(builder, -0.06, 0.34, -0.05, 1.2);
      builder.flush();
    },
  },
  ghost_console: {
    id: 'ghost_console',
    name: 'Acrylic ghost console',
    cat: 'furniture',
    sec: 'Modern',
    group: 'furniture',
    surf: 'floor',
    fp: 0.2,
    price: 130,
    kw: 'acrylic ghost console modern clear table',
    pal: false,
    build(g) {
      const ghostMat = M('#eef4f6', 0.05, 0, { transparent: true, opacity: 0.3 });
      box(g, 1.0, 0.04, 0.3, ghostMat, 0, 0.75, 0);
      for (const x of [-0.44, 0.44]) box(g, 0.03, 0.75, 0.28, ghostMat, x, 0.375, 0);
    },
  },
  hay_bale_seat: {
    id: 'hay_bale_seat',
    name: 'Hay bale seat',
    cat: 'furniture',
    sec: 'Rustic',
    group: 'furniture',
    surf: 'floor',
    fp: 0.2,
    price: 35,
    kw: 'hay bale seat rustic barn outdoor',
    pal: false,
    build(g) {
      const hay = M('#c9a24a', 0.95);
      cyl(g, 0.24, 0.24, 0.4, hay, 0, 0.2, 0, 16);
      for (let i = 0; i < 3; i++) box(g, 0.5, 0.02, 0.02, M('#8a6a2a', 0.8), 0, 0.08 + i * 0.14, 0.24).rotation.y = Math.PI / 2;
    },
  },
  patio_heater: {
    id: 'patio_heater',
    name: 'Patio heater',
    cat: 'furniture',
    sec: 'Outdoor',
    group: 'furniture',
    surf: 'floor',
    fp: 0.12,
    price: 90,
    kw: 'patio heater outdoor warmth standing',
    pal: false,
    build(g) {
      cyl(g, 0.18, 0.2, 0.05, M('#3a3a3a', 0.5, 0.6), 0, 0.025, 0, 20);
      cyl(g, 0.02, 0.03, 2.0, M('#c8c8c8', 0.3, 0.8), 0, 1.03, 0, 12);
      cyl(g, 0.16, 0.12, 0.3, M('#e8e8e8', 0.3, 0.7), 0, 2.15, 0, 16);
      mesh(g, new THREE.ConeGeometry(0.1, 0.1, 16), M('#ff9040', 0.5, 0, { emissive: '#ff8030', emissiveIntensity: 0.8 }), 0, 2.0, 0);
    },
  },
  hedge_wall: {
    id: 'hedge_wall',
    name: 'Boxwood hedge wall',
    cat: 'furniture',
    sec: 'Backdrops',
    group: 'furniture',
    surf: 'floor',
    fp: 0.6,
    price: 260,
    kw: 'boxwood hedge wall greenery backdrop',
    pal: false,
    build(g, { builder }) {
      box(g, 2.0, 1.8, 0.12, M('#3a5a2a', 0.9), 0, 0.9, 0);
      const greens = ['#3a5a2a', '#345526', '#40603a'];
      for (let i = 0; i < 40; i++) {
        const x = (rnd() - 0.5) * 2.0,
          y = 0.1 + rnd() * 1.7;
        builder.fern(x, 0, 0.3, pick(greens), y);
      }
      builder.flush();
    },
  },
  checkerboard_dance_floor: {
    id: 'checkerboard_dance_floor',
    name: 'Checkerboard dance floor',
    cat: 'furniture',
    sec: 'Dance floor',
    group: 'furniture',
    surf: 'floor',
    fp: 1.3,
    price: 420,
    kw: 'checkerboard dance floor black white tiles',
    pal: false,
    build(g) {
      const n = 8,
        s = 0.32;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const c = (i + j) % 2 === 0 ? '#1a1a1a' : '#f4f0e6';
          box(g, s - 0.01, 0.02, s - 0.01, M(c, 0.3, 0.2), (i - (n - 1) / 2) * s, 0.01, (j - (n - 1) / 2) * s);
        }
    },
  },
  picnic_table: {
    id: 'picnic_table',
    name: 'Picnic table & benches',
    cat: 'furniture',
    sec: 'Outdoor',
    group: 'furniture',
    surf: 'floor',
    fp: 0.5,
    price: 150,
    kw: 'picnic table benches outdoor rustic',
    pal: false,
    build(g) {
      const wood = M('#8a6a42', 0.8);
      box(g, 1.6, 0.05, 0.7, wood, 0, 0.7, 0);
      for (const z of [-0.3, 0.3]) box(g, 1.6, 0.05, 0.25, wood, 0, 0.42, z);
      for (const x of [-0.65, 0.65]) box(g, 0.06, 0.7, 0.7, wood, x, 0.35, 0);
    },
  },
  leather_poufs: {
    id: 'leather_poufs',
    name: 'Leather poufs',
    cat: 'furniture',
    sec: 'Lounge',
    group: 'furniture',
    surf: 'floor',
    fp: 0.18,
    price: 60,
    kw: 'leather pouf lounge ottoman seating',
    pal: true,
    build(g, { palette, color }) {
      const c = color ?? palette.f;
      for (const [x, z] of [
        [-0.14, 0],
        [0.14, 0.1],
      ] as [number, number][])
        cyl(g, 0.18, 0.19, 0.28, M(c, 0.65), x, 0.14, z, 20);
    },
  },
  area_rug: {
    id: 'area_rug',
    name: 'Vintage area rug',
    cat: 'furniture',
    sec: 'Lounge',
    group: 'furniture',
    surf: 'floor',
    fp: 0.5,
    price: 80,
    kw: 'vintage area rug lounge floor covering',
    pal: true,
    build(g, { palette, color }) {
      const tex = T(
        (ctx, w, h) => {
          ctx.fillStyle = color ?? palette.b[0] ?? '#8a2a2a';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = palette.b[1] ?? '#c9a25a';
          ctx.lineWidth = w * 0.03;
          ctx.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
        },
        [1, 1],
        256,
      );
      const rug = mesh(g, new THREE.PlaneGeometry(1.6, 1.0), M('#fff', 0.9, 0, { map: tex }), 0, 0.005, 0);
      rug.rotation.x = -Math.PI / 2;
      rug.castShadow = false;
    },
  },
  pipe_drape_black: {
    id: 'pipe_drape_black',
    name: 'Black velvet pipe & drape',
    cat: 'furniture',
    sec: 'Structures',
    group: 'furniture',
    surf: 'floor',
    fp: 0.15,
    price: 90,
    kw: 'black velvet pipe drape backdrop structure',
    pal: false,
    build(g) {
      const chrome = M('#c8c8c8', 0.3, 0.85);
      for (const x of [-1.0, 1.0]) cyl(g, 0.025, 0.025, 2.6, chrome, x, 1.3, 0, 10);
      box(g, 2.0, 0.02, 0.02, chrome, 0, 2.6, 0);
      const drape = mesh(g, new THREE.PlaneGeometry(1.95, 2.55, 8, 1), M('#0f0f0f', 0.95, 0, { side: THREE.DoubleSide }), 0, 1.28, 0);
      const pos = drape.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) / 1.95) * Math.PI * 6) * 0.03);
      drape.geometry.computeVertexNormals();
    },
  },
  rattan_divider: {
    id: 'rattan_divider',
    name: 'Rattan room divider',
    cat: 'furniture',
    sec: 'Structures',
    group: 'furniture',
    surf: 'floor',
    fp: 0.15,
    price: 70,
    kw: 'rattan room divider boho screen structure',
    pal: false,
    build(g) {
      const wood = M('#a8825a', 0.75);
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.5;
        box(g, 0.45, 1.6, 0.03, wood, x, 0.8, 0).rotation.y = (i - 1) * 0.3;
      }
    },
  },
  timber_pergola: {
    id: 'timber_pergola',
    name: 'Timber pergola with vines',
    cat: 'furniture',
    sec: 'Structures',
    group: 'furniture',
    surf: 'floor',
    fp: 1.1,
    price: 520,
    kw: 'timber pergola vines structure outdoor ceremony',
    pal: false,
    build(g, { builder }) {
      const wood = M('#7a5a38', 0.7);
      const posts: [number, number][] = [
        [-1.1, -0.7],
        [1.1, -0.7],
        [-1.1, 0.7],
        [1.1, 0.7],
      ];
      for (const [x, z] of posts) box(g, 0.12, 2.4, 0.12, wood, x, 1.2, z);
      for (const z of [-0.7, 0.7]) box(g, 2.3, 0.1, 0.1, wood, 0, 2.4, z);
      for (let x = -1.1; x <= 1.1; x += 0.3) box(g, 0.08, 0.08, 1.5, wood, x, 2.45, 0);
      for (let i = 0; i < 10; i++) builder.fern((rnd() - 0.5) * 2.2, (rnd() - 0.5) * 1.3, 0.4, '#3f6a2c', 2.4 + rnd() * 0.15);
      builder.flush();
    },
  },

  // ---------- Candles & light (round 2) ----------
  candle_runner: {
    id: 'candle_runner',
    name: 'Candle runner',
    cat: 'candles',
    sec: 'Table runners',
    group: 'candles',
    surf: 'table',
    fp: 0.35,
    price: 45,
    kw: 'candle runner votive centerpiece row',
    pal: false,
    build(g, { builder }) {
      for (let z = -0.5; z <= 0.5; z += 0.12) {
        cyl(g, 0.02, 0.022, 0.06, glass(), 0, 0.03, z, 10);
        flame(builder, 0, 0.065, z, 0.3);
      }
      builder.flush();
    },
  },
  edison_bulb_cluster: {
    id: 'edison_bulb_cluster',
    name: 'Edison bulb cluster',
    cat: 'candles',
    sec: 'Hanging',
    group: 'candles',
    surf: 'hang',
    fp: 0.15,
    price: 55,
    kw: 'edison bulb cluster hanging pendant vintage',
    pal: false,
    build(g) {
      for (let i = 0; i < 5; i++) {
        const a = angle(i, 5);
        const drop = 0.08 + rnd() * 0.1;
        cyl(g, 0.004, 0.004, drop, M('#1a1a1a', 0.5), Math.cos(a) * 0.08, -drop / 2, Math.sin(a) * 0.08, 6);
        mesh(g, new THREE.SphereGeometry(0.025, 10, 8), M('#ffdca0', 0.4, 0, { emissive: '#ffb060', emissiveIntensity: 1 }), Math.cos(a) * 0.08, -drop, Math.sin(a) * 0.08);
      }
    },
  },
  floating_candle_cylinders: {
    id: 'floating_candle_cylinders',
    name: 'Floating candle cylinders',
    cat: 'candles',
    sec: 'Centerpieces',
    group: 'candles',
    surf: 'table',
    fp: 0.18,
    price: 42,
    kw: 'floating candle cylinder vase centerpiece',
    pal: false,
    build(g, { builder }) {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.09,
          h = 0.14 + i * 0.05;
        cyl(g, 0.035, 0.035, h, glass(), x, h / 2, 0, 16);
        flame(builder, x, h - 0.02, 0, 0.3);
      }
      builder.flush();
    },
  },
  floor_candelabra: {
    id: 'floor_candelabra',
    name: 'Floor candelabra',
    cat: 'candles',
    sec: 'Floor',
    group: 'candles',
    surf: 'floor',
    fp: 0.15,
    price: 140,
    kw: 'floor candelabra tall ceremony aisle',
    pal: false,
    build(g, { builder }) {
      const gold = M('#c9a25a', 0.3, 0.9);
      cyl(g, 0.1, 0.12, 0.03, gold, 0, 0.015, 0, 20);
      cyl(g, 0.015, 0.02, 1.1, gold, 0, 0.58, 0, 12);
      for (let i = -2; i <= 2; i++) {
        const h = 1.13 + Math.abs(i) * -0.05;
        cyl(g, 0.006, 0.006, 0.1, gold, i * 0.09, h, 0, 8);
        flame(builder, i * 0.09, h + 0.06, 0, 0.32);
      }
      builder.flush();
    },
  },
  brass_floor_lamp: {
    id: 'brass_floor_lamp',
    name: 'Brass floor lamp',
    cat: 'candles',
    sec: 'Floor',
    group: 'candles',
    surf: 'floor',
    fp: 0.1,
    price: 95,
    kw: 'brass floor lamp standing light lounge',
    pal: false,
    build(g) {
      const brass = M('#c9a25a', 0.3, 0.85);
      cyl(g, 0.14, 0.16, 0.03, brass, 0, 0.015, 0, 20);
      cyl(g, 0.012, 0.014, 1.3, brass, 0, 0.68, 0, 10);
      mesh(g, new THREE.ConeGeometry(0.16, 0.22, 16, 1, true), M('#f4e8d0', 0.7, 0, { emissive: '#f4d9a0', emissiveIntensity: 0.35, side: THREE.DoubleSide }), 0, 1.45, 0);
    },
  },
  floor_lantern_pair: {
    id: 'floor_lantern_pair',
    name: 'Floor lantern pair',
    cat: 'candles',
    sec: 'Floor',
    group: 'candles',
    surf: 'floor',
    fp: 0.15,
    price: 70,
    kw: 'floor lantern pair aisle ceremony',
    pal: false,
    build(g, { builder }) {
      for (const x of [-0.12, 0.12]) {
        cyl(g, 0.08, 0.09, 0.32, M('#3a3226', 0.4, 0.4, { transparent: true, opacity: 0.55 }), x, 0.16, 0, 12);
        flame(builder, x, 0.3, 0, 0.4);
      }
      builder.flush();
    },
  },
  mirror_tray_votives: {
    id: 'mirror_tray_votives',
    name: 'Mirror tray & votives',
    cat: 'candles',
    sec: 'Centerpieces',
    group: 'candles',
    surf: 'table',
    fp: 0.14,
    price: 32,
    kw: 'mirror tray votive centerpiece glam',
    pal: false,
    build(g, { builder }) {
      cyl(g, 0.12, 0.12, 0.006, M('#dfe8ea', 0.05, 0.9), 0, 0.003, 0, 32);
      for (let i = 0; i < 4; i++) {
        const a = angle(i, 4) + 0.4;
        cyl(g, 0.018, 0.02, 0.05, glass(), Math.cos(a) * 0.07, 0.028, Math.sin(a) * 0.07, 10);
        flame(builder, Math.cos(a) * 0.07, 0.058, Math.sin(a) * 0.07, 0.3);
      }
      builder.flush();
    },
  },
  rattan_pendant_trio: {
    id: 'rattan_pendant_trio',
    name: 'Rattan pendant trio',
    cat: 'candles',
    sec: 'Hanging',
    group: 'candles',
    surf: 'hang',
    fp: 0.15,
    price: 65,
    kw: 'rattan pendant hanging light boho',
    pal: false,
    build(g) {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.22,
          drop = 0.15 + Math.abs(i - 1) * 0.05;
        cyl(g, 0.004, 0.004, drop, M('#8a6a42', 0.6), x, -drop / 2, 0, 6);
        mesh(g, new THREE.SphereGeometry(0.08, 10, 8), M('#c9a26a', 0.85), x, -drop, 0);
      }
    },
  },

  // ---------- Wedding (round 2) ----------
  draped_arbour: {
    id: 'draped_arbour',
    name: 'Draped wooden arbour',
    cat: 'wedding',
    sec: 'Ceremony',
    group: 'wedding',
    surf: 'floor',
    fp: 0.9,
    price: 380,
    kw: 'draped wooden arbour ceremony arch wedding',
    pal: true,
    build(g, { palette, color }) {
      const wood = M('#6a4a2e', 0.65);
      for (const x of [-0.9, 0.9]) cyl(g, 0.05, 0.06, 2.3, wood, x, 1.15, 0, 12);
      box(g, 1.9, 0.06, 0.06, wood, 0, 2.3, 0);
      const cloth = M(color ?? palette.f, 0.85, 0, { side: THREE.DoubleSide });
      mesh(g, new THREE.PlaneGeometry(1.85, 1.4, 4, 4), cloth, -0.5, 1.6, 0).rotation.y = 0.15;
      mesh(g, new THREE.PlaneGeometry(1.85, 1.4, 4, 4), cloth, 0.5, 1.6, 0).rotation.y = -0.15;
    },
  },
  bridal_bouquet: {
    id: 'bridal_bouquet',
    name: 'Bridal bouquet',
    cat: 'wedding',
    sec: 'Personal florals',
    group: 'wedding',
    surf: 'table',
    fp: 0.06,
    price: 85,
    kw: 'bridal bouquet bouquet flowers wedding',
    pal: true,
    build(g, { builder, palette, color }) {
      const cols = palette.b;
      for (let i = 0; i < 7; i++) {
        const a = angle(i, 7);
        builder.rose(Math.cos(a) * 0.03, Math.sin(a) * 0.03, color ?? cols[i % cols.length], 0.045, 0.1);
      }
      cyl(g, 0.012, 0.012, 0.12, M('#4a7a3a', 0.7), 0, 0.06, 0, 8);
      builder.flush();
    },
  },
  card_box: {
    id: 'card_box',
    name: 'Card box',
    cat: 'wedding',
    sec: 'Reception',
    group: 'wedding',
    surf: 'table',
    fp: 0.07,
    price: 30,
    kw: 'card box wedding gift envelope reception',
    pal: true,
    build(g, { palette, color }) {
      box(g, 0.16, 0.16, 0.16, M(color ?? palette.f, 0.7), 0, 0.08, 0);
      box(g, 0.17, 0.02, 0.06, M(palette.b[0] ?? '#c9a25a', 0.5, 0.6), 0, 0.165, 0);
    },
  },
  champagne_coupe_tower: {
    id: 'champagne_coupe_tower',
    name: 'Champagne coupe tower',
    cat: 'wedding',
    sec: 'Reception',
    group: 'wedding',
    surf: 'table',
    fp: 0.2,
    price: 160,
    kw: 'champagne coupe tower pyramid reception',
    pal: false,
    build(g) {
      const tiers = [5, 3, 1];
      let y = 0;
      tiers.forEach((n) => {
        for (let i = 0; i < n; i++) {
          const x = (i - (n - 1) / 2) * 0.09;
          cyl(g, 0.045, 0.008, 0.05, glass(), x, y + 0.025, 0, 12);
        }
        y += 0.05;
      });
    },
  },
  hexagon_arch: {
    id: 'hexagon_arch',
    name: 'Hexagon ceremony arch',
    cat: 'wedding',
    sec: 'Ceremony',
    group: 'wedding',
    surf: 'floor',
    fp: 0.7,
    price: 340,
    kw: 'hexagon ceremony arch modern geometric backdrop',
    pal: true,
    build(g, { palette, color }) {
      const gold = M(color ?? palette.b[0] ?? '#c9a25a', 0.35, 0.75);
      const pts: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        pts.push([Math.cos(a) * 0.9, 1.3 + Math.sin(a) * 0.9]);
      }
      for (let i = 0; i < 6; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % 6];
        const len = Math.hypot(x2 - x1, y2 - y1);
        const bar = box(g, len, 0.05, 0.05, gold, (x1 + x2) / 2, (y1 + y2) / 2, 0);
        bar.rotation.z = Math.atan2(y2 - y1, x2 - x1);
      }
    },
  },
  flower_wall: {
    id: 'flower_wall',
    name: 'Flower wall',
    cat: 'wedding',
    sec: 'Backdrops',
    group: 'wedding',
    surf: 'floor',
    fp: 0.7,
    price: 480,
    kw: 'flower wall backdrop photo wedding',
    pal: true,
    build(g, { builder, palette, color }) {
      box(g, 2.2, 2.0, 0.1, M('#3a5a2a', 0.85), 0, 1.0, 0);
      const cols = palette.b;
      for (let i = 0; i < 30; i++) {
        const x = (rnd() - 0.5) * 2.1,
          y = 0.1 + rnd() * 1.9;
        builder.rose(x, 0, color ?? cols[i % cols.length], 0.09, y);
      }
      builder.flush();
    },
  },
  moongate: {
    id: 'moongate',
    name: 'Moongate circle',
    cat: 'wedding',
    sec: 'Ceremony',
    group: 'wedding',
    surf: 'floor',
    fp: 0.7,
    price: 400,
    kw: 'moongate circle round arch ceremony backdrop',
    pal: true,
    build(g, { color, palette }) {
      const ring = mesh(g, new THREE.TorusGeometry(0.9, 0.08, 16, 48), M(color ?? palette.f, 0.6), 0, 0.95, 0);
      ring.rotation.x = Math.PI / 2;
    },
  },
  sparkler_bucket: {
    id: 'sparkler_bucket',
    name: 'Sparkler bucket',
    cat: 'wedding',
    sec: 'Reception',
    group: 'wedding',
    surf: 'table',
    fp: 0.08,
    price: 24,
    kw: 'sparkler bucket send off wedding reception',
    pal: false,
    build(g) {
      cyl(g, 0.07, 0.055, 0.12, M('#c9a25a', 0.3, 0.8), 0, 0.06, 0, 16);
      for (let i = 0; i < 10; i++) {
        const a = angle(i, 10);
        cyl(g, 0.003, 0.003, 0.3, M('#c8c8c8', 0.4, 0.5), Math.cos(a) * 0.03, 0.27, Math.sin(a) * 0.03, 6);
      }
    },
  },

  // ---------- Corporate (round 2) ----------
  name_badge_display: {
    id: 'name_badge_display',
    name: 'Name badge display',
    cat: 'corporate',
    sec: 'Registration',
    group: 'corporate',
    surf: 'table',
    fp: 0.14,
    price: 40,
    kw: 'name badge display registration corporate event',
    pal: false,
    build(g) {
      box(g, 0.3, 0.22, 0.15, M('#e8e4da', 0.7), 0, 0.11, 0);
      for (let i = 0; i < 4; i++) box(g, 0.26, 0.002, 0.13, M('#fff', 0.6), 0, 0.05 + i * 0.045, 0);
    },
  },
  pullup_banner: {
    id: 'pullup_banner',
    name: 'Pull-up banner',
    cat: 'corporate',
    sec: 'Signage',
    group: 'corporate',
    surf: 'floor',
    fp: 0.12,
    price: 65,
    kw: 'pull up banner stand signage corporate',
    pal: true,
    build(g, { palette, color }) {
      box(g, 0.85, 2.0, 0.02, M(color ?? palette.f, 0.7), 0, 1.0, 0);
      box(g, 0.5, 0.05, 0.28, M('#2a2a2a', 0.6), 0, 0.025, 0);
    },
  },
  wooden_lectern: {
    id: 'wooden_lectern',
    name: 'Wooden lectern',
    cat: 'corporate',
    sec: 'Staging',
    group: 'corporate',
    surf: 'floor',
    fp: 0.16,
    price: 90,
    kw: 'wooden lectern podium speech corporate',
    pal: false,
    build(g) {
      const wood = M('#5a4028', 0.7);
      box(g, 0.5, 1.0, 0.4, wood, 0, 0.5, 0);
      const top = box(g, 0.56, 0.04, 0.46, wood, 0, 1.03, 0.02);
      top.rotation.x = -0.2;
    },
  },
  microphone_stand: {
    id: 'microphone_stand',
    name: 'Microphone stand',
    cat: 'corporate',
    sec: 'Staging',
    group: 'corporate',
    surf: 'floor',
    fp: 0.05,
    price: 25,
    kw: 'microphone stand speaker podium corporate',
    pal: false,
    build(g) {
      cyl(g, 0.14, 0.16, 0.02, M('#1a1a1a', 0.5), 0, 0.01, 0, 16);
      cyl(g, 0.012, 0.014, 1.1, M('#2a2a2a', 0.5), 0, 0.56, 0, 10);
      cyl(g, 0.02, 0.022, 0.1, M('#1a1a1a', 0.4, 0.5), 0, 1.17, 0, 10);
    },
  },
  theatre_seating: {
    id: 'theatre_seating',
    name: 'Theatre seating block',
    cat: 'corporate',
    sec: 'Seating',
    group: 'corporate',
    surf: 'floor',
    fp: 1.4,
    price: 380,
    kw: 'theatre seating rows conference keynote chairs',
    pal: true,
    build(g, { palette, color }) {
      const c = color ?? palette.f;
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 6; i++) {
          const x = (i - 2.5) * 0.42;
          const z = row * 0.55;
          box(g, 0.36, 0.4, 0.04, M(c, 0.7), x, 0.6, z - 0.17);
          box(g, 0.36, 0.04, 0.36, M(c, 0.7), x, 0.42, z);
        }
      }
    },
  },

  // ---------- Desserts (round 2) ----------
  single_tier_cake: {
    id: 'single_tier_cake',
    name: 'Single-tier cake on stand',
    cat: 'desserts',
    sec: 'Cakes',
    group: 'desserts',
    surf: 'table',
    fp: 0.1,
    price: 60,
    kw: 'single tier cake stand dessert',
    pal: true,
    build(g, { palette, color }) {
      cyl(g, 0.1, 0.03, 0.14, M('#c9a25a', 0.3, 0.7), 0, 0.07, 0, 20);
      cyl(g, 0.09, 0.09, 0.1, M(color ?? '#fdf8ee', 0.6), 0, 0.19, 0, 24);
      const accent = palette.b[0] ?? '#f2bcc0';
      for (let i = 0; i < 6; i++) {
        const a = angle(i, 6);
        mesh(g, new THREE.SphereGeometry(0.012, 8, 6), M(accent, 0.6), Math.cos(a) * 0.07, 0.245, Math.sin(a) * 0.07);
      }
    },
  },
  candy_jars: {
    id: 'candy_jars',
    name: 'Apothecary candy jars',
    cat: 'desserts',
    sec: 'Sweets',
    group: 'desserts',
    surf: 'table',
    fp: 0.14,
    price: 38,
    kw: 'candy jars apothecary sweets buffet',
    pal: false,
    build(g) {
      const cols = ['#e2506a', '#f2bcc0', '#e8b04a'];
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.11;
        cyl(g, 0.055, 0.05, 0.14, glass(), x, 0.07, 0, 16);
        cyl(g, 0.045, 0.045, 0.1, M(cols[i], 0.6), x, 0.06, 0, 16);
        cyl(g, 0.06, 0.06, 0.02, M('#8a6a42', 0.6), x, 0.15, 0, 16);
      }
    },
  },
  cheese_board: {
    id: 'cheese_board',
    name: 'Cheese & charcuterie board',
    cat: 'desserts',
    sec: 'Savoury',
    group: 'desserts',
    surf: 'table',
    fp: 0.16,
    price: 70,
    kw: 'cheese charcuterie board grazing savoury',
    pal: false,
    build(g) {
      cyl(g, 0.16, 0.16, 0.02, M('#8a6440', 0.7), 0, 0.01, 0, 24);
      const cols = ['#f4e8c8', '#c2704a', '#e8dcc0', '#8a2a2a'];
      for (let i = 0; i < 6; i++) {
        const a = angle(i, 6);
        box(g, 0.05, 0.02, 0.03, M(cols[i % cols.length], 0.7), Math.cos(a) * 0.1, 0.03, Math.sin(a) * 0.1);
      }
    },
  },
  macaron_tower: {
    id: 'macaron_tower',
    name: 'Macaron tower',
    cat: 'desserts',
    sec: 'Sweets',
    group: 'desserts',
    surf: 'table',
    fp: 0.1,
    price: 55,
    kw: 'macaron tower cone dessert display',
    pal: true,
    build(g, { palette, color }) {
      const cols = [color ?? palette.b[0] ?? '#f2bcc0', palette.b[1] ?? '#e8b04a', palette.b[2] ?? '#9ec9d9'];
      cyl(g, 0.09, 0.02, 0.3, M('#fff', 0.4), 0, 0.15, 0, 20);
      for (let ring = 0; ring < 4; ring++) {
        const y = 0.04 + ring * 0.07,
          r = 0.08 - ring * 0.018,
          n = 6 - ring;
        for (let i = 0; i < n; i++) {
          const a = angle(i, n);
          mesh(g, new THREE.SphereGeometry(0.02, 8, 6), M(cols[(ring + i) % cols.length], 0.6), Math.cos(a) * r, y, Math.sin(a) * r);
        }
      }
    },
  },

  // ---------- Parties & kids (round 2) ----------
  beanbag_pair: {
    id: 'beanbag_pair',
    name: 'Bean bag pair',
    cat: 'parties',
    sec: 'Lounge',
    group: 'parties',
    surf: 'floor',
    fp: 0.3,
    price: 55,
    kw: 'bean bag pair lounge casual seating kids',
    pal: true,
    build(g, { palette, color }) {
      const c = color ?? palette.f;
      for (const [x, z] of [
        [-0.24, 0],
        [0.24, 0.08],
      ] as [number, number][]) {
        const bag = mesh(g, new THREE.SphereGeometry(0.26, 16, 12), M(c, 0.9), x, 0.2, z);
        bag.scale.y = 0.7;
      }
    },
  },
  flag_bunting: {
    id: 'flag_bunting',
    name: 'Flag bunting',
    cat: 'parties',
    sec: 'Decor',
    group: 'parties',
    surf: 'hang',
    fp: 0.15,
    price: 22,
    kw: 'flag bunting party decor colorful triangles',
    pal: true,
    build(g, { palette, color }) {
      const cols = [color ?? palette.b[0] ?? '#e2506a', palette.b[1] ?? '#f7d9a0', palette.b[2] ?? '#9ec9d9', palette.b[3] ?? '#c9a25a'];
      for (let i = 0; i < 8; i++) {
        const x = (i - 3.5) * 0.11;
        const flag = mesh(g, new THREE.ConeGeometry(0.045, 0.08, 3), M(cols[i % cols.length], 0.7), x, -0.08 - Math.abs(i - 3.5) * 0.008, 0);
        flag.rotation.x = Math.PI;
      }
    },
  },
  disco_ball: {
    id: 'disco_ball',
    name: 'Mirror disco ball',
    cat: 'parties',
    sec: 'Decor',
    group: 'parties',
    surf: 'hang',
    fp: 0.12,
    price: 45,
    kw: 'disco ball mirror party dance hanging',
    pal: false,
    build(g) {
      mesh(g, new THREE.IcosahedronGeometry(0.13, 2), M('#e8ecec', 0.15, 0.95, { flatShading: true }), 0, -0.1, 0);
    },
  },
  kids_play_teepee: {
    id: 'kids_play_teepee',
    name: 'Kids play teepee',
    cat: 'parties',
    sec: 'Kids',
    group: 'parties',
    surf: 'floor',
    fp: 0.25,
    price: 75,
    kw: 'kids play teepee tent children party',
    pal: true,
    build(g, { palette, color }) {
      const tent = mesh(g, new THREE.ConeGeometry(0.4, 0.9, 4), M(color ?? palette.f, 0.85), 0, 0.45, 0);
      tent.rotation.y = Math.PI / 4;
      for (const [x, z] of [
        [0.3, 0.3],
        [-0.3, 0.3],
        [0.3, -0.3],
        [-0.3, -0.3],
      ] as [number, number][])
        cyl(g, 0.015, 0.015, 1.0, M('#8a6a42', 0.7), x, 0.5, z, 8);
    },
  },
};

export const ITEM_LIST: CatalogueItem[] = Object.values(ITEMS);
