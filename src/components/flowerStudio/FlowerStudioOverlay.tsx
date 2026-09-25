import { useEffect } from 'react';
import { useFlowerStudioStore } from '../../store/flowerStudioStore';
import { FlowerStudioCanvas } from './FlowerStudioCanvas';
import { FlowerStudioPanel } from './FlowerStudioPanel';

export function FlowerStudioOverlay() {
  const draft = useFlowerStudioStore((s) => s.draft);
  const setName = useFlowerStudioStore((s) => s.setName);
  const close = useFlowerStudioStore((s) => s.close);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  if (!draft) return null;

  return (
    <div
      className="fixed inset-0 z-20 grid"
      style={{
        gridTemplateColumns: 'minmax(0,1fr) 380px',
        background: 'radial-gradient(ellipse at 40% 35%, #3a312a, #15120f 70%)',
      }}
    >
      <div className="relative min-h-0">
        <FlowerStudioCanvas />
        <div className="absolute left-6 right-6 top-5 flex flex-col gap-1">
          <div className="lbl">Flower Studio</div>
          <input
            className="fsName serif"
            aria-label="Arrangement name"
            value={draft.name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="absolute bottom-5 left-6 text-[11.5px] opacity-60">Drag to turn · Scroll to zoom · Esc to close</div>
        <button
          type="button"
          className="glass absolute right-6 top-5 px-3 py-1.5 text-[12.5px] font-medium"
          onClick={close}
        >
          Close
        </button>
      </div>
      <FlowerStudioPanel />
    </div>
  );
}
