import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { VenueDef } from '../../types';
import { Builder } from '../../three/builder';
import { disposeObject3D, seed } from '../../three/utils';

export function VenueGeometry({ venue, index }: { venue: VenueDef; index: number }) {
  const tickRef = useRef<Array<(t: number) => void>>([]);

  const group = useMemo(() => {
    seed(index + 1);
    const g = new THREE.Group();
    const builder = Builder(g);
    tickRef.current = [];
    venue.build(g, builder, tickRef.current);
    builder.flush();
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue, index]);

  useEffect(() => () => disposeObject3D(group), [group]);

  useFrame((state) => {
    for (const fn of tickRef.current) fn(state.clock.elapsedTime);
  });

  return <primitive object={group} />;
}
