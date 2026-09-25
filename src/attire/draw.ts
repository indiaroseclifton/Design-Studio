import { FABRICS, colourName, mix, type AttirePlan, type Fabric, type Garment, type Role } from './model';

/*
 * The colour board: the wedding party as a fashion-illustration line-up against the venue's colours,
 * beside a colour story of paint-chip swatches (palette, linen, stationery, outfits).
 */

type X = CanvasRenderingContext2D;
export interface BoardCtx {
  plan: AttirePlan;
  pal: { b: string[]; g: string; f: string; name: string };
  sky: [string, string, string];
  linen: string;
  paper?: { c: string; n: string };
  foil?: { stops: string[]; n: string };
  title: string;
}

function prng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rgba = (h: string, a: number) => {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const SKIN = ['#f1c9a8', '#d9a47e', '#b07a55', '#7a4f33', '#e8bd98'];
const HAIR = ['#3a2a1e', '#6a4a2a', '#c9a066', '#1e1812', '#8a5a3a'];

interface Figure {
  role: Role;
  colour: string;
  i: number;
  child: boolean;
}

/** Garment fill with light from the left, plus a fabric finish. */
function garmentFill(x: X, colour: string, fabric: Fabric, bx: number, bw: number) {
  const g = x.createLinearGradient(bx, 0, bx + bw, 0);
  const hi = mix(colour, '#ffffff', fabric === 'velvet' ? 0.08 : 0.22),
    lo = mix(colour, '#000000', fabric === 'velvet' ? 0.45 : 0.25);
  g.addColorStop(0, hi);
  if (fabric === 'satin') {
    g.addColorStop(0.3, mix(colour, '#ffffff', 0.42));
    g.addColorStop(0.42, colour);
  } else g.addColorStop(0.45, colour);
  g.addColorStop(1, lo);
  return g;
}

function finish(x: X, fabric: Fabric, bx: number, by: number, bw: number, bh: number, colour: string, rng: () => number) {
  x.save();
  x.clip();
  if (fabric === 'sequin') {
    for (let i = 0; i < (bw * bh) / 18; i++) {
      x.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,.55)' : rgba(mix(colour, '#000000', 0.3), 0.5);
      x.fillRect(bx + rng() * bw, by + rng() * bh, 1.4, 1.4);
    }
  } else if (fabric === 'tweed' || fabric === 'linen') {
    for (let i = 0; i < (bw * bh) / 10; i++) {
      x.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)';
      x.fillRect(bx + rng() * bw, by + rng() * bh, fabric === 'tweed' ? 2 : 3, 1);
    }
  } else if (fabric === 'lace') {
    x.strokeStyle = 'rgba(255,255,255,.35)';
    x.lineWidth = 0.6;
    for (let yy = by; yy < by + bh; yy += 5)
      for (let xx = bx + ((yy / 5) % 2) * 2.5; xx < bx + bw; xx += 5) {
        x.beginPath();
        x.arc(xx, yy, 1.4, 0, 7);
        x.stroke();
      }
  } else if (fabric === 'chiffon') {
    x.strokeStyle = rgba(mix(colour, '#ffffff', 0.5), 0.25);
    x.lineWidth = 1;
    for (let k = 0; k < 7; k++) {
      const xx = bx + (k / 6) * bw;
      x.beginPath();
      x.moveTo(xx, by + bh * 0.1);
      x.quadraticCurveTo(xx + bw * 0.04, by + bh * 0.6, xx - bw * 0.02, by + bh);
      x.stroke();
    }
  }
  x.restore();
}

