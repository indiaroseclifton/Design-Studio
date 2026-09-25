import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Builder } from '../../three/builder';
import { disposeObject3D } from '../../three/utils';
import { buildArrangement } from '../../data/flowerStudio';
import { useFlowerStudioStore } from '../../store/flowerStudioStore';

function ArrangementPreview() {
  const draft = useFlowerStudioStore((s) => s.draft);

  const group = useMemo(() => {
    const g = new THREE.Group();
    if (draft) {
      const builder = Builder(g);
      try {
        buildArrangement(g, builder, draft);
      } catch {
        // mid-edit state can be transiently invalid; leave the preview empty rather than crash
      }
    }
    return g;
  }, [draft]);

  useEffect(() => () => disposeObject3D(group), [group]);

  return <primitive object={group} />;
}

export function FlowerStudioCanvas() {
  return (
    <Canvas shadows camera={{ fov: 38, near: 0.01, far: 20, position: [0.55, 0.5, 0.85] }}>
      <color attach="background" args={['#15120f']} />
      <hemisphereLight args={['#fff3e0', '#221a10', 1.15]} />
      <directionalLight position={[2, 3, 2]} intensity={1.8} castShadow />
      <directionalLight position={[-2, 1, -1]} intensity={0.4} />
      <ArrangementPreview />
      <OrbitControls target={[0, 0.22, 0]} enableDamping dampingFactor={0.08} minDistance={0.3} maxDistance={2.2} />
    </Canvas>
  );
}
