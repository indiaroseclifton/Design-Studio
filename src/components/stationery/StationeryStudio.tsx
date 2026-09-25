import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { palOf } from '../../engine/studio';
import { VENUES } from '../../engine/venues.gen';
import { downloadUrl, slug } from '../../lib/capture';
import { useDesignStore } from '../../store/designStore';
import { drawFlatLay, pieceCanvas, type DrawCtx } from '../../stationery/draw';
import {
  EDGES,
  FOILS,
  ORNAMENTS,
  PAPERS,
  PIECES,
  PIECE_ORDER,
  THEMES,
  TYPES,
  defaultSuite,
  guestList,
  pieceQty,
  withTheme,
  type EdgeId,
  type FoilId,
  type OrnamentId,
  type PaperId,
  type PieceKind,
  type Suite,
  type ThemeId,
  type TypeId,
  type Wording,
} from '../../stationery/model';
import { drawCtxFor } from '../../stationery/ctx';
import { loadStationeryFonts, paperFontsVersion, subscribePaper } from '../../stationery/paperArt';
import { Sec, Stepper } from '../studio3d/ui';
import { histReducer } from '../studio3d/state';

/*
 * Stationery Studio: a whole paper suite designed at once. The viewer shows the suite as a flat lay or one
 * piece at a time; the side panel sets the style, the wording, which pieces are in the suite and printing.
 */

type Tab = 'style' | 'wording' | 'pieces' | 'print';
type Sheet = 'A4' | 'Letter' | 'A3';

function loadStoryNames() {
  try {
    const s = JSON.parse(localStorage.getItem('vs2_story') || '{}');
    return { names: typeof s.names === 'string' && s.names ? s.names : 'Olivia & James', date: typeof s.date === 'string' ? s.date : '' };
  } catch {
    return { names: 'Olivia & James', date: '' };
  }
}

/** The viewer: a canvas redrawn whenever the suite or its size changes. */
function Viewer({ ctx, mode, piece, fonts }: { ctx: DrawCtx; mode: 'lay' | 'piece'; piece: PieceKind; fonts: number }) {
  const host = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    const el = host.current!;
    const ro = new ResizeObserver(() => setSize([el.clientWidth, el.clientHeight]));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const c = cv.current;
    if (!c || !size[0]) return;
    const id = setTimeout(() => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const [w, h] = size;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const x = c.getContext('2d')!;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const first = guestList(ctx.suite)[0] ?? 'Guest Name';
      // Keep clear of the title (top) and the view bar (bottom).
      const top = Math.min(150, h * 0.2),
        bottom = 80;
      const area = { x: w * 0.03, y: top, w: w * 0.94, h: Math.max(100, h - top - bottom) };
      if (mode === 'lay') {
        drawFlatLay(x, w, h, ctx, PIECE_ORDER.filter((k) => ctx.suite.pieces[k]), first, area);
        return;
      }
      // One piece, as large as fits, on the same surface.
      drawFlatLay(x, w, h, ctx, [], first, area);
      const [wmm, hmm] = PIECES[piece].mm;
      const k = Math.min((area.w * 0.8) / wmm, (area.h * 0.92) / hmm);
      const card = pieceCanvas(piece, ctx, k, { shape: true, main: piece === 'placecard' ? first : piece === 'tablenum' ? '1' : undefined });
      x.save();
      x.shadowColor = 'rgba(40,25,10,.4)';
      x.shadowBlur = 24;
      x.shadowOffsetY = 10;
      x.drawImage(card, area.x + (area.w - card.width) / 2, area.y + (area.h - card.height) / 2);
      x.restore();
    }, 40);
    return () => clearTimeout(id);
  }, [ctx, mode, piece, size, fonts]);
  return (
    <div ref={host} className="st-view">
      <canvas ref={cv} style={{ width: '100%', height: '100%', display: 'block' }} aria-label={mode === 'lay' ? 'The stationery suite, laid out' : PIECES[piece].n} role="img" />
    </div>
  );
}

