import { useDesignStore } from '../../store/designStore';
import { useFlowerStudioStore } from '../../store/flowerStudioStore';
import { useTableLayout } from '../../lib/useTableLayout';
import { ITEMS } from '../../data/catalogue';
import {
  FLOWER_PRESETS,
  FLOWER_TYPES,
  FINISHES,
  GREENERY_TYPES,
  SHAPES,
  VESSELS,
  stemCount,
} from '../../data/flowerStudio';
import { captureFlowerThumbnail, captureGreeneryThumbnail } from '../../three/thumbnail';

const SWATCHES = ['#f2bcc0', '#e2506a', '#f7d9a0', '#f3d9a4', '#fbfaf6', '#9ec9d9', '#c9a25a', '#8a2a4a'];

export function FlowerStudioPanel() {
  const draft = useFlowerStudioStore((s) => s.draft);
  const setVessel = useFlowerStudioStore((s) => s.setVessel);
  const setFinish = useFlowerStudioStore((s) => s.setFinish);
  const setShape = useFlowerStudioStore((s) => s.setShape);
  const setSize = useFlowerStudioStore((s) => s.setSize);
  const applyPreset = useFlowerStudioStore((s) => s.applyPreset);
  const addStem = useFlowerStudioStore((s) => s.addStem);
  const removeStem = useFlowerStudioStore((s) => s.removeStem);
  const setStemCount = useFlowerStudioStore((s) => s.setStemCount);
  const setStemColor = useFlowerStudioStore((s) => s.setStemColor);
  const addGreenery = useFlowerStudioStore((s) => s.addGreenery);
  const removeGreenery = useFlowerStudioStore((s) => s.removeGreenery);
  const setGreeneryCount = useFlowerStudioStore((s) => s.setGreeneryCount);
  const shuffle = useFlowerStudioStore((s) => s.shuffle);
  const saveDraft = useFlowerStudioStore((s) => s.saveDraft);
  const close = useFlowerStudioStore((s) => s.close);

  const design = useDesignStore((s) => s.design);
  const placeItem = useDesignStore((s) => s.placeItem);
  const showToast = useDesignStore((s) => s.showToast);
  const { tables } = useTableLayout();

  if (!draft) return null;

  const availableFlowers = FLOWER_TYPES.filter((f) => !draft.stems.some((s) => s.type === f.id));
  const availableGreens = GREENERY_TYPES.filter((g) => !draft.greenery.some((entry) => entry.type === g.id));

  function handleSaveToCatalogue() {
    saveDraft();
    showToast('Saved to My Flowers');
    close();
  }

  function handleSaveAndPlace() {
    const id = saveDraft();
    if (!tables.length) {
      showToast('Saved — choose a table layout to place it');
      close();
      return;
    }
    const table = tables[0];
    const count = design.items.filter((i) => !i.on && ITEMS[i.type]?.surf === 'table' && (i.t ?? 0) === table.index).length;
    const r = (table.kind === 'round' ? table.radius : Math.min(table.width, table.length) / 2) * 0.55;
    const a = count * 0.9;
    placeItem({ type: id, x: Math.cos(a) * r, z: Math.sin(a) * r, t: table.index });
    showToast('Saved and placed on the table');
    close();
  }

  return (
    <aside className="fsSide scroll flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="fsSec flex flex-col gap-2">
        <div className="lbl">Start from</div>
        <div className="flex flex-wrap gap-1">
          {FLOWER_PRESETS.map((p) => (
            <button key={p.id} type="button" className="chip" onClick={() => applyPreset(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="fsSec flex flex-col gap-2">
        <div className="lbl">Vessel</div>
        <div className="flex flex-wrap gap-1">
          {VESSELS.map((v) => (
            <button key={v.id} type="button" className={`chip ${draft.vessel === v.id ? 'on' : ''}`} onClick={() => setVessel(v.id)}>
              {v.name}
            </button>
          ))}
        </div>
      </div>

      <div className="fsSec flex flex-col gap-2">
        <div className="lbl">Finish</div>
        <div className="flex flex-wrap gap-1">
          {FINISHES.map((f) => (
            <button key={f.id} type="button" className={`chip ${draft.finish === f.id ? 'on' : ''}`} onClick={() => setFinish(f.id)}>
              {f.name}
            </button>
          ))}
        </div>
      </div>

      <div className="fsSec flex flex-col gap-2">
        <div className="lbl">Shape</div>
        <div className="flex flex-wrap gap-1">
          {SHAPES.map((sh) => (
            <button key={sh.id} type="button" className={`chip ${draft.shape === sh.id ? 'on' : ''}`} onClick={() => setShape(sh.id)}>
              {sh.name}
            </button>
          ))}
        </div>
      </div>

      <div className="fsSec flex flex-col gap-2">
        <div className="lbl flex justify-between">
          <span>Size</span>
          <span>{draft.size.toFixed(2)}×</span>
        </div>
        <input type="range" min={0.6} max={1.6} step={0.05} value={draft.size} onChange={(e) => setSize(Number(e.target.value))} />
      </div>

      <div className="fsSec flex flex-col gap-2">
        <div className="lbl flex justify-between">
          <span>Flowers</span>
          <span>{stemCount(draft)}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {draft.stems.map((stem) => {
            const ft = FLOWER_TYPES.find((f) => f.id === stem.type);
            if (!ft) return null;
            const color = stem.color ?? ft.color;
            const thumb = captureFlowerThumbnail(color, ft.scale);
            return (
              <div key={stem.type} className="srow">
                <div className="sn">
                  <span className="th" style={{ backgroundImage: `url(${thumb})`, width: 40, height: 48 }} />
                  <span className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5">
                      <i style={{ background: color }} />
                      {ft.name}
                    </span>
                    <span className="cols">
                      {SWATCHES.map((c) => (
                        <button key={c} type="button" className={c === color ? 'on' : ''} style={{ background: c }} onClick={() => setStemColor(stem.type, c === ft.color ? undefined : c)} />
                      ))}
                    </span>
                  </span>
                </div>
                <div className="step">
                  <button type="button" onClick={() => setStemCount(stem.type, stem.n - 1)}>
                    −
                  </button>
                  <b>{stem.n}</b>
                  <button type="button" onClick={() => setStemCount(stem.type, stem.n + 1)}>
                    +
                  </button>
                </div>
                <button type="button" className="x" onClick={() => removeStem(stem.type)}>
                  ×
                </button>
              </div>
            );
          })}
        </div>
        {availableFlowers.length > 0 && (
          <>
            <div className="lbl mt-1">Add a flower</div>
            <div className="fgrid">
              {availableFlowers.map((f) => (
                <button key={f.id} type="button" className="fadd" onClick={() => addStem(f.id)}>
                  <i style={{ background: f.color }} />
                  {f.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="fsSec flex flex-col gap-2">
        <div className="lbl">Greenery</div>
        <div className="flex flex-col gap-1.5">
          {draft.greenery.map((entry) => {
            const gt = GREENERY_TYPES.find((g) => g.id === entry.type);
            if (!gt) return null;
            const thumb = captureGreeneryThumbnail(gt.color);
            return (
              <div key={entry.type} className="srow">
                <div className="sn">
                  <span className="th" style={{ backgroundImage: `url(${thumb})`, width: 40, height: 48 }} />
                  <span className="flex items-center gap-1.5">
                    <i style={{ background: gt.color }} />
                    {gt.name}
                  </span>
                </div>
                <div className="step">
                  <button type="button" onClick={() => setGreeneryCount(entry.type, entry.n - 1)}>
                    −
                  </button>
                  <b>{entry.n}</b>
                  <button type="button" onClick={() => setGreeneryCount(entry.type, entry.n + 1)}>
                    +
                  </button>
                </div>
                <button type="button" className="x" onClick={() => removeGreenery(entry.type)}>
                  ×
                </button>
              </div>
            );
          })}
        </div>
        {availableGreens.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {availableGreens.map((g) => (
              <button key={g.id} type="button" className="chip" onClick={() => addGreenery(g.id)}>
                + {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="fsActs">
        <button type="button" className="btn" onClick={shuffle}>
          Shuffle placement
        </button>
        <button type="button" className="btn" onClick={close}>
          Cancel
        </button>
        <button type="button" className="btn" onClick={handleSaveToCatalogue}>
          Save to catalogue
        </button>
        <button type="button" className="btn primary" onClick={handleSaveAndPlace}>
          Save &amp; place
        </button>
      </div>
    </aside>
  );
}
