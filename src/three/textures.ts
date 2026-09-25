import * as THREE from 'three';
import { jit, pick, rnd, M } from './utils';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export function T(draw: Draw, rep: [number, number] = [1, 1], size = 512, rot = 0) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...rep);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (rot) {
    t.center.set(0.5, 0.5);
    t.rotation = rot;
  }
  return t;
}

export const tm = (tex: THREE.Texture, r = 0.85, m = 0) => M('#fff', r, m, { map: tex });

export function planks(cols: string[], o: { n?: number } = {}) {
  const n = o.n ?? 8;
  return (x: CanvasRenderingContext2D, w: number, h: number) => {
    const ph = h / n;
    for (let i = 0; i < n; i++) {
      let xo = -rnd() * w * 0.3;
      while (xo < w) {
        const len = w * (0.3 + rnd() * 0.45);
        x.fillStyle = jit(pick(cols), 0.05);
        x.fillRect(xo, i * ph, len, ph);
        x.globalAlpha = 0.1;
        for (let k = 0; k < 7; k++) {
          x.strokeStyle = rnd() < 0.5 ? '#000' : '#fff';
          x.lineWidth = 1 + rnd();
          x.beginPath();
          const y0 = i * ph + rnd() * ph;
          x.moveTo(xo, y0);
          x.bezierCurveTo(xo + len * 0.3, y0 + (rnd() - 0.5) * 8, xo + len * 0.6, y0 + (rnd() - 0.5) * 8, xo + len, y0);
          x.stroke();
        }
        x.globalAlpha = 1;
        x.fillStyle = 'rgba(20,10,5,.7)';
        x.fillRect(xo + len - 2, i * ph, 2, ph);
        xo += len;
      }
      x.fillStyle = 'rgba(20,10,5,.75)';
      x.fillRect(0, i * ph + ph - 2, w, 2);
    }
  };
}

export function tiles(
  cols: string[],
  n: number,
  grout: string,
  o: { gap?: number; check?: boolean; v?: number; veins?: boolean } = {},
) {
  return (x: CanvasRenderingContext2D, w: number, h: number) => {
    x.fillStyle = grout;
    x.fillRect(0, 0, w, h);
    const s = w / n,
      g = o.gap ?? 3;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        x.fillStyle = o.check ? jit(cols[(i + j) % 2], 0.03) : jit(pick(cols), o.v ?? 0.06);
        x.fillRect(i * s + g / 2, j * s + g / 2, s - g, s - g);
      }
    if (o.veins) {
      x.globalAlpha = 0.18;
      x.strokeStyle = '#6d6456';
      for (let k = 0; k < 40; k++) {
        x.lineWidth = 0.5 + rnd() * 1.5;
        x.beginPath();
        let px = rnd() * w,
          py = rnd() * h;
        x.moveTo(px, py);
        for (let s2 = 0; s2 < 8; s2++) {
          px += (rnd() - 0.3) * 40;
          py += (rnd() - 0.5) * 40;
          x.lineTo(px, py);
        }
        x.stroke();
      }
      x.globalAlpha = 1;
    }
  };
}

export function noise(base: string, cols: string[], n = 6000, sz = 2) {
  return (x: CanvasRenderingContext2D, w: number, h: number) => {
    x.fillStyle = base;
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      x.fillStyle = pick(cols);
      x.globalAlpha = 0.25 + rnd() * 0.5;
      x.fillRect(rnd() * w, rnd() * h, sz * (0.5 + rnd()), sz * (0.5 + rnd()));
    }
    x.globalAlpha = 1;
  };
}

export function bricks(cols: string[], mortar: string) {
  return (x: CanvasRenderingContext2D, w: number, h: number) => {
    x.fillStyle = mortar;
    x.fillRect(0, 0, w, h);
    const rh = h / 16,
      bw = w / 6;
    for (let r = 0; r < 16; r++)
      for (let i = -1; i < 7; i++) {
        x.fillStyle = jit(pick(cols), 0.08);
        x.fillRect(i * bw + (r % 2) * (bw / 2) + 2, r * rh + 2, bw - 4, rh - 4);
      }
  };
}

export function kilim(c: string[]) {
  return (x: CanvasRenderingContext2D, w: number, h: number) => {
    x.fillStyle = c[0];
    x.fillRect(0, 0, w, h);
    x.fillStyle = c[1];
    [0.06, 0.13, 0.84, 0.91].forEach((b) => x.fillRect(0, b * h, w, h * 0.035));
    x.fillRect(0, 0.3 * h, w, 0.4 * h);
    for (let i = 0; i < 5; i++) {
      const cx = ((i + 0.5) * w) / 5,
        cy = h / 2,
        r = w / 12;
      x.fillStyle = c[2];
      x.beginPath();
      x.moveTo(cx, cy - r * 1.7);
      x.lineTo(cx + r, cy);
      x.lineTo(cx, cy + r * 1.7);
      x.lineTo(cx - r, cy);
      x.fill();
      x.fillStyle = c[3];
      x.beginPath();
      x.moveTo(cx, cy - r * 0.8);
      x.lineTo(cx + r * 0.45, cy);
      x.lineTo(cx, cy + r * 0.8);
      x.lineTo(cx - r * 0.45, cy);
      x.fill();
    }
    x.fillStyle = c[3];
    for (let i = 0; i < 16; i++) {
      for (const y of [0.2, 0.77]) {
        const cx = ((i + 0.5) * w) / 16,
          cy = y * h;
        x.beginPath();
        x.moveTo(cx, cy - 10);
        x.lineTo(cx + 8, cy);
        x.lineTo(cx, cy + 10);
        x.lineTo(cx - 8, cy);
        x.fill();
      }
    }
    x.globalAlpha = 0.08;
    for (let i = 0; i < 3000; i++) {
      x.fillStyle = rnd() < 0.5 ? '#000' : '#fff';
      x.fillRect(rnd() * w, rnd() * h, 2, 1);
    }
    x.globalAlpha = 1;
  };
}

/** Lit and dark office windows, for skylines. */
export function winTex() {
  return (x: CanvasRenderingContext2D, w: number, h: number) => {
    x.fillStyle = '#000';
    x.fillRect(0, 0, w, h);
    const n = 16,
      s = w / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        if (rnd() < 0.38) {
          x.fillStyle = pick(['#ffd79a', '#ffe8c2', '#cfe0ff', '#ffc57a']);
          x.globalAlpha = 0.4 + rnd() * 0.6;
        } else {
          x.fillStyle = '#0b0d12';
          x.globalAlpha = 1;
        }
        x.fillRect(i * s + 3, j * s + 4, s - 6, s - 8);
      }
    x.globalAlpha = 1;
  };
}
