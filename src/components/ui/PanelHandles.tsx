import { useEffect } from 'react';
import { useDesignStore, type PanelKey } from '../../store/designStore';
import { toggleFullscreen, useSideStudio } from '../../lib/fullscreen';

const LABEL: Record<PanelKey, string> = { catalogue: 'catalogue', panel: 'settings panel', strip: 'venue strip', side: 'side panel' };

/**
 * Minimise handles on the edge of each panel. A minimised panel slides off screen and leaves its handle at
 * the edge to bring it back. Also: F for full screen, H to hide or show the panels.
 */
export function PanelHandles() {
  const hidden = useDesignStore((s) => s.hidden);
  const toggle = useDesignStore((s) => s.togglePanel);
  const modal = useDesignStore((s) => s.modal);
  const main = !useDesignStore((s) => s.studio.open || s.cakeStudio.open || !!s.overlay);
  const side = useSideStudio();

  // Body classes drive the slide-away styles.
  useEffect(() => {
    const b = document.body.classList;
    b.toggle('hide-cat', hidden.catalogue);
    b.toggle('hide-panel', hidden.panel);
    b.toggle('hide-strip', hidden.strip);
    b.toggle('hide-side', hidden.side);
  }, [hidden]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const s = useDesignStore.getState();
      if (s.modal) return;
      const k = e.key.toLowerCase();
      if (k === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (k === 'h') {
        const inStudio = s.studio.open || s.cakeStudio.open || !!s.overlay;
        if (inStudio) {
          if (document.querySelector('.fs-side')) s.togglePanel('side');
        } else s.setAllPanels(!(s.hidden.catalogue && s.hidden.panel && s.hidden.strip));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handle = (k: PanelKey, cls: string, glyph: [string, string]) => (
    <button key={k} type="button" className={`ph ${cls} ${hidden[k] ? 'min' : ''}`} aria-pressed={!hidden[k]} aria-label={`${hidden[k] ? 'Show' : 'Minimise'} the ${LABEL[k]}`} title={`${hidden[k] ? 'Show' : 'Minimise'} the ${LABEL[k]}`} onClick={() => toggle(k)}>
      {hidden[k] ? glyph[1] : glyph[0]}
    </button>
  );

  if (modal) return null;
  if (side) return handle('side', 'ph-side', ['›', '‹']);
  if (!main) return null;
  return (
    <>
      {handle('catalogue', 'ph-cat', ['‹', '›'])}
      {handle('panel', 'ph-panel', ['›', '‹'])}
      {handle('strip', 'ph-strip', ['⌄', '⌃'])}
    </>
  );
}
