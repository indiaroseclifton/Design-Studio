import { useEffect } from 'react';
import { ACCENTS } from '../data/palettes';
import { useDesignStore } from '../store/designStore';

/** Mirrors the accent and interface-mode tweaks onto the document so plain CSS can react to them. */
export function useApplyTweaks() {
  const accent = useDesignStore((s) => s.tweaks.accent);
  const ui = useDesignStore((s) => s.tweaks.ui);
  const motion = useDesignStore((s) => s.motion);
  const studio = useDesignStore((s) => s.studio.open);

  useEffect(() => {
    const a = ACCENTS[accent] ?? ACCENTS.champagne;
    const root = document.documentElement.style;
    root.setProperty('--ac', a.ac);
    root.setProperty('--acr', a.acr);
    root.setProperty('--ac2', a.ac2);
  }, [accent]);

  useEffect(() => {
    const body = document.body.classList;
    // Focus and Cinematic modes don't apply while the Flower Studio is open (as in the prototype).
    body.toggle('ui-focus', ui === 'focus' && !studio);
    body.toggle('ui-cinematic', ui === 'cinematic' && !studio);
    body.toggle('fs-on', studio);
    body.toggle('nomo', !motion);
  }, [ui, motion, studio]);
}
