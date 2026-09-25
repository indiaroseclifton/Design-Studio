import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useDesignStore } from '../../store/designStore';
import { downloadText } from '../../lib/capture';
import { GENRES as GENRE_NAMES, ERAS, FORMATS, MOMENTS, MOMENT_ORDER, TRACK_MIN, clock, curate, dayStart, defaultMusic, playlistCsv, recommend, searchLinks, type Era, type Format, type MomentId, type MusicPlan, type Segment } from '../../music/model';
import type { Genre, Song } from '../../music/library';
import { Sec, Stepper } from '../studio3d/ui';
import { histReducer } from '../studio3d/state';

/*
 * Music curator: the day as a row of moments, a curated playlist for the chosen one, and recommended
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
  return (
    <span className={`mu-cover ${big ? 'big' : ''}`} style={{ background: `linear-gradient(135deg, hsl(${h} 55% 52%), hsl(${(h + 50) % 360} 60% 28%))` }} aria-hidden>
      {t.title.replace(/[^A-Za-z0-9]/g, '').slice(0, 1)}
    </span>
  );
}

/** The day as a row of moment cards: when it starts, what it is, and what's playing. */
function Timeline({ segs, start, sel, onSel }: { segs: Segment[]; start: number; sel: MomentId; onSel: (m: MomentId) => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = host.current,
      card = row?.querySelector<HTMLElement>('.mu-card.on');
    if (!row || !card) return;
    // Scroll the row only (scrollIntoView would also move the page).
    if (card.offsetLeft < row.scrollLeft || card.offsetLeft + card.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollTo({ left: card.offsetLeft - 24, behavior: 'smooth' });
  }, [sel]);
  return (
    <div ref={host} className="mu-line" role="tablist" aria-label="Moments of the day">
      {segs.map((s) => {
        if (s.id === 'ceremony')
          return (
            <div key="vows" className="mu-vows" aria-hidden>
              Vows
            </div>
          );
        const id = s.id;
        const M = MOMENTS[id];
        return (
          <button key={id} type="button" role="tab" aria-selected={sel === id} className={`mu-card ${sel === id ? 'on' : ''}`} onClick={() => onSel(id)}>
            <span className="mu-card-t">{clock(start + s.start)}</span>
            <b>{M.n}</b>
            <small>{M.single ? (s.tracks[0]?.title ?? 'Choose a song') : `${s.tracks.length} songs · ${Math.round(s.minutes)} min`}</small>
          </button>
        );
      })}
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
  const M = MOMENTS[sel];
  const recs = useMemo(() => recommend(plan, sel, segs), [plan, sel, segs]);
  const [page, setPage] = useState(0);
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
            <div className="lbl">Music · {FORMATS[plan.format].n}</div>
            <div className="serif mu-title">The soundtrack</div>
          </div>
          <div className="mu-stats">
            <span>
              <b>{songs}</b> songs
            </span>
            <span>
              <b>{hours.toFixed(1)}</b> hours
            </span>
            <span>
              from <b>{clock(start)}</b>
            </span>
          </div>
        </header>
        <Timeline segs={segs} start={start} sel={sel} onSel={(m) => (setSel(m), setPage(0))} />
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
                  <Cover t={selSeg.tracks[0]} big />
                  <div className="mu-hero-t">
                    <span className="lbl">{selSeg.tracks[0].pinned ? 'Your choice' : 'Our suggestion'}</span>
                    <b className="serif">{selSeg.tracks[0].title}</b>
                    <span>
                      {selSeg.tracks[0].artist} · {selSeg.tracks[0].year}
                    </span>
                    <div className="mu-hero-acts">
                      <a className="btn mu-btn" href={searchLinks(selSeg.tracks[0]).spotify} target="_blank" rel="noreferrer">
                        ▶ Listen
                      </a>
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
                <ol className="scroll">
                  {selSeg.tracks.map((t) => (
                    <li key={t.id} className={t.pinned ? 'pinned' : ''}>
                      <span className="mu-time">{clock(start + t.at)}</span>
                      <Cover t={t} />
                      <span className="mu-song">
                        <b>{t.title}</b>
                        <small>
                          {t.artist} · {t.year}
                        </small>
                      </span>
                      <a className="mu-link" href={searchLinks(t).spotify} target="_blank" rel="noreferrer" aria-label={`Listen to ${t.title} on Spotify`}>
                        ▶
                      </a>
                      <button type="button" className={`fs-mini ${t.pinned ? 'on' : ''}`} aria-pressed={t.pinned} title={t.pinned ? 'Unpin' : 'Keep this song'} aria-label={`${t.pinned ? 'Unpin' : 'Pin'} ${t.title}`} onClick={() => moment(sel, (m) => void (m.pins = toggle(m.pins, t.id)))}>
                        ★
                      </button>
                      <button type="button" className="fs-mini" title="Take this song out" aria-label={`Remove ${t.title}`} onClick={() => moment(sel, (m) => void ((m.bans = [...m.bans, t.id]), (m.pins = m.pins.filter((x) => x !== t.id))))}>
                        ×
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              {mp.bans.length > 0 && (
                <button type="button" className="link" onClick={() => moment(sel, (m) => void (m.bans = []))}>
                  Bring back {mp.bans.length} removed song{mp.bans.length > 1 ? 's' : ''}
                </button>
              )}
            </section>
            <section className="mu-recs" aria-label={`Recommended for ${M.n.toLowerCase()}`}>
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
                      <a className="mu-link" href={searchLinks(song).spotify} target="_blank" rel="noreferrer" aria-label={`Listen to ${song.title} on Spotify`}>
                        ▶
                      </a>
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

