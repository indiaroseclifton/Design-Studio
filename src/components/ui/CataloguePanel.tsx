import { useCallback, useMemo, useState } from 'react';
import { CATL, CAT_ORDER, ITEMS, buildEntries, canStack, isPack, type Entry } from '../../engine/catalogue';
import { PALS, hasTbl, palOf } from '../../engine/studio';
import { selectedHost, useDesignStore } from '../../store/designStore';
import { CatalogueCard } from './CatalogueCard';
import { setThumbCustomPalette } from '../../three/thumbnail';

const PAL_LABELS = ['1', '2', '3', '4', '5'];

function PaletteEditor() {
  const custom = useDesignStore((s) => s.design.customPalette);
  const setCustomPalette = useDesignStore((s) => s.setCustomPalette);
  const fields: Array<[string, string, string]> = [...custom.b.map((c, i) => [`b${i}`, PAL_LABELS[i], c] as [string, string, string]), ['g', 'Foliage', custom.g], ['f', 'Fabric', custom.f]];
  return (
    <div className="flex flex-wrap gap-2 rounded-[9px] p-2" style={{ background: 'var(--well)' }}>
      {fields.map(([k, label, c]) => (
        <label key={k} className="flex flex-col items-center gap-1 text-[10px] opacity-80">
          <input
            type="color"
            value={c}
            aria-label={k.startsWith('b') ? `Bloom colour ${label}` : label}
            className="h-7 w-7 cursor-pointer rounded-[6px] border-0 bg-transparent p-0"
            onChange={(e) => {
              const v = e.target.value;
              const next = { ...custom, b: [...custom.b] };
              if (k.startsWith('b')) next.b[Number(k[1])] = v;
              else next[k as 'g' | 'f'] = v;
              setCustomPalette(next);
            }}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

export function CataloguePanel() {
  const design = useDesignStore((s) => s.design);
  const selection = useDesignStore((s) => s.selection);
  const search = useDesignStore((s) => s.search);
  const setSearch = useDesignStore((s) => s.setSearch);
  const cat = useDesignStore((s) => s.activeCategory);
  const setCategory = useDesignStore((s) => s.setCategory);
  const setPalette = useDesignStore((s) => s.setPalette);
  const activate = useDesignStore((s) => s.activate);
  const select = useDesignStore((s) => s.select);
  const packsOn = useDesignStore((s) => s.packsOn);
  const openModal = useDesignStore((s) => s.openModal);
  const openStudio = useDesignStore((s) => s.openStudio);
  const flowersVersion = useDesignStore((s) => s.flowersVersion);
  const cakesVersion = useDesignStore((s) => s.cakesVersion);
  const openCakeStudio = useDesignStore((s) => s.openCakeStudio);
  const [editPal, setEditPal] = useState(false);

  const packSet = useMemo(() => new Set(packsOn), [packsOn]);
  // flowersVersion: saved arrangements live in ITEMS, so re-list them when they change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entries = useMemo(() => buildEntries(packSet), [packSet, flowersVersion, cakesVersion]);
  const tabs = CAT_ORDER.filter((k) => !isPack(k) || packSet.has(k));
  const curCat = tabs.includes(cat) ? cat : 'templates';

  const q = search.trim().toLowerCase();
  const list = useMemo(
    () =>
      q
        ? entries.filter((e) => `${e.name} ${e.note ?? ''} ${e.kw ?? ''} ${CATL[e.cat]} ${e.sec}`.toLowerCase().includes(q))
        : entries.filter((e) => e.cat === curCat),
    [entries, q, curCat],
  );
  const sections = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of list) {
      const sec = q ? `${CATL[e.cat]} · ${e.sec}` : e.sec;
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(e);
    }
    return [...map];
  }, [list, q]);

  const m = design.table.mode;
  const host = selectedHost({ design, selection });
  const hasHost = design.items.some((i) => ITEMS[i.type]?.top);
  setThumbCustomPalette(design.customPalette);
  const pal = design.palette === 'custom' ? `custom:${design.customPalette.b.join('')}` : design.palette;

  const avail = (e: Entry) => {
    if (e.k === 'cloth' || e.k === 'overlay') return hasTbl(m);
    if (e.k === 'chair' || e.k === 'decor') return m !== 'none';
    if (e.k === 'item') {
      const d = ITEMS[e.id];
      return !!d && (d.surf !== 'table' || hasTbl(m) || (!d.lock && d.group !== 'place' && hasHost));
    }
    return true;
  };
  const active = (e: Entry) =>
    e.k === 'cloth'
      ? design.table.cloth === e.id
      : e.k === 'overlay'
        ? design.table.overlay === e.id
        : e.k === 'chair'
          ? design.table.chair === e.id
          : e.k === 'decor'
            ? design.table.decor === e.id
            : e.k === 'item' && ITEMS[e.id]?.group === 'place'
              ? design.table.place === e.id
              : false;

  const onActivate = useCallback((e: Entry) => activate(e), [activate]);
  const pieceCount = entries.filter((e) => e.k !== 'tpl').length;

  return (
    <aside className="glass chrome fixed left-4 top-4 z-[3] flex w-[330px] flex-col overflow-hidden max-[1100px]:w-[290px]" style={{ bottom: 130 }}>
      <div className="flex flex-col gap-[9px] p-3.5 pb-2.5" style={{ borderBottom: '1px solid var(--hairline)' }}>
        <div className="flex items-baseline justify-between gap-2.5">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="serif text-[28px] leading-none">Catalogue</h2>
            <span className="lbl">{q ? `${list.length} found` : `${pieceCount} pieces`}</span>
          </div>
          <button type="button" className="btn shrink-0 whitespace-nowrap px-2.5 py-1.5" onClick={() => openStudio()}>
            Flower Studio
          </button>
        </div>
        <input className="inp" placeholder="Search — chiavari, arch, menorah, lace…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="scroll flex max-h-[92px] flex-wrap gap-1 overflow-y-auto">
          {tabs.map((k) => (
            <button key={k} type="button" className={`chip ${isPack(k) ? 'addon' : ''} ${!q && curCat === k ? 'on' : ''}`} onClick={() => setCategory(k)}>
              {CATL[k]}
            </button>
          ))}
          <button type="button" className="chip addon" onClick={() => openModal('addons')}>
            ＋ Add-ons{packsOn.length ? ` · ${packsOn.length}` : ''}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="scroll flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5">
            {Object.entries(PALS).map(([k, p]) => {
              const shown = k === 'custom' ? palOf('custom', design.customPalette) : p;
              return (
                <button key={k} type="button" className={`chip flex shrink-0 items-center gap-1.5 ${design.palette === k ? 'on' : ''}`} onClick={() => setPalette(k)}>
                  <span className="flex pl-0.5">
                    {shown.b.slice(0, 4).map((c, i) => (
                      <i key={i} className="h-2.5 w-2.5 rounded-full border border-black/30" style={{ background: c, marginLeft: i ? -4 : 0 }} />
                    ))}
                  </span>
                  {p.name}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="link shrink-0 whitespace-nowrap"
            onClick={() => {
              setEditPal(!editPal);
              if (!editPal) setPalette('custom');
            }}
          >
            {editPal ? 'Done' : 'Edit custom'}
          </button>
        </div>
        {editPal && <PaletteEditor />}
      </div>

      {host && (
        <div
          className="mx-3.5 mb-1 mt-2 flex items-center justify-between gap-2.5 rounded-[9px] p-[9px_11px] text-[12px] leading-[1.4]"
          style={{ background: 'rgba(var(--acr),.1)', border: '1px solid rgba(var(--acr),.28)' }}
        >
          <span>
            Decorating <b className="font-semibold">{ITEMS[host.type].name}</b> — tap tabletop pieces, lanterns or small décor to set them on top.
          </span>
          <button type="button" className="link shrink-0" onClick={() => select(null)}>
            Done
          </button>
        </div>
      )}

      <div className="scroll flex-1 overflow-auto p-1 px-3.5 pb-3.5">
        {!q && curCat === 'mine' && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="card text-left" onClick={() => openStudio()}>
              <div className="th flex items-center justify-center text-[34px] font-light" style={{ color: 'var(--ac)' }}>
                +
              </div>
              <b>New arrangement</b>
              <small>Design a bouquet or centrepiece in the Flower Studio. It saves here, ready to place.</small>
            </button>
          </div>
        )}
        {!q && (curCat === 'mycakes' || curCat === 'desserts') && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="card text-left" onClick={() => openCakeStudio()}>
              <div className="th flex items-center justify-center text-[34px] font-light" style={{ color: 'var(--ac)' }}>
                +
              </div>
              <b>{curCat === 'mycakes' ? 'New cake' : 'Design your own cake'}</b>
              <small>Tiers, finishes, flowers and a topper in the Cake Studio. It saves to My Cakes, ready to place.</small>
            </button>
          </div>
        )}
        {sections.length === 0 && (q || (curCat !== 'mine' && curCat !== 'mycakes')) && <div className="px-1 py-5 text-[13px] opacity-60">Nothing matches that search.</div>}
        {sections.map(([sec, items]) => (
          <div key={sec}>
            <div className="lbl mb-2 mt-3.5">{sec}</div>
            <div className="grid grid-cols-2 gap-2">
              {items.map((e) => (
                <CatalogueCard
                  key={e.key}
                  entry={e}
                  pal={pal}
                  chair={design.table.chair}
                  active={active(e)}
                  disabled={!avail(e)}
                  dim={!!host && (e.k !== 'item' || !canStack(ITEMS[e.id]))}
                  onActivate={onActivate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
