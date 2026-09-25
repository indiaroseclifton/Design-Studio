import { VENUES } from '../../engine/venues.gen';
import { captureScene, downloadUrl, slug } from '../../lib/capture';
import { useEffect, useRef, useState } from 'react';
import { useSmall } from '../../lib/useMedia';
import { useDesignStore, type ModalKind, type OverlayKind } from '../../store/designStore';

type ToolbarKey = ModalKind | OverlayKind | 'flower' | 'cake' | 'snapshot';

const MAIN: Array<{ key: ToolbarKey; label: string; title?: string }> = [
  { key: 'flower', label: '✿ Flowers', title: 'Flower Studio' },
  { key: 'cake', label: 'Cakes', title: 'Cake Studio' },
  { key: 'designs', label: 'Designs' },
  { key: 'quote', label: 'Quote' },
  { key: 'storybook', label: 'Storybook' },
];
// On small screens the toolbar keeps the drawers and the Flower Studio; everything else moves under More.
const SMALL_MORE: Array<{ key: ToolbarKey; label: string; note: string }> = [
  { key: 'cake', label: 'Cake Studio', note: 'Design a cake' },
  { key: 'designs', label: 'Designs', note: 'Save, load and share designs' },
  { key: 'quote', label: 'Quote', note: 'Prices for everything placed' },
  { key: 'storybook', label: 'Storybook', note: 'Your day as a pop-up book' },
];
const MORE: Array<{ key: ToolbarKey; label: string; note: string }> = [
  { key: 'snapshot', label: 'Snapshot', note: 'Save this view as an image' },
  { key: 'ar', label: 'View in AR', note: 'Place the design in your room' },
  { key: 'lantern', label: 'Brass Lantern', note: 'Design the cocktail menu' },
  { key: 'addons', label: 'Add-ons', note: 'Switch catalogue packs on or off' },
];

const btnClass = 'rounded-[9px] px-3 max-[1180px]:px-2 py-2 text-[12.5px] font-medium whitespace-nowrap hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed';
const onStyle = { background: 'rgba(var(--acr),.18)', color: 'var(--ac)' };

export function TopToolbar() {
  const history = useDesignStore((s) => s.history);
  const future = useDesignStore((s) => s.future);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const modal = useDesignStore((s) => s.modal);
  const overlay = useDesignStore((s) => s.overlay);
  const openModal = useDesignStore((s) => s.openModal);
  const closeModal = useDesignStore((s) => s.closeModal);
  const openOverlay = useDesignStore((s) => s.openOverlay);
  const closeOverlay = useDesignStore((s) => s.closeOverlay);
  const showToast = useDesignStore((s) => s.showToast);
  const venueIndex = useDesignStore((s) => s.design.venue);
  const studioOpen = useDesignStore((s) => s.studio.open);
  const openStudio = useDesignStore((s) => s.openStudio);
  const closeStudio = useDesignStore((s) => s.closeStudio);
  const cakeOpen = useDesignStore((s) => s.cakeStudio.open);
  const openCakeStudio = useDesignStore((s) => s.openCakeStudio);
  const closeCakeStudio = useDesignStore((s) => s.closeCakeStudio);
  const [menu, setMenu] = useState(false);
  const small = useSmall();
  const drawer = useDesignStore((s) => s.drawer);
  const setDrawer = useDesignStore((s) => s.setDrawer);
  const main = small ? MAIN.filter((b) => b.key === 'flower') : MAIN;
  const more = small ? [...SMALL_MORE, ...MORE] : MORE;
  const menuRef = useRef<HTMLDivElement>(null);

  // The More menu closes on an outside click or Esc.
  useEffect(() => {
    if (!menu) return;
    const down = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setMenu(false);
      }
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('keydown', key, true);
    };
  }, [menu]);

  function snapshot() {
    const url = captureScene();
    if (!url) {
      showToast('The scene is still loading — try again in a moment');
      return;
    }
    downloadUrl(url, `${slug(VENUES[venueIndex]?.name ?? 'venue')}-snapshot.png`);
    showToast('Snapshot saved');
  }

  const isOn = (k: ToolbarKey) => modal === k || overlay === k || (k === 'flower' && studioOpen) || (k === 'cake' && cakeOpen);

  function onClick(key: ToolbarKey) {
    setMenu(false);
    setDrawer(null);
    if (key === 'flower') return studioOpen ? closeStudio() : openStudio();
    if (key === 'cake') return cakeOpen ? closeCakeStudio() : openCakeStudio();
    if (key === 'snapshot') {
      // A snapshot needs the studio scene on screen.
      closeStudio();
      closeCakeStudio();
      closeOverlay();
      closeModal();
      requestAnimationFrame(() => requestAnimationFrame(snapshot));
      return;
    }
    if (key === 'designs' || key === 'quote' || key === 'addons') {
      closeStudio();
      closeCakeStudio();
      closeOverlay();
      if (modal === key) closeModal();
      else openModal(key);
      return;
    }
    if (overlay === key) closeOverlay();
    else openOverlay(key);
  }

  const moreOn = more.some((m) => isOn(m.key));
  const drawerBtn = (d: 'catalogue' | 'panel', label: string) => (
    <button type="button" className={btnClass} aria-pressed={drawer === d} style={drawer === d ? onStyle : undefined} onClick={() => setDrawer(drawer === d ? null : d)}>
      {label}
    </button>
  );

  return (
    <div
      className="glass chrome toolbar fixed top-4 z-[25] flex items-center justify-center gap-0.5 p-1"
      role="toolbar"
      aria-label="Studio"
      // max-width keeps it inside the gap between the side panels.
      style={
        small
          ? { left: 8, right: 8, width: 'max-content', maxWidth: 'calc(100vw - 16px)', marginInline: 'auto', top: 8 }
          : studioOpen || cakeOpen || overlay
          ? { left: 16, right: 16, width: 'max-content', maxWidth: 'calc(100vw - 32px)', marginInline: 'auto' }
          : { left: 358, right: 304, width: 'max-content', maxWidth: 'calc(100vw - 662px)', marginInline: 'auto' }
      }
    >
      <button type="button" className={btnClass} disabled={!history.length} onClick={undo} title="Undo (Ctrl+Z)" aria-label="Undo">
        ↶
      </button>
      <button type="button" className={btnClass} disabled={!future.length} onClick={redo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
        ↷
      </button>
      <span className="mx-1 h-[18px] w-px" style={{ background: 'rgba(255,240,220,.15)' }} />
      {small && !studioOpen && !cakeOpen && (
        <>
          {drawerBtn('catalogue', 'Catalogue')}
          {drawerBtn('panel', 'Venue')}
        </>
      )}
      {main.map((b) => (
        <button key={b.key} type="button" className={btnClass} title={b.title} aria-pressed={isOn(b.key)} style={isOn(b.key) ? onStyle : undefined} onClick={() => onClick(b.key)}>
          {b.label}
        </button>
      ))}
      <span className="mx-1 h-[18px] w-px" style={{ background: 'rgba(255,240,220,.15)' }} />
      <div ref={menuRef} className="relative">
        <button type="button" className={btnClass} aria-haspopup="menu" aria-expanded={menu} style={moreOn || menu ? onStyle : undefined} onClick={() => setMenu(!menu)}>
          More ▾
        </button>
        {menu && (
          <div className="tb-menu glass" role="menu">
            {more.map((m) => (
              <button key={m.key} type="button" role="menuitem" className={isOn(m.key) ? 'on' : ''} onClick={() => onClick(m.key)}>
                <b>{m.label}</b>
                <small>{m.note}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
