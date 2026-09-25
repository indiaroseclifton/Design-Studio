import { jsPDF } from 'jspdf';
import { FORMATS, MOMENTS, clock, type MusicPlan, type Segment } from './model';

/** The DJ or band brief: timings, every song by moment (pinned ones starred), and the couple's requests. */
export function musicBrief(plan: MusicPlan, segs: Segment[], start: number, o: { names: string; date: string }): Blob {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210,
    M = 18;
  let y = 22;
  const need = (h: number) => {
    if (y + h > 280) {
      pdf.addPage();
      y = 20;
    }
  };
  pdf.setFont('times', 'italic');
  pdf.setFontSize(26);
  pdf.text(o.names || 'Our wedding', M, y);
  y += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(110);
  pdf.text(`Music brief · ${FORMATS[plan.format].n}${o.date ? ' · ' + o.date : ''}`, M, y);
  y += 10;
  pdf.setDrawColor(200);
  pdf.line(M, y, W - M, y);
  y += 8;
  for (const s of segs) {
    if (s.id === 'ceremony') {
      need(10);
      pdf.setTextColor(120);
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(9.5);
      pdf.text(`${clock(start + s.start)}  Vows and readings: no music`, M, y);
      y += 8;
      continue;
    }
    need(16);
    pdf.setTextColor(30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(`${clock(start + s.start)}  ${MOMENTS[s.id].n}`, M, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    pdf.text(MOMENTS[s.id].note, W - M, y, { align: 'right' });
    y += 6;
    pdf.setFontSize(10);
    for (const t of s.tracks) {
      need(6);
      pdf.setTextColor(40);
      pdf.text(`${t.pinned ? '* ' : '   '}${t.title}`, M + 4, y);
      pdf.setTextColor(120);
      pdf.text(`${t.artist} · ${t.year}`, W - M, y, { align: 'right' });
      y += 5.2;
    }
    y += 4;
  }
  const block = (title: string, text: string) => {
    const ls = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!ls.length) return;
    need(12);
    pdf.setTextColor(30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(title, M, y);
    y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    for (const l of ls) {
      need(6);
      pdf.text('• ' + l, M + 4, y);
      y += 5.2;
    }
    y += 4;
  };
  block('Must play', plan.mustPlay);
  block('Please don’t play', plan.doNotPlay);
  need(10);
  pdf.setFontSize(8.5);
  pdf.setTextColor(140);
  pdf.text('* chosen by the couple. Timings are approximate; follow the room.', M, Math.max(y, 286));
  return pdf.output('blob');
}
