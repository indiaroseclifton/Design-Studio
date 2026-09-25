import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FCOL, FINS, FL, FS_PRESETS, GR, MAX_GREENS, MAX_STEMS, SHAPES, VESS, loadCustom, type Draft } from '../../engine/flowers';
import { newId } from '../../lib/designOps';
import { requestStemThumb, stemKey, cachedThumb } from '../../three/thumbnail';
import { useDesignStore } from '../../store/designStore';
import { FlowerViewer } from './FlowerViewer';

const newSeed = () => Math.floor(Math.random() * 1e9);
const fromPreset = (i: number, seed = newSeed()): Draft => {
  const { name: _name, ...p } = structuredClone(FS_PRESETS[i]);
  return { ...p, seed };
};

function StemThumb({ kind, t, c }: { kind: 'flower' | 'green'; t: string; c?: string }) {
  const key = stemKey(kind, t, c);
  const [thumb, setThumb] = useState<{ key: string; url: string } | null>(null);
  useEffect(() => requestStemThumb(kind, t, c, (url) => setThumb({ key, url })), [kind, t, c, key]);
  const url = thumb?.key === key ? thumb.url : cachedThumb(key);
  return <span className="fs-th" style={url ? { backgroundImage: `url(${url})` } : undefined} />;
}

function Chips({ list, active, onPick }: { list: Array<[string, string]>; active?: string; onPick: (k: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {list.map(([k, n]) => (
        <button key={k} type="button" className={`chip ${k === active ? 'on' : ''}`} onClick={() => onPick(k)}>
          {n}
        </button>
      ))}
    </div>
  );
}

function Sec({ label, extra, children }: { label: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="lbl flex justify-between">
        <span>{label}</span>
        {extra && <span>{extra}</span>}
      </div>
      {children}
    </div>
  );
}

function Stepper({ n, onStep, label }: { n: number; onStep: (d: number) => void; label: string }) {
  return (
    <div className="fs-step" role="group" aria-label={`${label} count`}>
      <button type="button" aria-label={`Fewer ${label}`} onClick={() => onStep(-1)}>
        −
      </button>
      <b>{n}</b>
      <button type="button" aria-label={`More ${label}`} onClick={() => onStep(1)}>
        +
      </button>
    </div>
  );
}

export function FlowerStudio() {
  const editId = useDesignStore((s) => s.studio.editId);
  const closeStudio = useDesignStore((s) => s.closeStudio);
  const saveArrangement = useDesignStore((s) => s.saveArrangement);
  const deleteArrangement = useDesignStore((s) => s.deleteArrangement);
  const motion = useDesignStore((s) => s.motion);

  const existing = useMemo(() => (editId ? loadCustom().find((x) => x.id === editId) : undefined), [editId]);
  const [draft, setDraft] = useState<Draft>(() => {
    if (existing) {
      const { id: _id, name: _name, ...rest } = structuredClone(existing);
      return rest;
    }
    return fromPreset(0);
  });
  const [name, setName] = useState(existing?.name ?? `My ${FS_PRESETS[0].name.toLowerCase()}`);
  const [warn, setWarn] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  // Debounce rebuilds a touch so rapid +/− clicks don't rebuild on every press.
  const [shown, setShown] = useState(draft);
  useEffect(() => {
    const t = setTimeout(() => setShown(draft), 60);
    return () => clearTimeout(t);
  }, [draft]);

  const update = (fn: (d: Draft) => void) =>
    setDraft((d) => {
      const n = structuredClone(d);
      fn(n);
      return n;
    });
  const total = draft.stems.reduce((a, s) => a + s.n, 0);
  const V = VESS[draft.vessel];

  function save(place: boolean) {
    if (!draft.stems.length) {
      setWarn(true);
      return;
    }
    saveArrangement({ ...structuredClone(draft), id: editId ?? newId(), name: name.trim() || 'Untitled arrangement' }, place);
  }

  return (
    <div className="fs-root" role="dialog" aria-label="Flower Studio">
      <div className="fs-view">
        <FlowerViewer draft={shown} turntable={motion} />
        <div className="fs-top">
          <div className="lbl">Flower Studio</div>
          <input className="serif fs-name" aria-label="Arrangement name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="fs-hint">Drag to turn · Scroll to zoom · Esc to close</div>
      </div>

      <aside className="fs-side glass scroll">
        <Sec label="Start from">
          <Chips
            list={FS_PRESETS.map((p, i) => [String(i), p.name])}
            onPick={(k) => {
              const i = Number(k);
              setDraft((d) => fromPreset(i, d.seed));
              if (!editId) setName(`My ${FS_PRESETS[i].name.toLowerCase()}`);
            }}
          />
        </Sec>
        <Sec label="Vessel">
          <Chips list={Object.entries(VESS).map(([k, v]) => [k, v.n])} active={draft.vessel} onPick={(k) => update((d) => void (d.vessel = k))} />
        </Sec>
        {V?.fin ? (
          <Sec label="Finish">
            <Chips list={Object.entries(FINS)} active={draft.fin} onPick={(k) => update((d) => void (d.fin = k))} />
          </Sec>
        ) : null}
        <Sec label="Shape">
          <Chips list={Object.entries(SHAPES)} active={draft.shape} onPick={(k) => update((d) => void (d.shape = k))} />
        </Sec>
        <Sec label="Size" extra={`${Math.round(draft.size * 100)}%`}>
          <input type="range" min={0.6} max={1.6} step={0.05} aria-label="Size" value={draft.size} onChange={(e) => update((d) => void (d.size = Number(e.target.value)))} />
        </Sec>

        <Sec label="Flowers" extra={total ? `${total} stems` : ''}>
          <div className="flex flex-col gap-1.5">
            {!draft.stems.length && <p className="note m-0" style={warn ? { color: 'var(--ac)', opacity: 1 } : undefined}>{warn ? 'Add at least one flower before saving.' : 'Add flowers from the list below.'}</p>}
            {draft.stems.map((st, i) => (
              <div key={`${st.t}-${i}`} className="fs-row">
                <span className="flex min-w-0 items-center gap-2 text-[13px]">
                  <StemThumb kind="flower" t={st.t} c={st.c} />
                  <i className="h-3 w-3 flex-none rounded-full border border-black/30" style={{ background: FCOL[st.c]?.[1] ?? st.c }} />
                  <span className="truncate">{FL[st.t].n}</span>
                </span>
                <Stepper n={st.n} label={FL[st.t].n} onStep={(dd) => update((d) => void (d.stems[i].n = Math.max(1, Math.min(MAX_STEMS, d.stems[i].n + dd))))} />
                <button type="button" className="fs-x" aria-label={`Remove ${FL[st.t].n}`} onClick={() => update((d) => void d.stems.splice(i, 1))}>
                  ×
                </button>
                <div className="fs-cols">
                  {Object.entries(FCOL).map(([k, [nm, hx]]) => (
                    <button key={k} type="button" title={nm} aria-label={nm} className={k === st.c ? 'on' : ''} style={{ background: hx }} onClick={() => update((d) => void (d.stems[i].c = k))} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="lbl mt-1">Add a flower</div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(FL).map(([k, f]) => (
              <button
                key={k}
                type="button"
                className="fs-add"
                onClick={() => {
                  setWarn(false);
                  update((d) => {
                    const ex = d.stems.find((s) => s.t === k);
                    if (ex) ex.n = Math.min(MAX_STEMS, ex.n + 3);
                    else d.stems.push({ t: k, c: f.c, n: k === 'hydrangea' || k === 'protea' ? 2 : 5 });
                  });
                }}
              >
                <StemThumb kind="flower" t={k} c={f.c} />
                <span>{f.n}</span>
              </button>
            ))}
          </div>
        </Sec>

        <Sec label="Greenery">
          <div className="flex flex-col gap-1.5">
            {Object.entries(GR).map(([k, G]) => (
              <div key={k} className="fs-row">
                <span className="flex items-center gap-2 text-[13px]">
                  <StemThumb kind="green" t={k} />
                  {G.n}
                </span>
                <Stepper
                  n={draft.greens[k] ?? 0}
                  label={G.n}
                  onStep={(dd) => update((d) => void (d.greens[k] = Math.max(0, Math.min(MAX_GREENS, (d.greens[k] ?? 0) + dd))))}
                />
                <span />
              </div>
            ))}
          </div>
        </Sec>

        <div className="fs-acts">
          <button type="button" className="btn" onClick={() => update((d) => void (d.seed = newSeed()))}>
            Shuffle placement
          </button>
          <button type="button" className="btn" onClick={closeStudio}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={() => save(false)}>
            Save to catalogue
          </button>
          <button type="button" className="btn primary" onClick={() => save(true)}>
            Save &amp; place
          </button>
          {editId &&
            (confirmDel ? (
              <button type="button" className="btn on col-span-2" autoFocus onBlur={() => setConfirmDel(false)} onClick={() => deleteArrangement(editId)}>
                Confirm — delete this arrangement and its placed copies
              </button>
            ) : (
              <button type="button" className="btn col-span-2" onClick={() => setConfirmDel(true)}>
                Delete arrangement
              </button>
            ))}
        </div>
      </aside>
    </div>
  );
}
