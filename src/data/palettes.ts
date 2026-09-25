import type { Palette } from '../types';

export const PALETTES: Palette[] = [
  { id: 'ivory', name: 'Ivory & Blush', f: '#f2ece0', b: ['#f4d9d6', '#eec9c9', '#f7ece2', '#c9a98f'] },
  { id: 'sage', name: 'Sage & Cream', f: '#efe9da', b: ['#c9d4b3', '#e8e2c8', '#8fa876', '#f2ece0'] },
  { id: 'wine', name: 'Wine & Gold', f: '#e6d9c2', b: ['#7a2436', '#c9a35a', '#5e1b26', '#e6cfa0'] },
  { id: 'sky', name: 'Sky & Silver', f: '#eef1f6', b: ['#cfe0ef', '#dfe4ec', '#a9c3db', '#f2f5f9'] },
];

export const DEFAULT_PALETTE = PALETTES[0];

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? DEFAULT_PALETTE;
}

export const ACCENTS: Record<string, { ac: string; acr: string; ac2: string }> = {
  champagne: { ac: '#f3d9a4', acr: '243,217,164', ac2: '#f8e6c0' },
  rose: { ac: '#f2bcc0', acr: '242,188,192', ac2: '#f8d6d8' },
  sage: { ac: '#c9d9b2', acr: '201,217,178', ac2: '#dde8cc' },
  silver: { ac: '#dfe4ec', acr: '223,228,236', ac2: '#eef1f6' },
};
