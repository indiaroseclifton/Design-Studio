import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
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

export function CameraRig({ venue }: { venue: VenueDef }) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const preset = useDesignStore((s) => s.cameraPreset);
  const motion = useDesignStore((s) => s.motion);
  const autoRotate = useDesignStore((s) => s.autoRotate);

  useEffect(() => {
    camera.position.set(...presetPosition(preset, venue));
    controlsRef.current?.target.set(...PRESET_TARGET[preset]);
    controlsRef.current?.update();
  }, [preset, venue, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      maxPolarAngle={Math.PI / 2 - 0.04}
      minDistance={2.2}
      maxDistance={venue.maxD ?? 22}
      autoRotate={motion && autoRotate}
      autoRotateSpeed={0.5}
    />
  );
}
