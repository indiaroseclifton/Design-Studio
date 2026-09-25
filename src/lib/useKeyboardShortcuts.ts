import { useEffect } from 'react';
import { useDesignStore } from '../store/designStore';

export function useKeyboardShortcuts() {
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const select = useDesignStore((s) => s.select);
  const rotateSelected = useDesignStore((s) => s.rotateSelected);
  const duplicateSelected = useDesignStore((s) => s.duplicateSelected);
  const removeSelected = useDesignStore((s) => s.removeSelected);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }

      const selection = useDesignStore.getState().selection;
      if (e.key === 'Escape') {
        select(null);
        return;
      }
      if (!selection) return;

      if (selection.k === 'multi' && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        removeSelected();
        return;
      }
      if (selection.k === 'table') {
        if (e.key === 'q' || e.key === 'Q') rotateSelected(-1);
        else if (e.key === 'e' || e.key === 'E') rotateSelected(1);
        return;
      }
      if (selection.k !== 'item') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSelected();
      } else if (e.key === 'q' || e.key === 'Q') {
        rotateSelected(-1);
      } else if (e.key === 'e' || e.key === 'E') {
        rotateSelected(1);
      } else if (e.key === 'd' || e.key === 'D') {
        duplicateSelected();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, select, rotateSelected, duplicateSelected, removeSelected]);
}
