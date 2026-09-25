import * as THREE from 'three';
import type { CatalogueItem, Palette } from '../types';
import { Builder } from './builder';
import { disposeObject3D } from './utils';

let renderer: THREE.WebGLRenderer | null = null;
const SIZE = 200;

function getRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  return renderer;
}

function renderGroupThumbnail(build: (group: THREE.Group) => void): string {
  const r = getRenderer();
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff', '#443322', 1.6));
  const sun = new THREE.DirectionalLight('#fff9ec', 2.1);
  sun.position.set(3, 5, 4);
  scene.add(sun);

  const group = new THREE.Group();
  scene.add(group);
  try {
    build(group);
  } catch {
    // Some builders may fail on malformed data; leave group empty rather than crash the panel.
  }

  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  if (box.isEmpty()) {
    size.set(1, 1, 1);
    center.set(0, 0.5, 0);
  } else {
    box.getSize(size);
    box.getCenter(center);
  }
  const radius = Math.max(size.length() / 2, 0.25);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 200);
  camera.position.set(center.x + radius * 1.5, center.y + radius * 1.15, center.z + radius * 1.7);
  camera.lookAt(center);

  r.setClearColor(0x000000, 0);
  r.render(scene, camera);
  const url = r.domElement.toDataURL('image/png');

  disposeObject3D(scene);
  return url;
}

const cache = new Map<string, string>();

export function captureItemThumbnail(item: CatalogueItem, palette: Palette, color?: string): string {
  const key = `${item.id}:${item.pal === false ? '' : palette.id}:${color ?? ''}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const url = renderGroupThumbnail((group) => {
    const builder = Builder(group);
    item.build(group, { builder, palette, color, chairStyle: item.chairStyle });
    builder.flush();
  });

  cache.set(key, url);
  return url;
}

export function captureFlowerThumbnail(color: string, scale: number): string {
  const key = `flower:${color}:${scale}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const url = renderGroupThumbnail((group) => {
    const builder = Builder(group);
    builder.rose(0, 0, color, 0.28 * scale, 0);
    builder.flush();
  });

  cache.set(key, url);
  return url;
}

export function captureGreeneryThumbnail(color: string): string {
  const key = `greenery:${color}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const url = renderGroupThumbnail((group) => {
    const builder = Builder(group);
    builder.fern(0, 0, 1, color, 0);
    builder.flush();
  });

  cache.set(key, url);
  return url;
}
