import { useMemo } from 'react';
import { useDesignStore } from '../store/designStore';
import { computeLayout } from './layout';

const NO_ROTATIONS: Record<number, number> = {};

export function useTableLayout() {
  const layout = useDesignStore((s) => s.design.table.layout);
  const guests = useDesignStore((s) => s.design.table.guests);
  const rotations = useDesignStore((s) => s.design.table.rotations) ?? NO_ROTATIONS;
  return useMemo(() => {
    const result = computeLayout(layout, guests);
    if (!Object.keys(rotations).length) return result;
    return {
      ...result,
      tables: result.tables.map((t) => (rotations[t.index] !== undefined ? { ...t, rot: rotations[t.index] } : t)),
    };
  }, [layout, guests, rotations]);
}
