import type { Pal } from '../engine/studio';
import {
  FOILS,
  PAPERS,
  PIECES,
  TYPES,
  dateDots,
  dateFormal,
  dateShort,
  initialsOf,
  menuCourses,
  namesOf,
  numberWords,
  seatingTables,
  timeFormal,
  timeShort,
  type FontSpec,
  type MenuCourse,
  type PieceKind,
  type Suite,
} from './model';

/*
 * Stationery rendering on a 2D canvas. Every piece is laid out in units of its width (u = W / 100), so one
 * layout serves the on-screen preview, the flat lay, the 3D scene's textures and 300 dpi print files.
 */

export interface DrawCtx {
  suite: Suite;
  pal: Pal;
  venueName: string;
  tables: number;
  /** menu from the Menu planner, when there is one (otherwise the suite's own menu text) */
  menu?: MenuCourse[];
  /** meal choices guests make on the RSVP card (Menu planner) */
  choices?: Array<{ course: string; options: string[] }>;
  /** the bar, for the bar menu (Menu planner) */
  bar?: { welcome: string; signatures: Array<{ name: string; desc: string; glass: string; colour: string; zero?: boolean }>; wine: { red: string; white: string; sparkling: string } };
}
export interface DrawOpts {
  /** the guest's name (place card) or table number / name (table number) */
  main?: string;
  /** bleed in px around the trim (print); the paper fills it, the content stays inside the trim */
  bleed?: number;
  /** cut the paper to its edge shape (deckle, rounded, arch) on a transparent canvas */
  shape?: boolean;
}

type X = CanvasRenderingContext2D;
type Rng = () => number;

function prng(seed: number): Rng {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h;
};

const fontCss = (f: FontSpec, px: number) => `${f.style ?? 'normal'} ${f.weight ?? 400} ${px.toFixed(1)}px "${f.family}", Georgia, serif`;
const setLS = (x: X, px: number) => {
  try {
    (x as X & { letterSpacing: string }).letterSpacing = `${px.toFixed(1)}px`;
  } catch {
    /* unsupported: tracking is a nicety */
  }
};

function hexRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const lum = (h: string) => {
  const [r, g, b] = hexRgb(h);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
function mix(a: string, b: string, t: number) {
  const A = hexRgb(a),
    B = hexRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const rgba = (h: string, a: number) => {
  const [r, g, b] = hexRgb(h);
  return `rgba(${r},${g},${b},${a})`;
};

/* ------------------------------------------------------------------ colours */

interface Inks {
  paper: string;
  ink: string;
  soft: string;
  dark: boolean;
  /** a palette colour that reads on this paper, for monograms and accents */
  accent: string;
  foil: string[] | null;
}
function inksOf(c: DrawCtx): Inks {
  const P = PAPERS[c.suite.paper];
  const dark = lum(P.c) < 0.45;
  const byLum = [...c.pal.b].sort((a, b) => lum(a) - lum(b));
  let accent = dark ? byLum[byLum.length - 1] : lum(byLum[0]) > 0.8 ? mix(c.pal.g, '#000000', 0.2) : byLum[0];
  // Keep accents legible on the paper: deepen (or lift, on dark card) until they stand apart from it.
  for (let i = 0; i < 6 && Math.abs(lum(accent) - lum(P.c)) < 0.32; i++) accent = mix(accent, dark ? '#ffffff' : '#2a1414', 0.25);
  const foil = FOILS[c.suite.foil].stops;
  return { paper: P.c, ink: c.suite.ink === 'auto' ? P.ink : c.suite.ink, soft: P.soft, dark, accent, foil: foil.length ? foil : null };
}

/* ------------------------------------------------------------------ paper */

function paperShape(x: X, W: number, H: number, edge: Suite['edge'], rng: Rng) {
  const u = W / 100;
  x.beginPath();
  if (edge === 'rounded') {
    x.roundRect(0, 0, W, H, 4 * u);
  } else if (edge === 'arch') {
    const r = W / 2;
    if (H > W * 1.05) {
      x.moveTo(0, H);
      x.lineTo(0, r);
      x.arc(r, r, r, Math.PI, 0);
      x.lineTo(W, H);
    } else x.roundRect(0, 0, W, H, 4 * u);
  } else if (edge === 'deckle') {
    const j = 0.55 * u,
      step = 1.2 * u;
    x.moveTo(0, 0);
    for (let px = step; px < W; px += step) x.lineTo(px, (rng() - 0.3) * j);
    for (let py = step; py < H; py += step) x.lineTo(W - (rng() - 0.3) * j, py);
    for (let px = W - step; px > 0; px -= step) x.lineTo(px, H - (rng() - 0.3) * j);
    for (let py = H - step; py > 0; py -= step) x.lineTo((rng() - 0.3) * j, py);
  } else x.rect(0, 0, W, H);
  x.closePath();
}

function paperFill(x: X, c: DrawCtx, x0: number, y0: number, w: number, h: number, u: number, rng: Rng) {
  const P = PAPERS[c.suite.paper];
  x.fillStyle = P.c;
  x.fillRect(x0, y0, w, h);
  const n = Math.min(9000, Math.round((w * h) / (u * u) * (P.tex === 'kraft' ? 0.9 : 0.5)));
  // Fibres and flecks: cotton has soft long fibres, kraft darker flecks, smooth card barely any.
  const dark = lum(P.c) < 0.45;
  for (let i = 0; i < n; i++) {
    const px = x0 + rng() * w,
      py = y0 + rng() * h;
    if (P.tex === 'smooth') {
      x.fillStyle = dark ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.018)';
      x.fillRect(px, py, u * 0.12, u * 0.12);
    } else {
      const a = rng() * Math.PI,
        l = u * (P.tex === 'kraft' ? 0.3 + rng() * 0.9 : 0.4 + rng() * 1.2);
      x.strokeStyle = P.tex === 'kraft' ? (rng() < 0.5 ? 'rgba(70,40,15,.16)' : 'rgba(255,240,210,.18)') : rng() < 0.5 ? 'rgba(120,100,70,.06)' : 'rgba(255,255,255,.35)';
      x.lineWidth = u * 0.06;
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
      x.stroke();
    }
  }
}

/* ------------------------------------------------------------------ foil & text */

function foilGrad(x: X, x0: number, y0: number, x1: number, y1: number, stops: string[]) {
  const g = x.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  return g;
}

type Tone = 'ink' | 'soft' | 'foil' | 'accent';
type Role = 'head' | 'body' | 'caps' | 'italic';

interface Block {
  t: string;
  role: Role;
  /** size in u */
  s: number;
  tone?: Tone;
  /** gap after, in u */
  gap?: number;
  kind?: 'text' | 'rule' | 'write' | 'mono' | 'art';
  /** 'art' blocks: draw into the given box (centre x, top y, height) */
  draw?: (x: X, cx: number, y: number, h: number) => void;
}
const T = (t: string, role: Role, s: number, tone: Tone = 'ink', gap = 2): Block => ({ t, role, s, tone, gap, kind: 'text' });
const RULE = (gap = 3): Block => ({ t: '', role: 'body', s: 2.4, gap, kind: 'rule' });
const WRITE = (label: string, gap = 3): Block => ({ t: label, role: 'body', s: 3.6, gap, kind: 'write' });

function fontFor(c: DrawCtx, role: Role): FontSpec {
  const ty = TYPES[c.suite.type];
  if (role === 'head') return ty.head;
  if (role === 'caps') return ty.caps;
  if (role === 'italic') return { ...ty.body, style: 'italic' };
  return ty.body;
}

function fill(x: X, tone: Tone, I: Inks, bx: number, by: number, bw: number, bh: number) {
  if (tone === 'foil' && I.foil) {
    x.fillStyle = foilGrad(x, bx, by, bx + bw, by + bh, I.foil);
    return;
  }
  x.fillStyle = tone === 'soft' ? I.soft : tone === 'accent' ? I.accent : tone === 'foil' ? I.ink : I.ink;
}

interface Laid {
  b: Block;
  px: number;
  lines: string[];
  h: number;
}

/** Fit and stack blocks inside a box, centred vertically; everything shrinks together if it won't fit. */
function stack(x: X, c: DrawCtx, I: Inks, blocks: Block[], bx: number, by: number, bw: number, bh: number, u: number, align: 'center' | 'top' = 'center') {
  let k = 1;
  let laid: Laid[] = [];
  let total = 0;
  for (let pass = 0; pass < 6; pass++) {
    laid = [];
    total = 0;
    for (const b of blocks) {
      const f = fontFor(c, b.role);
      let px = b.s * u * k;
      const lines = b.kind === 'text' ? b.t.split('\n') : [b.t];
      const text = b.role === 'caps' && !f.script ? lines.map((l) => l.toUpperCase()) : lines;
      if (b.kind === 'text') {
        x.font = fontCss(f, px);
        setLS(x, b.role === 'caps' ? px * 0.22 : 0);
        const widest = () => Math.max(...text.map((l) => x.measureText(l).width));
        while (px > 4 && widest() > bw) {
          px *= 0.94;
          x.font = fontCss(f, px);
          setLS(x, b.role === 'caps' ? px * 0.22 : 0);
        }
      }
      const lh = f.script && b.role === 'head' ? 1.18 : b.role === 'caps' ? 1.5 : 1.28;
      const h = b.kind === 'art' ? px : b.kind === 'rule' ? px * 1.2 : b.kind === 'write' ? px * 2 : px * lh * text.length;
      laid.push({ b, px, lines: text, h });
      total += h + (b.gap ?? 2) * u * k;
    }
    if (total <= bh) break;
    k *= Math.max(0.6, (bh / total) * 0.98);
  }
  let y = align === 'center' ? by + Math.max(0, (bh - total) / 2) : by;
  const cx = bx + bw / 2;
  for (const L of laid) {
    const { b, px } = L;
    const f = fontFor(c, b.role);
    if (b.kind === 'art') {
      b.draw?.(x, cx, y, L.h);
    } else if (b.kind === 'rule') {
      divider(x, cx, y + L.h / 2, Math.min(bw * 0.5, 34 * u), I, u);
    } else if (b.kind === 'write') {
      x.font = fontCss(fontFor(c, 'body'), px);
      setLS(x, 0);
      x.fillStyle = I.soft;
      x.textAlign = 'left';
      x.textBaseline = 'alphabetic';
      const lx = bx + bw * 0.08;
      x.fillText(b.t, lx, y + px * 1.3);
      const tw = x.measureText(b.t).width;
      x.strokeStyle = rgba(I.soft, 0.7);
      x.lineWidth = Math.max(1, u * 0.12);
      x.beginPath();
      x.moveTo(lx + tw + u, y + px * 1.35);
      x.lineTo(bx + bw * 0.92, y + px * 1.35);
      x.stroke();
    } else {
      x.font = fontCss(f, px);
      setLS(x, b.role === 'caps' ? px * 0.22 : 0);
      x.textAlign = 'center';
      x.textBaseline = 'alphabetic';
      const lh = L.h / L.lines.length;
      L.lines.forEach((line, i) => {
        const ly = y + lh * (i + 0.78);
        const tw = x.measureText(line).width;
        const tone = b.tone ?? 'ink';
        if (tone === 'foil' && I.foil) {
          // A faint shadow under foil reads as a slight emboss.
          x.save();
          x.fillStyle = I.dark ? 'rgba(0,0,0,.35)' : 'rgba(80,60,30,.18)';
          x.fillText(line, cx + u * 0.08, ly + u * 0.1);
          x.restore();
        }
        fill(x, tone, I, cx - tw / 2, ly - px, tw, px);
        x.fillText(line, cx, ly);
      });
    }
    y += L.h + (b.gap ?? 2) * u * k;
  }
  setLS(x, 0);
}

function divider(x: X, cx: number, cy: number, w: number, I: Inks, u: number) {
  x.save();
  const col = I.foil ? foilGrad(x, cx - w / 2, cy, cx + w / 2, cy, I.foil) : I.soft;
  x.strokeStyle = col;
  x.fillStyle = col;
  x.lineWidth = Math.max(1, u * 0.18);
  x.beginPath();
  x.moveTo(cx - w / 2, cy);
  x.lineTo(cx - u * 2, cy);
  x.moveTo(cx + u * 2, cy);
  x.lineTo(cx + w / 2, cy);
  x.stroke();
  x.beginPath();
  x.moveTo(cx, cy - u * 1.1);
  x.lineTo(cx + u * 1.1, cy);
  x.lineTo(cx, cy + u * 1.1);
  x.lineTo(cx - u * 1.1, cy);
  x.fill();
  x.restore();
}

/* ------------------------------------------------------------------ botanicals (watercolour) */

function wcBloom(x: X, cx: number, cy: number, r: number, col: string, rng: Rng) {
  // Watercolour: translucent washes that pool slightly darker at their edges, lighter towards the centre,
  // painted back to front so the inner petals sit on top. Normal blending keeps overlaps luminous.
  x.save();
  const light = mix(col, '#ffffff', 0.55),
    edge = mix(col, '#40202a', 0.12);
  const rings = [
    { n: 7, rr: 1, s: 0.6, a: 0.42 },
    { n: 6, rr: 0.66, s: 0.5, a: 0.4 },
    { n: 5, rr: 0.34, s: 0.42, a: 0.38 },
  ];
  const rot0 = rng() * 6.28;
  for (const R of rings) {
    for (let i = 0; i < R.n; i++) {
      const a = rot0 + (i / R.n) * Math.PI * 2 + rng() * 0.3;
      const px = cx + Math.cos(a) * r * R.rr * 0.55,
        py = cy + Math.sin(a) * r * R.rr * 0.5;
      const pr = r * R.s * (0.85 + rng() * 0.3);
      const g = x.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, rgba(light, R.a * 0.55));
      g.addColorStop(0.7, rgba(col, R.a * 0.85));
      g.addColorStop(0.95, rgba(edge, R.a));
      g.addColorStop(1, rgba(edge, 0));
      x.fillStyle = g;
      x.beginPath();
      x.ellipse(px, py, pr, pr * 0.74, a, 0, Math.PI * 2);
      x.fill();
    }
  }
  // Stamens.
  x.fillStyle = rgba(mix(col, '#4a3020', 0.45), 0.6);
  for (let i = 0; i < 9; i++) {
    const a = rng() * 6.28,
      d = rng() * r * 0.13;
    x.beginPath();
    x.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * 0.035, 0, 7);
    x.fill();
  }
  x.restore();
}

