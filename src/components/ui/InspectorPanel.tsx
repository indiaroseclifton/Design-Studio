import { ITEMS } from '../../data/catalogue';
import { PALETTES, getPalette } from '../../data/palettes';
import { useDesignStore } from '../../store/designStore';
import { useFlowerStudioStore } from '../../store/flowerStudioStore';

export function InspectorPanel() {
  const selection = useDesignStore((s) => s.selection);
  const design = useDesignStore((s) => s.design);
  const setItemColor = useDesignStore((s) => s.setItemColor);
  const setItemPalette = useDesignStore((s) => s.setItemPalette);
  const setItemText = useDesignStore((s) => s.setItemText);
  const rotateSelected = useDesignStore((s) => s.rotateSelected);
  const duplicateSelected = useDesignStore((s) => s.duplicateSelected);
  const removeSelected = useDesignStore((s) => s.removeSelected);
  const arrangeSelected = useDesignStore((s) => s.arrangeSelected);
  const select = useDesignStore((s) => s.select);
  const customFlowers = useFlowerStudioStore((s) => s.customFlowers);
  const openFlowerStudio = useFlowerStudioStore((s) => s.open);

  if (!selection) return null;

  if (selection.k === 'table') {
    return (
      <section className="glass flex flex-col gap-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="lbl">Table</div>
            <div className="serif text-[22px] leading-[1.1]">Table {selection.index + 1}</div>
          </div>
          <button type="button" className="px-1 text-[20px] leading-none opacity-60 hover:opacity-100" title="Deselect (Esc)" onClick={() => select(null)}>
            ×
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className="btn" title="Rotate table left (Q)" onClick={() => rotateSelected(-1)}>
            ↺ Rotate table
          </button>
          <button type="button" className="btn" title="Rotate table right (E)" onClick={() => rotateSelected(1)}>
            Rotate table ↻
          </button>
        </div>
      </section>
    );
  }

  if (selection.k === 'multi') {
    return (
      <section className="glass flex flex-col gap-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="lbl">Multiple pieces</div>
            <div className="serif mt-0.5 text-[22px] leading-[1.1]">{selection.ids.length} selected</div>
          </div>
          <button type="button" className="px-1 text-[20px] leading-none opacity-60 hover:opacity-100" title="Deselect (Esc)" onClick={() => select(null)}>
            ×
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className="btn" onClick={() => arrangeSelected('row')}>
            Line up
          </button>
          <button type="button" className="btn" onClick={() => arrangeSelected('circle')}>
            Circle
          </button>
          <button type="button" className="btn" onClick={() => arrangeSelected('face')}>
            Face centre
          </button>
          <button type="button" className="btn" title="Remove all (Delete)" onClick={removeSelected}>
            Remove all
          </button>
        </div>
      </section>
    );
  }

  if (selection.k !== 'item') return null;

  const item = design.items.find((i) => i.id === selection.id);
  if (!item) return null;
  const def = ITEMS[item.type];
  if (!def) return null;
  const palette = getPalette(item.pal ?? design.palette);

  return (
    <section className="glass flex flex-col gap-2 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="lbl">{def.sec}</div>
          <div className="serif mt-0.5 text-[22px] leading-[1.1]">{def.name}</div>
        </div>
        <button type="button" className="px-1 text-[20px] leading-none opacity-60 hover:opacity-100" title="Deselect (Esc)" onClick={() => select(null)}>
          ×
        </button>
      </div>

      {def.hasText && (
        <div>
          <div className="lbl mb-1.5">Text</div>
          <input className="inp" maxLength={40} value={item.text ?? ''} onChange={(e) => setItemText(item.id, e.target.value)} />
        </div>
      )}

      {def.pal !== false && (
        <div>
          <div className="lbl mb-1.5">Recolour</div>
          <div className="flex flex-wrap gap-1">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`chip ${(item.pal ?? design.palette) === p.id && !item.color ? 'on' : ''}`}
                onClick={() => {
                  setItemPalette(item.id, p.id);
                  setItemColor(item.id, undefined);
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
          <label className="check mt-2">
            <input type="color" value={item.color ?? palette.f} onChange={(e) => setItemColor(item.id, e.target.value)} />
            <span>Custom colour</span>
          </label>
        </div>
      )}

      <div className="grid grid-cols-[1fr_1fr_1.3fr_1.5fr] gap-1">
        <button type="button" className="btn" title="Rotate left (Q)" onClick={() => rotateSelected(-1)}>
          ↺
        </button>
        <button type="button" className="btn" title="Rotate right (E)" onClick={() => rotateSelected(1)}>
          ↻
        </button>
        <button type="button" className="btn" title="Duplicate (D)" onClick={duplicateSelected}>
          Copy
        </button>
        <button type="button" className="btn" title="Remove (Delete)" onClick={removeSelected}>
          Remove
        </button>
      </div>

      {def.arrangementId && (
        <button
          type="button"
          className="btn"
          onClick={() => {
            const arrangement = customFlowers.find((a) => a.id === def.arrangementId);
            if (arrangement) openFlowerStudio(arrangement);
          }}
        >
          Edit in Flower Studio
        </button>
      )}
    </section>
  );
}
