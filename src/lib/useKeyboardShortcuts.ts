import { useEffect } from 'react';
import { useDesignStore } from '../store/designStore';

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Studio shortcuts from the handoff: Esc, Q/E rotate, D duplicate, Delete remove, Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo.
 * Venue switching on ArrowLeft/Right is deliberately left out — the handoff flags it as the likely cause of unexpected venue changes.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const s = useDesignStore.getState();

      // The Flower Studio handles its own keys (Esc with a discard check, and its own undo).
      // The studios and the Storybook handle their own keys.
      if (s.studio.open || s.cakeStudio.open || s.overlay === 'storybook' || s.overlay === 'stationery' || s.overlay === 'menu' || s.overlay === 'music' || s.overlay === 'attire') return;
      if (s.overlay) {
        if (e.key === 'Escape') s.closeOverlay();
        return;
      }
      if (e.key === 'Escape') {
        if (s.modal) s.closeModal();
        else if (s.tweaks.ui === 'cinematic') s.setTweak('ui', 'studio');
        else if (s.planView) s.setPlanView(false);
        else s.select(null);
        return;
      }
      if (isTyping(e.target) || s.modal) return;

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        s.redo();
        return;
      }
      if (mod || e.altKey) return;
      const k = s.selection?.k;
      // Q/E rotate a selected piece or table; D duplicates; Delete removes a piece or a multi-selection.
      if ((k === 'item' || k === 'table') && key === 'q') s.rotateSelected(1);
      else if ((k === 'item' || k === 'table') && key === 'e') s.rotateSelected(-1);
      else if (k === 'item' && key === 'd') s.duplicateSelected();
      else if ((k === 'item' || k === 'multi') && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        s.removeSelected();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