/** One figure, standing on (cx, floor), `h` tall. */
function drawFigure(x: X, f: Figure, cx: number, floor: number, h: number, rng: () => number) {
  const u = h / 100;
  const garment: Garment = f.child ? 'child' : f.role.garment;
  const skin = SKIN[f.i % SKIN.length],
    hair = HAIR[(f.i * 3) % HAIR.length];
  const top = floor - h;
  const headR = 5.6 * u;
  const hy = top + headR;
  const shoulderY = top + 15 * u,
    waistY = top + 38 * u,
    hipY = top + 47 * u;
  const sw = 12 * u; // half shoulder width
  const dressy = garment === 'gown' || garment === 'dress' || garment === 'midi' || garment === 'jumpsuit' || garment === 'child';
  x.save();
  // Ground shadow.
  x.fillStyle = 'rgba(30,20,10,.18)';
  x.beginPath();
  x.ellipse(cx, floor, 16 * u, 2.4 * u, 0, 0, 7);
  x.fill();
  // Arms (skin or sleeve), behind the body.
  const sleeve = dressy ? skin : garment === 'waistcoat' ? '#f4f1ea' : mix(f.colour, '#000000', 0.1);
  x.strokeStyle = sleeve;
  x.lineCap = 'round';
  x.lineWidth = 4.2 * u;
  for (const s of [-1, 1]) {
    x.beginPath();
    x.moveTo(cx + s * (sw - 2 * u), shoulderY + 2 * u);
    x.quadraticCurveTo(cx + s * (sw + 2 * u), waistY - 6 * u, cx + s * (sw - 1 * u), hipY + 2 * u);
    x.stroke();
  }
  x.fillStyle = skin;
  for (const s of [-1, 1]) {
    x.beginPath();
    x.arc(cx + s * (sw - 1 * u), hipY + 3 * u, 2.2 * u, 0, 7);
    x.fill();
  }
  // Legs for anything that isn't floor-length.
  const legTop = garment === 'midi' ? top + 80 * u : garment === 'child' ? top + 70 * u : hipY;
  if (garment !== 'gown' && garment !== 'dress') {
    const trousers = garment === 'suit' || garment === 'tuxedo' || garment === 'waistcoat' || garment === 'jumpsuit';
    x.fillStyle = trousers ? garmentFill(x, f.colour, f.role.fabric, cx - sw, sw * 2) : skin;
    for (const s of [-1, 1]) {
      x.beginPath();
      const w0 = trousers ? (garment === 'jumpsuit' ? 6.5 : 5.2) * u : 2.4 * u;
      x.moveTo(cx + s * 0.6 * u, legTop);
      x.lineTo(cx + s * (0.6 * u + w0 * 1.7), legTop);
      x.lineTo(cx + s * (1.2 * u + w0 * (garment === 'jumpsuit' ? 1.9 : 1.2)), floor - 1.2 * u);
      x.lineTo(cx + s * 0.8 * u, floor - 1.2 * u);
      x.closePath();
      x.fill();
    }
    // Shoes.
    x.fillStyle = trousers ? '#1c1a18' : mix(f.colour, '#2a1a14', 0.5);
    for (const s of [-1, 1]) {
      x.beginPath();
      x.ellipse(cx + s * 4.6 * u, floor - 0.8 * u, 3.6 * u, 1.4 * u, 0, 0, 7);
      x.fill();
    }
  }
  // Body garment.
  const path = new Path2D();
  if (garment === 'gown' || garment === 'dress') {
    const flare = garment === 'gown' ? 22 * u : 13 * u;
    path.moveTo(cx - sw * 0.72, shoulderY);
    path.lineTo(cx + sw * 0.72, shoulderY);
    path.lineTo(cx + 6.4 * u, waistY);
    path.quadraticCurveTo(cx + 9 * u, hipY + 12 * u, cx + flare, floor);
    if (garment === 'gown') path.quadraticCurveTo(cx + flare + 8 * u, floor + 1 * u, cx + flare + 12 * u, floor + 2 * u);
    path.lineTo(cx - flare, floor);
    path.quadraticCurveTo(cx - 9 * u, hipY + 12 * u, cx - 6.4 * u, waistY);
    path.closePath();
  } else if (garment === 'midi' || garment === 'child') {
    const hem = garment === 'midi' ? top + 80 * u : top + 70 * u;
    path.moveTo(cx - sw * 0.7, shoulderY);
    path.lineTo(cx + sw * 0.7, shoulderY);
    path.lineTo(cx + 6 * u, waistY);
    path.quadraticCurveTo(cx + 10 * u, hipY + 6 * u, cx + 14 * u, hem);
    path.lineTo(cx - 14 * u, hem);
    path.quadraticCurveTo(cx - 10 * u, hipY + 6 * u, cx - 6 * u, waistY);
    path.closePath();
  } else if (garment === 'jumpsuit') {
    path.moveTo(cx - sw * 0.7, shoulderY);
    path.lineTo(cx + sw * 0.7, shoulderY);
    path.lineTo(cx + 6.4 * u, waistY);
    path.lineTo(cx + 9 * u, hipY);
    path.lineTo(cx - 9 * u, hipY);
    path.lineTo(cx - 6.4 * u, waistY);
    path.closePath();
  } else {
    // Jacket (suit, tuxedo) or waistcoat over a shirt.
    const hem = garment === 'waistcoat' ? waistY + 6 * u : hipY + 4 * u;
    path.moveTo(cx - sw, shoulderY);
    path.lineTo(cx + sw, shoulderY);
    path.lineTo(cx + 10 * u, hem);
    path.lineTo(cx - 10 * u, hem);
    path.closePath();
  }
  if (garment === 'waistcoat') {
    // Shirt under the waistcoat.
    x.fillStyle = '#f4f1ea';
    x.beginPath();
    x.moveTo(cx - sw, shoulderY);
    x.lineTo(cx + sw, shoulderY);
    x.lineTo(cx + 10 * u, hipY);
    x.lineTo(cx - 10 * u, hipY);
    x.closePath();
    x.fill();
  }
  x.fillStyle = garmentFill(x, f.colour, f.role.fabric, cx - sw * 1.4, sw * 2.8);
  x.fill(path);
  x.save();
  x.beginPath();
  // A clip path for the fabric finish.
  x.clip(path);
  finish(x, f.role.fabric, cx - 25 * u, shoulderY, 50 * u, floor - shoulderY, f.colour, rng);
  x.restore();
  // Details.
  if (garment === 'suit' || garment === 'tuxedo' || garment === 'waistcoat') {
    x.fillStyle = '#f4f1ea';
    x.beginPath();
    x.moveTo(cx - 3 * u, shoulderY);
    x.lineTo(cx + 3 * u, shoulderY);
    x.lineTo(cx, shoulderY + 12 * u);
    x.closePath();
    x.fill();
    const tie = garment === 'tuxedo' ? '#141414' : mix(f.colour, '#000000', 0.35);
    x.fillStyle = tie;
    if (garment === 'tuxedo') {
      x.beginPath();
      x.ellipse(cx - 1.6 * u, shoulderY + 2 * u, 1.8 * u, 1 * u, 0, 0, 7);
      x.ellipse(cx + 1.6 * u, shoulderY + 2 * u, 1.8 * u, 1 * u, 0, 0, 7);
      x.fill();
      // Satin lapels.
      x.fillStyle = mix(f.colour, '#ffffff', 0.12);
      for (const s of [-1, 1]) {
        x.beginPath();
        x.moveTo(cx + s * 3 * u, shoulderY);
        x.lineTo(cx + s * 7 * u, shoulderY + 1 * u);
        x.lineTo(cx + s * 0.6 * u, shoulderY + 13 * u);
        x.closePath();
        x.fill();
      }
    } else {
      x.beginPath();
      x.moveTo(cx - 0.9 * u, shoulderY + 1 * u);
      x.lineTo(cx + 0.9 * u, shoulderY + 1 * u);
      x.lineTo(cx + 1.3 * u, shoulderY + 10 * u);
      x.lineTo(cx, shoulderY + 11.5 * u);
      x.lineTo(cx - 1.3 * u, shoulderY + 10 * u);
      x.closePath();
      x.fill();
    }
  } else if (garment !== 'child') {
    // Waist sash.
    x.fillStyle = rgba(mix(f.colour, '#ffffff', 0.35), 0.55);
    x.fillRect(cx - 6.6 * u, waistY - 1.4 * u, 13.2 * u, 2.2 * u);
  }
  // Neck and head.
  x.fillStyle = skin;
  x.fillRect(cx - 1.6 * u, top + 9 * u, 3.2 * u, shoulderY - top - 8 * u);
  x.beginPath();
  x.ellipse(cx, hy, headR * 0.82, headR, 0, 0, 7);
  x.fill();
  x.fillStyle = hair;
  x.beginPath();
  if (dressy && garment !== 'child') {
    x.ellipse(cx, hy - headR * 0.35, headR * 0.95, headR * 0.8, 0, Math.PI, 0);
    x.ellipse(cx + headR * 0.55, hy - headR * 0.2, headR * 0.5, headR * 0.5, 0, 0, 7);
  } else x.ellipse(cx, hy - headR * 0.45, headR * 0.86, headR * 0.62, 0, Math.PI, 0);
  x.fill();
  if (f.role.garment === 'gown' && !f.child) {
    // A veil.
    x.fillStyle = 'rgba(255,255,255,.28)';
    x.beginPath();
    x.moveTo(cx + headR * 0.3, hy - headR);
    x.quadraticCurveTo(cx + 16 * u, top + 40 * u, cx + 12 * u, top + 75 * u);
    x.lineTo(cx + 4 * u, top + 70 * u);
    x.quadraticCurveTo(cx + 6 * u, top + 30 * u, cx - headR * 0.2, hy - headR * 0.9);
    x.fill();
  }
  x.restore();
}

