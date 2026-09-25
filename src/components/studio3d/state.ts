import { useEffect, useState } from 'react';

/* ------------------------------------------------------------------ history */

export interface Hist<D> {
  past: D[];
  now: D;
  future: D[];
}
export type HistAction<D> = { t: 'set'; d: D } | { t: 'undo' } | { t: 'redo' };
/** Undo/redo over whole drafts; identical drafts don't add a step. */
export function histReducer<D>(h: Hist<D>, a: HistAction<D>): Hist<D> {
  if (a.t === 'set') return JSON.stringify(a.d) === JSON.stringify(h.now) ? h : { past: [...h.past, h.now].slice(-60), now: a.d, future: [] };
  if (a.t === 'undo') return h.past.length ? { past: h.past.slice(0, -1), now: h.past[h.past.length - 1], future: [h.now, ...h.future] } : h;
  return h.future.length ? { past: [...h.past, h.now], now: h.future[0], future: h.future.slice(1) } : h;
}

export function useThumb(key: string, request: (cb: (url: string) => void) => () => void, cached: () => string | undefined) {
  const [thumb, setThumb] = useState<{ key: string; url: string } | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => request((url) => setThumb({ key, url })), [key]);
  return thumb?.key === key ? thumb.url : cached();
}

