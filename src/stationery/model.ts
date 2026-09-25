/*
 * Stationery Studio: the suite's data model, style vocabularies, wording helpers and quantities.
 * A suite is saved on the design (`design.stationery`), so it travels with saved designs, exports and
 * share links, and the 3D scene's place cards, table numbers, menus and signs can show it.
 */

export type PieceKind = 'savethedate' | 'invitation' | 'rsvp' | 'details' | 'menu' | 'placecard' | 'tablenum' | 'welcome' | 'program' | 'seating' | 'favour' | 'thankyou';
export type ThemeId = 'garden' | 'classic' | 'deco' | 'minimal' | 'rustic' | 'celestial' | 'wreath';
export type PaperId = 'cotton' | 'ivory' | 'white' | 'kraft' | 'blush' | 'sage' | 'navy' | 'black';
export type FoilId = 'none' | 'gold' | 'rosegold' | 'silver' | 'copper';
export type TypeId = 'romantic' | 'classic' | 'modern' | 'deco' | 'whimsical';
export type EdgeId = 'straight' | 'rounded' | 'deckle' | 'arch';
export type OrnamentId = 'florals' | 'greenery' | 'wreath' | 'deco' | 'rules' | 'stars' | 'none';

export interface PieceDef {
  n: string;
  note: string;
  /** trim size in mm, width × height */
  mm: [number, number];
  /** printed folded (place cards are tent cards: the face is the lower half of a sheet twice as tall) */
  fold?: boolean;
  /** a big-format sign: printed alone at lower resolution */
  big?: boolean;
  /** indicative print price per piece */
  price: number;
}

export const PIECES: Record<PieceKind, PieceDef> = {
  savethedate: { n: 'Save the date', note: 'Postcard, sent months ahead', mm: [148, 105], price: 1.6 },
  invitation: { n: 'Invitation', note: '5 × 7 in, the main card', mm: [127, 178], price: 2.8 },
  rsvp: { n: 'RSVP card', note: 'Reply card with choices', mm: [127, 89], price: 1.1 },
  details: { n: 'Details card', note: 'Timings, dress code, website', mm: [127, 178], price: 1.4 },
  menu: { n: 'Menu', note: 'One per place, DL size', mm: [99, 210], price: 1.9 },
  placecard: { n: 'Place cards', note: 'Folded tent cards, one per guest', mm: [90, 55], fold: true, price: 0.9 },
  tablenum: { n: 'Table numbers', note: 'One per table, for a stand', mm: [100, 140], price: 3.5 },
  welcome: { n: 'Welcome sign', note: 'A1 board for the easel', mm: [594, 841], big: true, price: 65 },
  program: { n: 'Order of service', note: 'The ceremony, running order', mm: [127, 178], price: 1.5 },
  seating: { n: 'Seating chart', note: '18 × 24 in board', mm: [457, 610], big: true, price: 85 },
  favour: { n: 'Favour tags', note: 'Small tags for favours', mm: [50, 90], price: 0.5 },
  thankyou: { n: 'Thank-you cards', note: 'Sent after the day', mm: [148, 105], price: 1.4 },
};
export const PIECE_ORDER: PieceKind[] = ['savethedate', 'invitation', 'rsvp', 'details', 'program', 'menu', 'placecard', 'tablenum', 'welcome', 'seating', 'favour', 'thankyou'];

export const PAPERS: Record<PaperId, { n: string; c: string; ink: string; soft: string; tex: 'cotton' | 'smooth' | 'kraft' }> = {
  cotton: { n: 'Cotton rag', c: '#fbf8f2', ink: '#3b3129', soft: '#8a7a6a', tex: 'cotton' },
  ivory: { n: 'Ivory', c: '#f7f0e0', ink: '#3b3027', soft: '#8c7b66', tex: 'smooth' },
  white: { n: 'Bright white', c: '#ffffff', ink: '#222222', soft: '#8a8a8a', tex: 'smooth' },
  kraft: { n: 'Kraft', c: '#c8a57a', ink: '#3a2a1c', soft: '#5e4630', tex: 'kraft' },
  blush: { n: 'Blush', c: '#f6e1dd', ink: '#5a3a3a', soft: '#9a7470', tex: 'cotton' },
  sage: { n: 'Sage', c: '#dfe5d6', ink: '#35432f', soft: '#6f7d66', tex: 'cotton' },
  navy: { n: 'Midnight', c: '#1f2a44', ink: '#f2ecde', soft: '#aab2c4', tex: 'smooth' },
  black: { n: 'Black', c: '#1b1a1a', ink: '#efe8da', soft: '#9d968a', tex: 'smooth' },
};

