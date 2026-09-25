import { jsPDF } from 'jspdf';
import { pieceCanvas, type DrawCtx } from './draw';
import { PAPERS, PIECES, guestList, pieceQty, type PieceKind } from './model';

/*
 * Print-ready PDFs. Each card is rendered with bleed (the artwork runs past the trim) and laid out
 * several to a sheet with crop marks in the gutters. Big signs get a page of their own at their full size.
 * Loaded on demand (jsPDF is large).
 */

export type Sheet = 'A4' | 'Letter' | 'A3';
const SHEETS: Record<Sheet, [number, number]> = { A4: [210, 297], Letter: [215.9, 279.4], A3: [297, 420] };

export interface PrintOpts {
  sheet: Sheet;
  /** bleed in mm (3 mm is standard) */
  bleed: number;
  marks: boolean;
  /** how many of each piece; defaults to the suite's quantities */
  qty?: Partial<Record<PieceKind, number>>;
  guests: number;
  tables: number;
  /** called before each piece is rendered */
  onProgress?: (done: number, total: number, name: string) => void;
}

// Rendering at 300 dpi is heavy; hand the main thread back between pieces so the page stays responsive.
const breathe = () => new Promise((r) => setTimeout(r, 0));

/** What each printed copy says: a guest's name on place cards, a table number on table numbers. */
function mainsFor(k: PieceKind, c: DrawCtx, n: number): Array<string | undefined> {
  if (k === 'placecard') {
    const g = guestList(c.suite);
    return Array.from({ length: n }, (_, i) => g[i] ?? 'Guest Name');
  }
  if (k === 'tablenum') return Array.from({ length: n }, (_, i) => String(i + 1));
  // Identical copies: render once, place many times.
  return Array.from({ length: n }, () => undefined);
}

function cropMarks(pdf: jsPDF, x: number, y: number, w: number, h: number, off: number, len: number) {
  pdf.setLineWidth(0.15);
  pdf.setDrawColor(0);
  for (const [cx, cy, dx, dy] of [
    [x, y, -1, -1],
    [x + w, y, 1, -1],
    [x, y + h, -1, 1],
    [x + w, y + h, 1, 1],
  ]) {
    pdf.line(cx + dx * off, cy, cx + dx * (off + len), cy);
    pdf.line(cx, cy + dy * off, cx, cy + dy * (off + len));
  }
}

export async function exportPdf(kinds: PieceKind[], c: DrawCtx, o: PrintOpts): Promise<Blob> {
  const [SW, SH] = SHEETS[o.sheet];
  let pdf: jsPDF | null = null;
  const addPage = (w: number, h: number) => {
    const orient = w > h ? 'l' : 'p';
    if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [w, h], orientation: orient, compress: true });
    else pdf.addPage([w, h], orient);
    return pdf;
  };
  const b = o.bleed;
  for (const [ki, k] of kinds.entries()) {
    const P = PIECES[k];
    o.onProgress?.(ki, kinds.length, P.n);
    await breathe();
    const n = o.qty?.[k] ?? pieceQty(k, c.suite, o.guests, o.tables);
    if (n <= 0) continue;
    const [tw, th0] = P.mm;
    // Folded place cards print on a sheet twice as tall, face on the lower half.
    const th = P.fold ? th0 * 2 : th0;
    const mains = mainsFor(k, c, n);
    const dpi = P.big ? 150 : 300;
    const pxPerMm = dpi / 25.4;
    const cache = new Map<string, string>();
    const art = (main: string | undefined) => {
      const key = main ?? '';
      let url = cache.get(key);
      if (!url) {
        const face = pieceCanvas(k, c, pxPerMm, { main, bleedMm: b });
        let cv = face;
        if (P.fold) {
          cv = document.createElement('canvas');
          cv.width = face.width;
          cv.height = Math.round((th + 2 * b) * pxPerMm);
          const x = cv.getContext('2d')!;
          // The back half is plain stock; the face (with its bleed) sits on the lower half.
          x.fillStyle = PAPERS[c.suite.paper].c;
          x.fillRect(0, 0, cv.width, cv.height);
          x.drawImage(face, 0, cv.height - face.height);
        }
        url = cv.toDataURL('image/jpeg', 0.92);
        cache.set(key, url);
      }
      return url;
    };
    const cw = tw + 2 * b,
      ch = th + 2 * b;
    const gap = o.marks ? 8 : 2;
    const margin = 10;
    const fits = cw + 2 * margin <= SW && ch + 2 * margin <= SH;
    if (!fits || P.big) {
      // One per page at full size, with room for the marks.
      const pad = o.marks ? 10 : 0;
      for (const m of mains) {
        await breathe();
        const doc = addPage(cw + 2 * pad, ch + 2 * pad);
        doc.addImage(art(m), 'JPEG', pad, pad, cw, ch, `${k}:${m ?? ''}`);
        if (o.marks) cropMarks(doc, pad + b, pad + b, tw, th, b + 1, 5);
      }
      continue;
    }
    // Several per sheet, turning the sheet if more fit that way.
    const count = (w: number, h: number) => Math.max(0, Math.floor((w - 2 * margin + gap) / (cw + gap))) * Math.max(0, Math.floor((h - 2 * margin + gap) / (ch + gap)));
    const land = count(SH, SW) > count(SW, SH);
    const [PW, PH] = land ? [SH, SW] : [SW, SH];
    const cols = Math.floor((PW - 2 * margin + gap) / (cw + gap)),
      rows = Math.floor((PH - 2 * margin + gap) / (ch + gap));
    const per = cols * rows;
    const ox = (PW - (cols * cw + (cols - 1) * gap)) / 2,
      oy = (PH - (rows * ch + (rows - 1) * gap)) / 2;
    for (const [i, m] of mains.entries()) {
      // Each guest's place card is a new render; give the page a moment between them.
      if (!cache.has(m ?? '')) await breathe();
      const j = i % per;
      const doc = j === 0 ? addPage(PW, PH) : pdf!;
      const x = ox + (j % cols) * (cw + gap),
        y = oy + Math.floor(j / cols) * (ch + gap);
      // The alias embeds each distinct card once, however many copies are on the sheets.
      doc.addImage(art(m), 'JPEG', x, y, cw, ch, `${k}:${m ?? ''}`);
      if (o.marks) {
        cropMarks(doc, x + b, y + b, tw, th, b + 0.8, Math.min(4, gap / 2 + b - 1));
        if (P.fold) {
          // Fold marks at mid-height, outside the card.
          doc.setLineDashPattern([1, 1], 0);
          doc.line(x - 3, y + b + th / 2, x - 0.5, y + b + th / 2);
          doc.line(x + cw + 0.5, y + b + th / 2, x + cw + 3, y + b + th / 2);
          doc.setLineDashPattern([], 0);
        }
      }
    }
  }
  if (!pdf) throw new Error('Nothing to print');
  return (pdf as jsPDF).output('blob');
}
