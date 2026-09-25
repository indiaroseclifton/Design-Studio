export function HintPill() {
  return (
    <div
      className="glass fixed left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] opacity-70"
      style={{ bottom: 130 }}
    >
      Click a catalogue piece to place it · Select a piece to rotate, duplicate or remove it · Ctrl+Z undo
    </div>
  );
}