function swatchChip(x: X, bx: number, by: number, w: number, colour: string, name: string, sub: string) {
  x.save();
  x.shadowColor = 'rgba(40,25,10,.22)';
  x.shadowBlur = 8;
  x.shadowOffsetY = 2;
  x.fillStyle = '#fbf8f2';
  x.fillRect(bx, by, w, w * 1.32);
  x.shadowColor = 'transparent';
  x.fillStyle = colour;
  x.fillRect(bx + w * 0.06, by + w * 0.06, w * 0.88, w * 0.88);
  x.fillStyle = '#3b3129';
  x.font = `500 ${Math.max(9, w * 0.12)}px Jost, sans-serif`;
  x.textAlign = 'left';
  x.fillText(name, bx + w * 0.08, by + w * 1.08, w * 0.86);
  x.fillStyle = '#8a7a6a';
  x.font = `400 ${Math.max(8, w * 0.1)}px Jost, sans-serif`;
  x.fillText(sub, bx + w * 0.08, by + w * 1.22, w * 0.86);
  x.restore();
}

/** The whole board into W × H. */
export function drawBoard(x: X, W: number, H: number, c: BoardCtx) {
  const rng = prng(7);
  const { plan, pal } = c;
  // Backdrop.
  if (plan.backdrop === 'venue') {
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, mix(c.sky[0], '#ffffff', 0.35));
    g.addColorStop(0.62, mix(c.sky[1], '#ffffff', 0.25));
    g.addColorStop(1, mix(c.sky[2], '#ffffff', 0.3));
    x.fillStyle = g;
  } else x.fillStyle = plan.backdrop === 'linen' ? mix(c.linen, '#ffffff', 0.2) : '#f3eee6';
  x.fillRect(0, 0, W, H);
  if (plan.backdrop === 'linen') {
    x.globalAlpha = 0.06;
    for (let i = 0; i < H; i += 3) {
      x.fillStyle = i % 6 ? '#000' : '#fff';
      x.fillRect(0, i, W, 1);
    }
    x.globalAlpha = 1;
  }
  const split = W * 0.62;
  // Soft floor under the line-up.
  const floorY = H * 0.86;
  const fg = x.createLinearGradient(0, floorY - H * 0.08, 0, H);
  fg.addColorStop(0, 'rgba(255,255,255,0)');
  fg.addColorStop(1, 'rgba(255,255,255,.35)');
  x.fillStyle = fg;
  x.fillRect(0, floorY - H * 0.08, split, H);

  // The line-up: dresses to the left, the couple in the middle, suits to the right, children at the ends.
  const figs: Figure[] = [];
  let k = 0;
  plan.roles.forEach((role) => {
    for (let i = 0; i < role.count; i++) figs.push({ role, colour: role.colours[i % role.colours.length], i: k++, child: role.garment === 'child' });
  });
  const isCouple = (f: Figure) => f.role.count === 1 && /bride|groom|partner|couple/i.test(f.role.role);
  const dressy = (f: Figure) => ['gown', 'dress', 'midi', 'jumpsuit'].includes(f.role.garment);
  const couple = figs.filter(isCouple);
  const kids = figs.filter((f) => f.child && !isCouple(f));
  const left = figs.filter((f) => !isCouple(f) && !f.child && dressy(f));
  const right = figs.filter((f) => !isCouple(f) && !f.child && !dressy(f));
  const row = [...kids.slice(0, Math.ceil(kids.length / 2)), ...left, ...couple, ...right, ...kids.slice(Math.ceil(kids.length / 2))].slice(0, 18);
  const hidden = figs.length - row.length;
  // As tall as the space allows, with neighbours overlapping slightly when the party is large.
  const gap = Math.min(H * 0.24, (split * 0.9) / Math.max(1, row.length));
  const h = Math.min(H * 0.66, gap / 0.3);
  const x0 = split / 2 - ((row.length - 1) * gap) / 2;
  row.forEach((f, i) => drawFigure(x, f, x0 + i * gap, floorY + (i % 2) * h * 0.02, f.child ? h * 0.62 : isCouple(f) ? h * 1.02 : h, rng));
  if (hidden > 0) {
    x.fillStyle = 'rgba(40,30,20,.6)';
    x.font = `500 ${H * 0.025}px Jost, sans-serif`;
    x.textAlign = 'center';
    x.fillText(`and ${hidden} more`, split / 2, H * 0.96);
  }

  // A title over the line-up.
  x.save();
  x.fillStyle = 'rgba(40,30,20,.78)';
  x.textAlign = 'left';
  x.font = `italic 500 ${H * 0.075}px "Cormorant Garamond", Georgia, serif`;
  x.fillText('The wedding party', W * 0.04, H * 0.14);
  x.fillStyle = 'rgba(40,30,20,.55)';
  x.font = `500 ${H * 0.021}px Jost, sans-serif`;
  x.fillText(`${figs.length} people · ${plan.roles.map((r) => r.role).slice(0, 4).join(', ')}${plan.roles.length > 4 ? '…' : ''}`, W * 0.042, H * 0.19);
  x.restore();

  // Colour story panel.
  x.save();
  x.fillStyle = 'rgba(251,248,242,.88)';
  x.shadowColor = 'rgba(40,25,10,.2)';
  x.shadowBlur = 20;
  x.fillRect(split + W * 0.02, H * 0.05, W - split - W * 0.04, H * 0.9);
  x.restore();
  const px = split + W * 0.045,
    pw = W - split - W * 0.09;
  let y = H * 0.12;
  x.fillStyle = '#3b3129';
  x.textAlign = 'left';
  x.font = `italic 500 ${H * 0.055}px "Cormorant Garamond", Georgia, serif`;
  x.fillText('Colour story', px, y);
  y += H * 0.03;
  x.fillStyle = '#8a7a6a';
  x.font = `500 ${H * 0.02}px Jost, sans-serif`;
  x.fillText(c.title.toUpperCase(), px, y + H * 0.01);
  y += H * 0.05;
  const cols = 4;
  const sw = (pw - (cols - 1) * pw * 0.04) / cols;
  const put = (items: Array<[string, string, string]>, label: string) => {
    x.fillStyle = '#8a7a6a';
    x.font = `600 ${H * 0.018}px Jost, sans-serif`;
    x.fillText(label.toUpperCase(), px, y);
    y += H * 0.02;
    items.forEach(([col, name, sub], i) => {
      const cx = px + (i % cols) * (sw + pw * 0.04),
        cy = y + Math.floor(i / cols) * (sw * 1.32 + H * 0.015);
      swatchChip(x, cx, cy, sw, col, name, sub);
    });
    y += Math.ceil(items.length / cols) * (sw * 1.32 + H * 0.015) + H * 0.02;
  };
  const outfits: Array<[string, string, string]> = [];
  const seen = new Set<string>();
  for (const r of plan.roles)
    for (const col of r.colours) {
      if (seen.has(col + r.role)) continue;
      seen.add(col + r.role);
      outfits.push([col, colourName(col).replace('≈ ', ''), `${r.role} · ${FABRICS[r.fabric]}`]);
    }
  put(outfits.slice(0, 8), 'The wedding party');
  const palette: Array<[string, string, string]> = [...pal.b.slice(0, 5).map((b) => [b, colourName(b).replace('≈ ', ''), 'Flowers'] as [string, string, string]), [pal.g, colourName(pal.g).replace('≈ ', ''), 'Greenery']];
  put(palette.slice(0, 4), `${pal.name} palette`);
  const extras: Array<[string, string, string]> = [[c.linen, colourName(c.linen).replace('≈ ', ''), 'Table linen']];
  if (c.paper) extras.push([c.paper.c, c.paper.n, 'Stationery']);
  if (c.foil && c.foil.stops.length) extras.push([c.foil.stops[2], c.foil.n, 'Foil']);
  if (y < H * 0.86) put(extras, 'Setting');
}
