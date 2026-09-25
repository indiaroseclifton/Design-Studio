import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useDesignStore } from '../../store/designStore';
import { downloadText } from '../../lib/capture';
import { GENRES as GENRE_NAMES, ERAS, FORMATS, MOMENTS, MOMENT_ORDER, TRACK_MIN, clock, curate, dayStart, defaultMusic, playlistCsv, searchLinks, type Era, type Format, type MomentId, type MusicPlan, type Segment, type Track } from '../../music/model';
import type { Genre } from '../../music/library';
import { Sec, Stepper } from '../studio3d/ui';
import { histReducer } from '../studio3d/state';

/*
 * Music curator: the day as an energy curve, and a curated playlist for each moment. Pin songs to keep
 * them, remove the ones you don't want, add your own; the curve and timings follow.
 */

type Tab = 'moments' | 'style' | 'requests' | 'export';
const LINE = '#d95926'; // validated against the panel surface (dataviz: lightness band, chroma, 3:1 contrast)

function hue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
function Cover({ t }: { t: Track }) {
  const h = hue(t.title + t.artist);
  return (
    <span className="mu-cover" style={{ background: `linear-gradient(135deg, hsl(${h} 45% 42%), hsl(${(h + 40) % 360} 55% 22%))` }} aria-hidden>
      {t.title.replace(/[^A-Za-z0-9]/g, '').slice(0, 1)}
    </span>
  );
}