/** A small invitation in each theme, for the theme cards. */
function ThemeThumb({ id, ctx, fonts }: { id: ThemeId; ctx: DrawCtx; fonts: number }) {
  const url = useMemo(() => {
    void fonts;
    const s = withTheme(ctx.suite, id);
    return pieceCanvas('invitation', { ...ctx, suite: s }, 1.15, { shape: true }).toDataURL();
    // Only the look matters here: re-render when the theme's inputs change, not on every wording keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ctx.pal, ctx.suite.wording.names, fonts]);
  return <span className="st-theme-th" style={{ backgroundImage: `url(${url})` }} aria-hidden />;
}

export function StationeryStudio() {
  const close = useDesignStore((s) => s.closeOverlay);
  const saveStationery = useDesignStore((s) => s.saveStationery);
  const design = useDesignStore((s) => s.design);
  const fonts = useSyncExternalStore(subscribePaper, paperFontsVersion);
  const [initial] = useState<Suite>(() => {
    const s = useDesignStore.getState().design;
    if (s.stationery) return structuredClone(s.stationery);
    const st = loadStoryNames();
    const d = defaultSuite(st.names, st.date);
    d.wording.venue = VENUES[s.venue]?.name ?? '';
    return d;
  });
  const [hist, dispatch] = useReducer(histReducer<Suite>, { past: [], now: initial, future: [] });
  const suite = hist.now;
  const [tab, setTab] = useState<Tab>('style');
  const [mode, setMode] = useState<'lay' | 'piece'>('lay');
  const [piece, setPiece] = useState<PieceKind>('invitation');
  const [confirm, setConfirm] = useState(false);
  const [sheet, setSheet] = useState<Sheet>('A4');
  const [bleed, setBleed] = useState(true);
  const [marks, setMarks] = useState(true);
  const [printWhat, setPrintWhat] = useState<'piece' | 'suite'>('suite');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    void loadStationeryFonts();
  }, []);

  const pal = useMemo(() => palOf(design.palette, design.customPalette), [design.palette, design.customPalette]);
  const ctx: DrawCtx = useMemo(() => drawCtxFor(design, suite), [design, suite]);

  const update = useCallback((fn: (s: Suite) => void) => {
    const n = structuredClone(hist.now);
    fn(n);
    dispatch({ t: 'set', d: n });
  }, [hist.now]);
  const word = (k: keyof Wording, v: string) => update((s) => void (s.wording[k] = v));

  const dirty = JSON.stringify(suite) !== JSON.stringify(initial);
  const requestClose = useCallback(() => (dirty ? setConfirm(true) : close()), [dirty, close]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (confirm) setConfirm(false);
        else requestClose();
        return;
      }
      if (typing) return;
      const mod = e.metaKey || e.ctrlKey,
        k = e.key.toLowerCase();
      if (mod && k === 'z') {
        e.preventDefault();
        dispatch({ t: e.shiftKey ? 'redo' : 'undo' });
      } else if (mod && k === 'y') {
        e.preventDefault();
        dispatch({ t: 'redo' });
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [confirm, requestClose]);

  const on = PIECE_ORDER.filter((k) => suite.pieces[k]);
  const qty = (k: PieceKind) => pieceQty(k, suite, design.guests, design.tables.length);
  const cost = on.reduce((a, k) => a + qty(k) * PIECES[k].price, 0);
  const show = (k: PieceKind) => {
    setPiece(k);
    setMode('piece');
  };

  async function exportPdf() {
    setBusy('Preparing your print file…');
    try {
      await loadStationeryFonts();
      const { exportPdf: run } = await import('../../stationery/print');
      const kinds = printWhat === 'piece' ? [piece] : on;
      const blob = await run(kinds, ctx, { sheet, bleed: bleed ? 3 : 0, marks, guests: design.guests, tables: design.tables.length, onProgress: (i, n, name) => setBusy(`Preparing ${name.toLowerCase()} (${i + 1} of ${n})…`) });
      const url = URL.createObjectURL(blob);
      downloadUrl(url, `${slug(suite.wording.names)}-${printWhat === 'piece' ? slug(PIECES[piece].n) : 'stationery'}.pdf`);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setBusy('');
    } catch (e) {
      console.error(e);
      setBusy('Couldn’t make the print file.');
    }
  }
  function downloadPng() {
    const cv = pieceCanvas(piece, ctx, 300 / 25.4 / (PIECES[piece].big ? 2 : 1), { main: piece === 'placecard' ? guestList(suite)[0] : piece === 'tablenum' ? '1' : undefined });
    downloadUrl(cv.toDataURL('image/png'), `${slug(suite.wording.names)}-${slug(PIECES[piece].n)}.png`);
  }

  const inkSwatches = [...new Set([PAPERS[suite.paper].ink, '#2b2521', '#1f2a44', pal.g, ...pal.b])].slice(0, 9);

  return (
    <div className="fs-root st-root" role="dialog" aria-label="Stationery Studio">
      <div className="fs-view">
        <Viewer ctx={ctx} mode={mode} piece={piece} fonts={fonts} />
        <div className="st-scrim" aria-hidden />
        <div className="fs-top">
          <div className="lbl">Stationery Studio · {THEMES[suite.theme].n}</div>
          <input className="serif fs-name" aria-label="Names" value={suite.wording.names} maxLength={60} onChange={(e) => word('names', e.target.value)} />
          <div className="fs-sub">
            {on.length} pieces · {mode === 'lay' ? 'the whole suite' : `${PIECES[piece].n}, ${PIECES[piece].mm[0]} × ${PIECES[piece].mm[1]} mm`}
          </div>
        </div>
        <div className="fs-viewbar glass st-viewbar" role="toolbar" aria-label="View">
          <button type="button" className={mode === 'lay' ? 'on' : ''} onClick={() => setMode('lay')}>
            Flat lay
          </button>
          <span className="fs-sep" />
          <div className="st-piece-strip">
            {on.map((k) => (
              <button key={k} type="button" className={mode === 'piece' && piece === k ? 'on' : ''} onClick={() => show(k)}>
                {PIECES[k].n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className="fs-side glass">
        <div className="fs-tabs" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }} role="tablist">
          {(
            [
              ['style', 'Style'],
              ['wording', 'Wording'],
              ['pieces', 'Pieces'],
              ['print', 'Print'],
            ] as Array<[Tab, string]>
          ).map(([t, l]) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
              {l}
            </button>
          ))}
        </div>

        <div className="fs-scroll scroll">
          {tab === 'style' && (
            <>
              <Sec label="Theme" hint="Sets the paper, foil, type, edge and ornament together; change any of them below.">
                <div className="fs-cards st-themes">
                  {(Object.keys(THEMES) as ThemeId[]).map((id) => (
                    <button key={id} type="button" className={`fs-card ${suite.theme === id ? 'on' : ''}`} aria-pressed={suite.theme === id} onClick={() => dispatch({ t: 'set', d: withTheme(suite, id) })}>
                      <ThemeThumb id={id} ctx={ctx} fonts={fonts} />
                      <b>{THEMES[id].n}</b>
                      <small>{THEMES[id].note}</small>
                    </button>
                  ))}
                </div>
              </Sec>
              <Sec label="Paper" extra={PAPERS[suite.paper].n}>
                <div className="st-swatches" role="radiogroup" aria-label="Paper">
                  {(Object.keys(PAPERS) as PaperId[]).map((k) => (
                    <button key={k} type="button" role="radio" aria-checked={suite.paper === k} title={PAPERS[k].n} aria-label={PAPERS[k].n} className={suite.paper === k ? 'on' : ''} style={{ background: PAPERS[k].c }} onClick={() => update((s) => void ((s.paper = k), (s.ink = 'auto')))} />
                  ))}
                </div>
              </Sec>
              <Sec label="Foil">
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(FOILS) as FoilId[]).map((k) => (
                    <button key={k} type="button" className={`chip ${suite.foil === k ? 'on' : ''}`} aria-pressed={suite.foil === k} onClick={() => update((s) => void (s.foil = k))}>
                      {FOILS[k].stops.length > 0 && <i className="st-foil" style={{ background: `linear-gradient(135deg, ${FOILS[k].stops.join(',')})` }} />}
                      {FOILS[k].n}
                    </button>
                  ))}
                </div>
              </Sec>
              <Sec label="Type">
                <div className="flex flex-col gap-1">
                  {(Object.keys(TYPES) as TypeId[]).map((k) => (
                    <button key={k} type="button" className={`fs-opt st-type ${suite.type === k ? 'on' : ''}`} aria-pressed={suite.type === k} onClick={() => update((s) => void (s.type = k))}>
                      <b style={{ fontFamily: `"${TYPES[k].head.family}"`, fontStyle: TYPES[k].head.style ?? 'normal', fontSize: TYPES[k].head.script ? 24 : 19 }}>{suite.wording.names || 'Olivia & James'}</b>
                      <small style={{ fontFamily: `"${TYPES[k].body.family}"` }}>{TYPES[k].n}</small>
                    </button>
                  ))}
                </div>
              </Sec>
              <Sec label="Ornament">
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(ORNAMENTS) as OrnamentId[]).map((k) => (
                    <button key={k} type="button" className={`chip ${suite.ornament === k ? 'on' : ''}`} aria-pressed={suite.ornament === k} onClick={() => update((s) => void (s.ornament = k))}>
                      {ORNAMENTS[k]}
                    </button>
                  ))}
                </div>
                {(suite.ornament === 'florals' || suite.ornament === 'greenery' || suite.ornament === 'wreath') && <p className="fs-hint-text">Florals are painted in the design’s {pal.name.toLowerCase()} palette.</p>}
              </Sec>
              <Sec label="Edge">
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(EDGES) as EdgeId[]).map((k) => (
                    <button key={k} type="button" className={`chip ${suite.edge === k ? 'on' : ''}`} aria-pressed={suite.edge === k} onClick={() => update((s) => void (s.edge = k))}>
                      {EDGES[k]}
                    </button>
                  ))}
                </div>
              </Sec>
              <Sec label="Ink" extra={suite.ink === 'auto' ? 'Matches the paper' : undefined}>
                <div className="st-swatches small" role="radiogroup" aria-label="Ink colour">
                  <button type="button" role="radio" aria-checked={suite.ink === 'auto'} className={`st-auto ${suite.ink === 'auto' ? 'on' : ''}`} onClick={() => update((s) => void (s.ink = 'auto'))}>
                    Auto
                  </button>
                  {inkSwatches.map((c) => (
                    <button key={c} type="button" role="radio" aria-checked={suite.ink === c} aria-label={`Ink ${c}`} className={suite.ink === c ? 'on' : ''} style={{ background: c }} onClick={() => update((s) => void (s.ink = c))} />
                  ))}
                </div>
              </Sec>
            </>
          )}

          {tab === 'wording' && (
            <>
              <Sec label="The couple" hint="Separate the names with “&” for the two-line layout.">
                <input className="inp" aria-label="Names" value={suite.wording.names} onChange={(e) => word('names', e.target.value)} />
                <input className="inp" aria-label="Host line" placeholder="Host line, e.g. Together with their families" value={suite.wording.host} onChange={(e) => word('host', e.target.value)} />
              </Sec>
              <Sec label="When and where" hint="The invitation writes the date and time out in words.">
                <div className="grid grid-cols-2 gap-2">
                  <label className="st-field">
                    <span>Date</span>
                    <input className="inp" type="date" value={suite.wording.date} onChange={(e) => word('date', e.target.value)} />
                  </label>
                  <label className="st-field">
                    <span>Time</span>
                    <input className="inp" type="time" value={suite.wording.time} onChange={(e) => word('time', e.target.value)} />
                  </label>
                </div>
                <input className="inp" aria-label="Venue" placeholder={ctx.venueName || 'Venue'} value={suite.wording.venue} onChange={(e) => word('venue', e.target.value)} />
                <input className="inp" aria-label="Address" placeholder="Address or town" value={suite.wording.address} onChange={(e) => word('address', e.target.value)} />
                <input className="inp" aria-label="Reception line" placeholder="Reception line, e.g. Dinner and dancing to follow" value={suite.wording.reception} onChange={(e) => word('reception', e.target.value)} />
              </Sec>
              <Sec label="Replies and details">
                <label className="st-field">
                  <span>Reply by</span>
                  <input className="inp" type="date" value={suite.wording.rsvpBy} onChange={(e) => word('rsvpBy', e.target.value)} />
                </label>
                <input className="inp" aria-label="Website" placeholder="Website, e.g. oliviaandjames.com" value={suite.wording.website} onChange={(e) => word('website', e.target.value)} />
                <input className="inp" aria-label="Dress code" placeholder="Dress code" value={suite.wording.dress} onChange={(e) => word('dress', e.target.value)} />
                <textarea className="inp st-area" aria-label="A note for the details card" placeholder="A note for the details card: accommodation, travel, gifts…" rows={2} value={suite.wording.note} onChange={(e) => word('note', e.target.value)} />
              </Sec>
              <Sec label="Guests" extra={`${guestList(suite).length} names`} hint="One per line. Used for place cards and the seating chart.">
                <textarea className="inp st-area" aria-label="Guest names" rows={5} placeholder={'Amelia Hart\nBen Okafor\n…'} value={suite.guests} onChange={(e) => update((s) => void (s.guests = e.target.value))} />
              </Sec>
              <Sec label="Seating chart" hint="Optional. One table per line, e.g. “Table One: Amelia, Ben”. Left empty, the guest list is shared across your tables.">
                <textarea className="inp st-area" aria-label="Seating chart" rows={4} value={suite.seating} onChange={(e) => update((s) => void (s.seating = e.target.value))} />
              </Sec>
              {design.menu ? (
                <Sec label="Menu">
                  <p className="fs-hint-text">The menu, reply-card meal choices and bar menu come from the Menu &amp; Bar planner.</p>
                </Sec>
              ) : (
                <Sec label="Menu" hint="One course per line: Course | Dish | details. Or plan it properly in Studios → Menu & Bar.">
                  <textarea className="inp st-area" aria-label="Menu" rows={4} value={suite.menu} onChange={(e) => update((s) => void (s.menu = e.target.value))} />
                </Sec>
              )}
              <Sec label="Order of service" hint="One item per line.">
                <textarea className="inp st-area" aria-label="Order of service" rows={6} value={suite.program} onChange={(e) => update((s) => void (s.program = e.target.value))} />
              </Sec>
            </>
          )}

          {tab === 'pieces' && (
            <>
              <Sec label="In this suite" hint="Quantities follow your guest count and tables; invitations go one per household.">
                <div className="flex flex-col gap-1">
                  {PIECE_ORDER.map((k) => (
                    <div key={k} className={`st-piece ${suite.pieces[k] ? 'on' : ''}`}>
                      <label className="flex min-w-0 flex-1 items-center gap-2">
                        <input type="checkbox" checked={suite.pieces[k]} onChange={(e) => update((s) => void (s.pieces[k] = e.target.checked))} />
                        <span className="flex min-w-0 flex-col">
                          <b>{PIECES[k].n}</b>
                          <small>
                            {PIECES[k].note} · {PIECES[k].mm[0]} × {PIECES[k].mm[1]} mm
                          </small>
                        </span>
                      </label>
                      <span className="st-qty">{suite.pieces[k] ? `× ${qty(k)}` : ''}</span>
                      <button type="button" className="link" onClick={() => show(k)} disabled={!suite.pieces[k]}>
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </Sec>
              <Sec label="Spares" hint="Extra copies of each card, for keepsakes and late additions.">
                <Stepper n={suite.spares} min={0} max={50} label="spares" onStep={(d) => update((s) => void (s.spares = Math.max(0, Math.min(50, s.spares + d))))} />
              </Sec>
              <p className="fs-hint-text">Place cards, table numbers, menu stands, the welcome easel and the seating chart in the scene show this suite once it’s saved.</p>
            </>
          )}

          {tab === 'print' && (
            <>
              <Sec label="What to print">
                <div className="seg" role="radiogroup" aria-label="What to print">
                  <button type="button" role="radio" aria-checked={printWhat === 'suite'} className={printWhat === 'suite' ? 'on' : ''} onClick={() => setPrintWhat('suite')}>
                    Whole suite
                  </button>
                  <button type="button" role="radio" aria-checked={printWhat === 'piece'} className={printWhat === 'piece' ? 'on' : ''} onClick={() => setPrintWhat('piece')}>
                    {PIECES[piece].n}
                  </button>
                </div>
              </Sec>
              <Sec label="Sheet" hint="Cards are laid out several to a sheet; the signs get a page of their own at full size.">
                <div className="seg three" role="radiogroup" aria-label="Sheet size">
                  {(['A4', 'Letter', 'A3'] as Sheet[]).map((k) => (
                    <button key={k} type="button" role="radio" aria-checked={sheet === k} className={sheet === k ? 'on' : ''} onClick={() => setSheet(k)}>
                      {k}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-[12.5px]">
                  <input type="checkbox" checked={bleed} onChange={(e) => setBleed(e.target.checked)} /> 3 mm bleed (artwork runs past the cut)
                </label>
                <label className="flex items-center gap-2 text-[12.5px]">
                  <input type="checkbox" checked={marks} onChange={(e) => setMarks(e.target.checked)} /> Crop marks
                </label>
              </Sec>
              <Sec label="Files">
                <button type="button" className="btn primary" disabled={!!busy && busy.startsWith('Preparing')} onClick={exportPdf}>
                  {busy.startsWith('Preparing') ? busy : 'Download print-ready PDF'}
                </button>
                <button type="button" className="btn" onClick={downloadPng}>
                  Download {PIECES[piece].n.toLowerCase()} as an image
                </button>
                {busy && !busy.startsWith('Preparing') && <p className="fs-advice">{busy}</p>}
                <p className="fs-hint-text">Images suit sending a save-the-date by email or message. Place cards print one per guest from your list, table numbers one per table.</p>
              </Sec>
            </>
          )}
        </div>

        <footer className="fs-foot">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="opacity-80">
              {on.length} pieces · est. print £{Math.round(cost)}
            </span>
            <span className="flex gap-1">
              <button type="button" className="fs-mini" disabled={!hist.past.length} onClick={() => dispatch({ t: 'undo' })} title="Undo (Ctrl+Z)" aria-label="Undo">
                ↶
              </button>
              <button type="button" className="fs-mini" disabled={!hist.future.length} onClick={() => dispatch({ t: 'redo' })} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
                ↷
              </button>
            </span>
          </div>
          {confirm ? (
            <div className="fs-confirm">
              <span>Discard your changes?</span>
              <button type="button" className="btn" autoFocus onClick={() => setConfirm(false)}>
                Keep editing
              </button>
              <button type="button" className="btn on" onClick={close}>
                Discard
              </button>
            </div>
          ) : (
            <div className="fs-acts" style={{ gridTemplateColumns: '1fr 2fr' }}>
              <button type="button" className="btn" onClick={requestClose}>
                Cancel
              </button>
              <button type="button" className="btn primary" onClick={() => saveStationery(structuredClone(suite))}>
                Save to design
              </button>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}

