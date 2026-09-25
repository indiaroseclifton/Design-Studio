import type { ReactNode } from 'react';
import { cachedThumb, requestStemThumb, stemKey } from '../../three/thumbnail';
import { useThumb } from './state';

/* Building blocks shared by the Flower Studio and the Cake Studio. */

export function StemThumb({ kind, t, c, className = 'fs-th' }: { kind: 'flower' | 'green'; t: string; c?: string; className?: string }) {
  const key = stemKey(kind, t, c);
  const url = useThumb(key, (cb) => requestStemThumb(kind, t, c, cb), () => cachedThumb(key));
  return <span className={className} style={url ? { backgroundImage: `url(${url})` } : undefined} aria-hidden />;
}

/* ------------------------------------------------------------------ controls */

export function Sec({ label, extra, children, hint }: { label: string; extra?: ReactNode; children: ReactNode; hint?: string }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="lbl flex items-baseline justify-between gap-2">
        <span>{label}</span>
        {extra && <span className="normal-case tracking-normal opacity-90">{extra}</span>}
      </div>
      {hint && <p className="fs-hint-text">{hint}</p>}
      {children}
    </section>
  );
}

export function Stepper({ n, onStep, label, min = 0, max = 99 }: { n: number; onStep: (d: number) => void; label: string; min?: number; max?: number }) {
  return (
    <div className="fs-step" role="group" aria-label={`${label} count`}>
      <button type="button" aria-label={`Fewer ${label}`} disabled={n <= min} onClick={() => onStep(-1)}>
        −
      </button>
      <b aria-live="polite">{n}</b>
      <button type="button" aria-label={`More ${label}`} disabled={n >= max} onClick={() => onStep(1)}>
        +
      </button>
    </div>
  );
}