function wcLeaf(x: X, bx: number, by: number, len: number, ang: number, col: string, rng: Rng, wide = 0.32) {
  x.save();
  x.translate(bx, by);
  x.rotate(ang);
  const g = x.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, rgba(mix(col, '#1c2a14', 0.18), 0.78));
  g.addColorStop(1, rgba(mix(col, '#ffffff', 0.3), 0.6));
  x.fillStyle = g;
  const w = len * wide * (0.8 + rng() * 0.4);
  x.beginPath();
  x.moveTo(0, 0);
  x.bezierCurveTo(len * 0.3, -w, len * 0.75, -w * 0.8, len, 0);
  x.bezierCurveTo(len * 0.75, w * 0.8, len * 0.3, w, 0, 0);
  x.fill();
  x.strokeStyle = rgba(mix(col, '#ffffff', 0.5), 0.55);
  x.lineWidth = Math.max(0.6, len * 0.02);
  x.beginPath();
  x.moveTo(len * 0.05, 0);
  x.quadraticCurveTo(len * 0.5, -w * 0.08, len * 0.92, 0);
  x.stroke();
  x.restore();
}

function eucalyptus(x: X, bx: number, by: number, len: number, ang: number, col: string, rng: Rng) {
  x.save();
  const tint = mix(col, '#9fb5a8', 0.45);
  x.strokeStyle = rgba(mix(tint, '#5a4a3a', 0.4), 0.8);
  x.lineWidth = Math.max(0.8, len * 0.012);
  x.beginPath();
  x.moveTo(bx, by);
  const ex = bx + Math.cos(ang) * len,
    ey = by + Math.sin(ang) * len;
  x.quadraticCurveTo(bx + Math.cos(ang + 0.25) * len * 0.5, by + Math.sin(ang + 0.25) * len * 0.5, ex, ey);
  x.stroke();
  for (let i = 1; i <= 7; i++) {
    const t = i / 8;
    const px = bx + (ex - bx) * t,
      py = by + (ey - by) * t;
    const r = len * 0.075 * (1.15 - t * 0.5);
    for (const sd of [-1, 1]) {
      const a = ang + sd * 1.2;
      x.fillStyle = rgba(mix(tint, '#ffffff', rng() * 0.3), 0.62);
      x.beginPath();
      x.ellipse(px + Math.cos(a) * r * 0.9, py + Math.sin(a) * r * 0.9, r, r * 0.86, a, 0, 7);
      x.fill();
    }
  }
  x.restore();
}

function berries(x: X, bx: number, by: number, r: number, col: string, rng: Rng) {
  x.save();
  for (let i = 0; i < 5; i++) {
    const px = bx + (rng() - 0.5) * r * 4,
      py = by + (rng() - 0.5) * r * 4;
    const g = x.createRadialGradient(px - r * 0.3, py - r * 0.3, r * 0.1, px, py, r);
    g.addColorStop(0, rgba(mix(col, '#ffffff', 0.5), 0.8));
    g.addColorStop(1, rgba(mix(col, '#2a1020', 0.3), 0.85));
    x.fillStyle = g;
    x.beginPath();
    x.arc(px, py, r, 0, 7);
    x.fill();
  }
  x.restore();
}

