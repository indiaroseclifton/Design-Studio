import type { Design, PlacedItem } from '../types';
import { ITEMS } from '../data/catalogue';
import type { TableInstance } from './layout';

export const TABLE_TOP_Y = 0.76;
export const HANG_Y = 2.6;

export interface Placement {
  key: string;
  item: PlacedItem;
  x: number;
  y: number;
  z: number;
  rot: number;
}

export function resolvePlacements(design: Design, tables: TableInstance[]): Placement[] {
  const out: Placement[] = [];

  for (const item of design.items) {
    const def = ITEMS[item.type];
    if (!def) continue;

    if (def.surf === 'floor') {
      out.push({ key: item.id, item, x: item.x, y: 0, z: item.z, rot: item.rot });
      continue;
    }
    if (def.surf === 'hang') {
      out.push({ key: item.id, item, x: item.x, y: HANG_Y, z: item.z, rot: item.rot });
      continue;
    }
    if (item.on) continue; // rendered alongside their host below

    const targets = design.table.mirror ? tables : tables.filter((t) => t.index === (item.t ?? 0));
    for (const table of targets) emitTableItem(item, table, design, out);
  }
  return out;
}

function emitTableItem(item: PlacedItem, table: TableInstance, design: Design, out: Placement[]) {
  const def = ITEMS[item.type];
  if (!def) return;
  const x = table.x + item.x;
  const z = table.z + item.z;
  const key = `${item.id}@${table.index}`;
  out.push({ key, item, x, y: TABLE_TOP_Y, z, rot: item.rot });

  if (def.top) {
    const topY = TABLE_TOP_Y + def.top.h;
    for (const child of design.items) {
      if (child.on !== item.id) continue;
      const childDef = ITEMS[child.type];
      if (!childDef) continue;
      out.push({ key: `${key}>${child.id}`, item: child, x: x + child.x, y: topY, z: z + child.z, rot: child.rot });
    }
  }
}
