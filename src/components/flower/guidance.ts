import { FCOL, FL, VESS, type Draft } from '../../engine/flowers';

/** Stem counts that look right in each vessel, from florists' rules of thumb. */
export const STEM_RANGE: Record<string, [number, number]> = {
  budvase: [1, 5],
  handtied: [12, 45],
  compote: [14, 45],
  lowbowl: [14, 45],
  tallvase: [10, 40],
  urn: [22, 70],
  hanging: [30, 90],
};

export const VESSEL_NOTE: Record<string, string> = {
  handtied: 'Bouquet · lies on the table',
  compote: 'Table centrepiece',
  lowbowl: 'Low centrepiece · talk across it',
  budvase: 'Single stems · table accent',
  tallvase: 'Tall centrepiece',
  urn: 'Floor arrangement',
  hanging: 'Hangs from the ceiling',
};

export const SHAPE_NOTE: Record<string, string> = {
  dome: 'Compact and rounded',
  round: 'Full, even ball',
  cascade: 'Blooms spill down the front',
  wild: 'Loose, garden-gathered',
  tall: 'Height and movement',
};

export const stemTotal = (d: Draft) => d.stems.reduce((a, s) => a + s.n, 0);

/** The same estimate the catalogue uses for a saved arrangement (engine/flowers.ts registerCustom). */
export function priceOf(d: Draft) {
  const surf = VESS[d.vessel]?.surf;
  return Math.round(18 + d.stems.reduce((a, s) => a + s.n * 4.5, 0) + (surf === 'floor' ? 120 : surf === 'hang' ? 200 : 0));
}

/** Approximate width across, in centimetres, for the size readout. */
export function widthCm(d: Draft) {
  const base: Record<string, number> = { handtied: 36, compote: 48, lowbowl: 55, budvase: 16, tallvase: 55, urn: 90, hanging: 140 };
  return Math.round((base[d.vessel] ?? 50) * (d.vessel === 'budvase' ? 1 : d.size));
}

export function stemAdvice(d: Draft): string | null {
  const [lo, hi] = STEM_RANGE[d.vessel] ?? [1, 99];
  const n = stemTotal(d);
  const v = VESS[d.vessel]?.n.toLowerCase() ?? 'vessel';
  if (!n) return null;
  if (n < lo) return `A ${v} usually looks fuller with ${lo}–${hi} stems.`;
  if (n > hi) return `That's a lot for a ${v} — ${lo}–${hi} stems usually sits best.`;
  return null;
}

export const colourHex = (c: string) => FCOL[c]?.[1] ?? c;
export const colourName = (c: string) => FCOL[c]?.[0] ?? 'Custom';
export const flowerName = (t: string) => FL[t]?.n ?? t;