/** A corner spray pointing along `dir` (radians): leaves fanned behind a few blooms. */
function spray(x: X, cx: number, cy: number, size: number, dir: number, c: DrawCtx, rng: Rng, flowers = true) {
  const p = c.pal;
  const greens = [p.g, mix(p.g, '#8aa57a', 0.4), mix(p.g, '#2f4a2a', 0.3)];
  for (let i = 0; i < 9; i++) {
    const a = dir + (rng() - 0.5) * 2.2;
    const len = size * (0.45 + rng() * 0.45);
    if (i % 3 === 0) eucalyptus(x, cx, cy, len * 1.1, a, greens[i % 3], rng);
    else wcLeaf(x, cx + Math.cos(a) * size * 0.08, cy + Math.sin(a) * size * 0.08, len * 0.5, a, greens[i % 3], rng);
  }
  if (!flowers) {
    berries(x, cx + Math.cos(dir) * size * 0.35, cy + Math.sin(dir) * size * 0.35, size * 0.025, mix(p.g, '#3a2a4a', 0.5), rng);
    return;
  }
  const blooms = [...p.b].sort((a, b) => lum(a) - lum(b));
  const n = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const a = dir + (t - 0.4) * 1.3;
    const d = size * (0.1 + t * 0.32);
    // White blooms vanish on white paper, so lean on the palette's deeper colours.
    const col = blooms[Math.min(blooms.length - 1, Math.floor(rng() * 4))];
    wcBloom(x, cx + Math.cos(a) * d, cy + Math.sin(a) * d, size * (0.17 - t * 0.04), lum(col) > 0.9 ? mix(col, blooms[0], 0.55) : col, rng);
  }
  berries(x, cx + Math.cos(dir + 0.7) * size * 0.45, cy + Math.sin(dir + 0.7) * size * 0.45, size * 0.022, blooms[0], rng);
}

function wreath(x: X, cx: number, cy: number, r: number, c: DrawCtx, I: Inks, rng: Rng, initials: string, u: number) {
  const p = c.pal;
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const px = cx + Math.cos(a) * r,
      py = cy + Math.sin(a) * r;
    if (i % 4 === 0) eucalyptus(x, px, py, r * 0.55, a + Math.PI / 2 + 0.3, p.g, rng);
    else wcLeaf(x, px, py, r * 0.32, a + Math.PI / 2 + (rng() - 0.5) * 0.6, mix(p.g, '#88a070', rng() * 0.4), rng);
  }
  const blooms = [...p.b].sort((a, b) => lum(a) - lum(b));
  for (const a of [2.3, 2.75, 0.5]) wcBloom(x, cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.2, blooms[Math.floor(rng() * 3)], rng);
  x.save();
  const f = TYPES[c.suite.type].head;
  const px = r * (f.script ? 0.62 : 0.5);
  x.font = fontCss(f, px);
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const tw = x.measureText(initials).width;
  fill(x, 'foil', I, cx - tw / 2, cy - px / 2, tw, px);
  if (!I.foil) x.fillStyle = I.accent;
  x.fillText(initials, cx, cy + u * 0.4);
  x.restore();
}

/* ------------------------------------------------------------------ frames */

function rulesFrame(x: X, W: number, H: number, I: Inks, u: number) {
  x.save();
  const col = I.foil ? foilGrad(x, 0, 0, W, H, I.foil) : I.soft;
  x.strokeStyle = col;
  x.lineWidth = u * 0.5;
  x.strokeRect(4 * u, 4 * u, W - 8 * u, H - 8 * u);
  x.lineWidth = u * 0.16;
  x.strokeRect(5.6 * u, 5.6 * u, W - 11.2 * u, H - 11.2 * u);
  x.fillStyle = col;
  for (const [cx, cy] of [
    [4 * u, 4 * u],
    [W - 4 * u, 4 * u],
    [4 * u, H - 4 * u],
    [W - 4 * u, H - 4 * u],
  ]) {
    x.beginPath();
    x.moveTo(cx, cy - u * 1.4);
    x.lineTo(cx + u * 1.4, cy);
    x.lineTo(cx, cy + u * 1.4);
    x.lineTo(cx - u * 1.4, cy);
    x.fill();
  }
  x.restore();
}

function decoFrame(x: X, W: number, H: number, I: Inks, u: number, fan: boolean) {
  x.save();
  const col = I.foil ? foilGrad(x, 0, 0, W, H, I.foil) : I.soft;
  x.strokeStyle = col;
  x.fillStyle = col;
  const m = 4 * u,
    s = 7 * u;
  x.lineWidth = u * 0.35;
  // A frame with stepped corners, and a thinner line inside it.
  const stepped = (o: number, st: number) => {
    x.beginPath();
    x.moveTo(o + st, o);
    x.lineTo(W - o - st, o);
    x.lineTo(W - o - st, o + st * 0.5);
    x.lineTo(W - o - st * 0.5, o + st * 0.5);
    x.lineTo(W - o - st * 0.5, o + st);
    x.lineTo(W - o, o + st);
    x.lineTo(W - o, H - o - st);
    x.lineTo(W - o - st * 0.5, H - o - st);
    x.lineTo(W - o - st * 0.5, H - o - st * 0.5);
    x.lineTo(W - o - st, H - o - st * 0.5);
    x.lineTo(W - o - st, H - o);
    x.lineTo(o + st, H - o);
    x.lineTo(o + st, H - o - st * 0.5);
    x.lineTo(o + st * 0.5, H - o - st * 0.5);
    x.lineTo(o + st * 0.5, H - o - st);
    x.lineTo(o, H - o - st);
    x.lineTo(o, o + st);
    x.lineTo(o + st * 0.5, o + st);
    x.lineTo(o + st * 0.5, o + st * 0.5);
    x.lineTo(o + st, o + st * 0.5);
    x.closePath();
    x.stroke();
  };
  stepped(m, s);
  x.lineWidth = u * 0.14;
  stepped(m + 1.8 * u, s * 0.8);
  if (fan) {
    // A sunburst fan at the top.
    const cx = W / 2,
      cy = m + 1.8 * u;
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (i / 12);
      x.beginPath();
      x.moveTo(cx, cy);
      x.lineTo(cx + Math.cos(a) * 9 * u, cy + Math.sin(a) * 9 * u);
      x.stroke();
    }
    x.beginPath();
    x.arc(cx, cy, 9 * u, 0, Math.PI);
    x.stroke();
    x.beginPath();
    x.arc(cx, cy, 2.4 * u, 0, Math.PI);
    x.fill();
  }
  x.restore();
}

