import * as THREE from 'three';

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
 * Where a screen point lands in the studio: the world x/z on the floor (or on a table top), and the id of
 * the placed piece under it, if any. Used when a catalogue card is dropped onto the scene.
 */
export function pickWorld(clientX: number, clientY: number): { x: number; z: number; itemId?: string } | null {
  if (!ctx) return null;
  const r = ctx.gl.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, ctx.camera);
  const targets = ['design-items', 'design-tables'].map((n) => ctx!.scene.getObjectByName(n)).filter((o): o is THREE.Object3D => !!o);
  const hit = ray.intersectObjects(targets, true)[0];
  if (hit) {
    let o: THREE.Object3D | null = hit.object,
      itemId: string | undefined;
    while (o && !itemId) {
      itemId = o.userData.itemId;
      o = o.parent;
    }
    return { x: hit.point.x, z: hit.point.z, itemId };
  }
  const p = new THREE.Vector3();
  return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? { x: p.x, z: p.z } : null;
}

/** The live studio scene, for exporters (AR) that need the built tables and pieces. */
export const liveScene = () => ctx?.scene ?? null;

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

/**
 * Render the live studio scene from a given viewpoint into a still image, without moving the studio camera.
 * The frame is drawn into a corner of the studio canvas (covered by whatever overlay asked for it) and copied
 * out straight away, so it passes through the renderer's own tone mapping.
 */
export function renderStill(pos: [number, number, number], target: [number, number, number], w: number, h: number, type = 'image/jpeg', quality = 0.9): string | null {
  if (!ctx) return null;
  const { gl, scene } = ctx;
  const buf = gl.getDrawingBufferSize(new THREE.Vector2());
  const k = Math.min(1, buf.x / w, buf.y / h);
  const pw = Math.floor(w * k),
    ph = Math.floor(h * k);
  const pr = gl.getPixelRatio();
  const fov = ctx.camera instanceof THREE.PerspectiveCamera ? ctx.camera.fov : 45;
  const cam = new THREE.PerspectiveCamera(fov, w / h, 0.05, 400);
  cam.position.set(...pos);
  cam.lookAt(...target);
  const vp = new THREE.Vector4(),
    sc = new THREE.Vector4(),
    scTest = gl.getScissorTest(),
    clip = gl.clippingPlanes;
  gl.getViewport(vp);
  gl.getScissor(sc);
  try {
    gl.clippingPlanes = [];
    gl.setViewport(0, 0, pw / pr, ph / pr);
    gl.setScissor(0, 0, pw / pr, ph / pr);
    gl.setScissorTest(true);
    gl.render(scene, cam);
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    out.getContext('2d')!.drawImage(gl.domElement, 0, buf.y - ph, pw, ph, 0, 0, w, h);
    return out.toDataURL(type, quality);
  } catch (e) {
    console.warn('renderStill', e);
    return null;
  } finally {
    gl.clippingPlanes = clip;
    gl.setViewport(vp);
    gl.setScissor(sc);
    gl.setScissorTest(scTest);
  }
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
