import { useEffect } from 'react';
import { useDesignStore } from '../store/designStore';
import { normalizeDesign } from './designFormat';
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
        // normalizeDesign resolves the venue by name when the link carries one.
        const clean = normalizeDesign(raw);
        if (!clean) throw new Error('not a design');
        loadDesign(clean);
        showToast('Opened a shared design', true);
      })
      .catch(() => showToast('That share link could not be opened'))
      .finally(() => history.replaceState(null, '', location.pathname + location.search));
  }, []);
}
