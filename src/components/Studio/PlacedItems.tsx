import { useMemo } from 'react';
import { useDesignStore } from '../../store/designStore';
import { resolvePlacements } from '../../lib/placements';
import { PlacedItemMesh } from './PlacedItemMesh';
import type { TableInstance } from '../../lib/layout';

export function PlacedItems({ tables }: { tables: TableInstance[] }) {
  const design = useDesignStore((s) => s.design);
  const selection = useDesignStore((s) => s.selection);
  const placements = useMemo(() => resolvePlacements(design, tables), [design, tables]);

  return (
    <>
      {placements.map((p) => (
        <PlacedItemMesh key={p.key} placement={p} selected={selection?.k === 'item' && selection.id === p.item.id} />
      ))}
    </>
  );
}
