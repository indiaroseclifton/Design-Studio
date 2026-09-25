import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { T } from '../../three/textures';
import { disposeObject3D, shared } from '../../three/utils';
import { PLACED_TAG, orientTo, placedIndexOf, type Vec3 } from '../../engine/placed';

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
  table: { dark: surfaceMaterial('#b9ad9b'), light: surfaceMaterial('#efe8de') },
  floor: { dark: surfaceMaterial('#6b5a48'), light: surfaceMaterial('#b8a48c') },
};

export type StudioSurface = 'table' | 'floor' | 'hang';

/** Where a pointer lands on the model: the point and the way a piece there should face. */
export interface Hit {
  p: Vec3;
  n: Vec3;
}
/** Lets the page ask the 3D view where a pointer is over the model (for drags from the side panel). */
export interface Picker {
  /** Show the drop marker under the pointer; true when the pointer is over the model. */
  hover: (clientX: number, clientY: number) => boolean;
  /** Where a drop at this point would land, or null off the model. */
  drop: (clientX: number, clientY: number) => Hit | null;
  clear: () => void;
}
/** Free placement: pieces dropped in from the side panel, and dragging placed pieces around. */
export interface Placing {
  pickerRef: React.MutableRefObject<Picker | null>;
  /** Which way a piece at `p` faces, given the surface normal there (defaults to the surface normal). */
  orient?: (p: Vec3, surface: Vec3) => Vec3;
  /** Radius of the drop marker, in metres. */
  marker: number;
  selected: number | null;
  onSelect: (i: number | null) => void;
  onMove: (i: number, hit: Hit) => void;
}

export interface StudioViewerProps {
  /** Changes whenever the model must be rebuilt (e.g. the JSON of the draft). */
  buildKey: string;
  /** Builds the model into an empty group. */
  build: (g: THREE.Group) => void;
  /** What the piece stands on: a round tabletop, the floor, or nothing (hanging). */
  surf: StudioSurface;
  /** Changes whenever the camera should re-frame (vessel or size changes, not every small edit). */
  frameKey: string;
  turntable: boolean;
  view: StudioView;
  viewNonce: number;
  backdrop: Backdrop;
  placing?: Placing;
}

const markerMat = new THREE.MeshBasicMaterial({ color: '#f3d9a4', transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide });
const selMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, depthTest: false, side: THREE.DoubleSide });

