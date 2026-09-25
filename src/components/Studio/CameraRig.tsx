import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { presetView } from '../../lib/cameraViews';
import { layoutFrame } from '../../lib/designOps';
import { useDesignStore } from '../../store/designStore';
import type { VenueDef } from '../../types';

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
