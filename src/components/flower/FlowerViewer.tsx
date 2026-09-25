import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VESS, buildArrangement } from '../../engine/catalogue.gen';
import { T } from '../../three/textures';
import { disposeObject3D, shared } from '../../three/utils';
import type { Draft } from '../../engine/flowers';

export type StudioView = 'front' | 'three' | 'top';
export type Backdrop = 'dark' | 'light';

const VIEW_DIR: Record<StudioView, THREE.Vector3> = {
  front: new THREE.Vector3(0, 0.18, 1),
  three: new THREE.Vector3(0.55, 0.35, 1),
  top: new THREE.Vector3(0.02, 1, 0.25),
};

function setStudioLook(gl: THREE.WebGLRenderer, scene: THREE.Scene, env: THREE.Texture) {
  gl.toneMappingExposure = 1.05;
  scene.environment = env;
  scene.environmentIntensity = 0.5;
}

/** Photo-studio lighting: a soft key with shadows, a warm rim from behind, and a cool fill. */
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
      <hemisphereLight args={['#fff6ea', '#4a3e34', 0.9]} />
      <directionalLight
        color="#fff3e2"
        intensity={2.4}
        position={[2.2, 4.5, 3]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-left={-1.6}
        shadow-camera-right={1.6}
        shadow-camera-top={2.6}
        shadow-camera-bottom={-1.2}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
      />
      <directionalLight color="#ffd4a8" intensity={1.6} position={[-2.5, 2.2, -3.5]} />
      <directionalLight color="#cfdcff" intensity={0.45} position={[-3, 1, 2]} />
    </>
  );
}

/** A soft round surface that fades out at the edge, like a product shot, instead of a hard disc. */
function surfaceMaterial(color: string) {
  const fade = shared(
    T(
      (x, w, h) => {
        const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.55, '#fff');
        g.addColorStop(1, '#000');
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
      },
      [1, 1],
      256,
    ),
  );
  return shared(new THREE.MeshStandardMaterial({ color, roughness: 0.95, alphaMap: fade, transparent: true, depthWrite: false }));
}
const SURFACES = {
  table: { dark: surfaceMaterial('#e9e1d3'), light: surfaceMaterial('#f4efe7') },
  floor: { dark: surfaceMaterial('#6b5a48'), light: surfaceMaterial('#b8a48c') },
};

/** Rebuilds the arrangement whenever the draft changes; re-frames when the vessel, size or view changes. */
function Arrangement({ draft, turntable, view, viewNonce, backdrop }: { draft: Draft; turntable: boolean; view: StudioView; viewNonce: number; backdrop: Backdrop }) {
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
  const frameKey = `${draft.vessel}|${draft.size}|${view}|${viewNonce}`;
  useEffect(() => {
    const c = controls.current;
    group.updateMatrixWorld(true);
    const sph = new THREE.Box3().setFromObject(group).getBoundingSphere(new THREE.Sphere());
    const d = (Math.max(0.15, sph.radius) / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.02;
    camera.position.copy(sph.center).add(VIEW_DIR[view].clone().normalize().multiplyScalar(d));
    camera.near = d / 80;
    camera.far = d * 10;
    camera.updateProjectionMatrix();
    if (c) {
      c.target.copy(sph.center);
      c.minDistance = d * 0.3;
      c.maxDistance = d * 2.5;
      c.update();
    }
    // Only re-frame on vessel, size or view changes, not on every stem tweak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameKey, camera]);

  const scale = surf === 'floor' ? 2.8 : 1.5;
  return (
    <>
      <primitive object={group} />
      {surf !== 'hang' && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow material={SURFACES[surf][backdrop]}>
            <circleGeometry args={[scale, 64]} />
          </mesh>
          {/* Soft contact darkening where the vessel meets the surface. */}
          <ContactShadows position={[0, 0.001, 0]} scale={scale * 0.9} blur={2.4} far={0.5} opacity={0.55} resolution={512} color="#2a1d12" />
        </>
      )}
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        enablePan={false}
        maxPolarAngle={Math.PI * 0.62}
        autoRotate={turntable}
        autoRotateSpeed={1.2}
      />
    </>
  );
}

export function FlowerViewer(props: { draft: Draft; turntable: boolean; view: StudioView; viewNonce: number; backdrop: Backdrop }) {
  return (
    <Canvas shadows="percentage" dpr={[1, 2]} camera={{ fov: 30, near: 0.01, far: 100, position: [0.6, 0.5, 1.2] }} gl={{ alpha: true, antialias: true }} style={{ touchAction: 'none' }}>
      <Lighting />
      <Arrangement {...props} />
    </Canvas>
  );
}
