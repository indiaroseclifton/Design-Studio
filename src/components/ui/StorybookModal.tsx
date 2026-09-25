import { useEffect, useState } from 'react';
import { useDesignStore } from '../../store/designStore';
import { VENUES } from '../../data/venues';
import { captureSceneSnapshot } from '../../three/snapshot';
import { triggerDownload } from '../../lib/download';
import { Modal } from './Modal';
import type { CameraPreset } from '../../types';

const CHAPTERS: Array<{ preset: CameraPreset; label: string; plan?: boolean }> = [
  { preset: 'wide', label: 'The Venue' },
  { preset: 'top', label: 'The Layout', plan: true },
  { preset: 'guest', label: "Guest's Eye" },
  { preset: 'couple', label: 'The First Dance' },
];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slug(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function StorybookModal() {
  const closeModal = useDesignStore((s) => s.closeModal);
  const setCameraPreset = useDesignStore((s) => s.setCameraPreset);
  const setPlanView = useDesignStore((s) => s.setPlanView);
  const venueIndex = useDesignStore((s) => s.design.venue);
  const guests = useDesignStore((s) => s.design.table.guests);
  const layout = useDesignStore((s) => s.design.table.layout);
  const venue = VENUES[venueIndex] ?? VENUES[0];

  const [photos, setPhotos] = useState<Array<{ label: string; url: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const originalPreset = useDesignStore.getState().cameraPreset;
    const originalPlanView = useDesignStore.getState().planView;

    async function run() {
      const shots: Array<{ label: string; url: string }> = [];
      for (const ch of CHAPTERS) {
        if (cancelled) return;
        if (ch.plan) {
          setPlanView(true);
        } else {
          setPlanView(false);
          setCameraPreset(ch.preset);
        }
        await wait(ch.plan ? 700 : 400);
        const url = captureSceneSnapshot();
        if (url) shots.push({ label: ch.label, url });
      }
      setCameraPreset(originalPreset);
      setPlanView(originalPlanView);
      if (!cancelled) {
        setPhotos(shots);
        setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadAll() {
    photos.forEach((p) => triggerDownload(p.url, `storybook-${slug(p.label)}.png`));
  }

  return (
    <Modal title="Storybook" onClose={closeModal} wide>
      <p className="text-[12.5px] leading-[1.5] opacity-70">
        A quick photo set of your design — {venue.name}, {guests} guests, {layout} layout.
      </p>
      {loading ? (
        <div className="py-10 text-center text-[13px] opacity-60">Turning through the venue…</div>
      ) : photos.length === 0 ? (
        <div className="py-10 text-center text-[13px] opacity-60">Couldn't capture any photos this time.</div>
      ) : (
        <>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {photos.map((p) => (
              <figure key={p.label} className="flex flex-col gap-1.5">
                <img src={p.url} alt={p.label} className="w-full rounded-[10px]" style={{ aspectRatio: '4 / 3', objectFit: 'cover' }} />
                <figcaption className="flex items-center justify-between text-[12px]">
                  <span className="opacity-80">{p.label}</span>
                  <button type="button" className="link" onClick={() => triggerDownload(p.url, `storybook-${slug(p.label)}.png`)}>
                    Download
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
          <button type="button" className="btn primary self-start" onClick={downloadAll}>
            Download all
          </button>
        </>
      )}
    </Modal>
  );
}
