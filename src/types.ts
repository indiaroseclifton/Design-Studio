import type * as THREE from 'three';
import type { Builder } from './three/builder';

export type Surf = 'table' | 'floor' | 'hang';

export interface TopDef {
  h: number;
  r?: number;
  w?: number;
  d?: number;
}

export interface Palette {
  id: string;
  name: string;
  /** fabric / linen colour */
  f: string;
  /** bloom / accent colours */
  b: string[];
}

export interface BuildCtx {
  builder: Builder;
  palette: Palette;
  color?: string;
  text?: string;
  chairStyle?: ChairStyle;
}

export interface CatalogueItem {
  id: string;
  name: string;
  /** category tab id */
  cat: string;
  /** section heading within a category */
  sec: string;
  group: string;
  surf: Surf;
  /** footprint radius in metres */
  fp: number;
  price: number;
  kw?: string;
  note?: string;
  tag?: string;
  /** false = fixed colours, not recolourable by palette */
  pal?: boolean;
  /** presence makes this item a "host" surface other pieces can stack on */
  top?: TopDef;
  addon?: string;
  /** true if the inspector should show an editable text field (signs, menu cards) */
  hasText?: boolean;
  /** presence marks this as a chair-style selector: placing it sets the table's chair style rather than adding a piece */
  chairStyle?: ChairStyle;
  /** marks the "match the venue" chair selector, which clears any chair override */
  resetChair?: boolean;
  /** presence marks this as a template: placing it places every listed item id (table-surf only) instead of itself */
  template?: string[];
  /** id of the source Arrangement, present on catalogue items generated from a saved Flower Studio arrangement */
  arrangementId?: string;
  build: (group: THREE.Group, ctx: BuildCtx) => void;
}

export interface PlacedItem {
  id: string;
  type: string;
  x: number;
  z: number;
  rot: number;
  pal?: string;
  color?: string;
  text?: string;
  /** host item id this piece is stacked on */
  on?: string;
  /** table index, for surf:'table' items */
  t?: number;
}

export type TableLayout = 'round' | 'banquet' | 'ceremony' | 'none';
export type TimeOfDay = 'venue' | 'day' | 'golden' | 'night';
export type Weather = 'clear' | 'rain' | 'snow';

export interface TableConfig {
  layout: TableLayout;
  guests: number;
  mirror: boolean;
  linen?: string;
  /** overrides the venue's default chair style when set */
  chair?: ChairStyle;
  /** per-table rotation overrides, keyed by TableInstance.index, in radians */
  rotations: Record<number, number>;
}

export interface Design {
  venue: number;
  time: TimeOfDay;
  wx: Weather;
  table: TableConfig;
  items: PlacedItem[];
  palette: string;
  customPalette: string[];
}

export type Selection =
  | { k: 'item'; id: string }
  | { k: 'table'; index: number }
  | { k: 'multi'; ids: string[] }
  | null;

export type Mood = 'natural' | 'film' | 'moody' | 'dreamy';
export type UIMode = 'studio' | 'focus' | 'cinematic';
export type Accent = 'champagne' | 'rose' | 'sage' | 'silver';
export type CameraPreset = 'wide' | 'guest' | 'couple' | 'top';

export interface ChairStyle {
  type: 'cross' | 'chiavari' | 'rattan' | 'bent' | 'ghost';
  color?: string;
  seat?: string;
  metal?: boolean;
}

export interface VenueEnv {
  sky: [string, string, string];
  fog: [string, number, number];
  hemi: [string, string, number];
  sun: [string, number, [number, number, number]];
  exp: number;
  env?: number;
  bloom?: number;
}

export interface StemEntry {
  type: string;
  color?: string;
  n: number;
}

export interface GreeneryEntry {
  type: string;
  n: number;
}

export interface Arrangement {
  id: string;
  name: string;
  vessel: string;
  finish: string;
  shape: string;
  size: number;
  stems: StemEntry[];
  greenery: GreeneryEntry[];
  seed: number;
}

export interface VenueDef {
  name: string;
  indoor?: boolean;
  /** marks the user-photo venue: the studio renders an uploaded photo as the backdrop instead of the procedural sky */
  custom?: boolean;
  sub: string;
  desc: string;
  env: VenueEnv;
  cam: [number, number, number];
  maxD?: number;
  chair: ChairStyle;
  cloth: string;
  build: (group: THREE.Group, builder: Builder, tick: Array<(t: number) => void>) => void;
}
