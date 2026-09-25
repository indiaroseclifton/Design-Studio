import * as THREE from 'three';
import { getSeedState, pick, rnd, seed, setSeedState } from '../three/utils';
import type { Pal } from '../engine/studio';

/*
 * Storybook page art and pop-up cut-outs, drawn on canvases (ported from the prototype's Storybook).
 * Pages are PW × PH pixels; pop-up cards are drawn at whatever size the caller's canvas has.
 */

export const PW = 768,
  PAGE_ASPECT = 1.36,
  PH = Math.round(PW * PAGE_ASPECT);
const PI = Math.PI;
export const INK = '#3b2f27',
  SOFT = '#7d6c5b',
  GOLD = '#b48a45',
  COVER = '#233029';

type X = CanvasRenderingContext2D;

export interface Story {
  names: string;
  date: string;
}

export const F = (s: number, it = true, w = 500) => `${it ? 'italic ' : ''}${w} ${s}px "Cormorant Garamond", Georgia, serif`;
export const J = (s: number, w = 500) => `${w} ${s}px Jost, system-ui, sans-serif`;
export const shade = (c: string, a: number) => '#' + new THREE.Color(c).offsetHSL(0, 0, a).getHexString();
const gold = (x: X, x0: number, y0: number, x1: number, y1: number) => {
  const g = x.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#9c7231');
  g.addColorStop(0.45, '#f1d99a');
  g.addColorStop(0.6, '#d2ad62');
  g.addColorStop(1, '#9c7231');
  return g;
};
export const namesParts = (s: Story) => s.names.split(/\s*(?:&|\+|\band\b)\s*/i).filter(Boolean);
export const dateStr = (s: Story) => {
  const d = s.date;
  if (!d) return 'A day to remember';
  const t = new Date(d + (d.length <= 10 ? 'T12:00' : ''));
  return isNaN(t.getTime()) ? d : t.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
};

/** Run `f` with the shared PRNG seeded, then restore it so page art never disturbs scene layout. */
function seeded<T>(n: number, f: () => T): T {
  const k = getSeedState();
  seed(n);
  try {
    return f();
  } finally {
    setSeedState(k);
  }
}

const setLS = (x: X, v: string) => {
  try {
    (x as X & { letterSpacing: string }).letterSpacing = v;
  } catch {
    /* letterSpacing isn't supported everywhere */
  }
};

export function paperBg(x: X, side: 'L' | 'R') {
  x.fillStyle = '#f6efe2';
  x.fillRect(0, 0, PW, PH);
  seeded(side === 'L' ? 3 : 4, () => {
    for (let i = 0; i < 5200; i++) {
      x.fillStyle = rnd() < 0.5 ? 'rgba(120,90,60,.05)' : 'rgba(255,255,255,.3)';
      x.fillRect(rnd() * PW, rnd() * PH, 1.6, 1.6);
    }
  });
  const L = side === 'L',
    g = x.createLinearGradient(L ? PW : 0, 0, L ? PW - 120 : 120, 0);
  g.addColorStop(0, 'rgba(70,45,25,.34)');
  g.addColorStop(0.35, 'rgba(70,45,25,.08)');
  g.addColorStop(1, 'rgba(70,45,25,0)');
  x.fillStyle = g;
  x.fillRect(L ? PW - 120 : 0, 0, 120, PH);
  const g2 = x.createLinearGradient(L ? 0 : PW, 0, L ? 36 : PW - 36, 0);
  g2.addColorStop(0, 'rgba(90,60,30,.12)');
  g2.addColorStop(1, 'rgba(90,60,30,0)');
  x.fillStyle = g2;
  x.fillRect(L ? 0 : PW - 36, 0, 36, PH);
}

