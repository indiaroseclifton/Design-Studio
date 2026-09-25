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

/**
 * Wood boards: long planks in closely related tones (so a floor or wall reads as one timber, not a patchwork),
 * fine wavy grain, the odd knot, a soft bevel on each edge and thin joints. Tiles seamlessly in both directions.
 */
export function planks(cols: string[], o: { n?: number } = {}) {
  const n = o.n ?? 8;
  return (x: CanvasRenderingContext2D, w: number, h: number) => {
    const ph = h / n;
    const avg = new THREE.Color(0, 0, 0);
    for (const c of cols) avg.add(new THREE.Color(c));
    avg.multiplyScalar(1 / cols.length);
    const tone = () => '#' + new THREE.Color(jit(pick(cols), 0.035)).lerp(avg, 0.45).getHexString();
    for (let i = 0; i < n; i++) {
      const y = i * ph;
      const start = rnd() * w;
      let xo = start - w;
      while (xo < start) {
        const len = w * (0.55 + rnd() * 0.55);
        const base = tone();
        for (const off of [0, w]) {
          const X = xo + off;
          if (X > w || X + len < 0) continue;
          x.save();
          x.beginPath();
          x.rect(X, y, len, ph);
          x.clip();
          x.fillStyle = base;
          x.fillRect(X, y, len, ph);
          // Grain: many faint lines drifting along the board.
          const seedY = rnd() * 100;
          for (let k = 0; k < 16; k++) {
            x.globalAlpha = 0.05 + rnd() * 0.07;
            x.strokeStyle = rnd() < 0.6 ? '#1a0f08' : '#fff3e0';
            x.lineWidth = 0.6 + rnd() * 1.2;
            const y0 = y + ((k + 0.5) / 16) * ph + (rnd() - 0.5) * 2;
            x.beginPath();
            x.moveTo(X, y0);
            for (let s = 1; s <= 8; s++) x.lineTo(X + (len * s) / 8, y0 + Math.sin(seedY + s * 0.9 + k) * ph * 0.05);
            x.stroke();
          }
          // The occasional knot.
          if (rnd() < 0.25) {
            const kx = X + len * (0.2 + rnd() * 0.6),
              ky = y + ph * (0.3 + rnd() * 0.4),
              r = ph * (0.08 + rnd() * 0.08);
            for (let q = 3; q >= 1; q--) {
              x.globalAlpha = 0.12 * q;
              x.fillStyle = '#2a170b';
              x.beginPath();
              x.ellipse(kx, ky, r * q * 0.9, r * q * 0.45, 0, 0, Math.PI * 2);
              x.fill();
            }
          }
          // Bevel: a lit top edge, a shaded lower edge.
          const gr = x.createLinearGradient(0, y, 0, y + ph);
          gr.addColorStop(0, 'rgba(255,240,220,.10)');
          gr.addColorStop(0.12, 'rgba(255,240,220,0)');
          gr.addColorStop(0.85, 'rgba(0,0,0,0)');
          gr.addColorStop(1, 'rgba(0,0,0,.22)');
          x.globalAlpha = 1;
          x.fillStyle = gr;
          x.fillRect(X, y, len, ph);
          x.restore();
          x.fillStyle = 'rgba(20,10,5,.55)';
          x.fillRect(X + len - 1.5, y, 1.5, ph);
        }
        xo += len;
      }
      x.fillStyle = 'rgba(20,10,5,.6)';
      x.fillRect(0, y + ph - 1.5, w, 1.5);
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
