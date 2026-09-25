import type { ReactNode } from 'react';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-auto px-4 pb-6 pt-[112px]" style={{ background: 'rgba(10,8,6,.55)' }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass flex w-[min(780px,100%)] flex-col gap-3.5 p-5"
        style={{ background: 'var(--modal-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="serif text-[30px] leading-none">{title}</h2>
          <button type="button" className="px-1 text-[24px] leading-none opacity-60 hover:opacity-100" title="Close (Esc)" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
