import { create } from 'zustand';
import type { Accent, CameraPreset, Design, Mood, PlacedItem, Selection, TableLayout, TimeOfDay, UIMode, Weather } from '../types';
import { ITEMS } from '../data/catalogue';
import { captureSceneSnapshot } from '../three/snapshot';
import {
  loadEnabledPacks,
  loadSavedDesigns,
  persistEnabledPacks,
  persistSavedDesigns,
  type SavedDesign,
} from '../lib/storage';

const DEFAULT_DESIGN: Design = {
  venue: 0,
  time: 'venue',
  wx: 'clear',
  table: { layout: 'round', guests: 8, mirror: true, rot: 0 },
  items: [],
  palette: 'ivory',
  customPalette: [],
};

const MAX_HISTORY = 50;

interface ToastState {
  msg: string;
  undoable?: boolean;
}

interface PlaceItemInput {
  type: string;
  x: number;
  z: number;
  rot?: number;
  t?: number;
  on?: string;
}

export type ModalName = 'designs' | 'quote' | 'addons';

interface StoreState {
  design: Design;
  history: Design[];
  future: Design[];
  selection: Selection;
  tweaks: { mood: Mood; ui: UIMode; accent: Accent };
  motion: boolean;
  autoRotate: boolean;
  cameraPreset: CameraPreset;
  planView: boolean;
  showZone: boolean;
  toast: ToastState | null;
  comingSoon: string | null;
  modal: ModalName | null;
  search: string;
  activeCategory: string | null;
  packsOn: string[];
  savedDesigns: SavedDesign[];
  quoteSettings: { servicePct: number; taxPct: number };

  setVenue: (i: number) => void;
  setTime: (t: TimeOfDay) => void;
  setWeather: (w: Weather) => void;
  setLayout: (l: TableLayout) => void;
  setGuests: (n: number) => void;
  toggleMirror: () => void;
  setPalette: (id: string) => void;

  placeItem: (input: PlaceItemInput) => string;
  removeItem: (id: string) => void;
  moveItem: (id: string, x: number, z: number) => void;
  rotateItem: (id: string, dir: 1 | -1) => void;
  duplicateItem: (id: string) => void;
  setItemColor: (id: string, color: string | undefined) => void;
  setItemPalette: (id: string, pal: string | undefined) => void;
  setItemText: (id: string, text: string) => void;
  clearAll: () => void;

  select: (sel: Selection) => void;
  rotateSelected: (dir: 1 | -1) => void;
  duplicateSelected: () => void;
  removeSelected: () => void;

  undo: () => void;
  redo: () => void;

  setTweak: <K extends keyof StoreState['tweaks']>(key: K, value: StoreState['tweaks'][K]) => void;
  setMotion: (on: boolean) => void;
  setAutoRotate: (on: boolean) => void;
  setCameraPreset: (p: CameraPreset) => void;
  setPlanView: (on: boolean) => void;
  setShowZone: (on: boolean) => void;

  showToast: (msg: string, undoable?: boolean) => void;
  dismissToast: () => void;
  showComingSoon: (name: string) => void;
  dismissComingSoon: () => void;
  openModal: (name: ModalName) => void;
  closeModal: () => void;

  setSearch: (s: string) => void;
  setCategory: (c: string | null) => void;

  togglePack: (id: string) => void;

  saveDesign: (name: string) => void;
  loadDesign: (id: string) => void;
  renameDesign: (id: string, name: string) => void;
  deleteDesign: (id: string) => void;
  importDesign: (design: Design) => void;

  setQuoteSetting: (key: keyof StoreState['quoteSettings'], value: number) => void;
}

function snapshot(d: Design): Design {
  return JSON.parse(JSON.stringify(d));
}

