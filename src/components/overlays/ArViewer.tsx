import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { liveScene, downloadUrl, slug } from '../../lib/capture';
import { VENUES } from '../../engine/venues.gen';
import { useDesignStore } from '../../store/designStore';

/*
 * AR viewer (handoff §5): the tables and pieces, or the selected piece(s), exported to GLB and shown in
 * <model-viewer>, which hands off to WebXR, Scene Viewer (Android) or Quick Look (iOS).
 * model-viewer is loaded from the CDN on first use, as in the prototype: it bundles its own three.js, so
 * it stays out of the app bundle.
 */

const MV_URL = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js';

type MV = HTMLElement & { canActivateAR?: boolean; activateAR?: () => void; src?: string };

/** Bake instanced meshes into plain meshes with vertex colours, since GLB viewers don't all do instancing. */
function flatten(root: THREE.Object3D) {
  const out = new THREE.Group();
  root.updateMatrixWorld(true);
  const keep = ['position', 'normal', 'uv'];
  root.traverse((o) => {
    if (!o.visible) return;
    if (o instanceof THREE.InstancedMesh) {
      const n = o.count;
      if (!n) return;
      // Stay indexed: shared vertices keep the file several times smaller.
      const base = o.geometry.clone();
      for (const k of Object.keys(base.attributes)) if (!keep.includes(k)) base.deleteAttribute(k);
      if (!base.attributes.uv) base.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(base.attributes.position.count * 2), 2));
      const parts: THREE.BufferGeometry[] = [],
        m = new THREE.Matrix4(),
        c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        o.getMatrixAt(i, m);
        const gg = base.clone();
        gg.applyMatrix4(new THREE.Matrix4().multiplyMatrices(o.matrixWorld, m));
        if (o.instanceColor) o.getColorAt(i, c);
        else c.set(1, 1, 1);
        const col = new Float32Array(gg.attributes.position.count * 3);
        for (let k = 0; k < col.length; k += 3) {
          col[k] = c.r;
          col[k + 1] = c.g;
          col[k + 2] = c.b;
        }
        gg.setAttribute('color', new THREE.BufferAttribute(col, 3));
        parts.push(gg);
      }
      base.dispose();
      const geo = mergeGeometries(parts, false);
      parts.forEach((p) => p.dispose());
      if (!geo) return;
      const mat = (Array.isArray(o.material) ? o.material[0] : o.material).clone() as THREE.MeshStandardMaterial;
      mat.vertexColors = true;
      if (mat.color) mat.color.set('#fff');
      out.add(new THREE.Mesh(geo, mat));
    } else if (o instanceof THREE.Mesh) {
      const mm = new THREE.Mesh(o.geometry, o.material);
      o.matrixWorld.decompose(mm.position, mm.quaternion, mm.scale);
      out.add(mm);
    }
  });
  return out;
}

async function exportGlb(ids: string[] | null, scale: number): Promise<Blob | null> {
  const scene = liveScene();
  if (!scene) return null;
  const targets: THREE.Object3D[] = [];
  if (ids) scene.getObjectByName('design-items')?.children.forEach((c) => ids.includes(c.userData.itemId) && targets.push(c));
  else for (const n of ['design-tables', 'design-items']) {
    const g = scene.getObjectByName(n);
    if (g) targets.push(g);
  }
  // Flattening copies geometry out of the live scene in world space; the scene itself is untouched.
  const flat = new THREE.Group();
  for (const t of targets) flat.add(flatten(t));
  const bb = new THREE.Box3().setFromObject(flat);
  if (bb.isEmpty()) return null;
  const ctr = bb.getCenter(new THREE.Vector3());
  const w = new THREE.Group();
  flat.position.set(-ctr.x, -bb.min.y, -ctr.z);
  w.add(flat);
  w.scale.setScalar(scale);
  const buf = (await new GLTFExporter().parseAsync(w, { binary: true, onlyVisible: true, maxTextureSize: 1024 })) as ArrayBuffer;
  return new Blob([buf], { type: 'model/gltf-binary' });
}

