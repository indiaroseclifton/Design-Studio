import type { Arrangement, Design } from '../types';

const DESIGNS_KEY = 'design-studio:saved-designs';
const PACKS_KEY = 'design-studio:packs';
const FLOWERS_KEY = 'design-studio:custom-flowers';

export interface SavedDesign {
  id: string;
  name: string;
  savedAt: number;
  design: Design;
  thumbnail: string | null;
}

export function loadSavedDesigns(): SavedDesign[] {
  try {
    const raw = localStorage.getItem(DESIGNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedDesigns(designs: SavedDesign[]) {
  try {
    localStorage.setItem(DESIGNS_KEY, JSON.stringify(designs));
  } catch {
    // localStorage can throw if full or unavailable (e.g. private browsing) — ignore, it's non-critical
  }
}

export function loadEnabledPacks(): string[] {
  try {
    const raw = localStorage.getItem(PACKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistEnabledPacks(packs: string[]) {
  try {
    localStorage.setItem(PACKS_KEY, JSON.stringify(packs));
  } catch {
    // ignore
  }
}

export function loadCustomFlowers(): Arrangement[] {
  try {
    const raw = localStorage.getItem(FLOWERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistCustomFlowers(arrangements: Arrangement[]) {
  try {
    localStorage.setItem(FLOWERS_KEY, JSON.stringify(arrangements));
  } catch {
    // ignore
  }
}