function stars(x: X, W: number, H: number, I: Inks, u: number, rng: Rng, moon: boolean) {
  x.save();
  const col = I.foil ? foilGrad(x, 0, 0, W, H, I.foil) : I.soft;
  x.fillStyle = col;
  const star = (cx: number, cy: number, r: number) => {
    x.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2,
        rr = i % 2 ? r * 0.28 : r;
      x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    x.closePath();
    x.fill();
  };
  const n = Math.round((W * H) / (u * u) / 160);
  for (let i = 0; i < n; i++) {
    const px = rng() * W,
      py = rng() * H;
    // Keep a clear band down the middle for the words.
    if (Math.abs(px - W / 2) < W * 0.3 && py > H * 0.18 && py < H * 0.85) continue;
    if (rng() < 0.35) star(px, py, u * (0.8 + rng() * 1.4));
    else {
      x.beginPath();
      x.arc(px, py, u * (0.15 + rng() * 0.25), 0, 7);
      x.fill();
    }
  }
  if (moon) {
    const cx = W / 2,
      cy = 12 * u,
      r = 5 * u;
    x.beginPath();
    x.arc(cx, cy, r, 0, 7);
    x.fill();
    x.globalCompositeOperation = 'destination-out';
    x.beginPath();
    x.arc(cx + r * 0.45, cy - r * 0.2, r * 0.85, 0, 7);
    x.fill();
  }
  x.restore();
}

/** Draw the piece's ornament and return how much space it takes at the top and bottom (in px). */
function ornament(x: X, k: PieceKind, c: DrawCtx, I: Inks, W: number, H: number, u: number, rng: Rng): { top: number; bottom: number; side: number } {
  const o = c.suite.ornament;
  const tall = H > W * 1.05,
    small = k === 'placecard' || k === 'favour';
  const minSide = Math.min(W, H);
  if (o === 'florals' || o === 'greenery') {
    const fl = o === 'florals';
    if (small) {
      spray(x, W * 0.08, H * 0.2, minSide * 0.55, 0.7, c, rng, fl);
      return { top: 0, bottom: 0, side: 12 * u };
    }
    if (tall) {
      spray(x, W * 0.02, H * 0.015, W * 0.5, 0.8, c, rng, fl);
      spray(x, W * 0.98, H * 0.985, W * 0.36, 0.8 + Math.PI, c, rng, fl);
      return { top: W * 0.3, bottom: W * 0.22, side: 0 };
    }
    spray(x, W * 0.02, H * 0.04, H * 0.5, 0.6, c, rng, fl);
    spray(x, W * 0.98, H * 0.96, H * 0.4, 0.6 + Math.PI, c, rng, fl);
    return { top: 0, bottom: 0, side: H * 0.28 };
  }
  if (o === 'wreath') {
    if (small || !tall) {
      spray(x, W * 0.06, H * 0.12, minSide * 0.5, 0.6, c, rng, true);
      return { top: 0, bottom: 0, side: small ? 12 * u : 8 * u };
    }
    const r = W * 0.13;
    wreath(x, W / 2, 7 * u + r * 1.2, r, c, I, rng, initialsOf(c.suite.wording.names) || '♥', u);
    return { top: 7 * u + r * 2.5, bottom: 0, side: 0 };
  }
  if (o === 'rules') {
    rulesFrame(x, W, H, I, u);
    return { top: 5 * u, bottom: 5 * u, side: 5 * u };
  }
  if (o === 'deco') {
    decoFrame(x, W, H, I, u, tall && !small);
    return { top: tall && !small ? 13 * u : 6 * u, bottom: 6 * u, side: 6 * u };
  }
  if (o === 'stars') {
    stars(x, W, H, I, u, rng, tall && !small);
    return { top: tall && !small ? 16 * u : 3 * u, bottom: 3 * u, side: 4 * u };
  }
  return { top: 0, bottom: 0, side: 0 };
}

/* ------------------------------------------------------------------ piece content */

