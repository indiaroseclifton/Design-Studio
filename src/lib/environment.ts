import * as THREE from 'three';
import type { TimeOfDay, VenueDef, VenueEnv, Weather } from '../types';

export interface ResolvedEnv extends VenueEnv {
  /** multiplier applied to the venue's own point lights (candles, bulbs, chandeliers) */
  k: number;
  /** cloud cover for the sky shader, 0–1 */
  cloud: number;
}

type TimePreset = Omit<VenueEnv, 'fog' | 'env'> & { fog: string; k: number; cloud: number };

const TIMES: Record<Exclude<TimeOfDay, 'venue'>, TimePreset> = {
  day: {
    sky: ['#4f86d0', '#cfe2f2', '#9aa88a'],
    fog: '#d6e6ef',
    hemi: ['#dbeaff', '#6a6a5a', 1.05],
    sun: ['#fff4e0', 3.2, [15, 30, 10]],
    exp: 1,
    bloom: 0.35,
    k: 0.25,
    cloud: 0.35,
  },
  golden: {
    sky: ['#6b8fc4', '#f7c98b', '#c9a27a'],
    fog: '#f0cfa0',
    hemi: ['#ffd9b0', '#8a6a4a', 0.8],
    sun: ['#ffb870', 2.8, [-30, 9, 20]],
    exp: 1.05,
    bloom: 0.55,
    k: 0.7,
    cloud: 0.3,
  },
  night: {
    sky: ['#060a18', '#1a2440', '#05070a'],
    fog: '#0d1424',
    hemi: ['#3a4a7a', '#0a0a0a', 0.35],
    sun: ['#8fa8ff', 0.4, [-20, 30, -20]],
    exp: 1.25,
    bloom: 0.85,
    k: 1.25,
    cloud: 0,
  },
};

export const hexMix = (a: string, b: string, t: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

/** Resolve a venue's lighting for the chosen time of day and weather (mirrors the prototype's `envFor`). */
export function envFor(venue: VenueDef, time: TimeOfDay, wx: Weather): ResolvedEnv {
  let e: VenueEnv & { k?: number; cloud?: number } = { ...venue.env };
  if (time !== 'venue') {
    const tp = TIMES[time];
    e = { ...e, sky: tp.sky, hemi: tp.hemi, sun: tp.sun, exp: tp.exp, bloom: tp.bloom, fog: [tp.fog, e.fog[1], e.fog[2]], k: tp.k, cloud: tp.cloud };
  }
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(e.sky[1]).getHSL(hsl);
  let out: ResolvedEnv = { ...e, k: e.k ?? 1, cloud: e.cloud ?? (hsl.l < 0.2 ? 0 : 0.25) };

  if (!venue.indoor && wx !== 'clear') {
    const gc = wx === 'snow' ? '#c9ced6' : '#7d8591';
    out = {
      ...out,
      sky: out.sky.map((c) => hexMix(c, gc, 0.65)) as [string, string, string],
      fog: [hexMix(out.fog[0], gc, 0.7), out.fog[1] * 0.5, out.fog[2] * 0.5],
      sun: [out.sun[0], out.sun[1] * 0.35, out.sun[2]],
      cloud: 0.95,
    };
  }
  return out;
}
