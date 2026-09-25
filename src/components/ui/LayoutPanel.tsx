import { useState } from 'react';
import { chairSpots, hasTbl } from '../../engine/studio';
import { ITEMS } from '../../engine/catalogue';
import { useDesignStore } from '../../store/designStore';
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
  const setMirror = useDesignStore((s) => s.setMirror);
  const setAllPlaces = useDesignStore((s) => s.setAllPlaces);
  const snapOn = useDesignStore((s) => s.snapOn);
  const setSnap = useDesignStore((s) => s.setSnap);
  // The slider shows its value live but only rebuilds the room when released.
  const [dragGuests, setDragGuests] = useState<number | null>(null);

  const m = design.table.mode;
  const seats = chairSpots(m, design.tables, design.guests).length;
  const guests = dragGuests ?? design.guests;
  const note = hasTbl(m)
    ? `${design.tables.length} table${design.tables.length > 1 ? 's' : ''} · ${seats} seats`
    : m === 'ceremony'
      ? `${seats} seats · ${Math.max(2, Math.ceil(design.guests / 8))} rows`
      : '';
  const commitGuests = () => {
    if (dragGuests !== null && dragGuests !== design.guests) setGuests(dragGuests);
    setDragGuests(null);
  };

  return (
    <section className="glass flex flex-col gap-2 p-3.5">
      <div className="lbl">Layout</div>
      <div className="seg">
        {LAYOUT_OPTS.map(([v, l]) => (
          <button key={v} type="button" className={m === v ? 'on' : ''} onClick={() => v !== m && setLayout(v)}>
            {l}
          </button>
        ))}
      </div>
      {m !== 'none' && (
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-[auto_1fr_28px] items-center gap-2.5 text-[12.5px]">
            <span>Guests</span>
            <input
              type="range"
              min={1}
              max={160}
              step={1}
              aria-label="Guests"
              value={guests}
              onChange={(e) => setDragGuests(Number(e.target.value))}
              onPointerUp={commitGuests}
              onKeyUp={commitGuests}
              onBlur={commitGuests}
            />
            <b className="text-right font-medium">{guests}</b>
          </div>
          {note && <div className="text-[11px] opacity-60">{note}</div>}
        </div>
      )}
      {hasTbl(m) && design.tables.length > 1 && (
        <label className="check">
          <input type="checkbox" checked={design.mirror} onChange={(e) => setMirror(e.target.checked)} />
          <span>Dress every table alike</span>
        </label>
      )}
      <label className="check">
        <input type="checkbox" checked={snapOn} onChange={(e) => setSnap(e.target.checked)} />
        <span>Snap to grid</span>
      </label>
      {hasTbl(m) && (
        <button type="button" className="btn primary" onClick={setAllPlaces}>
          Set a place at every chair
        </button>
      )}
      {hasTbl(m) && (
        <div className="text-[11px] leading-[1.4] opacity-60">
          Setting: {ITEMS[design.table.place]?.name ?? 'Classic'}. Pick another in Tableware to change it.
        </div>
      )}
    </section>
  );
}
