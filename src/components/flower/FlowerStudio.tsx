import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { FCOL, FINS, FL, FS_PRESETS, GR, MAX_GREENS, MAX_STEMS, SHAPES, VESS, loadCustom, type Draft } from '../../engine/flowers';
import { PALS, palOf } from '../../engine/studio';
import { newId } from '../../lib/designOps';
import { cachedArrangementThumb, cachedThumb, requestArrangementThumb, requestStemThumb, stemKey } from '../../three/thumbnail';
import { useDesignStore } from '../../store/designStore';
import { FlowerViewer, type Backdrop, type StudioView } from './FlowerViewer';
import { SHAPE_NOTE, STEM_RANGE, VESSEL_NOTE, colourHex, colourName, flowerName, priceOf, stemAdvice, stemTotal, widthCm } from './guidance';

const newSeed = () => Math.floor(Math.random() * 1e9);
const fromPreset = (i: number, seed = newSeed()): Draft => {
  const { name: _name, ...p } = structuredClone(FS_PRESETS[i]);
  return { ...p, seed };
};
type Tab = 'style' | 'flowers' | 'greenery';

/* ------------------------------------------------------------------ history */

interface Hist {
  past: Draft[];
  now: Draft;
  future: Draft[];
}
type HistAction = { t: 'set'; d: Draft } | { t: 'undo' } | { t: 'redo' };
function histReducer(h: Hist, a: HistAction): Hist {
  if (a.t === 'set') return JSON.stringify(a.d) === JSON.stringify(h.now) ? h : { past: [...h.past, h.now].slice(-60), now: a.d, future: [] };
  if (a.t === 'undo') return h.past.length ? { past: h.past.slice(0, -1), now: h.past[h.past.length - 1], future: [h.now, ...h.future] } : h;
  return h.future.length ? { past: [...h.past, h.now], now: h.future[0], future: h.future.slice(1) } : h;
}

/* ------------------------------------------------------------------ thumbnails */

function useThumb(key: string, request: (cb: (url: string) => void) => () => void, cached: () => string | undefined) {
  const [thumb, setThumb] = useState<{ key: string; url: string } | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => request((url) => setThumb({ key, url })), [key]);
  return thumb?.key === key ? thumb.url : cached();
}

function StemThumb({ kind, t, c, className = 'fs-th' }: { kind: 'flower' | 'green'; t: string; c?: string; className?: string }) {
  const key = stemKey(kind, t, c);
  const url = useThumb(key, (cb) => requestStemThumb(kind, t, c, cb), () => cachedThumb(key));
  return <span className={className} style={url ? { backgroundImage: `url(${url})` } : undefined} aria-hidden />;
}

function ArrThumb({ id, draft }: { id: string; draft: Draft }) {
  const url = useThumb(id, (cb) => requestArrangementThumb(id, draft, cb), () => cachedArrangementThumb(id));
  return <span className="fs-card-th" style={url ? { backgroundImage: `url(${url})` } : undefined} aria-hidden />;
}

/* ------------------------------------------------------------------ small pieces */

function Sec({ label, extra, children, hint }: { label: string; extra?: ReactNode; children: ReactNode; hint?: string }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="lbl flex items-baseline justify-between gap-2">
        <span>{label}</span>
        {extra && <span className="normal-case tracking-normal opacity-90">{extra}</span>}
      </div>
      {hint && <p className="fs-hint-text">{hint}</p>}
      {children}
    </section>
  );
}

function Stepper({ n, onStep, label, min = 0, max = 99 }: { n: number; onStep: (d: number) => void; label: string; min?: number; max?: number }) {
  return (
    <div className="fs-step" role="group" aria-label={`${label} count`}>
      <button type="button" aria-label={`Fewer ${label}`} disabled={n <= min} onClick={() => onStep(-1)}>
        −
      </button>
      <b aria-live="polite">{n}</b>
      <button type="button" aria-label={`More ${label}`} disabled={n >= max} onClick={() => onStep(1)}>
        +
      </button>
    </div>
  );
}

