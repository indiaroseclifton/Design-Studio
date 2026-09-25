import { chairSpots, hasTbl } from '../engine/studio';
import { layoutFrame } from './designOps';
import type { CameraPreset, Design, VenueDef } from '../types';

export type V3 = [number, number, number];

/** Camera position and target for a preset, framed on the current layout (the prototype's `presetCam`). */
export function presetView(k: CameraPreset, S: Design, venue: VenueDef): [V3, V3] {
  const m = S.table.mode,
    T = S.tables[0] || { x: 0, z: 0, ry: 0 },
    f = layoutFrame(S);
  if (k === 'guest') {
    if (m === 'ceremony') return [[0.95, 1.2, 0.7 + Math.max(2, Math.ceil(S.guests / 8))], [0, 1.3, -3.8]];
    if (hasTbl(m)) {
      const s = chairSpots(m, [T], 8)[0];
      const dx = s[0] - T.x,
        dz = s[1] - T.z,
        l = Math.hypot(dx, dz) || 1;
      return [
        [T.x + (dx / l) * (l + 0.2), 1.22, T.z + (dz / l) * (l + 0.2)],
        [T.x - (dx / l) * 0.3, 0.78, T.z - (dz / l) * 0.3],
      ];
    }
    return [[0, 1.6, 5], [0, 1, 0]];
  }
  if (k === 'top') return [[f.x + 0.01, 7 + f.ext * 1.8, f.z + 2.5 + f.ext * 0.4], [f.x, 0.4, f.z]];
  if (k === 'couple') {
    if (m === 'ceremony') return [[0, 1.65, -3.3], [0, 1.2, 3]];
    if (hasTbl(m)) return [m === 'banquet' ? [T.x + 3.2, 1.5, T.z] : [T.x, 1.5, T.z + 2.6], [T.x, 0.8, T.z]];
    return [[0, 1.6, -4], [0, 1, 2]];
  }
  // Wide: the venue's hero angle, pulled back to fit larger layouts.
  const pull = 1 + Math.max(0, f.ext - 2) * 0.18;
  return [[venue.cam[0] * pull + f.x, venue.cam[1] * Math.min(pull, 1.6), venue.cam[2] * pull + f.z], [f.x, 0.9, f.z]];
}

