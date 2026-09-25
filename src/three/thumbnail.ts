import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ITEMS, TEMPLATES, itemGroup, type Entry } from '../engine/catalogue';
import { CHAIRS, HANG, OVERLAYS, chairSpots, clothOf, fabricMat, hasTbl, makeChair, makeChairParts, palOf, tableUnit, topY } from '../engine/studio';
import { DEF_TABLE, addItem, setAllPlaces } from '../lib/designOps';
import { DEFAULT_DESIGN } from '../lib/designFormat';
import { cutStem } from '../engine/flowers';
import { buildFullArrangement, type FullArrangement } from '../engine/placed';
import { disposeObject3D } from './utils';
import type { Design, TableConfig } from '../types';

const W = 240,
  H = 180;
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
const cam = new THREE.PerspectiveCamera(28, W / H, 0.01, 300);

function setup() {
  if (renderer && scene) return { renderer, scene };
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  scene.environmentIntensity = 0.7;
  scene.add(new THREE.HemisphereLight('#fff8ee', '#5a4a3a', 1.4));
  const key = new THREE.DirectionalLight('#fff4e6', 2.4);
  key.position.set(2, 4, 3);
  scene.add(key);
  return { renderer, scene };
}

function tableGroup(t: TableConfig, noChairs = true) {
  const g = new THREE.Group();
  const cl = clothOf(t, '#f4efe6'),
    cm = cl.bare ? null : fabricMat(cl),
    om = !cl.bare && t.overlay !== 'none' ? fabricMat(OVERLAYS[t.overlay]) : null;
  tableUnit(g, t.mode, cl, cm, om);
  if (!noChairs) {
    const spots = chairSpots(t.mode, [{ x: 0, z: 0, ry: 0 }], t.mode === 'ceremony' ? 24 : 8);
    const o = new THREE.Object3D();
    for (const [geo, mat] of makeChairParts(t.chair ? CHAIRS[t.chair] : CHAIRS.chiavari_gold, t.decor, palOf(t.decorPal))) {
      const im = new THREE.InstancedMesh(geo, mat, spots.length);
      spots.forEach(([x, z, r], i) => {
        o.position.set(x, 0, z);
        o.rotation.set(0, r, 0);
        o.updateMatrix();
        im.setMatrixAt(i, o.matrix);
      });
      g.add(im);
    }
  }
  return g;
}

/** A single table dressed as the template describes, for its catalogue card. */
function composeTemplate(id: string) {
  const t = TEMPLATES.find((x) => x.id === id)!;
  const S: Design = structuredClone(DEFAULT_DESIGN);
  S.table = { ...DEF_TABLE, mode: t.mode, cloth: t.cloth ?? null, overlay: t.overlay || 'none', chair: t.chair ?? null, decor: t.decor || 'none', decorPal: t.pal, place: t.place || 'place_classic' };
  S.guests = t.mode === 'ceremony' ? 24 : 8;
  S.tables = [{ x: 0, z: 0, ry: 0 }];
  S.palette = t.pal;
  for (const [type, x, z, ry = 0] of t.items) addItem(S, type, { x, z, ry, pal: t.pal, seed: 11, mirror: false });
  if (t.place) setAllPlaces(S);
  const g = hasTbl(t.mode) || t.mode === 'ceremony' ? tableGroup(S.table, false) : new THREE.Group();
  for (const it of S.items) {
    const d = ITEMS[it.type];
    if (it.on) continue;
    const ig = itemGroup(it.type, t.pal, 11, t.mode);
    ig.position.set(it.x, d.surf === 'table' ? topY(S.table) : d.surf === 'hang' ? d.hy || HANG : 0, it.z);
    ig.rotation.y = it.ry;
    g.add(ig);
  }
  return g;
}

let customPal: Parameters<typeof palOf>[1];
/** The user's custom palette, used for thumbnails keyed `custom:…`. */
export const setThumbCustomPalette = (p: Parameters<typeof palOf>[1]) => {
  customPal = p;
};
const resolvePal = (pal: string) => palOf(pal.startsWith('custom') ? 'custom' : pal, customPal);

function thumbGroup(e: Entry, pal: string, chair: string | null): THREE.Group {
  if (e.k === 'item') return itemGroup(e.id, ITEMS[e.id].pal === false ? 'blush' : resolvePal(pal), 7, 'round', { tnum: 1 });
  if (e.k === 'cloth') return tableGroup({ ...DEF_TABLE, cloth: e.id });
  if (e.k === 'overlay') return tableGroup({ ...DEF_TABLE, cloth: 'ivory', overlay: e.id });
  if (e.k === 'chair') return makeChair(CHAIRS[e.id]);
  if (e.k === 'decor') return makeChair(CHAIRS[chair || 'chiavari_gold'], e.id, resolvePal(pal));
  return composeTemplate(e.id);
}

