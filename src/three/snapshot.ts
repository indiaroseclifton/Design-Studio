let canvasEl: HTMLCanvasElement | null = null;

export function registerSceneCanvas(el: HTMLCanvasElement | null) {
  canvasEl = el;
}

export function captureSceneSnapshot(): string | null {
  if (!canvasEl) return null;
  try {
    return canvasEl.toDataURL('image/png');
  } catch {
    return null;
  }
}
