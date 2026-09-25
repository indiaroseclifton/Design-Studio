import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M, lathe, mesh, noSh, shared } from '../three/utils';
import { registerKind } from '../three/builder';

/*
 * Shared studio materials and geometry, ported from the prototype's "studio: materials & palettes" block.
 * Upgrades over the prototype: glass, china and metals are physically based so they pick up the scene's
 * environment reflections; plates are lathe-turned with a real rim; cutlery has shaped heads.
 */

const S = <T extends object>(x: T) => shared(x);

export const glassM = S(
  new THREE.MeshPhysicalMaterial({
    color: '#eef7f8',
    roughness: 0.03,
    metalness: 0,
    transparent: true,
    opacity: 0.26,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    specularIntensity: 1,
    envMapIntensity: 1.6,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
);
export const ghostM = S(
  new THREE.MeshPhysicalMaterial({ color: '#eef4f6', roughness: 0.04, transparent: true, opacity: 0.3, clearcoat: 1, envMapIntensity: 1.4, depthWrite: false }),
);
export const china = S(new THREE.MeshPhysicalMaterial({ color: '#fbfaf6', roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.12 }));
export const silver = S(M('#dcdcdc', 0.18, 1));
export const brass = S(M('#c9a25a', 0.28, 0.95));
export const wax = S(new THREE.MeshPhysicalMaterial({ color: '#f6efe0', roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#fff4dc') }));
export const stoneM = S(M('#e4ddd0', 0.9));
export const woodM = S(M('#7a5638', 0.6));
export const ironM = S(M('#1c1c1c', 0.5, 0.5));
export const clay = S(M('#b8582e', 0.8));
export const smokeM = S(
  new THREE.MeshPhysicalMaterial({ color: '#5a5a62', roughness: 0.05, transparent: true, opacity: 0.45, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),
);

export const wineGeo = S(lathe([[0.03, 0], [0.032, 0.003], [0.004, 0.008], [0.0035, 0.09], [0.02, 0.1], [0.038, 0.13], [0.042, 0.16], [0.038, 0.19]], 32));
export const coupeGeo = S(lathe([[0.03, 0], [0.032, 0.003], [0.004, 0.008], [0.004, 0.06], [0.03, 0.068], [0.045, 0.085], [0.047, 0.092]], 32));
export const gobletGeo = S(lathe([[0.035, 0], [0.036, 0.004], [0.006, 0.012], [0.006, 0.06], [0.03, 0.07], [0.038, 0.1], [0.036, 0.13]], 32));
export const fluteGeo = S(lathe([[0.028, 0], [0.03, 0.003], [0.004, 0.008], [0.0035, 0.07], [0.018, 0.08], [0.022, 0.14], [0.02, 0.2]], 32));
export const tumblerGeo = S(new THREE.CylinderGeometry(0.035, 0.03, 0.1, 32, 1, true));

/** A lathe-turned plate of radius r: flat well, raised shoulder and a rolled rim. Sits on y = 0. */
function plateGeo(r: number, h = 0.016) {
  return S(
    lathe(
      [
        [0, h * 0.45],
        [r * 0.62, h * 0.45],
        [r * 0.7, h * 0.55],
        [r * 0.9, h * 0.9],
        [r * 0.985, h],
        [r, h * 0.92],
        [r * 0.97, h * 0.72],
        [r * 0.72, h * 0.12],
        [r * 0.6, 0],
        [0, 0],
      ].reverse() as Array<[number, number]>,
      48,
    ),
  );
}
export const dinnerPlateGeo = plateGeo(0.135);
export const saladPlateGeo = plateGeo(0.1, 0.013);
export const chargerGeo = plateGeo(0.17, 0.012);

function shape(pts: Array<[number, number]>) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  return s;
}
const flat = (s: THREE.Shape, t = 0.003) => {
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0008, bevelSegments: 1 });
  g.rotateX(-Math.PI / 2);
  return g;
};
/** Knife, fork and spoon lying flat, pointing along -z (away from the guest), ~0.19 m long. */
export const knifeGeo = S(flat(shape([[-0.006, 0.095], [-0.007, -0.005], [-0.008, -0.08], [0, -0.095], [0.009, -0.075], [0.007, -0.005], [0.006, 0.095]])));
export const forkGeo = S(
  (() => {
    const handle = flat(shape([[-0.006, 0.095], [-0.004, -0.02], [0.004, -0.02], [0.006, 0.095]]));
    const head = flat(shape([[-0.011, -0.02], [-0.012, -0.05], [0.012, -0.05], [0.011, -0.02]]));
    const tines = [-0.009, -0.003, 0.003, 0.009].map((x) => flat(shape([[x - 0.0018, -0.05], [x - 0.0015, -0.09], [x + 0.0015, -0.09], [x + 0.0018, -0.05]]), 0.0022));
    return mergeGeometries([handle, head, ...tines])!;
  })(),
);
export const spoonGeo = S(
  (() => {
    const handle = flat(shape([[-0.006, 0.095], [-0.003, -0.03], [0.003, -0.03], [0.006, 0.095]]));
    const bowl = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    bowl.scale(0.02, 0.006, 0.032);
    bowl.rotateX(Math.PI);
    bowl.translate(0, 0.006, -0.058);
    const flatten = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);
    return mergeGeometries([flatten(handle), flatten(bowl)])!;
  })(),
);

export const glassOpen = (g: THREE.Object3D, r: number, h: number, x: number, y: number, z: number, s = 24) =>
  noSh(mesh(g, new THREE.CylinderGeometry(r, r, h, s, 1, true), glassM, x, y, z));

export const velvetM = (c: string) =>
  new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.4 });

registerKind('bauble', () => [new THREE.SphereGeometry(1, 16, 10), M('#fff', 0.18, 0.7)]);
