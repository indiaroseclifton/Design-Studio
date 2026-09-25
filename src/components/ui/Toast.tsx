import { useEffect } from 'react';
import { useDesignStore } from '../../store/designStore';

export function Toast() {
  const toast = useDesignStore((s) => s.toast);
  const dismissToast = useDesignStore((s) => s.dismissToast);
  const undo = useDesignStore((s) => s.undo);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismissToast, 3200);
    return () => clearTimeout(t);
  }, [toast, dismissToast]);

  if (!toast) return null;

  return (
    <div className="glass fixed left-1/2 z-[30] flex -translate-x-1/2 items-center gap-2 rounded-full py-1.5 pl-4 pr-2 text-[12.5px]" style={{ bottom: 'calc(var(--strip) + 40px)', maxWidth: 'calc(100vw - 24px)' }}>
      <span>{toast.msg}</span>
      {toast.undoable && (
        <button
          type="button"
          className="link"
          onClick={() => {
            undo();
            dismissToast();
          }}
        >
          Undo
        </button>
      )}
    </div>
  );
}
