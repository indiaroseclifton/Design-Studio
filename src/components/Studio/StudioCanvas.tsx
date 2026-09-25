import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { VENUES } from '../../data/venues';
import { Sky } from '../../three/Sky';
import { Stars, Weather } from '../../three/Weather';
import { VenueGeometry } from './VenueGeometry';
import { TableSystem } from './TableSystem';
import { useTableLayout } from '../../lib/useTableLayout';
import { PlacedItems } from './PlacedItems';
import { CameraRig } from './CameraRig';
import { envFor, hexMix } from '../../lib/environment';
import { registerCapture } from '../../lib/capture';
import { useDesignStore } from '../../store/designStore';
import type { Mood } from '../../types';

const MOOD_FILTER: Record<Mood, string> = {
  natural: 'none',
  film: 'sepia(.2) saturate(1.12) contrast(1.06)',
  moody: 'saturate(.78) contrast(1.16) brightness(.9)',
  dreamy: 'saturate(1.06) brightness(1.07) contrast(.9)',
};

const MOOD_EXPOSURE: Record<Mood, number> = { natural: 1, film: 1.05, moody: 0.82, dreamy: 1.12 };

function setExposure(gl: THREE.WebGLRenderer, exposure: number) {
  gl.toneMappingExposure = exposure;
}

/** Pushes renderer-level settings (exposure) and exposes the scene to Snapshot / Designs thumbnails. */
function RendererBridge({ exposure }: { exposure: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => setExposure(gl, exposure), [gl, exposure]);

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
  const select = useDesignStore((s) => s.select);
  const mood = useDesignStore((s) => s.tweaks.mood);
  const motion = useDesignStore((s) => s.motion);
  const { tables, ceremonySeats } = useTableLayout();

  const env = useMemo(() => envFor(venue, time, wx), [venue, time, wx]);
  const [skyTop, skyHor, skyBot] = env.sky;
  const [fogColor, fogNear, fogFar] = env.fog;
  const [hemiSky, hemiGround, hemiI] = env.hemi;
  const [sunColor, sunI, sunPos] = env.sun;
  const weather = venue.indoor ? 'clear' : wx;

  return (
    <div className="absolute inset-0" style={{ filter: MOOD_FILTER[mood] }}>
      <Canvas
        shadows
        camera={{ fov: 45, near: 0.1, far: 1200, position: venue.cam }}
        onPointerMissed={() => select(null)}
      >
        <RendererBridge exposure={env.exp * MOOD_EXPOSURE[mood]} />
        <color attach="background" args={[skyHor]} />
        <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
        <Sky
          top={skyTop}
          hor={skyHor}
          bot={skyBot}
          sunDir={sunPos}
          sunCol={sunColor}
          sunI={sunI}
          cloud={env.cloud}
          cloudCol={hexMix(hemiSky, skyHor, 0.5)}
        />
        {time === 'night' && <Stars />}
        <hemisphereLight args={[hemiSky, hemiGround, hemiI]} />
        <directionalLight color={sunColor} intensity={sunI} position={sunPos} castShadow shadow-mapSize={[2048, 2048]} />
        <VenueGeometry venue={venue} index={venueIndex} lightK={env.k} motion={motion} />
        <TableSystem venue={venue} tables={tables} ceremonySeats={ceremonySeats} />
        <PlacedItems tables={tables} />
        <Weather kind={weather} motion={motion} />
        <CameraRig venue={venue} />
      </Canvas>
    </div>
  );
}
