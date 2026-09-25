import { VENUES } from '../../data/venues';
import { useDesignStore } from '../../store/designStore';

export function VenueStrip() {
  const venueIndex = useDesignStore((s) => s.design.venue);
  const setVenue = useDesignStore((s) => s.setVenue);

  return (
    <nav className="glass fixed bottom-4 left-4 right-4 z-[3] flex gap-2 overflow-x-auto p-2">
      {VENUES.map((v, i) => {
        const active = i === venueIndex;
        return (
          <button
            key={v.name}
            type="button"
            className="flex shrink-0 flex-col gap-1.5 rounded-[10px] p-1.5 pb-2 text-left transition-colors hover:bg-white/[0.07]"
            style={{
              flex: '1 0 118px',
              border: `1px solid ${active ? 'rgba(var(--acr),.7)' : 'transparent'}`,
              background: active ? 'rgba(var(--acr),.08)' : 'transparent',
            }}
            onClick={() => setVenue(i)}
          >
            <span className="block h-[34px] rounded-[6px]" style={{ background: `linear-gradient(135deg, ${v.env.sky[0]}, ${v.env.sky[1]})` }} />
            <span className="lbl">{String(i + 1).padStart(2, '0')}</span>
            <span className="serif text-[16px] leading-[1.05]">{v.name}</span>
          </button>
        );
      })}
    </nav>
  );
}
