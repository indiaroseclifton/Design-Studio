import { useEffect, useState } from 'react';
import type { CatalogueItem, Palette } from '../../types';
import { captureItemThumbnail } from '../../three/thumbnail';

export function CatalogueCard({
  item,
  palette,
  disabled,
  selected,
  index = 0,
  onClick,
}: {
  item: CatalogueItem;
  palette: Palette;
  disabled: boolean;
  selected?: boolean;
  index?: number;
  onClick: () => void;
}) {
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setThumb(captureItemThumbnail(item, palette));
    }, index * 8);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [item, palette, index]);

  return (
    <button
      type="button"
      className={`card text-left ${selected ? 'on' : ''}`}
      style={disabled ? { opacity: 0.35, pointerEvents: 'none' } : undefined}
      onClick={onClick}
      title={`${item.name} · $${item.price}`}
    >
      <div className="th" style={thumb ? { backgroundImage: `url(${thumb})` } : undefined} />
      <b>{item.name}</b>
      {item.note && <small>{item.note}</small>}
      {item.tag && <span className="tag">{item.tag}</span>}
    </button>
  );
}
