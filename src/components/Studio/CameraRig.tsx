import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { chairSpots, hasTbl } from '../../engine/studio';
import { layoutFrame } from '../../lib/designOps';
import { useDesignStore } from '../../store/designStore';
import type { CameraPreset, Design, VenueDef } from '../../types';

type V3 = [number, number, number];

/** Camera position and target for a preset, framed on the current layout (the prototype's `presetCam`). */
function presetView(k: CameraPreset, S: Design, venue: VenueDef): [V3, V3] {
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

/** Point a camera straight down at the layout (plan view). */
function frameTopDown(camera: THREE.Camera, x: number, z: number, ext: number) {
  camera.position.set(x, 40, z + 0.001);
  camera.lookAt(x, 0, z);
  if (camera instanceof THREE.OrthographicCamera) {
    camera.zoom = Math.max(14, Math.min(60, 300 / (ext * 2 + 8)));
    camera.updateProjectionMatrix();
  }
}

const TWEEN_S = 0.9;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

interface Tween {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  t: number;
}

export function CameraRig({ venue }: { venue: VenueDef }) {
  const camera = useThree((s) => s.camera);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const tween = useRef<Tween | null>(null);
  const preset = useDesignStore((s) => s.cameraPreset);
  const presetNonce = useDesignStore((s) => s.cameraNonce);
  const motion = useDesignStore((s) => s.motion);
  const autoRotate = useDesignStore((s) => s.autoRotate);
  const planView = useDesignStore((s) => s.planView);

  useEffect(() => {
    const controls = controlsRef.current;
    const S = useDesignStore.getState().design;
    if (planView) {
      tween.current = null;
      const f = layoutFrame(S);
      frameTopDown(camera, f.x, f.z, f.ext);
      controls?.target.set(f.x, 0, f.z);
      controls?.update();
      return;
    }
    const [p, t] = presetView(preset, S, venue);
    const toPos = new THREE.Vector3(...p);
    const toTarget = new THREE.Vector3(...t);
    if (!motion || !controls) {
      tween.current = null;
      camera.position.copy(toPos);
      controls?.target.copy(toTarget);
      controls?.update();
      return;
    }
    tween.current = { fromPos: camera.position.clone(), toPos, fromTarget: controls.target.clone(), toTarget, t: 0 };
    // presetNonce re-runs this when the same preset is requested again (Reset camera, a new layout).
  }, [preset, presetNonce, venue, camera, planView, motion]);

  useFrame((_, delta) => {
    const tw = tween.current;
    const controls = controlsRef.current;
    if (!tw || !controls) return;
    tw.t = Math.min(1, tw.t + delta / TWEEN_S);
    const k = ease(tw.t);
    camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
    controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
    controls.update();
    if (tw.t >= 1) tween.current = null;
  });

  return (
    <>
      {planView && <OrthographicCamera makeDefault position={[0, 40, 0.001]} zoom={34} near={0.1} far={200} />}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.07}
        screenSpacePanning
        enableRotate={!planView}
        mouseButtons={planView ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN } : undefined}
        maxPolarAngle={planView ? 0 : Math.PI / 2 - 0.04}
        minDistance={1.2}
        maxDistance={Math.max(venue.maxD ?? 22, 30)}
        minZoom={10}
        maxZoom={160}
        autoRotate={motion && autoRotate && !planView}
        autoRotateSpeed={0.5}
        onStart={() => {
          tween.current = null;
        }}
      />
    </>
  );
}
