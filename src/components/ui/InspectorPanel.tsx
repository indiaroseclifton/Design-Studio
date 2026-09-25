import { useState, type ReactNode } from 'react';
import { CATL, ITEMS, optDef, swapsFor } from '../../engine/catalogue';
import { CHAIRS, CLOTHS, DECOR, OVERLAYS, PALS, palOf } from '../../engine/studio';
import { arrange, linked, recolor, setOpt, swapItem } from '../../lib/designOps';
import { useDesignStore } from '../../store/designStore';
import type { Design, PlacedItem } from '../../types';
import { customIdOf } from '../../engine/flowers';

function Chips({ list, active, onPick }: { list: Array<[string, string]>; active: string | null | undefined; onPick: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {list.map(([id, name]) => (
        <button key={id} type="button" className={`chip ${id === active ? 'on' : ''}`} onClick={() => onPick(id)}>
          {name}
        </button>
      ))}
    </div>
  );
}

function PalChips({ active, onPick }: { active: string; onPick: (id: string) => void }) {
  const custom = useDesignStore((s) => s.design.customPalette);
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(PALS).map(([k, p]) => (
        <button key={k} type="button" className={`chip flex items-center gap-1.5 ${k === active ? 'on' : ''}`} onClick={() => onPick(k)}>
          <span className="flex">
            {(k === 'custom' ? palOf('custom', custom) : p).b.slice(0, 3).map((c, i) => (
              <i key={i} className="h-2.5 w-2.5 rounded-full border border-black/30" style={{ background: c, marginLeft: i ? -4 : 0 }} />
            ))}
          </span>
          {p.name}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="lbl mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function Header({ kind, name }: { kind: string; name: string }) {
  const select = useDesignStore((s) => s.select);
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="lbl">{kind}</div>
        <div className="serif mt-0.5 text-[22px] leading-[1.1]">{name}</div>
      </div>
      <button type="button" className="px-1 text-[20px] leading-none opacity-60 hover:opacity-100" title="Deselect (Esc)" onClick={() => select(null)}>
        ×
      </button>
    </div>
  );
}

export function InspectorPanel() {
  const selection = useDesignStore((s) => s.selection);
  const design = useDesignStore((s) => s.design);
  const edit = useDesignStore((s) => s.edit);
  const setTableCfg = useDesignStore((s) => s.setTableCfg);
  const rotateSelected = useDesignStore((s) => s.rotateSelected);
  const duplicateSelected = useDesignStore((s) => s.duplicateSelected);
  const removeSelected = useDesignStore((s) => s.removeSelected);
  const showToast = useDesignStore((s) => s.showToast);
  const beginGesture = useDesignStore((s) => s.beginGesture);
  const endGesture = useDesignStore((s) => s.endGesture);
  const live = useDesignStore((s) => s.live);
  const openStudio = useDesignStore((s) => s.openStudio);
  const [applyAll, setApplyAll] = useState(false);

  if (!selection) return null;
  const m = design.table.mode;

  if (selection.k === 'multi') {
    const run = (kind: 'row' | 'circle' | 'face') =>
      edit((d) => {
        if (!arrange(d, selection.ids, kind)) showToast('Arrange works on floor and hanging pieces');
      });
    return (
      <section className="glass flex flex-col gap-2 p-3.5">
        <Header kind="Multiple selection" name={`${selection.ids.length} pieces`} />
        <div className="text-[11.5px] opacity-70">Drag any selected piece to move them together. Shift-click adds or removes pieces.</div>
        <div className="grid grid-cols-3 gap-1">
          <button type="button" className="btn" onClick={() => run('row')}>
            Line up
          </button>
          <button type="button" className="btn" onClick={() => run('circle')}>
            Circle
          </button>
          <button type="button" className="btn" onClick={() => run('face')}>
            Face centre
          </button>
        </div>
        <button type="button" className="btn" onClick={removeSelected}>
          Remove all
        </button>
      </section>
    );
  }

  if (selection.k === 'chairs') {
    const n = design.tables.length;
    return (
      <section className="glass flex flex-col gap-2.5 p-3.5">
        <Header kind={m === 'ceremony' ? 'Ceremony chairs' : `Chairs · ${n} table${n > 1 ? 's' : ''}`} name={design.table.chair ? CHAIRS[design.table.chair].name : 'Venue default'} />
        <Field label="Chair style">
          <Chips list={Object.entries(CHAIRS).map(([k, x]) => [k, x.name])} active={design.table.chair} onPick={(k) => setTableCfg({ chair: k }, 'All chairs replaced')} />
        </Field>
        <Field label="Chair décor">
          <Chips
            list={Object.entries(DECOR).map(([k, x]) => [k, x.name])}
            active={design.table.decor}
            onPick={(k) => setTableCfg({ decor: k, decorPal: design.table.decorPal || design.palette }, k === 'none' ? 'Chair décor removed' : 'Décor added to all chairs')}
          />
        </Field>
        {design.table.decor !== 'none' && (
          <Field label="Décor colours">
            <PalChips active={design.table.decorPal} onPick={(k) => setTableCfg({ decorPal: k })} />
          </Field>
        )}
      </section>
    );
  }

  if (selection.k === 'table') {
    return (
      <section className="glass flex flex-col gap-2.5 p-3.5">
        <Header kind={`Table ${selection.idx + 1} · linen applies to all`} name={design.table.cloth ? CLOTHS[design.table.cloth].name : 'Venue default'} />
        <Field label="Tablecloth">
          <Chips list={Object.entries(CLOTHS).map(([k, x]) => [k, x.name])} active={design.table.cloth} onPick={(k) => setTableCfg({ cloth: k })} />
        </Field>
        <label className="check">
          <input type="color" value={design.table.customCloth} onChange={(e) => setTableCfg({ customCloth: e.target.value, cloth: 'custom' })} />
          <span>Custom cloth colour</span>
        </label>
        <Field label="Overlay">
          <Chips list={Object.entries(OVERLAYS).map(([k, x]) => [k, x.name])} active={design.table.overlay} onPick={(k) => setTableCfg({ overlay: k })} />
        </Field>
        <div className="grid grid-cols-2 gap-1">
          <button type="button" className="btn" title="Rotate table (Q)" onClick={() => rotateSelected(1)}>
            ↺ Rotate table
          </button>
          <button type="button" className="btn" title="Rotate table (E)" onClick={() => rotateSelected(-1)}>
            ↻ Rotate table
          </button>
        </div>
        <div className="text-[11px] leading-[1.4] opacity-60">In plan view, drag tables to rearrange the room.</div>
      </section>
    );
  }

  const item = design.items.find((i) => i.id === selection.id);
  if (!item) return null;
  const d = ITEMS[item.type];
  if (!d) return null;
  const mirrored = !!item.link && design.mirror && design.tables.length > 1;
  const vars = swapsFor(item.type);
  const matching = design.items.filter((i) => i.type === item.type).length;
  const showAll = matching > linked(design, item).length;
  const curOpts = { ...optDef(d), ...(item.o ?? {}) };
  const rotLocked = d.lock === 'aisle' || (d.lock === 'center' && m === 'banquet');
  const editItem = (fn: (dd: Design, it: PlacedItem) => void) =>
    edit((dd) => {
      const it = dd.items.find((i) => i.id === item.id);
      if (it) fn(dd, it);
    });

  return (
    <section className="glass flex flex-col gap-2.5 p-3.5">
      <Header kind={`${CATL[d.cat] ?? ''} · ${d.sec}${mirrored ? ' · on every table' : ''}`} name={d.name} />

      {vars.length > 1 && (
        <Field label="Swap for">
          <Chips list={vars} active={item.type} onPick={(k) => editItem((dd, it) => swapItem(dd, it, k, applyAll))} />
        </Field>
      )}
      {showAll && (
        <label className="check">
          <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} />
          <span>Apply to all {matching} matching pieces</span>
        </label>
      )}

      {d.opts &&
        Object.entries(d.opts).map(([k, op]) => (
          <Field key={k} label={op.l}>
            <Chips list={op.v} active={curOpts[k]} onPick={(v) => editItem((dd, it) => setOpt(dd, it, k, v))} />
          </Field>
        ))}

      {d.text && (
        <Field label={d.text.label}>
          <input
            className="inp"
            maxLength={40}
            placeholder={item.type === 'tablenum' ? String(item.t + 1) : d.text.def}
            value={item.text ?? ''}
            // One undo step per editing session rather than per keystroke.
            onFocus={beginGesture}
            onBlur={endGesture}
            onChange={(e) => {
              const v = e.target.value;
              live((dd) => {
                const it = dd.items.find((i) => i.id === item.id);
                if (it) it.text = v;
              });
            }}
          />
        </Field>
      )}

      {d.pal !== false && (
        <Field label="Colours">
          <PalChips active={item.pal} onPick={(k) => editItem((dd, it) => recolor(dd, it, k, applyAll))} />
        </Field>
      )}

      <div className="grid grid-cols-[1fr_1fr_1.3fr_1.5fr] gap-1">
        <button type="button" className="btn" title="Rotate left (Q)" disabled={rotLocked} onClick={() => rotateSelected(1)}>
          ↺
        </button>
        <button type="button" className="btn" title="Rotate right (E)" disabled={rotLocked} onClick={() => rotateSelected(-1)}>
          ↻
        </button>
        <button type="button" className="btn" title="Duplicate (D)" disabled={!!d.lock || !!d.single} onClick={duplicateSelected}>
          Copy
        </button>
        <button type="button" className="btn" title="Remove (Delete)" onClick={removeSelected}>
          Remove
        </button>
      </div>
      {customIdOf(item.type) && (
        <button type="button" className="btn" onClick={() => openStudio(customIdOf(item.type))}>
          ✿ Edit in Flower Studio
        </button>
      )}
      {d.top && <div className="text-[11px] leading-[1.4] opacity-60">While this is selected, catalogue pieces you click are set on top of it.</div>}
    </section>
  );
}
