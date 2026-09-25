import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  BORDERS,
  CAKE_COLOURS,
  CAKE_PRESETS,
  FINISHES,
  FLOWER_STYLES,
  MAX_TIERS,
  METALS,
  SHAPES,
  STANDS,
  TIER_D,
  TIER_H,
  TOPPERS,
  buildCake,
  cakeAdvice,
  cakeHeightCm,
  cakeHex,
  cakePrice,
  loadCakes,
  servings,
  suggestTier,
  type Border,
  type CakeDesign,
  type Finish,
  type Tier,
  refitCakePlaced,
} from '../../engine/cakes';
import { FCOL, FL } from '../../engine/catalogue.gen';
import { newId } from '../../lib/designOps';
import { cachedModelThumb, requestModelThumb } from '../../three/thumbnail';
import { useDesignStore } from '../../store/designStore';
import { StudioViewer, type Backdrop, type Picker, type StudioView } from '../studio3d/StudioViewer';
import { usePaletteDrag } from '../studio3d/drag';
import { MAX_PLACED, type Vec3 } from '../../engine/placed';
import { Sec, StemThumb, Stepper } from '../studio3d/ui';
import { histReducer, useThumb } from '../studio3d/state';
import { colourHex, colourName } from '../flower/guidance';

const newSeed = () => Math.floor(Math.random() * 1e9);
const fromPreset = (i: number, seed = newSeed()): CakeDesign => {
  const { name: _n, note: _note, ...p } = structuredClone(CAKE_PRESETS[i]);
  return { ...p, seed };
};
type Tab = 'tiers' | 'finish' | 'decorate' | 'topper';
/** Which tiers a finish/border edit applies to. */
type Scope = 'all' | number;

const tierLabel = (i: number, n: number) => (n === 1 ? 'Single tier' : i === n - 1 ? `Tier ${i + 1} · top` : i === 0 ? 'Tier 1 · base' : `Tier ${i + 1}`);

function PresetThumb({ i }: { i: number }) {
  const key = `cake:preset:${i}`;
  const url = useThumb(key, (cb) => requestModelThumb(key, (g) => buildCake(g, fromPreset(i, 7)), cb), () => cachedModelThumb(key));
  return <span className="fs-card-th" style={url ? { backgroundImage: `url(${url})` } : undefined} aria-hidden />;
}

/** Icing colour swatches plus "any colour". */
function CakeSwatches({ value, onPick, label }: { value: string; onPick: (c: string) => void; label: string }) {
  return (
    <div className="flex flex-col gap-1.5" role="listbox" aria-label={label}>
      <div className="fs-cols">
        {Object.entries(CAKE_COLOURS).map(([k, [nm, hx]]) => (
          <button key={k} type="button" role="option" aria-selected={k === value} title={nm} aria-label={nm} className={k === value ? 'on' : ''} style={{ background: hx }} onClick={() => onPick(k)} />
        ))}
      </div>
      <label className="check text-[11.5px]">
        <input type="color" value={cakeHex(value)} onChange={(e) => onPick(e.target.value)} />
        <span>{CAKE_COLOURS[value]?.[0] ?? 'Custom colour'} · any colour…</span>
      </label>
    </div>
  );
}

