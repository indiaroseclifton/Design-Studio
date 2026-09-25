import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Accent, CameraPreset, Design, Mood, PlacedItem, Quality, Selection, TableConfig, TableLayout, TimeOfDay, UIMode, Weather } from '../types';
import { ITEMS } from '../engine/catalogue';
import type { Entry } from '../engine/catalogue';
import { CHAIRS } from '../engine/studio';
import { DEFAULT_DESIGN, normalizeDesign } from '../lib/designFormat';
import * as ops from '../lib/designOps';
import { customKey, loadCustom, registerCustom, saveCustomList, type SavedArrangement } from '../engine/flowers';
import { forgetThumbs } from '../three/thumbnail';

export type ModalKind = 'designs' | 'quote' | 'addons';

const MAX_HISTORY = 80;

interface ToastState {
  msg: string;
  undoable?: boolean;
  /** bumps so the same message re-triggers the timer */
  n: number;
}

interface StoreState {
  design: Design;
  history: Design[];
  future: Design[];
  selection: Selection;
  tweaks: { mood: Mood; ui: UIMode; accent: Accent; quality: Quality };
  motion: boolean;
  autoRotate: boolean;
  cameraPreset: CameraPreset;
  /** bumped on every preset request so "Reset camera" re-runs even when the preset is unchanged */
  cameraNonce: number;
  planView: boolean;
  showZone: boolean;
  snapOn: boolean;
  packsOn: string[];
  modal: ModalKind | null;
  toast: ToastState | null;
  comingSoon: string | null;
  search: string;
  activeCategory: string;
  /** true while a drag gesture is live (history already captured at its start) */
  gesture: boolean;
  /** Flower Studio: open, and which saved arrangement is being edited (null = new) */
  studio: { open: boolean; editId: string | null };
  /** bumped whenever saved arrangements change, so the catalogue re-lists them */
  flowersVersion: number;

  openStudio: (editId?: string | null) => void;
  closeStudio: () => void;
  /** Save an arrangement to My Flowers; with `place`, also add it to the scene. */
  saveArrangement: (r: SavedArrangement, place: boolean) => void;
  deleteArrangement: (id: string) => void;

  /** Apply a named design operation to a draft copy and record it in undo history. */
  edit: (fn: (d: Design) => void, toast?: string, undoable?: boolean) => void;
  /** Start a drag: capture one undo step; subsequent `live` edits don't add history. */
  beginGesture: () => void;
  live: (fn: (d: Design) => void) => void;
  endGesture: () => void;

  setVenue: (i: number) => void;
  setTime: (t: TimeOfDay) => void;
  setWeather: (w: Weather) => void;
  setLayout: (l: TableLayout) => void;
  setGuests: (n: number) => void;
  setMirror: (on: boolean) => void;
  setTableCfg: (p: Partial<TableConfig>, msg?: string) => void;
  setPalette: (id: string) => void;
  setCustomPalette: (p: Design['customPalette']) => void;
  activate: (e: Entry) => void;
  setAllPlaces: () => void;
  clearAll: () => void;
  loadDesign: (d: Design) => void;

  select: (sel: Selection) => void;
  toggleMulti: (id: string) => void;
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
  setSnap: (on: boolean) => void;
  setPackOn: (id: string, on: boolean) => void;
  setPacks: (ids: string[]) => void;
  openModal: (m: ModalKind) => void;
  closeModal: () => void;

  showToast: (msg: string, undoable?: boolean) => void;
  dismissToast: () => void;
  showComingSoon: (name: string) => void;
  dismissComingSoon: () => void;

  setSearch: (s: string) => void;
  setCategory: (c: string) => void;
}

const clone = (d: Design): Design => structuredClone(d);
const ROT = Math.PI / 12;

/** The host a new piece should be stacked onto: the selected item if it's a host, or the selected item's host. */
export function selectedHost(s: Pick<StoreState, 'design' | 'selection'>): PlacedItem | null {
  if (s.selection?.k !== 'item') return null;
  const id = s.selection.id;
  const it = s.design.items.find((i) => i.id === id);
  if (!it) return null;
  return ITEMS[it.type]?.top ? it : (ops.hostOf(s.design, it) ?? null);
}

