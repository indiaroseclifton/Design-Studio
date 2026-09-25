/*
 * Menu & Bar planner: the plan saved on the design (`design.menu`), menu presets, a cocktail library,
 * dietary coverage, drink quantities and costs. The stationery menu, RSVP card and bar menu, the Quote and
 * the Storybook's Feast chapter all read from it.
 */

export type Diet = 'v' | 'vg' | 'gf' | 'df' | 'nf';
export const DIETS: Record<Diet, { n: string; short: string }> = {
  v: { n: 'Vegetarian', short: 'V' },
  vg: { n: 'Vegan', short: 'VG' },
  gf: { n: 'Gluten-free', short: 'GF' },
  df: { n: 'Dairy-free', short: 'DF' },
  nf: { n: 'Nut-free', short: 'NF' },
};
export const DIET_ORDER: Diet[] = ['v', 'vg', 'gf', 'df', 'nf'];

export type Service = 'plated' | 'family' | 'buffet' | 'stations' | 'canapes';
export const SERVICES: Record<Service, { n: string; note: string; k: number }> = {
  plated: { n: 'Plated', note: 'Served at the table, course by course', k: 1.15 },
  family: { n: 'Family style', note: 'Sharing platters passed along the table', k: 1.05 },
  buffet: { n: 'Buffet', note: 'Guests serve themselves', k: 0.9 },
  stations: { n: 'Food stations', note: 'Live counters to wander between', k: 1.1 },
  canapes: { n: 'Canapés & bowls', note: 'Standing reception, bowl food', k: 0.85 },
};

export interface Dish {
  dish: string;
  desc: string;
  diets: Diet[];
}
export interface Course {
  id: string;
  course: string;
  /** guests choose one option in advance (asked on the RSVP card) */
  choice: boolean;
  options: Dish[];
}

export type BarStyle = 'open' | 'beerwine' | 'limited' | 'cash' | 'dry';
export const BAR_STYLES: Record<BarStyle, { n: string; note: string; perHourHead: number }> = {
  open: { n: 'Open bar', note: 'Everything, all evening', perHourHead: 7.5 },
  beerwine: { n: 'Beer & wine', note: 'Wine, beer and softs', perHourHead: 5 },
  limited: { n: 'Signatures only', note: 'Your cocktails, wine and softs', perHourHead: 6 },
  cash: { n: 'Cash bar', note: 'Guests buy their own after the toast', perHourHead: 0 },
  dry: { n: 'Alcohol-free', note: 'Mocktails, kombucha, fine softs', perHourHead: 3 },
};

export type Glass = 'coupe' | 'rocks' | 'highball' | 'flute' | 'martini' | 'wine';
export const GLASSES: Record<Glass, string> = { coupe: 'Coupe', rocks: 'Rocks', highball: 'Highball', flute: 'Flute', martini: 'Martini', wine: 'Wine glass' };
export interface Cocktail {
  name: string;
  base: string;
  desc: string;
  glass: Glass;
  colour: string;
  /** alcohol-free */
  zero?: boolean;
}

