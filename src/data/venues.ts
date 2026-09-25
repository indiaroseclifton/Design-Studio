import * as THREE from 'three';
import type { VenueDef } from '../types';
import { box, cyl, ground, mesh, jit, pick, rnd, M } from '../three/utils';
import { T, tm, planks, tiles, noise, bricks } from '../three/textures';
import { flick, plight, flame } from '../three/builder';

const RUSTIC_BARN: VenueDef = {
  name: 'Rustic Barn',
  indoor: true,
  sub: 'Timber trusses & Edison bulbs · Evening',
  desc: 'A restored hay barn with exposed trusses, a wagon-wheel chandelier and a canopy of warm bulbs. The back doors open onto the fields at dusk.',
  env: {
    sky: ['#26324f', '#e59a62', '#2e2a22'],
    fog: ['#2a2119', 30, 110],
    hemi: ['#ffd7a3', '#3a2716', 0.5],
    sun: ['#ffb46e', 2.6, [0, 5, -40]],
    exp: 1.1,
    env: 0.25,
  },
  cam: [5.5, 2.4, 8.5],
  chair: { type: 'cross', color: '#7a5234', seat: '#d8c7a8' },
  cloth: '#ece3d3',
  build(g, B, tk) {
    box(g, 16, 0.2, 24, tm(T(planks(['#8a5a36', '#7b4f2f', '#96663f', '#6f4629']), [4, 6])), 0, -0.1, 0);
    ground(g, M('#4d5a2e', 1), 500, -0.02);
    const wm = tm(T(planks(['#6b4428', '#5e3b22', '#7a4e2e', '#4f3220'], { n: 10 }), [3, 1.5], 512, Math.PI / 2), 0.9);
    box(g, 0.3, 6, 24, wm, -8, 3, 0);
    box(g, 0.3, 6, 24, wm, 8, 3, 0);
    box(g, 6, 6, 0.3, wm, -5, 3, -12);
    box(g, 6, 6, 0.3, wm, 5, 3, -12);
    box(g, 4, 2, 0.3, wm, 0, 5, -12);
    mesh(
      g,
      new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-8, 0), new THREE.Vector2(8, 0), new THREE.Vector2(0, 4)]), {
        depth: 0.3,
        bevelEnabled: false,
      }),
      wm,
      0,
      6,
      -12.15,
    );
    const rl = Math.hypot(8, 4) + 0.8,
      ang = Math.atan2(4, 8),
      rm = tm(T(planks(['#4a3020', '#3f2819', '#553722']), [2, 6]), 0.9);
    box(g, rl, 0.25, 24.6, rm, -4, 8.15, 0).rotation.z = ang;
    box(g, rl, 0.25, 24.6, rm, 4, 8.15, 0).rotation.z = -ang;
    const beam = M('#5a3a22', 0.8),
      zs = [-9, -4.5, 0, 4.5, 9];
    for (const z of zs) {
      box(g, 0.35, 6, 0.35, beam, -7.65, 3, z);
      box(g, 0.35, 6, 0.35, beam, 7.65, 3, z);
      box(g, 15.3, 0.35, 0.35, beam, 0, 5.7, z);
      box(g, 0.28, 4.1, 0.28, beam, 0, 7.8, z);
      for (const s of [-1, 1]) {
        box(g, 1.6, 0.22, 0.22, beam, s * 6.95, 5.0, z).rotation.z = (-s * Math.PI) / 4;
        box(g, rl - 0.6, 0.3, 0.3, beam, s * 4, 7.85, z).rotation.z = -s * ang;
      }
    }
    box(g, 0.3, 0.3, 24, beam, 0, 9.7, 0);
    for (let i = 0; i < 4; i++) {
      B.festoon([-7.4, 5.45, zs[i]], [7.4, 5.45, zs[i + 1]], 0.9, 30);
      B.festoon([7.4, 5.45, zs[i]], [-7.4, 5.45, zs[i + 1]], 0.9, 30);
    }
    const iron = M('#2a2320', 0.5, 0.6);
    mesh(g, new THREE.TorusGeometry(1.1, 0.05, 8, 40), M('#4a3322', 0.7), 0, 4.3, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      B.add('glow', [Math.cos(a) * 1.1, 4.42, Math.sin(a) * 1.1], 0.06, '#ffc27a', null, 5);
      if (i % 3 === 0) B.wire([Math.cos(a) * 1.1, 4.3, Math.sin(a) * 1.1], [0, 5.55, 0]);
      if (i % 2 === 0) {
        const sp = box(g, 1.1, 0.05, 0.05, iron, Math.cos(a) * 0.55, 4.3, Math.sin(a) * 0.55);
        sp.rotation.y = -a;
      }
    }
    flick(tk, plight(g, '#ffb866', 14, 14, 0, 4, 0), 14, 0.3);
    plight(g, '#ffb866', 8, 14, 0, 4.8, -6.5);
    plight(g, '#ffb866', 8, 14, 0, 4.8, 6.5);
    for (let l = 0; l < 2; l++)
      for (let z = -10.5; z < -3; z += 1.15)
        B.add('box', [-7.2, 0.25 + l * 0.5, z + l * 0.5], [1.1, 0.5, 0.55], jit('#c9a358', 0.08), [0, Math.PI / 2, 0]);
    for (const z of [5, 6.2, 8.5])
      B.add('box', [-7.1, 0.25, z], [1.1, 0.5, 0.55], jit('#c9a358', 0.08), [0, Math.PI / 2 + rnd() * 0.3, 0]);
    for (const z of [-8, -5.5]) {
      B.add('rod', [6.9, 0.45, z], [0.38, 0.9, 0.38], '#6b4428');
      B.add('metal', [6.9, 0.2, z], [0.39, 0.04, 0.39], '#333');
      B.add('metal', [6.9, 0.7, z], [0.39, 0.04, 0.39], '#333');
    }
    box(g, 0.8, 0.07, 3.4, M('#6f4a2c', 0.7), 6.9, 0.94, -6.75);
    for (const [x, z] of [
      [-1.8, -11.4],
      [1.8, -11.4],
      [-6.8, 3],
      [6.8, 3],
    ] as [number, number][]) {
      B.add('box', [x, 0.2, z], [0.24, 0.4, 0.24], '#231c16');
      flame(B, x, 0.24, z, 0.9);
    }
    for (let i = 0; i < 16; i++) {
      const x = (rnd() - 0.5) * 60;
      if (Math.abs(x) < 5) continue;
      B.tree(x, -22 - rnd() * 30, { h: 4 + rnd() * 2, s: 1.2 });
    }
  },
};

