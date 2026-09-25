import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Builder, flame } from '../three/builder';
import { M, box, cyl, disposeObject3D, getSeedState, mesh, seed, setSeedState } from '../three/utils';
import { T, planks, tm } from '../three/textures';
import { brass, wax } from '../engine/materials';
import { buildArrangement } from '../engine/catalogue.gen';
import { FS_PRESETS } from '../engine/flowers';
import type { Pal } from '../engine/studio';
import {
  COVER,
  PAGE_ASPECT,
  PH,
  PW,
  archCard,
  bank,
  bankLow,
  bannerCard,
  burstCard,
  candlesCard,
  chairsCard,
  chapterPage,
  dateStr,
  drawCoverPage,
  drawEnd,
  drawEndpaper,
  drawTitle,
  nightCard,
  photoPage,
  skyCard,
  venueCard,
  venueKind,
  type ChapterOpts,
  type Story,
} from './art';
import { blip, swish } from './audio';

/*
 * The Storybook's 3D book (ported from the prototype): a hardback on a candle-lit table whose leaves are
 * 28-segment strips that curl as they turn, with pop-up cards and miniature 3D scenes rising from each spread.
 */

export const CHAPTERS = ['Cover', 'Once upon a time', 'The Venue', 'The Ceremony', 'The Layout', 'The Tablescape', 'The Feast', 'The First Dance', 'Ever After'];
export const MAXS = CHAPTERS.length - 1;

const W = 1,
  H = PAGE_ASPECT,
  NS = 28,
  PI = Math.PI;
const cl = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Everything the book shows, gathered from the design by the overlay. */
export interface BookContent {
  story: Story;
  pal: Pal;
  venueName: string;
  venueDesc: string;
  sky: [string, string, string];
  photos: Partial<Record<'wide' | 'couple' | 'top' | 'guest' | 'close', HTMLImageElement>>;
  facts: {
    layout: string;
    mode: 'round' | 'banquet' | 'ceremony' | 'none';
    tables: number;
    guests: number;
    pieces: number;
    backdrop?: string;
    cake: string;
    centre?: string;
    linen?: string | null;
    overlay?: string | null;
    chair?: string;
    decor?: string | null;
    place?: string | null;
  };
  /** clones of the laid-out tables and pieces (whole room, and just the first table) */
  layoutAll: THREE.Object3D | null;
  layoutNear: THREE.Object3D | null;
  cake: THREE.Object3D | null;
  champagne: THREE.Object3D | null;
}

interface Side {
  c: HTMLCanvasElement;
  t: THREE.CanvasTexture;
  x: CanvasRenderingContext2D;
}
interface Leaf {
  gF: THREE.BufferGeometry;
  gB: THREE.BufferGeometry;
  pa: THREE.BufferAttribute;
  w: number;
  grp: THREE.Group;
  F: Side;
  B: Side;
  th: number;
  target: number;
  dir: number;
  anim: { from: number; to: number; t0: number; dur: number } | null;
  last: number;
  rigid: boolean;
  y0: number;
  y1: number;
}
interface Pop {
  spr: number;
  pv: THREE.Group;
  inner?: THREE.Group;
  kind: 'card' | 'mini';
  delay: number;
  val: number;
  vel: number;
  spin?: number;
  popped?: boolean;
}
interface Petal {
  x: number;
  y: number;
  z: number;
  vy: number;
  ph: number;
  rx: number;
  ry: number;
  land: number;
}

