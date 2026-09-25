import * as THREE from 'three';
import type { ChairStyle } from '../types';
import { box, cyl, mesh, M } from '../three/utils';

export function buildChair(g: THREE.Group, style: ChairStyle) {
  const frame = M(style.color, style.metal ? 0.3 : 0.75, style.metal ? 0.85 : 0);
  const seatMat = M(style.seat, 0.8);
  const seatSize = 0.42;
  const half = seatSize * 0.42;
  const seatH = 0.46;
  const legR = style.type === 'chiavari' ? 0.014 : 0.02;

  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as [number, number][]) {
    cyl(g, legR, legR, seatH, frame, x * half, seatH / 2, z * half);
  }
  box(g, seatSize, 0.04, seatSize, seatMat, 0, seatH + 0.02, 0);

  const backBaseY = seatH + 0.02;
  const backTopY = backBaseY + 0.42;
  const backZ = -half;

  if (style.type === 'cross') {
    for (const x of [-1, 1]) cyl(g, 0.018, 0.018, 0.42, frame, x * half, backBaseY + 0.21, backZ);
    box(g, seatSize * 0.92, 0.03, 0.03, frame, 0, backTopY, backZ);
    const diag = Math.SQRT2 * half;
    const rail1 = box(g, diag, 0.025, 0.025, frame, 0, backBaseY + 0.21, backZ);
    rail1.rotation.y = Math.PI / 4;
    const rail2 = box(g, diag, 0.025, 0.025, frame, 0, backBaseY + 0.21, backZ);
    rail2.rotation.y = -Math.PI / 4;
  } else {
    for (let i = -2; i <= 2; i++) cyl(g, 0.012, 0.012, 0.42, frame, i * 0.08, backBaseY + 0.21, backZ);
    const topRail = mesh(g, new THREE.TorusGeometry(seatSize * 0.44, 0.02, 8, 20, Math.PI), frame, 0, backTopY, backZ);
    topRail.rotation.x = Math.PI / 2;
    topRail.rotation.z = Math.PI;
  }
}