function blocksFor(k: PieceKind, c: DrawCtx, o: DrawOpts): Block[] {
  const w = c.suite.wording;
  const ps = namesOf(w.names);
  const two = ps.length >= 2;
  const namesBlocks = (s: number, gap = 3): Block[] =>
    two ? [T(ps[0], 'head', s, 'foil', 0.6), T('&', 'italic', s * 0.42, 'accent', 0.4), T(ps.slice(1).join(' & '), 'head', s, 'foil', gap)] : [T(w.names || 'Your names', 'head', s, 'foil', gap)];
  const [dayLine, yearLine] = dateFormal(w.date);
  const place = [w.venue, w.address].filter(Boolean);
  switch (k) {
    case 'savethedate':
      return [T('Save the date', 'caps', 3.4, 'soft', 3), ...namesBlocks(12, 4), T(w.date ? dateShort(w.date) : 'The date to come', 'caps', 4, 'ink', 2), T(place[0] || c.venueName, 'italic', 4.2, 'soft', 3), T('Formal invitation to follow', 'body', 3, 'soft', 0)];
    case 'invitation':
      return [
        ...(w.host ? [T(w.host, 'italic', 4.6, 'soft', 3)] : []),
        ...namesBlocks(13.5, 3),
        T('request the pleasure of your company\nat the celebration of their marriage', 'body', 4.6, 'ink', 3.5),
        T(dayLine, 'caps', 3.8, 'ink', 0.8),
        ...(yearLine ? [T(yearLine, 'caps', 3.8, 'ink', 0.8)] : []),
        ...(w.time ? [T(timeFormal(w.time), 'italic', 4.4, 'ink', 3.5)] : []),
        T(w.venue || c.venueName, 'head', 6.4, 'accent', 1),
        ...(w.address ? [T(w.address, 'body', 3.8, 'soft', 3)] : []),
        ...(w.reception ? [RULE(2.5), T(w.reception, 'italic', 4.2, 'soft', 0)] : []),
      ];
    case 'rsvp':
      return [
        T('Kindly reply', 'head', 9, 'foil', 1.5),
        T(w.rsvpBy ? `by ${dateShort(w.rsvpBy)}` : 'at your earliest convenience', 'italic', 4.6, 'soft', 3.5),
        WRITE('M', 2),
        T('○  Joyfully accepts        ○  Regretfully declines', 'body', 4.2, 'ink', 3),
        // Meal choices from the Menu planner.
        ...(c.choices ?? []).flatMap((ch) => [T(ch.course, 'caps', 2.8, 'accent', 0.8), T(ch.options.map((o) => '○ ' + o).join('     '), 'body', 3.6, 'ink', 2)]),
        WRITE('Dietary requirements', 1.5),
        ...(c.choices?.length ? [] : [WRITE('Song request', 0)]),
      ];
    case 'details': {
      const lines: Block[] = [T('The details', 'head', 11, 'foil', 4)];
      const sec = (h: string, t: string) => [T(h, 'caps', 3.2, 'accent', 1.2), T(t, 'body', 4.4, 'ink', 4)];
      lines.push(...sec('Ceremony', [w.time ? timeShort(w.time) : '', w.venue || c.venueName].filter(Boolean).join(' · ')));
      if (w.reception) lines.push(...sec('Reception', w.reception));
      if (w.dress) lines.push(...sec('Dress code', w.dress));
      if (w.website) lines.push(...sec('Website & RSVP', w.website));
      if (w.note) lines.push(...sec('A note', w.note));
      return lines;
    }
    case 'menu': {
      const courses = c.menu?.length ? c.menu : menuCourses(c.suite.menu);
      return [
        T(w.names, 'italic', 4.2, 'soft', 1.5),
        T('Menu', 'head', 15, 'foil', 2),
        RULE(4),
        ...courses.flatMap((m) => [T(m.course, 'caps', 3.4, 'accent', 1.2), T(m.dish, 'body', 6, 'ink', 0.8), ...(m.desc ? [T(m.desc, 'italic', 4.2, 'soft', 5)] : [])]),
        T(dateShort(w.date), 'caps', 3, 'soft', 0),
      ];
    }
    case 'barmenu': {
      const bar = c.bar;
      const sigs = bar?.signatures ?? [];
      return [
        T('Signature drinks', 'head', 12, 'foil', 1.5),
        T(w.names, 'italic', 3.6, 'soft', 4),
        ...(sigs.length ? [{ t: '', role: 'body' as Role, s: 11, gap: 5, kind: 'art' as const, draw: (x: X, cx: number, y: number, h: number) => glassRow(x, sigs, inksOf(c), cx, y, h / 11) }] : []),
        ...sigs.flatMap((d) => [T(d.name, 'body', 5.6, 'ink', 0.6), T(d.desc + (d.zero ? ' · alcohol-free' : ''), 'italic', 3.6, 'soft', 4)]),
        ...(bar ? [RULE(3), T('Also pouring', 'caps', 2.8, 'accent', 1), T([bar.wine.sparkling, bar.wine.white, bar.wine.red].filter(Boolean).join('  ·  '), 'body', 3.6, 'ink', 0)] : []),
      ];
    }
    case 'placecard':
      return [T(o.main || 'Guest Name', 'head', 17, 'foil', 1.5), T(w.names ? initialsOf(w.names).split('').join(' & ') + ' · ' + dateDots(w.date) : '', 'caps', 3.2, 'soft', 0)];
    case 'tablenum': {
      const t = o.main || '1';
      const isNum = /^\d+$/.test(t);
      return isNum ? [T('Table', 'caps', 5, 'soft', 1), T(numberWords(+t).replace(/^./, (ch) => ch.toUpperCase()), 'head', 20, 'foil', 0)] : [T(t, 'head', 20, 'foil', 0)];
    }
    case 'welcome':
      return [T(o.main || 'Welcome', 'head', 22, 'foil', 2), T('to the wedding of', 'caps', 3.4, 'soft', 4), ...namesBlocks(11, 3), RULE(3), T(dateShort(w.date), 'caps', 3.6, 'ink', 0)];
    case 'program': {
      const items = c.suite.program
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      return [T('Order of service', 'head', 11, 'foil', 1.5), T(`${w.names} · ${dateShort(w.date)}`, 'italic', 4, 'soft', 3), RULE(4), ...items.map((it) => T(it, 'body', 5, 'ink', 2.6))];
    }
    case 'favour':
      return [T('Thank you', 'head', 20, 'foil', 2), T(w.names, 'italic', 7, 'soft', 1), T(dateDots(w.date), 'caps', 5.4, 'soft', 0)];
    case 'thankyou':
      return [T('Thank you', 'head', 20, 'foil', 3), T('for being part of our day', 'italic', 5, 'soft', 3), T(w.names, 'caps', 3.6, 'ink', 0)];
    case 'seating':
      return [];
  }
}

function seatingGrid(x: X, c: DrawCtx, I: Inks, bx: number, by: number, bw: number, bh: number, u: number) {
  const w = c.suite.wording;
  stack(x, c, I, [T('Find your seat', 'head', 11, 'foil', 1), T(`${w.names} · ${dateShort(w.date)}`, 'italic', 3, 'soft', 0)], bx, by, bw, 20 * u, u, 'top');
  const tables = seatingTables(c.suite, c.tables);
  const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(tables.length))));
  const rows = Math.ceil(tables.length / cols);
  const gy = by + 24 * u,
    gh = bh - 24 * u;
  const cw = bw / cols,
    ch = gh / rows;
  // Fewer tables get larger type, centred in the space.
  const k = cols === 1 ? 1.7 : cols === 2 ? 1.3 : 1;
  tables.forEach((t, i) => {
    const cx = bx + (i % cols) * cw,
      cy = gy + Math.floor(i / cols) * ch;
    const blocks = [T(t.name, 'caps', 2.6 * k, 'accent', 1.2 * k), ...(t.guests.length ? t.guests.map((g) => T(g, 'body', 2.9 * k, 'ink', 0.5 * k)) : [T('Guests to come', 'italic', 2.6 * k, 'soft', 0)])];
    stack(x, c, I, blocks, cx + u, cy, cw - 2 * u, ch - u, u, rows === 1 ? 'center' : 'top');
  });
}

