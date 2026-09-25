import { useEffect } from 'react';
import { VENUES } from '../data/venues';
import { normalizeDesign, useDesignStore } from '../store/designStore';
import { ungz64 } from './storage';

/** Opens a design shared as `#d=<gzip+base64url>` and then clears the hash so a reload doesn't re-apply it. */
export function useShareLink() {
  useEffect(() => {
    const m = location.hash.match(/^#d=([\w-]+)$/);
    if (!m) return;
    const { loadDesign, showToast } = useDesignStore.getState();
    ungz64(m[1])
      .then((text) => {
        const raw = JSON.parse(text);
        const clean = normalizeDesign(raw);
        if (!clean) throw new Error('not a design');
        const byName = typeof raw.venueName === 'string' ? VENUES.findIndex((v) => v.name === raw.venueName) : -1;
        loadDesign(byName >= 0 ? { ...clean, venue: byName } : clean);
        showToast('Opened a shared design', true);
      })
      .catch(() => showToast('That share link could not be opened'))
      .finally(() => history.replaceState(null, '', location.pathname + location.search));
  }, []);
}
