import { VENUES } from '../../data/venues';
import { useDesignStore } from '../../store/designStore';
import type { TimeOfDay, Weather } from '../../types';

const TIME_OPTS: Array<[TimeOfDay, string]> = [
  ['venue', 'Venue'],
  ['day', 'Day'],
  ['golden', 'Golden'],
  ['night', 'Night'],
];
const WX_OPTS: Array<[Weather, string]> = [
  ['clear', 'Clear'],
  ['rain', 'Rain'],
  ['snow', 'Snow'],
];

export function VenuePanel() {
  const design = useDesignStore((s) => s.design);
  const setTime = useDesignStore((s) => s.setTime);
  const setWeather = useDesignStore((s) => s.setWeather);
  const venue = VENUES[design.venue] ?? VENUES[0];

  return (
    <section className="glass flex flex-col gap-2 p-3.5">
      <div className="lbl">
        {design.venue + 1} / {VENUES.length}
      </div>
      <h1 className="serif text-[32px] leading-none">{venue.name}</h1>
      <div className="text-[12px] tracking-wide" style={{ color: 'var(--ac)' }}>
        {venue.sub}
      </div>
      <p className="text-[12.5px] leading-[1.5] opacity-80">{venue.desc}</p>
      <div className="seg">
        {TIME_OPTS.map(([v, l]) => (
          <button key={v} type="button" className={design.time === v ? 'on' : ''} onClick={() => setTime(v)}>
            {l}
          </button>
        ))}
      </div>
      {venue.indoor ? (
        <div className="text-[11px] leading-[1.4] opacity-60">Indoor venue — weather is outside.</div>
      ) : (
        <div className="seg three">
          {WX_OPTS.map(([v, l]) => (
            <button key={v} type="button" className={design.wx === v ? 'on' : ''} onClick={() => setWeather(v)}>
              {l}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