/** Frame a group in the thumbnail camera from `dir` and return a WebP data URL of the given size. */
function shoot(g: THREE.Group, dir: THREE.Vector3, fit: number, w = W, h = H): string {
  const { renderer: r, scene: sc } = setup();
  sc.add(g);
  g.updateMatrixWorld(true);
  const sph = new THREE.Box3().setFromObject(g).getBoundingSphere(new THREE.Sphere());
  cam.aspect = w / h;
  const dist = (Math.max(0.02, sph.radius) / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2))) * fit;
  cam.position.copy(sph.center).addScaledVector(dir.normalize(), dist);
  cam.lookAt(sph.center);
  cam.near = dist / 60;
  cam.far = dist * 4;
  cam.updateProjectionMatrix();
  if (w !== W || h !== H) r.setSize(w, h, false);
  r.render(sc, cam);
  const url = r.domElement.toDataURL('image/webp', 0.85);
  if (w !== W || h !== H) r.setSize(W, H, false);
  sc.remove(g);
  disposeObject3D(g);
  return url;
}

function render(e: Entry, pal: string, chair: string | null): string {
  const dir = e.k === 'tpl' ? new THREE.Vector3(1, 1.15, 1.5) : e.k === 'chair' || e.k === 'decor' ? new THREE.Vector3(1.1, 0.6, 1.3) : new THREE.Vector3(0.9, 0.75, 1.5);
  return shoot(thumbGroup(e, pal, chair), dir, e.k === 'tpl' ? 0.72 : 0.92);
}

/* ---------------------------------------------------------------- async queue */

const cache = new Map<string, string>();
const waiting = new Map<string, { make: () => string; cbs: Array<(url: string) => void> }>();
let pumping = false;

/** Palette-aware pieces (and chair décor, which depends on the chair) get their own thumbnail per palette. */
export function thumbKey(e: Entry, pal: string, chair: string | null) {
  const palAware = (e.k === 'item' && ITEMS[e.id].pal !== false) || e.k === 'decor';
  return e.key + (palAware ? '|' + pal : '') + (e.k === 'decor' ? '|' + (chair ?? '') : '');
}

export const cachedThumb = (key: string) => cache.get(key);

/** Drop cached thumbnails whose key starts with `prefix` (e.g. after re-saving a Flower Studio arrangement). */
export function forgetThumbs(prefix: string) {
  for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k);
}

function enqueue(key: string, make: () => string, cb: (url: string) => void): () => void {
  const hit = cache.get(key);
  if (hit) {
    cb(hit);
    return () => {};
  }
  const w = waiting.get(key);
  if (w) w.cbs.push(cb);
  else waiting.set(key, { make, cbs: [cb] });
  if (!pumping) {
    pumping = true;
    setTimeout(pump, 30);
  }
  return () => {
    const ww = waiting.get(key);
    if (!ww) return;
    ww.cbs = ww.cbs.filter((f) => f !== cb);
    if (!ww.cbs.length) waiting.delete(key);
  };
}

/** Queue a catalogue thumbnail; `cb` runs when it's ready. Renders one per tick so the UI stays responsive. */
export function requestThumb(e: Entry, pal: string, chair: string | null, cb: (url: string) => void): () => void {
  return enqueue(thumbKey(e, pal, chair), () => render(e, pal, chair), cb);
}

export const stemKey = (kind: 'flower' | 'green', t: string, c?: string) => `stem:${kind}:${t}:${c ?? ''}`;

/** Queue a tall cut-stem thumbnail for the Flower Studio's rows. */
export function requestStemThumb(kind: 'flower' | 'green', t: string, c: string | undefined, cb: (url: string) => void): () => void {
  return enqueue(stemKey(kind, t, c), () => shoot(cutStem(kind, t, c), new THREE.Vector3(0.15, 0.3, 1), 0.8, 104, 128), cb);
}

/** Queue a thumbnail of a whole Flower Studio arrangement (preset and vessel cards). */
export function requestArrangementThumb(key: string, r: FullArrangement, cb: (url: string) => void): () => void {
  return enqueue(`arr:${key}`, () => {
    const g = new THREE.Group();
    buildFullArrangement(g, r);
    return shoot(g, new THREE.Vector3(0.55, 0.3, 1), 0.9);
  }, cb);
}
/** Queue a thumbnail of any studio model (Cake Studio presets and designs). */
export function requestModelThumb(key: string, build: (g: THREE.Group) => void, cb: (url: string) => void): () => void {
  return enqueue(`model:${key}`, () => {
    const g = new THREE.Group();
    build(g);
    return shoot(g, new THREE.Vector3(0.5, 0.35, 1), 0.92);
  }, cb);
}
export const cachedModelThumb = (key: string) => cache.get(`model:${key}`);

export const cachedArrangementThumb = (key: string) => cache.get(`arr:${key}`);

function pump() {
  const next = waiting.entries().next();
  if (next.done) {
    pumping = false;
    return;
  }
  const [key, job] = next.value;
  waiting.delete(key);
  try {
    const url = job.make();
    cache.set(key, url);
    job.cbs.forEach((f) => f(url));
  } catch (err) {
    console.warn('thumbnail', key, err);
  }
  setTimeout(pump, 8);
}