export const COCKTAILS: Cocktail[] = [
  { name: 'French 75', base: 'Gin', desc: 'gin, lemon, sugar, topped with champagne', glass: 'flute', colour: '#f3e3a6' },
  { name: 'Aperol Spritz', base: 'Aperol', desc: 'Aperol, prosecco, soda, orange', glass: 'wine', colour: '#f28a3a' },
  { name: 'Espresso Martini', base: 'Vodka', desc: 'vodka, coffee liqueur, fresh espresso', glass: 'martini', colour: '#3a2418' },
  { name: 'Old Fashioned', base: 'Bourbon', desc: 'bourbon, demerara, bitters, orange peel', glass: 'rocks', colour: '#b8672a' },
  { name: 'Negroni', base: 'Gin', desc: 'gin, Campari, sweet vermouth', glass: 'rocks', colour: '#b3202a' },
  { name: 'Paloma', base: 'Tequila', desc: 'tequila, pink grapefruit, lime, soda', glass: 'highball', colour: '#f6a8a0' },
  { name: 'Margarita', base: 'Tequila', desc: 'tequila, triple sec, lime, salt rim', glass: 'coupe', colour: '#dfe8a6' },
  { name: 'Mojito', base: 'Rum', desc: 'white rum, mint, lime, soda', glass: 'highball', colour: '#d4ecc0' },
  { name: 'Elderflower Collins', base: 'Gin', desc: 'gin, elderflower, lemon, soda', glass: 'highball', colour: '#eef2d6' },
  { name: 'Bramble', base: 'Gin', desc: 'gin, lemon, blackberry liqueur', glass: 'rocks', colour: '#7a2a4a' },
  { name: 'Bellini', base: 'Prosecco', desc: 'white peach purée and prosecco', glass: 'flute', colour: '#f8c6a0' },
  { name: 'Whisky Sour', base: 'Whisky', desc: 'whisky, lemon, sugar, egg white foam', glass: 'coupe', colour: '#e8c27a' },
  { name: 'Lavender Gimlet', base: 'Gin', desc: 'gin, lavender syrup, lime', glass: 'coupe', colour: '#d8cdea' },
  { name: 'Hugo Spritz', base: 'Prosecco', desc: 'elderflower, prosecco, mint, lime', glass: 'wine', colour: '#e8f0cc' },
  { name: 'Virgin Garden Spritz', base: 'Alcohol-free', desc: 'Seedlip Garden, elderflower tonic, cucumber', glass: 'wine', colour: '#dcefd6', zero: true },
  { name: 'Berry Nojito', base: 'Alcohol-free', desc: 'crushed berries, mint, lime, soda', glass: 'highball', colour: '#e27a92', zero: true },
  { name: 'Ginger Rose Fizz', base: 'Alcohol-free', desc: 'rose, ginger, lemon, sparkling tea', glass: 'flute', colour: '#f4c4cc', zero: true },
];

export interface MenuPlan {
  preset: string;
  service: Service;
  courses: Course[];
  bar: {
    style: BarStyle;
    welcome: string;
    signatures: Cocktail[];
    wine: { red: string; white: string; sparkling: string };
    hours: number;
    toast: boolean;
  };
  /** guests with each requirement */
  dietary: Record<Diet, number>;
  children: number;
  /** per head, before service style */
  foodPerHead: number;
}

let _id = 0;
const cid = () => `c${Date.now().toString(36)}${(_id++).toString(36)}`;
const D = (dish: string, desc: string, diets: Diet[] = []): Dish => ({ dish, desc, diets });
const C = (course: string, options: Dish[], choice = false): Course => ({ id: cid(), course, choice, options });

