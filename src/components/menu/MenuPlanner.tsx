import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { palOf } from '../../engine/studio';
import { useDesignStore } from '../../store/designStore';
import { drawFlatLay, pieceCanvas, type DrawCtx } from '../../stationery/draw';
import { drawCtxFor } from '../../stationery/ctx';
import { defaultSuite } from '../../stationery/model';
import { loadStationeryFonts, paperFontsVersion, subscribePaper } from '../../stationery/paperArt';
import {
  BAR_STYLES,
  COCKTAILS,
  DIETS,
  DIET_ORDER,
  GLASSES,
  MENU_PRESETS,
  SERVICES,
  defaultPlan,
  dietGaps,
  drinkQuantities,
  menuCosts,
  namedSignatures,
  type BarStyle,
  type Cocktail,
  type Course,
  type Diet,
  type Glass,
  type MenuPlan,
  type Service,
} from '../../menu/model';
import { Sec, Stepper } from '../studio3d/ui';
import { histReducer } from '../studio3d/state';

/*
 * Menu & Bar planner: courses and options with dietary tags, the bar and its signature drinks, dietary
 * coverage for the guest list, the drinks order and the catering cost. The preview shows the menu, bar
 * menu and reply card as they'll print in the design's stationery.
 */

type Tab = 'menu' | 'bar' | 'guests' | 'costs';
const WELCOMES = ['Champagne on arrival', 'Prosecco & elderflower', 'Aperol Spritz', 'Pimm’s cup', 'Mulled wine', 'Lemonade & iced tea'];

function Preview({ ctx, fonts }: { ctx: DrawCtx; fonts: number }) {
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
      const top = Math.min(150, h * 0.2),
        bottom = 90;
      const area = { x: w * 0.04, y: top, w: w * 0.92, h: Math.max(100, h - top - bottom) };
      drawFlatLay(x, w, h, ctx, [], '', area);
      // Menu (DL), bar menu (A4) and reply card, side by side at one scale.
      const mm = 99 + 210 + 127 + 40;
      const k = Math.min(area.w / mm, area.h / 297);
      const cards: Array<[Parameters<typeof pieceCanvas>[0], number]> = [
        ['menu', -0.02],
        ['barmenu', 0.015],
        ['rsvp', -0.03],
      ];
      let cx = area.x + (area.w - mm * k) / 2;
      for (const [kind, r] of cards) {
        const cvs = pieceCanvas(kind, ctx, k, { shape: true });
        x.save();
        x.translate(cx + cvs.width / 2, area.y + area.h / 2);
        x.rotate(r);
        x.shadowColor = 'rgba(40,25,10,.38)';
        x.shadowBlur = 20;
        x.shadowOffsetY = 8;
        x.drawImage(cvs, -cvs.width / 2, -cvs.height / 2);
        x.restore();
        cx += cvs.width + 20 * k;
      }
    }, 60);
    return () => clearTimeout(id);
  }, [ctx, size, fonts]);
  return (
    <div ref={host} className="st-view">
      <canvas ref={cv} style={{ width: '100%', height: '100%', display: 'block' }} role="img" aria-label="The menu, bar menu and reply card as they will print" />
    </div>
  );
}

function DietTags({ value, onToggle }: { value: Diet[]; onToggle: (d: Diet) => void }) {
  return (
    <span className="mn-tags" role="group" aria-label="Dietary">
      {DIET_ORDER.map((d) => (
        <button key={d} type="button" title={DIETS[d].n} aria-pressed={value.includes(d)} className={value.includes(d) ? 'on' : ''} onClick={() => onToggle(d)}>
          {DIETS[d].short}
        </button>
      ))}
    </span>
  );
}

const glassDot = (c: Cocktail) => <i className="mn-dot" style={{ background: c.colour }} aria-hidden />;

