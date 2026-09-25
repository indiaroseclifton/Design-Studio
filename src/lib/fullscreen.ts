import { useSyncExternalStore } from 'react';
import { useDesignStore } from '../store/designStore';

/** True while the page is in the browser's full-screen mode. */
export const useFullscreen = () =>
  useSyncExternalStore(
    (cb) => {
      document.addEventListener('fullscreenchange', cb);
      return () => document.removeEventListener('fullscreenchange', cb);
    },
    () => !!document.fullscreenElement,
    () => false,
  );

/**
 * Enter or leave full screen. Where the browser doesn't allow it (iPhone Safari), minimise the panels
 * instead, so the scene still gets the whole screen.
 */
export function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
    return;
  }
  const s = useDesignStore.getState();
  const fallback = () => {
    s.setAllPanels(true);
    s.showToast('Full screen isn’t available in this browser, so the panels are minimised instead');
  };
  if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) return fallback();
  document.documentElement.requestFullscreen().catch(fallback);
}

/** The full-screen editors that have a side panel which can be minimised. */
export const useSideStudio = () => useDesignStore((s) => s.studio.open || s.cakeStudio.open || s.overlay === 'stationery' || s.overlay === 'menu' || s.overlay === 'music' || s.overlay === 'attire');