export const MENU_PRESETS: Record<string, { n: string; note: string; service: Service; price: number; courses: () => Course[] }> = {
  seasonal: {
    n: 'Seasonal British',
    note: 'Three courses, a choice of main',
    service: 'plated',
    price: 68,
    courses: () => [
      C('Canapés', [D('Smoked salmon blini', 'crème fraîche, dill'), D('Wild mushroom tartlet', 'thyme, truffle', ['v']), D('Beetroot & goat’s cheese', 'on rye', ['v'])]),
      C('To start', [D('Heritage tomato salad', 'burrata, basil oil, sourdough', ['v']), D('Chicken liver parfait', 'plum chutney, brioche', ['nf'])], true),
      C('The main', [D('Roast Cornish lamb', 'rosemary potatoes, salsa verde', ['gf', 'df', 'nf']), D('Line-caught sea bass', 'samphire, brown shrimp butter', ['gf', 'nf']), D('Wild garlic risotto', 'aged parmesan, pea shoots', ['v', 'gf', 'nf'])], true),
      C('To finish', [D('Wedding cake', 'with a coupe of champagne'), D('Eton mess', 'strawberries, meringue, cream', ['v', 'gf', 'nf'])]),
    ],
  },
  italian: {
    n: 'Italian feast',
    note: 'Sharing antipasti, pasta and a roast',
    service: 'family',
    price: 62,
    courses: () => [
      C('Antipasti', [D('Burrata & grilled peach', 'hazelnut, honey, rocket', ['v', 'gf']), D('Salumi board', 'fennel salami, prosciutto, grissini', ['df']), D('Caponata', 'on grilled focaccia', ['vg', 'df', 'nf'])]),
      C('Primi', [D('Pappardelle', 'slow-cooked beef ragù', ['nf']), D('Cacio e pepe', 'pecorino, black pepper', ['v', 'nf'])]),
      C('Secondi', [D('Porchetta', 'salsa verde, roast potatoes', ['gf', 'df', 'nf']), D('Aubergine parmigiana', 'basil, mozzarella', ['v', 'gf', 'nf'])]),
      C('Dolci', [D('Tiramisù', 'espresso, mascarpone', ['v', 'nf']), D('Wedding cake', 'with limoncello')]),
    ],
  },
  mezze: {
    n: 'Mediterranean sharing',
    note: 'Mezze boards and grills',
    service: 'family',
    price: 55,
    courses: () => [
      C('Mezze', [D('Hummus & flatbreads', 'za’atar, olive oil', ['vg', 'df', 'nf']), D('Whipped feta', 'honey, chilli, pistachio', ['v', 'gf']), D('Fattoush', 'sumac, crisp pitta', ['vg', 'df', 'nf'])]),
      C('From the grill', [D('Lamb kofta', 'tahini yoghurt, pomegranate', ['gf', 'nf']), D('Chicken shish', 'garlic sauce, pickles', ['gf', 'df', 'nf']), D('Halloumi & vegetable skewers', 'chermoula', ['v', 'gf', 'nf'])]),
      C('Something sweet', [D('Orange blossom cake', 'rose cream', ['v']), D('Baklava', 'pistachio, syrup', ['v'])]),
    ],
  },
  veg: {
    n: 'Modern vegetarian',
    note: 'Plant-led, every course meat-free',
    service: 'plated',
    price: 58,
    courses: () => [
      C('To start', [D('Charred leeks', 'romesco, hazelnut', ['vg', 'gf', 'df']), D('Burrata', 'blood orange, fennel', ['v', 'gf', 'nf'])], true),
      C('The main', [D('Celeriac Wellington', 'mushroom duxelles, red wine jus', ['vg', 'df', 'nf']), D('Squash & ricotta ravioli', 'sage brown butter', ['v', 'nf'])], true),
      C('To finish', [D('Dark chocolate torte', 'raspberry, coconut cream', ['vg', 'gf', 'df', 'nf']), D('Wedding cake', 'with a coupe of champagne', ['v'])]),
    ],
  },
  asian: {
    n: 'Pan-Asian',
    note: 'Bao, curry and noodle bowls',
    service: 'stations',
    price: 60,
    courses: () => [
      C('Small plates', [D('Bao buns', 'crispy pork belly, pickled cucumber', ['df', 'nf']), D('Vegetable gyoza', 'chilli soy', ['vg', 'df', 'nf']), D('Tuna tataki', 'ponzu, sesame', ['gf', 'df', 'nf'])]),
      C('Bowls', [D('Massaman curry', 'slow-cooked beef, jasmine rice', ['gf', 'df']), D('Pad thai', 'tofu, tamarind, lime', ['vg', 'gf', 'df'])]),
      C('Sweet', [D('Mango sticky rice', 'coconut, sesame', ['vg', 'gf', 'df', 'nf']), D('Wedding cake', 'with green tea ice cream', ['v'])]),
    ],
  },
  bbq: {
    n: 'Garden barbecue',
    note: 'Relaxed grill and salads',
    service: 'buffet',
    price: 45,
    courses: () => [
      C('From the grill', [D('Beef brisket', 'smoked 12 hours, pickles', ['gf', 'df', 'nf']), D('Spatchcock chicken', 'lemon, oregano', ['gf', 'df', 'nf']), D('Halloumi burgers', 'harissa mayo, brioche', ['v', 'nf'])]),
      C('Salads & sides', [D('Charred corn', 'lime, chilli butter', ['v', 'gf', 'nf']), D('New potato salad', 'chives, crème fraîche', ['v', 'gf', 'nf']), D('Slaw', 'apple, fennel', ['vg', 'gf', 'df', 'nf'])]),
      C('Pudding', [D('Wedding cake', 'with summer berries', ['v']), D('Strawberry pavlova', 'cream, mint', ['v', 'gf', 'nf'])]),
    ],
  },
  canapes: {
    n: 'Canapés & bowl food',
    note: 'A standing reception',
    service: 'canapes',
    price: 48,
    courses: () => [
      C('Canapés', [D('Crab on brioche', 'chive, lemon', ['nf']), D('Truffle arancini', 'parmesan', ['v', 'nf']), D('Beef tartare', 'on potato crisp', ['gf', 'df', 'nf']), D('Pea & mint crostini', 'ricotta', ['v', 'nf'])]),
      C('Bowl food', [D('Fish & chips', 'mushy peas, tartare', ['df', 'nf']), D('Mushroom risotto', 'truffle, parmesan', ['v', 'gf', 'nf']), D('Chicken katsu', 'sticky rice, pickles', ['df', 'nf'])]),
      C('Late night', [D('Cheese board', 'chutney, crackers', ['v']), D('Wedding cake', 'served from the table', ['v'])]),
    ],
  },
};

