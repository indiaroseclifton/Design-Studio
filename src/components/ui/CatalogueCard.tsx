import { memo, useEffect, useState } from 'react';
import type { Entry } from '../../engine/catalogue';
import { cachedThumb, requestThumb, thumbKey } from '../../three/thumbnail';

interface Props {
  entry: Entry;
  pal: string;
  chair: string | null;
  active: boolean;
  disabled: boolean;
  /** can't be stacked on the surface being decorated */
  dim: boolean;
  onActivate: (e: Entry) => void;
}

function CardInner({ entry, pal, chair, active, disabled, dim, onActivate }: Props) {
  const key = thumbKey(entry, pal, chair);
  const [thumb, setThumb] = useState<{ key: string; url: string } | null>(() => {
    const url = cachedThumb(key);
    return url ? { key, url } : null;
  });

  // Thumbnails render lazily through a queue; cancel if the card leaves before its turn.
  useEffect(() => requestThumb(entry, pal, chair, (url) => setThumb({ key, url })), [entry, pal, chair, key]);
  const url = thumb?.key === key ? thumb.url : cachedThumb(key);

  return (
    <button
      type="button"
      className={`card text-left ${active ? 'on' : ''} ${entry.k === 'tpl' ? 'tpl' : ''}`}
      style={{ opacity: disabled ? 0.32 : dim ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      disabled={disabled}
      title={disabled ? 'Not available for the current layout' : entry.name}
      onClick={() => onActivate(entry)}
    >
      <div className="th" style={url ? { backgroundImage: `url(${url})` } : undefined} />
      <b>{entry.name}</b>
      {entry.note && <small>{entry.note}</small>}
      <span className="tag px-0.5">{entry.tag}</span>
    </button>
  );
}

export const CatalogueCard = memo(CardInner);
