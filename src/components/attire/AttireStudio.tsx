import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { CLOTHS, palOf } from '../../engine/studio';
import { VENUES } from '../../engine/venues.gen';
import { envFor } from '../../lib/environment';
import { downloadUrl } from '../../lib/capture';
import { useDesignStore } from '../../store/designStore';
import { drawBoard, type BoardCtx } from '../../attire/draw';
import {
  FABRICS,
  FASHION,
  GARMENTS,
  HARMONY,
  SCHEMES,
  blendsWith,
  colourName,
  defaultAttire,
  harmony,
  newRole,
  schemeColours,
  type AttirePlan,
  type Fabric,
  type Garment,
  type Scheme,
} from '../../attire/model';
import { FOILS, PAPERS } from '../../stationery/model';
import { loadStationeryFonts, paperFontsVersion, subscribePaper } from '../../stationery/paperArt';
import { Sec, Stepper } from '../studio3d/ui';
import { histReducer } from '../studio3d/state';

/*
 * Attire & colour board: the wedding party's outfits against the event palette, with a harmony check and a
 * shareable board for shops and tailors.
 */

type Tab = 'party' | 'colours' | 'board';

function Board({ ctx, fonts }: { ctx: BoardCtx; fonts: number }) {
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
      drawBoard(x, w, h, ctx);
    }, 40);
    return () => clearTimeout(id);
  }, [ctx, size, fonts]);
  return (
    <div ref={host} className="at-board">
      <canvas ref={cv} style={{ width: '100%', height: '100%', display: 'block' }} role="img" aria-label="Colour board: the wedding party in their outfits beside the palette" />
    </div>
  );
}

