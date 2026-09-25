import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VESS, buildArrangement } from '../../engine/catalogue.gen';
import { M, disposeObject3D } from '../../three/utils';
import type { Draft } from '../../engine/flowers';

function setStudioLook(gl: THREE.WebGLRenderer, scene: THREE.Scene, env: THREE.Texture) {
  gl.toneMappingExposure = 1.05;
  scene.environment = env;
  scene.environmentIntensity = 0.55;
}

function Lighting() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return tex;
  }, [gl]);
  useEffect(() => {
    setStudioLook(gl, scene, env);
    return () => env.dispose();
  }, [gl, scene, env]);
  return (
    <>
      <hemisphereLight args={['#fff6ea', '#5a4a3a', 1.1]} />
      <directionalLight
        color="#fff1dc"
        intensity={2.6}
        position={[2.5, 5, 3]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={3}
        shadow-camera-bottom={-2}
        shadow-camera-near={0.5}
        shadow-camera-far={15}
      />
      {/* A warm rim light from behind separates petals from the dark backdrop. */}
      <directionalLight color="#ffd9b0" intensity={1.2} position={[-3, 2.5, -4]} />
    </>
  );
}

const baseTop = M('#efe8da', 0.95);
const baseFloor = M('#6b5a48', 0.8);

/** Rebuilds the arrangement whenever the draft changes, and re-frames the camera when the vessel or size does. */
function Arrangement({ draft, turntable }: { draft: Draft; turntable: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useRef<OrbitControlsImpl>(null);
  const key = JSON.stringify(draft);

  const group = useMemo(() => {
    const g = new THREE.Group();
    try {
      buildArrangement(g, JSON.parse(key));
    } catch (err) {
      console.warn('arrangement', err);
    }
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return g;
  }, [key]);
  useEffect(() => () => disposeObject3D(group), [group]);

  const surf = VESS[draft.vessel]?.surf ?? 'table';
  const frameKey = `${draft.vessel}|${draft.size}`;
  useEffect(() => {
    const c = controls.current;
    group.updateMatrixWorld(true);
    const sph = new THREE.Box3().setFromObject(group).getBoundingSphere(new THREE.Sphere());
    const d = (Math.max(0.15, sph.radius) / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 0.95;
    camera.position.copy(sph.center).add(new THREE.Vector3(0.55, 0.35, 1).normalize().multiplyScalar(d));
    camera.near = d / 80;
    camera.far = d * 10;
    camera.updateProjectionMatrix();
    if (c) {
      c.target.copy(sph.center);
      c.minDistance = d * 0.35;
      c.maxDistance = d * 2.5;
      c.update();
    }
    // Only re-frame when the vessel or size changes, not on every stem tweak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameKey, camera]);

  return (
    <>
      <primitive object={group} />
      {surf === 'table' && (
        <mesh position={[0, -0.02, 0]} receiveShadow material={baseTop}>
          <cylinderGeometry args={[0.62, 0.62, 0.04, 64]} />
        </mesh>
      )}
      {surf === 'floor' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={baseFloor}>
          <circleGeometry args={[1.4, 64]} />
        </mesh>
      )}
      <OrbitControls ref={controls} makeDefault enableDamping enablePan={false} maxPolarAngle={Math.PI * 0.62} autoRotate={turntable} autoRotateSpeed={1.2} />
    </>
  );
}

export function FlowerViewer({ draft, turntable }: { draft: Draft; turntable: boolean }) {
  return (
    <Canvas shadows="percentage" dpr={[1, 2]} camera={{ fov: 32, near: 0.01, far: 100, position: [0.6, 0.5, 1.2] }} gl={{ alpha: true, antialias: true }} style={{ touchAction: 'none' }}>
      <Lighting />
      <Arrangement draft={draft} turntable={turntable} />
    </Canvas>
  );
}
