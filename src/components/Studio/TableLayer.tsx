import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CHAIRS, OVERLAYS, chairSpots, clothOf, fabricMat, hasTbl, makeChairParts, palOf, tableUnit } from '../../engine/studio';
import { disposeObject3D } from '../../three/utils';
import { useDesignStore } from '../../store/designStore';
import type { VenueDef } from '../../types';

const zoneM = new THREE.MeshBasicMaterial({ color: '#f3d9a4', transparent: true, opacity: 0.6, depthWrite: false });
const zoneFill = new THREE.MeshBasicMaterial({ color: '#f3d9a4', transparent: true, opacity: 0.07, depthWrite: false });
const selM = new THREE.MeshBasicMaterial({ color: '#fff4dc', transparent: true, opacity: 0.9, depthWrite: false });

/**
 * Tables, their linen, and every chair (instanced per material), plus the placement zones.
 * Tagged with userData.pick so the interaction layer can tell a table click from a chair click.
 */
export function TableLayer({ venue }: { venue: VenueDef }) {
  const table = useDesignStore((s) => s.design.table);
  const tables = useDesignStore((s) => s.design.tables);
  const guests = useDesignStore((s) => s.design.guests);
  const custom = useDesignStore((s) => s.design.customPalette);
  const showZone = useDesignStore((s) => s.showZone);
  const selection = useDesignStore((s) => s.selection);
  const motion = useDesignStore((s) => s.motion);
  const m = table.mode;

  // Designs are cloned on every edit, so memoise on content rather than object identity:
  // placing a vase must not rebuild every table and chair.
  const sig = JSON.stringify([table, tables, guests, table.decorPal === 'custom' ? custom : null, venue.name]);
  const group = useMemo(() => {
    const g = Object.assign(new THREE.Group(), { name: 'design-tables' });
    if (hasTbl(m)) {
      const cl = clothOf(table, venue.cloth),
        cm = cl.bare ? null : fabricMat(cl),
        om = !cl.bare && table.overlay && table.overlay !== 'none' ? fabricMat(OVERLAYS[table.overlay]) : null;
      tables.forEach((T, i) => {
        const tg = new THREE.Group();
        tg.userData.pick = 'table';
        tg.userData.tableIdx = i;
        tg.position.set(T.x, 0, T.z);
        tg.rotation.y = T.ry;
        g.add(tg);
        tableUnit(tg, m, cl, cm, om);
      });
    }
    const spots = chairSpots(m, tables, guests);
    if (spots.length) {
      const style = table.chair ? CHAIRS[table.chair] : venue.chair;
      const parts = makeChairParts(style, table.decor, palOf(table.decorPal, custom));
      const o = new THREE.Object3D();
      for (const [geo, mat, ghost] of parts) {
        const im = new THREE.InstancedMesh(geo, mat, spots.length);
        spots.forEach(([x, z, r], i) => {
          o.position.set(x, 0, z);
          o.rotation.set(0, r, 0);
          o.updateMatrix();
          im.setMatrixAt(i, o.matrix);
        });
        im.castShadow = !ghost;
        im.receiveShadow = true;
        im.userData.pick = 'chairs';
        im.computeBoundingSphere();
        g.add(im);
      }
    }
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  useEffect(() => () => disposeObject3D(group), [group]);

  // Placement zones: a soft ring around each table (or the ceremony front) showing where décor fits.
  const zoneSig = JSON.stringify([m, tables]);
  const zones = useMemo(() => {
    const g = new THREE.Group();
    const list =
      m === 'ceremony' ? [{ x: 0, z: -3.8, s: 0.9, ry: 0 }] : hasTbl(m) ? tables.map((T) => ({ x: T.x, z: T.z, s: 1, ry: T.ry })) : [{ x: 0, z: 0, s: 1, ry: 0 }];
    for (const Z of list) {
      const zg = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.08, 2.14, 120), zoneM);
      ring.rotation.x = -Math.PI / 2;
      zg.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(2.08, 96), zoneFill);
      disc.rotation.x = -Math.PI / 2;
      zg.add(disc);
      zg.position.set(Z.x, 0.02, Z.z);
      zg.rotation.y = Z.ry;
      zg.scale.setScalar(Z.s);
      if (m === 'banquet') zg.scale.set(1.55, 1, 1);
      g.add(zg);
    }
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneSig]);
  useEffect(
    () => () =>
      zones.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      }),
    [zones],
  );

  useFrame((state) => {
    zoneM.opacity = motion ? 0.35 + 0.25 * Math.sin(state.clock.elapsedTime * 2) : 0.5;
  });

  const tableSel = selection?.k === 'table' ? tables[selection.idx] : null;
  const ringR = m === 'banquet' ? 2.1 : 1.1;

  return (
    <>
      <primitive object={group} />
      <primitive object={zones} visible={showZone} />
      {tableSel && (
        <mesh position={[tableSel.x, 0.012, tableSel.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[m === 'banquet' ? 1.35 : 1, 1, 1]} material={selM}>
          <ringGeometry args={[ringR, ringR * 1.05, 72]} />
        </mesh>
      )}
    </>
  );
}
