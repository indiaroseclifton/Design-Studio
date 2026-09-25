import * as THREE from 'three';
import { setPaperArt, type PaperKind } from '../engine/florals';
import { shared } from '../three/utils';
import { pieceCanvas, type DrawCtx } from './draw';
import { drawCtxFor } from './ctx';
import { FONT_FAMILIES, PIECES, type PieceKind } from './model';
import type { Design } from '../types';

/*
 * Supplies the 3D scene's paper pieces with the design's stationery (see engine/florals.ts). Textures are
 * cached per piece and wording, and dropped whenever the suite, palette or fonts change.
 */

const KIND: Record<PaperKind, PieceKind> = { placecard: 'placecard', tablenum: 'tablenum', welcome: 'welcome', menu: 'menu', seating: 'seating' };

let ctx: DrawCtx | null = null;
let ctxKey = '';
let fontsReady = 0;
const cache = new Map<string, THREE.Texture>();
const listeners = new Set<() => void>();

function clear() {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}

/** Point the scene's paper pieces at this design's suite. Returns a key that changes whenever they should be rebuilt. */
export function syncPaper(S: Design): string {
  const key = S.stationery ? JSON.stringify([S.stationery, S.menu ?? 0, S.music ?? 0, S.palette, S.palette === 'custom' ? S.customPalette : 0, S.venue, S.tables.length, fontsReady]) : '';
  if (key !== ctxKey) {
    ctxKey = key;
    clear();
    ctx = S.stationery ? drawCtxFor(S, S.stationery) : null;
  }
  return key;
}

export const subscribePaper = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
export const paperFontsVersion = () => fontsReady;

setPaperArt((kind, main) => {
  if (!ctx) return null;
  const k = KIND[kind];
  const key = k + '|' + main;
  let t = cache.get(key);
  if (!t) {
    const mm = PIECES[k].mm;
    const cv = pieceCanvas(k, ctx, Math.min(8, 1024 / Math.max(mm[0], mm[1])), { main: main || undefined });
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    shared(t);
    cache.set(key, t);
  }
  return t;
});

/** Load the stationery faces; once they're in, redraw anything drawn with fallback fonts. */
export function loadStationeryFonts() {
  if (!document.fonts) return Promise.resolve();
  return Promise.all(FONT_FAMILIES.map((f) => document.fonts.load(`40px "${f}"`).catch(() => null))).then(() => {
    fontsReady++;
    listeners.forEach((l) => l());
  });
}
