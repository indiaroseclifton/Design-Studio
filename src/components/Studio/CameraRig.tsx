import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useDesignStore } from '../../store/designStore';
import type { CameraPreset, VenueDef } from '../../types';

const PRESET_TARGET: Record<CameraPreset, [number, number, number]> = {
  wide: [0, 0.9, 0],
  guest: [0, 0.85, 0],
  couple: [0, 0.9, 0],
  top: [0, 0, 0],
};

function presetPosition(preset: CameraPreset, venue: VenueDef): [number, number, number] {
  if (preset === 'wide') return venue.cam;
  if (preset === 'guest') return [1.6, 0.9, 2.2];
  if (preset === 'couple') return [0, 1.7, -2.6];
  return [0.01, 12, 0.01];
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
    if (planView) {
      tween.current = null;
      camera.position.set(0, 40, 0.001);
      camera.lookAt(0, 0, 0);
      controls?.target.set(0, 0, 0);
      controls?.update();
      return;
    }
    const toPos = new THREE.Vector3(...presetPosition(preset, venue));
    const toTarget = new THREE.Vector3(...PRESET_TARGET[preset]);
    if (!motion || !controls) {
      tween.current = null;
      camera.position.copy(toPos);
      controls?.target.copy(toTarget);
      controls?.update();
      return;
    }
    tween.current = { fromPos: camera.position.clone(), toPos, fromTarget: controls.target.clone(), toTarget, t: 0 };
    // presetNonce lets "Reset camera" re-run the tween when the preset itself hasn't changed.
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
        enableRotate={!planView}
        maxPolarAngle={planView ? 0 : Math.PI / 2 - 0.04}
        minDistance={2.2}
        maxDistance={venue.maxD ?? 22}
        minZoom={12}
        maxZoom={140}
        autoRotate={motion && autoRotate && !planView}
        autoRotateSpeed={0.5}
        onStart={() => {
          tween.current = null;
        }}
      />
    </>
  );
}
