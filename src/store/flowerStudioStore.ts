import { create } from 'zustand';
import type { Arrangement } from '../types';
import { FLOWER_PRESETS, arrangementToItem, newArrangement } from '../data/flowerStudio';
import { ITEMS } from '../data/catalogue';
import { loadCustomFlowers, persistCustomFlowers } from '../lib/storage';

interface FlowerStudioState {
  isOpen: boolean;
  draft: Arrangement | null;
  editingId: string | null;
  customFlowers: Arrangement[];

  open: (existing?: Arrangement) => void;
  close: () => void;
  setName: (name: string) => void;
  setVessel: (id: string) => void;
  setFinish: (id: string) => void;
  setShape: (id: string) => void;
  setSize: (n: number) => void;
  applyPreset: (presetId: string) => void;
  addStem: (typeId: string) => void;
  removeStem: (typeId: string) => void;
  setStemCount: (typeId: string, n: number) => void;
  setStemColor: (typeId: string, color: string | undefined) => void;
  addGreenery: (typeId: string) => void;
  removeGreenery: (typeId: string) => void;
  setGreeneryCount: (typeId: string, n: number) => void;
  shuffle: () => void;
  saveDraft: () => string;
  deleteCustomFlower: (id: string) => void;
}

function registerFlowerItem(a: Arrangement) {
  ITEMS[a.id] = arrangementToItem(a);
}

const initialFlowers = loadCustomFlowers();
initialFlowers.forEach(registerFlowerItem);

export const useFlowerStudioStore = create<FlowerStudioState>((set, get) => ({
  isOpen: false,
  draft: null,
  editingId: null,
  customFlowers: initialFlowers,

  open: (existing) => {
    set({
      isOpen: true,
      draft: existing ? { ...existing, stems: existing.stems.map((s) => ({ ...s })), greenery: existing.greenery.map((g) => ({ ...g })) } : newArrangement(),
      editingId: existing?.id ?? null,
    });
  },
  close: () => set({ isOpen: false, draft: null, editingId: null }),

  setName: (name) => set((s) => (s.draft ? { draft: { ...s.draft, name } } : s)),
  setVessel: (id) => set((s) => (s.draft ? { draft: { ...s.draft, vessel: id } } : s)),
  setFinish: (id) => set((s) => (s.draft ? { draft: { ...s.draft, finish: id } } : s)),
  setShape: (id) => set((s) => (s.draft ? { draft: { ...s.draft, shape: id } } : s)),
  setSize: (n) => set((s) => (s.draft ? { draft: { ...s.draft, size: n } } : s)),

  applyPreset: (presetId) => {
    const preset = FLOWER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    set((s) => {
      if (!s.draft) return s;
      return {
        draft: {
          ...s.draft,
          vessel: preset.vessel,
          finish: preset.finish,
          shape: preset.shape,
          stems: preset.stems.map((st) => ({ ...st })),
          greenery: preset.greenery.map((g) => ({ ...g })),
        },
      };
    });
  },

  addStem: (typeId) =>
    set((s) => {
      if (!s.draft) return s;
      const existing = s.draft.stems.find((st) => st.type === typeId);
      const stems = existing
        ? s.draft.stems.map((st) => (st.type === typeId ? { ...st, n: st.n + 1 } : st))
        : [...s.draft.stems, { type: typeId, n: 1 }];
      return { draft: { ...s.draft, stems } };
    }),
  removeStem: (typeId) =>
    set((s) => (s.draft ? { draft: { ...s.draft, stems: s.draft.stems.filter((st) => st.type !== typeId) } } : s)),
  setStemCount: (typeId, n) =>
    set((s) => {
      if (!s.draft) return s;
      if (n <= 0) return { draft: { ...s.draft, stems: s.draft.stems.filter((st) => st.type !== typeId) } };
      return { draft: { ...s.draft, stems: s.draft.stems.map((st) => (st.type === typeId ? { ...st, n } : st)) } };
    }),
  setStemColor: (typeId, color) =>
    set((s) => (s.draft ? { draft: { ...s.draft, stems: s.draft.stems.map((st) => (st.type === typeId ? { ...st, color } : st)) } } : s)),

  addGreenery: (typeId) =>
    set((s) => {
      if (!s.draft) return s;
      const existing = s.draft.greenery.find((g) => g.type === typeId);
      const greenery = existing
        ? s.draft.greenery.map((g) => (g.type === typeId ? { ...g, n: g.n + 1 } : g))
        : [...s.draft.greenery, { type: typeId, n: 1 }];
      return { draft: { ...s.draft, greenery } };
    }),
  removeGreenery: (typeId) =>
    set((s) => (s.draft ? { draft: { ...s.draft, greenery: s.draft.greenery.filter((g) => g.type !== typeId) } } : s)),
  setGreeneryCount: (typeId, n) =>
    set((s) => {
      if (!s.draft) return s;
      if (n <= 0) return { draft: { ...s.draft, greenery: s.draft.greenery.filter((g) => g.type !== typeId) } };
      return { draft: { ...s.draft, greenery: s.draft.greenery.map((g) => (g.type === typeId ? { ...g, n } : g)) } };
    }),

  shuffle: () => set((s) => (s.draft ? { draft: { ...s.draft, seed: Math.floor(Math.random() * 1e6) } } : s)),

  saveDraft: () => {
    const { draft, editingId, customFlowers } = get();
    if (!draft) return '';
    const saved: Arrangement = { ...draft, id: editingId ?? draft.id };
    registerFlowerItem(saved);
    const next = editingId ? customFlowers.map((a) => (a.id === editingId ? saved : a)) : [saved, ...customFlowers];
    persistCustomFlowers(next);
    set({ customFlowers: next });
    return saved.id;
  },

  deleteCustomFlower: (id) => {
    const next = get().customFlowers.filter((a) => a.id !== id);
    persistCustomFlowers(next);
    delete ITEMS[id];
    set({ customFlowers: next });
  },
}));
