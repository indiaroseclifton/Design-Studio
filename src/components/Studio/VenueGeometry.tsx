import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { VenueDef, VenuePhoto } from '../../types';
import { Builder, setLightK } from '../../three/builder';
import { disposeObject3D, seed } from '../../three/utils';

export function VenueGeometry({
  venue,
  index,
  lightK,
  motion,
  photo,
}: {
  venue: VenueDef;
  index: number;
  lightK: number;
  motion: boolean;
  photo: VenuePhoto | null;
}) {
  const vPhoto = venue.custom ? photo : null;

  const { group, ticks } = useMemo(() => {
    // Same seed as the prototype, so every venue lays out exactly as designed.
    seed(index * 7919 + 13);
    const g = new THREE.Group();
    const builder = Builder(g);
    const tk: Array<(t: number) => void> = [];
    try {
      venue.build(g, builder, tk, vPhoto);
      builder.flush();
    } catch (err) {
      console.warn(`Could not build venue "${venue.name}"`, err);
    }
    g.traverse((o) => {
      if (o instanceof THREE.PointLight && o.userData.base == null) o.userData.base = o.intensity;
    });
    return { group: g, ticks: tk };
  }, [venue, index, vPhoto]);

  // Keep the uploaded photo texture: it belongs to the photo store, not to this build.
  useEffect(
    () => () => {
      if (vPhoto) group.traverse((o) => o instanceof THREE.Mesh && (o.material as THREE.MeshBasicMaterial).map === vPhoto.tex && ((o.material as THREE.MeshBasicMaterial).map = null));
      disposeObject3D(group);
    },
    [group, vPhoto],
  );

  // Time of day scales the venue's lamps; flickering candles read the same level on each tick.
  useEffect(() => {
    setLightK(lightK);
    group.traverse((o) => {
      if (o instanceof THREE.PointLight && !o.userData.flick) o.intensity = o.userData.base * lightK;
    });
    if (!motion) for (const fn of ticks) fn(0);
  }, [group, ticks, lightK, motion]);

  useFrame((state) => {
    if (!motion) return;
    for (const fn of ticks) fn(state.clock.elapsedTime);
  });

  return <primitive object={group} />;
}
