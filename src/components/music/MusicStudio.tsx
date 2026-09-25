import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { useDesignStore } from '../../store/designStore';
import { downloadText } from '../../lib/capture';
import { GENRES as GENRE_NAMES, ERAS, FORMATS, MOMENTS, MOMENT_ORDER, TRACK_MIN, clock, curate, dayStart, defaultMusic, playlistCsv, recommend, searchLinks, type Era, type Format, type MomentId, type MusicPlan, type Segment } from '../../music/model';
import type { Genre, Song } from '../../music/library';
import { cachedArtwork, previewState, seekPreview, stopPreview, togglePreview, usePreview, usePreviewKey } from '../../music/preview';
import { Sec, Stepper } from '../studio3d/ui';
import { histReducer } from '../studio3d/state';

/*
 * Music curator: the day's energy as a wave, a curated playlist for each moment, and recommended
 * songs to add. Pin songs to keep them, remove the ones you don't want, add your own; timings follow.
 */

type Tab = 'moments' | 'style' | 'requests' | 'export';
const PAGE = 6;

function hue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
function Cover({ t, big }: { t: Song; big?: boolean }) {
  const h = hue(t.title + t.artist);
  // A record: the label is the album artwork once the song has been previewed, else the song's colour.
  const art = cachedArtwork(t.id);
  return (
    <span className={`mu-cover ${big ? 'big' : ''}`} style={{ '--h': h, ...(art ? { '--art': `url("${art}")` } : {}) } as CSSProperties} aria-hidden>
      {art ? <b className="mu-art" /> : <i>{t.title.replace(/[^A-Za-z0-9]/g, '').slice(0, 1)}</i>}
    </span>
  );
}

/** Play or pause a song's 30-second preview in the app; the ring fills as it plays. */
function PlayButton({ song, label }: { song: Song; label?: string }) {
  const p = usePreview();
  const mine = p.song?.id === song.id;
  const status = mine ? p.status : 'idle';
  const playing = status === 'playing';
  return (
    <button
      type="button"
      className={`mu-play ${label ? 'wide' : ''} ${mine ? status : ''}`}
      style={{ '--p': mine ? p.progress : 0 } as CSSProperties}
      aria-label={`${playing ? 'Pause' : 'Play'} a preview of ${song.title}`}
      title={status === 'unavailable' ? 'No preview available' : playing ? 'Pause' : 'Play a 30-second preview'}
      onClick={() => void togglePreview(song)}
    >
      <span className="mu-play-i" aria-hidden>
        {status === 'loading' ? '' : playing ? '❚❚' : '▶'}
      </span>
      {label && <span>{playing ? 'Pause' : label}</span>}
    </button>
  );
}

/** The preview playing now: artwork, progress (click to seek), pause, and the full track on Apple Music. */
function NowPlaying({ fallback }: { fallback: (s: { title: string; artist: string }) => string }) {
  const p = usePreview();
  if (!p.song) return null;
  const s = p.song;
  return (
    <div className="mu-now" role="region" aria-label="Now playing">
      {p.info?.artwork ? <img src={p.info.artwork} alt="" className="mu-now-art" /> : <span className="mu-now-art" />}
      <div className="mu-now-t">
        <b>{s.title}</b>
        <small>
          {s.artist}
          {p.status === 'loading' ? ' · finding a preview…' : p.status === 'unavailable' ? ' · no preview available' : ' · 30-second preview'}
        </small>
        {p.info && (
          <div
            className="mu-now-bar"
            role="slider"
            aria-label="Preview position"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(p.progress * 100)}
            tabIndex={0}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              seekPreview((e.clientX - r.left) / r.width);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') seekPreview(p.progress + 0.1);
              else if (e.key === 'ArrowLeft') seekPreview(p.progress - 0.1);
            }}
          >
            <i style={{ width: `${p.progress * 100}%` }} />
          </div>
        )}
      </div>
      {p.status !== 'unavailable' && (
        <button type="button" className="mu-play big" aria-label={p.status === 'playing' ? 'Pause' : 'Play'} onClick={() => void togglePreview(s)}>
          <span className="mu-play-i" aria-hidden>
            {p.status === 'loading' ? '' : p.status === 'playing' ? '❚❚' : '▶'}
          </span>
        </button>
      )}
      <a className="mu-now-link" href={p.info?.trackUrl || fallback(s)} target="_blank" rel="noreferrer">
        {p.info?.trackUrl ? 'Apple Music ↗' : 'Find on Spotify ↗'}
      </a>
      <button type="button" className="fs-mini" aria-label="Close the player" onClick={stopPreview}>
        ×
      </button>
      {p.info && <span className="mu-now-credit">Preview courtesy of Apple Music</span>}
    </div>
  );
}

