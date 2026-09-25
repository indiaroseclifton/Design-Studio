import { useDesignStore } from '../../store/designStore';

export function ComingSoonOverlay() {
  const comingSoon = useDesignStore((s) => s.comingSoon);
  const dismissComingSoon = useDesignStore((s) => s.dismissComingSoon);

  if (!comingSoon) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-6" style={{ background: 'rgba(10,8,6,.55)' }} onClick={dismissComingSoon}>
      <div
        className="glass flex max-w-[420px] flex-col gap-3 p-6 text-center"
        style={{ background: 'var(--modal-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lbl">Coming soon</div>
        <h3 className="serif text-[28px] leading-tight">{comingSoon}</h3>
        <p className="text-[13px] leading-[1.5] opacity-70">
          This part of the handoff isn't wired up yet — the Studio, Designs, Quote and Snapshot are ready to use.
        </p>
        <button type="button" className="btn primary mt-1" onClick={dismissComingSoon}>
          Back to the Studio
        </button>
      </div>
    </div>
  );
}