const BEACH_SUNSET: VenueDef = {
  name: 'Beach at Sunset',
  sub: 'Bamboo canopy on the sand · Sunset',
  desc: 'Barefoot on the shoreline under a bamboo canopy hung with sheer voile, tiki torches lighting the path to the water.',
  env: {
    sky: ['#3b3f78', '#ff9a62', '#e8b58a'],
    fog: ['#f3a877', 70, 320],
    hemi: ['#ffc6a0', '#d8b48a', 0.95],
    sun: ['#ff9c5a', 2.4, [5, 7, -60]],
    exp: 1,
    env: 0.4,
    bloom: 0.7,
  },
  cam: [0.5, 2.1, 8.6],
  chair: { type: 'cross', color: '#e6ddcc', seat: '#f4efe6' },
  cloth: '#fbf7f0',
  build(g, B, tk) {
    const sand = mesh(g, new THREE.PlaneGeometry(600, 300), tm(T(noise('#e6c9a0', ['#d9b98c', '#f1dcb8', '#cfae82'], 14000, 2), [80, 40]), 1), 0, 0, 142);
    sand.rotation.x = -Math.PI / 2;
    sand.castShadow = false;
    const wet = mesh(g, new THREE.PlaneGeometry(600, 8), M('#a98b66', 0.4), 0, -0.12, -11.5);
    wet.rotation.x = -Math.PI / 2 + 0.035;
    wet.castShadow = false;
    const oc = new THREE.PlaneGeometry(600, 300, 140, 70);
    oc.rotateX(-Math.PI / 2);
    const ocean = mesh(g, oc, M('#1f5a6c', 0.16, 0.3), 0, -0.08, -158);
    ocean.castShadow = false;
    const base = (oc.attributes.position.array as Float32Array).slice();
    tk.push((t) => {
      const p = oc.attributes.position.array as Float32Array;
      for (let i = 0; i < p.length; i += 3) {
        const x = base[i],
          z = base[i + 2];
        p[i + 1] = Math.sin(x * 0.16 + t * 0.9) * 0.07 + Math.sin(z * 0.33 + t * 1.3 + x * 0.04) * 0.09;
      }
      oc.attributes.position.needsUpdate = true;
      oc.computeVertexNormals();
    });
    const foamM = new THREE.MeshBasicMaterial({ color: '#fff8ee', transparent: true, opacity: 0.5, depthWrite: false });
    const foam = mesh(g, new THREE.PlaneGeometry(600, 0.9), foamM, 0, 0, -8.3);
    foam.rotation.x = -Math.PI / 2;
    foam.castShadow = false;
    tk.push((t) => {
      foamM.opacity = 0.25 + 0.25 * Math.sin(t * 0.8);
      foam.position.z = -8.4 + Math.sin(t * 0.8) * 0.5;
    });
    const sunDisc = mesh(g, new THREE.SphereGeometry(14, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb070').multiplyScalar(2.2), fog: false }), 30, 10, -420);
    sunDisc.castShadow = false;
    const bam = M('#b89a64', 0.6);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.07, 0.08, 3.3, bam, sx * 2.35, 1.65, sz * 2.35, 10);
    for (const z of [-2.35, 2.35]) cyl(g, 0.06, 0.06, 5, bam, 0, 3.3, z, 10).rotation.z = Math.PI / 2;
    for (const x of [-2.35, 2.35]) cyl(g, 0.06, 0.06, 5, bam, x, 3.3, 0, 10).rotation.x = Math.PI / 2;
    const voile = new THREE.MeshStandardMaterial({ color: '#fffaf2', roughness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    const top = new THREE.PlaneGeometry(5, 5, 12, 12),
      tp = top.attributes.position;
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i) / 2.5,
        y = tp.getY(i) / 2.5;
      tp.setZ(i, -0.35 * (1 - x * x) * (1 - y * y));
    }
    top.computeVertexNormals();
    const topMesh = mesh(g, top, voile, 0, 3.35, 0);
    topMesh.rotation.x = -Math.PI / 2;
    topMesh.castShadow = false;
    let k = 0;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const pv = new THREE.Group();
        pv.position.set(sx * 2.45, 3.3, sz * 2.45);
        pv.rotation.y = Math.atan2(sx, sz);
        g.add(pv);
        mesh(pv, new THREE.PlaneGeometry(1.1, 3.2, 1, 8), voile, 0, -1.6, 0).castShadow = false;
        const ph = k++;
        tk.push((t) => {
          pv.rotation.x = Math.sin(t * 1.1 + ph) * 0.07;
          pv.rotation.z = Math.sin(t * 0.7 + ph * 2) * 0.04;
        });
      }
    const torches: Array<[number, number]> = [
      [-3.6, -3.6],
      [3.6, -3.6],
      [-1.6, -6],
      [1.6, -6],
      [-3.6, 3.6],
      [3.6, 3.6],
    ];
    torches.forEach(([x, z], i) => {
      B.add('rod', [x, 0.9, z], [0.035, 1.8, 0.035], '#8a6a42');
      B.add('trunk', [x, 1.85, z], [0.09, 0.22, 0.09], '#5a4228', [Math.PI, 0, 0]);
      flame(B, x, 2.05, z, 1.4);
      if (i < 4) flick(tk, plight(g, '#ff9a48', 5, 9, x, 2.2, z), 5);
    });
    const palms: Array<[number, number, number, number]> = [
      [-9, -4, 6.5, 1.2],
      [-12, 2, 7.5, 1.6],
      [10, -3, 7, -1.2],
      [13, 4, 6, -1.4],
      [-7, 9, 5.5, 0.9],
      [16, -9, 8, -1],
    ];
    for (const [x, z, h, dx] of palms) B.palm(x, z, h, dx, 0.3);
    for (let i = 0; i < 12; i++) {
      const x = (rnd() - 0.5) * 30;
      B.add('leaf', [x, 0.1, -7 - rnd() * 2], [0.3 + rnd() * 0.5, 0.2 + rnd() * 0.2, 0.3 + rnd() * 0.3], jit('#6d6358', 0.1));
    }
    for (let i = 0; i < 30; i++) {
      const a = rnd() * 6.28,
        r = 3.5 + rnd() * 2;
      B.add('ball', [Math.sin(a) * r, 0.02, Math.cos(a) * r], [0.04, 0.01, 0.04], pick(['#fff4f0', '#f4b8c0', '#ffe0d0']));
    }
  },
};