/** Pointer placement on the model: the drop marker, picking, and dragging hand-placed pieces. */
function Placement({ group, controls, placing }: { group: THREE.Group; controls: React.RefObject<OrbitControlsImpl | null>; placing: Placing }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const live = useRef(placing);
  live.current = placing;
  const marker = useMemo(() => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 40), markerMat);
    m.renderOrder = 10;
    m.visible = false;
    return m;
  }, []);
  const sel = useMemo(() => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), selMat);
    m.renderOrder = 10;
    m.visible = false;
    return m;
  }, []);
  useEffect(
    () => () => {
      marker.geometry.dispose();
      sel.geometry.dispose();
    },
    [marker, sel],
  );

  const ray = useMemo(() => new THREE.Raycaster(), []);
  /** The first point on the model under the pointer, skipping `skip` (the piece being dragged). */
  const hitAt = (x: number, y: number, skip?: THREE.Object3D): Hit | null => {
    const r = gl.domElement.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
    ray.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), camera);
    group.updateMatrixWorld(true);
    for (const h of ray.intersectObject(group, true)) {
      let inSkip = false;
      for (let o: THREE.Object3D | null = h.object; o; o = o.parent) if (o === skip) inSkip = true;
      if (inSkip) continue;
      const fn = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
      if (fn.dot(ray.ray.direction) > 0) fn.negate();
      const p: Vec3 = [h.point.x, h.point.y, h.point.z];
      const surface: Vec3 = [fn.x, fn.y, fn.z];
      const n = live.current.orient ? live.current.orient(p, surface) : surface;
      const L = Math.hypot(...n) || 1;
      return { p, n: [n[0] / L, n[1] / L, n[2] / L], obj: h.object } as Hit & { obj: THREE.Object3D };
    }
    return null;
  };
  const showAt = (m: THREE.Mesh, h: Hit | null, size: number) => {
    m.visible = !!h;
    if (h) {
      m.position.set(h.p[0] + h.n[0] * 0.003, h.p[1] + h.n[1] * 0.003, h.p[2] + h.n[2] * 0.003);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...h.n));
      m.scale.setScalar(size);
    }
    invalidate();
  };
  const findPlaced = (i: number) => {
    let found: THREE.Object3D | null = null;
    group.traverse((o) => {
      if (o.userData[PLACED_TAG] === i) found = o;
    });
    return found as THREE.Object3D | null;
  };

  // The side panel's drags ask the view where they are.
  useEffect(() => {
    const pk = live.current.pickerRef;
    pk.current = {
      hover: (x, y) => {
        const h = hitAt(x, y);
        showAt(marker, h, live.current.marker);
        return !!h;
      },
      drop: (x, y) => {
        const h = hitAt(x, y);
        showAt(marker, null, 1);
        return h ? { p: h.p, n: h.n } : null;
      },
      clear: () => showAt(marker, null, 1),
    };
    return () => {
      pk.current = null;
    };
    // hitAt reads the live group and camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, camera]);

  // A ring around the selected piece.
  useEffect(() => {
    const i = placing.selected;
    const o = i === null ? null : findPlaced(i);
    if (!o) return showAt(sel, null, 1);
    // A freshly built piece hasn't been rendered yet, so bring its world matrices up to date first.
    group.updateMatrixWorld(true);
    const n = new THREE.Vector3(0, 1, 0).applyQuaternion(o.quaternion);
    const box = new THREE.Box3().setFromObject(o);
    const c = box.getCenter(new THREE.Vector3());
    showAt(sel, { p: [c.x, c.y, c.z], n: [n.x, n.y, n.z] }, Math.max(0.02, box.getSize(new THREE.Vector3()).length() * 0.4));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placing.selected, group]);

  // Dragging a placed piece: grab it, slide it over the model, drop it. The camera stays put meanwhile.
  useEffect(() => {
    const el = gl.domElement;
    let drag: { i: number; obj: THREE.Object3D; x: number; y: number; moved: boolean; last: Hit | null; id: number } | null = null;
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const h = hitAt(e.clientX, e.clientY) as (Hit & { obj: THREE.Object3D }) | null;
      const i = h ? placedIndexOf(h.obj) : null;
      if (i === null) {
        down = { x: e.clientX, y: e.clientY };
        return;
      }
      const obj = findPlaced(i);
      if (!obj) return;
      if (controls.current) controls.current.enabled = false;
      drag = { i, obj, x: e.clientX, y: e.clientY, moved: false, last: null, id: e.pointerId };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
      live.current.onSelect(i);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) {
        if (e.buttons || e.pointerType !== 'mouse') return;
        const h = hitAt(e.clientX, e.clientY) as (Hit & { obj: THREE.Object3D }) | null;
        el.style.cursor = h && placedIndexOf(h.obj) !== null ? 'grab' : '';
        return;
      }
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4) return;
      drag.moved = true;
      const h = hitAt(e.clientX, e.clientY, drag.obj);
      if (!h) return;
      drag.last = h;
      orientTo(drag.obj, h.p, h.n, (drag.obj.userData.tw as number) ?? 0);
      showAt(sel, null, 1);
    };
    const onUp = (e: PointerEvent) => {
      if (drag) {
        const d = drag;
        drag = null;
        if (el.hasPointerCapture(d.id)) el.releasePointerCapture(d.id);
        el.style.cursor = '';
        if (controls.current) controls.current.enabled = true;
        if (d.moved && d.last) live.current.onMove(d.i, { p: d.last.p, n: d.last.n });
        return;
      }
      // A click (not an orbit drag) on the model away from the placed pieces clears the selection.
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) live.current.onSelect(null);
      down = null;
    };
    // Capture phase, so a grab stops the orbit controls from starting a turn.
    el.addEventListener('pointerdown', onDown, true);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown, true);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, gl, camera]);

  return (
    <>
      <primitive object={marker} />
      <primitive object={sel} />
    </>
  );
}

/** Rebuilds the model when `buildKey` changes; re-frames the camera when `frameKey`, the view or the nonce changes. */
function Model({ buildKey, build, surf, frameKey, turntable, view, viewNonce, backdrop, placing }: StudioViewerProps) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useRef<OrbitControlsImpl>(null);

  const group = useMemo(() => {
    const g = new THREE.Group();
    try {
      build(g);
    } catch (err) {
      console.warn('studio model', err);
    }
    g.traverse((o) => {
      if (o instanceof THREE.Mesh && o.castShadow !== false) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return g;
    // `build` closes over the draft; buildKey captures everything that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildKey]);
  useEffect(() => () => disposeObject3D(group), [group]);

  const fk = `${frameKey}|${view}|${viewNonce}`;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fk, camera]);

  const scale = surf === 'floor' ? 2.2 : 1.05;
  return (
    <>
      <primitive object={group} />
      {placing && <Placement group={group} controls={controls} placing={placing} />}
      {surf !== 'hang' && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow material={SURFACES[surf][backdrop]}>
            <circleGeometry args={[scale, 64]} />
          </mesh>
          {/* Soft contact darkening where the piece meets the surface. */}
          <ContactShadows position={[0, 0.001, 0]} scale={scale * 0.9} blur={2.4} far={0.5} opacity={0.55} resolution={512} color="#2a1d12" />
        </>
      )}
      <OrbitControls ref={controls} makeDefault enableDamping enablePan={false} maxPolarAngle={Math.PI * 0.62} autoRotate={turntable} autoRotateSpeed={1.2} />
    </>
  );
}

/** The 3D stage shared by the Flower Studio and the Cake Studio. */
export function StudioViewer(props: StudioViewerProps) {
  return (
    <Canvas shadows="percentage" dpr={[1, 2]} camera={{ fov: 30, near: 0.01, far: 100, position: [0.6, 0.5, 1.2] }} gl={{ alpha: true, antialias: true }} style={{ touchAction: 'none' }}>
      <Lighting />
      <Model {...props} />
    </Canvas>
  );
}
