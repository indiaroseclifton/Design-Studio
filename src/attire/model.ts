/*
 * Attire & colour board: the wedding party's outfits, saved on the design (`design.attire`), colour
 * schemes built from the event palette, named fashion colours and a harmony check.
 */

export type Garment = 'gown' | 'dress' | 'midi' | 'jumpsuit' | 'suit' | 'tuxedo' | 'waistcoat' | 'child';
export const GARMENTS: Record<Garment, string> = {
  gown: 'Gown',
  dress: 'Floor-length dress',
  midi: 'Midi dress',
  jumpsuit: 'Jumpsuit',
  suit: 'Suit',
  tuxedo: 'Tuxedo',
  waistcoat: 'Shirt & waistcoat',
  child: 'Child’s outfit',
};
export type Fabric = 'satin' | 'chiffon' | 'crepe' | 'velvet' | 'linen' | 'tweed' | 'sequin' | 'lace';
export const FABRICS: Record<Fabric, string> = { satin: 'Satin', chiffon: 'Chiffon', crepe: 'Crepe', velvet: 'Velvet', linen: 'Linen', tweed: 'Tweed', sequin: 'Sequin', lace: 'Lace' };

export interface Role {
  id: string;
  role: string;
  count: number;
  garment: Garment;
  fabric: Fabric;
  /** one colour, or one per person for mismatched groups */
  colours: string[];
}
export type Scheme = 'matching' | 'mismatched' | 'ombre' | 'neutral';
export const SCHEMES: Record<Scheme, { n: string; note: string }> = {
  matching: { n: 'Matching', note: 'Everyone in one palette colour' },
  mismatched: { n: 'Mismatched', note: 'Different shades, one palette' },
  ombre: { n: 'Ombré', note: 'Light to deep across the line' },
  neutral: { n: 'Neutrals', note: 'Champagne, taupe and grey' },
};
export interface AttirePlan {
  scheme: Scheme;
  roles: Role[];
  backdrop: 'venue' | 'linen' | 'plain';
  notes: string;
}

let _n = 0;
const rid = () => `r${Date.now().toString(36)}${(_n++).toString(36)}`;
export const newRole = (role: string, garment: Garment, count: number, colour: string, fabric: Fabric = 'crepe'): Role => ({ id: rid(), role, count, garment, fabric, colours: [colour] });

export function defaultAttire(pal: string[]): AttirePlan {
  return {
    scheme: 'matching',
    backdrop: 'venue',
    notes: '',
    roles: [
      newRole('Bride', 'gown', 1, '#fbf7ee', 'satin'),
      newRole('Groom', 'suit', 1, '#2a3346', 'crepe'),
      newRole('Bridesmaids', 'dress', 4, pal[1] ?? '#e89aa9', 'chiffon'),
      newRole('Groomsmen', 'suit', 4, '#5a5f66', 'crepe'),
      newRole('Flower girl', 'child', 1, pal[0] ?? '#f4c7cf', 'lace'),
    ],
  };
}

/** Colours per person for a group under a scheme. */
export function schemeColours(scheme: Scheme, pal: string[], n: number, base: string): string[] {
  const byLum = [...pal].sort((a, b) => lum(b) - lum(a));
  if (scheme === 'matching') return [base];
  if (scheme === 'mismatched') return Array.from({ length: n }, (_, i) => pal[i % pal.length]);
  if (scheme === 'ombre') {
    const deep = byLum[byLum.length - 1];
    return Array.from({ length: n }, (_, i) => mix(mix(deep, '#ffffff', 0.72), deep, n === 1 ? 0.5 : i / (n - 1)));
  }
  const neutrals = ['#d8c3a5', '#b7a58f', '#9a9a96', '#e7ddcf', '#8c7b6b'];
  return Array.from({ length: n }, (_, i) => neutrals[i % neutrals.length]);
}

/* ------------------------------------------------------------------ colour */

