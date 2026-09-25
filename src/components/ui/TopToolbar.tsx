import { useDesignStore } from '../../store/designStore';
import { useFlowerStudioStore } from '../../store/flowerStudioStore';
import { captureSceneSnapshot } from '../../three/snapshot';
import { triggerDownload } from '../../lib/download';

const COMING_SOON_BUTTONS = [
  { key: 'storybook', label: 'Storybook', name: 'Storybook' },
  { key: 'lantern', label: 'Brass Lantern', name: 'Brass Lantern' },
  { key: 'ar', label: 'View in AR', name: 'View in AR' },
];

const btnClass = 'rounded-[9px] px-3 py-2 text-[12.5px] font-medium whitespace-nowrap hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed';

export function TopToolbar() {
  const history = useDesignStore((s) => s.history);
  const future = useDesignStore((s) => s.future);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const showComingSoon = useDesignStore((s) => s.showComingSoon);
  const openModal = useDesignStore((s) => s.openModal);
  const showToast = useDesignStore((s) => s.showToast);
  const openFlowerStudio = useFlowerStudioStore((s) => s.open);

  function handleSnapshot() {
    const url = captureSceneSnapshot();
    if (!url) {
      showToast('Could not capture a snapshot');
      return;
    }
    triggerDownload(url, `design-snapshot-${Date.now()}.png`);
    showToast('Snapshot downloaded');
  }

  return (
    <div
      className="glass fixed top-4 z-[4] flex flex-wrap items-center justify-center gap-0.5 p-1"
      style={{ left: 358, right: 304, width: 'max-content', marginInline: 'auto' }}
    >
      <button type="button" className={btnClass} disabled={!history.length} onClick={undo} title="Undo (Ctrl+Z)">
        ↶ Undo
      </button>
      <button type="button" className={btnClass} disabled={!future.length} onClick={redo} title="Redo (Ctrl+Shift+Z)">
        ↷ Redo
      </button>
      <span className="mx-1 h-[18px] w-px" style={{ background: 'rgba(255,240,220,.15)' }} />
      <button type="button" className={btnClass} onClick={() => openFlowerStudio()}>
        ✿ Flower Studio
      </button>
      <button type="button" className={btnClass} onClick={() => openModal('designs')}>
        Designs
      </button>
      <button type="button" className={btnClass} onClick={() => openModal('quote')}>
        Quote
      </button>
      <button type="button" className={btnClass} onClick={handleSnapshot}>
        Snapshot
      </button>
      {COMING_SOON_BUTTONS.map((b) => (
        <button key={b.key} type="button" className={btnClass} onClick={() => showComingSoon(b.name)}>
          {b.label}
        </button>
      ))}
      <span className="mx-1 h-[18px] w-px" style={{ background: 'rgba(255,240,220,.15)' }} />
      <button type="button" className={btnClass} onClick={() => openModal('addons')}>
        ＋ Add-ons
      </button>
    </div>
  );
}
