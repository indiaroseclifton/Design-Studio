import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO, Vignette } from '@react-three/postprocessing';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VENUES } from '../../engine/venues.gen';
import { Sky } from '../../three/Sky';
import { Stars, Weather } from '../../three/Weather';
import { VenueGeometry } from './VenueGeometry';
import { TableLayer } from './TableLayer';
import { ItemsLayer } from './ItemsLayer';
import { Interaction } from './Interaction';
import { CameraRig } from './CameraRig';
import { envFor, hexMix } from '../../lib/environment';
import { pickWorld, registerCapture } from '../../lib/capture';
import { DRAG_MIME, dragEntry, setDragEntry } from '../../lib/dragEntry';
import { useVenuePhoto } from '../../lib/venuePhoto';
import { useDesignStore } from '../../store/designStore';
import type { Mood } from '../../types';

const MOOD_FILTER: Record<Mood, string> = {
  natural: 'none',
  film: 'sepia(.2) saturate(1.12) contrast(1.06)',
  moody: 'saturate(.78) contrast(1.16) brightness(.9)',
  dreamy: 'saturate(1.06) brightness(1.07) contrast(.9)',
};
/** Per-mood exposure, bloom multiplier and vignette darkness, from the handoff's Moods spec. */
const MOOD: Record<Mood, { exp: number; bloom: number; vig: number }> = {
  natural: { exp: 1, bloom: 1, vig: 0 },
  film: { exp: 1.05, bloom: 1.2, vig: 0.45 },
  moody: { exp: 0.82, bloom: 1.35, vig: 0.75 },
  dreamy: { exp: 1.12, bloom: 2.1, vig: 0.2 },
};

function setExposure(gl: THREE.WebGLRenderer, exposure: number) {
  gl.toneMappingExposure = exposure;
}
/** Plan view clips everything above 3.1 m so the camera sees past roofs and chandeliers (as the prototype does). */
const PLAN_CLIP = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 3.1)];
function setClipping(gl: THREE.WebGLRenderer, plan: boolean) {
  gl.clippingPlanes = plan ? PLAN_CLIP : [];
}
function setEnvironment(scene: THREE.Scene, tex: THREE.Texture | null, intensity: number, background: THREE.Texture | null) {
  scene.environment = tex;
  scene.environmentIntensity = intensity;
  scene.background = background;
}

/**
 * Renderer-level settings: exposure, a soft studio reflection environment (so glass, china, silver and brass
 * catch highlights, as in the prototype's RoomEnvironment), and the capture hook for Snapshot/Designs.
 */
function RendererBridge({
  exposure,
  envIntensity,
  background,
  plan,
}: {
  exposure: number;
  envIntensity: number;
  background: THREE.Texture | null;
  plan: boolean;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  const envTex = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const tex = pm.fromScene(room, 0.04).texture;
    room.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    pm.dispose();
    return tex;
  }, [gl]);
  useEffect(() => () => envTex.dispose(), [envTex]);

  useEffect(() => setExposure(gl, exposure), [gl, exposure]);
  useEffect(() => setClipping(gl, plan), [gl, plan]);
  useEffect(() => setEnvironment(scene, envTex, envIntensity, background), [scene, envTex, envIntensity, background]);

  useEffect(() => {
    registerCapture({ gl, scene, camera });
    return () => registerCapture(null);
  }, [gl, scene, camera]);

  return null;
}

export function StudioCanvas() {
  const venueIndex = useDesignStore((s) => s.design.venue);
  const time = useDesignStore((s) => s.design.time);
  const wx = useDesignStore((s) => s.design.wx);
  const venue = VENUES[venueIndex] ?? VENUES[0];
  const mood = useDesignStore((s) => s.tweaks.mood);
  const quality = useDesignStore((s) => s.tweaks.quality);
  const motion = useDesignStore((s) => s.motion);
  const planView = useDesignStore((s) => s.planView);
  // The Flower Studio covers the scene; stop rendering it underneath.
  const paused = useDesignStore((s) => s.studio.open || s.cakeStudio.open || !!s.overlay);
  const photo = useVenuePhoto((s) => s.photo);
  const itemsRoot = useRef<THREE.Group | null>(null);

  const env = useMemo(() => envFor(venue, time, wx), [venue, time, wx]);
  const [skyTop, skyHor, skyBot] = env.sky;
  const [fogColor, fogNear, fogFar] = env.fog;
  const [hemiSky, hemiGround, hemiI] = env.hemi;
  const [sunColor, sunI, sunPos] = env.sun;
  const sunAt = useMemo(() => new THREE.Vector3(...sunPos).normalize().multiplyScalar(70).toArray() as [number, number, number], [sunPos]);
  const weather = venue.indoor ? 'clear' : wx;
  const pano = venue.custom && photo?.pano ? photo.tex : null;
  const M = MOOD[mood];
  const high = quality === 'high';

  return (
    <div
      className="absolute inset-0"
      style={{ filter: MOOD_FILTER[mood] }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        const entry = dragEntry();
        if (!entry || !e.dataTransfer.types.includes(DRAG_MIME)) return;
        e.preventDefault();
        setDragEntry(null);
        const at = entry.k === 'item' ? pickWorld(e.clientX, e.clientY) : null;
        useDesignStore.getState().activate(entry, at ?? undefined);
      }}
    >
      <Canvas
        frameloop={paused ? 'never' : 'always'}
        shadows="percentage"
        dpr={[1, 2]}
        // preserveDrawingBuffer lets Snapshot and design thumbnails read the finished, post-processed frame.
        gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
        camera={{ fov: 45, near: 0.1, far: 1200, position: venue.cam }}
      >
        <RendererBridge exposure={env.exp * M.exp} envIntensity={env.env ?? 0.3} background={pano} plan={planView} />
        {!pano && <color attach="background" args={[skyHor]} />}
        <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
        {!pano && (
          <Sky top={skyTop} hor={skyHor} bot={skyBot} sunDir={sunPos} sunCol={sunColor} sunI={sunI} cloud={env.cloud} cloudCol={hexMix(hemiSky, skyHor, 0.5)} />
        )}
        {time === 'night' && !pano && <Stars />}
        <hemisphereLight args={[hemiSky, hemiGround, hemiI]} />
        <directionalLight
          color={sunColor}
          intensity={sunI}
          position={sunAt}
          castShadow
          shadow-mapSize={[high ? 4096 : 2048, high ? 4096 : 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.03}
          shadow-camera-left={-18}
          shadow-camera-right={18}
          shadow-camera-top={18}
          shadow-camera-bottom={-18}
          shadow-camera-near={1}
          shadow-camera-far={160}
        />
        <VenueGeometry venue={venue} index={venueIndex} lightK={env.k} motion={motion} photo={photo} />
        <TableLayer venue={venue} />
        <ItemsLayer rootRef={itemsRoot} />
        <Weather kind={weather} motion={motion} />
        <CameraRig venue={venue} />
        <Interaction itemsRoot={itemsRoot} />
        <EffectComposer multisampling={high ? 8 : 4} enableNormalPass={false}>
          <>{high && <N8AO halfRes aoRadius={0.6} distanceFalloff={0.6} intensity={2.2} color="#1a120c" />}</>
          <Bloom mipmapBlur intensity={(env.bloom ?? 0.55) * M.bloom * 1.1} luminanceThreshold={0.9} luminanceSmoothing={0.2} radius={0.6} />
          <Vignette offset={0.3} darkness={M.vig} eskil={false} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