export function hexRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const lum = (h: string) => {
  const [r, g, b] = hexRgb(h);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
export function mix(a: string, b: string, t: number) {
  const A = hexRgb(a),
    B = hexRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function hsl(h: string) {
  const [r, g, b] = hexRgb(h).map((v) => v / 255);
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    l = (mx + mn) / 2,
    d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (d) hue = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (hue * 60 + 360) % 360, s, l };
}

const NAMED: Array<[string, string]> = [
  ['Ivory', '#fbf7ee'],
  ['Champagne', '#e8d6b3'],
  ['Blush', '#f4c7cf'],
  ['Dusty rose', '#c98f96'],
  ['Rose', '#e89aa9'],
  ['Coral', '#f08a73'],
  ['Peach', '#f7c6a3'],
  ['Terracotta', '#c0643e'],
  ['Rust', '#a4481f'],
  ['Mustard', '#d6a53a'],
  ['Marigold', '#f39a1e'],
  ['Butter', '#f3e3a0'],
  ['Sage', '#a9b89a'],
  ['Eucalyptus', '#7f9c8a'],
  ['Olive', '#6f7440'],
  ['Emerald', '#1f6b4a'],
  ['Forest', '#2f4a32'],
  ['Teal', '#2b6f73'],
  ['Dusty blue', '#9fb3c8'],
  ['Cornflower', '#7a9ad8'],
  ['Navy', '#23324d'],
  ['Midnight', '#1f2a44'],
  ['Lilac', '#c9b6e0'],
  ['Lavender', '#b8a6d9'],
  ['Mauve', '#a67f98'],
  ['Plum', '#5a2a4e'],
  ['Burgundy', '#6e1a2c'],
  ['Wine', '#7a1f35'],
  ['Crimson', '#9a1422'],
  ['Mocha', '#7a5a46'],
  ['Taupe', '#b7a58f'],
  ['Sand', '#d8c3a5'],
  ['Dove grey', '#b8b6b0'],
  ['Slate', '#5a5f66'],
  ['Charcoal', '#3a3a3e'],
  ['Black', '#1b1a1a'],
  ['White', '#ffffff'],
  ['Gold', '#c9a25a'],
  ['Silver', '#c0c4c8'],
];
/** Nearest named fashion colour (≈ when it isn't an exact match). */
export function colourName(hex: string) {
  const [r, g, b] = hexRgb(hex);
  let best = NAMED[0],
    bd = Infinity;
  for (const n of NAMED) {
    const [R, G, B] = hexRgb(n[1]);
    const d = (r - R) ** 2 * 0.3 + (g - G) ** 2 * 0.59 + (b - B) ** 2 * 0.11;
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return bd < 30 ? best[0] : `≈ ${best[0]}`;
}
export const FASHION = NAMED.map(([, h]) => h);

export type Harmony = 'palette' | 'complement' | 'neutral' | 'apart';
export const HARMONY: Record<Harmony, string> = { palette: 'In the palette', complement: 'Complements it', neutral: 'A neutral', apart: 'Stands apart' };
/** How an outfit colour sits with the event palette. */
export function harmony(hex: string, pal: string[]): Harmony {
  const c = hsl(hex);
  // Whites, greys and the deep classic suiting colours (navy, charcoal, black) go with anything.
  if (c.s < 0.18 || c.l > 0.92 || c.l < 0.28) return 'neutral';
  let near = 180;
  for (const p of pal) {
    const q = hsl(p);
    if (q.s < 0.12) continue;
    const d = Math.abs(((c.h - q.h + 540) % 360) - 180);
    near = Math.min(near, d);
  }
  if (near <= 28) return 'palette';
  if (near >= 150) return 'complement';
  return 'apart';
}
/** True when an outfit would melt into the backdrop in photos. */
export const blendsWith = (hex: string, backdrop: string) => Math.abs(lum(hex) - lum(backdrop)) < 0.08 && harmony(hex, [backdrop]) !== 'apart';

const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
export function sanitizeAttire(raw: unknown): AttirePlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const roles = Array.isArray(o.roles)
    ? (o.roles as Array<Record<string, unknown>>)
        .filter((r) => r && typeof r === 'object')
        .slice(0, 16)
        .map((r) => ({
          id: typeof r.id === 'string' ? r.id.slice(0, 40) : rid(),
          role: typeof r.role === 'string' ? r.role.slice(0, 40) : 'Guest',
          count: typeof r.count === 'number' ? Math.min(12, Math.max(1, Math.round(r.count))) : 1,
          garment: typeof r.garment === 'string' && r.garment in GARMENTS ? (r.garment as Garment) : 'dress',
          fabric: typeof r.fabric === 'string' && r.fabric in FABRICS ? (r.fabric as Fabric) : 'crepe',
          colours: Array.isArray(r.colours) && r.colours.every(isHex) && r.colours.length ? (r.colours as string[]).slice(0, 12) : ['#e89aa9'],
        }))
    : [];
  return {
    scheme: typeof o.scheme === 'string' && o.scheme in SCHEMES ? (o.scheme as Scheme) : 'matching',
    roles,
    backdrop: o.backdrop === 'linen' || o.backdrop === 'plain' ? o.backdrop : 'venue',
    notes: typeof o.notes === 'string' ? o.notes.slice(0, 2000) : '',
  };
}

/** "bridesmaids in blush and rose": the largest group and its colours, for the Storybook. */
export function attirePhrase(p: AttirePlan): string | undefined {
  const g = [...p.roles].filter((r) => r.count > 1).sort((a, b) => b.count - a.count)[0];
  if (!g) return undefined;
  const names = [...new Set(g.colours.map((c) => colourName(c).replace('≈ ', '').toLowerCase()))].slice(0, 3);
  const list = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
  return `${g.role.toLowerCase()} in ${list}`;
}
