import type * as THREE from 'three';
import type { Builder } from './three/builder';
import type { Pal } from './engine/studio';

export type Surf = 'table' | 'floor' | 'hang';
export type TableLayout = 'round' | 'banquet' | 'ceremony' | 'none';
export type TimeOfDay = 'venue' | 'day' | 'golden' | 'night';
export type Weather = 'clear' | 'rain' | 'snow';

/** A host surface other pieces can be stacked on: round `{h, r}` or rectangular `{h, w, d}`. */
export interface TopDef {
  h: number;
  r?: number;
  w?: number;
  d?: number;
}

/** Context passed to every catalogue builder. */
export interface BuildCtx {
  /** current table layout */
  m: TableLayout;
  /** table length for the layout (runners and garlands size themselves to it) */
  len: number;
  /** editable text (signs, menus, table numbers) */
  text?: string;
  /** 1-based table number */
  tnum?: number;
  /** builder options (for items with `opts`) */
  o: Record<string, string>;
}

export interface ItemOption {
  /** label */
  l: string;
  /** [value, label] pairs */
  v: Array<[string, string]>;
  /** default value */
  d: string;
}

export interface CatalogueItem {
  name: string;
  /** category tab id */
  cat: string;
  /** section heading within a category */
  sec: string;
  /** items sharing a group can be swapped for one another */
  group: string;
  surf: Surf;
  /** footprint radius in metres */
  fp: number;
  price?: number;
  kw?: string;
  /** false = fixed colours, not recolourable by palette */
  pal?: boolean;
  /** presence makes this item a "host" surface other pieces can stack on */
  top?: TopDef;
  /** 'center' snaps to the middle of the table; 'aisle' snaps to the aisle */
  lock?: 'center' | 'aisle';
  /** only one of this group can exist; placing another swaps it */
  single?: boolean;
  /** placed along the ceremony aisle */
  aisle?: boolean;
  /** hanging height override */
  hy?: number;
  /** configurable builder options */
  opts?: Record<string, ItemOption>;
  /** editable text field */
  text?: { label: string; def: string };
  build: (g: THREE.Group, B: Builder, p: Pal, c: BuildCtx) => void;
}

export interface TablePos {
  x: number;
  z: number;
  /** rotation around Y */
  ry: number;
}

export interface TableConfig {
  mode: TableLayout;
  /** tablecloth id, or null for the venue's default linen */
  cloth: string | null;
  customCloth: string;
  overlay: string;
  /** chair style id, or null for the venue's default chair */
  chair: string | null;
  decor: string;
  decorPal: string;
  /** place-setting item id used by "Set a place at every chair" */
  place: string;
  /** options for the configurable place setting */
  placeO?: Record<string, string>;
}

export interface PlacedItem {
  id: string;
  type: string;
  /** table-local for surf:'table' items, host-local when stacked, otherwise world */
  x: number;
  z: number;
  ry: number;
  pal: string;
  /** per-piece random seed so repeated pieces vary naturally */
  seed: number;
  /** table index for surf:'table' items (-1 otherwise) */
  t: number;
  /** pieces mirrored across tables share a link id */
  link?: string;
  text?: string;
  /** host item id this piece is stacked on */
  on?: string;
  o?: Record<string, string>;
}

export interface Design {
  venue: number;
  time: TimeOfDay;
  wx: Weather;
  table: TableConfig;
  guests: number;
  tables: TablePos[];
  mirror: boolean;
  items: PlacedItem[];
  /** palette for newly placed pieces */
  palette: string;
  customPalette: { b: string[]; g: string; f: string };
}

export type Selection = { k: 'item'; id: string } | { k: 'multi'; ids: string[] } | { k: 'table'; idx: number } | { k: 'chairs' } | null;

export type Mood = 'natural' | 'film' | 'moody' | 'dreamy';
export type UIMode = 'studio' | 'focus' | 'cinematic';
export type Accent = 'champagne' | 'rose' | 'sage' | 'silver';
/** 'high' adds ambient occlusion, 8× MSAA and 4K shadows; 'standard' suits laptops and tablets. */
export type Quality = 'high' | 'standard';
export type CameraPreset = 'wide' | 'guest' | 'couple' | 'top';

export interface ChairStyle {
  type: 'cross' | 'chiavari' | 'bent' | 'ghost' | 'rattan' | 'cover';
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

export interface VenueDef {
  name: string;
  indoor?: boolean;
  /** "Your Venue": backdrop comes from an uploaded photo */
  custom?: boolean;
  sub: string;
  desc: string;
  env: VenueEnv;
  cam: [number, number, number];
  maxD?: number;
  chair: ChairStyle;
  cloth: string;
  build: (group: THREE.Group, builder: Builder, tick: Array<(t: number) => void>, photo?: VenuePhoto | null) => void;
}

export interface VenuePhoto {
  tex: THREE.Texture;
  pano: boolean;
  aspect: number;
  url: string;
}
