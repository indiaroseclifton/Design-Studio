import type * as THREE from 'three';

interface CaptureCtx {
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
}

let ctx: CaptureCtx | null = null;

export function registerCapture(c: CaptureCtx | null) {
  ctx = c;
}

/**
 * Copy the last finished frame (post-processing included) into a canvas of the requested size, cover-cropped.
 * The studio renderer keeps its drawing buffer, so the frame is still there to read.
 */
export function captureScene(w?: number, h?: number, type = 'image/png', quality?: number): string | null {
  if (!ctx) return null;
  const src = ctx.gl.domElement;
  const outW = w ?? src.width,
    outH = h ?? src.height;
  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const c2d = out.getContext('2d');
  if (!c2d) return null;
  const scale = Math.max(outW / src.width, outH / src.height);
  const sw = outW / scale,
    sh = outH / scale;
  c2d.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, outW, outH);
  return out.toDataURL(type, quality);
}

export function downloadUrl(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadText(text: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  downloadUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const slug = (s: string) => s.replace(/\W+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'design';
