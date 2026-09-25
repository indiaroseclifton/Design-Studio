import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { ITEMS, canStack } from '../../engine/catalogue';
import { hasTbl, topY } from '../../engine/studio';
import { clampIt, hL, hostOf, linked, nearestTable, placement, surfY, tLocal, worldOf } from '../../lib/designOps';
import { useDesignStore } from '../../store/designStore';
import type { Design, PlacedItem, Selection } from '../../types';

interface ItemDrag {
  id: string;
  /** ids moved together (a multi-selection), or null for a single piece */
  grp: string[] | null;
  sx: number;
  sz: number;
  offx: number;
  offz: number;
  orig: Array<{ id: string; wx: number; wz: number }>;
  started: boolean;
}

const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitP = new THREE.Vector3();
const hostPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hostP = new THREE.Vector3();

/** The host surface under the pointer, in its local coordinates. */
function hostAt(S: Design, ex: PlacedItem | null) {
  let best: { h: PlacedItem; lx: number; lz: number } | null = null,
    bd = 1e9;
  for (const h of S.items) {
    const tp = ITEMS[h.type]?.top;
    if (!tp || h.id === ex?.id || h.on === ex?.id) continue;
    const p = placement(S, h);
    if (!p.visible) continue;
    hostPlane.constant = -(surfY(S, h) + tp.h);
    if (!ray.ray.intersectPlane(hostPlane, hostP)) continue;
    const [lx, lz] = hL({ ...h, x: p.x, z: p.z, ry: p.ry }, hostP.x, hostP.z);
    const ok = tp.r ? Math.hypot(lx, lz) <= tp.r * 1.25 : Math.abs(lx) <= tp.w! * 0.62 && Math.abs(lz) <= tp.d! * 0.65;
    if (!ok) continue;
    const dd = ray.ray.origin.distanceTo(hostP);
    if (dd < bd) {
      bd = dd;
      best = { h, lx, lz };
    }
  }
  return best;
}

