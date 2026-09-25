import { create } from 'zustand';
import * as THREE from 'three';
import { loadVenuePhoto, persistVenuePhoto } from '../lib/storage';

export interface VenuePhoto {
  url: string;
  texture: THREE.Texture;
  pano: boolean;
  aspect: number;
}

interface VenuePhotoState {
  photo: VenuePhoto | null;
  loading: boolean;
  setPhoto: (file: File) => Promise<void>;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function buildPhoto(url: string): Promise<VenuePhoto> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const aspect = img.naturalWidth / img.naturalHeight;
      const pano = aspect > 1.9 && aspect < 2.1;
      const texture = new THREE.Texture(img);
      texture.colorSpace = THREE.SRGBColorSpace;
      if (pano) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
      } else {
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.x = -1;
      }
      texture.needsUpdate = true;
      resolve({ url, texture, pano, aspect });
    };
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = url;
  });
}

export const useVenuePhotoStore = create<VenuePhotoState>((set) => ({
  photo: null,
  loading: false,
  async setPhoto(file) {
    set({ loading: true });
    try {
      const url = await fileToDataUrl(file);
      const photo = await buildPhoto(url);
      persistVenuePhoto(url);
      set({ photo, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));

const stored = loadVenuePhoto();
if (stored) {
  buildPhoto(stored)
    .then((photo) => useVenuePhotoStore.setState({ photo }))
    .catch(() => {
      // stored photo is corrupt or unreadable — leave the venue photo-less
    });
}
