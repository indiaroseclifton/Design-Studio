import { ITEMS, PACKS } from '../../engine/catalogue';
import { useDesignStore } from '../../store/designStore';
import { Modal } from './Modal';

export function AddonsModal() {
  const packsOn = useDesignStore((s) => s.packsOn);
  const setPackOn = useDesignStore((s) => s.setPackOn);
  const setPacks = useDesignStore((s) => s.setPacks);
  const closeModal = useDesignStore((s) => s.closeModal);

  return (
    <Modal title="Add-on packs" onClose={closeModal}>
      <p className="note m-0">
        Switch on only what this event needs. Each pack adds its own tab to the catalogue; switching a pack off hides the tab but keeps anything
        already placed.
      </p>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        {PACKS.map((p) => {
          const on = packsOn.includes(p.id);
          const count = Object.values(ITEMS).filter((d) => d.cat === p.id).length;
          return (
            <label
              key={p.id}
              className="flex cursor-pointer gap-2.5 rounded-[10px] p-3 transition-colors"
              style={{
                border: `1px solid ${on ? 'var(--ac)' : 'var(--hairline)'}`,
                background: on ? 'rgba(var(--acr),.1)' : 'rgba(0,0,0,.18)',
              }}
            >
              <input type="checkbox" className="mt-0.5" style={{ accentColor: 'var(--ac)' }} checked={on} onChange={(e) => setPackOn(p.id, e.target.checked)} />
              <span className="flex flex-col gap-1">
                <b className="text-[13px] font-medium">{p.name}</b>
                <small className="text-[11.5px] leading-[1.4] opacity-65">{p.desc}</small>
                <small className="tag">
                  {count} new piece{count === 1 ? '' : 's'}
                  {p.also?.length ? ` · ${p.also.length} from the catalogue` : ''}
                </small>
              </span>
            </label>
          );
        })}
      </div>
      <div className="mrow">
        <button type="button" className="btn" onClick={() => setPacks(PACKS.map((p) => p.id))}>
          All on
        </button>
        <button type="button" className="btn" onClick={() => setPacks([])}>
          All off
        </button>
      </div>
    </Modal>
  );
}