/** Colour swatches for one stem, shown in a popover under the row. */
function ColourPicker({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  return (
    <div className="fs-pop" role="listbox" aria-label="Flower colour">
      <div className="fs-cols">
        {Object.entries(FCOL).map(([k, [nm, hx]]) => (
          <button key={k} type="button" role="option" aria-selected={k === value} title={nm} aria-label={nm} className={k === value ? 'on' : ''} style={{ background: hx }} onClick={() => onPick(k)} />
        ))}
      </div>
      <label className="check mt-1 text-[11.5px]">
        <input type="color" value={colourHex(value)} onChange={(e) => onPick(e.target.value)} />
        <span>Any colour…</span>
      </label>
    </div>
  );
}

/** Stems by colour as a proportion bar: an at-a-glance read of the recipe's colour balance. */
function RecipeBar({ d }: { d: Draft }) {
  const total = stemTotal(d);
  if (!total) return null;
  return (
    <div className="fs-bar" aria-hidden>
      {d.stems.map((s, i) => (
        <i key={i} style={{ flex: s.n, background: colourHex(s.c) }} title={`${s.n} ${colourName(s.c).toLowerCase()} ${flowerName(s.t).toLowerCase()}`} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ studio */

export function FlowerStudio() {
  const editId = useDesignStore((s) => s.studio.editId);
  const closeStudio = useDesignStore((s) => s.closeStudio);
  const saveArrangement = useDesignStore((s) => s.saveArrangement);
  const deleteArrangement = useDesignStore((s) => s.deleteArrangement);
  const motion = useDesignStore((s) => s.motion);
  const eventPal = useDesignStore((s) => s.design.palette);
  const customPal = useDesignStore((s) => s.design.customPalette);

  const existing = useMemo(() => (editId ? loadCustom().find((x) => x.id === editId) : undefined), [editId]);
  const initial = useMemo<Draft>(() => {
    if (existing) {
      const { id: _id, name: _name, ...rest } = structuredClone(existing);
      return rest;
    }
    return fromPreset(0);
  }, [existing]);
  const initialName = existing?.name ?? `My ${FS_PRESETS[0].name.toLowerCase()}`;

  const [hist, dispatch] = useReducer(histReducer, { past: [], now: initial, future: [] });
  const draft = hist.now;
  const [name, setName] = useState(initialName);
  const [tab, setTab] = useState<Tab>('style');
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [warn, setWarn] = useState(false);
  const [confirm, setConfirm] = useState<null | 'discard' | 'delete'>(null);
  const [turntable, setTurntable] = useState(false);
  const [view, setView] = useState<StudioView>('three');
  const [viewNonce, setViewNonce] = useState(0);
  const [backdrop, setBackdrop] = useState<Backdrop>('dark');

  // Debounce rebuilds so rapid +/− presses don't rebuild the 3D arrangement on every click.
  const [shown, setShown] = useState(draft);
  useEffect(() => {
    const t = setTimeout(() => setShown(draft), 60);
    return () => clearTimeout(t);
  }, [draft]);

  const update = useCallback(
    (fn: (d: Draft) => void) => {
      const n = structuredClone(hist.now);
      fn(n);
      dispatch({ t: 'set', d: n });
    },
    [hist.now],
  );

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial) || name !== initialName;
  const requestClose = useCallback(() => {
    if (dirty) setConfirm('discard');
    else closeStudio();
  }, [dirty, closeStudio]);

  // Studio shortcuts: Esc closes (asking first if there are changes), Ctrl/Cmd+Z undoes a recipe change.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) && (e.target as HTMLInputElement).type !== 'range';
      if (e.key === 'Escape') {
        e.preventDefault();
        if (pickerFor !== null) setPickerFor(null);
        else if (confirm) setConfirm(null);
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
  }, [pickerFor, confirm, requestClose]);

  const total = stemTotal(draft);
  const V = VESS[draft.vessel];
  const advice = stemAdvice(draft);
  const [lo, hi] = STEM_RANGE[draft.vessel] ?? [1, 99];

  function save(place: boolean) {
    if (!draft.stems.length) {
      setWarn(true);
      setTab('flowers');
      return;
    }
    saveArrangement({ ...structuredClone(draft), id: editId ?? newId(), name: name.trim() || 'Untitled arrangement' }, place);
  }

  /** Recolour every stem from an event palette, cycling through its bloom colours. */
  function applyColourStory(palId: string) {
    const p = palOf(palId, customPal);
    update((d) => d.stems.forEach((s, i) => (s.c = p.b[i % p.b.length])));
  }

  const flowerList = Object.entries(FL).filter(([, f]) => !query || f.n.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className={`fs-root ${backdrop === 'light' ? 'light' : ''}`} role="dialog" aria-label="Flower Studio">
      <div className="fs-view">
        <FlowerViewer draft={shown} turntable={turntable && motion} view={view} viewNonce={viewNonce} backdrop={backdrop} />
        <div className="fs-top">
          <div className="lbl">Flower Studio{editId ? ' · editing' : ''}</div>
          <input className="serif fs-name" aria-label="Arrangement name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <div className="fs-sub">
            {V?.n} · {SHAPES[draft.shape]} · ≈ {widthCm(draft)} cm across
          </div>
        </div>

        <div className="fs-viewbar glass" role="toolbar" aria-label="View">
          <button type="button" onClick={() => update((d) => void (d.seed = newSeed()))} title="Rearrange the same stems">
            ↻ Shuffle
          </button>
          <span className="fs-sep" />
          {(
            [
              ['front', 'Front'],
              ['three', '¾'],
              ['top', 'Top'],
            ] as Array<[StudioView, string]>
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              className={view === v ? 'on' : ''}
              onClick={() => {
                setView(v);
                setViewNonce((n) => n + 1);
              }}
            >
              {l}
            </button>
          ))}
          <span className="fs-sep" />
          <button type="button" className={turntable ? 'on' : ''} disabled={!motion} title={motion ? 'Slowly turn the arrangement' : 'Motion is off'} onClick={() => setTurntable(!turntable)}>
            Turntable
          </button>
          <button type="button" onClick={() => setBackdrop(backdrop === 'dark' ? 'light' : 'dark')} title="Switch backdrop">
            {backdrop === 'dark' ? '◐ Light' : '◑ Dark'}
          </button>
        </div>
        <div className="fs-hint">Drag to turn · Scroll to zoom · Ctrl+Z undo · Esc to close</div>
      </div>

      <aside className="fs-side glass">
        <div className="fs-tabs" role="tablist">
          {(
            [
              ['style', 'Style'],
              ['flowers', `Flowers${total ? ` · ${total}` : ''}`],
              ['greenery', 'Greenery'],
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
              <Sec label="Start from a recipe" hint="Replaces the flowers and greenery; your name is kept when editing.">
                <div className="fs-cards">
                  {FS_PRESETS.map((p, i) => (
                    <button
                      key={p.name}
                      type="button"
                      className="fs-card"
                      onClick={() => {
                        dispatch({ t: 'set', d: fromPreset(i, draft.seed) });
                        if (!editId && !dirty) setName(`My ${p.name.toLowerCase()}`);
                      }}
                    >
                      <ArrThumb id={`preset:${i}`} draft={fromPreset(i, 7)} />
                      <b>{p.name}</b>
                      <small>
                        {VESS[p.vessel].n} · {p.stems.reduce((a, s) => a + s.n, 0)} stems
                      </small>
                    </button>
                  ))}
                </div>
              </Sec>
              <Sec label="Vessel">
                <div className="fs-cards">
                  {Object.entries(VESS).map(([k, v]) => (
                    <button key={k} type="button" className={`fs-card ${draft.vessel === k ? 'on' : ''}`} aria-pressed={draft.vessel === k} onClick={() => update((d) => void (d.vessel = k))}>
                      <ArrThumb id={`vessel:${k}`} draft={{ ...fromPreset(0, 7), vessel: k, stems: [{ t: 'rose', c: 'ivory', n: k === 'budvase' ? 1 : 6 }], greens: { eucalyptus: 2 } }} />
                      <b>{v.n}</b>
                      <small>{VESSEL_NOTE[k]}</small>
                    </button>
                  ))}
                </div>
              </Sec>
              {V?.fin ? (
                <Sec label="Finish" extra={FINS[draft.fin]}>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(FINS).map(([k, n]) => (
                      <button key={k} type="button" className={`fs-fin ${draft.fin === k ? 'on' : ''}`} aria-pressed={draft.fin === k} title={n} onClick={() => update((d) => void (d.fin = k))}>
                        <i className={`fin-${k}`} />
                        {n}
                      </button>
                    ))}
                  </div>
                </Sec>
              ) : null}
              <Sec label="Shape" extra={SHAPE_NOTE[draft.shape]}>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(SHAPES).map(([k, n]) => (
                    <button key={k} type="button" className={`chip ${draft.shape === k ? 'on' : ''}`} aria-pressed={draft.shape === k} onClick={() => update((d) => void (d.shape = k))}>
                      {n}
                    </button>
                  ))}
                </div>
              </Sec>
              <Sec label="Size" extra={`${Math.round(draft.size * 100)}% · ≈ ${widthCm(draft)} cm`}>
                <input type="range" min={0.6} max={1.6} step={0.05} aria-label="Size" value={draft.size} onChange={(e) => update((d) => void (d.size = Number(e.target.value)))} />
              </Sec>
            </>
          )}

          {tab === 'flowers' && (
            <>
              <Sec label="Your recipe" extra={total ? `${total} stems · ${lo}–${hi} suits a ${V?.n.toLowerCase()}` : ''}>
                <RecipeBar d={draft} />
                {advice && <p className="fs-advice">{advice}</p>}
                {!draft.stems.length && (
                  <p className="fs-hint-text" style={warn ? { color: 'var(--ac)', opacity: 1 } : undefined}>
                    {warn ? 'Add at least one flower before saving.' : 'Pick flowers from the list below — each adds a few stems you can adjust.'}
                  </p>
                )}
                <div className="flex flex-col gap-1.5">
                  {draft.stems.map((st, i) => (
                    <div key={`${st.t}-${i}`} className="fs-row">
                      <StemThumb kind="flower" t={st.t} c={st.c} className="fs-th sm" />
                      <div className="min-w-0">
                        <div className="truncate text-[13px]">{flowerName(st.t)}</div>
                        <button type="button" className="fs-colbtn" aria-expanded={pickerFor === i} onClick={() => setPickerFor(pickerFor === i ? null : i)}>
                          <i style={{ background: colourHex(st.c) }} />
                          {colourName(st.c)} ▾
                        </button>
                      </div>
                      <Stepper n={st.n} min={1} max={MAX_STEMS} label={flowerName(st.t)} onStep={(dd) => update((d) => void (d.stems[i].n = Math.max(1, Math.min(MAX_STEMS, d.stems[i].n + dd))))} />
                      <button
                        type="button"
                        className="fs-x"
                        aria-label={`Remove ${flowerName(st.t)}`}
                        onClick={() => {
                          setPickerFor(null);
                          update((d) => void d.stems.splice(i, 1));
                        }}
                      >
                        ×
                      </button>
                      {pickerFor === i && (
                        <ColourPicker
                          value={st.c}
                          onPick={(c) => {
                            update((d) => void (d.stems[i].c = c));
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </Sec>

              {draft.stems.length > 0 && (
                <Sec label="Colour story" hint="Recolour every stem from an event palette in one go.">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(PALS).map(([k, p]) => (
                      <button key={k} type="button" className={`chip flex items-center gap-1.5 ${k === eventPal ? 'addon' : ''}`} title={k === eventPal ? 'Current event palette' : undefined} onClick={() => applyColourStory(k)}>
                        <span className="flex">
                          {(k === 'custom' ? palOf('custom', customPal) : p).b.slice(0, 4).map((c, j) => (
                            <i key={j} className="h-2.5 w-2.5 rounded-full border border-black/30" style={{ background: c, marginLeft: j ? -4 : 0 }} />
                          ))}
                        </span>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </Sec>
              )}

              <Sec label="Add flowers">
                <input className="inp" placeholder="Search flowers — rose, tulip, orchid…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search flowers" />
                <div className="grid grid-cols-2 gap-1.5">
                  {flowerList.map(([k, f]) => {
                    const inRecipe = draft.stems.filter((s) => s.t === k).reduce((a, s) => a + s.n, 0);
                    return (
                      <button
                        key={k}
                        type="button"
                        className={`fs-add ${inRecipe ? 'in' : ''}`}
                        onClick={() => {
                          setWarn(false);
                          update((d) => {
                            const ex = d.stems.find((s) => s.t === k);
                            if (ex) ex.n = Math.min(MAX_STEMS, ex.n + 3);
                            else d.stems.push({ t: k, c: f.c, n: k === 'hydrangea' || k === 'protea' ? 2 : 5 });
                          });
                        }}
                      >
                        <StemThumb kind="flower" t={k} c={f.c} />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate">{f.n}</span>
                          <small className="tag">{inRecipe ? `In recipe · ${inRecipe}` : '+ Add'}</small>
                        </span>
                      </button>
                    );
                  })}
                  {!flowerList.length && <p className="fs-hint-text col-span-2">No flowers match “{query}”.</p>}
                </div>
              </Sec>
            </>
          )}

          {tab === 'greenery' && (
            <Sec label="Greenery" hint="Foliage fills gaps and softens the outline. Trailing ivy spills over the rim.">
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(GR).map(([k, G]) => {
                  const n = draft.greens[k] ?? 0;
                  return (
                    <div key={k} className={`fs-green ${n ? 'in' : ''}`}>
                      <StemThumb kind="green" t={k} />
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <span className="truncate text-[12.5px]">{G.n}</span>
                        <Stepper n={n} max={MAX_GREENS} label={G.n} onStep={(dd) => update((d) => void (d.greens[k] = Math.max(0, Math.min(MAX_GREENS, n + dd))))} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Sec>
          )}
        </div>

        <footer className="fs-foot">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="opacity-80">
              {total ? `${total} stems` : 'No flowers yet'} · est. £{priceOf(draft)} · {VESSEL_NOTE[draft.vessel]?.split(' · ')[0]}
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
          {confirm === 'discard' ? (
            <div className="fs-confirm">
              <span>Discard your changes?</span>
              <button type="button" className="btn" autoFocus onClick={() => setConfirm(null)}>
                Keep editing
              </button>
              <button type="button" className="btn on" onClick={closeStudio}>
                Discard
              </button>
            </div>
          ) : confirm === 'delete' && editId ? (
            <div className="fs-confirm">
              <span>Delete this arrangement and its placed copies?</span>
              <button type="button" className="btn" autoFocus onClick={() => setConfirm(null)}>
                Keep it
              </button>
              <button type="button" className="btn on" onClick={() => deleteArrangement(editId)}>
                Delete
              </button>
            </div>
          ) : (
            <div className="fs-acts">
              <button type="button" className="btn" onClick={requestClose}>
                Cancel
              </button>
              <button type="button" className="btn" onClick={() => save(false)}>
                {editId ? 'Save changes' : 'Save to My Flowers'}
              </button>
              <button type="button" className="btn primary" onClick={() => save(true)}>
                {editId ? 'Save & place another' : 'Save & place'}
              </button>
              {editId && (
                <button type="button" className="link col-span-3 justify-self-start" onClick={() => setConfirm('delete')}>
                  Delete arrangement
                </button>
              )}
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}