function spaced(x: X, t: string, cx: number, y: number, sp: number) {
  x.textAlign = 'center';
  setLS(x, sp + 'px');
  x.fillText(t, cx, y);
  setLS(x, '0px');
}
function fitFont(x: X, t: string, mw: number, size: number, fn: (s: number) => string) {
  let s = size;
  x.font = fn(s);
  while (s > 18 && x.measureText(t).width > mw) {
    s -= 2;
    x.font = fn(s);
  }
  return s;
}
function wrap(x: X, t: string, cx: number, y: number, mw: number, lh: number, al: CanvasTextAlign = 'center') {
  const ws = t.split(' ');
  let line = '';
  const ls: string[] = [];
  for (const w of ws) {
    const tt = line ? line + ' ' + w : w;
    if (x.measureText(tt).width > mw && line) {
      ls.push(line);
      line = w;
    } else line = tt;
  }
  if (line) ls.push(line);
  x.textAlign = al;
  ls.forEach((l, i) => x.fillText(l, cx, y + i * lh));
  return y + ls.length * lh;
}
function wrapDrop(x: X, t: string, x0: number, y: number, mw: number, lh: number) {
  const first = t[0],
    rest = t.slice(1);
  x.font = F(124);
  x.fillStyle = gold(x, x0, y - 90, x0 + 80, y + 40);
  x.textAlign = 'left';
  x.fillText(first, x0 - 6, y + lh * 1.3);
  const dw = x.measureText(first).width + 12;
  x.font = F(32, false);
  x.fillStyle = INK;
  const ws = rest.split(' ');
  let line = '',
    n = 0;
  const ls: Array<[string, number]> = [];
  for (const w of ws) {
    const ind = n < 2 ? dw : 0,
      tt = line ? line + ' ' + w : w;
    if (x.measureText(tt).width > mw - ind && line) {
      ls.push([line, ind]);
      line = w;
      n++;
    } else line = tt;
  }
  if (line) ls.push([line, n < 2 ? dw : 0]);
  ls.forEach(([l, ind], i) => x.fillText(l, x0 + ind, y + i * lh));
  return y + ls.length * lh;
}
function flourish(x: X, cx: number, y: number, w: number, col: string) {
  x.strokeStyle = col;
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(cx - w / 2, y);
  x.lineTo(cx - 16, y);
  x.moveTo(cx + 16, y);
  x.lineTo(cx + w / 2, y);
  x.stroke();
  x.fillStyle = col;
  x.beginPath();
  x.moveTo(cx, y - 9);
  x.lineTo(cx + 9, y);
  x.lineTo(cx, y + 9);
  x.lineTo(cx - 9, y);
  x.fill();
  for (const s of [-1, 1]) {
    x.beginPath();
    x.arc(cx + s * (w / 2 + 9), y, 3.5, 0, 7);
    x.fill();
  }
}
function pageNo(x: X, n?: number) {
  if (n == null) return;
  x.font = F(24, false);
  x.fillStyle = SOFT;
  x.textAlign = 'center';
  x.fillText(String(n), PW / 2, PH - 44);
}
function coverFit(x: X, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) {
  const ir = img.width / img.height,
    r = dw / dh;
  let sw = img.width,
    sh = img.height,
    sx = 0,
    sy = 0;
  if (ir > r) {
    sw = sh * r;
    sx = (img.width - sw) / 2;
  } else {
    sh = sw / r;
    sy = (img.height - sh) / 2;
  }
  x.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}
function sprig(x: X, cx: number, cy: number, s: number, col: string) {
  x.strokeStyle = col;
  x.fillStyle = col;
  x.lineWidth = 1.6 * s;
  x.beginPath();
  x.moveTo(cx, cy + 14 * s);
  x.quadraticCurveTo(cx + 3 * s, cy, cx, cy - 14 * s);
  x.stroke();
  for (const [dy, sd] of [
    [-8, 1],
    [-2, -1],
    [5, 1],
  ]) {
    x.save();
    x.translate(cx, cy + dy * s);
    x.rotate(sd * 0.9);
    x.beginPath();
    x.ellipse(sd * 5 * s, 0, 5 * s, 2.2 * s, 0, 0, 7);
    x.fill();
    x.restore();
  }
  x.beginPath();
  x.arc(cx, cy - 15 * s, 2.6 * s, 0, 7);
  x.fill();
}
function linen(x: X, base: string) {
  x.fillStyle = base;
  x.fillRect(0, 0, PW, PH);
  x.globalAlpha = 0.07;
  for (let i = 0; i < PH; i += 3) {
    x.fillStyle = i % 6 ? '#000' : '#fff';
    x.fillRect(0, i, PW, 1);
  }
  for (let i = 0; i < PW; i += 3) {
    x.fillStyle = i % 6 ? '#fff' : '#000';
    x.fillRect(i, 0, 1, PH);
  }
  x.globalAlpha = 1;
}

export function drawCoverPage(x: X, st: Story) {
  linen(x, COVER);
  const g = gold(x, 0, 0, PW, PH);
  x.strokeStyle = g;
  x.lineWidth = 3;
  x.strokeRect(46, 46, PW - 92, PH - 92);
  x.lineWidth = 1.2;
  x.strokeRect(60, 60, PW - 120, PH - 120);
  for (const [cx, cy] of [
    [60, 60],
    [PW - 60, 60],
    [60, PH - 60],
    [PW - 60, PH - 60],
  ]) {
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(cx, cy - 12);
    x.lineTo(cx + 12, cy);
    x.lineTo(cx, cy + 12);
    x.lineTo(cx - 12, cy);
    x.fill();
  }
  const cx = PW / 2,
    ini = namesParts(st)
      .map((s) => s.trim()[0] || '')
      .join(' ');
  x.strokeStyle = g;
  x.lineWidth = 2;
  x.beginPath();
  x.arc(cx, 250, 70, 0, 7);
  x.stroke();
  x.beginPath();
  x.arc(cx, 250, 60, 0, 7);
  x.lineWidth = 0.8;
  x.stroke();
  x.fillStyle = g;
  x.font = F(58);
  x.textAlign = 'center';
  x.fillText(ini, cx, 270);
  x.font = J(20);
  spaced(x, 'A WEDDING STORYBOOK', cx, 420, 9);
  x.font = F(108);
  x.shadowColor = 'rgba(0,0,0,.45)';
  x.shadowOffsetY = 3;
  x.shadowBlur = 4;
  x.fillText('Our', cx, 540);
  x.fillText('Wedding', cx, 650);
  x.shadowColor = 'transparent';
  flourish(x, cx, 710, 300, '#d9bb78');
  fitFont(x, st.names, PW - 200, 56, (s) => F(s));
  x.fillStyle = g;
  x.fillText(st.names, cx, 810);
  x.font = J(18);
  spaced(x, dateStr(st).toUpperCase(), cx, 870, 5);
}

