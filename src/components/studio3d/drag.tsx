import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Hit, Picker } from './StudioViewer';

/*
 * Dragging from the side panel into the 3D view. The same tile still works as a button: a click (or a
 * tap) adds automatically, a drag drops the piece exactly where it's let go. Mouse and pen drags start
 * after a few pixels; on touch, press and hold to pick a piece up, so the list still scrolls normally.
 */

interface Ghost {
  x: number;
  y: number;
  label: string;
  colour?: string;
  over: boolean;
}

/** How long a touch is held, in ms, before it picks a piece up. */
const HOLD = 380;

export function usePaletteDrag<T>(picker: React.RefObject<Picker | null>, onDrop: (item: T, hit: Hit) => void, onMiss?: () => void) {
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const suppress = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);
  const cb = useRef({ onDrop, onMiss });
  useEffect(() => {
    cb.current = { onDrop, onMiss };
  });
  useEffect(() => () => cleanup.current?.(), []);

  function start(e: React.PointerEvent, item: T, label: string, colour?: string) {
    if (e.button !== 0) return;
    cleanup.current?.();
    const x0 = e.clientX,
      y0 = e.clientY,
      touch = e.pointerType === 'touch',
      t0 = e.timeStamp;
    let dragging = false,
      moved = false,
      armed = !touch,
      timer = 0;
    const begin = (x: number, y: number) => {
      dragging = true;
      document.body.classList.add('fs-dragging');
      setGhost({ x, y, label, colour, over: !!picker.current?.hover(x, y) });
    };
    if (touch)
      timer = window.setTimeout(() => {
        armed = true;
        begin(x0, y0);
        navigator.vibrate?.(12);
      }, HOLD);
    const move = (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) moved = true;
      if (!dragging) {
        const d = Math.hypot(ev.clientX - x0, ev.clientY - y0);
        if (!armed) {
          // A touch that moves before the hold is a scroll, not a drag.
          if (d > 8) stop();
          return;
        }
        if (d < 6) return;
        begin(ev.clientX, ev.clientY);
      }
      setGhost((g) => g && { ...g, x: ev.clientX, y: ev.clientY, over: !!picker.current?.hover(ev.clientX, ev.clientY) });
    };
    const up = (ev: PointerEvent) => {
      // A quick, still touch is a tap even if the hold timer got in first (a busy page can run it late).
      const tap = touch && !moved && ev.timeStamp - t0 < HOLD;
      if (dragging && !tap) {
        suppress.current = true;
        setTimeout(() => (suppress.current = false), 0);
        const hit = ev.type === 'pointerup' ? (picker.current?.drop(ev.clientX, ev.clientY) ?? null) : null;
        picker.current?.clear();
        if (hit) cb.current.onDrop(item, hit);
        else if (ev.type === 'pointerup') cb.current.onMiss?.();
      }
      stop();
    };
    // While a touch drag is on, the page mustn't scroll under the finger.
    const noScroll = (ev: TouchEvent) => {
      if (dragging) ev.preventDefault();
    };
    function stop() {
      clearTimeout(timer);
      document.body.classList.remove('fs-dragging');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('touchmove', noScroll);
      setGhost(null);
      cleanup.current = null;
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('touchmove', noScroll, { passive: false });
    cleanup.current = stop;
  }

  /** Props for a tile that can be clicked (automatic placement) or dragged (free placement). */
  const bind = (item: T, label: string, colour?: string) => ({
    onPointerDown: (e: React.PointerEvent) => start(e, item, label, colour),
    // The click that ends a drag isn't a click.
    onClickCapture: (e: React.MouseEvent) => {
      if (suppress.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
  });

  const layer: ReactNode = ghost
    ? createPortal(
        <div className={`fs-ghost ${ghost.over ? 'over' : ''}`} style={{ left: ghost.x, top: ghost.y }} aria-hidden>
          {ghost.colour && <i style={{ background: ghost.colour }} />}
          <span>{ghost.over ? `Drop ${ghost.label.toLowerCase()} here` : ghost.label}</span>
        </div>,
        document.body,
      )
    : null;

  return { bind, layer, dragging: !!ghost };
}
