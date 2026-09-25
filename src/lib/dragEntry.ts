import type { Entry } from '../engine/catalogue';

/** The catalogue entry being dragged onto the scene (HTML drag data can't carry the object itself). */
let current: Entry | null = null;
export const DRAG_MIME = 'application/x-studio-entry';
export const setDragEntry = (e: Entry | null) => {
  current = e;
};
export const dragEntry = () => current;
