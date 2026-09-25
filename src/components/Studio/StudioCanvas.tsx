import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { VENUES } from '../../data/venues';
import { Sky } from '../../three/Sky';
import { VenueGeometry } from './VenueGeometry';
import { TableSystem } from './TableSystem';
import { useTableLayout } from '../../lib/useTableLayout';
import { PlacedItems } from './PlacedItems';
import { CameraRig } from './CameraRig';
import { useDesignStore } from '../../store/designStore';
import { useVenuePhotoStore, type VenuePhoto } from '../../store/venuePhotoStore';
import { registerSceneCanvas } from '../../three/snapshot';
import type { Mood } from '../../types';

function PhotoBackdrop({ photo }: { photo: VenuePhoto }) {
  const backdrop = useMemo(() => {
    const tex = photo.texture;
    const len = 18 * Math.PI * 1.1;
    const h = Math.min(30, len / photo.aspect);
    const geo = new THREE.CylinderGeometry(18, 18, h, 96, 1, true, Math.PI - Math.PI * 0.55, Math.PI * 1.1);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = h / 2 - 0.5;
    return m;
  }, [photo]);

  useEffect(
    () => () => {
      backdrop.geometry.dispose();
      (backdrop.material as THREE.Material).dispose();
    },
    [backdrop],
  );

  return <primitive object={backdrop} />;
}

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
  const photo = useVenuePhotoStore((s) => s.photo);

  const [skyTop, skyHor, skyBot] = venue.env.sky;
  const [fogColor, fogNear, fogFar] = venue.env.fog;
  const [hemiSky, hemiGround, hemiI] = venue.env.hemi;
  const [sunColor, sunI, sunPos] = venue.env.sun;

  const showPanoBackground = Boolean(venue.custom && photo?.pano);
  const showCurvedBackdrop = Boolean(venue.custom && photo && !photo.pano);

  return (
    <div className="absolute inset-0" style={{ filter: MOOD_FILTER[mood] }}>
      <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true }}
        camera={{ fov: 45, near: 0.1, far: 1200, position: venue.cam }}
        onPointerMissed={() => select(null)}
        onCreated={({ gl }) => registerSceneCanvas(gl.domElement)}
      >
        {showPanoBackground && photo ? <primitive object={photo.texture} attach="background" /> : <color attach="background" args={[skyHor]} />}
        <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
        {!showPanoBackground && <Sky top={skyTop} hor={skyHor} bot={skyBot} sunDir={sunPos} sunCol={sunColor} />}
        {showCurvedBackdrop && photo && <PhotoBackdrop photo={photo} />}
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