/** A small waveform: bars lit up to the song's energy. */
function EnergyBars({ t }: { t: Song }) {
  const seed = hue(t.id);
  const lit = Math.round((t.energy / 5) * 14);
  return (
    <span className="mu-bars" role="img" aria-label={`Energy ${t.energy} of 5`} title={`Energy ${t.energy} of 5`}>
      {Array.from({ length: 14 }, (_, i) => (
        <i key={i} className={i < lit ? 'on' : ''} style={{ height: `${35 + ((seed * (i + 3) * 7) % 65)}%` }} />
      ))}
    </span>
  );
}

const LINE = '#bd842c'; // validated against the chart surface #13100c (dataviz: lightness band, chroma, 3:1 contrast)

/** Energy across the day as one smooth glowing wave; click a stretch of it to open that moment. */
function EnergyWave({ segs, start, sel, onSel }: { segs: Segment[]; start: number; sel: MomentId; onSel: (m: MomentId) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  useEffect(() => {
    const el = host.current!;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const FLOOR = 30; // the dance floor strip under the plot
  const H = 196,
    L = 56,
    R = 16,
    T = 16,
    B = 26 + FLOOR;
  const total = segs.length ? segs[segs.length - 1].start + segs[segs.length - 1].minutes : 1;
  const pw = Math.max(10, w - L - R),
    ph = H - T - B;
  const X = (m: number) => L + (m / total) * pw;
  const Y = (e: number) => T + ((5 - e) / 4) * ph;
  const { line, strands, area, sm, n } = (() => {
    // Energy every two minutes (the vows are silence), smoothed so the day reads as a wave.
    const n = Math.max(60, Math.round(total / 2));
    const raw = Array.from({ length: n + 1 }, (_, i) => {
      const m = (i / n) * total;
      const s = segs.find((x) => m >= x.start && m < x.start + x.minutes);
      if (!s || !s.tracks.length) return 1;
      return (s.tracks.find((t) => m >= t.at && m < t.at + TRACK_MIN) ?? s.tracks[s.tracks.length - 1]).energy;
    });
    const sig = n / 45;
    const sm = raw.map((_, i) => {
      let a = 0,
        wt = 0;
      for (let j = Math.max(0, i - Math.ceil(sig * 3)); j <= Math.min(n, i + Math.ceil(sig * 3)); j++) {
        const k = Math.exp(-((i - j) ** 2) / (2 * sig * sig));
        a += raw[j] * k;
        wt += k;
      }
      return a / wt;
    });
    const pts = (dy: (i: number) => number) => sm.map((e, i) => [X((i / n) * total), Math.min(T + ph, Math.max(T, Y(e) + dy(i)))] as [number, number]);
    const path = (p: Array<[number, number]>) => {
      // Catmull-Rom through the samples, as cubic Béziers.
      let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
      for (let i = 0; i < p.length - 1; i++) {
        const p0 = p[i - 1] ?? p[i],
          p1 = p[i],
          p2 = p[i + 1],
          p3 = p[i + 2] ?? p2;
        d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
      }
      return d;
    };
    const main = pts(() => 0);
    const line = path(main);
    const strands = [-3, -2, -1, 1, 2, 3].map((k) => path(pts((i) => k * 2.4 * (0.6 + 0.4 * Math.sin((i / n) * 9 + k * 1.7)))));
    const area = line + `L${main[main.length - 1][0].toFixed(1)},${T + ph}L${main[0][0].toFixed(1)},${T + ph}Z`;
    return { line, strands, area, sm, n };
  })();
  const hoursTicks: number[] = [];
  for (let h = Math.ceil(start / 60); h * 60 <= start + total; h++) {
    const x = X(h * 60 - start);
    if (!hoursTicks.length || x - X(hoursTicks[hoursTicks.length - 1] * 60 - start) >= 48) hoursTicks.push(h);
  }
  const selSeg = segs.find((s) => s.id === sel);
  // The crowd: a dancer every so often along the floor, moving to the energy at that time of day.
  const floorY = T + ph + FLOOR - 4;
  const dancers = Array.from({ length: Math.floor(pw / 24) }, (_, i) => {
    const x = L + 12 + i * 24;
    const m = ((x - L) / pw) * total;
    const seg = segs.find((q) => m >= q.start && m < q.start + q.minutes);
    if (!seg || !seg.tracks.length) return null; // the vows: everyone's sitting quietly
    const e = sm[Math.round((m / total) * n)];
    const kind = e >= 3.9 ? 'jump' : e >= 2.6 ? 'bob' : 'sway';
    return { x, kind, on: seg.id === sel, i };
  }).filter((d) => !!d);
  return (
    <div
      ref={host}
      className="mu-wave"
      role="img"
      aria-label="Energy of the music across the day"
      onClick={(e) => {
        const r = host.current!.getBoundingClientRect();
        const m = ((e.clientX - r.left - L) / pw) * total;
        const s = segs.find((x) => m >= x.start && m < x.start + x.minutes);
        if (s && s.id !== 'ceremony') onSel(s.id);
      }}
    >
      <svg width={w} height={H}>
        <defs>
          <linearGradient id="mu-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={LINE} stopOpacity="0.22" />
            <stop offset="1" stopColor={LINE} stopOpacity="0" />
          </linearGradient>
          <filter id="mu-glow" x="-5%" y="-40%" width="110%" height="180%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        {hoursTicks.map((h) => (
          <line key={h} x1={X(h * 60 - start)} x2={X(h * 60 - start)} y1={T} y2={T + ph} className="mu-grid" />
        ))}
        {[5, 3, 1].map((e) => (
          <text key={e} x={L - 10} y={Y(e) + 4} textAnchor="end" className="mu-axis">
            {e === 5 ? 'Peak' : e === 3 ? 'Lively' : 'Hushed'}
          </text>
        ))}
        {selSeg && <rect x={X(selSeg.start)} y={T} width={Math.max(2, X(selSeg.start + selSeg.minutes) - X(selSeg.start))} height={ph} className="mu-sel" />}
        <path d={area} fill="url(#mu-fill)" />
        {strands.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={LINE} strokeWidth={1} opacity={0.3} />
        ))}
        <path d={line} fill="none" stroke={LINE} strokeWidth={7} opacity={0.85} filter="url(#mu-glow)" />
        <path d={line} fill="none" stroke={LINE} strokeWidth={2.2} strokeLinecap="round" />
        {selSeg && <line x1={X(selSeg.start)} x2={X(selSeg.start)} y1={T} y2={T + ph} stroke={LINE} strokeWidth={1.5} />}
        <line x1={L} x2={L + pw} y1={floorY + 0.5} y2={floorY + 0.5} className="mu-floor" />
        {dancers.map((d) => (
          <g key={d.i} transform={`translate(${d.x} ${floorY})`} className={`mu-dancer ${d.on ? 'on' : ''}`}>
            <g className={d.kind} style={{ animationDelay: `${-((d.i * 0.37) % 1.3).toFixed(2)}s` }}>
              <circle cx={0} cy={-17} r={2.6} />
              <path d={`M0,-14V-6M0,-6L-3,0M0,-6L3,0${d.kind === 'jump' ? 'M0,-12L-4.5,-18M0,-12L4.5,-18' : d.kind === 'bob' ? 'M0,-12L-4,-9M0,-12L4,-15' : 'M0,-12L-3,-7M0,-12L3,-7'}`} />
            </g>
          </g>
        ))}
        {hoursTicks.map((h) => (
          <text key={'t' + h} x={X(h * 60 - start)} y={H - 7} textAnchor={X(h * 60 - start) > L + pw - 20 ? 'end' : 'middle'} className="mu-axis">
            {h % 24}:00
          </text>
        ))}
      </svg>
    </div>
  );
}

