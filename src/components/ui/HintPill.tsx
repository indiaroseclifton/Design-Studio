export function HintPill() {
  return (
    <div
      className="glass chrome fixed left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] opacity-70"
      style={{ bottom: 130 }}
    >
      Click a piece to place it · drag to move · Shift-click to multi-select · Q/E rotate · D duplicate · Del removes · Ctrl+Z undo
    </div>
  );
}
