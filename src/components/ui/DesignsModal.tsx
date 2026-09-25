import { useRef, useState } from 'react';
import { useDesignStore } from '../../store/designStore';
import { downloadText } from '../../lib/download';
import { VENUES } from '../../data/venues';
import type { Design } from '../../types';
import { Modal } from './Modal';

function isDesign(value: unknown): value is Design {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  return typeof d.venue === 'number' && Array.isArray(d.items) && typeof d.table === 'object';
}

export function DesignsModal() {
  const design = useDesignStore((s) => s.design);
  const savedDesigns = useDesignStore((s) => s.savedDesigns);
  const saveDesign = useDesignStore((s) => s.saveDesign);
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const renameDesign = useDesignStore((s) => s.renameDesign);
  const deleteDesign = useDesignStore((s) => s.deleteDesign);
  const importDesign = useDesignStore((s) => s.importDesign);
  const showToast = useDesignStore((s) => s.showToast);
  const closeModal = useDesignStore((s) => s.closeModal);

  const [name, setName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    saveDesign(name || `${VENUES[design.venue]?.name ?? 'Design'} — ${new Date().toLocaleDateString()}`);
    setName('');
  }

  function handleExport() {
    downloadText(JSON.stringify(design, null, 2), 'design.json', 'application/json');
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isDesign(parsed)) throw new Error('not a design');
      importDesign(parsed);
      closeModal();
    } catch {
      showToast('That file is not a valid design export');
    }
  }

  return (
    <Modal title="Designs" onClose={closeModal} wide>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="inp flex-1"
          style={{ minWidth: 200 }}
          placeholder="Name this design…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="button" className="btn primary" onClick={handleSave}>
          Save current design
        </button>
        <button type="button" className="btn" onClick={handleExport}>
          Export JSON
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {savedDesigns.length === 0 ? (
        <div className="px-1 py-6 text-center text-[13px] opacity-60">No saved designs yet — save the one you're working on above.</div>
      ) : (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
          {savedDesigns.map((d) => (
            <div key={d.id} className="flex flex-col overflow-hidden rounded-[10px]" style={{ border: '1px solid rgba(255,240,220,.1)', background: 'rgba(0,0,0,.2)' }}>
              <div
                className="aspect-[16/10] bg-cover bg-center"
                style={{
                  background: d.thumbnail
                    ? `url(${d.thumbnail}) center/cover`
                    : `linear-gradient(135deg, ${VENUES[d.design.venue]?.env.sky[0] ?? '#333'}, ${VENUES[d.design.venue]?.env.sky[1] ?? '#111'})`,
                }}
              />
              <div className="flex flex-col gap-1.5 p-2.5">
                {renamingId === d.id ? (
                  <input
                    className="inp"
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        renameDesign(d.id, renameValue);
                        setRenamingId(null);
                      }
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onBlur={() => {
                      renameDesign(d.id, renameValue);
                      setRenamingId(null);
                    }}
                  />
                ) : (
                  <b className="truncate text-[13.5px] font-medium">{d.name}</b>
                )}
                <small className="text-[11px] opacity-60">{new Date(d.savedAt).toLocaleString()}</small>
                <div className="flex gap-1.5">
                  <button type="button" className="btn flex-1 text-[11.5px]" onClick={() => loadDesign(d.id)}>
                    Load
                  </button>
                  <button
                    type="button"
                    className="btn flex-1 text-[11.5px]"
                    onClick={() => {
                      setRenamingId(d.id);
                      setRenameValue(d.name);
                    }}
                  >
                    Rename
                  </button>
                  <button type="button" className="btn flex-1 text-[11.5px]" onClick={() => deleteDesign(d.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
