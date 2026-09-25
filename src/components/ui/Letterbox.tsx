import { useDesignStore } from '../../store/designStore';

/** Cinematic mode: 8vh letterbox bars plus a way back, since the toolbar and panels are hidden. */
export function Letterbox() {
  const ui = useDesignStore((s) => s.tweaks.ui);
  const setTweak = useDesignStore((s) => s.setTweak);
  const on = ui === 'cinematic';

  return (
    <>
      <div className={`letterbox top ${on ? 'on' : ''}`} />
      <div className={`letterbox bottom ${on ? 'on' : ''}`} />
      {on && (
        <button type="button" className="glass fixed right-4 top-4 z-[7] rounded-full px-3.5 py-1.5 text-[12px] hover:bg-white/10" onClick={() => setTweak('ui', 'studio')}>
          Exit cinematic · Esc
        </button>
      )}
    </>
  );
}
