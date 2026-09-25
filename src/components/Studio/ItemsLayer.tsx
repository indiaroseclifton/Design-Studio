import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { ITEMS, itemGroup } from '../../engine/catalogue';
import { disposeObject3D } from '../../three/utils';
import { placement } from '../../lib/designOps';
import { useDesignStore } from '../../store/designStore';
import type { Design, PlacedItem } from '../../types';
import { paperFontsVersion, subscribePaper, syncPaper } from '../../stationery/paperArt';

/** Pieces printed from the Stationery Studio's suite: rebuilt when the suite changes. */
const PAPER_TYPES = new Set(['placecard', 'tablenum', 'easel', 'menu_card', 'seating_chart']);

/** Everything that changes how a piece is *built* (as opposed to where it sits). */
function buildKey(d: Design, it: PlacedItem, paper: string) {
  const def = ITEMS[it.type];
  return JSON.stringify([
    PAPER_TYPES.has(it.type) ? paper : 0,
    it.type,
    def.pal === false ? '' : it.pal,
    it.pal === 'custom' ? d.customPalette : 0,
    it.seed,
    d.table.mode,
    it.text ?? '',
    it.o ?? 0,
    it.t,
  ]);
}

interface Built {
  key: string;
  g: THREE.Group;
}

const selM = new THREE.MeshBasicMaterial({ color: '#fff4dc', transparent: true, opacity: 0.9, depthWrite: false });
const ringGeo = new THREE.RingGeometry(1, 1.07, 72);

/**
 * All placed pieces. Kept imperative: a design can hold hundreds of pieces, so each is built once
 * (keyed by its build inputs) and only its transform is updated when it moves.
 */
export function ItemsLayer({ rootRef }: { rootRef: React.MutableRefObject<THREE.Group | null> }) {
  const design = useDesignStore((s) => s.design);
  const selection = useDesignStore((s) => s.selection);
  const root = useMemo(() => Object.assign(new THREE.Group(), { name: 'design-items' }), []);
  const rings = useMemo(() => new THREE.Group(), []);
  const cache = useRef(new Map<string, Built>());

  useEffect(() => {
    rootRef.current = root;
    return () => {
      rootRef.current = null;
    };
  }, [root, rootRef]);

  const fonts = useSyncExternalStore(subscribePaper, paperFontsVersion);
  useLayoutEffect(() => {
    const paper = syncPaper(design) + fonts;
    const seen = new Set<string>();
    for (const it of design.items) {
      if (!ITEMS[it.type]) continue;
      seen.add(it.id);
      const key = buildKey(design, it, paper);
      let b = cache.current.get(it.id);
      if (!b || b.key !== key) {
        if (b) {
          root.remove(b.g);
          disposeObject3D(b.g);
        }
        const g = itemGroup(it.type, it.pal, it.seed, design.table.mode, { text: it.text, o: it.o, tnum: (it.t >= 0 ? it.t : 0) + 1 }, design.customPalette);
        g.userData.itemId = it.id;
        root.add(g);
        b = { key, g };
        cache.current.set(it.id, b);
      }
      const p = placement(design, it);
      b.g.position.set(p.x, p.y, p.z);
      b.g.rotation.y = p.ry;
      b.g.visible = p.visible;
    }
    for (const [id, b] of cache.current)
      if (!seen.has(id)) {
        root.remove(b.g);
        disposeObject3D(b.g);
        cache.current.delete(id);
      }
  }, [design, root, fonts]);

  useEffect(
    () => () => {
      for (const b of cache.current.values()) disposeObject3D(b.g);
      cache.current.clear();
    },
    [],
  );

  // Selection rings sized to each selected piece's footprint (all mirrored copies light up together).
  useLayoutEffect(() => {
    rings.clear();
    const ids = selection?.k === 'item' ? [selection.id] : selection?.k === 'multi' ? selection.ids : [];
    const sel = design.items.filter((i) => ids.includes(i.id));
    const withLinked = design.mirror ? design.items.filter((i) => sel.some((s) => s.id === i.id || (s.link && s.link === i.link))) : sel;
    for (const it of withLinked) {
      const p = placement(design, it);
      if (!p.visible) continue;
      const r = new THREE.Mesh(ringGeo, selM);
      r.rotation.x = -Math.PI / 2;
      const s = Math.max(0.12, ITEMS[it.type].fp * 1.15);
      r.scale.setScalar(s);
      r.position.set(p.x, p.y + 0.012, p.z);
      rings.add(r);
    }
  }, [design, selection, rings]);

  return (
    <>
      <primitive object={root} />
      <primitive object={rings} />
    </>
  );
}
