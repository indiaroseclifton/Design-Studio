import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ITEMS, TEMPLATES, itemGroup, type Entry } from '../engine/catalogue';
import { CHAIRS, HANG, OVERLAYS, chairSpots, clothOf, fabricMat, hasTbl, makeChair, makeChairParts, palOf, tableUnit, topY } from '../engine/studio';
import { DEF_TABLE, addItem, setAllPlaces } from '../lib/designOps';
import { DEFAULT_DESIGN } from '../lib/designFormat';
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

function render(e: Entry, pal: string, chair: string | null): string {
  const { renderer: r, scene: sc } = setup();
  const g = thumbGroup(e, pal, chair);
  sc.add(g);
  g.updateMatrixWorld(true);
  const sph = new THREE.Box3().setFromObject(g).getBoundingSphere(new THREE.Sphere());
  const dir = (
    e.k === 'tpl' ? new THREE.Vector3(1, 1.15, 1.5) : e.k === 'chair' || e.k === 'decor' ? new THREE.Vector3(1.1, 0.6, 1.3) : new THREE.Vector3(0.9, 0.75, 1.5)
  ).normalize();
  const dist = (Math.max(0.2, sph.radius) / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2))) * (e.k === 'tpl' ? 0.72 : 0.92);
  cam.position.copy(sph.center).addScaledVector(dir, dist);
  cam.lookAt(sph.center);
  cam.near = dist / 60;
  cam.far = dist * 4;
  cam.updateProjectionMatrix();
  r.render(sc, cam);
  const url = r.domElement.toDataURL('image/webp', 0.85);
  sc.remove(g);
  disposeObject3D(g);
  return url;
}

/* ---------------------------------------------------------------- async queue */

const cache = new Map<string, string>();
const waiting = new Map<string, { e: Entry; pal: string; chair: string | null; cbs: Array<(url: string) => void> }>();
let pumping = false;

/** Palette-aware pieces (and chair décor, which depends on the chair) get their own thumbnail per palette. */
export function thumbKey(e: Entry, pal: string, chair: string | null) {
  const palAware = (e.k === 'item' && ITEMS[e.id].pal !== false) || e.k === 'decor';
  return e.key + (palAware ? '|' + pal : '') + (e.k === 'decor' ? '|' + (chair ?? '') : '');
}

export const cachedThumb = (key: string) => cache.get(key);

/** Queue a thumbnail; `cb` runs when it's ready. Renders one per tick so the UI stays responsive. */
export function requestThumb(e: Entry, pal: string, chair: string | null, cb: (url: string) => void): () => void {
  const key = thumbKey(e, pal, chair);
  const hit = cache.get(key);
  if (hit) {
    cb(hit);
    return () => {};
  }
  const w = waiting.get(key);
  if (w) w.cbs.push(cb);
  else waiting.set(key, { e, pal, chair, cbs: [cb] });
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

function pump() {
  const next = waiting.entries().next();
  if (next.done) {
    pumping = false;
    return;
  }
  const [key, job] = next.value;
  waiting.delete(key);
  try {
    const url = render(job.e, job.pal, job.chair);
    cache.set(key, url);
    job.cbs.forEach((f) => f(url));
  } catch (err) {
    console.warn('thumbnail', key, err);
  }
  setTimeout(pump, 8);
}

