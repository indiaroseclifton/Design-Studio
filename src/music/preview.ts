import { useSyncExternalStore } from 'react';

/*
 * 30-second song previews, played inside the app. Previews and artwork come from Apple's public iTunes
 * Search API (no account or key needed). Lookups are cached per song, one clip plays at a time, and the
 * player links to the full track on Apple Music, as Apple's terms for previews ask.
 */

export interface PreviewInfo {
  previewUrl: string;
  /** album artwork, ~300px */
  artwork: string;
  /** the track on Apple Music */
  trackUrl: string;
}
interface SongRef {
  id: string;
  title: string;
  artist: string;
}

const API = 'https://itunes.apple.com/search';
const CACHE_KEY = 'vs2_previews';
const MISS = 'none';

/* ------------------------------------------------------------------ lookup */

let memo: Record<string, PreviewInfo | typeof MISS> | null = null;
function cache() {
  if (!memo) {
    try {
      memo = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') ?? {};
    } catch {
      memo = {};
    }
  }
  return memo!;
}
function remember(id: string, v: PreviewInfo | typeof MISS) {
  const c = cache();
  c[id] = v;
  try {
    // Keep the cache small: the most recent 400 lookups.
    const keys = Object.keys(c);
    for (const k of keys.slice(0, Math.max(0, keys.length - 400))) delete c[k];
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* storage full or blocked: the in-memory cache still works */
  }
}

interface ItunesResult {
  trackName?: string;
  artistName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
}

/**
 * Search, directly or (if the browser refuses the cross-site request) by JSONP, which Apple also supports.
 * Null when the service couldn't be reached, as opposed to no results.
 */
async function search(term: string): Promise<ItunesResult[] | null> {
  const qs = `term=${encodeURIComponent(term)}&media=music&entity=song&limit=8`;
  try {
    const r = await fetch(`${API}?${qs}`);
    if (!r.ok) throw new Error(String(r.status));
    return ((await r.json()) as { results?: ItunesResult[] }).results ?? [];
  } catch {
    return jsonp(`${API}?${qs}`);
  }
}
let jsonpN = 0;
function jsonp(url: string): Promise<ItunesResult[] | null> {
  return new Promise((resolve) => {
    const name = `__vsPreview${jsonpN++}`;
    const s = document.createElement('script');
    const w = window as unknown as Record<string, unknown>;
    const done = (res: ItunesResult[] | null) => {
      delete w[name];
      s.remove();
      clearTimeout(t);
      resolve(res);
    };
    const t = setTimeout(() => done(null), 8000);
    w[name] = (d: { results?: ItunesResult[] }) => done(d?.results ?? []);
    s.src = `${url}&callback=${name}`;
    s.onerror = () => done(null);
    document.head.appendChild(s);
  });
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** The result that best matches the title and artist (not a cover or karaoke version). */
function best(results: ItunesResult[], song: SongRef): ItunesResult | undefined {
  const t = norm(song.title),
    a = norm(song.artist).split(' ')[0];
  const score = (r: ItunesResult) => {
    const rt = norm(r.trackName ?? ''),
      ra = norm(r.artistName ?? '');
    let s = 0;
    if (rt === t) s += 4;
    else if (rt.startsWith(t) || t.startsWith(rt)) s += 2;
    if (a && ra.includes(a)) s += 3;
    if (/karaoke|tribute|cover|instrumental|lullaby/.test(`${rt} ${ra}`)) s -= 4;
    return s;
  };
  return results.filter((r) => r.previewUrl).sort((x, y) => score(y) - score(x))[0];
}

const inflight = new Map<string, Promise<PreviewInfo | null>>();
/** The preview for a song, from the cache or the iTunes Search API; null when there isn't one. */
export function lookupPreview(song: SongRef): Promise<PreviewInfo | null> {
  const hit = cache()[song.id];
  if (hit) return Promise.resolve(hit === MISS ? null : hit);
  let p = inflight.get(song.id);
  if (!p) {
    p = search(`${song.title} ${song.artist}`)
      .then((res) => {
        if (!res) return null; // unreachable: try again next time
        const r = best(res, song);
        const info: PreviewInfo | null = r?.previewUrl
          ? { previewUrl: r.previewUrl, artwork: (r.artworkUrl100 ?? '').replace('100x100', '300x300'), trackUrl: r.trackViewUrl ?? '' }
          : null;
        remember(song.id, info ?? MISS);
        return info;
      })
      .catch(() => null)
      .finally(() => inflight.delete(song.id));
    inflight.set(song.id, p);
  }
  return p;
}
/** Cached artwork for a song, if it has been looked up. */
export function cachedArtwork(id: string): string | undefined {
  const v = cache()[id];
  return v && v !== MISS ? v.artwork : undefined;
}

/* ------------------------------------------------------------------ player */

export interface PlayerState {
  /** the song playing (or loading) */
  song: SongRef | null;
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'unavailable';
  info: PreviewInfo | null;
  /** 0–1 through the clip */
  progress: number;
}
let state: PlayerState = { song: null, status: 'idle', info: null, progress: 0 };
const subs = new Set<() => void>();
const set = (p: Partial<PlayerState>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
};
let audio: HTMLAudioElement | null = null;
function el() {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('timeupdate', () => audio!.duration && set({ progress: audio!.currentTime / audio!.duration }));
    audio.addEventListener('ended', () => set({ status: 'paused', progress: 1 }));
    audio.addEventListener('pause', () => state.status === 'playing' && set({ status: 'paused' }));
    audio.addEventListener('play', () => set({ status: 'playing' }));
  }
  return audio;
}

/** Play a song's preview, or pause/resume it if it's the current one. */
export async function togglePreview(song: SongRef) {
  const a = el();
  if (state.song?.id === song.id && state.info) {
    if (a.paused) {
      if (a.ended) a.currentTime = 0;
      void a.play().catch(() => set({ status: 'paused' }));
    } else a.pause();
    return;
  }
  a.pause();
  set({ song, status: 'loading', info: null, progress: 0 });
  const info = await lookupPreview(song);
  // Another song may have been chosen while this one was looking up.
  if (state.song?.id !== song.id) return;
  if (!info) return set({ status: 'unavailable', info: null });
  set({ info });
  a.src = info.previewUrl;
  a.currentTime = 0;
  try {
    await a.play();
  } catch {
    if (state.song?.id === song.id) set({ status: 'unavailable' });
  }
}
export function stopPreview() {
  audio?.pause();
  set({ song: null, status: 'idle', info: null, progress: 0 });
}
export function seekPreview(f: number) {
  if (audio?.duration) audio.currentTime = Math.max(0, Math.min(1, f)) * audio.duration;
}

/** The player's state right now, outside React (e.g. in a key handler). */
export const previewState = () => state;

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};
/**
 * Changes only when the song, its status or its artwork does, not on every progress tick, so a big view
 * can re-render its record labels when artwork arrives without re-rendering four times a second.
 */
export const usePreviewKey = () => useSyncExternalStore(subscribe, () => `${state.song?.id ?? ''}|${state.status}|${state.info?.artwork ?? ''}`);

export const usePreview = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
    () => state,
  );