export const FOILS: Record<FoilId, { n: string; stops: string[] }> = {
  none: { n: 'No foil', stops: [] },
  gold: { n: 'Gold', stops: ['#9c7231', '#f1d99a', '#c99c4a', '#f6e3a9', '#9c7231'] },
  rosegold: { n: 'Rose gold', stops: ['#a8665a', '#f4c8b8', '#c98a78', '#f7d6c9', '#a8665a'] },
  silver: { n: 'Silver', stops: ['#8d9196', '#f2f4f6', '#b5b9be', '#ffffff', '#8d9196'] },
  copper: { n: 'Copper', stops: ['#8a4b2a', '#e9a57a', '#b86a42', '#f0b890', '#8a4b2a'] },
};

export interface FontSpec {
  family: string;
  style?: 'italic';
  weight?: number;
  /** a script face: never set in capitals or letter-spaced */
  script?: boolean;
}
export const TYPES: Record<TypeId, { n: string; head: FontSpec; body: FontSpec; caps: FontSpec }> = {
  romantic: { n: 'Romantic script', head: { family: 'Pinyon Script', script: true }, body: { family: 'Cormorant Garamond', weight: 500 }, caps: { family: 'Cormorant Garamond', weight: 600 } },
  classic: { n: 'Classic serif', head: { family: 'Playfair Display', style: 'italic', weight: 400 }, body: { family: 'Cormorant Garamond', weight: 500 }, caps: { family: 'Cormorant Garamond', weight: 600 } },
  modern: { n: 'Modern', head: { family: 'Italiana', weight: 400 }, body: { family: 'Jost', weight: 400 }, caps: { family: 'Jost', weight: 500 } },
  deco: { n: 'Art deco', head: { family: 'Poiret One', weight: 400 }, body: { family: 'Jost', weight: 400 }, caps: { family: 'Poiret One', weight: 400 } },
  whimsical: { n: 'Hand-lettered', head: { family: 'Great Vibes', script: true }, body: { family: 'Jost', weight: 400 }, caps: { family: 'Jost', weight: 500 } },
};
/** Families the studio needs loaded before it draws (index.html links them from Google Fonts). */
export const FONT_FAMILIES = ['Pinyon Script', 'Great Vibes', 'Playfair Display', 'Italiana', 'Poiret One', 'Cormorant Garamond', 'Jost'];

export const EDGES: Record<EdgeId, string> = { straight: 'Straight', rounded: 'Rounded corners', deckle: 'Deckled', arch: 'Arched top' };
export const ORNAMENTS: Record<OrnamentId, string> = { florals: 'Watercolour florals', greenery: 'Greenery', wreath: 'Monogram wreath', deco: 'Deco frame', rules: 'Engraved border', stars: 'Stars & moon', none: 'None' };

export const THEMES: Record<ThemeId, { n: string; note: string; paper: PaperId; foil: FoilId; type: TypeId; edge: EdgeId; ornament: OrnamentId }> = {
  garden: { n: 'Garden watercolour', note: 'Loose florals in your palette', paper: 'cotton', foil: 'none', type: 'romantic', edge: 'deckle', ornament: 'florals' },
  classic: { n: 'Engraved classic', note: 'Double border, gold foil', paper: 'ivory', foil: 'gold', type: 'classic', edge: 'straight', ornament: 'rules' },
  deco: { n: 'Art deco', note: 'Black card, geometric gold', paper: 'black', foil: 'gold', type: 'deco', edge: 'straight', ornament: 'deco' },
  minimal: { n: 'Modern minimal', note: 'Clean type, lots of space', paper: 'white', foil: 'none', type: 'modern', edge: 'straight', ornament: 'none' },
  rustic: { n: 'Rustic kraft', note: 'Kraft card and greenery', paper: 'kraft', foil: 'none', type: 'whimsical', edge: 'straight', ornament: 'greenery' },
  celestial: { n: 'Celestial', note: 'Midnight card, silver stars', paper: 'navy', foil: 'silver', type: 'classic', edge: 'rounded', ornament: 'stars' },
  wreath: { n: 'Monogram wreath', note: 'Initials in a leafy wreath', paper: 'cotton', foil: 'rosegold', type: 'romantic', edge: 'arch', ornament: 'wreath' },
};

export interface Wording {
  names: string;
  host: string;
  /** ISO date */
  date: string;
  /** 24h "HH:MM" */
  time: string;
  venue: string;
  address: string;
  reception: string;
  rsvpBy: string;
  website: string;
  dress: string;
  note: string;
}

