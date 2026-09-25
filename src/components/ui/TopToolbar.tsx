import { VENUES } from '../../engine/venues.gen';
import { captureScene, downloadUrl, slug } from '../../lib/capture';
import { useDesignStore, type ModalKind } from '../../store/designStore';

type ToolbarKey = ModalKind | 'flower' | 'snapshot' | 'storybook' | 'lantern' | 'ar';

const OVERLAY_BUTTONS: Array<{ key: ToolbarKey; label: string }> = [
  { key: 'flower', label: '✿ Flower Studio' },
  { key: 'designs', label: 'Designs' },
  { key: 'quote', label: 'Quote' },
  { key: 'snapshot', label: 'Snapshot' },
  { key: 'storybook', label: 'Storybook' },
  { key: 'lantern', label: 'Brass Lantern' },
  { key: 'ar', label: 'View in AR' },
];

const btnClass = 'rounded-[9px] px-3 max-[1180px]:px-2 py-2 text-[12.5px] font-medium whitespace-nowrap hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed';
const onStyle = { background: 'rgba(var(--acr),.18)', color: 'var(--ac)' };

export function TopToolbar() {
  const history = useDesignStore((s) => s.history);
  const future = useDesignStore((s) => s.future);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const modal = useDesignStore((s) => s.modal);
  const openModal = useDesignStore((s) => s.openModal);
  const closeModal = useDesignStore((s) => s.closeModal);
  const showComingSoon = useDesignStore((s) => s.showComingSoon);
  const showToast = useDesignStore((s) => s.showToast);
  const venueIndex = useDesignStore((s) => s.design.venue);
  const studioOpen = useDesignStore((s) => s.studio.open);
  const openStudio = useDesignStore((s) => s.openStudio);
  const closeStudio = useDesignStore((s) => s.closeStudio);

  function snapshot() {
    const url = captureScene();
    if (!url) {
      showToast('The scene is still loading — try again in a moment');
      return;
    }
    downloadUrl(url, `${slug(VENUES[venueIndex]?.name ?? 'venue')}-snapshot.png`);
    showToast('Snapshot saved');
  }

  function onClick(key: ToolbarKey, label: string) {
    if (key === 'flower') {
      if (studioOpen) closeStudio();
      else openStudio();
      return;
    }
    // Any other toolbar action closes the Flower Studio first.
    if (studioOpen) closeStudio();
    if (key === 'designs' || key === 'quote') {
      if (modal === key) closeModal();
      else openModal(key);
    } else if (key === 'snapshot') {
      snapshot();
    } else {
      closeModal();
      showComingSoon(label.replace('✿ ', ''));
    }
  }

  return (
    <div
      className="glass chrome toolbar fixed top-4 z-[25] flex flex-wrap items-center justify-center gap-0.5 p-1"
      // max-width keeps it inside the gap between the side panels, so it wraps instead of overlapping them.
      style={
        studioOpen
          ? { left: 16, right: 16, width: 'max-content', maxWidth: 'calc(100vw - 32px)', marginInline: 'auto' }
          : { left: 358, right: 304, width: 'max-content', maxWidth: 'calc(100vw - 662px)', marginInline: 'auto' }
      }
    >
      <button type="button" className={btnClass} disabled={!history.length} onClick={undo} title="Undo (Ctrl+Z)">
        ↶ Undo
      </button>
      <button type="button" className={btnClass} disabled={!future.length} onClick={redo} title="Redo (Ctrl+Shift+Z)">
        ↷ Redo
      </button>
      <span className="mx-1 h-[18px] w-px" style={{ background: 'rgba(255,240,220,.15)' }} />
      {OVERLAY_BUTTONS.map((b) => (
        <button key={b.key} type="button" className={btnClass} style={modal === b.key || (b.key === 'flower' && studioOpen) ? onStyle : undefined} onClick={() => onClick(b.key, b.label)}>
          {b.label}
        </button>
      ))}
      <span className="mx-1 h-[18px] w-px" style={{ background: 'rgba(255,240,220,.15)' }} />
      <button type="button" className={btnClass} style={modal === 'addons' ? onStyle : undefined} onClick={() => {
          closeStudio();
          if (modal === 'addons') closeModal();
          else openModal('addons');
        }}>
        ＋ Add-ons
      </button>
    </div>
  );
}