export function AttireStudio() {
  const close = useDesignStore((s) => s.closeOverlay);
  const saveAttire = useDesignStore((s) => s.saveAttire);
  const design = useDesignStore((s) => s.design);
  const fonts = useSyncExternalStore(subscribePaper, paperFontsVersion);
  const pal = useMemo(() => palOf(design.palette, design.customPalette), [design.palette, design.customPalette]);
  const [initial] = useState<AttirePlan>(() => structuredClone(useDesignStore.getState().design.attire ?? defaultAttire(pal.b)));
  const [hist, dispatch] = useReducer(histReducer<AttirePlan>, { past: [], now: initial, future: [] });
  const plan = hist.now;
  const [tab, setTab] = useState<Tab>('party');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    void loadStationeryFonts();
  }, []);

  const venue = VENUES[design.venue];
  const linen = design.table.cloth === 'custom' ? design.table.customCloth : (design.table.cloth && CLOTHS[design.table.cloth]?.c) || venue?.cloth || '#efe8da';
  const st = design.stationery;
  const ctx: BoardCtx = useMemo(
    () => ({
      plan,
      pal,
      sky: envFor(venue, design.time, design.wx).sky,
      linen: typeof linen === 'string' ? linen : '#efe8da',
      ...(st ? { paper: { c: PAPERS[st.paper].c, n: PAPERS[st.paper].n } } : {}),
      ...(st && st.foil !== 'none' ? { foil: { stops: FOILS[st.foil].stops, n: FOILS[st.foil].n } } : {}),
      title: `${st?.wording.names ?? 'Our wedding'} · ${venue?.name ?? ''}`,
    }),
    [plan, pal, venue, design.time, design.wx, linen, st],
  );

  const update = useCallback(
    (fn: (p: AttirePlan) => void) => {
      const n = structuredClone(hist.now);
      fn(n);
      dispatch({ t: 'set', d: n });
    },
    [hist.now],
  );
  const applyScheme = (s: Scheme) =>
    update((p) => {
      p.scheme = s;
      // Schemes colour the dressed groups (count > 1); the couple and the suits keep their own.
      for (const r of p.roles) if (r.count > 1 && ['dress', 'midi', 'jumpsuit', 'gown'].includes(r.garment)) r.colours = schemeColours(s, pal.b, r.count, r.colours[0]);
    });

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

  const people = plan.roles.reduce((a, r) => a + r.count, 0);
  const backdropHex = plan.backdrop === 'venue' ? ctx.sky[1] : plan.backdrop === 'linen' ? ctx.linen : '#f3eee6';

  function exportPng() {
    const c = document.createElement('canvas');
    c.width = 2400;
    c.height = 1500;
    drawBoard(c.getContext('2d')!, 2400, 1500, ctx);
    downloadUrl(c.toDataURL('image/png'), 'colour-board.png');
  }

  return (
    <div className="fs-root st-root" role="dialog" aria-label="Attire and colour board">
      <div className="fs-view mu-view">
        <div className="fs-top mu-top">
          <div className="lbl">Attire &amp; colour · {SCHEMES[plan.scheme].n}</div>
          <div className="serif fs-name mn-title">The wedding party</div>
          <div className="fs-sub">
            {people} people · {plan.roles.length} roles · {pal.name} palette
          </div>
        </div>
        <div className="mu-body">
          <Board ctx={ctx} fonts={fonts} />
        </div>
      </div>

      <aside className="fs-side glass">
        <div className="fs-tabs" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }} role="tablist">
          {(
            [
              ['party', 'Party'],
              ['colours', 'Colours'],
              ['board', 'Board'],
            ] as Array<[Tab, string]>
          ).map(([t, l]) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
              {l}
            </button>
          ))}
        </div>
        <div className="fs-scroll scroll">
          {tab === 'party' && (
            <Sec label="Who’s in the party" hint="Each role’s garment, fabric and colour. Groups can wear one colour or one each.">
              <div className="flex flex-col gap-2">
                {plan.roles.map((r, i) => (
                  <div key={r.id} className="mn-course">
                    <div className="flex items-center gap-1.5">
                      <input className="inp mn-cname" aria-label="Role" value={r.role} onChange={(e) => update((p) => void (p.roles[i].role = e.target.value))} />
                      <Stepper n={r.count} min={1} max={12} label={r.role.toLowerCase()} onStep={(s) => update((p) => void (p.roles[i].count = Math.max(1, Math.min(12, p.roles[i].count + s))))} />
                      <button type="button" className="fs-x" aria-label={`Remove ${r.role}`} onClick={() => update((p) => void p.roles.splice(i, 1))}>
                        ×
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <select className="inp mn-select" aria-label="Garment" value={r.garment} onChange={(e) => update((p) => void (p.roles[i].garment = e.target.value as Garment))}>
                        {(Object.keys(GARMENTS) as Garment[]).map((g) => (
                          <option key={g} value={g}>
                            {GARMENTS[g]}
                          </option>
                        ))}
                      </select>
                      <select className="inp mn-select" aria-label="Fabric" value={r.fabric} onChange={(e) => update((p) => void (p.roles[i].fabric = e.target.value as Fabric))}>
                        {(Object.keys(FABRICS) as Fabric[]).map((f) => (
                          <option key={f} value={f}>
                            {FABRICS[f]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="at-swatches" role="radiogroup" aria-label={`${r.role} colour`}>
                      {[...new Set([...pal.b, pal.g, ...FASHION.slice(0, 14)])].map((c) => (
                        <button key={c} type="button" role="radio" aria-checked={r.colours.length === 1 && r.colours[0] === c} title={colourName(c)} aria-label={colourName(c)} className={r.colours.length === 1 && r.colours[0] === c ? 'on' : ''} style={{ background: c }} onClick={() => update((p) => void (p.roles[i].colours = [c]))} />
                      ))}
                      <label className="at-custom" title="Any colour">
                        <input type="color" aria-label={`${r.role}: any colour`} value={r.colours[0]} onChange={(e) => update((p) => void (p.roles[i].colours = [e.target.value]))} />
                      </label>
                    </div>
                    <small className="opacity-70">
                      {r.colours.length > 1 ? `${r.colours.length} shades: ${r.colours.map((c) => colourName(c).replace('≈ ', '')).join(', ')}` : colourName(r.colours[0])}
                    </small>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ['Maid of honour', 'dress', 1],
                      ['Best man', 'suit', 1],
                      ['Page boy', 'child', 1],
                      ['Mother of the bride', 'midi', 1],
                      ['Father of the groom', 'suit', 1],
                      ['Ushers', 'suit', 2],
                    ] as Array<[string, Garment, number]>
                  ).map(([role, g, n]) => (
                    <button key={role} type="button" className="chip" disabled={plan.roles.length >= 16} onClick={() => update((p) => void p.roles.push(newRole(role, g, n, g === 'suit' ? '#3a3a3e' : pal.b[2] ?? '#e8d6b3')))}>
                      + {role}
                    </button>
                  ))}
                </div>
              </div>
            </Sec>
          )}
          {tab === 'colours' && (
            <>
              <Sec label="Colour scheme" hint="Recolours the dressed groups from your palette; the couple and the suits keep their own.">
                <div className="mn-presets">
                  {(Object.keys(SCHEMES) as Scheme[]).map((k) => (
                    <button key={k} type="button" className={`fs-opt ${plan.scheme === k ? 'on' : ''}`} aria-pressed={plan.scheme === k} onClick={() => applyScheme(k)}>
                      <b>{SCHEMES[k].n}</b>
                      <small>{SCHEMES[k].note}</small>
                    </button>
                  ))}
                </div>
              </Sec>
              <Sec label="Harmony" hint={`How each outfit sits with the ${pal.name.toLowerCase()} palette, and whether it will disappear against the backdrop in photos.`}>
                <div className="mn-cover">
                  {plan.roles.flatMap((r) =>
                    [...new Set(r.colours)].map((c) => {
                      const h = harmony(c, [...pal.b, pal.g]);
                      const blend = blendsWith(c, backdropHex);
                      return (
                        <div key={r.id + c}>
                          <b>
                            <i className="mn-dot" style={{ background: c }} />
                            {r.role} · {colourName(c).replace('≈ ', '')}
                          </b>
                          <span>
                            <em className={h === 'apart' ? 'gap' : 'ok'}>{HARMONY[h]}</em>
                            {blend && <em className="gap">Blends into the backdrop</em>}
                          </span>
                        </div>
                      );
                    }),
                  )}
                </div>
              </Sec>
            </>
          )}
          {tab === 'board' && (
            <>
              <Sec label="Backdrop">
                <div className="seg three" role="radiogroup" aria-label="Backdrop">
                  {(
                    [
                      ['venue', 'Venue sky'],
                      ['linen', 'Table linen'],
                      ['plain', 'Plain'],
                    ] as const
                  ).map(([k, l]) => (
                    <button key={k} type="button" role="radio" aria-checked={plan.backdrop === k} className={plan.backdrop === k ? 'on' : ''} onClick={() => update((p) => void (p.backdrop = k))}>
                      {l}
                    </button>
                  ))}
                </div>
              </Sec>
              <Sec label="Notes for shops and tailors">
                <textarea className="inp st-area" rows={5} aria-label="Notes" placeholder="Fittings, hire references, sizes, where each outfit is from…" value={plan.notes} onChange={(e) => update((p) => void (p.notes = e.target.value))} />
              </Sec>
              <Sec label="Share it">
                <button type="button" className="btn primary" onClick={exportPng}>
                  Download the colour board
                </button>
              </Sec>
            </>
          )}
        </div>
        <footer className="fs-foot">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="opacity-80">
              {people} people · {SCHEMES[plan.scheme].n.toLowerCase()}
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
              <button type="button" className="btn primary" onClick={() => saveAttire(structuredClone(plan))}>
                Save to design
              </button>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}
