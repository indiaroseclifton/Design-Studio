import { Canvas } from '@react-three/fiber';
import { VENUES } from '../../data/venues';
import { Sky } from '../../three/Sky';
import { VenueGeometry } from './VenueGeometry';
import { TableSystem } from './TableSystem';
import { useTableLayout } from '../../lib/useTableLayout';
import { PlacedItems } from './PlacedItems';
import { CameraRig } from './CameraRig';
import { useDesignStore } from '../../store/designStore';
import { registerSceneCanvas } from '../../three/snapshot';
import type { Mood } from '../../types';

const MOOD_FILTER: Record<Mood, string> = {
  natural: 'none',
  film: 'sepia(.2) saturate(1.12) contrast(1.06)',
  moody: 'saturate(.78) contrast(1.16) brightness(.9)',
  dreamy: 'saturate(1.06) brightness(1.07) contrast(.9)',
};

export function StudioCanvas() {
  const venueIndex = useDesignStore((s) => s.design.venue);
  const venue = VENUES[venueIndex] ?? VENUES[0];
  const select = useDesignStore((s) => s.select);
  const mood = useDesignStore((s) => s.tweaks.mood);
  const { tables, ceremonySeats } = useTableLayout();

  const [skyTop, skyHor, skyBot] = venue.env.sky;
  const [fogColor, fogNear, fogFar] = venue.env.fog;
  const [hemiSky, hemiGround, hemiI] = venue.env.hemi;
  const [sunColor, sunI, sunPos] = venue.env.sun;

  return (
    <div className="absolute inset-0" style={{ filter: MOOD_FILTER[mood] }}>
      <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true }}
        camera={{ fov: 45, near: 0.1, far: 1200, position: venue.cam }}
        onPointerMissed={() => select(null)}
        onCreated={({ gl }) => registerSceneCanvas(gl.domElement)}
      >
        <color attach="background" args={[skyHor]} />
        <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
        <Sky top={skyTop} hor={skyHor} bot={skyBot} sunDir={sunPos} sunCol={sunColor} />
        <hemisphereLight args={[hemiSky, hemiGround, hemiI]} />
        <directionalLight color={sunColor} intensity={sunI} position={sunPos} castShadow shadow-mapSize={[2048, 2048]} />
        <VenueGeometry venue={venue} index={venueIndex} />
        <TableSystem venue={venue} tables={tables} ceremonySeats={ceremonySeats} />
        <PlacedItems tables={tables} />
        <CameraRig venue={venue} />
      </Canvas>
    </div>
  );
}