const ENGLISH_GARDEN: VenueDef = {
  name: 'English Garden',
  sub: 'Walled rose garden & gazebo · Morning',
  desc: 'Clipped box hedges, blowsy rose beds and lavender borders inside an old brick wall, with a white gazebo at the end of the gravel walk.',
  env: {
    sky: ['#5d93d6', '#d7e8f3', '#9bb87a'],
    fog: ['#d6e6ef', 45, 200],
    hemi: ['#dbeaff', '#5a7a3a', 1.05],
    sun: ['#fff1d6', 3.2, [14, 24, 10]],
    exp: 1,
    env: 0.35,
  },
  cam: [6, 2.3, 7.4],
  chair: { type: 'chiavari', color: '#f2efe9', seat: '#f7f3ec' },
  cloth: '#f6f1ea',
  build(g, B) {
    ground(g, tm(T(noise('#5f8a3c', ['#6f9a45', '#557f34', '#7aa650', '#4a722e'], 16000, 3), [70, 70]), 1), 500);
    const grav = tm(T(noise('#cfc4ae', ['#b9ad96', '#e0d7c4', '#a89c86'], 12000, 2), [1, 4]), 1);
    box(g, 2.2, 0.04, 7, grav, 0, 0.02, -6.4);
    box(g, 2.2, 0.04, 6, grav, 0, 0.02, 6.2);
    const hedge = (x1: number, z1: number, x2: number, z2: number) => {
      const L = Math.hypot(x2 - x1, z2 - z1);
      B.add('box', [(x1 + x2) / 2, 0.4, (z1 + z2) / 2], [0.55, 0.8, L], jit('#2f4d26', 0.04), [0, Math.atan2(x2 - x1, z2 - z1), 0]);
    };
    hedge(-6.5, -8, -6.5, 8);
    hedge(6.5, -8, 6.5, 8);
    hedge(-6.5, -8, -1.3, -8);
    hedge(1.3, -8, 6.5, -8);
    hedge(-6.5, 8, -1.3, 8);
    hedge(1.3, 8, 6.5, 8);
    const rc = ['#f2a6b8', '#e8768e', '#fff4ec', '#c73a4f', '#f7c9b0'];
    for (let z = -7; z <= 7.1; z += 1.05) {
      B.rose(-5.6, z, pick(rc), 0.45);
      B.rose(5.6, z, pick(rc), 0.45);
    }
    for (let x = -5; x <= 5; x += 0.35) {
      if (Math.abs(x) < 1.5) continue;
      for (const z of [-7.2, 7.2]) {
        B.add('leaf', [x, 0.25, z], [0.18, 0.28, 0.18], '#6f8a5a');
        for (let j = 0; j < 4; j++)
          B.add('cone', [x + (rnd() - 0.5) * 0.25, 0.55 + rnd() * 0.15, z + (rnd() - 0.5) * 0.25], [0.03, 0.22, 0.03], jit('#8a72c0', 0.08));
      }
    }
    const posts: Array<[number, number]> = [
      [-6.5, -8],
      [6.5, -8],
      [-6.5, 8],
      [6.5, 8],
      [-1.4, -8],
      [1.4, -8],
      [-1.4, 8],
      [1.4, 8],
    ];
    for (const [x, z] of posts) {
      B.add('box', [x, 0.45, z], [0.7, 0.9, 0.7], '#2c4824');
      B.add('leaf', [x, 1.3, z], 0.5, jit('#2f5227', 0.04));
    }
    const wh = M('#f4f1ea', 0.6);
    const gz = new THREE.Group();
    gz.position.set(0, 0, -12.5);
    g.add(gz);
    cyl(gz, 3.1, 3.2, 0.35, M('#e3ddd0', 0.9), 0, 0.17, 0, 8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      cyl(gz, 0.07, 0.08, 2.8, wh, Math.sin(a) * 2.8, 1.75, Math.cos(a) * 2.8, 10);
    }
    cyl(gz, 3, 3, 0.22, wh, 0, 3.2, 0, 8);
    mesh(gz, new THREE.ConeGeometry(3.5, 1.9, 8), M('#dcd6cc', 0.7), 0, 4.25, 0).rotation.y = Math.PI / 8;
    mesh(gz, new THREE.SphereGeometry(0.16, 12, 8), wh, 0, 5.3, 0);
    const brick = tm(T(bricks(['#9a4a36', '#a8563e', '#8a3f2e', '#b0634a'], '#c9b9a0'), [10, 1.2]), 0.95);
    box(g, 44, 3.4, 0.6, brick, 0, 1.7, -20);
    box(g, 44.4, 0.2, 0.9, M('#c8bca6'), 0, 3.45, -20);
    for (let i = 0; i < 60; i++) {
      const x = (rnd() - 0.5) * 42;
      B.add('leaf', [x, 0.5 + rnd() * 2.6, -19.6], 0.35 + rnd() * 0.35, jit('#3f6230', 0.1));
      if (rnd() < 0.6) B.add('ball', [x + (rnd() - 0.5) * 0.4, 0.6 + rnd() * 2.6, -19.35], 0.1, pick(rc));
    }
    for (let i = 0; i < 26; i++) {
      const a = rnd() * 6.28,
        r = 16 + rnd() * 26,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      if (z < -18 && z > -24) continue;
      B.tree(x, z, { h: 5 + rnd() * 3, s: 1.4 + rnd() * 0.6, leaf: pick(['#4f6b35', '#5d7a3a', '#3f5e2e']) });
    }
    for (const x of [-1.5, 1.5]) {
      B.add('trunk', [x, 0.35, -9], [0.3, 0.7, 0.3], '#cfc8b8', [Math.PI, 0, 0]);
      B.add('box', [x, 0.05, -9], [0.5, 0.1, 0.5], '#cfc8b8');
      B.rose(x, -9, '#f2a6b8', 0.35, 0.55);
    }
    box(g, 1.8, 0.08, 0.5, M('#8a6a4a', 0.8), -9.5, 0.45, -2).rotation.y = Math.PI / 2;
  },
};

