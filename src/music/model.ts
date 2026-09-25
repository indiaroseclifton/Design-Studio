import { SONGS, SONG_BY_ID, type Genre, type Song } from './library';

/*
 * Music curator: the plan saved on the design (`design.music`), the moments of the day, and the curation
 * that turns preferences into a playlist per moment. The Quote, the order of service and the Storybook's
 * First Dance chapter read from it.
 */

export type MomentId = 'arrival' | 'processional' | 'signing' | 'recessional' | 'drinks' | 'dinner' | 'firstdance' | 'party' | 'last';
export interface MomentDef {
  n: string;
  code: string;
  note: string;
  minutes: number;
  /** one song, not a set */
  single?: boolean;
  /** target energy range, 1–5 */
  energy: [number, number];
}
export const MOMENTS: Record<MomentId, MomentDef> = {
  arrival: { n: 'Guests arriving', code: 'a', note: 'Soft music while guests take their seats', minutes: 30, energy: [1, 2] },
  processional: { n: 'Processional', code: 'p', note: 'The walk down the aisle', minutes: 4, single: true, energy: [1, 3] },
  signing: { n: 'Signing the register', code: 's', note: 'A song or two while you sign', minutes: 8, energy: [1, 2] },
  recessional: { n: 'Recessional', code: 'r', note: 'Married! Back up the aisle', minutes: 4, single: true, energy: [3, 5] },
  drinks: { n: 'Drinks reception', code: 'd', note: 'Easy, sunny, conversational', minutes: 75, energy: [2, 3] },
  dinner: { n: 'Dinner', code: 'n', note: 'Warm and low, under conversation', minutes: 90, energy: [1, 3] },
  firstdance: { n: 'First dance', code: 'f', note: 'Your song', minutes: 4, single: true, energy: [1, 3] },
  party: { n: 'The party', code: 'x', note: 'Builds, peaks, breathes, peaks again', minutes: 180, energy: [3, 5] },
  last: { n: 'Last song', code: 'l', note: 'Everyone on the floor, arms round each other', minutes: 4, single: true, energy: [3, 5] },
};
export const MOMENT_ORDER: MomentId[] = ['arrival', 'processional', 'signing', 'recessional', 'drinks', 'dinner', 'firstdance', 'party', 'last'];
/** The vows and readings between the processional and signing: no music. */
export const CEREMONY_GAP = 15;

export type Era = 'timeless' | '60s' | '70s' | '80s' | '90s' | '00s' | '10s';
export const ERAS: Record<Era, string> = { timeless: 'Timeless', '60s': '50s & 60s', '70s': '70s', '80s': '80s', '90s': '90s', '00s': '2000s', '10s': '2010s on' };
export const eraOf = (y: number): Era => (y < 1950 ? 'timeless' : y < 1970 ? '60s' : y < 1980 ? '70s' : y < 1990 ? '80s' : y < 2000 ? '90s' : y < 2010 ? '00s' : '10s');
export const GENRES: Record<Genre, string> = { pop: 'Pop', rock: 'Rock', soul: 'Soul & Motown', dance: 'Disco & dance', indie: 'Indie', classical: 'Classical', jazz: 'Jazz & swing', country: 'Country', hiphop: 'Hip hop & R&B', acoustic: 'Acoustic' };

export type Format = 'dj' | 'band' | 'strings' | 'playlist';
export const FORMATS: Record<Format, { n: string; note: string; price: number }> = {
  dj: { n: 'DJ', note: 'One DJ for the whole day', price: 950 },
  band: { n: 'Live band', note: 'A band for the party, DJ sets between', price: 2800 },
  strings: { n: 'Strings & DJ', note: 'A string quartet for the ceremony and drinks, then a DJ', price: 1900 },
  playlist: { n: 'Our playlist', note: 'Your own playlist through a hired PA', price: 180 },
};

export interface MomentPlan {
  id: MomentId;
  on: boolean;
  minutes: number;
  /** songs kept whatever else changes (song ids) */
  pins: string[];
  /** songs taken out of this moment */
  bans: string[];
  seed: number;
}
export interface MusicPlan {
  format: Format;
  genres: Genre[];
  eras: Era[];
  moments: MomentPlan[];
  mustPlay: string;
  doNotPlay: string;
  /** songs the couple added themselves */
  custom: Song[];
}