export function Interaction({ itemsRoot }: { itemsRoot: React.MutableRefObject<THREE.Group | null> }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null;

  useEffect(() => {
    const canvas = gl.domElement;
    let drag: ItemDrag | null = null;
    let tdrag: { idx: number; offx: number; offz: number; started: boolean } | null = null;
    let down: { x: number; y: number; hit: boolean } | null = null;
    const store = useDesignStore.getState;

    const setPtr = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
    };
    const pickItem = (): PlacedItem | null => {
      const root = itemsRoot.current;
      if (!root) return null;
      const S = store().design;
      for (const h of ray.intersectObjects(root.children, true)) {
        let o: THREE.Object3D | null = h.object;
        while (o && !o.userData.itemId) o = o.parent;
        if (o && o.visible) return S.items.find((i) => i.id === o!.userData.itemId) ?? null;
      }
      return null;
    };
    const pickTable = (): Selection => {
      const hits = ray.intersectObjects(scene.children, true);
      for (const h of hits) {
        let o: THREE.Object3D | null = h.object;
        while (o && !o.userData.pick) o = o.parent;
        if (!o) continue;
        return o.userData.pick === 'table' ? { k: 'table', idx: o.userData.tableIdx } : { k: 'chairs' };
      }
      return null;
    };
    const snapv = (v: number, s: number) => (store().snapOn ? Math.round(v / s) * s : v);
    const setControls = (on: boolean) => {
      if (controls) controls.enabled = on;
    };

    function onDown(e: PointerEvent) {
      if (e.button !== 0) return;
      setPtr(e);
      const st = store();
      const it = pickItem();
      down = { x: e.clientX, y: e.clientY, hit: !!it };
      if (it) {
        if (e.shiftKey) {
          st.toggleMulti(it.id);
          return;
        }
        const grp = st.selection?.k === 'multi' && st.selection.ids.includes(it.id) ? st.selection.ids : null;
        if (!grp) st.select({ k: 'item', id: it.id });
        const d = ITEMS[it.type];
        if (d.lock && !grp) return;
        setControls(false);
        const S = st.design;
        dragPlane.constant = -(grp ? 0 : it.on ? surfY(S, it) : d.surf === 'floor' ? 0 : d.surf === 'hang' ? surfY(S, it) : topY(S.table));
        if (ray.ray.intersectPlane(dragPlane, hitP)) {
          const w = worldOf(S, it);
          const ids = grp ?? [it.id];
          drag = {
            id: it.id,
            grp,
            sx: hitP.x,
            sz: hitP.z,
            offx: w[0] - hitP.x,
            offz: w[1] - hitP.z,
            orig: ids.map((id) => {
              const i = S.items.find((x) => x.id === id)!;
              const ww = worldOf(S, i);
              return { id, wx: ww[0], wz: ww[1] };
            }),
            started: false,
          };
        }
        canvas.style.cursor = 'grabbing';
        return;
      }
      if (st.planView) {
        const tp = pickTable();
        if (tp?.k === 'table') {
          setControls(false);
          dragPlane.constant = 0;
          if (ray.ray.intersectPlane(dragPlane, hitP)) {
            const T = st.design.tables[tp.idx];
            tdrag = { idx: tp.idx, offx: T.x - hitP.x, offz: T.z - hitP.z, started: false };
            st.select(tp);
          }
        }
      }
    }

    function onMove(e: PointerEvent) {
      setPtr(e);
      const st = store();
      if (tdrag) {
        if (!ray.ray.intersectPlane(dragPlane, hitP)) return;
        if (!tdrag.started) {
          st.beginGesture();
          tdrag.started = true;
        }
        const { idx, offx, offz } = tdrag;
        st.live((S) => {
          const T = S.tables[idx];
          T.x = snapv(hitP.x + offx, 0.25);
          T.z = snapv(hitP.z + offz, 0.25);
        });
        return;
      }
      if (drag) {
        if (!ray.ray.intersectPlane(dragPlane, hitP)) return;
        if (!drag.started) {
          if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) return;
          st.beginGesture();
          drag.started = true;
        }
        const D = drag;
        if (D.grp) {
          const dx = hitP.x - D.sx,
            dz = hitP.z - D.sz;
          st.live((S) => {
            for (const o of D.orig) {
              const i = S.items.find((x) => x.id === o.id);
              if (!i) continue;
              const d = ITEMS[i.type],
                H = hostOf(S, i);
              if (H) {
                if (!D.grp!.includes(H.id)) {
                  const hp = placement(S, H);
                  [i.x, i.z] = hL({ ...H, x: hp.x, z: hp.z, ry: hp.ry }, o.wx + dx, o.wz + dz);
                }
              } else if (d.surf === 'table') [i.x, i.z] = tLocal(S, i.t, o.wx + dx, o.wz + dz);
              else {
                i.x = snapv(o.wx + dx, 0.25);
                i.z = snapv(o.wz + dz, 0.25);
              }
            }
          });
          return;
        }
        const wx = hitP.x + D.offx,
          wz = hitP.z + D.offz;
        st.live((S) => {
          const it = S.items.find((x) => x.id === D.id);
          if (!it) return;
          const d = ITEMS[it.type];
          const hh = canStack(d) ? hostAt(S, it) : null;
          if (hh) {
            if (it.on !== hh.h.id) {
              it.link = undefined;
              it.on = hh.h.id;
              it.t = -1;
            }
            it.x = snapv(hh.lx, 0.05);
            it.z = snapv(hh.lz, 0.05);
            dragPlane.constant = -surfY(S, it);
            return;
          }
          if (it.on) {
            if (d.surf === 'floor') {
              it.on = undefined;
              dragPlane.constant = 0;
            } else if (hasTbl(S.table.mode)) {
              it.on = undefined;
              it.t = 0;
              dragPlane.constant = -topY(S.table);
            } else return;
          }
          if (d.surf === 'table') {
            if (!(S.mirror && it.link)) it.t = nearestTable(S, wx, wz);
            const [lx, lz] = tLocal(S, it.t, wx, wz),
              sx = snapv(lx, 0.05),
              sz = snapv(lz, 0.05);
            for (const i of linked(S, it)) {
              i.x = sx;
              i.z = sz;
            }
          } else {
            it.x = snapv(wx, 0.25);
            it.z = snapv(wz, 0.25);
          }
        });
        return;
      }
      if (!e.buttons) canvas.style.cursor = pickItem() ? 'grab' : pickTable() ? (st.planView ? 'move' : 'pointer') : '';
    }

    function onUp(e: PointerEvent) {
      const st = store();
      if (tdrag) {
        if (tdrag.started) st.endGesture();
        tdrag = null;
      } else if (drag) {
        if (drag.started) {
          // Settle the dropped piece(s) inside their table / host / room bounds as one undo step.
          const ids = drag.grp ?? [drag.id];
          st.live((S) => {
            for (const id of ids) {
              const it = S.items.find((x) => x.id === id);
              if (!it) continue;
              for (const i of linked(S, it)) clampIt(S, i);
            }
          });
          st.endGesture();
        }
        drag = null;
      } else if (down && !down.hit && e.target === canvas && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) {
        setPtr(e);
        st.select(pickTable());
      }
      setControls(true);
      canvas.style.cursor = '';
      down = null;
    }

    canvas.addEventListener('pointerdown', onDown, true);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown, true);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gl, camera, scene, controls, itemsRoot]);

  return null;
}