export function drawEndpaper(x: X, side: 'L' | 'R', plate: boolean, st: Story, p: Pal) {
  x.fillStyle = shade(COVER, 0.04);
  x.fillRect(0, 0, PW, PH);
  let k = 0;
  for (let y = 40; y < PH; y += 90, k++)
    for (let i = 0; i < 10; i++) {
      const cx = i * 96 + (k % 2) * 48;
      sprig(x, cx, y, 1.1, k % 3 === 0 ? 'rgba(233,205,140,.42)' : i % 2 ? 'rgba(233,205,140,.26)' : p.b[i % p.b.length] + '66');
    }
  const L = side === 'L',
    g = x.createLinearGradient(L ? PW : 0, 0, L ? PW - 100 : 100, 0);
  g.addColorStop(0, 'rgba(0,0,0,.4)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(L ? PW - 100 : 0, 0, 100, PH);
  if (plate) {
    const w = 380,
      h = 300,
      x0 = (PW - w) / 2 - 16,
      y0 = PH * 0.5 - h / 2;
    x.fillStyle = '#f6efe2';
    x.shadowColor = 'rgba(0,0,0,.35)';
    x.shadowBlur = 18;
    x.fillRect(x0, y0, w, h);
    x.shadowColor = 'transparent';
    x.strokeStyle = GOLD;
    x.lineWidth = 2;
    x.strokeRect(x0 + 14, y0 + 14, w - 28, h - 28);
    const cx = x0 + w / 2;
    x.fillStyle = SOFT;
    x.font = J(16);
    spaced(x, 'THIS BOOK BELONGS TO', cx, y0 + 82, 5);
    x.fillStyle = INK;
    fitFont(x, st.names, w - 70, 50, (s) => F(s));
    x.fillText(st.names, cx, y0 + 156);
    flourish(x, cx, y0 + 196, 160, GOLD);
    x.fillStyle = SOFT;
    x.font = F(26, false);
    x.fillText(dateStr(st), cx, y0 + 240);
  }
}

export function drawTitle(x: X, st: Story, venueName: string) {
  paperBg(x, 'R');
  const cx = PW / 2 + 14,
    ps = namesParts(st);
  let y = PH * 0.34;
  x.fillStyle = SOFT;
  x.font = J(19);
  spaced(x, 'THE WEDDING OF', cx, y, 8);
  y += 30;
  x.fillStyle = INK;
  if (ps.length >= 2) {
    fitFont(x, ps[0], PW - 180, 100, (s) => F(s));
    x.fillText(ps[0], cx, y + 100);
    x.font = F(60);
    x.fillStyle = gold(x, cx - 30, y + 120, cx + 30, y + 180);
    x.fillText('&', cx, y + 172);
    x.fillStyle = INK;
    fitFont(x, ps[1], PW - 180, 100, (s) => F(s));
    x.fillText(ps[1], cx, y + 262);
    y += 310;
  } else {
    fitFont(x, st.names, PW - 160, 88, (s) => F(s));
    x.fillText(st.names, cx, y + 110);
    y += 160;
  }
  flourish(x, cx, y, 280, GOLD);
  y += 70;
  x.fillStyle = INK;
  x.font = J(19);
  spaced(x, dateStr(st).toUpperCase(), cx, y, 5);
  y += 50;
  x.font = F(32);
  x.fillStyle = SOFT;
  wrap(x, 'at ' + venueName, cx, y, PW - 200, 40);
}

export interface ChapterOpts {
  num: string;
  title: string;
  body?: string;
  list?: Array<[string, string]>;
  menu?: Array<[string, string, string]>;
  sign?: boolean;
  n?: number;
}

export function chapterPage(x: X, o: ChapterOpts, st: Story) {
  paperBg(x, 'L');
  const cx = PW / 2 - 14;
  let y = PH * 0.24;
  x.fillStyle = SOFT;
  x.font = J(18);
  spaced(x, 'CHAPTER ' + o.num, cx, y, 7);
  y += 82;
  x.fillStyle = INK;
  fitFont(x, o.title, PW - 170, 78, (s) => F(s));
  x.textAlign = 'center';
  x.fillText(o.title, cx, y);
  y += 42;
  flourish(x, cx, y, 250, GOLD);
  y += 76;
  if (o.body) y = wrapDrop(x, o.body, 104, y, PW - 236, 45) + 14;
  if (o.list)
    o.list.forEach(([k, v]) => {
      x.font = J(15);
      x.fillStyle = SOFT;
      x.textAlign = 'left';
      setLS(x, '3px');
      x.fillText(k.toUpperCase(), 110, y);
      setLS(x, '0px');
      x.fillStyle = INK;
      fitFont(x, v, PW - 420, 29, (s) => F(s, false));
      x.textAlign = 'right';
      x.fillText(v, PW - 140, y + 2);
      x.strokeStyle = 'rgba(120,90,60,.28)';
      x.setLineDash([2, 6]);
      x.lineWidth = 1.2;
      x.beginPath();
      x.moveTo(110, y + 16);
      x.lineTo(PW - 140, y + 16);
      x.stroke();
      x.setLineDash([]);
      y += 58;
    });
  if (o.menu)
    o.menu.forEach(([c, d, s]) => {
      x.font = J(16);
      x.fillStyle = GOLD;
      spaced(x, c.toUpperCase(), cx, y, 5);
      y += 44;
      x.font = F(36);
      x.fillStyle = INK;
      y = wrap(x, d, cx, y, PW - 250, 40);
      x.font = F(24, false);
      x.fillStyle = SOFT;
      y = wrap(x, s, cx, y, PW - 250, 30) + 30;
    });
  if (o.sign) {
    x.fillStyle = INK;
    fitFont(x, st.names, PW - 200, 58, (s) => F(s));
    x.textAlign = 'center';
    x.fillText(st.names, cx, PH - 150);
  }
  pageNo(x, o.n);
}

export function photoPage(x: X, img: HTMLImageElement | undefined, cap: string, n: number, o: { tilt?: number; night?: boolean } = {}) {
  paperBg(x, 'R');
  const cx = PW / 2 + 14,
    cy = PH * 0.54,
    w = PW * 0.72,
    h = w * 0.76,
    b = 20;
  x.save();
  x.translate(cx, cy);
  x.rotate(o.tilt ?? -0.025);
  x.shadowColor = 'rgba(40,25,10,.38)';
  x.shadowBlur = 28;
  x.shadowOffsetY = 12;
  x.fillStyle = '#fdfbf6';
  x.fillRect(-w / 2 - b, -h / 2 - b, w + b * 2, h + b * 2 + 84);
  x.shadowColor = 'transparent';
  if (img) coverFit(x, img, -w / 2, -h / 2, w, h);
  else {
    x.fillStyle = '#e6ddd0';
    x.fillRect(-w / 2, -h / 2, w, h);
  }
  if (o.night) {
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = '#34427e';
    x.fillRect(-w / 2, -h / 2, w, h);
    x.globalCompositeOperation = 'screen';
    seeded(12, () => {
      for (let i = 0; i < 46; i++) {
        const r = 4 + rnd() * 18;
        const g = x.createRadialGradient(0, 0, 0, 0, 0, r);
        x.save();
        x.translate(-w / 2 + rnd() * w, -h / 2 + rnd() * h * 0.6);
        g.addColorStop(0, 'rgba(255,214,150,.9)');
        g.addColorStop(1, 'rgba(255,214,150,0)');
        x.fillStyle = g;
        x.beginPath();
        x.arc(0, 0, r, 0, 7);
        x.fill();
        x.restore();
      }
    });
    x.globalCompositeOperation = 'source-over';
  }
  const vg = x.createRadialGradient(0, 0, h * 0.3, 0, 0, w * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(40,20,5,.28)');
  x.fillStyle = vg;
  x.fillRect(-w / 2, -h / 2, w, h);
  x.fillStyle = INK;
  x.font = F(34);
  x.textAlign = 'center';
  x.fillText(cap, 0, h / 2 + 64);
  x.fillStyle = 'rgba(236,222,190,.8)';
  for (const s of [-1, 1]) {
    x.save();
    x.translate(s * (w / 2 - 10), -h / 2 - b);
    x.rotate(s * 0.6);
    x.fillRect(-46, -14, 92, 28);
    x.restore();
  }
  x.restore();
  pageNo(x, n);
}

export function drawEnd(x: X, st: Story) {
  paperBg(x, 'R');
  const cx = PW / 2 + 14;
  x.fillStyle = SOFT;
  x.font = J(18);
  spaced(x, 'AND SO IT BEGINS', cx, PH * 0.36, 8);
  x.fillStyle = INK;
  x.font = F(118);
  x.textAlign = 'center';
  x.fillText('The End', cx, PH * 0.36 + 150);
  flourish(x, cx, PH * 0.36 + 200, 280, GOLD);
  x.font = F(34);
  x.fillStyle = SOFT;
  wrap(x, '…and the beginning of everything.', cx, PH * 0.36 + 270, PW - 220, 42);
  x.font = J(18);
  x.fillStyle = INK;
  spaced(x, dateStr(st).toUpperCase(), cx, PH * 0.36 + 360, 5);
}

/* ---------------------------------------------------------------- pop-up cut-outs */

function flower(x: X, cx: number, cy: number, r: number, col: string, n = 6) {
  x.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283;
    x.beginPath();
    x.ellipse(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.52, r * 0.34, a, 0, 7);
    x.fill();
  }
  x.fillStyle = shade(col, -0.22);
  x.beginPath();
  x.arc(cx, cy, r * 0.3, 0, 7);
  x.fill();
}
function leafS(x: X, cx: number, cy: number, l: number, a: number, col: string) {
  x.save();
  x.translate(cx, cy);
  x.rotate(a);
  x.fillStyle = col;
  x.beginPath();
  x.moveTo(0, 0);
  x.quadraticCurveTo(l * 0.5, -l * 0.3, l, 0);
  x.quadraticCurveTo(l * 0.5, l * 0.3, 0, 0);
  x.fill();
  x.restore();
}
export function bank(x: X, w: number, h: number, p: Pal) {
  x.fillStyle = shade(p.g, -0.06);
  x.beginPath();
  x.moveTo(0, h);
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    x.lineTo(t * w, h * 0.5 - Math.sin(t * 9 + 1) * h * 0.1 - rnd() * h * 0.12);
  }
  x.lineTo(w, h);
  x.fill();
  for (let i = 0; i < w / 12; i++) leafS(x, rnd() * w, h * 0.55 + rnd() * h * 0.35, h * (0.2 + rnd() * 0.22), -PI / 2 + (rnd() - 0.5) * 1.8, shade(p.g, (rnd() - 0.5) * 0.16));
  for (let i = 0; i < w / 30; i++) flower(x, rnd() * w, h * 0.35 + rnd() * h * 0.4, h * (0.08 + rnd() * 0.07), pick(p.b));
}
export function archCard(x: X, w: number, h: number, p: Pal) {
  const r = Math.min(w * 0.32, h * 0.42),
    cx = w / 2,
    cy = r + h * 0.08,
    band = r * 0.2;
  const pt = (t: number): [number, number] => {
    const L = h - cy;
    const tot = L * 2 + PI * r;
    let d = t * tot;
    if (d < L) return [cx - r, h - d];
    d -= L;
    if (d < PI * r) {
      const a = PI + d / r;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    }
    d -= PI * r;
    return [cx + r, cy + d];
  };
  x.strokeStyle = shade(p.g, -0.12);
  x.lineWidth = band * 0.5;
  x.beginPath();
  for (let t = 0; t <= 1; t += 0.01) {
    const [a, b] = pt(t);
    if (t) x.lineTo(a, b);
    else x.moveTo(a, b);
  }
  x.stroke();
  for (let t = 0; t <= 1; t += 0.006) {
    const [a, b] = pt(t),
      dense = t > 0.3 && t < 0.62;
    if (rnd() < 0.7) leafS(x, a + (rnd() - 0.5) * band, b + (rnd() - 0.5) * band, band * (0.8 + rnd() * 0.7), rnd() * 6.28, shade(p.g, (rnd() - 0.5) * 0.18));
    if (rnd() < (dense ? 0.5 : 0.18)) flower(x, a + (rnd() - 0.5) * band * 1.2, b + (rnd() - 0.5) * band * 1.2, band * (0.45 + rnd() * 0.35), pick(p.b));
  }
}
export function skyCard(x: X, w: number, h: number, sky: [string, string, string]) {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, sky[0]);
  g.addColorStop(0.9, sky[1]);
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(0, h);
  x.lineTo(0, h * 0.3);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const x1 = ((i + 1) / n) * w;
    x.quadraticCurveTo(((i + 0.5) / n) * w, h * (i % 2 ? 0.02 : 0.1), x1, h * (0.16 + (i % 3) * 0.04));
  }
  x.lineTo(w, h);
  x.closePath();
  x.fill();
  x.fillStyle = 'rgba(255,246,228,.9)';
  x.beginPath();
  x.arc(w * 0.72, h * 0.36, h * 0.1, 0, 7);
  x.fill();
  x.fillStyle = shade(sky[2], 0.06);
  x.beginPath();
  x.moveTo(0, h);
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    x.lineTo(t * w, h * (0.72 - 0.1 * Math.sin(t * 6.5 + 0.5)));
  }
  x.lineTo(w, h);
  x.fill();
}

