import { useEffect } from 'react';
import { ACCENTS } from '../data/palettes';
import { useDesignStore } from '../store/designStore';

/** Mirrors the accent and interface-mode tweaks onto the document so plain CSS can react to them. */
export function useApplyTweaks() {
  const accent = useDesignStore((s) => s.tweaks.accent);
  const ui = useDesignStore((s) => s.tweaks.ui);
  const motion = useDesignStore((s) => s.motion);

  useEffect(() => {
    const a = ACCENTS[accent] ?? ACCENTS.champagne;
    const root = document.documentElement.style;
    root.setProperty('--ac', a.ac);
    root.setProperty('--acr', a.acr);
    root.setProperty('--ac2', a.ac2);
  }, [accent]);

  useEffect(() => {
    const body = document.body.classList;
    body.toggle('ui-focus', ui === 'focus');
    body.toggle('ui-cinematic', ui === 'cinematic');
    body.toggle('nomo', !motion);
  }, [ui, motion]);
}
