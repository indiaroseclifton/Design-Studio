import { useRef, useState } from 'react';
import { VENUES } from '../../engine/venues.gen';
import { captureScene, downloadText, slug } from '../../lib/capture';
import { gz64, readJSON, writeJSON } from '../../lib/storage';
import { useDesignStore } from '../../store/designStore';
import { normalizeDesign } from '../../lib/designFormat';
import { arrangementsIn, importArrangements, type SavedArrangement } from '../../engine/flowers';
import type { Design } from '../../types';
import { Modal } from './Modal';

const LS_KEY = 'vs2_designs';

interface SavedDesign {
  id: string;
  name: string;
  date: number;
  /** venue name at save time; indices shift as more venues are ported, names don't */
  venueName: string;
  thumb: string | null;
  data: Design;
  /** Flower Studio arrangements the design uses, so it still opens if they're deleted locally */
  flowers?: SavedArrangement[];
}

const loadSaved = () => readJSON<SavedDesign[]>(LS_KEY, []).filter((d) => d && typeof d.id === 'string' && d.data);

/** Re-point a design at its venue by name, falling back to the stored index. */
function withVenue(d: Design, venueName?: string): Design {
  const byName = venueName ? VENUES.findIndex((v) => v.name === venueName) : -1;
  return byName >= 0 ? { ...d, venue: byName } : d;
}

export function DesignsModal() {
  const design = useDesignStore((s) => s.design);
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const closeModal = useDesignStore((s) => s.closeModal);
  const showToast = useDesignStore((s) => s.showToast);
  const bumpFlowers = () => useDesignStore.setState((s) => ({ flowersVersion: s.flowersVersion + 1 }));
  const [saved, setSaved] = useState<SavedDesign[]>(loadSaved);
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const venue = VENUES[design.venue] ?? VENUES[0];

  function persist(next: SavedDesign[]) {
    if (!writeJSON(LS_KEY, next)) {
      showToast('Browser storage is full — delete a design first');
      return false;
    }
    setSaved(next);
    return true;
  }

  function save() {
    const n = name.trim() || `${venue.name} design`;
    const entry: SavedDesign = {
      id: crypto.randomUUID(),
      name: n,
      date: Date.now(),
      venueName: venue.name,
      thumb: captureScene(480, 300, 'image/jpeg', 0.75),
      data: design,
      flowers: arrangementsIn(design.items.map((i) => i.type)),
    };
    if (persist([entry, ...saved])) {
      setName('');
      showToast(`Saved “${n}”`);
    }
  }

  function open(d: SavedDesign) {
    if (importArrangements(d.flowers)) bumpFlowers();
    const clean = normalizeDesign(d.data);
    if (!clean) {
      showToast('That design could not be read');
      return;
    }
    loadDesign(withVenue(clean, d.venueName));
    closeModal();
    showToast(`Opened “${d.name}”`, true);
  }

  function commitRename() {
    if (!renaming) return;
    const value = renaming.value.trim();
    if (value) persist(saved.map((d) => (d.id === renaming.id ? { ...d, name: value } : d)));
    setRenaming(null);
  }

  async function shareLink() {
    try {
      const code = await gz64(JSON.stringify({ ...design, venueName: venue.name, flowers: arrangementsIn(design.items.map((i) => i.type)) }));
      const url = `${location.href.split('#')[0]}#d=${code}`;
      try {
        await navigator.clipboard.writeText(url);
        showToast('Share link copied');
      } catch {
        window.prompt('Copy this link', url);
      }
    } catch {
      showToast('Sharing is not supported in this browser');
    }
  }

  async function importFile(file: File) {
    try {
      const raw = JSON.parse(await file.text());
      // Register any arrangements carried in the file first, so pieces that use them survive normalising.
      if (importArrangements(raw?.flowers)) bumpFlowers();
      const clean = normalizeDesign(raw);
      if (!clean) throw new Error('not a design');
      loadDesign(withVenue(clean, typeof raw.venueName === 'string' ? raw.venueName : undefined));
      closeModal();
      showToast('Design imported', true);
    } catch {
      showToast('That file could not be read');
    }
  }

  return (
    <Modal title="Designs" onClose={closeModal}>
      <form
        className="mrow"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input className="inp" style={{ flex: 1, minWidth: 180 }} placeholder="Name this design" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn primary">
          Save design
        </button>
      </form>
      <div className="mrow">
        <button type="button" className="btn" onClick={shareLink}>
          Copy share link
        </button>
        <button
          type="button"
          className="btn"
          onClick={() =>
            downloadText(JSON.stringify({ app: 'venue-studio', ...design, venueName: venue.name, flowers: arrangementsIn(design.items.map((i) => i.type)) }, null, 1), `${slug(venue.name)}.json`, 'application/json')
          }
        >
          Export file
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          Import file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) importFile(f);
          }}
        />
      </div>

      {saved.length ? (
        <div className="dlist scroll max-h-[56vh] overflow-auto">
          {saved.map((d) => (
            <div key={d.id} className="dcard">
              {d.thumb ? <img src={d.thumb} alt="" /> : <div className="ph" />}
              <div className="dm">
                {renaming?.id === d.id ? (
                  <input
                    className="inp"
                    autoFocus
                    aria-label="Design name"
                    value={renaming.value}
                    onChange={(e) => setRenaming({ id: d.id, value: e.target.value })}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setRenaming(null);
                      }
                    }}
                  />
                ) : (
                  <b>{d.name}</b>
                )}
                <small>
                  {d.venueName} · {new Date(d.date).toLocaleDateString()}
                </small>
                <div className="mrow">
                  <button type="button" className="btn" onClick={() => open(d)}>
                    Open
                  </button>
                  <button type="button" className="btn" onClick={() => setRenaming({ id: d.id, value: d.name })}>
                    Rename
                  </button>
                  {confirmDelete === d.id ? (
                    <button
                      type="button"
                      className="btn on"
                      autoFocus
                      onClick={() => {
                        persist(saved.filter((x) => x.id !== d.id));
                        setConfirmDelete(null);
                      }}
                      onBlur={() => setConfirmDelete(null)}
                    >
                      Confirm
                    </button>
                  ) : (
                    <button type="button" className="btn" onClick={() => setConfirmDelete(d.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">No saved designs yet. Saved designs stay in this browser; use Export file or a share link to move them.</p>
      )}
    </Modal>
  );
}
