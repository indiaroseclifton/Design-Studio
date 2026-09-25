import { useDesignStore } from '../../store/designStore';
import type { CameraPreset } from '../../types';

const CAMS: Array<[CameraPreset, string]> = [
  ['wide', 'Wide'],
  ['guest', "Guest's eye"],
  ['couple', "Couple's view"],
  ['top', 'Overhead'],
];

export function ViewPanel() {
  const design = useDesignStore((s) => s.design);
  const cameraPreset = useDesignStore((s) => s.cameraPreset);
  const setCameraPreset = useDesignStore((s) => s.setCameraPreset);
  const motion = useDesignStore((s) => s.motion);
  const setMotion = useDesignStore((s) => s.setMotion);
  const autoRotate = useDesignStore((s) => s.autoRotate);
  const setAutoRotate = useDesignStore((s) => s.setAutoRotate);
  const showZone = useDesignStore((s) => s.showZone);
  const setShowZone = useDesignStore((s) => s.setShowZone);
  const clearAll = useDesignStore((s) => s.clearAll);
  const showToast = useDesignStore((s) => s.showToast);
  const planView = useDesignStore((s) => s.planView);
  const setPlanView = useDesignStore((s) => s.setPlanView);

  return (
    <section className="glass flex flex-col gap-2 p-3.5">
      <div className="lbl">View</div>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" className={`btn ${planView ? 'on' : ''}`} onClick={() => setPlanView(!planView)}>
          Plan view
        </button>
        <button type="button" className="btn" onClick={() => setCameraPreset('wide')}>
          Reset camera
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {CAMS.map(([v, l]) => (
          <button key={v} type="button" className={`chip ${!planView && cameraPreset === v ? 'on' : ''}`} onClick={() => setCameraPreset(v)}>
            {l}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" className={`btn ${showZone ? 'on' : ''}`} onClick={() => setShowZone(!showZone)}>
          Placement zone
        </button>
        <button type="button" className={`btn ${autoRotate ? 'on' : ''}`} onClick={() => setAutoRotate(!autoRotate)}>
          Slow orbit
        </button>
      </div>
      <button type="button" className="btn" onClick={() => setMotion(!motion)}>
        {motion ? 'Motion on' : 'Motion off'}
      </button>
      <div className="flex items-center justify-between text-[11.5px] opacity-80">
        <span>{design.items.length ? `${design.items.length} piece${design.items.length > 1 ? 's' : ''}` : 'No pieces yet'}</span>
        <button
          type="button"
          className="link"
          disabled={!design.items.length}
          onClick={() => {
            clearAll();
            showToast('Cleared all pieces', true);
          }}
        >
          Clear all
        </button>
      </div>
    </section>
  );
}