/** A row of little illustrated glasses, one per signature drink, filled with its colour. */
function glassRow(x: X, sigs: Array<{ glass: string; colour: string }>, I: Inks, midX: number, y: number, u: number) {
  const n = sigs.length,
    gap = 16 * u,
    x0 = midX - ((n - 1) * gap) / 2;
  sigs.forEach((s, i) => {
    const cx = x0 + i * gap,
      h = 9 * u;
    x.save();
    x.lineWidth = u * 0.3;
    x.strokeStyle = I.soft;
    x.fillStyle = rgba(s.colour, 0.85);
    const bowl = (path: () => void, liquidTop: number) => {
      x.save();
      path();
      x.clip();
      x.fillRect(cx - 6 * u, y + liquidTop, 12 * u, h);
      x.restore();
      path();
      x.stroke();
    };
    const stem = (top: number) => {
      x.beginPath();
      x.moveTo(cx, y + top);
      x.lineTo(cx, y + h);
      x.moveTo(cx - 2 * u, y + h);
      x.lineTo(cx + 2 * u, y + h);
      x.stroke();
    };
    if (s.glass === 'coupe') {
      bowl(() => {
        x.beginPath();
        x.moveTo(cx - 3.4 * u, y + 2 * u);
        x.quadraticCurveTo(cx, y + 6.4 * u, cx + 3.4 * u, y + 2 * u);
        x.closePath();
      }, 2.8 * u);
      stem(4.2 * u);
    } else if (s.glass === 'martini') {
      bowl(() => {
        x.beginPath();
        x.moveTo(cx - 3.6 * u, y + 1.5 * u);
        x.lineTo(cx + 3.6 * u, y + 1.5 * u);
        x.lineTo(cx, y + 5.2 * u);
        x.closePath();
      }, 2.2 * u);
      stem(5.2 * u);
    } else if (s.glass === 'flute') {
      bowl(() => {
        x.beginPath();
        x.moveTo(cx - 1.3 * u, y);
        x.lineTo(cx + 1.3 * u, y);
        x.lineTo(cx + 1 * u, y + 5.5 * u);
        x.quadraticCurveTo(cx, y + 6.4 * u, cx - 1 * u, y + 5.5 * u);
        x.closePath();
      }, 1.4 * u);
      stem(6.2 * u);
    } else if (s.glass === 'wine') {
      bowl(() => {
        x.beginPath();
        x.moveTo(cx - 2.4 * u, y + 0.6 * u);
        x.lineTo(cx + 2.4 * u, y + 0.6 * u);
        x.quadraticCurveTo(cx + 2.8 * u, y + 5.4 * u, cx, y + 5.6 * u);
        x.quadraticCurveTo(cx - 2.8 * u, y + 5.4 * u, cx - 2.4 * u, y + 0.6 * u);
        x.closePath();
      }, 2.6 * u);
      stem(5.6 * u);
    } else {
      // Rocks (short) or highball (tall) tumbler.
      const tall = s.glass === 'highball';
      const gw = tall ? 2.2 * u : 3 * u,
        top = tall ? 0 : 3.4 * u;
      bowl(() => {
        x.beginPath();
        x.rect(cx - gw, y + top, gw * 2, h - top);
      }, top + (h - top) * 0.3);
    }
    x.restore();
  });
}

/* ------------------------------------------------------------------ public */

/**
 * Draw one piece into a W × H area (plus `bleed` px around it). The canvas should be W + 2·bleed wide.
 */
export function drawPiece(x: X, k: PieceKind, c: DrawCtx, W: number, H: number, o: DrawOpts = {}) {
  const b = o.bleed ?? 0;
  const u = W / 100;
  const rng = prng(hash(k + c.suite.theme + c.suite.ornament + (o.main ?? '')));
  const I = inksOf(c);
  x.save();
  x.translate(b, b);
  if (o.shape) {
    paperShape(x, W, H, c.suite.edge, prng(hash(k)));
    x.save();
    x.shadowColor = 'rgba(0,0,0,0)';
    x.clip();
    paperFill(x, c, 0, 0, W, H, u, rng);
    x.restore();
  } else paperFill(x, c, -b, -b, W + 2 * b, H + 2 * b, u, rng);
  if (o.shape) {
    paperShape(x, W, H, c.suite.edge, prng(hash(k)));
    x.clip();
  }
  const r = ornament(x, k, c, I, W, H, u, rng);
  const side = Math.max(9 * u, r.side + 3 * u);
  const top = Math.max(8 * u, r.top + 2 * u),
    bottom = Math.max(8 * u, r.bottom + 2 * u);
  if (k === 'seating') seatingGrid(x, c, I, side, top, W - side * 2, H - top - bottom, u);
  else if (k === 'favour') {
    // Punched hole and a loop of twine at the top of the tag.
    stack(x, c, I, blocksFor(k, c, o), side, top + 14 * u, W - side * 2, H - top - bottom - 14 * u, u);
  } else stack(x, c, I, blocksFor(k, c, o), side, top, W - side * 2, H - top - bottom, u);
  if (k === 'favour') {
    x.save();
    x.globalCompositeOperation = o.shape ? 'destination-out' : 'source-over';
    x.fillStyle = o.shape ? '#000' : 'rgba(0,0,0,.12)';
    x.beginPath();
    x.arc(W / 2, 9 * u, 3.2 * u, 0, 7);
    x.fill();
    x.restore();
  }
  x.restore();
}

/** Render a piece to a new canvas at `pxPerMm`, optionally with bleed (mm) and the paper's edge shape. */
export function pieceCanvas(k: PieceKind, c: DrawCtx, pxPerMm: number, o: DrawOpts & { bleedMm?: number } = {}) {
  const [wmm, hmm] = PIECES[k].mm;
  const b = Math.round((o.bleedMm ?? 0) * pxPerMm);
  const W = Math.round(wmm * pxPerMm),
    H = Math.round(hmm * pxPerMm);
  const cv = document.createElement('canvas');
  cv.width = W + 2 * b;
  cv.height = H + 2 * b;
  drawPiece(cv.getContext('2d')!, k, c, W, H, { ...o, bleed: b });
  return cv;
}

/* ------------------------------------------------------------------ flat lay */

const LAY: Array<{ k: PieceKind; x: number; y: number; r: number; s?: number }> = [
  { k: 'savethedate', x: 0.2, y: 0.24, r: -0.07 },
  { k: 'invitation', x: 0.44, y: 0.5, r: -0.035 },
  { k: 'rsvp', x: 0.6, y: 0.8, r: 0.06 },
  { k: 'details', x: 0.66, y: 0.42, r: 0.05 },
  { k: 'menu', x: 0.86, y: 0.5, r: -0.02 },
  { k: 'program', x: 0.18, y: 0.66, r: 0.04 },
  { k: 'placecard', x: 0.34, y: 0.86, r: -0.1 },
  { k: 'tablenum', x: 0.9, y: 0.16, r: 0.08, s: 0.8 },
  { k: 'favour', x: 0.07, y: 0.88, r: 0.25 },
  { k: 'thankyou', x: 0.84, y: 0.86, r: -0.05 },
];

