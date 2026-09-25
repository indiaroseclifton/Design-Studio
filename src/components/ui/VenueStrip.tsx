import { useEffect, useRef } from 'react';
import { VENUES } from '../../engine/venues.gen';
import { useVenuePhoto } from '../../lib/venuePhoto';
import { useDesignStore } from '../../store/designStore';

export function VenueStrip() {
  const venueIndex = useDesignStore((s) => s.design.venue);
  const setVenue = useDesignStore((s) => s.setVenue);
  const showToast = useDesignStore((s) => s.showToast);
  const motion = useDesignStore((s) => s.motion);
  const photo = useVenuePhoto((s) => s.photo);
  const setFile = useVenuePhoto((s) => s.setFile);
  const fileRef = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLElement>(null);
  const customIndex = VENUES.findIndex((v) => v.custom);

  // Keep the current venue in view as the strip scrolls.
  useEffect(() => {
    const el = stripRef.current?.children[venueIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', inline: 'center', block: 'nearest' });
  }, [venueIndex, motion]);

  return (
    <>
      <nav ref={stripRef} className="glass scroll fixed bottom-4 left-4 right-4 z-[3] flex gap-2 overflow-x-auto p-2" aria-label="Venues">
        {VENUES.map((v, i) => {
          const active = i === venueIndex;
          const bg = v.custom && photo ? `url(${photo.url}) center/cover` : `linear-gradient(180deg, ${v.env.sky[0]}, ${v.env.sky[1]} 70%, ${v.env.sky[2]})`;
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
              onClick={() => {
                if (v.custom && !photo) fileRef.current?.click();
                setVenue(i);
              }}
            >
              <span className="flex h-[34px] items-center justify-center rounded-[6px] text-[11px] font-medium" style={{ background: bg }}>
                {v.custom && !photo ? '+ Upload' : ''}
              </span>
              <span className="lbl">
                {String(i + 1).padStart(2, '0')}
                {v.indoor ? ' · Indoor' : ''}
              </span>
              <span className="serif text-[16px] leading-[1.05]">{v.name}</span>
            </button>
          );
        })}
      </nav>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            await setFile(f);
            setVenue(customIndex);
            showToast('Venue photo added — a 2:1 panorama wraps all the way round');
          } catch {
            showToast('That image could not be read');
          }
        }}
      />
      <UploadHook fileRef={fileRef} />
    </>
  );
}

/** Lets other panels (Venue panel's "Change photo") open the same file picker. */
function UploadHook({ fileRef }: { fileRef: React.RefObject<HTMLInputElement | null> }) {
  useEffect(() => {
    const open = () => fileRef.current?.click();
    window.addEventListener('venue-photo:upload', open);
    return () => window.removeEventListener('venue-photo:upload', open);
  }, [fileRef]);
  return null;
}