export function MenuPlanner() {
  const close = useDesignStore((s) => s.closeOverlay);
  const saveMenu = useDesignStore((s) => s.saveMenu);
  const design = useDesignStore((s) => s.design);
  const fonts = useSyncExternalStore(subscribePaper, paperFontsVersion);
  const [initial] = useState<MenuPlan>(() => structuredClone(useDesignStore.getState().design.menu ?? defaultPlan()));
  const [hist, dispatch] = useReducer(histReducer<MenuPlan>, { past: [], now: initial, future: [] });
  const plan = hist.now;
  const [tab, setTab] = useState<Tab>('menu');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    void loadStationeryFonts();
  }, []);

  const guests = design.guests;
  const pal = useMemo(() => palOf(design.palette, design.customPalette), [design.palette, design.customPalette]);
  // Preview in the design's stationery (or the default suite), with the bar menu shown.
  const ctx = useMemo(() => {
    const suite = structuredClone(design.stationery ?? defaultSuite());
    return drawCtxFor({ ...design, menu: plan }, suite);
  }, [design, plan]);

  const update = useCallback(
    (fn: (p: MenuPlan) => void) => {
      const n = structuredClone(hist.now);
      fn(n);
      dispatch({ t: 'set', d: n });
    },
    [hist.now],
  );
  const editCourse = (i: number, fn: (c: Course) => void) =>
    update((p) => {
      fn(p.courses[i]);
      p.preset = 'custom';
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

  const gaps = dietGaps(plan);
  const drinks = drinkQuantities(plan, guests);
  const cost = menuCosts(plan, guests);
  const named = namedSignatures(design.stationery?.wording.names ?? 'Olivia & James', pal.b);

  return (
    <div className="fs-root st-root" role="dialog" aria-label="Menu and bar planner">
      <div className="fs-view">
        <Preview ctx={ctx} fonts={fonts} />
        <div className="st-scrim" aria-hidden />
        <div className="fs-top">
          <div className="lbl">Menu &amp; Bar · {MENU_PRESETS[plan.preset]?.n ?? 'Your menu'}</div>
          <div className="serif fs-name mn-title">
            {SERVICES[plan.service].n} for {guests}
          </div>
          <div className="fs-sub">
            {plan.courses.length} courses · {BAR_STYLES[plan.bar.style].n.toLowerCase()} for {plan.bar.hours} hours · £{cost.foodPerHead + cost.drinksPerHead} a head
          </div>
        </div>
        {gaps.length > 0 && (
          <div className="mn-alert glass" role="status">
            {gaps.slice(0, 3).map((g, i) => (
              <span key={i}>
                No {DIETS[g.diet].n.toLowerCase()} option for {g.course.toLowerCase()}
              </span>
            ))}
            {gaps.length > 3 && <span>and {gaps.length - 3} more</span>}
          </div>
        )}
      </div>

      <aside className="fs-side glass">
        <div className="fs-tabs" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }} role="tablist">
          {(
            [
              ['menu', 'Menu'],
              ['bar', 'Bar'],
              ['guests', 'Dietary'],
              ['costs', 'Costs'],
            ] as Array<[Tab, string]>
          ).map(([t, l]) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
              {l}
            </button>
          ))}
        </div>

        <div className="fs-scroll scroll">
          {tab === 'menu' && (
            <>
              <Sec label="Start from a menu" hint="Replaces the courses; everything stays editable.">
                <div className="mn-presets">
                  {Object.entries(MENU_PRESETS).map(([k, p]) => (
                    <button
                      key={k}
                      type="button"
                      className={`fs-opt ${plan.preset === k ? 'on' : ''}`}
                      aria-pressed={plan.preset === k}
                      onClick={() =>
                        update((d) => {
                          d.preset = k;
                          d.courses = p.courses();
                          d.service = p.service;
                          d.foodPerHead = p.price;
                        })
                      }
                    >
                      <b>{p.n}</b>
                      <small>
                        {p.note} · from £{p.price}
                      </small>
                    </button>
                  ))}
                </div>
              </Sec>
              <Sec label="Service">
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(SERVICES) as Service[]).map((k) => (
                    <button key={k} type="button" className={`chip ${plan.service === k ? 'on' : ''}`} aria-pressed={plan.service === k} title={SERVICES[k].note} onClick={() => update((d) => void (d.service = k))}>
                      {SERVICES[k].n}
                    </button>
                  ))}
                </div>
                <p className="fs-hint-text">{SERVICES[plan.service].note}.</p>
              </Sec>
              <Sec label="Courses" hint="Tag each dish so the planner can check every guest has something. “Guests choose” puts the options on the reply card.">
                <div className="flex flex-col gap-2">
                  {plan.courses.map((c, i) => (
                    <div key={c.id} className="mn-course">
                      <div className="flex items-center gap-1.5">
                        <input className="inp mn-cname" aria-label="Course name" value={c.course} onChange={(e) => editCourse(i, (cc) => void (cc.course = e.target.value))} />
                        <button type="button" className="fs-x" aria-label={`Move ${c.course} up`} disabled={i === 0} onClick={() => update((p) => void p.courses.splice(i - 1, 0, ...p.courses.splice(i, 1)))}>
                          ↑
                        </button>
                        <button type="button" className="fs-x" aria-label={`Remove ${c.course}`} onClick={() => update((p) => void p.courses.splice(i, 1))}>
                          ×
                        </button>
                      </div>
                      <label className="flex items-center gap-2 text-[12px] opacity-85">
                        <input type="checkbox" checked={c.choice} onChange={(e) => editCourse(i, (cc) => void (cc.choice = e.target.checked))} /> Guests choose one in advance
                      </label>
                      {c.options.map((o, j) => (
                        <div key={j} className="mn-dish">
                          <div className="flex items-center gap-1">
                            <input className="inp" aria-label="Dish" value={o.dish} placeholder="Dish" onChange={(e) => editCourse(i, (cc) => void (cc.options[j].dish = e.target.value))} />
                            <button type="button" className="fs-x" aria-label={`Remove ${o.dish || 'dish'}`} onClick={() => editCourse(i, (cc) => void cc.options.splice(j, 1))}>
                              ×
                            </button>
                          </div>
                          <input className="inp mn-desc" aria-label="Description" value={o.desc} placeholder="Description" onChange={(e) => editCourse(i, (cc) => void (cc.options[j].desc = e.target.value))} />
                          <DietTags value={o.diets} onToggle={(dt) => editCourse(i, (cc) => void (cc.options[j].diets = cc.options[j].diets.includes(dt) ? cc.options[j].diets.filter((x) => x !== dt) : [...cc.options[j].diets, dt]))} />
                        </div>
                      ))}
                      <button type="button" className="link self-start" onClick={() => editCourse(i, (cc) => void cc.options.push({ dish: '', desc: '', diets: [] }))} disabled={c.options.length >= 8}>
                        + Add an option
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn" disabled={plan.courses.length >= 8} onClick={() => update((p) => void p.courses.push({ id: `c${Date.now().toString(36)}`, course: 'New course', choice: false, options: [{ dish: '', desc: '', diets: [] }] }))}>
                    + Add a course
                  </button>
                </div>
              </Sec>
            </>
          )}

          {tab === 'bar' && (
            <>
              <Sec label="The bar">
                <div className="flex flex-col gap-1">
                  {(Object.keys(BAR_STYLES) as BarStyle[]).map((k) => (
                    <button key={k} type="button" className={`fs-opt ${plan.bar.style === k ? 'on' : ''}`} aria-pressed={plan.bar.style === k} onClick={() => update((d) => void (d.bar.style = k))}>
                      <b>{BAR_STYLES[k].n}</b>
                      <small>{BAR_STYLES[k].note}</small>
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span>Hours of service</span>
                  <Stepper n={plan.bar.hours} min={1} max={12} label="hours" onStep={(s) => update((d) => void (d.bar.hours = Math.max(1, Math.min(12, d.bar.hours + s))))} />
                </div>
                <label className="flex items-center gap-2 text-[12.5px]">
                  <input type="checkbox" checked={plan.bar.toast} onChange={(e) => update((d) => void (d.bar.toast = e.target.checked))} /> A glass of fizz for the toast
                </label>
              </Sec>
              <Sec label="Welcome drink">
                <input className="inp" aria-label="Welcome drink" value={plan.bar.welcome} onChange={(e) => update((d) => void (d.bar.welcome = e.target.value))} />
                <div className="flex flex-wrap gap-1">
                  {WELCOMES.map((w) => (
                    <button key={w} type="button" className={`chip ${plan.bar.welcome === w ? 'on' : ''}`} onClick={() => update((d) => void (d.bar.welcome = w))}>
                      {w}
                    </button>
                  ))}
                </div>
              </Sec>
              <Sec label="Signature drinks" extra={`${plan.bar.signatures.length} of 6`} hint="They print on the bar menu in your stationery.">
                <div className="flex flex-col gap-1.5">
                  {plan.bar.signatures.map((c, i) => (
                    <div key={i} className="mn-sig">
                      {glassDot(c)}
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <input className="inp" aria-label="Drink name" value={c.name} onChange={(e) => update((d) => void (d.bar.signatures[i].name = e.target.value))} />
                        <input className="inp mn-desc" aria-label="What's in it" value={c.desc} onChange={(e) => update((d) => void (d.bar.signatures[i].desc = e.target.value))} />
                        <div className="flex items-center gap-1.5">
                          <select className="inp mn-select" aria-label="Glass" value={c.glass} onChange={(e) => update((d) => void (d.bar.signatures[i].glass = e.target.value as Glass))}>
                            {(Object.keys(GLASSES) as Glass[]).map((g) => (
                              <option key={g} value={g}>
                                {GLASSES[g]}
                              </option>
                            ))}
                          </select>
                          {[...new Set([c.colour, ...pal.b])].slice(0, 6).map((col) => (
                            <button key={col} type="button" className={`mn-swatch ${c.colour === col ? 'on' : ''}`} aria-label={`Colour ${col}`} style={{ background: col }} onClick={() => update((d) => void (d.bar.signatures[i].colour = col))} />
                          ))}
                        </div>
                      </div>
                      <button type="button" className="fs-x" aria-label={`Remove ${c.name}`} onClick={() => update((d) => void d.bar.signatures.splice(i, 1))}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {named.length > 0 && (
                  <button type="button" className="btn" disabled={plan.bar.signatures.length >= 5} onClick={() => update((d) => void d.bar.signatures.push(...named.filter((n) => !d.bar.signatures.some((s) => s.name === n.name)).slice(0, 6 - d.bar.signatures.length)))}>
                    Name two drinks after you
                  </button>
                )}
                <div className="mn-library" role="list" aria-label="Add a drink">
                  {COCKTAILS.filter((c) => !plan.bar.signatures.some((s) => s.name === c.name)).map((c) => (
                    <button key={c.name} type="button" role="listitem" className="chip" disabled={plan.bar.signatures.length >= 6} title={c.desc} onClick={() => update((d) => void d.bar.signatures.push({ ...c }))}>
                      {glassDot(c)}
                      {c.name}
                      {c.zero ? ' · 0%' : ''}
                    </button>
                  ))}
                </div>
              </Sec>
              <Sec label="Wine">
                {(['sparkling', 'white', 'red'] as const).map((k) => (
                  <label key={k} className="st-field">
                    <span className="capitalize">{k}</span>
                    <input className="inp" value={plan.bar.wine[k]} onChange={(e) => update((d) => void (d.bar.wine[k] = e.target.value))} />
                  </label>
                ))}
              </Sec>
              <Sec label="The drinks order" hint={`For ${guests} guests over ${plan.bar.hours} hours, using caterers’ rules of thumb.`}>
                <dl className="mn-order">
                  {(
                    [
                      ['Wine', `${drinks.wineBottles} bottles`],
                      ['Sparkling', `${drinks.sparklingBottles} bottles`],
                      ['Beer', `${drinks.beer} bottles`],
                      ['Spirits', `${drinks.spirits} × 70 cl`],
                      ['Soft drinks', `${drinks.softs} servings`],
                      ['Ice', `${drinks.iceKg} kg`],
                    ] as Array<[string, string]>
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </Sec>
            </>
          )}

          {tab === 'guests' && (
            <>
              <Sec label="Dietary requirements" hint="How many guests need each. The planner checks every course has something for them.">
                <div className="flex flex-col gap-1.5">
                  {DIET_ORDER.map((d) => (
                    <div key={d} className="flex items-center justify-between gap-2 text-[12.5px]">
                      <span>
                        {DIETS[d].n} <span className="opacity-60">({DIETS[d].short})</span>
                      </span>
                      <Stepper n={plan.dietary[d]} min={0} max={guests} label={DIETS[d].n.toLowerCase()} onStep={(s) => update((p) => void (p.dietary[d] = Math.max(0, Math.min(guests, p.dietary[d] + s))))} />
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span>Children</span>
                    <Stepper n={plan.children} min={0} max={guests} label="children" onStep={(s) => update((p) => void (p.children = Math.max(0, Math.min(guests, p.children + s))))} />
                  </div>
                </div>
              </Sec>
              <Sec label="Coverage">
                <div className="mn-cover">
                  {plan.courses.map((c) => (
                    <div key={c.id}>
                      <b>{c.course}</b>
                      <span>
                        {DIET_ORDER.filter((d) => plan.dietary[d] > 0).map((d) => {
                          const ok = !gaps.some((g) => g.diet === d && g.course === c.course);
                          return (
                            <em key={d} className={ok ? 'ok' : 'gap'} title={`${DIETS[d].n}: ${ok ? 'covered' : 'nothing suitable'}`}>
                              {DIETS[d].short} {ok ? '✓' : '!'}
                            </em>
                          );
                        })}
                        {DIET_ORDER.every((d) => !plan.dietary[d]) && <small>Add dietary needs above to check this course.</small>}
                      </span>
                    </div>
                  ))}
                </div>
              </Sec>
            </>
          )}

          {tab === 'costs' && (
            <>
              <Sec label="Food" hint={`Base price a head, before the ${SERVICES[plan.service].n.toLowerCase()} service adjustment.`}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span>£ a head</span>
                  <Stepper n={plan.foodPerHead} min={0} max={400} label="pounds" onStep={(s) => update((p) => void (p.foodPerHead = Math.max(0, p.foodPerHead + s * 2)))} />
                </div>
              </Sec>
              <Sec label="Estimate">
                <dl className="mn-order">
                  {(
                    [
                      [`Food · ${cost.adults} adults`, `£${cost.foodPerHead} a head`],
                      ...(plan.children ? ([[`Children’s menu · ${plan.children}`, `£${cost.kidsPerHead} a head`]] as Array<[string, string]>) : []),
                      [`Bar · ${BAR_STYLES[plan.bar.style].n}`, `£${cost.drinksPerHead} a head`],
                      ['Total', `£${cost.total.toLocaleString()}`],
                    ] as Array<[string, string]>
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="fs-hint-text">Saved plans add these lines to the Quote under Catering.</p>
              </Sec>
            </>
          )}
        </div>

        <footer className="fs-foot">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="opacity-80">
              {plan.courses.length} courses · £{(cost.foodPerHead + cost.drinksPerHead).toLocaleString()} a head · £{cost.total.toLocaleString()}
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
              <button type="button" className="btn primary" onClick={() => saveMenu(structuredClone(plan))}>
                Save to design
              </button>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}