export function venueKind(name: string) {
  const n = name.toLowerCase();
  for (const k of ['barn', 'villa', 'beach', 'garden', 'ballroom', 'conservatory', 'vineyard', 'woodland', 'rooftop', 'desert']) if (n.includes(k)) return k;
  if (/forest|wood/.test(n)) return 'woodland';
  if (/city|loft/.test(n)) return 'rooftop';
  if (/oasis|dune/.test(n)) return 'desert';
  if (/chateau|château|palace/.test(n)) return 'ballroom';
  return 'garden';
}

/** A paper cut-out of the venue's silhouette, in the style of a pop-up book. */
export function venueCard(x: X, w: number, h: number, sky: [string, string, string], kind: string) {
  const u = h * 0.86,
    cx = w / 2,
    b = h * 0.95,
    pc = '#f8f2e7',
    ln = '#b3a085',
    skyC = sky[1];
  x.fillStyle = pc;
  x.strokeStyle = ln;
  x.lineWidth = 3;
  x.lineJoin = 'round';
  const X = (a: number) => cx + a * u,
    Y = (c: number) => b - c * u,
    poly = (pts: number[][]) => {
      x.beginPath();
      pts.forEach(([a, c], i) => (i ? x.lineTo(X(a), Y(c)) : x.moveTo(X(a), Y(c))));
      x.closePath();
      x.fill();
      x.stroke();
    },
    rect = (a: number, c: number, ww: number, hh: number) => {
      x.fillRect(X(a), Y(c + hh), ww * u, hh * u);
      x.strokeRect(X(a), Y(c + hh), ww * u, hh * u);
    },
    ell = (a: number, c: number, rx: number, ry: number) => {
      x.beginPath();
      x.ellipse(X(a), Y(c), rx * u, ry * u, 0, 0, 7);
      x.fill();
      x.stroke();
    },
    win = (a: number, c: number, ww: number, hh: number, arch?: boolean) => {
      x.save();
      x.fillStyle = skyC;
      x.beginPath();
      if (arch) {
        const r = (ww * u) / 2;
        x.moveTo(X(a), Y(c));
        x.lineTo(X(a), Y(c + hh) + r);
        x.arc(X(a) + r, Y(c + hh) + r, r, PI, 0);
        x.lineTo(X(a + ww), Y(c));
        x.closePath();
      } else x.rect(X(a), Y(c + hh), ww * u, hh * u);
      x.fill();
      x.restore();
    },
    tree = (a: number, s: number) => {
      rect(a - 0.012 * s, 0, 0.024 * s, 0.2 * s);
      ell(a, 0.3 * s, 0.12 * s, 0.13 * s);
    },
    cyp = (a: number, s: number) => ell(a, 0.3 * s, 0.045 * s, 0.3 * s),
    pine = (a: number, s: number) => {
      for (let k = 0; k < 3; k++)
        poly([
          [a - (0.16 - k * 0.04) * s, (0.1 + k * 0.17) * s],
          [a, (0.36 + k * 0.17) * s],
          [a + (0.16 - k * 0.04) * s, (0.1 + k * 0.17) * s],
        ]);
      rect(a - 0.015 * s, 0, 0.03 * s, 0.1 * s);
    },
    palm = (a: number, s: number, lean: number) => {
      x.lineCap = 'round';
      x.strokeStyle = ln;
      x.lineWidth = 15 * s;
      x.beginPath();
      x.moveTo(X(a), Y(0));
      x.quadraticCurveTo(X(a + lean * 0.4), Y(0.3 * s), X(a + lean), Y(0.58 * s));
      x.stroke();
      x.strokeStyle = pc;
      x.lineWidth = 10 * s;
      x.stroke();
      x.strokeStyle = ln;
      x.lineWidth = 3;
      for (let k = 0; k < 7; k++) {
        const an = -PI + (k / 6) * PI + (rnd() - 0.5) * 0.2;
        x.save();
        x.translate(X(a + lean), Y(0.58 * s));
        x.rotate(an);
        x.beginPath();
        x.moveTo(0, 0);
        x.quadraticCurveTo(0.12 * u * s, -0.05 * u * s, 0.24 * u * s, 0.04 * u * s);
        x.quadraticCurveTo(0.12 * u * s, 0.03 * u * s, 0, 0);
        x.fill();
        x.stroke();
        x.restore();
      }
    };
  x.fillRect(0, b - 2, w, h - b + 2);
  switch (kind) {
    case 'barn':
      tree(-0.64, 1);
      tree(0.68, 1.2);
      poly([
        [-0.36, 0],
        [-0.36, 0.42],
        [0, 0.72],
        [0.36, 0.42],
        [0.36, 0],
      ]);
      win(-0.13, 0, 0.26, 0.34);
      x.beginPath();
      x.moveTo(X(-0.13), Y(0));
      x.lineTo(X(0.13), Y(0.34));
      x.moveTo(X(0.13), Y(0));
      x.lineTo(X(-0.13), Y(0.34));
      x.stroke();
      win(-0.06, 0.5, 0.12, 0.08);
      break;
    case 'villa':
      cyp(-0.8, 1.25);
      cyp(-0.69, 1);
      cyp(0.74, 1.3);
      poly([
        [-0.56, 0],
        [-0.56, 0.34],
        [-0.62, 0.34],
        [-0.5, 0.45],
        [0.5, 0.45],
        [0.62, 0.34],
        [0.56, 0.34],
        [0.56, 0],
      ]);
      for (let i = 0; i < 5; i++) win(-0.45 + i * 0.19, 0.02, 0.12, 0.24, true);
      break;
    case 'beach':
      palm(-0.55, 1.1, 0.12);
      palm(0.62, 0.95, -0.1);
      palm(0.42, 0.7, 0.08);
      for (let k = 0; k < 3; k++) {
        x.beginPath();
        x.moveTo(0, b);
        for (let i = 0; i <= 30; i++) {
          const t = i / 30;
          x.lineTo(t * w, Y(0.04 + k * 0.05 + Math.sin(t * 14 + k) * 0.012));
        }
        x.lineTo(w, b);
        x.fill();
        x.stroke();
      }
      break;
    case 'ballroom':
      rect(-0.58, 0, 1.16, 0.38);
      for (let i = 0; i < 6; i++) win(-0.5 + i * 0.18, 0.04, 0.08, 0.26, true);
      poly([
        [-0.62, 0.38],
        [0, 0.52],
        [0.62, 0.38],
      ]);
      x.beginPath();
      x.arc(X(0), Y(0.52), 0.2 * u, PI, 0);
      x.fill();
      x.stroke();
      rect(-0.03, 0.72, 0.06, 0.08);
      break;
    case 'conservatory':
      x.beginPath();
      x.moveTo(X(-0.5), Y(0));
      x.lineTo(X(-0.5), Y(0.25));
      x.ellipse(X(0), Y(0.25), 0.5 * u, 0.35 * u, 0, PI, 0);
      x.lineTo(X(0.5), Y(0));
      x.closePath();
      x.save();
      x.fillStyle = skyC;
      x.fill();
      x.restore();
      x.stroke();
      x.save();
      x.clip();
      x.strokeStyle = pc;
      x.lineWidth = 7;
      for (let i = -4; i <= 4; i++) {
        x.beginPath();
        x.moveTo(X(i * 0.12), Y(0));
        x.lineTo(X(i * 0.12), Y(0.7));
        x.stroke();
      }
      for (const c of [0.12, 0.25, 0.42]) {
        x.beginPath();
        x.moveTo(X(-0.6), Y(c));
        x.lineTo(X(0.6), Y(c));
        x.stroke();
      }
      x.restore();
      x.stroke();
      for (const a of [-0.3, 0.1, 0.34]) ell(a, 0.08, 0.08, 0.08);
      break;
    case 'vineyard':
      x.beginPath();
      x.moveTo(0, b);
      x.quadraticCurveTo(w * 0.3, Y(0.5), w * 0.6, Y(0.2));
      x.quadraticCurveTo(w * 0.8, Y(0.05), w, Y(0.25));
      x.lineTo(w, b);
      x.fill();
      x.stroke();
      x.setLineDash([6, 8]);
      for (let k = 0; k < 4; k++) {
        x.beginPath();
        x.moveTo(0, Y(0.05 + k * 0.07));
        x.quadraticCurveTo(w * 0.3, Y(0.42 - k * 0.06), w * 0.6, Y(0.16 - k * 0.02));
        x.stroke();
      }
      x.setLineDash([]);
      rect(0.25, 0.26, 0.22, 0.14);
      poly([
        [0.23, 0.4],
        [0.36, 0.5],
        [0.49, 0.4],
      ]);
      cyp(-0.62, 1);
      cyp(-0.5, 0.8);
      break;
    case 'woodland':
      for (const [a, s] of [
        [-0.7, 1.2],
        [-0.42, 0.9],
        [-0.18, 1.35],
        [0.12, 1],
        [0.4, 1.25],
        [0.7, 0.95],
      ])
        pine(a, s);
      break;
    case 'rooftop':
      seeded(21, () => {
        for (let i = 0; i < 11; i++) {
          const a = -0.8 + i * 0.15,
            hh = 0.2 + rnd() * 0.5;
          rect(a, 0, 0.13, hh);
          for (let r = 0; r < hh / 0.08 - 1; r++) for (let c = 0; c < 2; c++) if (rnd() < 0.6) win(a + 0.025 + c * 0.05, 0.04 + r * 0.08, 0.03, 0.04);
        }
      });
      break;
    case 'desert':
      x.beginPath();
      x.moveTo(0, b);
      x.quadraticCurveTo(w * 0.25, Y(0.3), w * 0.5, Y(0.08));
      x.quadraticCurveTo(w * 0.75, Y(0.25), w, Y(0.1));
      x.lineTo(w, b);
      x.fill();
      x.stroke();
      poly([
        [-0.34, 0],
        [-0.22, 0.3],
        [-0.1, 0.14],
        [0, 0.36],
        [0.12, 0.14],
        [0.24, 0.3],
        [0.36, 0],
      ]);
      win(-0.06, 0, 0.12, 0.16, true);
      palm(0.62, 0.9, -0.1);
      break;
    default:
      for (const a of [-0.62, 0.62]) ell(a, 0.1, 0.16, 0.1);
      for (let i = 0; i < 6; i++) rect(-0.3 + i * 0.12, 0, 0.02, 0.32);
      x.beginPath();
      x.ellipse(X(0), Y(0.32), 0.36 * u, 0.22 * u, 0, PI, 0);
      x.closePath();
      x.fill();
      x.stroke();
      rect(-0.36, 0.3, 0.72, 0.04);
      rect(-0.01, 0.54, 0.02, 0.08);
  }
}

