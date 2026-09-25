import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { ITEMS } from '../../data/catalogue';
import { getPalette } from '../../data/palettes';
import { Builder } from '../../three/builder';
import { disposeObject3D } from '../../three/utils';
import { useDesignStore } from '../../store/designStore';
import type { Placement } from '../../lib/placements';

export function PlacedItemMesh({ placement, selected }: { placement: Placement; selected: boolean }) {
  const { item, x, y, z, rot } = placement;
  const def = ITEMS[item.type];
  const design = useDesignStore((s) => s.design);
  const select = useDesignStore((s) => s.select);
  const palette = getPalette(item.pal ?? design.palette);

  const group = useMemo(() => {
    const g = new THREE.Group();
    if (def) {
      const builder = Builder(g);
      try {
        def.build(g, { builder, palette, color: item.color, text: item.text });
      } catch {
        // ignore malformed builder input rather than crash the scene
      }
    }
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, palette, item.color, item.text]);

  useEffect(() => () => disposeObject3D(group), [group]);

  const bounds = useMemo(() => {
    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) return { size: new THREE.Vector3(0.2, 0.2, 0.2), center: new THREE.Vector3(0, 0.1, 0) };
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    return { size, center };
  }, [group]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    select({ k: 'item', id: item.id });
  };

  if (!def) return null;

  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]} onClick={onClick}>
      <primitive object={group} />
      {selected && (
        <lineSegments position={[bounds.center.x, bounds.center.y, bounds.center.z]}>
          <edgesGeometry args={[new THREE.BoxGeometry(bounds.size.x + 0.03, bounds.size.y + 0.03, bounds.size.z + 0.03)]} />
          <lineBasicMaterial color="#f3d9a4" />
        </lineSegments>
      )}
    </group>
  );
}