export function defaultPlan(): MenuPlan {
  const p = MENU_PRESETS.seasonal;
  return {
    preset: 'seasonal',
    service: p.service,
    courses: p.courses(),
    bar: {
      style: 'open',
      welcome: 'Champagne on arrival',
      signatures: [COCKTAILS[0], COCKTAILS[12], COCKTAILS[14]],
      wine: { red: 'Rioja Reserva', white: 'Picpoul de Pinet', sparkling: 'English sparkling' },
      hours: 6,
      toast: true,
    },
    dietary: { v: 0, vg: 0, gf: 0, df: 0, nf: 0 },
    children: 0,
    foodPerHead: p.price,
  };
}

/** Name two signature cocktails after the couple, coloured from the palette. */
export function namedSignatures(names: string, pal: string[]): Cocktail[] {
  const [a, b] = names.split(/\s*(?:&|\+|\band\b)\s*/i).filter(Boolean);
  if (!a || !b) return [];
  const pick = (i: number) => pal[i % pal.length];
  return [
    { name: `The ${a.trim()}`, base: 'Gin', desc: 'gin, elderflower, lemon, sparkling rosé', glass: 'coupe', colour: pick(1) },
    { name: `${b.trim()}’s Old Fashioned`, base: 'Bourbon', desc: 'bourbon, maple, orange bitters', glass: 'rocks', colour: '#b8672a' },
  ];
}

/* ------------------------------------------------------------------ analysis */

/** Which dietary needs have something suitable on every course (dessert included). */
export function dietGaps(p: MenuPlan): Array<{ diet: Diet; course: string }> {
  const gaps: Array<{ diet: Diet; course: string }> = [];
  for (const d of DIET_ORDER) {
    if (!p.dietary[d]) continue;
    for (const c of p.courses) {
      // Vegan dishes suit vegetarians too.
      const ok = c.options.some((o) => o.diets.includes(d) || (d === 'v' && o.diets.includes('vg')));
      if (!ok) gaps.push({ diet: d, course: c.course });
    }
  }
  return gaps;
}

export interface DrinkCalc {
  wineBottles: number;
  sparklingBottles: number;
  beer: number;
  spirits: number;
  softs: number;
  iceKg: number;
}
/** Industry rules of thumb for the drinks order. */
export function drinkQuantities(p: MenuPlan, guests: number): DrinkCalc {
  const adults = Math.max(0, guests - p.children);
  const b = p.bar;
  const alco = b.style !== 'dry';
  const full = b.style === 'open' || b.style === 'beerwine' || b.style === 'limited';
  const drinksPerAdult = full ? 1 + (b.hours - 1) * 0.8 : b.style === 'cash' ? 1 : 0;
  const wineShare = b.style === 'beerwine' ? 0.6 : b.style === 'limited' ? 0.5 : 0.45;
  const beerShare = b.style === 'limited' ? 0 : b.style === 'beerwine' ? 0.35 : 0.25;
  const glasses = adults * drinksPerAdult;
  return {
    wineBottles: alco ? Math.ceil((glasses * wineShare) / 5) : 0,
    sparklingBottles: alco && b.toast ? Math.ceil(adults / 7) + (b.welcome.toLowerCase().includes('champagne') || b.welcome.toLowerCase().includes('prosecco') ? Math.ceil(adults / 6) : 0) : 0,
    beer: alco ? Math.ceil(glasses * beerShare) : 0,
    spirits: alco && b.style === 'open' ? Math.ceil((glasses * 0.3) / 18) : alco && b.style === 'limited' ? Math.ceil((b.signatures.filter((s) => !s.zero).length * adults * 1.2) / 14) : 0,
    softs: Math.ceil((guests * b.hours) / 2),
    iceKg: Math.ceil(guests * 0.7),
  };
}

