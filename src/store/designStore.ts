import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Accent, CameraPreset, Design, Mood, PlacedItem, Selection, TableLayout, TimeOfDay, UIMode, Weather } from '../types';
import { ITEMS } from '../data/catalogue';
import { VENUES } from '../data/venues';

export type ModalKind = 'designs' | 'quote';

export const DEFAULT_DESIGN: Design = {
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

interface StoreState {
  design: Design;
  history: Design[];
  future: Design[];
  selection: Selection;
  tweaks: { mood: Mood; ui: UIMode; accent: Accent };
  motion: boolean;
  autoRotate: boolean;
  cameraPreset: CameraPreset;
  /** bumped on every preset request so "Reset camera" re-runs even when the preset is unchanged */
  cameraNonce: number;
  planView: boolean;
  modal: ModalKind | null;
  showZone: boolean;
  toast: ToastState | null;
  comingSoon: string | null;
  search: string;
  activeCategory: string | null;

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
  loadDesign: (d: Design) => void;

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
  openModal: (m: ModalKind) => void;
  closeModal: () => void;

  showToast: (msg: string, undoable?: boolean) => void;
  dismissToast: () => void;
  showComingSoon: (name: string) => void;
  dismissComingSoon: () => void;

  setSearch: (s: string) => void;
  setCategory: (c: string | null) => void;
}

function snapshot(d: Design): Design {
  return JSON.parse(JSON.stringify(d));
}

// Declared before the store: persist hydrates synchronously from localStorage inside create().
const LAYOUTS: TableLayout[] = ['round', 'banquet', 'ceremony', 'none'];
const TIMES: TimeOfDay[] = ['venue', 'day', 'golden', 'night'];
const WEATHERS: Weather[] = ['clear', 'rain', 'snow'];
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/**
 * Coerce untrusted JSON (localStorage, an imported file) into a valid Design, dropping unknown catalogue items.
 * Returns null when the input isn't recognisably a design.
 */
export function normalizeDesign(raw: unknown): Design | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.items) || !o.table || typeof o.table !== 'object') return null;
  const t = o.table as Record<string, unknown>;
  const items: PlacedItem[] = [];
  for (const it of o.items as Array<Record<string, unknown>>) {
    if (!it || typeof it !== 'object' || typeof it.type !== 'string' || !ITEMS[it.type]) continue;
    items.push({
      id: typeof it.id === 'string' ? it.id : crypto.randomUUID(),
      type: it.type,
      x: num(it.x, 0),
      z: num(it.z, 0),
      rot: num(it.rot, 0),
      pal: typeof it.pal === 'string' ? it.pal : undefined,
      color: typeof it.color === 'string' ? it.color : undefined,
      text: typeof it.text === 'string' ? it.text : undefined,
      on: typeof it.on === 'string' ? it.on : undefined,
      t: typeof it.t === 'number' ? it.t : undefined,
    });
  }
  const ids = new Set(items.map((i) => i.id));
  return {
    venue: Math.min(VENUES.length - 1, Math.max(0, Math.floor(num(o.venue, 0)))),
    time: TIMES.includes(o.time as TimeOfDay) ? (o.time as TimeOfDay) : 'venue',
    wx: WEATHERS.includes(o.wx as Weather) ? (o.wx as Weather) : 'clear',
    table: {
      layout: LAYOUTS.includes(t.layout as TableLayout) ? (t.layout as TableLayout) : 'round',
      guests: Math.min(160, Math.max(1, Math.round(num(t.guests, 8)))),
      mirror: typeof t.mirror === 'boolean' ? t.mirror : true,
      linen: typeof t.linen === 'string' ? t.linen : undefined,
      rot: num(t.rot, 0),
    },
    // Children whose host didn't survive would otherwise be orphaned off-surface.
    items: items.filter((i) => !i.on || ids.has(i.on)),
    palette: typeof o.palette === 'string' ? o.palette : DEFAULT_DESIGN.palette,
    customPalette: Array.isArray(o.customPalette) ? o.customPalette.filter((c): c is string => typeof c === 'string') : [],
  };
}

export const useDesignStore = create<StoreState>()(
  persist(
    (set, get) => {
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
        cameraNonce: 0,
        planView: false,
        modal: null,
        showZone: false,
        toast: null,
        comingSoon: null,
        search: '',
        activeCategory: null,

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
        removeItem: (id) => commit((d) => ({ ...d, items: d.items.filter((i) => i.id !== id && i.on !== id) })),
        moveItem: (id, x, z) => commit((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, x, z } : i)) })),
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
        setItemColor: (id, color) => commit((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, color } : i)) })),
        setItemPalette: (id, pal) => commit((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, pal } : i)) })),
        setItemText: (id, text) => commit((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, text } : i)) })),
        clearAll: () => {
          commit((d) => ({ ...d, items: [] }));
          set({ selection: null });
        },
        loadDesign: (loaded) => {
          commit(() => snapshot(loaded));
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
        setCameraPreset: (p) => set((s) => ({ cameraPreset: p, cameraNonce: s.cameraNonce + 1, planView: false })),
        setPlanView: (on) => set({ planView: on }),
        setShowZone: (on) => set({ showZone: on }),
        openModal: (m) => set({ modal: m, comingSoon: null }),
        closeModal: () => set({ modal: null }),

        showToast: (msg, undoable) => set({ toast: { msg, undoable } }),
        dismissToast: () => set({ toast: null }),
        showComingSoon: (name) => set({ comingSoon: name }),
        dismissComingSoon: () => set({ comingSoon: null }),

        setSearch: (s) => set({ search: s }),
        setCategory: (c) => set({ activeCategory: c }),
      };
    },
    {
      name: 'vs2_state',
      version: 1,
      // Only the design and the viewer's preferences survive a reload; history, selection and UI state don't.
      partialize: (s) => ({ design: s.design, tweaks: s.tweaks, motion: s.motion }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Pick<StoreState, 'design' | 'tweaks' | 'motion'>>;
        return {
          ...current,
          design: normalizeDesign(p.design) ?? current.design,
          tweaks: { ...current.tweaks, ...p.tweaks },
          motion: p.motion ?? current.motion,
        };
      },
    },
  ),
);

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