/**
 * The suite styled as a photographed flat lay: pieces scattered on a linen surface with soft shadows, the
 * invitation on its envelope with a silk ribbon and a wax seal, and a loose sprig.
 */
export function drawFlatLay(x: X, W: number, H: number, c: DrawCtx, onKinds: PieceKind[], guestName: string, area = { x: 0, y: 0, w: W, h: H }) {
  const rng = prng(hash('flatlay' + c.suite.theme));
  // Surface: the palette's fabric, lightened, with a fine weave.
  const base = mix(c.pal.f, '#efe9df', 0.55);
  x.fillStyle = base;
  x.fillRect(0, 0, W, H);
  x.globalAlpha = 0.05;
  for (let i = 0; i < H; i += 3) {
    x.fillStyle = i % 6 ? '#000' : '#fff';
    x.fillRect(0, i, W, 1);
  }
  for (let i = 0; i < W; i += 3) {
    x.fillStyle = i % 6 ? '#fff' : '#000';
    x.fillRect(i, 0, 1, H);
  }
  x.globalAlpha = 1;
  const vg = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(40,25,10,.22)');
  x.fillStyle = vg;
  x.fillRect(0, 0, W, H);

  const scale = Math.min(area.w / 560, area.h / 380); // px per mm
  const AX = (f: number) => area.x + f * area.w,
    AY = (f: number) => area.y + f * area.h;
  const shown = LAY.filter((l) => onKinds.includes(l.k));
  const inv = shown.find((l) => l.k === 'invitation');
  const drawCard = (cv: HTMLCanvasElement, cx: number, cy: number, r: number) => {
    x.save();
    x.translate(cx, cy);
    x.rotate(r);
    x.shadowColor = 'rgba(40,25,10,.35)';
    x.shadowBlur = 14 * (scale / 1.5);
    x.shadowOffsetY = 5 * (scale / 1.5);
    x.drawImage(cv, -cv.width / 2, -cv.height / 2);
    x.restore();
  };
  // Envelope and ribbon under the invitation.
  if (inv) {
    const [wmm, hmm] = PIECES.invitation.mm;
    const ew = (wmm + 12) * scale,
      eh = (hmm + 10) * scale;
    x.save();
    x.translate(AX(inv.x) - 22 * scale, AY(inv.y) - 14 * scale);
    x.rotate(inv.r - 0.1);
    x.shadowColor = 'rgba(40,25,10,.3)';
    x.shadowBlur = 12;
    x.shadowOffsetY = 4;
    const env = mix(PAPERS[c.suite.paper].c, '#d9cdb8', 0.25);
    x.fillStyle = env;
    x.fillRect(-ew / 2, -eh / 2, ew, eh);
    x.shadowColor = 'transparent';
    // The open flap, lined in a palette colour.
    x.fillStyle = mix(c.pal.b[0], '#ffffff', 0.15);
    x.beginPath();
    x.moveTo(-ew / 2, -eh / 2);
    x.lineTo(ew / 2, -eh / 2);
    x.lineTo(0, -eh / 2 - eh * 0.36);
    x.closePath();
    x.fill();
    x.restore();
    // Silk ribbon.
    x.save();
    x.translate(AX(inv.x), AY(inv.y));
    x.rotate(inv.r + 0.9);
    const rg = x.createLinearGradient(0, -7 * scale, 0, 7 * scale);
    const rc = c.pal.b[1];
    rg.addColorStop(0, mix(rc, '#000000', 0.15));
    rg.addColorStop(0.45, mix(rc, '#ffffff', 0.35));
    rg.addColorStop(1, mix(rc, '#000000', 0.1));
    x.fillStyle = rg;
    x.shadowColor = 'rgba(40,25,10,.25)';
    x.shadowBlur = 6;
    x.fillRect(-260 * scale, -5 * scale, 520 * scale, 10 * scale);
    x.restore();
  }
  for (const l of shown) {
    const cv = pieceCanvas(l.k, c, scale * (l.s ?? 1), { shape: true, main: l.k === 'placecard' ? guestName : l.k === 'tablenum' ? '1' : undefined });
    drawCard(cv, AX(l.x), AY(l.y), l.r);
  }
  // Wax seal on the envelope corner.
  if (inv) {
    const sx = AX(inv.x) + 50 * scale,
      sy = AY(inv.y) + 78 * scale,
      r = 13 * scale;
    x.save();
    const wax = mix(c.pal.b[4] ?? c.pal.b[1], '#5a1a24', 0.25);
    x.shadowColor = 'rgba(40,20,10,.4)';
    x.shadowBlur = 8;
    x.shadowOffsetY = 3;
    x.fillStyle = wax;
    x.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2,
        rr = r * (1 + (rng() - 0.5) * 0.12);
      x.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
    }
    x.fill();
    x.shadowColor = 'transparent';
    const g = x.createRadialGradient(sx - r * 0.3, sy - r * 0.3, r * 0.1, sx, sy, r * 0.8);
    g.addColorStop(0, rgba(mix(wax, '#ffffff', 0.35), 0.8));
    g.addColorStop(1, rgba(wax, 0));
    x.fillStyle = g;
    x.beginPath();
    x.arc(sx, sy, r * 0.75, 0, 7);
    x.fill();
    x.strokeStyle = rgba(mix(wax, '#000000', 0.35), 0.6);
    x.lineWidth = scale * 0.8;
    x.beginPath();
    x.arc(sx, sy, r * 0.62, 0, 7);
    x.stroke();
    x.fillStyle = rgba(mix(wax, '#000000', 0.4), 0.75);
    x.font = `italic 500 ${r * 0.7}px "Cormorant Garamond", Georgia, serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(initialsOf(c.suite.wording.names).slice(0, 2), sx, sy + r * 0.05);
    x.restore();
  }
  // A loose sprig on the table.
  x.save();
  spray(x, AX(0.985), AY(0.02), Math.min(area.w, area.h) * 0.26, 2.3, c, rng, c.suite.ornament !== 'greenery');
  x.restore();
}
