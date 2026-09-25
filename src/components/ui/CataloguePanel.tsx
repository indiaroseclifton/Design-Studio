import { useMemo } from 'react';
import { CATEGORIES, ITEM_LIST, ITEMS } from '../../data/catalogue';
import { ADDON_PACKS } from '../../data/addonPacks';
import { PALETTES, getPalette } from '../../data/palettes';
import { arrangementToItem } from '../../data/flowerStudio';
import { isStackable, useDesignStore } from '../../store/designStore';
import { useFlowerStudioStore } from '../../store/flowerStudioStore';
import { useTableLayout } from '../../lib/useTableLayout';
import { CatalogueCard } from './CatalogueCard';
import type { CatalogueItem } from '../../types';

function matchesSearch(item: CatalogueItem, q: string) {
  if (!q) return true;
  const s = q.toLowerCase();
  return item.name.toLowerCase().includes(s) || (item.kw ?? '').toLowerCase().includes(s);
}

export function CataloguePanel() {
  const design = useDesignStore((s) => s.design);
  const selection = useDesignStore((s) => s.selection);
  const search = useDesignStore((s) => s.search);
  const setSearch = useDesignStore((s) => s.setSearch);
  const activeCategory = useDesignStore((s) => s.activeCategory);
  const setCategory = useDesignStore((s) => s.setCategory);
  const placeItem = useDesignStore((s) => s.placeItem);
  const setPalette = useDesignStore((s) => s.setPalette);
  const select = useDesignStore((s) => s.select);
  const showToast = useDesignStore((s) => s.showToast);
  const showComingSoon = useDesignStore((s) => s.showComingSoon);
  const packsOn = useDesignStore((s) => s.packsOn);
  const openModal = useDesignStore((s) => s.openModal);
  const { tables } = useTableLayout();
  const customFlowers = useFlowerStudioStore((s) => s.customFlowers);
  const openFlowerStudio = useFlowerStudioStore((s) => s.open);

  const palette = getPalette(design.palette);
  const hostItem = selection?.k === 'item' ? design.items.find((i) => i.id === selection.id) : null;
  const hostDef = hostItem ? ITEMS[hostItem.type] : null;
  const decorating = Boolean(hostDef?.top);

  const availableItems = useMemo(() => {
    const base = ITEM_LIST.filter((it) => !it.addon || packsOn.includes(it.addon));
    const myFlowers = customFlowers.map(arrangementToItem);
    return [...base, ...myFlowers];
  }, [packsOn, customFlowers]);

  const categoryChips = useMemo(() => {
    const addonChips = ADDON_PACKS.filter((p) => packsOn.includes(p.id)).map((p) => ({ id: p.categoryId, label: p.categoryLabel, addon: true }));
    const myFlowersChip = customFlowers.length ? [{ id: 'myflowers', label: 'My Flowers', addon: false }] : [];
    return [...CATEGORIES.map((c) => ({ ...c, addon: false })), ...myFlowersChip, ...addonChips];
  }, [packsOn, customFlowers]);

  const filtered = useMemo(
    () => availableItems.filter((it) => (!activeCategory || it.cat === activeCategory) && matchesSearch(it, search)),
    [availableItems, activeCategory, search],
  );

  const sections = useMemo(() => {
    const map = new Map<string, CatalogueItem[]>();
    for (const it of filtered) {
      if (!map.has(it.sec)) map.set(it.sec, []);
      map.get(it.sec)!.push(it);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const cardIndex = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((it, i) => map.set(it.id, i));
    return map;
  }, [filtered]);

  const setTableChair = useDesignStore((s) => s.setTableChair);
  const currentChairType = design.table.chair?.type;

  function placeOnTable(typeId: string) {
    const table = tables[0];
    const count = design.items.filter((i) => !i.on && ITEMS[i.type]?.surf === 'table' && (i.t ?? 0) === table.index).length;
    const r = (table.kind === 'round' ? table.radius : Math.min(table.width, table.length) / 2) * 0.55;
    const a = count * 0.9;
    placeItem({ type: typeId, x: Math.cos(a) * r, z: Math.sin(a) * r, t: table.index });
  }

  function handlePlace(item: CatalogueItem) {
    if (item.resetChair) {
      setTableChair(undefined);
      showToast('Chairs match the venue again');
      return;
    }
    if (item.chairStyle) {
      setTableChair(item.chairStyle);
      showToast(`Chairs switched to ${item.name.toLowerCase()}`);
      return;
    }

    if (item.template) {
      if (!tables.length) {
        showToast('Choose a table layout first');
        return;
      }
      for (const id of item.template) placeOnTable(id);
      showToast(`${item.name} applied`);
      return;
    }

    if (decorating && hostItem && hostDef?.top) {
      if (!isStackable(item.id)) return;
      const siblings = design.items.filter((i) => i.on === hostItem.id).length;
      const maxR = hostDef.top.r ?? Math.min(hostDef.top.w ?? 0.2, hostDef.top.d ?? 0.2) / 2;
      const r = Math.min(maxR * 0.6, 0.1);
      const a = siblings * 1.3;
      placeItem({ type: item.id, x: Math.cos(a) * r, z: Math.sin(a) * r, on: hostItem.id });
      return;
    }

    if (item.surf === 'table') {
      if (!tables.length) {
        showToast('Choose a table layout first');
        return;
      }
      placeOnTable(item.id);
      return;
    }

    if (item.surf === 'floor') {
      const count = design.items.filter((i) => ITEMS[i.type]?.surf === 'floor').length;
      placeItem({ type: item.id, x: ((count % 5) - 2) * 0.9, z: 2.6 + Math.floor(count / 5) * 0.9 });
      return;
    }

    const count = design.items.filter((i) => ITEMS[i.type]?.surf === 'hang').length;
    placeItem({ type: item.id, x: ((count % 4) - 1.5) * 1.2, z: (Math.floor(count / 4) - 1) * 1.2 });
  }

  return (
    <aside className="glass fixed left-4 top-4 z-[3] flex w-[330px] flex-col overflow-hidden" style={{ bottom: 130 }}>
      <div className="flex flex-col gap-[9px] p-3.5 pb-2.5" style={{ borderBottom: '1px solid var(--hairline)' }}>
        <div className="flex items-baseline justify-between gap-2.5">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="serif text-[28px] leading-none">Catalogue</h2>
            <span className="lbl">{filtered.length} pieces</span>
          </div>
          <button type="button" className="btn shrink-0 whitespace-nowrap px-2.5 py-1.5" onClick={() => openFlowerStudio()}>
            Flower Studio
          </button>
        </div>
        <input
          className="inp"
          placeholder="Search — chiavari, arch, menorah, lace…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          <button type="button" className={`chip ${!activeCategory ? 'on' : ''}`} onClick={() => setCategory(null)}>
            All
          </button>
          {categoryChips.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip ${c.addon ? 'addon' : ''} ${activeCategory === c.id ? 'on' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
          <button type="button" className="chip addon" onClick={() => openModal('addons')}>
            ＋ More packs
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`chip flex shrink-0 items-center gap-1.5 ${design.palette === p.id ? 'on' : ''}`}
                onClick={() => setPalette(p.id)}
              >
                <span className="flex pl-0.5">
                  {p.b.slice(0, 3).map((c, i) => (
                    <i key={i} className="h-2.5 w-2.5 rounded-full border border-black/30" style={{ background: c, marginLeft: i ? -4 : 0 }} />
                  ))}
                </span>
                {p.name}
              </button>
            ))}
          </div>
          <button type="button" className="link shrink-0 whitespace-nowrap" onClick={() => showComingSoon('Custom palette editor')}>
            Edit custom
          </button>
        </div>
      </div>

      {decorating && hostItem && (
        <div
          className="mx-3.5 mb-2 mt-0.5 flex items-center justify-between gap-2.5 rounded-[9px] p-[9px_11px] text-[12px] leading-[1.4]"
          style={{ background: 'rgba(232,196,140,.1)', border: '1px solid rgba(232,196,140,.28)' }}
        >
          <span>
            Decorating <b className="font-semibold">{ITEMS[hostItem.type].name}</b> — tap tabletop pieces to set them on top.
          </span>
          <button type="button" className="link shrink-0" onClick={() => select(null)}>
            Done
          </button>
        </div>
      )}

      <div className="scroll flex-1 overflow-auto p-1 px-3.5 pb-3.5">
        {sections.length === 0 && <div className="px-1 py-5 text-[13px] opacity-60">No pieces match your search.</div>}
        {sections.map(([sec, items]) => (
          <div key={sec}>
            <div className="lbl mb-2 mt-3.5">{sec}</div>
            <div className="grid grid-cols-2 gap-2">
              {items.map((item) => {
                const disabled = decorating ? !isStackable(item.id) : item.surf === 'table' && !tables.length;
                const selected = item.chairStyle
                  ? currentChairType === item.chairStyle.type
                  : item.resetChair
                    ? !currentChairType
                    : false;
                return (
                  <CatalogueCard
                    key={item.id}
                    item={item}
                    palette={palette}
                    disabled={disabled}
                    selected={selected}
                    index={cardIndex.get(item.id)}
                    onClick={() => handlePlace(item)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
