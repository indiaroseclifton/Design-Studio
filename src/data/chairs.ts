import * as THREE from 'three';
import type { ChairStyle } from '../types';
import { box, cyl, mesh, M } from '../three/utils';

export function buildChair(g: THREE.Group, style: ChairStyle) {
  if (style.type === 'ghost') return buildGhostChair(g, style);
  if (style.type === 'bent') return buildBentChair(g, style);
  if (style.type === 'rattan') return buildRattanChair(g, style);
  return buildFrameChair(g, style);
}

function buildFrameChair(g: THREE.Group, style: ChairStyle) {
  const color = style.color ?? '#8a7560';
  const seat = style.seat ?? '#eee5d6';
  const frame = M(color, style.metal ? 0.3 : 0.75, style.metal ? 0.85 : 0);
  const seatMat = M(seat, 0.8);
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

function buildRattanChair(g: THREE.Group, style: ChairStyle) {
  const color = style.color ?? '#c9a877';
  const seat = style.seat ?? '#f1e9d8';
  const frame = M(color, 0.9, 0);
  const seatMat = M(seat, 0.85);
  const seatSize = 0.44;
  const half = seatSize * 0.42;
  const seatH = 0.46;

  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as [number, number][]) {
    cyl(g, 0.022, 0.022, seatH, frame, x * half, seatH / 2, z * half);
  }
  box(g, seatSize, 0.05, seatSize, seatMat, 0, seatH + 0.02, 0);

  const backY = seatH + 0.03;
  const backZ = -half;
  const fan = mesh(g, new THREE.TorusGeometry(0.24, 0.02, 8, 24, Math.PI), frame, 0, backY + 0.34, backZ);
  fan.rotation.x = Math.PI / 2;
  for (let i = -3; i <= 3; i++) cyl(g, 0.012, 0.012, 0.4, frame, i * 0.055, backY + 0.2, backZ);
  for (let i = 0; i < 3; i++) box(g, seatSize * 0.86, 0.012, 0.02, frame, 0, backY + 0.08 + i * 0.12, backZ);
}

function buildBentChair(g: THREE.Group, style: ChairStyle) {
  const color = style.color ?? '#3a2a1e';
  const seat = style.seat ?? '#2a2622';
  const frame = M(color, 0.5, 0.3);
  const seatMat = M(seat, 0.8);
  const seatR = 0.2;
  const seatH = 0.46;

  cyl(g, seatR, seatR, 0.03, seatMat, 0, seatH, 0, 20);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    cyl(g, 0.015, 0.015, seatH, frame, Math.cos(a) * seatR * 0.85, seatH / 2, Math.sin(a) * seatR * 0.85);
  }
  const hoop = mesh(g, new THREE.TorusGeometry(0.19, 0.014, 8, 24, Math.PI * 1.4), frame, 0, seatH + 0.32, -0.14);
  hoop.rotation.x = Math.PI / 2;
  hoop.rotation.z = Math.PI * 0.3;
  cyl(g, 0.014, 0.014, 0.32, frame, -0.17, seatH + 0.16, -0.1);
  cyl(g, 0.014, 0.014, 0.32, frame, 0.17, seatH + 0.16, -0.1);
}

function buildGhostChair(g: THREE.Group, style: ChairStyle) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: style.color ?? '#dfe9ee',
    transparent: true,
    opacity: 0.35,
    roughness: 0.15,
    transmission: 0.6,
    thickness: 0.3,
  });
  const seatH = 0.46;
  mesh(g, new THREE.BoxGeometry(0.42, 0.05, 0.42), mat, 0, seatH, 0);
  const back = mesh(g, new THREE.BoxGeometry(0.4, 0.55, 0.05), mat, 0, seatH + 0.29, -0.18);
  back.rotation.x = -0.15;
  for (const [x, z] of [
    [-0.16, -0.16],
    [0.16, -0.16],
    [-0.16, 0.16],
    [0.16, 0.16],
  ] as [number, number][]) {
    cyl(g, 0.02, 0.025, seatH, mat, x, seatH / 2, z);
  }
}