export const useDesignStore = create<StoreState>()(
  persist(
    (set, get) => {
      /** Run `fn` on a draft; if it changed anything, push the old design onto history. */
      function commit(fn: (d: Design) => void): Design {
        const { design, history } = get();
        const draft = clone(design);
        fn(draft);
        if (JSON.stringify(draft) === JSON.stringify(design)) return design;
        set({ design: draft, history: [...history, design].slice(-MAX_HISTORY), future: [] });
        return draft;
      }
      const toast = (msg: string, undoable?: boolean) => set((s) => ({ toast: { msg, undoable, n: (s.toast?.n ?? 0) + 1 } }));
      const selItem = () => {
        const { selection, design } = get();
        return selection?.k === 'item' ? design.items.find((i) => i.id === selection.id) : undefined;
      };
      /** Drop a selection that no longer points at anything. */
      const tidySelection = () => {
        const { selection, design } = get();
        if (selection?.k === 'item' && !design.items.some((i) => i.id === selection.id)) set({ selection: null });
        if (selection?.k === 'multi') {
          const ids = selection.ids.filter((id) => design.items.some((i) => i.id === id));
          set({ selection: ids.length > 1 ? { k: 'multi', ids } : ids.length ? { k: 'item', id: ids[0] } : null });
        }
        if ((selection?.k === 'table' || selection?.k === 'chairs') && design.table.mode === 'none') set({ selection: null });
      };

      return {
        design: DEFAULT_DESIGN,
        history: [],
        future: [],
        selection: null,
        tweaks: { mood: 'natural', ui: 'studio', accent: 'champagne', quality: 'high' },
        motion: true,
        autoRotate: false,
        cameraPreset: 'wide',
        cameraNonce: 0,
        planView: false,
        showZone: false,
        snapOn: false,
        packsOn: [],
        modal: null,
        toast: null,
        comingSoon: null,
        search: '',
        activeCategory: 'templates',
        gesture: false,
        studio: { open: false, editId: null },
        flowersVersion: 0,

        openStudio: (editId = null) => set({ studio: { open: true, editId }, selection: null, modal: null, comingSoon: null }),
        closeStudio: () => set({ studio: { open: false, editId: null } }),
        saveArrangement: (r, place) => {
          const list = loadCustom().filter((x) => x.id !== r.id);
          list.push(r);
          if (!saveCustomList(list)) {
            toast('Browser storage is full — delete an arrangement first');
            return;
          }
          registerCustom(r);
          const key = customKey(r.id);
          forgetThumbs(`item:${key}`);
          set((s) => ({
            flowersVersion: s.flowersVersion + 1,
            studio: { open: false, editId: null },
            activeCategory: 'mine',
            search: '',
            // Re-saving changes how placed copies are built; a fresh design object makes the scene rebuild them.
            design: s.design.items.some((i) => i.type === key) ? clone(s.design) : s.design,
          }));
          if (!place) {
            toast(`Saved “${r.name}” to My Flowers`);
            return;
          }
          let placed: PlacedItem | null = null;
          commit((d) => void (placed = ops.addItem(d, key, { host: selectedHost(get()) })));
          const it = placed as PlacedItem | null;
          if (it) set({ selection: { k: 'item', id: it.id } });
          toast(it ? `Saved “${r.name}” and placed it` : `Saved “${r.name}” — choose Round or Banquet to place it on a table`, !!it);
        },
        deleteArrangement: (id) => {
          const key = customKey(id);
          saveCustomList(loadCustom().filter((x) => x.id !== id));
          commit((d) => void ops.removeItems(d, d.items.filter((i) => i.type === key).map((i) => i.id)));
          // Keep the definition (hidden from the catalogue) so undo can bring deleted pieces back safely.
          if (ITEMS[key]) ITEMS[key].cat = 'deleted';
          forgetThumbs(`item:${key}`);
          set((s) => ({ flowersVersion: s.flowersVersion + 1, studio: { open: false, editId: null }, selection: null }));
          toast('Arrangement deleted');
        },

        edit: (fn, msg, undoable = true) => {
          commit(fn);
          tidySelection();
          if (msg) toast(msg, undoable);
        },
        beginGesture: () => {
          const { design, history } = get();
          set({ gesture: true, history: [...history, clone(design)].slice(-MAX_HISTORY), future: [] });
        },
        live: (fn) => {
          const draft = clone(get().design);
          fn(draft);
          set({ design: draft });
        },
        endGesture: () => {
          const { history, design } = get();
          // A click without movement shouldn't leave an empty undo step behind.
          const last = history[history.length - 1];
          if (last && JSON.stringify(last) === JSON.stringify(design)) set({ history: history.slice(0, -1) });
          set({ gesture: false });
        },

        setVenue: (i) => commit((d) => void (d.venue = i)),
        setTime: (t) => commit((d) => void (d.time = t)),
        setWeather: (w) => commit((d) => void (d.wx = w)),
        setLayout: (l) => {
          commit((d) => ops.setTable(d, { mode: l }));
          tidySelection();
          set((s) => ({ cameraPreset: 'wide', cameraNonce: s.cameraNonce + 1 }));
        },
        setGuests: (n) => {
          const d = commit((dd) => ops.setGuests(dd, n));
          tidySelection();
          const m = d.table.mode;
          toast(m === 'round' || m === 'banquet' ? `${n} guests · ${d.tables.length} table${d.tables.length > 1 ? 's' : ''}` : `${n} guests`, true);
        },
        setMirror: (on) => {
          commit((d) => void (d.mirror = on));
          toast(on ? 'New table pieces go on every table' : 'Pieces now go on one table at a time');
        },
        setTableCfg: (p, msg) => {
          commit((d) => ops.setTable(d, p));
          if (msg) toast(msg, true);
        },
        setPalette: (id) => commit((d) => void (d.palette = id)),
        setCustomPalette: (p) =>
          commit((d) => {
            d.customPalette = p;
            d.palette = 'custom';
          }),

        activate: (e) => {
          const n = e.name;
          const s = get();
          if (e.k === 'item') {
            let placed: PlacedItem | null = null;
            const host = selectedHost(s);
            const d = commit((dd) => {
              placed = ops.addItem(dd, e.id, { host });
              if (placed && ITEMS[e.id].group === 'place') dd.table.place = e.id;
            });
            const it = placed as PlacedItem | null;
            if (!it) {
              toast('Choose a table layout first, or select a surface to decorate');
              return;
            }
            // Keep decorating the host when stacking; otherwise select the new piece.
            if (!it.on) set({ selection: { k: 'item', id: it.id } });
            if (ITEMS[e.id].top) toast(`${n} added — select it, then click tabletop pieces to set them on top`);
            else if (it.on) {
              const H = d.items.find((i) => i.id === it.on);
              if (H) toast(`${n} placed on the ${ITEMS[H.type].name.toLowerCase()}`, true);
            }
          } else if (e.k === 'cloth') {
            commit((d) => ops.setTable(d, { cloth: e.id }));
            toast(`Tablecloth: ${n}`, true);
            if (e.id === 'custom') set({ selection: { k: 'table', idx: 0 } });
          } else if (e.k === 'overlay') {
            commit((d) => ops.setTable(d, { overlay: e.id }));
            toast(`Overlay: ${n}`, true);
          } else if (e.k === 'chair') {
            commit((d) => ops.setTable(d, { chair: e.id }));
            toast(`All chairs replaced with ${n}`, true);
          } else if (e.k === 'decor') {
            commit((d) => ops.setTable(d, { decor: e.id, decorPal: d.palette }));
            toast(e.id === 'none' ? 'Chair décor removed' : `${n} added to all chairs`, true);
          } else if (e.k === 'tpl') {
            let name: string | null = null;
            commit((d) => void (name = ops.applyTemplate(d, e.id)));
            set((st) => ({ selection: null, cameraPreset: 'wide', cameraNonce: st.cameraNonce + 1 }));
            if (name) toast(`“${name}” applied`, true);
          }
        },
        setAllPlaces: () => {
          let n = 0;
          commit((d) => void (n = ops.setAllPlaces(d)));
          set({ selection: null });
          if (n) toast(`${n} place settings set`, true);
          else toast('Choose Round or Banquet tables first');
        },
        clearAll: () => {
          commit((d) => void (d.items = []));
          set({ selection: null });
        },
        loadDesign: (loaded) => {
          commit((d) => Object.assign(d, clone(loaded)));
          set({ selection: null });
        },

        select: (sel) => {
          if (sel?.k === 'multi' && sel.ids.length === 1) sel = { k: 'item', id: sel.ids[0] };
          if (sel?.k === 'multi' && !sel.ids.length) sel = null;
          set({ selection: sel });
        },
        toggleMulti: (id) => {
          const sel = get().selection;
          const cur = sel?.k === 'item' ? [sel.id] : sel?.k === 'multi' ? sel.ids : [];
          get().select({ k: 'multi', ids: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
        },
        rotateSelected: (dir) => {
          const sel = get().selection;
          if (sel?.k === 'table')
            commit((d) => {
              const T = d.tables[sel.idx];
              if (T) T.ry += dir * ROT;
            });
          const it = selItem();
          if (!it) return;
          const d = ITEMS[it.type];
          if (d.lock === 'aisle' || (d.lock === 'center' && get().design.table.mode === 'banquet')) return;
          commit((dd) => ops.rotateItem(dd, dd.items.find((i) => i.id === it.id)!, dir * ROT));
        },
        duplicateSelected: () => {
          const it = selItem();
          if (!it) return;
          let made: PlacedItem | null = null;
          commit((d) => void (made = ops.duplicate(d, d.items.find((i) => i.id === it.id)!)));
          const m = made as PlacedItem | null;
          if (m) set({ selection: { k: 'item', id: m.id } });
          else toast('That piece is one of a kind here');
        },
        removeSelected: () => {
          const sel = get().selection;
          if (sel?.k === 'multi') {
            commit((d) => ops.removeItems(d, sel.ids.flatMap((id) => {
              const it = d.items.find((i) => i.id === id);
              return it ? ops.linked(d, it).map((i) => i.id) : [];
            })));
            set({ selection: null });
            toast(`${sel.ids.length} pieces removed`, true);
            return;
          }
          const it = selItem();
          if (!it) return;
          commit((d) => ops.removeIt(d, d.items.find((i) => i.id === it.id)!));
          set({ selection: null });
          toast(`${ITEMS[it.type].name} removed`, true);
        },

        undo: () => {
          const { history, design, future } = get();
          if (!history.length) return;
          set({ design: history[history.length - 1], history: history.slice(0, -1), future: [design, ...future].slice(0, MAX_HISTORY) });
          tidySelection();
        },
        redo: () => {
          const { future, design, history } = get();
          if (!future.length) return;
          set({ design: future[0], future: future.slice(1), history: [...history, design].slice(-MAX_HISTORY) });
          tidySelection();
        },

        setTweak: (key, value) => set((s) => ({ tweaks: { ...s.tweaks, [key]: value } })),
        setMotion: (on) => set({ motion: on, ...(on ? {} : { autoRotate: false }) }),
        setAutoRotate: (on) => set({ autoRotate: on }),
        setCameraPreset: (p) => set((s) => ({ cameraPreset: p, cameraNonce: s.cameraNonce + 1, planView: false })),
        setPlanView: (on) => set({ planView: on }),
        setShowZone: (on) => set({ showZone: on }),
        setSnap: (on) => set({ snapOn: on }),
        setPackOn: (id, on) =>
          set((s) => {
            const packsOn = on ? [...new Set([...s.packsOn, id])] : s.packsOn.filter((x) => x !== id);
            const activeCategory = on ? id : s.activeCategory === id ? 'templates' : s.activeCategory;
            return { packsOn, activeCategory };
          }),
        setPacks: (ids) => set((s) => ({ packsOn: ids, activeCategory: ids.includes(s.activeCategory) || !s.packsOn.includes(s.activeCategory) ? s.activeCategory : 'templates' })),
        openModal: (m) => set({ modal: m, comingSoon: null }),
        closeModal: () => set({ modal: null }),

        showToast: toast,
        dismissToast: () => set({ toast: null }),
        showComingSoon: (name) => set({ comingSoon: name }),
        dismissComingSoon: () => set({ comingSoon: null }),

        setSearch: (s) => set({ search: s }),
        setCategory: (c) => set({ activeCategory: c, search: '' }),
      };
    },
    {
      name: 'vs3_state',
      version: 1,
      // The design and the viewer's preferences survive a reload; history, selection and UI state don't.
      partialize: (s) => ({ design: s.design, tweaks: s.tweaks, motion: s.motion, packsOn: s.packsOn, snapOn: s.snapOn, showZone: s.showZone, activeCategory: s.activeCategory }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StoreState>;
        return {
          ...current,
          design: normalizeDesign(p.design) ?? current.design,
          tweaks: { ...current.tweaks, ...p.tweaks },
          motion: p.motion ?? current.motion,
          packsOn: Array.isArray(p.packsOn) ? p.packsOn.filter((x) => typeof x === 'string') : current.packsOn,
          snapOn: p.snapOn ?? current.snapOn,
          showZone: p.showZone ?? current.showZone,
          activeCategory: typeof p.activeCategory === 'string' ? p.activeCategory : current.activeCategory,
        };
      },
    },
  ),
);

/** The chair style in use: the design's choice or the venue's default. */
export const chairStyleOf = (d: Design, venueChair: import('../types').ChairStyle) => (d.table.chair ? CHAIRS[d.table.chair] : venueChair);
