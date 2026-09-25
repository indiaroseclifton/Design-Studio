import { useMemo } from 'react';
import { useDesignStore } from '../store/designStore';
import { computeLayout } from './layout';

export function useTableLayout() {
  const layout = useDesignStore((s) => s.design.table.layout);
  const guests = useDesignStore((s) => s.design.table.guests);
  return useMemo(() => computeLayout(layout, guests), [layout, guests]);
}