/** The moments as chips; the selected one scrolls into view. */
function Chips({ segs, sel, onSel }: { segs: Segment[]; sel: MomentId; onSel: (m: MomentId) => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = host.current,
      chip = row?.querySelector<HTMLElement>('.chip.on');
    if (!row || !chip) return;
    // Scroll the row only (scrollIntoView would also move the page).
    if (chip.offsetLeft < row.scrollLeft || chip.offsetLeft + chip.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollTo({ left: chip.offsetLeft - 24, behavior: 'smooth' });
  }, [sel]);
  return (
    <div ref={host} className="mu-chips" role="tablist" aria-label="Moments of the day">
      {segs.map((s) =>
        s.id === 'ceremony' ? null : (
          <button key={s.id} type="button" role="tab" aria-selected={sel === s.id} className={`chip ${sel === s.id ? 'on' : ''}`} onClick={() => onSel(s.id as MomentId)}>
            {MOMENTS[s.id].n}
          </button>
        ),
      )}
    </div>
  );
}

/** Colour-coded parts of the day, for the moment list. */
const PHASE: Record<MomentId, string> = { arrival: 'c', processional: 'c', signing: 'c', recessional: 'r', drinks: 'r', dinner: 'r', firstdance: 'e', party: 'e', last: 'e' };