export function menuCosts(p: MenuPlan, guests: number) {
  const adults = Math.max(0, guests - p.children);
  const food = Math.round(p.foodPerHead * SERVICES[p.service].k);
  const kids = Math.round(food * 0.45);
  const drinks = Math.round(BAR_STYLES[p.bar.style].perHourHead * p.bar.hours + (p.bar.toast ? 4 : 0));
  return { foodPerHead: food, kidsPerHead: kids, drinksPerHead: drinks, total: adults * (food + drinks) + p.children * (kids + 3), adults };
}

/** The menu as the stationery draws it: one line per course, options joined. */
export function menuForCards(p: MenuPlan) {
  return p.courses.map((c) => ({
    course: c.course,
    dish: c.options.map((o) => o.dish).join(c.choice ? '  ·  ' : ', '),
    desc: c.options.length === 1 ? c.options[0].desc : c.choice ? 'please choose on your reply card' : c.options.map((o) => o.desc).filter(Boolean).slice(0, 2).join('; '),
  }));
}
/** RSVP meal choices: "The main: Lamb / Sea bass / Risotto". */
export const menuChoices = (p: MenuPlan) => p.courses.filter((c) => c.choice && c.options.length > 1).map((c) => ({ course: c.course, options: c.options.map((o) => o.dish) }));

/* ------------------------------------------------------------------ sanitize */

const str = (v: unknown, d = '', max = 200) => (typeof v === 'string' ? v.slice(0, max) : d);
const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const oneOf = <T extends string>(v: unknown, rec: Record<T, unknown>, d: T): T => (typeof v === 'string' && v in rec ? (v as T) : d);
const diets = (v: unknown): Diet[] => (Array.isArray(v) ? (v.filter((x) => typeof x === 'string' && x in DIETS) as Diet[]) : []);
const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export function sanitizePlan(raw: unknown): MenuPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const d = defaultPlan();
  const b = (o.bar ?? {}) as Record<string, unknown>;
  const w = (b.wine ?? {}) as Record<string, unknown>;
  const dt = (o.dietary ?? {}) as Record<string, unknown>;
  const courses = Array.isArray(o.courses)
    ? (o.courses as Array<Record<string, unknown>>)
        .filter((c) => c && typeof c === 'object')
        .slice(0, 12)
        .map((c) => ({
          id: str(c.id, cid(), 40),
          course: str(c.course, 'Course', 60),
          choice: c.choice === true,
          options: Array.isArray(c.options) ? (c.options as Array<Record<string, unknown>>).filter((x) => x && typeof x === 'object').slice(0, 8).map((x) => D(str(x.dish, '', 80), str(x.desc, '', 120), diets(x.diets))) : [],
        }))
    : d.courses;
  const sigs = Array.isArray(b.signatures)
    ? (b.signatures as Array<Record<string, unknown>>)
        .filter((x) => x && typeof x === 'object')
        .slice(0, 6)
        .map((x) => ({ name: str(x.name, 'Cocktail', 60), base: str(x.base, '', 40), desc: str(x.desc, '', 120), glass: oneOf<Glass>(x.glass, GLASSES, 'coupe'), colour: isHex(x.colour) ? x.colour : '#e8c27a', ...(x.zero === true ? { zero: true } : {}) }))
    : d.bar.signatures;
  return {
    preset: str(o.preset, 'custom', 40),
    service: oneOf(o.service, SERVICES, d.service),
    courses,
    bar: {
      style: oneOf(b.style, BAR_STYLES, d.bar.style),
      welcome: str(b.welcome, d.bar.welcome, 80),
      signatures: sigs,
      wine: { red: str(w.red, d.bar.wine.red, 60), white: str(w.white, d.bar.wine.white, 60), sparkling: str(w.sparkling, d.bar.wine.sparkling, 60) },
      hours: num(b.hours, d.bar.hours, 1, 12),
      toast: b.toast !== false,
    },
    dietary: Object.fromEntries(DIET_ORDER.map((k) => [k, Math.round(num(dt[k], 0, 0, 500))])) as Record<Diet, number>,
    children: Math.round(num(o.children, 0, 0, 200)),
    foodPerHead: num(o.foodPerHead, d.foodPerHead, 0, 1000),
  };
}