/** Energy across the day: a stepped line of each track's energy over clock time, moments as bands. */
function EnergyChart({ segs, start, sel, onSel }: { segs: Segment[]; start: number; sel: MomentId; onSel: (m: MomentId) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [hover, setHover] = useState<{ x: number; t: Track | null; mins: number } | null>(null);
  useEffect(() => {
    const el = host.current!;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 190,
    L = 58,
    R = 14,
    T = 26,
    B = 26;
  const total = segs.length ? segs[segs.length - 1].start + segs[segs.length - 1].minutes : 1;
  const pw = Math.max(10, w - L - R),
    ph = H - T - B;
  const X = (m: number) => L + (m / total) * pw;
  const Y = (e: number) => T + ((5 - e) / 4) * ph;
  const tracks = segs.flatMap((s) => s.tracks.map((t) => ({ t, seg: s })));
  // Stepped path, broken where there's no music (the vows).
  let d = '',
    area = '';
  for (const s of segs) {
    if (!s.tracks.length) continue;
    const pts: Array<[number, number]> = [];
    s.tracks.forEach((t, i) => {
      const x0 = X(t.at),
        x1 = X(Math.min(s.start + s.minutes, i === s.tracks.length - 1 ? s.start + s.minutes : t.at + TRACK_MIN));
      pts.push([x0, Y(t.energy)], [x1, Y(t.energy)]);
    });
    d += 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L');
    area += `M${pts[0][0].toFixed(1)},${Y(1) + ph / 4}` + pts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join('') + `L${pts[pts.length - 1][0].toFixed(1)},${Y(1) + ph / 4}Z`;
  }
  const at = (mins: number) => tracks.find(({ t, seg }) => mins >= t.at && mins < Math.min(seg.start + seg.minutes, t.at + TRACK_MIN) + (seg.tracks.length === 1 ? seg.minutes : 0))?.t ?? null;
  const move = (clientX: number) => {
    const r = host.current!.getBoundingClientRect();
    const x = Math.min(L + pw, Math.max(L, clientX - r.left));
    const mins = ((x - L) / pw) * total;
    setHover({ x, t: at(mins), mins });
  };
  const idx = hover?.t ? tracks.findIndex((x) => x.t.id === hover.t!.id) : -1;
  const step = (dlt: number) => {
    const i = Math.max(0, Math.min(tracks.length - 1, (idx < 0 ? 0 : idx) + dlt));
    const t = tracks[i]?.t;
    if (t) setHover({ x: X(t.at + 0.01), t, mins: t.at });
  };
  // Clock labels at segment starts, skipping ones that would collide.
  const ticks = segs.reduce<Segment[]>((acc, s) => (acc.length && X(s.start) - X(acc[acc.length - 1].start) < 44 ? acc : [...acc, s]), []);
  return (
    <div
      ref={host}
      className="mu-chart"
      tabIndex={0}
      role="img"
      aria-label="Energy of the music across the day"
      onPointerMove={(e) => move(e.clientX)}
      onPointerLeave={() => setHover(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') step(1);
        else if (e.key === 'ArrowLeft') step(-1);
        else return;
        e.preventDefault();
      }}
    >
      <svg width={w} height={H}>
        {segs.map((s) => {
          const x0 = X(s.start),
            x1 = X(s.start + s.minutes),
            on = s.id === sel;
          return (
            <g key={s.id + s.start} onClick={() => s.id !== 'ceremony' && onSel(s.id)} style={{ cursor: s.id === 'ceremony' ? 'default' : 'pointer' }}>
              <rect x={x0} y={T} width={Math.max(1, x1 - x0)} height={ph} fill={on ? 'rgba(217,89,38,.14)' : s.id === 'ceremony' ? 'rgba(255,240,220,.015)' : 'rgba(255,240,220,.035)'} />
              <line x1={x0} x2={x0} y1={T} y2={T + ph} stroke="rgba(255,240,220,.1)" />
              {x1 - x0 > 64 && (
                <text x={x0 + 6} y={T - 8} className={`mu-band ${on ? 'on' : ''}`}>
                  {s.id === 'ceremony' ? 'Vows' : MOMENTS[s.id].n}
                </text>
              )}
            </g>
          );
        })}
        {[1, 3, 5].map((e) => (
          <g key={e}>
            <line x1={L} x2={L + pw} y1={Y(e)} y2={Y(e)} stroke="rgba(255,240,220,.08)" />
            <text x={L - 8} y={Y(e) + 4} textAnchor="end" className="mu-axis">
              {e === 5 ? 'Peak' : e === 3 ? 'Lively' : 'Hushed'}
            </text>
          </g>
        ))}
        <path d={area} fill={LINE} opacity={0.16} />
        <path d={d} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" />
        {ticks.map((s) => (
          <text key={'t' + s.start} x={X(s.start)} y={H - 8} textAnchor={X(s.start) > L + pw - 40 ? 'end' : 'start'} className="mu-axis">
            {clock(start + s.start)}
          </text>
        ))}
        {hover && (
          <g pointerEvents="none">
            <line x1={hover.x} x2={hover.x} y1={T} y2={T + ph} stroke="rgba(255,240,220,.5)" strokeWidth={1} />
            {hover.t && <circle cx={hover.x} cy={Y(hover.t.energy)} r={5} fill={LINE} stroke="#1f1914" strokeWidth={2} />}
          </g>
        )}
      </svg>
      {hover && (
        <div className="mu-tip" style={{ left: Math.min(hover.x + 12, w - 230) }} role="status">
          <b>{clock(start + hover.mins)}</b>
          {hover.t ? (
            <>
              <span className="mu-tip-t">{hover.t.title}</span>
              <span className="mu-tip-s">
                {hover.t.artist} · energy {hover.t.energy} of 5
              </span>
            </>
          ) : (
            <span className="mu-tip-s">The vows: no music</span>
          )}
        </div>
      )}
    </div>
  );
}

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
  const hours = segs.length ? (segs[segs.length - 1].start + segs[segs.length - 1].minutes) / 60 : 0;

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

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const mp = plan.moments.find((m) => m.id === sel)!;

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
        <div className="fs-top mu-top">
          <div className="lbl">Music · {FORMATS[plan.format].n}</div>
          <div className="serif fs-name mn-title">The soundtrack</div>
          <div className="fs-sub">
            {songs} songs · {hours.toFixed(1)} hours from {clock(start)}
          </div>
        </div>
        <div className="mu-body">
          <EnergyChart segs={segs} start={start} sel={sel} onSel={setSel} />
          <div className="mu-chips" role="tablist" aria-label="Moments">
            {MOMENT_ORDER.filter((id) => plan.moments.find((m) => m.id === id)?.on).map((id) => (
              <button key={id} type="button" role="tab" aria-selected={sel === id} className={`chip ${sel === id ? 'on' : ''}`} onClick={() => setSel(id)}>
                {MOMENTS[id].n}
              </button>
            ))}
          </div>
          {selSeg && mp.on ? (
            <section className="mu-list" aria-label={MOMENTS[sel].n}>
              <header>
                <div>
                  <h3 className="serif">{MOMENTS[sel].n}</h3>
                  <p>
                    {clock(start + selSeg.start)} · {MOMENTS[sel].note}
                  </p>
                </div>
                <button type="button" className="btn" onClick={() => moment(sel, (m) => void (m.seed = Math.floor(Math.random() * 1e6)))} title="Keep pinned songs; choose the rest again">
                  ↻ Reshuffle
                </button>
              </header>
              <ol>
                {selSeg.tracks.map((t) => {
                  const links = searchLinks(t);
                  return (
                    <li key={t.id} className={t.pinned ? 'pinned' : ''}>
                      <span className="mu-time">{clock(start + t.at)}</span>
                      <Cover t={t} />
                      <span className="mu-song">
                        <b>{t.title}</b>
                        <small>
                          {t.artist} · {t.year} · ~{t.bpm} bpm
                        </small>
                      </span>
                      <span className="mu-energy" aria-label={`Energy ${t.energy} of 5`} title={`Energy ${t.energy} of 5`}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <i key={i} className={i <= t.energy ? 'on' : ''} />
                        ))}
                      </span>
                      <a className="mu-link" href={links.spotify} target="_blank" rel="noreferrer" aria-label={`Find ${t.title} on Spotify`}>
                        Listen ↗
                      </a>
                      <button type="button" className={`fs-mini ${t.pinned ? 'on' : ''}`} aria-pressed={t.pinned} title={t.pinned ? 'Unpin' : 'Keep this song'} aria-label={`${t.pinned ? 'Unpin' : 'Pin'} ${t.title}`} onClick={() => moment(sel, (m) => void (m.pins = toggle(m.pins, t.id)))}>
                        ★
                      </button>
                      <button type="button" className="fs-mini" title="Take this song out" aria-label={`Remove ${t.title}`} onClick={() => moment(sel, (m) => void ((m.bans = [...m.bans, t.id]), (m.pins = m.pins.filter((x) => x !== t.id))))}>
                        ×
                      </button>
                    </li>
                  );
                })}
              </ol>
              {mp.bans.length > 0 && (
                <button type="button" className="link" onClick={() => moment(sel, (m) => void (m.bans = []))}>
                  Bring back {mp.bans.length} removed song{mp.bans.length > 1 ? 's' : ''}
                </button>
              )}
            </section>
          ) : (
            <p className="fs-hint-text">This moment is switched off.</p>
          )}
        </div>
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

