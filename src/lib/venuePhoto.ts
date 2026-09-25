import * as THREE from 'three';
import { create } from 'zustand';
import type { VenuePhoto } from '../types';

/* A tiny IndexedDB key/value store: photos are too big for localStorage. */
const DB = 'venue-studio',
  STORE = 'kv';
function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    };
  });
}

async function toPhoto(blob: Blob): Promise<VenuePhoto> {
  const url = URL.createObjectURL(blob);
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const aspect = img.width / img.height;
  // A 2:1 image is treated as an equirectangular panorama that wraps all the way round.
  const pano = aspect > 1.9 && aspect < 2.1;
  if (pano) tex.mapping = THREE.EquirectangularReflectionMapping;
  return { tex, pano, aspect, url };
}

interface PhotoState {
  photo: VenuePhoto | null;
  setFile: (file: File) => Promise<void>;
  clear: () => Promise<void>;
  load: () => Promise<void>;
}

export const useVenuePhoto = create<PhotoState>((set, get) => ({
  photo: null,
  setFile: async (file) => {
    const photo = await toPhoto(file);
    get().photo?.tex.dispose();
    set({ photo });
    try {
      await idb('readwrite', (s) => s.put(file, 'venuePhoto'));
    } catch {
      // Private windows can refuse IndexedDB; the photo still works for this session.
    }
  },
  clear: async () => {
    get().photo?.tex.dispose();
    set({ photo: null });
    try {
      await idb('readwrite', (s) => s.delete('venuePhoto'));
    } catch {
      /* nothing stored */
    }
  },
  load: async () => {
    try {
      const blob = await idb<Blob | undefined>('readonly', (s) => s.get('venuePhoto'));
      if (blob) set({ photo: await toPhoto(blob) });
    } catch {
      /* no stored photo */
    }
  },
}));
