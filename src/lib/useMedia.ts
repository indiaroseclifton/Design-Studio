import { useSyncExternalStore } from 'react';

/** True while the media query matches; re-renders when it changes. */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Phones and small tablets (the handoff's ≤860px layout): the side panels become drawers. */
export const SMALL = '(max-width: 860px)';
export const useSmall = () => useMedia(SMALL);
