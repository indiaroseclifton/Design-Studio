import { CATEGORIES, ITEMS } from '../data/catalogue';
import type { Design, VenueDef } from '../types';
import type { LayoutResult } from './layout';
import { resolvePlacements } from './placements';

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

const CHAIR_PRICE = { cross: 9, chiavari: 7.5 } as const;

function defaultPrice(key: string, venue: VenueDef): number {
  const [kind, id] = key.split(':');
  if (kind === 'table') return id === 'round' ? 14 : 20;
  if (kind === 'cloth') return 18;
  if (kind === 'chair') return CHAIR_PRICE[venue.chair.type];
  return ITEMS[id]?.price ?? 50;
}

const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? 'Other';

/** Build the quote from what's actually in the scene: mirrored table pieces count once per table. */
export function quoteLines(design: Design, layout: LayoutResult, venue: VenueDef, prices: Record<string, number>): QuoteLine[] {
  const lines: QuoteLine[] = [];
  const add = (key: string, name: string, qty: number, cat: string) => {
    if (qty > 0) lines.push({ key, name, qty, cat, price: prices[key] ?? defaultPrice(key, venue) });
  };

  const { tables, ceremonySeats } = layout;
  const mode = design.table.layout;
  if (tables.length && (mode === 'round' || mode === 'banquet')) {
    const t0 = tables[0];
    const size = mode === 'round' ? `Round table · ${(t0.radius * 2).toFixed(1)} m` : `Banquet table · ${t0.length.toFixed(1)} m`;
    add(`table:${mode}`, size, tables.length, 'Furniture');
    add('cloth:venue', 'Tablecloth · Venue linen', tables.length, 'Linens');
  }
  const chairs = tables.reduce((n, t) => n + t.seats.length, 0) + ceremonySeats.length;
  add(`chair:${venue.chair.type}`, `Chair · ${venue.chair.type === 'chiavari' ? 'Chiavari' : 'Cross-back'}`, chairs, 'Furniture');

  const counts = new Map<string, number>();
  for (const p of resolvePlacements(design, tables)) counts.set(p.item.type, (counts.get(p.item.type) ?? 0) + 1);
  for (const [type, qty] of counts) {
    const def = ITEMS[type];
    if (def) add(`item:${type}`, def.name, qty, catLabel(def.cat));
  }
  return lines;
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