const GRAND_BALLROOM: VenueDef = {
  name: 'Grand Ballroom',
  indoor: true,
  sub: 'Marble, crystal & velvet · Evening',
  desc: 'A gilded ballroom with checkerboard marble, tall arched windows onto the night and three tiered crystal chandeliers overhead.',
  env: {
    sky: ['#0c1020', '#1a1e30', '#0a0a0a'],
    fog: ['#1a130c', 40, 140],
    hemi: ['#ffe9c8', '#3a2a1a', 0.4],
    sun: ['#9fb6ff', 0.25, [-10, 20, 5]],
    exp: 1.1,
    env: 0.6,
    bloom: 0.6,
  },
  cam: [6.2, 2.6, 8.2],
  maxD: 13,
  chair: { type: 'chiavari', color: '#c8a45a', metal: true, seat: '#f2eadb' },
  cloth: '#f7f2e8',
  build(g, B, tk) {
    box(g, 26, 0.2, 30, M('#fff', 0.18, 0, { map: T(tiles(['#ece6d9', '#a99f8c'], 8, '#9a907e', { check: true, gap: 1, veins: true }), [6, 7], 512, Math.PI / 4) }), 0, -0.1, 0);
    const wall = M('#efe6d6', 0.8),
      gold = M('#c9a25a', 0.3, 1),
      crim = M('#5e1b26', 0.95);
    box(g, 0.4, 9, 30, wall, -13, 4.5, 0);
    box(g, 0.4, 9, 30, wall, 13, 4.5, 0);
    box(g, 26, 9, 0.4, wall, 0, 4.5, -15);
    box(g, 26, 0.3, 30, M('#f3ecde', 0.9), 0, 9.1, 0);
    for (const s of [-1, 1]) {
      box(g, 0.6, 0.4, 30, gold, s * 12.7, 8.8, 0);
      box(g, 0.5, 0.25, 30, gold, s * 12.75, 0.12, 0);
    }
    box(g, 26, 0.4, 0.6, gold, 0, 8.8, -14.7);
    for (let z = -13.5; z <= 13.6; z += 3) {
      for (const s of [-1, 1]) {
        box(g, 0.3, 8.6, 0.6, M('#f6efe2', 0.7), s * 12.7, 4.3, z);
        box(g, 0.4, 0.4, 0.8, gold, s * 12.65, 8.4, z);
      }
    }
    const night = new THREE.MeshBasicMaterial({ color: '#1a2848' });
    for (let z = -12; z <= 12.1; z += 3) {
      for (const s of [-1, 1]) {
        box(g, 0.1, 4.4, 1.7, night, s * 12.75, 3.4, z);
        mesh(g, new THREE.CylinderGeometry(0.85, 0.85, 0.1, 28), night, s * 12.75, 5.6, z).rotation.z = Math.PI / 2;
        box(g, 0.12, 0.06, 1.7, gold, s * 12.72, 3.4, z);
        box(g, 0.12, 5.6, 0.06, gold, s * 12.72, 3.5, z);
        for (const d of [-1, 1]) box(g, 0.25, 7, 0.45, crim, s * 12.5, 3.5, z + d * 1.1);
      }
    }
    box(g, 10, 0.6, 4, M('#3a2a20', 0.6), 0, 0.3, -12.8);
    for (let x = -12.8; x <= 12.8; x += 0.28)
      B.add('rod', [x, 4.4, -14.6 + (Math.round(x / 0.28) % 2) * 0.08], [0.16, 8.8, 0.16], jit('#5a1822', 0.04));
    const chand = (z: number) => {
      const y = 6.1;
      mesh(g, new THREE.TorusGeometry(1.1, 0.04, 8, 48), gold, 0, y, z).rotation.x = Math.PI / 2;
      mesh(g, new THREE.TorusGeometry(0.62, 0.035, 8, 32), gold, 0, y + 0.6, z).rotation.x = Math.PI / 2;
      cyl(g, 0.03, 0.03, 9 - y, gold, 0, (9 + y) / 2, z, 8);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2,
          x = Math.cos(a) * 1.1,
          zz = z + Math.sin(a) * 1.1;
        B.add('rod', [x, y + 0.08, zz], [0.02, 0.16, 0.02], '#fbf6ea');
        B.add('glow', [x, y + 0.2, zz], [0.03, 0.06, 0.03], '#ffd9a0', null, 6);
        for (let j = 0; j < 3; j++) B.add('crystal', [Math.cos(a + 0.2) * 1.08, y - 0.14 - j * 0.12, z + Math.sin(a + 0.2) * 1.08], [0.035, 0.08, 0.035]);
      }
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        B.add('glow', [Math.cos(a) * 0.62, y + 0.78, z + Math.sin(a) * 0.62], [0.03, 0.06, 0.03], '#ffd9a0', null, 6);
      }
      for (let j = 0; j < 60; j++) {
        const h = rnd(),
          r = (1 - h) * 0.55 * rnd(),
          a = rnd() * 6.28;
        B.add('crystal', [Math.cos(a) * r, y - 0.9 + h * 1.5, z + Math.sin(a) * r], [0.035, 0.08, 0.035]);
      }
      flick(tk, plight(g, '#ffd29a', 22, 20, 0, y - 0.4, z), 22, 0.15);
    };
    chand(-8);
    chand(0);
    chand(8);
    for (const s of [-1, 1])
      for (const z of [-6, 6]) {
        B.add('trunk', [s * 11.6, 0.6, z], [0.35, 1.2, 0.35], '#d9cfbd');
        B.add('leaf', [s * 11.6, 1.6, z], 0.55, jit('#e8e0d0', 0.04));
      }
  },
};

/** Order follows the prototype's SCENES array (the venues not yet ported are skipped). */
export const VENUES: VenueDef[] = [RUSTIC_BARN, BEACH_SUNSET, ENGLISH_GARDEN, GRAND_BALLROOM];
