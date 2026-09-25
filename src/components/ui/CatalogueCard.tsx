import { useMemo } from 'react';
import type { CatalogueItem, Palette } from '../../types';
import { captureItemThumbnail } from '../../three/thumbnail';

export function CatalogueCard({
  item,
  palette,
  disabled,
  onClick,
}: {
  item: CatalogueItem;
  palette: Palette;
  disabled: boolean;
  onClick: () => void;
}) {
  const thumb = useMemo(() => captureItemThumbnail(item, palette), [item, palette]);

  return (
    <button
      type="button"
      className="card text-left"
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