export function CakeStudio() {
  const editId = useDesignStore((s) => s.cakeStudio.editId);
  const close = useDesignStore((s) => s.closeCakeStudio);
  const saveCake = useDesignStore((s) => s.saveCake);
  const deleteCake = useDesignStore((s) => s.deleteCake);
  const motion = useDesignStore((s) => s.motion);

  const existing = useMemo(() => (editId ? loadCakes().find((x) => x.id === editId) : undefined), [editId]);
  const initial = useMemo<CakeDesign>(() => {
    if (existing) {
      const { id: _id, name: _name, ...rest } = structuredClone(existing);
      return rest;
    }
    return fromPreset(0);
  }, [existing]);
  const initialName = existing?.name ?? 'Our wedding cake';

  const [hist, dispatch] = useReducer(histReducer<CakeDesign>, { past: [], now: initial, future: [] });
  const cake = hist.now;
  const [name, setName] = useState(initialName);
  const [tab, setTab] = useState<Tab>('tiers');
  const [scope, setScope] = useState<Scope>('all');
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<null | 'discard' | 'delete'>(null);
  const [turntable, setTurntable] = useState(false);
  const [view, setView] = useState<StudioView>('front');
  const [viewNonce, setViewNonce] = useState(0);
  const [backdrop, setBackdrop] = useState<Backdrop>('dark');
  const picker = useRef<Picker | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [placedPicker, setPlacedPicker] = useState<number | null>(null);
  const [dropHint, setDropHint] = useState(false);
  useEffect(() => {
    if (!dropHint) return;
    const t = setTimeout(() => setDropHint(false), 2600);
    return () => clearTimeout(t);
  }, [dropHint]);

  // Debounce rebuilds so stepping sizes doesn't rebuild the model on every click.
  const [shown, setShown] = useState(cake);
  useEffect(() => {
    const t = setTimeout(() => setShown(cake), 80);
    return () => clearTimeout(t);
  }, [cake]);

  const update = useCallback(
    (fn: (d: CakeDesign) => void) => {
      const n = structuredClone(hist.now);
      fn(n);
      // Hand-placed blooms stay on their tier when tiers or the stand change.
      if (n.placed?.length && (n.stand !== hist.now.stand || JSON.stringify(n.tiers.map((t) => [t.d, t.h])) !== JSON.stringify(hist.now.tiers.map((t) => [t.d, t.h]))))
        n.placed = refitCakePlaced(n.placed, hist.now, n);
      dispatch({ t: 'set', d: n });
    },
    [hist.now],
  );
  /** Edit the tiers in scope (all, or the chosen one). */
  const updateTiers = (fn: (t: Tier) => void) => update((d) => d.tiers.forEach((t, i) => (scope === 'all' || scope === i) && fn(t)));

  const placedCount = cake.placed?.length ?? 0;
  const drag = usePaletteDrag<string>(
    picker,
    (t, hit) => {
      if (placedCount >= MAX_PLACED) return;
      update((d) => void (d.placed = [...(d.placed ?? []), { t, c: FL[t].c, p: hit.p, n: hit.n, tw: Math.random() * 6.283 }]));
      setSelected(placedCount);
    },
    () => setDropHint(true),
  );
  const removePlaced = (i: number) => {
    setSelected(null);
    setPlacedPicker(null);
    update((d) => void d.placed?.splice(i, 1));
  };
  /** Blooms face out from the icing, tipped up a little so they read from the front. */
  const orient = useCallback((_p: Vec3, s: Vec3): Vec3 => [s[0], s[1] + 0.35, s[2]], []);

  const dirty = JSON.stringify(cake) !== JSON.stringify(initial) || name !== initialName;
  const requestClose = useCallback(() => (dirty ? setConfirm('discard') : close()), [dirty, close]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = e.target instanceof HTMLInputElement && e.target.type !== 'range';
      if (e.key === 'Escape') {
        e.preventDefault();
        if (pickerFor !== null) setPickerFor(null);
        else if (selected !== null) setSelected(null);
        else if (confirm) setConfirm(null);
        else requestClose();
        return;
      }
      if (typing) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected !== null) {
        e.preventDefault();
        removePlaced(selected);
        return;
      }
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
    // removePlaced only reads the latest cake through update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerFor, confirm, requestClose, selected]);

  // Keep the scope valid when tiers are removed.
  const scoped = scope === 'all' || scope < cake.tiers.length ? scope : 'all';
  const ref = scoped === 'all' ? cake.tiers[0] : cake.tiers[scoped];
  const serves = servings(cake);
  const advice = cakeAdvice(cake);
  const n = cake.tiers.length;

  function save(place: boolean) {
    saveCake({ ...structuredClone(cake), id: editId ?? newId(), name: name.trim() || 'Untitled cake' }, place);
  }

  const ScopePicker = (
    <div className="seg" style={{ gridTemplateColumns: `repeat(${Math.min(n + 1, 6)}, 1fr)` }} role="radiogroup" aria-label="Apply to">
      <button type="button" className={scoped === 'all' ? 'on' : ''} onClick={() => setScope('all')}>
        All tiers
      </button>
      {cake.tiers.map((_, i) => (
        <button key={i} type="button" className={scoped === i ? 'on' : ''} onClick={() => setScope(i)} title={tierLabel(i, n)}>
          {n === 1 ? 'Tier' : `T${i + 1}`}
        </button>
      ))}
    </div>
  );

  return (
    <div className={`fs-root ${backdrop === 'light' ? 'light' : ''}`} role="dialog" aria-label="Cake Studio">
      <div className="fs-view">
        <StudioViewer
          buildKey={JSON.stringify(shown)}
          build={(g) => buildCake(g, shown)}
          surf="table"
          frameKey={`${shown.tiers.map((t) => `${t.d}x${t.h}`).join(',')}|${shown.stand}|${shown.topper.kind}`}
          turntable={turntable && motion && !drag.dragging}
          view={view}
          viewNonce={viewNonce}
          backdrop={backdrop}
          placing={{
            pickerRef: picker,
            orient,
            marker: 0.03,
            selected,
            onSelect: (i) => {
              setSelected(i);
              if (i !== null) setTab('decorate');
            },
            onMove: (i, hit) => update((d) => void (d.placed && d.placed[i] && Object.assign(d.placed[i], { p: hit.p, n: hit.n }))),
          }}
        />
        {drag.layer}
        {dropHint && (
          <div className="fs-drop-hint glass" role="status">
            Drop it on the cake to place it there
          </div>
        )}
        <div className="fs-top">
          <div className="lbl">Cake Studio{editId ? ' · editing' : ''}</div>
          <input className="serif fs-name" aria-label="Cake name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <div className="fs-sub">
            {n} tier{n > 1 ? 's' : ''} · {cakeHeightCm(cake)} cm tall · serves about {serves}
          </div>
        </div>
        <div className="fs-viewbar glass" role="toolbar" aria-label="View">
          <button type="button" onClick={() => update((d) => void (d.seed = newSeed()))} title="Rearrange flowers and decorations">
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
                setViewNonce((x) => x + 1);
              }}
            >
              {l}
            </button>
          ))}
          <span className="fs-sep" />
          <button type="button" className={turntable ? 'on' : ''} disabled={!motion} onClick={() => setTurntable(!turntable)}>
            Turntable
          </button>
          <button type="button" onClick={() => setBackdrop(backdrop === 'dark' ? 'light' : 'dark')}>
            {backdrop === 'dark' ? '◐ Light' : '◑ Dark'}
          </button>
        </div>
        <div className="fs-hint">Drag flowers onto the cake · drag placed blooms to move them · Drag to turn · Ctrl+Z undo · Esc to close</div>
      </div>

      <aside className="fs-side glass">
        <div className="fs-tabs" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }} role="tablist">
          {(
            [
              ['tiers', 'Tiers'],
              ['finish', 'Finish'],
              ['decorate', 'Decorate'],
              ['topper', 'Topper'],
            ] as Array<[Tab, string]>
          ).map(([t, l]) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
              {l}
            </button>
          ))}
        </div>

        <div className="fs-scroll scroll">
          {tab === 'tiers' && (
            <>
              <Sec label="Start from a design" hint="Replaces the whole cake; you can change everything afterwards.">
                <div className="fs-cards">
                  {CAKE_PRESETS.map((p, i) => (
                    <button key={p.name} type="button" className="fs-card" onClick={() => dispatch({ t: 'set', d: fromPreset(i, cake.seed) })}>
                      <PresetThumb i={i} />
                      <b>{p.name}</b>
                      <small>{p.note}</small>
                    </button>
                  ))}
                </div>
              </Sec>

              <Sec label="Tiers" extra={`${n} of ${MAX_TIERS}`} hint="Listed top to bottom. Sizes are diameters (or widths) in centimetres.">
                {advice && <p className="fs-advice">{advice}</p>}
                <div className="flex flex-col gap-1.5">
                  {cake.tiers
                    .map((t, i) => ({ t, i }))
                    .reverse()
                    .map(({ t, i }) => (
                      <div key={i} className="fs-tier">
                        <div className="flex items-center justify-between gap-2">
                          <b className="text-[12.5px] font-medium">{tierLabel(i, n)}</b>
                          {n > 1 && (
                            <button type="button" className="fs-x" aria-label={`Remove ${tierLabel(i, n)}`} onClick={() => update((d) => void d.tiers.splice(i, 1))}>
                              ×
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(SHAPES).map(([k, l]) => (
                            <button key={k} type="button" className={`chip ${t.shape === k ? 'on' : ''}`} aria-pressed={t.shape === k} onClick={() => update((d) => void (d.tiers[i].shape = k as Tier['shape']))}>
                              {l}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                          <label className="flex items-center justify-between gap-2">
                            <span className="opacity-70">Width</span>
                            <span className="flex items-center gap-1">
                              <Stepper n={t.d} min={TIER_D[0]} max={TIER_D[1]} label={`tier ${i + 1} width`} onStep={(s) => update((d) => void (d.tiers[i].d = Math.min(TIER_D[1], Math.max(TIER_D[0], d.tiers[i].d + s))))} />
                              cm
                            </span>
                          </label>
                          <label className="flex items-center justify-between gap-2">
                            <span className="opacity-70">Height</span>
                            <span className="flex items-center gap-1">
                              <Stepper n={t.h} min={TIER_H[0]} max={TIER_H[1]} label={`tier ${i + 1} height`} onStep={(s) => update((d) => void (d.tiers[i].h = Math.min(TIER_H[1], Math.max(TIER_H[0], d.tiers[i].h + s))))} />
                              cm
                            </span>
                          </label>
                        </div>
                      </div>
                    ))}
                </div>
                <button
                  type="button"
                  className="btn"
                  disabled={n >= MAX_TIERS}
                  onClick={() =>
                    update((d) => {
                      d.tiers.push(suggestTier(d.tiers[d.tiers.length - 1]));
                    })
                  }
                >
                  + Add a tier on top
                </button>
              </Sec>

              <Sec label="Stand">
                <div className="flex flex-wrap gap-1">
                  {Object.entries(STANDS).map(([k, l]) => (
                    <button key={k} type="button" className={`chip ${cake.stand === k ? 'on' : ''}`} aria-pressed={cake.stand === k} onClick={() => update((d) => void (d.stand = k as CakeDesign['stand']))}>
                      {l}
                    </button>
                  ))}
                </div>
              </Sec>
            </>
          )}

          {tab === 'finish' && (
            <>
              <Sec label="Apply to">{ScopePicker}</Sec>
              <Sec label="Finish">
                <div className="flex flex-col gap-1">
                  {Object.entries(FINISHES).map(([k, f]) => (
                    <button key={k} type="button" className={`fs-opt ${ref.finish === k ? 'on' : ''}`} aria-pressed={ref.finish === k} onClick={() => updateTiers((t) => void (t.finish = k as Finish))}>
                      <b>{f.n}</b>
                      <small>{f.note}</small>
                    </button>
                  ))}
                </div>
              </Sec>
              <Sec label="Icing colour" extra={CAKE_COLOURS[ref.c]?.[0]}>
                <CakeSwatches label="Icing colour" value={ref.c} onPick={(c) => updateTiers((t) => void (t.c = c))} />
              </Sec>
              {FINISHES[ref.finish].accent && (
                <Sec label={FINISHES[ref.finish].accent!} extra={CAKE_COLOURS[ref.a]?.[0]}>
                  <CakeSwatches label={FINISHES[ref.finish].accent!} value={ref.a} onPick={(c) => updateTiers((t) => void (t.a = c))} />
                </Sec>
              )}
            </>
          )}

          {tab === 'decorate' && (
            <>
              <Sec label="Border" hint="Piped or placed around the base of each tier.">
                {ScopePicker}
                <div className="flex flex-wrap gap-1">
                  {Object.entries(BORDERS).map(([k, l]) => (
                    <button key={k} type="button" className={`chip ${ref.border === k ? 'on' : ''}`} aria-pressed={ref.border === k} onClick={() => updateTiers((t) => void (t.border = k as Border))}>
                      {l}
                    </button>
                  ))}
                </div>
                {ref.border !== 'none' && ref.border !== 'dragees' && <CakeSwatches label="Border colour" value={ref.bc} onPick={(c) => updateTiers((t) => void (t.bc = c))} />}
              </Sec>

              <Sec label="Fresh flowers" extra={FLOWER_STYLES[cake.flowers.style].note}>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(FLOWER_STYLES).map(([k, f]) => (
                    <button key={k} type="button" className={`chip ${cake.flowers.style === k ? 'on' : ''}`} aria-pressed={cake.flowers.style === k} onClick={() => update((d) => void (d.flowers.style = k as CakeDesign['flowers']['style']))}>
                      {f.n}
                    </button>
                  ))}
                </div>
                {cake.flowers.style !== 'none' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      {cake.flowers.stems.map((st, i) => (
                        <div key={`${st.t}-${i}`} className="fs-row">
                          <StemThumb kind="flower" t={st.t} c={st.c} className="fs-th sm" />
                          <div className="min-w-0">
                            <div className="truncate text-[13px]">{FL[st.t]?.n}</div>
                            <button type="button" className="fs-colbtn" aria-expanded={pickerFor === i} onClick={() => setPickerFor(pickerFor === i ? null : i)}>
                              <i style={{ background: colourHex(st.c) }} />
                              {colourName(st.c)} ▾
                            </button>
                          </div>
                          <Stepper n={st.n} min={1} max={20} label={FL[st.t]?.n ?? st.t} onStep={(s) => update((d) => void (d.flowers.stems[i].n = Math.max(1, Math.min(20, d.flowers.stems[i].n + s))))} />
                          <button type="button" className="fs-x" aria-label={`Remove ${FL[st.t]?.n}`} onClick={() => update((d) => void d.flowers.stems.splice(i, 1))}>
                            ×
                          </button>
                          {pickerFor === i && (
                            <div className="fs-pop">
                              <div className="fs-cols">
                                {Object.entries(FCOL).map(([k, [nm, hx]]) => (
                                  <button key={k} type="button" title={nm} aria-label={nm} className={k === st.c ? 'on' : ''} style={{ background: hx }} onClick={() => update((d) => void (d.flowers.stems[i].c = k))} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <label className="check">
                      <input type="checkbox" checked={cake.flowers.greenery} onChange={(e) => update((d) => void (d.flowers.greenery = e.target.checked))} />
                      <span>Tuck in greenery</span>
                    </label>
                  </>
                )}
                <div className="lbl mt-1">Add a flower</div>
                <p className="fs-hint-text">Click to add stems in the style above, or drag a flower onto the cake to place it exactly.</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {['rose', 'spray', 'peony', 'ranunculus', 'anemone', 'dahlia', 'hydrangea', 'babys', 'lavender', 'orchid', 'protea', 'carnation', 'tulip', 'calla', 'berries', 'sunflower']
                    .filter((k) => FL[k])
                    .map((k) => {
                      const inCake = cake.flowers.stems.filter((s) => s.t === k).reduce((a, s) => a + s.n, 0);
                      return (
                        <button
                          key={k}
                          type="button"
                          className={`fs-add ${inCake ? 'in' : ''}`}
                          title="Click to add stems · drag onto the cake to place one exactly"
                          {...drag.bind(k, FL[k].n, colourHex(FL[k].c))}
                          onClick={() =>
                            update((d) => {
                              if (d.flowers.style === 'none') d.flowers.style = 'crescent';
                              const ex = d.flowers.stems.find((s) => s.t === k);
                              if (ex) ex.n = Math.min(20, ex.n + 2);
                              else if (d.flowers.stems.length < 8) d.flowers.stems.push({ t: k, c: FL[k].c, n: 3 });
                            })
                          }
                        >
                          <StemThumb kind="flower" t={k} c={FL[k].c} />
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate">{FL[k].n}</span>
                            <small className="tag">{inCake ? `On the cake · ${inCake}` : '+ Add'}</small>
                          </span>
                        </button>
                      );
                    })}
                </div>
                {placedCount > 0 && (
                  <>
                    <div className="lbl mt-1">Placed by hand · {placedCount}</div>
                    <div className="flex flex-col gap-1.5">
                      {cake.placed!.map((pl, i) => (
                        <div key={i} className={`fs-row ${selected === i ? 'sel' : ''}`} onClick={() => setSelected(i)}>
                          <StemThumb kind="flower" t={pl.t} c={pl.c} className="fs-th sm" />
                          <div className="min-w-0">
                            <div className="truncate text-[13px]">{FL[pl.t]?.n}</div>
                            <button type="button" className="fs-colbtn" aria-expanded={placedPicker === i} onClick={(e) => (e.stopPropagation(), setPlacedPicker(placedPicker === i ? null : i))}>
                              <i style={{ background: colourHex(pl.c) }} />
                              {colourName(pl.c)} ▾
                            </button>
                          </div>
                          <span />
                          <button type="button" className="fs-x" aria-label={`Remove the placed ${FL[pl.t]?.n.toLowerCase()}`} onClick={(e) => (e.stopPropagation(), removePlaced(i))}>
                            ×
                          </button>
                          {placedPicker === i && (
                            <div className="fs-pop">
                              <div className="fs-cols">
                                {Object.entries(FCOL).map(([k, [nm, hx]]) => (
                                  <button key={k} type="button" title={nm} aria-label={nm} className={k === pl.c ? 'on' : ''} style={{ background: hx }} onClick={() => update((d) => void (d.placed![i].c = k))} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <button type="button" className="link" onClick={() => (setSelected(null), update((d) => void delete d.placed))}>
                      Clear all placed blooms
                    </button>
                  </>
                )}
              </Sec>

              <Sec label="Extras">
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ['goldLeaf', 'Gold leaf'],
                      ['berries', 'Fresh berries'],
                      ['macarons', 'Macarons'],
                      ['sprinkles', 'Sprinkles'],
                    ] as Array<[keyof CakeDesign['extras'], string]>
                  ).map(([k, l]) => (
                    <button key={k} type="button" className={`chip ${cake.extras[k] ? 'on' : ''}`} aria-pressed={cake.extras[k]} onClick={() => update((d) => void (d.extras[k] = !d.extras[k]))}>
                      {cake.extras[k] ? '✓ ' : ''}
                      {l}
                    </button>
                  ))}
                </div>
              </Sec>
            </>
          )}

          {tab === 'topper' && (
            <>
              <Sec label="Topper">
                <div className="flex flex-wrap gap-1">
                  {Object.entries(TOPPERS).map(([k, l]) => (
                    <button key={k} type="button" className={`chip ${cake.topper.kind === k ? 'on' : ''}`} aria-pressed={cake.topper.kind === k} onClick={() => update((d) => void (d.topper.kind = k as CakeDesign['topper']['kind']))}>
                      {l}
                    </button>
                  ))}
                </div>
                {(cake.topper.kind === 'script' || cake.topper.kind === 'monogram') && (
                  <input
                    className="inp"
                    aria-label={cake.topper.kind === 'script' ? 'Topper words' : 'Monogram initials'}
                    placeholder={cake.topper.kind === 'script' ? 'e.g. Happily ever after' : 'e.g. A&J'}
                    maxLength={cake.topper.kind === 'monogram' ? 5 : 24}
                    value={cake.topper.text}
                    onChange={(e) => update((d) => void (d.topper.text = e.target.value))}
                  />
                )}
              </Sec>
              {cake.topper.kind !== 'none' && (
                <Sec label="Finish">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(METALS).map(([k, m]) => (
                      <button key={k} type="button" className={`fs-fin ${cake.topper.metal === k ? 'on' : ''}`} aria-pressed={cake.topper.metal === k} onClick={() => update((d) => void (d.topper.metal = k as CakeDesign['topper']['metal']))}>
                        <i style={{ background: `radial-gradient(circle at 35% 30%, #fff8, ${m.c})` }} />
                        {m.n}
                      </button>
                    ))}
                  </div>
                </Sec>
              )}
            </>
          )}
        </div>

        <footer className="fs-foot">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="opacity-80">
              Serves ~{serves} · {cakeHeightCm(cake)} cm · est. £{cakePrice(cake)}
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
              <button type="button" className="btn on" onClick={close}>
                Discard
              </button>
            </div>
          ) : confirm === 'delete' && editId ? (
            <div className="fs-confirm">
              <span>Delete this cake and its placed copies?</span>
              <button type="button" className="btn" autoFocus onClick={() => setConfirm(null)}>
                Keep it
              </button>
              <button type="button" className="btn on" onClick={() => deleteCake(editId)}>
                Delete
              </button>
            </div>
          ) : (
            <div className="fs-acts">
              <button type="button" className="btn" onClick={requestClose}>
                Cancel
              </button>
              <button type="button" className="btn" onClick={() => save(false)}>
                {editId ? 'Save changes' : 'Save to My Cakes'}
              </button>
              <button type="button" className="btn primary" onClick={() => save(true)}>
                Save &amp; place
              </button>
              {editId && (
                <button type="button" className="link col-span-3 justify-self-start" onClick={() => setConfirm('delete')}>
                  Delete cake
                </button>
              )}
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}