function leafGeo(w: number, h: number) {
  const n = (NS + 1) * 2,
    pos = new Float32Array(n * 3),
    nor = new Float32Array(n * 3),
    uF = new Float32Array(n * 2),
    uB = new Float32Array(n * 2),
    idx: number[] = [];
  for (let i = 0; i <= NS; i++)
    for (let r = 0; r < 2; r++) {
      const k = i * 2 + r,
        u = i / NS,
        v = r ? 0 : 1;
      pos[k * 3] = u * w;
      pos[k * 3 + 2] = r ? h / 2 : -h / 2;
      uF[k * 2] = u;
      uF[k * 2 + 1] = v;
      uB[k * 2] = 1 - u;
      uB[k * 2 + 1] = v;
    }
  for (let i = 0; i < NS; i++) {
    const a = i * 2,
      c = a + 1,
      b = a + 2,
      d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  const pa = new THREE.BufferAttribute(pos, 3),
    na = new THREE.BufferAttribute(nor, 3),
    gF = new THREE.BufferGeometry(),
    gB = new THREE.BufferGeometry();
  for (const [g, uv] of [
    [gF, uF],
    [gB, uB],
  ] as const) {
    g.setAttribute('position', pa);
    g.setAttribute('normal', na);
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
  }
  gF.computeVertexNormals();
  return { gF, gB, pa, w };
}

/** Bend a leaf: `th` is how far it has turned (0 → π); `bend` curls the free edge. */
function deform(L: Leaf, th: number, bend: number) {
  const p = L.pa.array as Float32Array,
    ds = L.w / NS,
    b = bend * Math.sin(th) * L.dir;
  let x = 0,
    y = 0;
  for (let i = 0; i <= NS; i++) {
    const k = i * 6;
    p[k] = x;
    p[k + 1] = y;
    p[k + 3] = x;
    p[k + 4] = y;
    if (i < NS) {
      const f = (i + 0.5) / NS,
        a = cl(th + b * f * f, 0, PI);
      x += Math.cos(a) * ds;
      y += Math.sin(a) * ds;
    }
  }
  L.pa.needsUpdate = true;
  L.gF.computeVertexNormals();
}

function makeSide(): Side {
  const c = document.createElement('canvas');
  c.width = PW;
  c.height = PH;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return { c, t, x: c.getContext('2d')! };
}

function cardTex(w: number, h: number, draw: (x: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * 470);
  c.height = Math.round(h * 470);
  draw(c.getContext('2d')!, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export interface BookEvents {
  onSpread: (s: number) => void;
  onAutoEnd: () => void;
}

export class Book {
  private R: THREE.WebGLRenderer;
  private SC = new THREE.Scene();
  private CAM = new THREE.PerspectiveCamera(34, 1, 0.01, 40);
  private COMP: EffectComposer;
  private book = new THREE.Group();
  private popRoot = new THREE.Group();
  private leaves: Leaf[] = [];
  private pops: Pop[] = [];
  private petals: THREE.InstancedMesh;
  private pState: Petal[] = [];
  private dust: THREE.Points;
  private candleL: THREE.PointLight;
  private camP = new THREE.Vector3(0, 3, 2.4);
  private camT = new THREE.Vector3();
  private ptr = { x: 0, y: 0 };
  private drag: { L: Leaf; fwd: boolean; x0: number; moved: boolean; pw: number } | null = null;
  private raf = 0;
  private last = performance.now();
  private clock = 0;
  spread = 0;
  intro = true;
  auto = false;
  private autoT = 0;
  motion = true;

  private canvas: HTMLCanvasElement;
  private ev: BookEvents;

  constructor(canvas: HTMLCanvasElement, ev: BookEvents) {
    this.canvas = canvas;
    this.ev = ev;
    const R = (this.R = new THREE.WebGLRenderer({ canvas, antialias: true }));
    R.setPixelRatio(Math.min(devicePixelRatio, 2));
    R.shadowMap.enabled = true;
    R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.toneMapping = THREE.ACESFilmicToneMapping;
    R.toneMappingExposure = 0.82;
    const SC = this.SC;
    SC.background = new THREE.Color('#0c0907');
    SC.fog = new THREE.Fog('#0c0907', 3.6, 8);
    const pm = new THREE.PMREMGenerator(R);
    SC.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    SC.environmentIntensity = 0.28;
    SC.add(new THREE.HemisphereLight('#ffe6c4', '#1c120a', 0.5));
    const key = new THREE.DirectionalLight('#ffe0b4', 1.55);
    key.position.set(-1.5, 3.3, 1.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -1.9, right: 1.9, top: 1.9, bottom: -1.9, near: 0.5, far: 8 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.012;
    SC.add(key);
    this.candleL = new THREE.PointLight('#ffac58', 1.8, 5, 1.7);
    this.candleL.position.set(1.58, 0.6, -0.62);
    SC.add(this.candleL);

    const k0 = getSeedState();
    seed(9);
    const tb = mesh(SC, new THREE.PlaneGeometry(14, 10), tm(T(planks(['#4a2e1c', '#3f2616', '#553420', '#38200f']), [3, 2]), 0.62), 0, -0.004, 0);
    tb.rotation.x = -PI / 2;
    tb.castShadow = false;
    const deco = new THREE.Group();
    SC.add(deco);
    const B = Builder(deco);
    for (const [x, z, h] of [
      [1.58, -0.62, 0.34],
      [1.76, -0.36, 0.22],
      [-1.62, -0.74, 0.28],
    ]) {
      cyl(deco, 0.05, 0.06, 0.02, brass, x, 0.01, z, 20);
      cyl(deco, 0.028, 0.028, h, wax, x, 0.02 + h / 2, z, 20);
      flame(B, x, h + 0.05, z, 0.55);
    }
    B.flush();
    try {
      const fg = new THREE.Group();
      fg.position.set(-1.72, 0, -0.2);
      fg.scale.setScalar(1.1);
      buildArrangement(fg, { ...FS_PRESETS[0], seed: 5 });
      deco.add(fg);
    } catch {
      /* decoration only */
    }
    setSeedState(k0);

    this.COMP = new EffectComposer(R);
    this.COMP.addPass(new RenderPass(SC, this.CAM));
    this.COMP.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 1.02));
    this.COMP.addPass(new OutputPass());

    SC.add(this.book);
    this.book.add(this.popRoot);
    box(this.book, W * 1.03, 0.01, H * 1.03, M(COVER, 0.7), (W * 1.03) / 2, 0.002, 0);
    const NL = MAXS + 1;
    for (let i = 0; i < NL; i++) {
      const cov = i === 0,
        g = leafGeo(cov ? W * 1.03 : W, cov ? H * 1.03 : H),
        F1 = makeSide(),
        B1 = makeSide(),
        grp = new THREE.Group();
      const mf = new THREE.Mesh(g.gF, new THREE.MeshStandardMaterial({ map: F1.t, roughness: cov ? 0.6 : 0.92, side: THREE.FrontSide })),
        mb = new THREE.Mesh(g.gB, new THREE.MeshStandardMaterial({ map: B1.t, roughness: 0.92, side: THREE.BackSide }));
      for (const m of [mf, mb]) {
        m.castShadow = m.receiveShadow = true;
        m.frustumCulled = false;
        grp.add(m);
      }
      this.book.add(grp);
      const L: Leaf = { ...g, grp, F: F1, B: B1, th: 0, target: 0, dir: 1, anim: null, last: -1, rigid: cov, y0: cov ? 0.016 + 0.0032 * NL + 0.004 : 0.016 + 0.0032 * (NL - i), y1: cov ? 0.008 : 0.016 + 0.0032 * i };
      deform(L, 0, 0);
      this.leaves.push(L);
    }

    const PN = 80;
    this.petals = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide }), PN);
    this.petals.castShadow = true;
    this.petals.frustumCulled = false;
    SC.add(this.petals);
    for (let i = 0; i < PN; i++) this.pState.push(this.resetPetal({} as Petal, true));
    const dp = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      dp[i * 3] = (Math.random() - 0.5) * 3.6;
      dp[i * 3 + 1] = Math.random() * 2;
      dp[i * 3 + 2] = (Math.random() - 0.5) * 2.6;
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: '#ffd9a0', size: 0.01, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    SC.add(this.dust);

    canvas.addEventListener('pointerdown', this.pDown);
    canvas.addEventListener('pointermove', this.pMove);
    canvas.addEventListener('pointerup', this.pUp);
    canvas.addEventListener('pointercancel', this.pUp);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.raf = requestAnimationFrame(this.frame);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.pDown);
    c.removeEventListener('pointermove', this.pMove);
    c.removeEventListener('pointerup', this.pUp);
    c.removeEventListener('pointercancel', this.pUp);
    window.removeEventListener('resize', this.resize);
    this.clearPops();
    disposeObject3D(this.SC);
    this.SC.environment?.dispose();
    this.COMP.dispose();
    this.R.dispose();
  }

  private resize = () => {
    const w = this.canvas.clientWidth || innerWidth,
      h = this.canvas.clientHeight || innerHeight;
    this.R.setSize(w, h, false);
    this.COMP.setSize(w, h);
    this.CAM.aspect = w / h;
    this.CAM.updateProjectionMatrix();
  };

  private resetPetal(o: Petal, first = false) {
    o.x = (Math.random() - 0.5) * 3.4;
    o.z = (Math.random() - 0.5) * 2.2 - 0.2;
    o.y = first ? Math.random() * 2.3 : 2.2 + Math.random() * 0.6;
    o.vy = 0.07 + Math.random() * 0.07;
    o.ph = Math.random() * 6;
    o.rx = Math.random() * 6;
    o.ry = Math.random() * 6;
    o.land = 0;
    return o;
  }

  /* ------------------------------------------------------------ content */

  /** Print every page from the design, and build the pop-ups. */
  setContent(c: BookContent) {
    this.drawPages(c);
    this.buildPops(c);
    const col = new THREE.Color();
    for (let i = 0; i < this.petals.count; i++) this.petals.setColorAt(i, col.set(c.pal.b[i % c.pal.b.length]));
    if (this.petals.instanceColor) this.petals.instanceColor.needsUpdate = true;
  }

  /** Re-print only the pages (after the couple's names or date change). */
  drawPages(c: BookContent) {
    const { story: st, pal: p, facts: f, photos } = c;
    const lower = (s?: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
    const hasT = f.mode === 'round' || f.mode === 'banquet';
    const venueBody = `${c.venueDesc} On ${st.date ? dateStr(st) : 'our day'}, it was ours.`;
    const cer = `Guests found their seats ${f.layout}. Beneath ${f.backdrop ? 'the ' + lower(f.backdrop) : 'a canopy of blooms'}, two people made their promises in front of everyone they love, and the whole room seemed to hold its breath.`;
    const layList: Array<[string, string]> = [
      ['Guests', String(f.guests)],
      ['Layout', { round: 'Round tables', banquet: 'Banquet tables', ceremony: 'Ceremony rows', none: 'Open floor' }[f.mode]],
      ...(hasT ? ([['Tables', String(f.tables)]] as Array<[string, string]>) : []),
      ['Pieces placed', String(f.pieces)],
      ['Palette', p.name],
    ];
    const tblList = (
      [
        ['Linen', f.linen],
        ['Overlay', f.overlay],
        ['Chairs', f.chair],
        ['Chair décor', f.decor],
        ['Place setting', f.place],
        ['Centrepiece', f.centre],
      ] as Array<[string, string | null | undefined]>
    )
      .filter((r): r is [string, string] => !!r[1])
      .slice(0, 6);
    type Draw = (x: CanvasRenderingContext2D) => void;
    const ch = (o: ChapterOpts): Draw => (x) => chapterPage(x, o, st);
    const pages: Array<[Draw, Draw]> = [
      [(x) => drawCoverPage(x, st), (x) => drawEndpaper(x, 'L', true, st, p)],
      [(x) => drawTitle(x, st, c.venueName), ch({ num: 'I', title: 'The Venue', body: venueBody, n: 2 })],
      [(x) => photoPage(x, photos.wide, c.venueName, 3, { tilt: -0.03 }), ch({ num: 'II', title: 'The Ceremony', body: cer, n: 4 })],
      [(x) => photoPage(x, photos.couple, 'The view from the aisle', 5, { tilt: 0.025 }), ch({ num: 'III', title: 'The Layout', body: 'Every seat placed with intention — a room designed for conversation, laughter and long goodbyes.', list: layList, n: 6 })],
      [(x) => photoPage(x, photos.top, 'From above', 7, { tilt: -0.02 }), ch({ num: 'IV', title: 'The Tablescape', body: tblList.length ? 'The details, down to the last petal.' : 'An open floor, left free for dancing.', list: tblList, n: 8 })],
      [
        (x) => photoPage(x, photos.guest, 'A seat at the table', 9, { tilt: 0.03 }),
        ch({
          num: 'V',
          title: 'The Feast',
          menu: [
            ['To start', 'Burrata & grilled peach', 'hazelnut · honey · rocket'],
            ['The main', 'Slow-roasted lamb', 'rosemary potatoes · salsa verde'],
            ['To finish', f.cake, 'with a coupe of champagne'],
          ],
          n: 10,
        }),
      ],
      [
        (x) => photoPage(x, photos.close ?? photos.guest, 'The details', 11, { tilt: -0.025 }),
        ch({ num: 'VI', title: 'The First Dance', body: `When the candles burned low and the first notes began, the room stepped back and gave them the floor. Lights overhead, ${p.name.toLowerCase()} blooms glowing in the dark: one song that felt like forever.`, n: 12 }),
      ],
      [(x) => photoPage(x, photos.wide, 'The first dance', 13, { tilt: 0.02, night: true }), ch({ num: 'VII', title: 'Ever After', body: 'Thank you for being part of our story. For every hand held, every glass raised and every dance — this book is for you.', sign: true, n: 14 })],
      [(x) => drawEnd(x, st), (x) => drawEndpaper(x, 'R', false, st, p)],
    ];
    this.leaves.forEach((L, i) => {
      const [a, b] = pages[i];
      for (const [side, fn] of [
        [L.F, a],
        [L.B, b],
      ] as const) {
        side.x.save();
        fn(side.x);
        side.x.restore();
        side.t.needsUpdate = true;
      }
    });
  }

  private card(spr: number, o: { x: number; z: number; w: number; h: number; delay?: number; draw: (x: CanvasRenderingContext2D, w: number, h: number) => void }) {
    const tex = cardTex(o.w, o.h, o.draw),
      m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }),
      me = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), m);
    me.position.y = o.h / 2;
    me.castShadow = me.receiveShadow = true;
    me.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
    me.userData.own = true;
    const pv = new THREE.Group();
    pv.position.set(o.x, 0.05, o.z);
    pv.add(me);
    this.popRoot.add(pv);
    this.pops.push({ spr, pv, kind: 'card', delay: o.delay ?? 0, val: 0, vel: 0 });
  }

  /** A miniature of part of the design standing on a small paper disc. */
  private mini(spr: number, obj: THREE.Object3D, o: { x: number; z: number; r: number; maxH: number; delay?: number; spin?: number; disc?: boolean }) {
    obj.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(obj);
    if (b.isEmpty()) return;
    const sz = b.getSize(new THREE.Vector3()),
      c = b.getCenter(new THREE.Vector3()),
      s = Math.min((2 * o.r) / Math.max(sz.x, sz.z, 0.001), o.maxH / Math.max(sz.y, 0.001));
    obj.position.x -= c.x;
    obj.position.z -= c.z;
    obj.position.y -= b.min.y;
    const hold = new THREE.Group();
    hold.add(obj);
    hold.scale.setScalar(s);
    const inner = new THREE.Group();
    inner.add(hold);
    const pv = new THREE.Group();
    pv.position.set(o.x, 0.048, o.z);
    if (o.disc ?? true) {
      const d = mesh(pv, new THREE.CylinderGeometry(o.r * 1.12, o.r * 1.16, 0.018, 64), M('#efe6d4', 0.85), 0, 0.009, 0);
      d.userData.own = true;
      const rim = mesh(pv, new THREE.TorusGeometry(o.r * 1.14, 0.004, 6, 64), brass, 0, 0.018, 0);
      rim.rotation.x = PI / 2;
      rim.userData.own = true;
      inner.position.y = 0.018;
    }
    pv.add(inner);
    this.popRoot.add(pv);
    this.pops.push({ spr, pv, inner, kind: 'mini', delay: o.delay ?? 0, val: 0, vel: 0, spin: o.spin ?? 0.12 });
  }

  private grow(spr: number, obj: THREE.Object3D, o: { x: number; z: number; delay?: number }) {
    const pv = new THREE.Group();
    pv.position.set(o.x, 0.048, o.z);
    pv.add(obj);
    obj.traverse((n) => (n.userData.own = true));
    this.popRoot.add(pv);
    this.pops.push({ spr, pv, kind: 'mini', delay: o.delay ?? 0, val: 0, vel: 0, spin: 0 });
  }

  private clearPops() {
    for (const pp of this.pops) {
      pp.pv.traverse((o) => {
        if (!o.userData.own) return;
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.MeshStandardMaterial | undefined;
        mat?.map?.dispose();
        mat?.dispose?.();
      });
      this.popRoot.remove(pp.pv);
    }
    this.pops = [];
  }

  private buildPops(c: BookContent) {
    this.clearPops();
    const k0 = getSeedState();
    seed(77);
    const p = c.pal,
      kind = venueKind(c.venueName),
      hasT = c.facts.mode === 'round' || c.facts.mode === 'banquet';
    this.card(1, { x: 0, z: -0.47, w: 1.05, h: 0.78, draw: (x, w, h) => archCard(x, w, h, p) });
    this.card(1, { x: 0, z: -0.31, w: 1.35, h: 0.2, delay: 0.15, draw: (x, w, h) => bank(x, w, h, p) });
    this.card(2, { x: 0, z: -0.6, w: 1.6, h: 0.66, draw: (x, w, h) => skyCard(x, w, h, c.sky) });
    this.card(2, { x: 0, z: -0.48, w: 1.4, h: 0.52, delay: 0.12, draw: (x, w, h) => venueCard(x, w, h, c.sky, kind) });
    this.card(2, { x: 0, z: -0.34, w: 1.3, h: 0.2, delay: 0.24, draw: (x, w, h) => bank(x, w, h, p) });
    this.card(3, { x: 0, z: -0.56, w: 0.86, h: 0.72, draw: (x, w, h) => archCard(x, w, h, p) });
    this.card(3, { x: 0, z: -0.4, w: 1.35, h: 0.3, delay: 0.15, draw: (x, w, h) => chairsCard(x, w, h, p) });
    this.card(3, { x: 0, z: -0.3, w: 1.1, h: 0.12, delay: 0.25, draw: (x, w, h) => bankLow(x, w, h, p) });
    if (c.layoutAll && c.layoutAll.children.length) this.mini(4, c.layoutAll, { x: 0, z: -0.34, r: 0.42, maxH: 0.34 });
    else this.card(4, { x: 0, z: -0.45, w: 1.2, h: 0.4, draw: (x, w, h) => bank(x, w, h, p) });
    if (hasT && c.layoutNear && c.layoutNear.children.length) this.mini(5, c.layoutNear, { x: 0, z: -0.32, r: 0.38, maxH: 0.44, spin: 0.1 });
    else this.card(5, { x: 0, z: -0.45, w: 1.2, h: 0.4, draw: (x, w, h) => bank(x, w, h, p) });
    if (c.cake) this.mini(6, c.cake, { x: -0.46, z: -0.4, r: 0.16, maxH: 0.4, delay: 0.05, spin: 0.18 });
    if (c.champagne) this.mini(6, c.champagne, { x: 0.46, z: -0.42, r: 0.2, maxH: 0.46, delay: 0.2, spin: -0.12 });
    this.card(6, { x: 0, z: -0.6, w: 1.5, h: 0.26, delay: 0.3, draw: (x, w, h) => bannerCard(x, w, h, p, 'CHEERS') });
    this.card(7, { x: 0, z: -0.6, w: 1.6, h: 0.72, draw: (x, w, h) => nightCard(x, w, h) });
    {
      const g = new THREE.Group(),
        B = Builder(g);
      B.festoon([-0.72, 0.5, -0.44], [0.72, 0.5, -0.44], 0.14, 22, '#ffd79a', 6);
      for (const s of [-1, 1]) B.add('rod', [s * 0.72, 0.25, -0.44], [0.006, 0.5, 0.006], '#6b4a30');
      B.flush();
      this.grow(7, g, { x: 0, z: 0, delay: 0.15 });
    }
    this.card(7, { x: 0, z: -0.32, w: 1.25, h: 0.24, delay: 0.3, draw: (x, w, h) => candlesCard(x, w, h, p) });
    this.card(8, { x: -0.46, z: -0.52, w: 0.6, h: 0.84, draw: (x, w, h) => burstCard(x, w, h, '#e3c27a') });
    this.card(8, { x: 0.08, z: -0.6, w: 0.66, h: 0.96, delay: 0.15, draw: (x, w, h) => burstCard(x, w, h, p.b[1]) });
    this.card(8, { x: 0.52, z: -0.48, w: 0.5, h: 0.72, delay: 0.28, draw: (x, w, h) => burstCard(x, w, h, p.b[0]) });
    this.card(8, { x: 0, z: -0.34, w: 1.35, h: 0.3, delay: 0.4, draw: (x, w, h) => bannerCard(x, w, h, p, 'THANK YOU') });
    setSeedState(k0);
  }

  /* ------------------------------------------------------------ navigation */

  reset() {
    this.spread = 0;
    this.intro = true;
    this.auto = false;
    this.drag = null;
    for (const L of this.leaves) {
      L.th = 0;
      L.target = 0;
      L.anim = null;
      L.last = -1;
    }
    this.camP.set(0, 3, 2.4);
    this.ev.onSpread(0);
  }

  turnTo(s: number, dur?: number) {
    s = cl(s, 0, MAXS);
    if (s === this.spread) return;
    const fwd = s > this.spread;
    this.spread = s;
    let k = 0;
    const now = performance.now();
    for (const L of fwd ? this.leaves : this.leaves.slice().reverse()) {
      const i = this.leaves.indexOf(L),
        tg = i < this.spread ? PI : 0;
      if (L.target !== tg) {
        L.target = tg;
        L.dir = tg > L.th ? 1 : -1;
        L.anim = { from: L.th, to: tg, t0: now + k * 160, dur: dur ?? (this.motion ? 1150 : 280) };
        k++;
      }
    }
    swish();
    this.ev.onSpread(this.spread);
  }

  setAuto(on: boolean) {
    this.auto = on;
    this.autoT = this.spread > 0 ? 0 : -2;
    if (on && this.spread >= MAXS) this.turnTo(1);
  }

  private pDown = (e: PointerEvent) => {
    if (this.intro || e.button !== 0) return;
    const r = this.canvas.getBoundingClientRect(),
      fwd = (e.clientX - r.left) / r.width >= 0.5,
      i = fwd ? this.spread : this.spread - 1;
    if (fwd ? this.spread >= MAXS : this.spread <= 0) return;
    this.drag = { L: this.leaves[i], fwd, x0: e.clientX, moved: false, pw: Math.max(200, r.width * 0.3) };
    this.canvas.setPointerCapture(e.pointerId);
    if (this.auto) {
      this.auto = false;
      this.ev.onAutoEnd();
    }
  };
  private pMove = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    this.ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.ptr.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    const d = this.drag;
    if (!d) return;
    const dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      d.L.anim = null;
      d.L.dir = d.fwd ? 1 : -1;
      this.canvas.style.cursor = 'grabbing';
    }
    if (!d.moved) return;
    const q = cl(d.fwd ? -dx / d.pw : dx / d.pw, 0, 1);
    d.L.th = d.fwd ? q * PI : PI * (1 - q);
  };
  private pUp = () => {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.canvas.style.cursor = '';
    if (!d.moved) {
      this.turnTo(this.spread + (d.fwd ? 1 : -1));
      return;
    }
    const q = d.fwd ? d.L.th / PI : 1 - d.L.th / PI;
    if (q > 0.28) {
      this.spread += d.fwd ? 1 : -1;
      swish();
      this.ev.onSpread(this.spread);
    }
    const tg = this.leaves.indexOf(d.L) < this.spread ? PI : 0;
    d.L.target = tg;
    d.L.dir = tg > d.L.th ? 1 : -1;
    d.L.anim = { from: d.L.th, to: tg, t0: performance.now(), dur: this.motion ? 520 : 200 };
  };

  /** How far open spread `s` is (0 closed → 1 lying flat), which drives its pop-ups. */
  private openness(s: number) {
    if (s < 1) return 0;
    const a = this.leaves[s - 1].th / PI,
      b = s < this.leaves.length ? this.leaves[s].th / PI : 0;
    return cl((a - 0.5) / 0.5, 0, 1) * cl(1 - b / 0.45, 0, 1);
  }

  /* ------------------------------------------------------------ frame */

  private frame = () => {
    this.raf = requestAnimationFrame(this.frame);
    const now = performance.now(),
      dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.clock += dt;
    const t = this.clock,
      motion = this.motion;
    for (const L of this.leaves) {
      if (L.anim && !(this.drag && this.drag.L === L)) {
        const k = cl((now - L.anim.t0) / L.anim.dur, 0, 1),
          e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        L.th = L.anim.from + (L.anim.to - L.anim.from) * e;
        if (k >= 1) L.anim = null;
      }
      if (L.th !== L.last) {
        deform(L, L.th, L.rigid ? 0 : motion ? 1.2 : 0.45);
        L.last = L.th;
      }
      L.grp.position.y = L.y0 + (L.y1 - L.y0) * (L.th / PI);
    }
    this.book.position.x = -W * 0.515 * (1 - this.leaves[0].th / PI);
    for (const pp of this.pops) {
      const o = this.openness(pp.spr),
        tg = cl((o - pp.delay) / (1 - pp.delay), 0, 1);
      if (!motion) {
        pp.val = tg;
        pp.vel = 0;
      } else {
        pp.vel += ((tg - pp.val) * 120 - pp.vel * 10.5) * dt;
        pp.val += pp.vel * dt;
      }
      if (pp.kind === 'card') pp.pv.rotation.x = (-PI / 2) * (1 - Math.max(0, pp.val));
      else {
        const s = Math.max(0, pp.val);
        pp.pv.scale.setScalar(s || 1e-4);
        if (pp.inner && motion) pp.inner.rotation.y += (pp.spin ?? 0) * dt;
      }
      pp.pv.visible = pp.val > 0.004 || tg > 0;
      if (tg > 0.6 && !pp.popped) {
        pp.popped = true;
        blip();
      } else if (tg < 0.05) pp.popped = false;
    }
    this.petals.visible = this.dust.visible = motion;
    if (motion) {
      const m4 = new THREE.Matrix4(),
        q = new THREE.Quaternion(),
        e = new THREE.Euler(),
        v = new THREE.Vector3(),
        sc = new THREE.Vector3(0.022, 0.004, 0.015);
      this.pState.forEach((o, i) => {
        if (o.land > 0) {
          o.land -= dt;
          if (o.land <= 0) this.resetPetal(o);
        } else {
          o.y -= o.vy * dt;
          o.x += Math.sin(t * 0.7 + o.ph) * 0.06 * dt;
          o.z += Math.cos(t * 0.5 + o.ph) * 0.03 * dt;
          o.rx += dt * 1.4;
          o.ry += dt * 0.8;
          const bx = this.book.position.x,
            on = o.x > bx - W && o.x < bx + W && Math.abs(o.z) < H / 2,
            fl = on ? 0.05 : 0.004;
          if (o.y <= fl) {
            o.y = fl;
            o.land = 3 + Math.random() * 5;
            o.rx = (Math.random() - 0.5) * 0.3;
          }
        }
        e.set(o.rx, o.ry, 0);
        q.setFromEuler(e);
        m4.compose(v.set(o.x, o.y, o.z), q, sc);
        this.petals.setMatrixAt(i, m4);
      });
      this.petals.instanceMatrix.needsUpdate = true;
      this.dust.rotation.y = t * 0.01;
      this.dust.position.y = Math.sin(t * 0.2) * 0.05;
    }
    this.candleL.intensity = 1.8 * (0.85 + (motion ? 0.1 * Math.sin(t * 9) + 0.06 * Math.sin(t * 23) : 0));
    if (this.auto && !this.intro) {
      this.autoT += dt;
      if (this.autoT > (this.spread === 0 ? 1.5 : this.spread === 1 ? 7 : 10)) {
        this.autoT = 0;
        if (this.spread < MAXS) this.turnTo(this.spread + 1);
        else {
          this.auto = false;
          this.ev.onAutoEnd();
        }
      }
    }
    const big = [4, 5, 6].includes(this.spread),
      asp = this.CAM.aspect,
      fit = Math.max(1, 1.62 / asp);
    let tgt: THREE.Vector3, pos: THREE.Vector3;
    if (this.spread === 0) {
      tgt = new THREE.Vector3(this.intro && asp > 1.1 ? -0.62 : 0, 0, 0.02);
      pos = new THREE.Vector3(0, 2.05, 1.35);
    } else if (big) {
      tgt = new THREE.Vector3(0, 0.1, -0.12);
      pos = new THREE.Vector3(0, 1.7, 1.95);
    } else {
      tgt = new THREE.Vector3(0, 0, -0.05);
      pos = new THREE.Vector3(0, 2.2, 1.72);
    }
    pos.multiplyScalar(fit).add(tgt);
    if (motion) {
      pos.x += this.ptr.x * 0.14 + Math.sin(t * 0.13) * 0.04;
      pos.y += -this.ptr.y * 0.08;
      if (this.auto) pos.x += Math.sin(t * 0.25) * 0.12;
    }
    const k = motion ? 1 - Math.exp(-dt * 2.2) : 1;
    this.camP.lerp(pos, k);
    this.camT.lerp(tgt, k);
    this.CAM.position.copy(this.camP);
    this.CAM.lookAt(this.camT);
    this.COMP.render();
  };
}
