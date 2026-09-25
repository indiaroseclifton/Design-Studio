import type { ReactNode } from 'react';

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-6" style={{ background: 'rgba(10,8,6,.55)' }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass flex max-h-full flex-col"
        style={{ width: wide ? 'min(920px, 100%)' : 'min(780px, 100%)', background: 'var(--modal-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--hairline)' }}>
          <h3 className="serif text-[30px] leading-none">{title}</h3>
          <button type="button" className="px-1 text-[22px] leading-none opacity-60 hover:opacity-100" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="scroll flex flex-col gap-3.5 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}
