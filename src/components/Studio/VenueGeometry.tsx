import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { VenueDef } from '../../types';
import { Builder } from '../../three/builder';
import { disposeObject3D, seed } from '../../three/utils';

export function VenueGeometry({ venue, index, lightK, motion }: { venue: VenueDef; index: number; lightK: number; motion: boolean }) {
  const tickRef = useRef<Array<(t: number) => void>>([]);

  const group = useMemo(() => {
    seed(index + 1);
    const g = new THREE.Group();
    const builder = Builder(g);
    tickRef.current = [];
    venue.build(g, builder, tickRef.current);
    builder.flush();
    g.traverse((o) => {
      if (o instanceof THREE.PointLight) o.userData.base = o.intensity;
    });
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue, index]);

  useEffect(() => () => disposeObject3D(group), [group]);

  // Time of day dims or boosts the venue's steady lights; flickering candles keep their own rhythm.
  useEffect(() => {
    group.traverse((o) => {
      if (o instanceof THREE.PointLight && !o.userData.flick) o.intensity = o.userData.base * lightK;
    });
  }, [group, lightK]);

  useFrame((state) => {
    if (!motion) return;
    for (const fn of tickRef.current) fn(state.clock.elapsedTime);
  });

  return <primitive object={group} />;
}
