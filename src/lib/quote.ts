import { CATL, ITEMS, defaultPrice } from '../engine/catalogue';
import { CHAIRS, CLOTHS, DECOR, OVERLAYS, chairSpots, hasTbl } from '../engine/studio';
import { placement } from './designOps';
import type { Design, VenueDef } from '../types';
import { PIECES, PIECE_ORDER, pieceQty } from '../stationery/model';

export interface QuoteSettings {
  cur: string;
  /** service charge, % */
  svc: number;
  /** tax, % applied to subtotal + service */
  tax: number;
  /** unit price overrides keyed by line key */
  prices: Record<string, number>;
  event: string;
  date: string;
}

export const DEFAULT_QUOTE: QuoteSettings = { cur: '£', svc: 10, tax: 20, prices: {}, event: '', date: '' };
export const CURRENCIES = ['£', '$', '€', '₹', 'A$', 'C$'];

export interface QuoteLine {
  key: string;
  name: string;
  qty: number;
  cat: string;
  price: number;
}

/** Build the quote from what's actually in the scene (the prototype's `quoteLines`). */
export function quoteLines(S: Design, venue: VenueDef, prices: Record<string, number>): QuoteLine[] {
  const L: QuoteLine[] = [];
  const add = (key: string, name: string, qty: number, cat: string, price?: number) => {
    if (qty > 0) L.push({ key, name, qty, cat, price: prices[key] ?? price ?? defaultPrice(key) });
  };
  const m = S.table.mode,
    t = S.table;
  if (hasTbl(m)) {
    add('table:' + m, m === 'round' ? 'Round table · 1.9 m' : 'Banquet table · 3.8 m', S.tables.length, 'Furniture');
    const cl = t.cloth ? CLOTHS[t.cloth] : null;
    if (!cl?.bare) add('cloth:' + (t.cloth || 'venue'), 'Tablecloth · ' + (cl ? cl.name : 'Venue linen'), S.tables.length, 'Linens');
    if (t.overlay && t.overlay !== 'none' && !cl?.bare) add('overlay:' + t.overlay, 'Overlay · ' + OVERLAYS[t.overlay].name, S.tables.length, 'Linens');
  }
  const n = chairSpots(m, S.tables, S.guests).length;
  if (n) {
    // Venue-default chairs are priced by their style, like any other chair of that type.
    const chairKey = t.chair ?? Object.keys(CHAIRS).find((k) => CHAIRS[k].type === venue.chair.type) ?? 'chiavari_gold';
    add('chair:' + chairKey, 'Chair · ' + (t.chair ? CHAIRS[t.chair].name : 'Venue standard'), n, 'Furniture');
    if (t.decor !== 'none') add('decor:' + t.decor, 'Chair décor · ' + DECOR[t.decor].name, n, 'Linens');
  }
  const cnt = new Map<string, number>();
  for (const i of S.items) if (placement(S, i).visible) cnt.set(i.type, (cnt.get(i.type) ?? 0) + 1);
  for (const [k, q] of cnt) add('item:' + k, ITEMS[k].name, q, CATL[ITEMS[k].cat] || 'Other');
  // Printing for the Stationery Studio's suite.
  const st = S.stationery;
  if (st) for (const k of PIECE_ORDER) if (st.pieces[k]) add('stationery:' + k, PIECES[k].n, pieceQty(k, st, S.guests, S.tables.length), 'Stationery', PIECES[k].price);
  return L;
}

export function quoteTotals(lines: QuoteLine[], q: Pick<QuoteSettings, 'svc' | 'tax'>) {
  const sub = lines.reduce((a, l) => a + l.qty * l.price, 0);
  const svc = (sub * q.svc) / 100;
  const tax = ((sub + svc) * q.tax) / 100;
  return { sub, svc, tax, total: sub + svc + tax };
}

export const money = (cur: string, v: number) =>
  cur + (Math.round(v * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function quoteCsv(lines: QuoteLine[], q: QuoteSettings): string {
  const t = quoteTotals(lines, q);
  const cell = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const rows: Array<Array<string | number>> = [
    ['Category', 'Item', 'Qty', 'Unit', 'Total'],
    ...lines.map((l) => [l.cat, l.name, l.qty, l.price.toFixed(2), (l.qty * l.price).toFixed(2)]),
    [],
    ['', 'Subtotal', '', '', t.sub.toFixed(2)],
    ['', `Service ${q.svc}%`, '', '', t.svc.toFixed(2)],
    ['', `Tax ${q.tax}%`, '', '', t.tax.toFixed(2)],
    ['', `Total (${q.cur})`, '', '', t.total.toFixed(2)],
  ];
  return rows.map((r) => r.map(cell).join(',')).join('\n');
}