export function chairsCard(x: X, w: number, h: number, p: Pal) {
  const pc = '#f8f2e7',
    ln = '#b3a085';
  x.lineWidth = 2.5;
  x.strokeStyle = ln;
  x.fillStyle = '#fffaf0';
  x.beginPath();
  x.moveTo(w * 0.46, 0 + h * 0.2);
  x.lineTo(w * 0.54, h * 0.2);
  x.lineTo(w * 0.62, h);
  x.lineTo(w * 0.38, h);
  x.closePath();
  x.fill();
  x.stroke();
  for (let r = 0; r < 3; r++) {
    const s = 0.55 + r * 0.25,
      y = h * (0.3 + r * 0.3),
      cw = h * 0.16 * s;
    for (const sd of [-1, 1])
      for (let j = 0; j < 4; j++) {
        const cx = w / 2 + sd * (w * 0.1 * s + j * cw * 1.45 + cw * 0.4);
        x.fillStyle = pc;
        x.fillRect(cx - cw / 2, y - cw * 1.25, cw, cw * 1.9);
        x.strokeRect(cx - cw / 2, y - cw * 1.25, cw, cw * 1.9);
        x.fillStyle = ln;
        for (let k = 1; k < 4; k++) x.fillRect(cx - cw / 2 + (k * cw) / 4 - 1, y - cw * 1.1, 2, cw * 0.8);
      }
  }
  for (const sd of [-1, 1]) flower(x, w / 2 + sd * w * 0.08, h * 0.95, h * 0.07, pick(p.b));
}
export function nightCard(x: X, w: number, h: number) {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#141b3a');
  g.addColorStop(1, '#2d3a6e');
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(0, h);
  x.lineTo(0, h * 0.22);
  for (let i = 0; i < 8; i++) x.quadraticCurveTo(((i + 0.5) / 8) * w, h * (i % 2 ? 0.0 : 0.12), ((i + 1) / 8) * w, h * 0.2);
  x.lineTo(w, h);
  x.closePath();
  x.fill();
  x.fillStyle = '#f4e7c6';
  x.beginPath();
  x.arc(w * 0.24, h * 0.38, h * 0.12, 0, 7);
  x.fill();
  x.fillStyle = '#1a2248';
  x.beginPath();
  x.arc(w * 0.24 + h * 0.06, h * 0.34, h * 0.11, 0, 7);
  x.fill();
  for (let i = 0; i < 46; i++) {
    const sx = rnd() * w,
      sy = h * (0.25 + rnd() * 0.6),
      r = 2 + rnd() * 5;
    x.fillStyle = rnd() < 0.3 ? '#f1d99a' : '#e8ecff';
    x.beginPath();
    x.moveTo(sx, sy - r * 2);
    x.lineTo(sx + r * 0.5, sy);
    x.lineTo(sx, sy + r * 2);
    x.lineTo(sx - r * 0.5, sy);
    x.fill();
    x.beginPath();
    x.moveTo(sx - r * 2, sy);
    x.lineTo(sx, sy + r * 0.5);
    x.lineTo(sx + r * 2, sy);
    x.lineTo(sx, sy - r * 0.5);
    x.fill();
  }
}
export function bankLow(x: X, w: number, h: number, p: Pal) {
  for (let i = 0; i < w / 10; i++) leafS(x, rnd() * w, h - rnd() * h * 0.12, h * (0.12 + rnd() * 0.12), -PI / 2 + (rnd() - 0.5) * 2.2, shade(p.g, (rnd() - 0.5) * 0.16));
  for (let i = 0; i < w / 40; i++) flower(x, rnd() * w, h - h * 0.1 - rnd() * h * 0.1, h * (0.06 + rnd() * 0.04), pick(p.b));
}
export function candlesCard(x: X, w: number, h: number, p: Pal) {
  for (let i = 0; i < 12; i++) {
    const cx = w * (0.06 + i * 0.08) + (rnd() - 0.5) * 8,
      ch = h * (0.25 + rnd() * 0.4),
      cw = h * 0.1;
    x.fillStyle = '#f8f1e2';
    x.fillRect(cx - cw / 2, h - ch, cw, ch);
    x.fillStyle = '#f1c264';
    x.beginPath();
    x.ellipse(cx, h - ch - cw * 0.7, cw * 0.28, cw * 0.6, 0, 0, 7);
    x.fill();
    x.fillStyle = '#fff3cf';
    x.beginPath();
    x.ellipse(cx, h - ch - cw * 0.6, cw * 0.12, cw * 0.3, 0, 0, 7);
    x.fill();
  }
  bankLow(x, w, h, p);
}
export function burstCard(x: X, w: number, h: number, col: string) {
  const cx = w / 2,
    cy = h * 0.34,
    r = Math.min(w * 0.45, h * 0.32);
  x.strokeStyle = col;
  x.fillStyle = col;
  x.lineCap = 'round';
  x.lineWidth = 7;
  x.beginPath();
  x.moveTo(cx, cy);
  x.lineTo(cx, h);
  x.stroke();
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * 6.283,
      l = r * (0.55 + (i % 2) * 0.45);
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(cx + Math.cos(a) * r * 0.18, cy + Math.sin(a) * r * 0.18);
    x.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l);
    x.stroke();
    x.beginPath();
    x.arc(cx + Math.cos(a) * (l + 9), cy + Math.sin(a) * (l + 9), 6, 0, 7);
    x.fill();
  }
  x.beginPath();
  x.arc(cx, cy, r * 0.14, 0, 7);
  x.fill();
}
export function bannerCard(x: X, w: number, h: number, p: Pal, text: string) {
  x.strokeStyle = '#8a7258';
  x.lineWidth = 4;
  const sag = h * 0.25,
    Y = (t: number) => h * 0.12 + sag * 4 * t * (1 - t);
  x.beginPath();
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    if (i) x.lineTo(t * w, Y(t));
    else x.moveTo(0, Y(0));
  }
  x.stroke();
  const n = text.length;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n,
      px = t * w,
      py = Y(t),
      pw = (w / n) * 0.84;
    x.fillStyle = i % 2 ? p.b[0] : '#f8f2e7';
    x.beginPath();
    x.moveTo(px - pw / 2, py);
    x.lineTo(px + pw / 2, py);
    x.lineTo(px, py + h * 0.62);
    x.closePath();
    x.fill();
    x.strokeStyle = 'rgba(120,90,60,.35)';
    x.lineWidth = 2;
    x.stroke();
    if (text[i] !== ' ') {
      x.fillStyle = INK;
      x.font = F(h * 0.34);
      x.textAlign = 'center';
      x.fillText(text[i], px, py + h * 0.34);
    }
  }
}
