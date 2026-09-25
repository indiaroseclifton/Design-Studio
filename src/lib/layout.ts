import type { TableLayout } from '../types';

export interface SeatLocal {
  x: number;
  z: number;
  /** chair rotation around Y, world-space once table.rot is added */
  facing: number;
}

export interface TableInstance {
  index: number;
  kind: 'round' | 'banquet';
  x: number;
  z: number;
  rot: number;
  /** top surface radius (round) */
  radius: number;
  /** top surface footprint (banquet) */
  length: number;
  width: number;
  seats: SeatLocal[];
}

export interface CeremonySeat {
  x: number;
  z: number;
  rot: number;
}

export interface LayoutResult {
  tables: TableInstance[];
  ceremonySeats: CeremonySeat[];
}

const ROUND_SEATS_PER_TABLE = 8;
const ROUND_RADIUS = 0.72;
const ROUND_SEAT_R = ROUND_RADIUS + 0.4;
const ROUND_SPACING = 3.1;

const BANQUET_SEATS_PER_TABLE = 10;
const BANQUET_LENGTH = 2.6;
const BANQUET_WIDTH = 0.9;
const BANQUET_SPACING_Z = 1.9;

function roundSeats(): SeatLocal[] {
  const seats: SeatLocal[] = [];
  for (let i = 0; i < ROUND_SEATS_PER_TABLE; i++) {
    const a = (i / ROUND_SEATS_PER_TABLE) * Math.PI * 2;
    seats.push({ x: Math.cos(a) * ROUND_SEAT_R, z: Math.sin(a) * ROUND_SEAT_R, facing: a + Math.PI });
  }
  return seats;
}

function banquetSeats(): SeatLocal[] {
  const seats: SeatLocal[] = [];
  const perSide = BANQUET_SEATS_PER_TABLE / 2;
  for (let i = 0; i < perSide; i++) {
    const t = (i + 0.5) / perSide - 0.5;
    const zPos = t * (BANQUET_LENGTH - 0.4);
    seats.push({ x: BANQUET_WIDTH / 2 + 0.4, z: zPos, facing: -Math.PI / 2 });
    seats.push({ x: -(BANQUET_WIDTH / 2 + 0.4), z: zPos, facing: Math.PI / 2 });
  }
  return seats;
}

function grid(count: number, spacing: number): Array<[number, number]> {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  const offX = ((cols - 1) * spacing) / 2;
  const offZ = ((rows - 1) * spacing) / 2;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    pts.push([c * spacing - offX, r * spacing - offZ]);
  }
  return pts;
}

export function computeLayout(layout: TableLayout, guests: number): LayoutResult {
  if (layout === 'none') return { tables: [], ceremonySeats: [] };

  if (layout === 'ceremony') {
    const perRow = 10;
    const aisle = 0.9;
    const rows = Math.max(1, Math.ceil(guests / perRow));
    const seats: CeremonySeat[] = [];
    let remaining = guests;
    for (let r = 0; r < rows; r++) {
      const z = 1.5 + r * 0.95;
      const n = Math.min(perRow, remaining);
      for (let i = 0; i < n; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        const idx = Math.floor(i / 2);
        const x = side * (aisle / 2 + 0.05 + idx * 0.52);
        seats.push({ x, z, rot: 0 });
      }
      remaining -= n;
    }
    return { tables: [], ceremonySeats: seats };
  }

  const perTable = layout === 'banquet' ? BANQUET_SEATS_PER_TABLE : ROUND_SEATS_PER_TABLE;
  const count = Math.max(1, Math.ceil(guests / perTable));
  const spacing = layout === 'banquet' ? BANQUET_SPACING_Z : ROUND_SPACING;
  const positions = grid(count, layout === 'banquet' ? BANQUET_LENGTH + 1.4 : spacing);
  const seatTemplate = layout === 'banquet' ? banquetSeats() : roundSeats();

  const tables: TableInstance[] = positions.map(([x, z], i) => ({
    index: i,
    kind: layout === 'banquet' ? 'banquet' : 'round',
    x,
    z,
    rot: 0,
    radius: ROUND_RADIUS,
    length: BANQUET_LENGTH,
    width: BANQUET_WIDTH,
    seats: seatTemplate,
  }));

  return { tables, ceremonySeats: [] };
}
