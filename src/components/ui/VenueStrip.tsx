import { useRef } from 'react';
import { VENUES } from '../../data/venues';
import { useDesignStore } from '../../store/designStore';
import { useVenuePhotoStore } from '../../store/venuePhotoStore';

export function VenueStrip() {
  const venueIndex = useDesignStore((s) => s.design.venue);
  const setVenue = useDesignStore((s) => s.setVenue);
  const photo = useVenuePhotoStore((s) => s.photo);
  const setPhoto = useVenuePhotoStore((s) => s.setPhoto);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingVenueIndex = useRef<number | null>(null);

  function handleCardClick(i: number, v: (typeof VENUES)[number]) {
    if (v.custom && !photo) {
      pendingVenueIndex.current = i;
      fileRef.current?.click();
      return;
    }
    setVenue(i);
  }

  function handleChangePhoto(e: React.MouseEvent, i: number) {
    e.stopPropagation();
    pendingVenueIndex.current = i;
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await setPhoto(file);
    if (pendingVenueIndex.current !== null) {
      setVenue(pendingVenueIndex.current);
      pendingVenueIndex.current = null;
    }
  }

  return (
    <nav className="glass fixed bottom-4 left-4 right-4 z-[3] flex gap-2 overflow-x-auto p-2">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      {VENUES.map((v, i) => {
        const active = i === venueIndex;
        const hasPhoto = v.custom && photo;
        return (
          <div
            key={v.name}
            role="button"
            tabIndex={0}
            className="flex shrink-0 cursor-pointer flex-col gap-1.5 rounded-[10px] p-1.5 pb-2 text-left transition-colors hover:bg-white/[0.07]"
            style={{
              flex: '1 0 118px',
              border: `1px solid ${active ? 'rgba(243,217,164,.7)' : 'transparent'}`,
              background: active ? 'rgba(243,217,164,.08)' : 'transparent',
            }}
            onClick={() => handleCardClick(i, v)}
            onKeyDown={(e) => e.key === 'Enter' && handleCardClick(i, v)}
          >
            <span
              className="block h-[34px] rounded-[6px]"
              style={
                hasPhoto
                  ? { backgroundImage: `url(${photo.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: `linear-gradient(135deg, ${v.env.sky[0]}, ${v.env.sky[1]})` }
              }
            />
            <span className="flex items-baseline justify-between gap-1">
              <span className="lbl">{v.custom && !photo ? '+ Upload' : String(i + 1).padStart(2, '0')}</span>
              {hasPhoto && (
                <button type="button" className="link text-[10.5px]" onClick={(e) => handleChangePhoto(e, i)}>
                  Change
                </button>
              )}
            </span>
            <span className="serif text-[16px] leading-[1.05]">{v.name}</span>
          </div>
        );
      })}
    </nav>
  );
}
