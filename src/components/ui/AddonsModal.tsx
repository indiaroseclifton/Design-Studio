import { ADDON_PACKS } from '../../data/addonPacks';
import { useDesignStore } from '../../store/designStore';
import { Modal } from './Modal';

export function AddonsModal() {
  const packsOn = useDesignStore((s) => s.packsOn);
  const togglePack = useDesignStore((s) => s.togglePack);
  const closeModal = useDesignStore((s) => s.closeModal);

  return (
    <Modal title="Add-ons" onClose={closeModal}>
      <p className="text-[12.5px] leading-[1.5] opacity-70">
        Switch on a pack to reveal its pieces in the catalogue, under their own category chip.
      </p>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        {ADDON_PACKS.map((pack) => {
          const on = packsOn.includes(pack.id);
          return (
            <label
              key={pack.id}
              className="flex cursor-pointer items-start gap-2.5 rounded-[10px] p-2.5"
              style={{
                border: `1px solid ${on ? 'rgba(243,217,164,.55)' : 'rgba(255,240,220,.12)'}`,
                background: on ? 'rgba(243,217,164,.08)' : 'rgba(0,0,0,.18)',
              }}
            >
              <input type="checkbox" checked={on} onChange={() => togglePack(pack.id)} className="mt-0.5 accent-[var(--ac)]" />
              <span>
                <b className="block text-[13px] font-medium">{pack.name}</b>
                <small className="mt-0.5 block text-[11.5px] leading-[1.35] opacity-65">{pack.desc}</small>
              </span>
            </label>
          );
        })}
      </div>
    </Modal>
  );
}
