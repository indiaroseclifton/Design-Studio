import { ACCENTS } from '../../data/palettes';
import { useDesignStore } from '../../store/designStore';
import type { Accent, Mood, Quality, UIMode } from '../../types';

const MOODS: Array<[Mood, string]> = [
  ['natural', 'Natural'],
  ['film', 'Film'],
  ['moody', 'Moody'],
  ['dreamy', 'Dreamy'],
];
const MODES: Array<[UIMode, string]> = [
  ['studio', 'Studio'],
  ['focus', 'Focus'],
  ['cinematic', 'Cinematic'],
];
const QUALITY: Array<[Quality, string]> = [
  ['high', 'High'],
  ['standard', 'Standard'],
];
const ACCENT_OPTS: Array<[Accent, string]> = [
  ['champagne', 'Champagne'],
  ['rose', 'Rose'],
  ['sage', 'Sage'],
  ['silver', 'Silver'],
];

export function TweaksPanel() {
  const tweaks = useDesignStore((s) => s.tweaks);
  const setTweak = useDesignStore((s) => s.setTweak);

  return (
    <section className="glass flex flex-col gap-2 p-3.5">
      <div className="lbl">Tweaks</div>
      <div className="text-[11.5px] opacity-70">Mood</div>
      <div className="seg">
        {MOODS.map(([v, l]) => (
          <button key={v} type="button" className={tweaks.mood === v ? 'on' : ''} onClick={() => setTweak('mood', v)}>
            {l}
          </button>
        ))}
      </div>
      <div className="text-[11.5px] opacity-70">Interface</div>
      <div className="seg three">
        {MODES.map(([v, l]) => (
          <button key={v} type="button" className={tweaks.ui === v ? 'on' : ''} onClick={() => setTweak('ui', v)}>
            {l}
          </button>
        ))}
      </div>
      <div className="text-[11.5px] opacity-70">Render quality</div>
      <div className="seg" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {QUALITY.map(([v, l]) => (
          <button key={v} type="button" className={tweaks.quality === v ? 'on' : ''} title={v === 'high' ? 'Ambient occlusion, 8× antialiasing and sharper shadows' : 'Faster on laptops and tablets'} onClick={() => setTweak('quality', v)}>
            {l}
          </button>
        ))}
      </div>
      <div className="text-[11.5px] opacity-70">Accent</div>
      <div className="flex flex-wrap gap-1">
        {ACCENT_OPTS.map(([v, l]) => (
          <button key={v} type="button" className={`chip flex items-center gap-1.5 ${tweaks.accent === v ? 'on' : ''}`} onClick={() => setTweak('accent', v)}>
            <i className="h-2.5 w-2.5 rounded-full border border-black/30" style={{ background: ACCENTS[v].ac }} />
            {l}
          </button>
        ))}
      </div>
    </section>
  );
}
