import { useEffect, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { buildChair } from '../../data/chairs';
import { disposeObject3D } from '../../three/utils';
import * as THREE from 'three';
import { useDesignStore } from '../../store/designStore';
import type { CeremonySeat, TableInstance } from '../../lib/layout';
import type { VenueDef } from '../../types';

export function TableSystem({
  venue,
  tables,
  ceremonySeats,
}: {
  venue: VenueDef;
  tables: TableInstance[];
  ceremonySeats: CeremonySeat[];
}) {
  const select = useDesignStore((s) => s.select);
  const selection = useDesignStore((s) => s.selection);
  const linen = useDesignStore((s) => s.design.table.linen) ?? venue.cloth;

  const chairProto = useMemo(() => {
    const g = new THREE.Group();
    buildChair(g, venue.chair);
    return g;
  }, [venue.chair]);
  useEffect(() => () => disposeObject3D(chairProto), [chairProto]);

  const chairClones = useMemo(() => {
    const perTable = tables.map((t) => t.seats.map(() => chairProto.clone(true)));
    const ceremony = ceremonySeats.map(() => chairProto.clone(true));
    return { perTable, ceremony };
  }, [chairProto, tables, ceremonySeats]);

  const selectTable = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    select({ k: 'table' });
  };

  return (
    <group>
      {tables.map((t, ti) => {
        const ringR = (t.kind === 'round' ? t.radius : Math.max(t.width, t.length) / 2) + 0.5;
        return (
          <group key={t.index} position={[t.x, 0, t.z]} rotation={[0, t.rot, 0]}>
            {t.kind === 'round' ? (
              <>
                <mesh position={[0, 0.75, 0]} castShadow receiveShadow onClick={selectTable}>
                  <cylinderGeometry args={[t.radius, t.radius, 0.04, 32]} />
                  <meshStandardMaterial color={linen} roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.4, 0]}>
                  <cylinderGeometry args={[t.radius * 0.99, t.radius * 1.01, 0.72, 32, 1, true]} />
                  <meshStandardMaterial color={linen} roughness={0.95} side={THREE.DoubleSide} />
                </mesh>
              </>
            ) : (
              <>
                <mesh position={[0, 0.75, 0]} castShadow receiveShadow onClick={selectTable}>
                  <boxGeometry args={[t.width, 0.04, t.length]} />
                  <meshStandardMaterial color={linen} roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.4, 0]}>
                  <boxGeometry args={[t.width * 1.02, 0.72, t.length * 1.02]} />
                  <meshStandardMaterial color={linen} roughness={0.95} side={THREE.DoubleSide} />
                </mesh>
              </>
            )}
            {t.seats.map((s, i) => (
              <primitive key={i} object={chairClones.perTable[ti][i]} position={[s.x, 0, s.z]} rotation={[0, s.facing, 0]} />
            ))}
            {selection?.k === 'table' && (
              <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[ringR, ringR + 0.05, 48]} />
                <meshBasicMaterial color="#f3d9a4" transparent opacity={0.6} />
              </mesh>
            )}
          </group>
        );
      })}
      {ceremonySeats.map((s, i) => (
        <primitive key={i} object={chairClones.ceremony[i]} position={[s.x, 0, s.z]} rotation={[0, s.rot, 0]} />
      ))}
    </group>
  );
}
