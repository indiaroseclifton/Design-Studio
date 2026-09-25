import * as THREE from 'three';
import { rnd } from '../three/utils';

/** A dome of fixed stars baked into a venue (the prototype's `stars`). */
export function stars(g: THREE.Object3D, n = 900) {
  const p: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = rnd() * Math.PI * 2,
      v = Math.acos(0.05 + rnd() * 0.95);
    p.push(Math.sin(v) * Math.cos(u) * 450, Math.cos(v) * 450, Math.sin(v) * Math.sin(u) * 450);
  }
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.add(new THREE.Points(bg, new THREE.PointsMaterial({ color: '#dfe6ff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })));
}