export function defaultMusic(): MusicPlan {
  return {
    format: 'dj',
    genres: [],
    eras: [],
    moments: MOMENT_ORDER.map((id, i) => ({ id, on: true, minutes: MOMENTS[id].minutes, pins: [], bans: [], seed: 11 + i })),
    mustPlay: '',
    doNotPlay: '',
    custom: [],
  };
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

const lines = (t: string) =>
  t
    .split('\n')
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
const mentioned = (song: Song, list: string[]) => list.some((l) => song.title.toLowerCase().includes(l) || (l.length > 3 && l.includes(song.title.toLowerCase())) || l === song.artist.toLowerCase());

export const songOf = (id: string, plan: MusicPlan) => SONG_BY_ID.get(id) ?? plan.custom.find((c) => c.id === id);

export interface Track extends Song {
  /** minutes from the start of the day */
  at: number;
  pinned: boolean;
}
export interface Segment {
  id: MomentId | 'ceremony';
  start: number;
  minutes: number;
  tracks: Track[];
}

/** Track length used for timings. */
export const TRACK_MIN = 3.7;

/**
 * Curate every moment in order, so no song plays twice. Pins come first; the rest are scored on energy,
 * genre, era and must-play mentions, then ordered for the moment (the party builds, breathes and peaks).
 */
export function curate(plan: MusicPlan): Segment[] {
  const used = new Set<string>();
  const banAll = lines(plan.doNotPlay);
  const must = lines(plan.mustPlay);
  const library = [...SONGS, ...plan.custom];
  const segs: Segment[] = [];
  let t = 0;
  for (const mp of plan.moments) {
    const M = MOMENTS[mp.id];
    if (mp.id === 'signing') {
      segs.push({ id: 'ceremony', start: t, minutes: CEREMONY_GAP, tracks: [] });
      t += CEREMONY_GAP;
    }
    if (!mp.on) continue;
    const slots = M.single ? 1 : Math.max(1, Math.round(mp.minutes / TRACK_MIN));
    const rng = prng(mp.seed);
    const ok = (s: Song) => !used.has(s.id) && !mp.bans.includes(s.id) && !mentioned(s, banAll);
    const pool = library.filter((s) => s.moments.includes(M.code) && ok(s));
    const [lo, hi] = M.energy;
    // Genres and eras are preferences, not filters: matching songs rank first, the rest fill the time.
    const genreFit = (s: Song) => (plan.genres.length && s.genres.some((g) => plan.genres.includes(g)) ? 2.5 : 0);
    const eraFit = (s: Song) => (plan.eras.length && (plan.eras.includes(eraOf(s.year)) || s.year < 1950) ? 1.5 : 0);
    const scored = pool
      .map((s) => ({
        s,
        score: (s.energy >= lo && s.energy <= hi ? 2 : -Math.min(Math.abs(s.energy - lo), Math.abs(s.energy - hi))) + (mentioned(s, must) ? 5 : 0) + genreFit(s) + eraFit(s) + rng() * 1.6,
      }))
      .sort((a, b) => b.score - a.score);
    const picks: Song[] = [];
    for (const id of mp.pins) {
      const s = songOf(id, plan);
      if (s && !picks.includes(s) && picks.length < slots) picks.push(s);
    }
    for (const { s } of scored) {
      if (picks.length >= slots) break;
      if (!picks.includes(s)) picks.push(s);
    }
    let order = picks;
    if (mp.id === 'party' && picks.length > 4) {
      // Warm up with the gentler floor-fillers, then peak; a breather every seventh track.
      const pinned = picks.filter((s) => mp.pins.includes(s.id));
      const rest = picks.filter((s) => !mp.pins.includes(s.id)).sort((a, b) => a.energy - b.energy || a.bpm - b.bpm);
      const warm = rest.splice(0, Math.ceil(rest.length * 0.18));
      // A few gentler songs held back as breathers between the peaks.
      const breathers = rest.splice(0, Math.floor(rest.length / 8));
      const peak = rest.reverse();
      const seq: Song[] = [...pinned, ...warm];
      peak.forEach((s, i) => {
        seq.push(s);
        if (i % 7 === 6 && breathers.length) seq.push(breathers.shift()!);
      });
      seq.push(...breathers);
      order = [...new Set(seq)];
    }
    const start = t;
    const tracks = order.map((s, i) => {
      used.add(s.id);
      return { ...s, at: start + i * TRACK_MIN, pinned: mp.pins.includes(s.id) };
    });
    const minutes = M.single ? Math.max(M.minutes, TRACK_MIN) : mp.minutes;
    segs.push({ id: mp.id, start, minutes, tracks });
    t += minutes;
  }
  return segs;
}

/** "15:00" → minutes past midnight at which the day's music starts (guests arrive before the ceremony). */
export function dayStart(ceremony: string, plan: MusicPlan) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(ceremony);
  const c = m ? +m[1] * 60 + +m[2] : 15 * 60;
  const arrival = plan.moments.find((x) => x.id === 'arrival');
  return c - (arrival?.on ? arrival.minutes : 0);
}
export const clock = (mins: number) => {
  const h = Math.floor(mins / 60) % 24,
    m = Math.round(mins % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
};

/** The first-dance song, if the curator has one. */
export function firstDanceSong(plan: MusicPlan): Song | undefined {
  return curate(plan).find((s) => s.id === 'firstdance')?.tracks[0];
}
/** Ceremony music for the order of service: processional, signing and recessional. */
export function ceremonyMusic(plan: MusicPlan): Partial<Record<'processional' | 'signing' | 'recessional', Song[]>> {
  const out: Partial<Record<'processional' | 'signing' | 'recessional', Song[]>> = {};
  for (const s of curate(plan)) if (s.id === 'processional' || s.id === 'signing' || s.id === 'recessional') out[s.id] = s.tracks;
  return out;
}

export const searchLinks = (s: Song) => {
  const q = encodeURIComponent(`${s.title} ${s.artist}`);
  return { spotify: `https://open.spotify.com/search/${q}`, youtube: `https://www.youtube.com/results?search_query=${q}` };
};

export function playlistCsv(plan: MusicPlan) {
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [['Moment', 'Title', 'Artist', 'Year']];
  for (const seg of curate(plan)) if (seg.id !== 'ceremony') for (const t of seg.tracks) rows.push([MOMENTS[seg.id].n, t.title, t.artist, String(t.year)]);
  return rows.map((r) => r.map(cell).join(',')).join('\n');
}

/* ------------------------------------------------------------------ sanitize */

const str = (v: unknown, d = '', max = 4000) => (typeof v === 'string' ? v.slice(0, max) : d);
export function sanitizeMusic(raw: unknown): MusicPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const d = defaultMusic();
  const ms = Array.isArray(o.moments) ? (o.moments as Array<Record<string, unknown>>) : [];
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 200) : []);
  const custom = Array.isArray(o.custom)
    ? (o.custom as Array<Record<string, unknown>>)
        .filter((c) => c && typeof c === 'object' && typeof c.title === 'string')
        .slice(0, 100)
        .map((c) => ({
          id: str(c.id, 'c:' + str(c.title), 120),
          title: str(c.title, '', 80),
          artist: str(c.artist, '', 80),
          year: typeof c.year === 'number' ? c.year : 2020,
          bpm: typeof c.bpm === 'number' ? c.bpm : 110,
          energy: typeof c.energy === 'number' ? Math.min(5, Math.max(1, Math.round(c.energy))) : 3,
          genres: [] as Genre[],
          moments: str(c.moments, 'x', 12),
        }))
    : [];
  return {
    format: typeof o.format === 'string' && o.format in FORMATS ? (o.format as Format) : d.format,
    genres: ids(o.genres).filter((g): g is Genre => g in GENRES),
    eras: ids(o.eras).filter((e): e is Era => e in ERAS),
    moments: MOMENT_ORDER.map((id, i) => {
      const m = ms.find((x) => x && x.id === id) ?? {};
      return {
        id,
        on: m.on !== false,
        minutes: typeof m.minutes === 'number' ? Math.min(360, Math.max(4, Math.round(m.minutes))) : MOMENTS[id].minutes,
        pins: ids(m.pins),
        bans: ids(m.bans),
        seed: typeof m.seed === 'number' ? m.seed : 11 + i,
      };
    }),
    mustPlay: str(o.mustPlay),
    doNotPlay: str(o.doNotPlay),
    custom,
  };
}
