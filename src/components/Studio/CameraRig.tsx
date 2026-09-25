import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
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

const PLAN_POSITION: [number, number, number] = [0.01, 14, 0.01];
const PLAN_TARGET: [number, number, number] = [0, 0, 0];
const PLAN_CLIP_PLANE = new THREE.Plane(new THREE.Vector3(0, -1, 0), 3.1);
const PLAN_MOUSE_BUTTONS = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

export function CameraRig({ venue }: { venue: VenueDef }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const preset = useDesignStore((s) => s.cameraPreset);
  const motion = useDesignStore((s) => s.motion);
  const autoRotate = useDesignStore((s) => s.autoRotate);
  const planView = useDesignStore((s) => s.planView);

  useEffect(() => {
    if (planView) {
      camera.position.set(...PLAN_POSITION);
      controlsRef.current?.target.set(...PLAN_TARGET);
    } else {
      camera.position.set(...presetPosition(preset, venue));
      controlsRef.current?.target.set(...PRESET_TARGET[preset]);
    }
    controlsRef.current?.update();
  }, [preset, venue, camera, planView]);

  useEffect(() => {
    // Imperative three.js renderer state, not a React value — safe to mutate outside render.
    // oxlint-disable-next-line
    gl.localClippingEnabled = true;
    // oxlint-disable-next-line
    gl.clippingPlanes = planView ? [PLAN_CLIP_PLANE] : [];
    return () => {
      gl.clippingPlanes = [];
    };
  }, [gl, planView]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      maxPolarAngle={Math.PI / 2 - 0.04}
      minDistance={2.2}
      maxDistance={planView ? Math.max(venue.maxD ?? 22, 26) : (venue.maxD ?? 22)}
      autoRotate={motion && autoRotate && !planView}
      autoRotateSpeed={0.5}
      enableRotate={!planView}
      mouseButtons={planView ? PLAN_MOUSE_BUTTONS : undefined}
    />
  );
}