export function MusicStudio() {
  const close = useDesignStore((s) => s.closeOverlay);
  const saveMusic = useDesignStore((s) => s.saveMusic);
  const design = useDesignStore((s) => s.design);
  const [initial] = useState<MusicPlan>(() => structuredClone(useDesignStore.getState().design.music ?? defaultMusic()));
  const [hist, dispatch] = useReducer(histReducer<MusicPlan>, { past: [], now: initial, future: [] });
  const plan = hist.now;
  const [tab, setTab] = useState<Tab>('moments');
  const [sel, setSel] = useState<MomentId>('firstdance');
  const [confirm, setConfirm] = useState(false);
  const [own, setOwn] = useState({ title: '', artist: '', moment: 'party' as MomentId, energy: 4 });
  const [busy, setBusy] = useState('');

  const update = useCallback(
    (fn: (p: MusicPlan) => void) => {
      const n = structuredClone(hist.now);
      fn(n);
      dispatch({ t: 'set', d: n });
    },
    [hist.now],
  );
  const moment = (id: MomentId, fn: (m: MusicPlan['moments'][number]) => void) => update((p) => fn(p.moments.find((m) => m.id === id)!));

  const segs = useMemo(() => curate(plan), [plan]);
  const start = dayStart(design.stationery?.wording.time || '15:00', plan);
  const selSeg = segs.find((s) => s.id === sel);
  const songs = segs.reduce((a, s) => a + s.tracks.length, 0);
  const mins = segs.length ? segs[segs.length - 1].start + segs[segs.length - 1].minutes : 0;

  const dirty = JSON.stringify(plan) !== JSON.stringify(initial);
  const requestClose = useCallback(() => (dirty ? setConfirm(true) : close()), [dirty, close]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
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
      // Space pauses or resumes the preview (unless a button has focus, where Space presses it).
      if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
        const cur = previewState();
        if (cur.song && cur.status !== 'unavailable') {
          e.preventDefault();
          void togglePreview(cur.song);
        }
        return;
      }
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

  // Previews stop when the studio closes; record labels pick up album artwork as songs are previewed.
  useEffect(() => () => stopPreview(), []);
  usePreviewKey();

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const mp = plan.moments.find((m) => m.id === sel)!;
  const M = MOMENTS[sel];
  const recs = useMemo(() => recommend(plan, sel, segs), [plan, sel, segs]);
  const [page, setPage] = useState(0);
  const pick = (m: MomentId) => (setSel(m), setPage(0));
  const shown = recs.slice(page * PAGE, page * PAGE + PAGE);
  const [added, setAdded] = useState('');
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(''), 2200);
    return () => clearTimeout(t);
  }, [added]);
  /** Pin a song into the chosen moment: it replaces a single-song moment's choice, and lengthens a full set. */
  function choose(song: Song) {
    moment(sel, (m) => {
      if (M.single) m.pins = [song.id];
      else if (!m.pins.includes(song.id)) {
        m.pins.push(song.id);
        const slots = Math.max(1, Math.round(m.minutes / TRACK_MIN));
        if (m.pins.length > slots) m.minutes = Math.min(360, Math.ceil((m.pins.length * TRACK_MIN) / 5) * 5);
      }
      m.bans = m.bans.filter((b) => b !== song.id);
    });
    if (!M.single) setAdded(song.title);
  }

  async function brief() {
    setBusy('Preparing the DJ brief…');
    try {
      const { musicBrief } = await import('../../music/brief');
      const names = design.stationery?.wording.names ?? 'Our wedding';
      const blob = musicBrief(plan, segs, start, { names, date: design.stationery?.wording.date ?? '' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'music-brief.pdf';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setBusy('');
    } catch (e) {
      console.error(e);
      setBusy('Couldn’t make the brief.');
    }
  }

  return (
    <div className="fs-root mu-root" role="dialog" aria-label="Music curator">
      <div className="fs-view mu-view">
        <header className="mu-top">
          <div>
            <div className="serif mu-title">The soundtrack</div>
            <div className="mu-stats">
              {songs} songs · {Math.floor(mins / 60)}h {String(Math.round(mins % 60)).padStart(2, '0')}m · from {clock(start)} · £{FORMATS[plan.format].price.toLocaleString()} {FORMATS[plan.format].n} package
            </div>
          </div>
          <button type="button" className="btn primary mu-btn" onClick={() => document.getElementById('mu-recs')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}>
            Add songs
          </button>
        </header>
        <EnergyWave segs={segs} start={start} sel={sel} onSel={pick} />
        <Chips segs={segs} sel={sel} onSel={pick} />
        {selSeg && mp.on ? (
          <div className="mu-body">
            <section className="mu-list" aria-label={`${M.n} playlist`}>
              <header>
                <div>
                  <h3 className="serif">{M.n}</h3>
                  <p>
                    {clock(start + selSeg.start)} · {M.note}
                  </p>
                </div>
                {!M.single && (
                  <button type="button" className="btn mu-btn" onClick={() => moment(sel, (m) => void (m.seed = Math.floor(Math.random() * 1e6)))} title="Keep pinned songs; choose the rest again">
                    ↻ Reshuffle
                  </button>
                )}
              </header>
              {M.single && selSeg.tracks[0] ? (
                <div className="mu-hero">
                  <div className="mu-deck" aria-hidden>
                    <Cover t={selSeg.tracks[0]} big />
                    <svg className="mu-arm" viewBox="0 0 60 120" width="46" height="92">
                      <circle cx="44" cy="12" r="9" />
                      <path d="M44,12 L40,78 L26,100" />
                      <rect x="19" y="97" width="12" height="8" rx="2" transform="rotate(-35 25 101)" />
                    </svg>
                  </div>
                  <div className="mu-hero-t">
                    <span className="lbl">{selSeg.tracks[0].pinned ? 'Your choice' : 'Our suggestion'}</span>
                    <b className="serif">{selSeg.tracks[0].title}</b>
                    <span>
                      {selSeg.tracks[0].artist} · {selSeg.tracks[0].year} · {selSeg.tracks[0].bpm} bpm
                    </span>
                    <EnergyBars t={selSeg.tracks[0]} />
                    <div className="mu-hero-acts">
                      <PlayButton song={selSeg.tracks[0]} label="Play preview" />
                      {!selSeg.tracks[0].pinned && (
                        <button type="button" className="btn primary mu-btn" onClick={() => choose(selSeg.tracks[0])}>
                          Keep this song
                        </button>
                      )}
                    </div>
                    <p className="mu-hint">Or pick one of the recommendations.</p>
                  </div>
                </div>
              ) : (
                <div className="mu-table">
                  <div className="mu-row mu-head" aria-hidden>
                    <span>#</span>
                    <span>Track</span>
                    <span className="mu-c-e">Energy</span>
                    <span className="mu-c-b">BPM</span>
                    <span>Starts</span>
                    <span />
                  </div>
                  <ol className="scroll">
                    {selSeg.tracks.map((t, i) => (
                      <li key={t.id} className={`mu-row ${t.pinned ? 'pinned' : ''}`}>
                        <span className="mu-n">{i + 1}</span>
                        <span className="mu-track">
                          <Cover t={t} />
                          <span className="mu-song">
                            <b>{t.title}</b>
                            <small>
                              {t.artist} · {t.year}
                            </small>
                          </span>
                        </span>
                        <span className="mu-c-e">
                          <EnergyBars t={t} />
                        </span>
                        <span className="mu-c-b mu-num">{t.bpm}</span>
                        <span className="mu-num">{clock(start + t.at)}</span>
                        <span className="mu-acts">
                          <PlayButton song={t} />
                          <button type="button" className={`fs-mini ${t.pinned ? 'on' : ''}`} aria-pressed={t.pinned} title={t.pinned ? 'Unpin' : 'Keep this song'} aria-label={`${t.pinned ? 'Unpin' : 'Pin'} ${t.title}`} onClick={() => moment(sel, (m) => void (m.pins = toggle(m.pins, t.id)))}>
                            ★
                          </button>
                          <button type="button" className="fs-mini" title="Take this song out" aria-label={`Remove ${t.title}`} onClick={() => moment(sel, (m) => void ((m.bans = [...m.bans, t.id]), (m.pins = m.pins.filter((x) => x !== t.id))))}>
                            ×
                          </button>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {mp.bans.length > 0 && (
                <button type="button" className="link" onClick={() => moment(sel, (m) => void (m.bans = []))}>
                  Bring back {mp.bans.length} removed song{mp.bans.length > 1 ? 's' : ''}
                </button>
              )}
            </section>
            <section id="mu-recs" className="mu-recs" aria-label={`Recommended for ${M.n.toLowerCase()}`}>
              <header>
                <h3>Recommended for {M.n.toLowerCase()}</h3>
                {recs.length > PAGE && (
                  <button type="button" className="link" onClick={() => setPage((p) => ((p + 1) * PAGE >= recs.length ? 0 : p + 1))}>
                    More suggestions ↻
                  </button>
                )}
              </header>
              {shown.length ? (
                <ul>
                  {shown.map(({ song, reason }) => (
                    <li key={song.id}>
                      <Cover t={song} />
                      <span className="mu-song">
                        <b>{song.title}</b>
                        <small>
                          {song.artist} · {song.year}
                        </small>
                        <em>{reason}</em>
                      </span>
                      <PlayButton song={song} />
                      <button type="button" className="mu-add" aria-label={`${M.single ? 'Use' : 'Add'} ${song.title}`} onClick={() => choose(song)}>
                        {M.single ? 'Use' : '+ Add'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mu-hint">Every song we know for this moment is already in your playlist.</p>
              )}
              {added && (
                <p className="mu-toast" role="status">
                  Added “{added}”
                </p>
              )}
            </section>
          </div>
        ) : (
          <p className="mu-hint mu-off">This moment is switched off. Turn it on in the Moments tab.</p>
        )}
        <NowPlaying fallback={(x) => searchLinks(x).spotify} />
      </div>

      <aside className="fs-side glass">
        <div className="fs-tabs" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }} role="tablist">
          {(
            [
              ['moments', 'Moments'],
              ['style', 'Style'],
              ['requests', 'Requests'],
              ['export', 'Export'],
            ] as Array<[Tab, string]>
          ).map(([t, l]) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
              {l}
            </button>
          ))}
        </div>
        <div className="fs-scroll scroll">
          {tab === 'moments' && (
            <Sec label="The day" hint={`Timings run from the ceremony at ${clock(start + (plan.moments[0].on ? plan.moments[0].minutes : 0))} (set in the Stationery Studio).`}>
              <div className="flex flex-col gap-1.5">
                {plan.moments.map((m) => (
                  <div key={m.id} className={`st-piece ${m.on ? 'on' : ''}`}>
                    <label className="flex min-w-0 flex-1 items-center gap-2">
                      <input type="checkbox" checked={m.on} onChange={(e) => moment(m.id, (x) => void (x.on = e.target.checked))} />
                      <i className={`mu-dot ${PHASE[m.id]}`} aria-hidden />
                      <span className="flex min-w-0 flex-col">
                        <b>{MOMENTS[m.id].n}</b>
                        <small>{MOMENTS[m.id].note}</small>
                      </span>
                    </label>
                    {!MOMENTS[m.id].single && m.on && <Stepper n={m.minutes} min={4} max={360} label={`minutes of ${MOMENTS[m.id].n.toLowerCase()}`} onStep={(s) => moment(m.id, (x) => void (x.minutes = Math.max(4, Math.min(360, x.minutes + s * (x.minutes >= 60 ? 15 : 5)))))} />}
                  </div>
                ))}
              </div>
              <p className="fs-hint-text">Minutes, where a moment has more than one song.</p>
            </Sec>
          )}
          {tab === 'style' && (
            <>
              <Sec label="Who’s playing">
                <div className="flex flex-col gap-1">
                  {(Object.keys(FORMATS) as Format[]).map((k) => (
                    <button key={k} type="button" className={`fs-opt ${plan.format === k ? 'on' : ''}`} aria-pressed={plan.format === k} onClick={() => update((p) => void (p.format = k))}>
                      <b>{FORMATS[k].n}</b>
                      <small>
                        {FORMATS[k].note} · from £{FORMATS[k].price.toLocaleString()}
                      </small>
                    </button>
                  ))}
                </div>
              </Sec>
              <Sec label="Genres" hint="Leave all off for a bit of everything.">
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(GENRE_NAMES) as Genre[]).map((g) => (
                    <button key={g} type="button" className={`chip ${plan.genres.includes(g) ? 'on' : ''}`} aria-pressed={plan.genres.includes(g)} onClick={() => update((p) => void (p.genres = toggle(p.genres, g)))}>
                      {GENRE_NAMES[g]}
                    </button>
                  ))}
                </div>
              </Sec>
              <Sec label="Eras">
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(ERAS) as Era[]).map((e) => (
                    <button key={e} type="button" className={`chip ${plan.eras.includes(e) ? 'on' : ''}`} aria-pressed={plan.eras.includes(e)} onClick={() => update((p) => void (p.eras = toggle(p.eras, e)))}>
                      {ERAS[e]}
                    </button>
                  ))}
                </div>
              </Sec>
            </>
          )}
          {tab === 'requests' && (
            <>
              <Sec label="Must play" hint="Song titles or artists, one per line. They’re put first where they fit.">
                <textarea className="inp st-area" rows={4} aria-label="Must play" value={plan.mustPlay} onChange={(e) => update((p) => void (p.mustPlay = e.target.value))} />
              </Sec>
              <Sec label="Do not play" hint="Titles or artists, one per line. They never appear.">
                <textarea className="inp st-area" rows={4} aria-label="Do not play" value={plan.doNotPlay} onChange={(e) => update((p) => void (p.doNotPlay = e.target.value))} />
              </Sec>
              <Sec label="Add your own song">
                <input className="inp" placeholder="Title" aria-label="Song title" value={own.title} onChange={(e) => setOwn({ ...own, title: e.target.value })} />
                <input className="inp" placeholder="Artist" aria-label="Artist" value={own.artist} onChange={(e) => setOwn({ ...own, artist: e.target.value })} />
                <div className="flex items-center gap-2">
                  <select className="inp mn-select" aria-label="Moment" value={own.moment} onChange={(e) => setOwn({ ...own, moment: e.target.value as MomentId })}>
                    {MOMENT_ORDER.map((id) => (
                      <option key={id} value={id}>
                        {MOMENTS[id].n}
                      </option>
                    ))}
                  </select>
                  <span className="text-[12px] opacity-75">Energy</span>
                  <Stepper n={own.energy} min={1} max={5} label="energy" onStep={(s) => setOwn({ ...own, energy: Math.max(1, Math.min(5, own.energy + s)) })} />
                </div>
                <button
                  type="button"
                  className="btn"
                  disabled={!own.title.trim()}
                  onClick={() => {
                    const id = 'c:' + own.title.trim().toLowerCase() + '|' + own.artist.trim().toLowerCase();
                    update((p) => {
                      p.custom = p.custom.filter((c) => c.id !== id);
                      p.custom.push({ id, title: own.title.trim(), artist: own.artist.trim(), year: new Date().getFullYear(), bpm: 110, energy: own.energy, genres: [], moments: MOMENTS[own.moment].code });
                      const m = p.moments.find((x) => x.id === own.moment)!;
                      if (!m.pins.includes(id)) m.pins.push(id);
                    });
                    setSel(own.moment);
                    setOwn({ ...own, title: '', artist: '' });
                  }}
                >
                  Add and pin to {MOMENTS[own.moment].n.toLowerCase()}
                </button>
              </Sec>
            </>
          )}
          {tab === 'export' && (
            <Sec label="Share it" hint="The brief gives your DJ or band the timings, every song, and your requests.">
              <button type="button" className="btn primary" disabled={busy.startsWith('Preparing')} onClick={brief}>
                {busy.startsWith('Preparing') ? busy : 'Download the DJ brief (PDF)'}
              </button>
              <button type="button" className="btn" onClick={() => downloadText(playlistCsv(plan), 'wedding-playlist.csv', 'text/csv')}>
                Download the playlist (CSV)
              </button>
              <p className="fs-hint-text">Playlist import tools (such as TuneMyMusic or Soundiiz) can turn the CSV into a Spotify or Apple Music playlist.</p>
              {busy && !busy.startsWith('Preparing') && <p className="fs-advice">{busy}</p>}
            </Sec>
          )}
        </div>
        <footer className="fs-foot">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="opacity-80">
              {songs} songs · {FORMATS[plan.format].n} · from £{FORMATS[plan.format].price.toLocaleString()}
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
              <button type="button" className="btn primary" onClick={() => saveMusic(structuredClone(plan))}>
                Save to design
              </button>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}