export function ArViewer() {
  const close = useDesignStore((s) => s.closeOverlay);
  const venue = useDesignStore((s) => s.design.venue);
  // The selection when the viewer opened decides whether "Selected piece" is available.
  const [selIds] = useState<string[] | null>(() => {
    const s = useDesignStore.getState().selection;
    return s?.k === 'item' ? [s.id] : s?.k === 'multi' ? s.ids : null;
  });
  const [what, setWhat] = useState<'all' | 'sel'>(selIds ? 'sel' : 'all');
  const [scale, setScale] = useState(1);
  const [wait, setWait] = useState<string | null>('Preparing your design for AR…');
  const [note, setNote] = useState('');
  const [canAR, setCanAR] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [size, setSize] = useState('');
  const [mvReady, setMvReady] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const mv = useRef<MV | null>(null);

  // Load model-viewer and create the element once. The export below doesn't wait for it, so the design
  // can still be downloaded as a .glb if the viewer can't load.
  useEffect(() => {
    let dead = false;
    (async () => {
      if (!customElements.get('model-viewer')) {
        try {
          await import(/* @vite-ignore */ MV_URL);
        } catch {
          if (!dead) {
            setWait(null);
            setNote('The 3D viewer couldn’t load (check your connection). You can still download the design as a .glb file.');
          }
          return;
        }
      }
      if (dead || !host.current) return;
      const el = document.createElement('model-viewer') as MV;
      for (const [k, v] of Object.entries({ 'camera-controls': '', ar: '', 'shadow-intensity': '1', 'auto-rotate': '', 'touch-action': 'pan-y', 'ar-modes': 'webxr scene-viewer quick-look', 'ar-placement': 'floor', 'environment-image': 'neutral', exposure: '1.05' }))
        el.setAttribute(k, v);
      el.style.width = el.style.height = '100%';
      el.style.setProperty('--poster-color', 'transparent');
      el.addEventListener('load', () => {
        setWait(null);
        const can = !!el.canActivateAR;
        setCanAR(can);
        setNote(
          can
            ? 'Point your camera at the floor, then tap to place. Pinch to rotate the model; the tabletop model can also be resized.'
            : 'AR needs a phone or tablet. Open this page on an ARCore Android device or an iPhone or iPad to place the design in your room. Here you can orbit the model and download it.',
        );
      });
      host.current.appendChild(el);
      mv.current = el;
      setMvReady(true);
    })();
    return () => {
      dead = true;
    };
  }, []);

  // Export whenever the choice changes.
  useEffect(() => {
    let dead = false;
    exportGlb(what === 'sel' ? selIds : null, scale)
      .then((blob) => {
        if (dead) return;
        if (!blob) {
          setWait(what === 'sel' ? 'Select a piece in the studio first.' : 'Add some pieces to your design first.');
          setUrl(null);
          return;
        }
        setUrl(URL.createObjectURL(blob));
        setSize((blob.size / 1048576).toFixed(1));
        // Without a viewer there's nothing more to wait for; with one, its load event clears the message.
        if (!mv.current) setWait(null);
      })
      .catch((e) => {
        console.error(e);
        if (!dead) setWait('Couldn’t prepare this design for AR.');
      });
    return () => {
      dead = true;
    };
  }, [what, scale, selIds]);

  // Hand the latest export to the viewer; revoke each URL once it's replaced.
  useEffect(() => {
    const el = mv.current;
    if (url && el && mvReady) {
      el.setAttribute('ar-scale', scale === 1 ? 'fixed' : 'auto');
      el.setAttribute('src', url);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url, mvReady, scale]);

  return (
    <div className="ar-root" role="dialog" aria-label="Augmented reality">
      <div ref={host} className="absolute inset-0" />
      {wait && <div className="ar-wait">{wait}</div>}
      <div className="ar-top">
        <div>
          <div className="lbl">Augmented reality</div>
          <h3 className="serif">Your design, in your space</h3>
          {note && <p>{note}</p>}
        </div>
        <button type="button" className="fs-x ar-x" aria-label="Close" onClick={close}>
          ×
        </button>
      </div>
      <div className="ar-bar glass">
        <div className="seg" role="radiogroup" aria-label="Scale">
          {(
            [
              [1, 'Life-size'],
              [0.1, 'Tabletop model 1:10'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={scale === v} className={scale === v ? 'on' : ''} onClick={() => (setWait('Preparing your design for AR…'), setScale(v))}>
              {l}
            </button>
          ))}
        </div>
        <div className="seg" role="radiogroup" aria-label="Show">
          {(
            [
              ['all', 'Whole design'],
              ['sel', 'Selected piece'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={what === v} disabled={v === 'sel' && !selIds} className={what === v ? 'on' : ''} onClick={() => (setWait('Preparing your design for AR…'), setWhat(v))}>
              {l}
            </button>
          ))}
        </div>
        <button type="button" className="btn" disabled={!url} onClick={() => url && downloadUrl(url, `${slug(VENUES[venue]?.name ?? 'design')}.glb`)}>
          Download .glb{size && ` (${size} MB)`}
        </button>
        <button type="button" className="btn primary" disabled={!canAR} onClick={() => mv.current?.activateAR?.()}>
          View in your room
        </button>
      </div>
    </div>
  );
}
