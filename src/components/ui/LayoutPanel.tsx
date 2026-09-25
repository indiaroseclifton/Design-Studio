import { useDesignStore } from '../../store/designStore';
import { useTableLayout } from '../../lib/useTableLayout';
import type { TableLayout } from '../../types';

const LAYOUT_OPTS: Array<[TableLayout, string]> = [
  ['round', 'Round'],
  ['banquet', 'Banquet'],
  ['ceremony', 'Ceremony'],
  ['none', 'Empty'],
];

export function LayoutPanel() {
  const design = useDesignStore((s) => s.design);
  const setLayout = useDesignStore((s) => s.setLayout);
  const setGuests = useDesignStore((s) => s.setGuests);
  const toggleMirror = useDesignStore((s) => s.toggleMirror);
  const placeItem = useDesignStore((s) => s.placeItem);
  const showToast = useDesignStore((s) => s.showToast);
  const { tables } = useTableLayout();

  function setPlaceAtEveryChair() {
    if (!tables.length) {
      showToast('Choose Round or Banquet layout first');
      return;
    }
    for (const table of tables) {
      const inset = (table.kind === 'round' ? table.radius : Math.min(table.width, table.length) / 2) - 0.18;
      for (const seat of table.seats) {
        const dist = Math.hypot(seat.x, seat.z) || 1;
        const scale = inset / dist;
        placeItem({ type: 'charger_gold', x: seat.x * scale, z: seat.z * scale, t: table.index });
      }
    }
    showToast('Set a place at every chair');
  }

  return (
    <section className="glass flex flex-col gap-2 p-3.5">
      <div className="lbl">Layout</div>
      <div className="seg">
        {LAYOUT_OPTS.map(([v, l]) => (
          <button key={v} type="button" className={design.table.layout === v ? 'on' : ''} onClick={() => setLayout(v)}>
            {l}
          </button>
        ))}
      </div>
      {design.table.layout !== 'none' && (
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-[auto_1fr_28px] items-center gap-2.5 text-[12.5px]">
            <span>Guests</span>
            <input
              type="range"
              min={1}
              max={160}
              step={1}
              value={design.table.guests}
              onChange={(e) => setGuests(Number(e.target.value))}
            />
            <b className="text-right font-medium">{design.table.guests}</b>
          </div>
          {tables.length > 0 && (
            <div className="text-[11px] opacity-60">
              {tables.length} table{tables.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
      {design.table.layout !== 'ceremony' && design.table.layout !== 'none' && (
        <label className="check">
          <input type="checkbox" checked={design.table.mirror} onChange={toggleMirror} />
          <span>Dress every table alike</span>
        </label>
      )}
      <button type="button" className="btn primary" onClick={setPlaceAtEveryChair} disabled={!tables.length}>
        Set a place at every chair
      </button>
    </section>
  );
}