export interface Suite {
  theme: ThemeId;
  paper: PaperId;
  foil: FoilId;
  type: TypeId;
  edge: EdgeId;
  ornament: OrnamentId;
  /** 'auto' follows the paper; otherwise a hex ink colour */
  ink: string;
  wording: Wording;
  /** which pieces are part of the suite */
  pieces: Record<PieceKind, boolean>;
  /** extra copies over the automatic quantity (spares) */
  spares: number;
  /** guest names, one per line (place cards, seating chart) */
  guests: string;
  /** order of service, one item per line */
  program: string;
  /** menu, one course per line: "Course | Dish | details" (used until the Menu planner has a menu) */
  menu: string;
  /** seating chart, one table per line: "Table 1: Anna, Ben" (blank = spread the guest list over the tables) */
  seating: string;
}

export const DEFAULT_PROGRAM = ['Processional', 'Welcome', 'Reading', 'Exchange of vows', 'Exchange of rings', 'Declaration', 'Signing of the register', 'Recessional'].join('\n');
export const DEFAULT_MENU = ['To start | Burrata & grilled peach | hazelnut, honey, rocket', 'The main | Slow-roasted lamb | rosemary potatoes, salsa verde', 'To finish | Wedding cake | with a coupe of champagne'].join('\n');

export function defaultSuite(names = 'Olivia & James', date = ''): Suite {
  const th = THEMES.garden;
  return {
    theme: 'garden',
    paper: th.paper,
    foil: th.foil,
    type: th.type,
    edge: th.edge,
    ornament: th.ornament,
    ink: 'auto',
    wording: {
      names,
      host: 'Together with their families',
      date,
      time: '15:00',
      venue: '',
      address: '',
      reception: 'Dinner and dancing to follow',
      rsvpBy: '',
      website: '',
      dress: 'Black tie optional',
      note: '',
    },
    pieces: { savethedate: true, invitation: true, rsvp: true, details: true, menu: true, placecard: true, tablenum: true, welcome: true, program: true, seating: true, favour: false, thankyou: false },
    spares: 5,
    guests: '',
    program: DEFAULT_PROGRAM,
    menu: DEFAULT_MENU,
    seating: '',
  };
}

/** Apply a theme's paper, foil, type, edge and ornament (wording and pieces are kept). */
export function withTheme(s: Suite, id: ThemeId): Suite {
  const t = THEMES[id];
  return { ...s, theme: id, paper: t.paper, foil: t.foil, type: t.type, edge: t.edge, ornament: t.ornament, ink: 'auto' };
}

const oneOf = <T extends string>(v: unknown, rec: Record<T, unknown>, d: T): T => (typeof v === 'string' && v in rec ? (v as T) : d);
const s = (v: unknown, d: string, max = 400) => (typeof v === 'string' ? v.slice(0, max) : d);

/** Coerce untrusted JSON into a Suite (null when it isn't one). */
export function sanitizeSuite(raw: unknown): Suite | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const d = defaultSuite();
  const w = (o.wording ?? {}) as Record<string, unknown>;
  const p = (o.pieces ?? {}) as Record<string, unknown>;
  return {
    theme: oneOf(o.theme, THEMES, d.theme),
    paper: oneOf(o.paper, PAPERS, d.paper),
    foil: oneOf(o.foil, FOILS, d.foil),
    type: oneOf(o.type, TYPES, d.type),
    edge: oneOf(o.edge, EDGES, d.edge),
    ornament: oneOf(o.ornament, ORNAMENTS, d.ornament),
    ink: typeof o.ink === 'string' && (o.ink === 'auto' || /^#[0-9a-f]{6}$/i.test(o.ink)) ? o.ink : 'auto',
    wording: Object.fromEntries(Object.keys(d.wording).map((k) => [k, s(w[k], d.wording[k as keyof Wording], 200)])) as unknown as Wording,
    pieces: Object.fromEntries(PIECE_ORDER.map((k) => [k, typeof p[k] === 'boolean' ? p[k] : d.pieces[k]])) as Record<PieceKind, boolean>,
    spares: Math.max(0, Math.min(200, Math.round(typeof o.spares === 'number' ? o.spares : d.spares))),
    guests: s(o.guests, '', 20000),
    program: s(o.program, d.program, 4000),
    menu: s(o.menu, d.menu, 4000),
    seating: s(o.seating, '', 20000),
  };
}

/* ------------------------------------------------------------------ wording helpers */

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const ORD: Record<string, string> = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };

export function numberWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + numberWords(n % 100) : '');
  return numberWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? (n % 1000 < 100 ? ' and ' : ' ') + numberWords(n % 1000) : '');
}
export function ordinalWords(n: number): string {
  const w = numberWords(n);
  const parts = w.split('-');
  const last = parts[parts.length - 1];
  parts[parts.length - 1] = ORD[last] ?? (last.endsWith('y') ? last.slice(0, -1) + 'ieth' : last + 'th');
  return parts.join('-');
}

const parseDate = (iso: string) => {
  if (!iso) return null;
  const t = new Date(iso + 'T12:00');
  return isNaN(t.getTime()) ? null : t;
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "14 June 2026", or a placeholder. */
export function dateShort(iso: string) {
  const d = parseDate(iso);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : 'The date to come';
}
/** "14 · 06 · 26" */
export function dateDots(iso: string) {
  const d = parseDate(iso);
  if (!d) return '·  ·  ·';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())} · ${p(d.getMonth() + 1)} · ${String(d.getFullYear()).slice(2)}`;
}
/** Formal invitation wording: ["Saturday, the fourteenth of June", "two thousand and twenty-six"]. */
export function dateFormal(iso: string): [string, string] {
  const d = parseDate(iso);
  if (!d) return ['On the day we choose', ''];
  return [`${DAYS[d.getDay()]}, the ${ordinalWords(d.getDate())} of ${MONTHS[d.getMonth()]}`, numberWords(d.getFullYear())];
}
/** "at four o'clock in the afternoon", "at half past three in the afternoon". */
export function timeFormal(hhmm: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return '';
  const h = +m[1],
    min = +m[2];
  const h12 = h % 12 || 12;
  const part = h < 12 ? 'in the morning' : h < 17 ? 'in the afternoon' : 'in the evening';
  const hw = numberWords(h12);
  if (min === 0) return `at ${hw} o'clock ${part}`;
  if (min === 30) return `at half past ${hw} ${part}`;
  if (min === 15) return `at quarter past ${hw} ${part}`;
  if (min === 45) return `at quarter to ${numberWords((h12 % 12) + 1)} ${part}`;
  return `at ${hw} ${numberWords(min)} ${part}`;
}
/** "3pm", "3.30pm" */
export function timeShort(hhmm: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return '';
  const h = +m[1],
    min = +m[2];
  return `${h % 12 || 12}${min ? '.' + String(min).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`;
}

export const namesOf = (names: string) => names.split(/\s*(?:&|\+|\band\b)\s*/i).filter(Boolean);
export const initialsOf = (names: string) =>
  namesOf(names)
    .map((p) => p.trim()[0]?.toUpperCase() ?? '')
    .join('');

export const guestList = (s: Suite) =>
  s.guests
    .split('\n')
    .map((g) => g.trim())
    .filter(Boolean);

export interface MenuCourse {
  course: string;
  dish: string;
  desc: string;
}
export const menuCourses = (text: string): MenuCourse[] =>
  text
    .split('\n')
    .map((l) => l.split('|').map((x) => x.trim()))
    .filter((p) => p.some(Boolean))
    .map(([course = '', dish = '', desc = '']) => ({ course, dish, desc }));

/** Seating chart columns: typed tables, or the guest list spread evenly across the design's tables. */
export function seatingTables(s: Suite, tables: number): Array<{ name: string; guests: string[] }> {
  const typed = s.seating
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(':');
      return i < 0 ? { name: l, guests: [] } : { name: l.slice(0, i).trim(), guests: l.slice(i + 1).split(',').map((g) => g.trim()).filter(Boolean) };
    });
  if (typed.length) return typed;
  const g = guestList(s);
  const n = Math.max(1, tables);
  const per = Math.ceil(g.length / n) || 0;
  return Array.from({ length: n }, (_, i) => ({ name: `Table ${numberWords(i + 1).replace(/^./, (c) => c.toUpperCase())}`, guests: g.slice(i * per, (i + 1) * per) }));
}

/** How many of each piece to print for this design. */
export function pieceQty(k: PieceKind, s: Suite, guests: number, tables: number): number {
  const households = Math.ceil(guests / 2);
  const listed = guestList(s).length;
  const base = {
    savethedate: households,
    invitation: households,
    rsvp: households,
    details: households,
    program: guests,
    menu: guests,
    placecard: listed || guests,
    tablenum: tables,
    welcome: 1,
    seating: 1,
    favour: guests,
    thankyou: households,
  }[k];
  const perPiece = k === 'welcome' || k === 'seating' || k === 'tablenum' || k === 'placecard' ? 0 : s.spares;
  return base + perPiece;
}