export const useDesignStore = create<StoreState>((set, get) => {
  function commit(mutator: (d: Design) => Design) {
    const { design, history } = get();
    const next = mutator(snapshot(design));
    const nextHistory = [...history, snapshot(design)].slice(-MAX_HISTORY);
    set({ design: next, history: nextHistory, future: [] });
  }

  return {
    design: DEFAULT_DESIGN,
    history: [],
    future: [],
    selection: null,
    tweaks: { mood: 'natural', ui: 'studio', accent: 'champagne' },
    motion: true,
    autoRotate: false,
    cameraPreset: 'wide',
    planView: false,
    showZone: false,
    toast: null,
    comingSoon: null,
    modal: null,
    search: '',
    activeCategory: null,
    packsOn: loadEnabledPacks(),
    savedDesigns: loadSavedDesigns(),
    quoteSettings: { servicePct: 20, taxPct: 8 },

    setVenue: (i) => commit((d) => ({ ...d, venue: i })),
    setTime: (t) => commit((d) => ({ ...d, time: t })),
    setWeather: (w) => commit((d) => ({ ...d, wx: w })),
    setLayout: (l) => commit((d) => ({ ...d, table: { ...d.table, layout: l } })),
    setGuests: (n) => commit((d) => ({ ...d, table: { ...d.table, guests: n } })),
    toggleMirror: () => commit((d) => ({ ...d, table: { ...d.table, mirror: !d.table.mirror } })),
    setPalette: (id) => commit((d) => ({ ...d, palette: id })),

    placeItem: (input) => {
      const id = crypto.randomUUID();
      commit((d) => ({
        ...d,
        items: [...d.items, { id, type: input.type, x: input.x, z: input.z, rot: input.rot ?? 0, t: input.t, on: input.on }],
      }));
      set({ selection: { k: 'item', id } });
      return id;
    },
    removeItem: (id) =>
      commit((d) => ({ ...d, items: d.items.filter((i) => i.id !== id && i.on !== id) })),
    moveItem: (id, x, z) =>
      commit((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, x, z } : i)) })),
    rotateItem: (id, dir) =>
      commit((d) => ({
        ...d,
        items: d.items.map((i) => (i.id === id ? { ...i, rot: i.rot + dir * (Math.PI / 12) } : i)),
      })),
    duplicateItem: (id) => {
      const newId = crypto.randomUUID();
      commit((d) => {
        const src = d.items.find((i) => i.id === id);
        if (!src) return d;
        return { ...d, items: [...d.items, { ...src, id: newId, x: src.x + 0.15, z: src.z + 0.15 }] };
      });
      set({ selection: { k: 'item', id: newId } });
    },
    setItemColor: (id, color) =>
      commit((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, color } : i)) })),
    setItemPalette: (id, pal) =>
      commit((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, pal } : i)) })),
    setItemText: (id, text) =>
      commit((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, text } : i)) })),
    clearAll: () => {
      commit((d) => ({ ...d, items: [] }));
      set({ selection: null });
    },

    select: (sel) => set({ selection: sel }),
    rotateSelected: (dir) => {
      const sel = get().selection;
      if (sel?.k === 'item') get().rotateItem(sel.id, dir);
    },
    duplicateSelected: () => {
      const sel = get().selection;
      if (sel?.k === 'item') get().duplicateItem(sel.id);
    },
    removeSelected: () => {
      const sel = get().selection;
      if (sel?.k === 'item') {
        get().removeItem(sel.id);
        set({ selection: null });
      }
    },

    undo: () => {
      const { history, design, future } = get();
      if (!history.length) return;
      const prev = history[history.length - 1];
      set({
        design: prev,
        history: history.slice(0, -1),
        future: [snapshot(design), ...future].slice(0, MAX_HISTORY),
        selection: null,
      });
    },
    redo: () => {
      const { future, design, history } = get();
      if (!future.length) return;
      const next = future[0];
      set({
        design: next,
        future: future.slice(1),
        history: [...history, snapshot(design)].slice(-MAX_HISTORY),
        selection: null,
      });
    },

    setTweak: (key, value) => set((s) => ({ tweaks: { ...s.tweaks, [key]: value } })),
    setMotion: (on) => set({ motion: on }),
    setAutoRotate: (on) => set({ autoRotate: on }),
    setCameraPreset: (p) => set({ cameraPreset: p, planView: false }),
    setPlanView: (on) => set({ planView: on }),
    setShowZone: (on) => set({ showZone: on }),

    showToast: (msg, undoable) => set({ toast: { msg, undoable } }),
    dismissToast: () => set({ toast: null }),
    showComingSoon: (name) => set({ comingSoon: name }),
    dismissComingSoon: () => set({ comingSoon: null }),
    openModal: (name) => set({ modal: name }),
    closeModal: () => set({ modal: null }),

    setSearch: (s) => set({ search: s }),
    setCategory: (c) => set({ activeCategory: c }),

    togglePack: (id) => {
      const next = get().packsOn.includes(id) ? get().packsOn.filter((p) => p !== id) : [...get().packsOn, id];
      persistEnabledPacks(next);
      set({ packsOn: next });
    },

    saveDesign: (name) => {
      const entry: SavedDesign = {
        id: crypto.randomUUID(),
        name: name.trim() || 'Untitled design',
        savedAt: Date.now(),
        design: snapshot(get().design),
        thumbnail: captureSceneSnapshot(),
      };
      const next = [entry, ...get().savedDesigns];
      persistSavedDesigns(next);
      set({ savedDesigns: next });
      get().showToast('Design saved');
    },
    loadDesign: (id) => {
      const entry = get().savedDesigns.find((d) => d.id === id);
      if (!entry) return;
      commit(() => snapshot(entry.design));
      set({ selection: null, modal: null });
      get().showToast(`Loaded “${entry.name}”`);
    },
    renameDesign: (id, name) => {
      const next = get().savedDesigns.map((d) => (d.id === id ? { ...d, name: name.trim() || d.name } : d));
      persistSavedDesigns(next);
      set({ savedDesigns: next });
    },
    deleteDesign: (id) => {
      const next = get().savedDesigns.filter((d) => d.id !== id);
      persistSavedDesigns(next);
      set({ savedDesigns: next });
    },
    importDesign: (design) => {
      commit(() => snapshot(design));
      set({ selection: null });
      get().showToast('Design imported');
    },

    setQuoteSetting: (key, value) => set((s) => ({ quoteSettings: { ...s.quoteSettings, [key]: value } })),
  };
});

export function hostOf(items: PlacedItem[], it: PlacedItem): PlacedItem | null {
  if (!it.on) return null;
  const host = items.find((i) => i.id === it.on);
  if (!host) return null;
  return ITEMS[host.type]?.top ? host : null;
}

export function isStackable(typeId: string): boolean {
  const def = ITEMS[typeId];
  if (!def) return false;
  if (def.surf === 'table') return true;
  if (def.surf === 'floor') return def.fp <= 0.5 && def.group !== 'lounge' && def.sec !== 'Structures';
  return false;
}
