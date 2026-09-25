import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Book, CHAPTERS, MAXS, type BookContent } from '../../storybook/book';
import { musicStart, musicStop, setSoundOn, soundOn } from '../../storybook/audio';
import type { Story } from '../../storybook/art';
import { renderStill, liveScene } from '../../lib/capture';
import { presetView } from '../../lib/cameraViews';
import { worldOf } from '../../lib/designOps';
import { envFor } from '../../lib/environment';
import { ITEMS, itemGroup } from '../../engine/catalogue';
import { VENUES } from '../../engine/venues.gen';
import { CHAIRS, CLOTHS, DECOR, OVERLAYS, hasTbl, palOf } from '../../engine/studio';
import { useDesignStore } from '../../store/designStore';
import { menuForCards } from '../../menu/model';
import { firstDanceSong } from '../../music/model';
import { attirePhrase } from '../../attire/model';
import type { Design } from '../../types';

/*
 * Storybook (handoff §3): the design told as a 3D pop-up book in nine chapters. Opening it "prints" five
 * photographs of the current design from the studio's camera presets, fills the pages from the design, and
 * builds miniature pop-ups of the layout and tablescape.
 */

const STORY_KEY = 'vs2_story';
function loadStory(): Story {
  const s: Story = { names: 'Olivia & James', date: '' };
  try {
    Object.assign(s, JSON.parse(localStorage.getItem(STORY_KEY) || '{}'));
  } catch {
    /* ignore */
  }
  return s;
}

function loadImg(url: string | null) {
  return new Promise<HTMLImageElement | undefined>((res) => {
    if (!url) return res(undefined);
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(undefined);
    i.src = url;
  });
}

async function takePhotos(S: Design) {
  const venue = VENUES[S.venue];
  const views: Array<[keyof BookContent['photos'], [number, number, number], [number, number, number]]> = [];
  for (const k of ['wide', 'couple', 'top', 'guest'] as const) {
    const [p, t] = presetView(k, S, venue);
    views.push([k, p, t]);
  }
  const T0 = S.tables[0] || { x: 0, z: 0 };
  if (hasTbl(S.table.mode)) views.push(['close', [T0.x + 1.05, 1.32, T0.z + 1.25], [T0.x, 0.78, T0.z]]);
  const out: BookContent['photos'] = {};
  for (const [k, p, t] of views) {
    const img = await loadImg(renderStill(p, t, 1200, 900));
    if (img) out[k] = img;
  }
  return out;
}

function facts(S: Design): BookContent['facts'] {
  const t = S.table,
    m = t.mode,
    n = S.tables.length;
  const items = S.items.map((i) => ITEMS[i.type]).filter(Boolean);
  const find = (g: string[]) => items.find((d) => g.includes(d.group));
  const layout = {
    round: `around ${n} round table${n > 1 ? 's' : ''}`,
    banquet: `along ${n > 1 ? n + ' long banquet tables' : 'one long banquet table'}`,
    ceremony: 'in rows either side of the aisle',
    none: 'across an open floor',
  }[m];
  const cake = items.find((d) => /cake|dessert|macaron|cupcake|donut/i.test(d.name));
  return {
    layout,
    mode: m,
    tables: n,
    guests: S.guests,
    pieces: S.items.length,
    backdrop: find(['backdrop'])?.name,
    cake: cake?.name || 'Three-tier wedding cake',
    centre: find(['centre', 'garland'])?.name,
    linen: !hasTbl(m) ? null : t.cloth === 'custom' ? 'Custom colour linen' : t.cloth ? CLOTHS[t.cloth]?.name : 'Venue linen',
    overlay: t.overlay && t.overlay !== 'none' ? OVERLAYS[t.overlay]?.name : null,
    chair: t.chair ? CHAIRS[t.chair]?.name : 'Venue standard',
    decor: t.decor && t.decor !== 'none' ? DECOR[t.decor]?.name : null,
    place: hasTbl(m) ? ITEMS[t.place]?.name : null,
  };
}

/** Clone the built tables and pieces from the live scene; `near` keeps only what's around the first table. */
function layoutClone(S: Design, near: boolean) {
  const scene = liveScene();
  const g = new THREE.Group();
  if (!scene) return g;
  const T0 = S.tables[0] || { x: 0, z: 0 },
    c = new THREE.Vector3(),
    bx = new THREE.Box3();
  const safeClone = (o: THREE.Object3D) => {
    const saved: Array<[THREE.Object3D, Record<string, unknown>]> = [];
    o.traverse((n) => {
      if (Object.keys(n.userData).length) {
        saved.push([n, n.userData]);
        n.userData = {};
      }
    });
    const cl = o.clone(true);
    saved.forEach(([n, u]) => (n.userData = u));
    return cl;
  };
  scene.getObjectByName('design-tables')?.children.forEach((ch) => {
    if (!ch.visible) return;
    if (near) {
      bx.setFromObject(ch).getCenter(c);
      if (Math.hypot(c.x - T0.x, c.z - T0.z) > 2.3) return;
    }
    g.add(safeClone(ch));
  });
  const byId = new Map(S.items.map((i) => [i.id, i]));
  scene.getObjectByName('design-items')?.children.forEach((ch) => {
    const it = byId.get(ch.userData.itemId),
      d = it && ITEMS[it.type];
    if (!it || !d || !ch.visible || d.surf === 'hang') return;
    if (near) {
      const [x, z] = worldOf(S, it);
      if (Math.hypot(x - T0.x, z - T0.z) > 2.3 || d.group === 'backdrop') return;
    }
    g.add(safeClone(ch));
  });
  return g;
}

export function StorybookOverlay() {
  const close = useDesignStore((s) => s.closeOverlay);
  const motion = useDesignStore((s) => s.motion);
  const canvas = useRef<HTMLCanvasElement>(null);
  const book = useRef<Book | null>(null);
  const content = useRef<BookContent | null>(null);
  const [story, setStory] = useState(loadStory);
  const [intro, setIntro] = useState(true);
  const [loading, setLoading] = useState('Printing your photographs…');
  const [spread, setSpread] = useState(0);
  const [chapShown, setChapShown] = useState(0);
  const [auto, setAuto] = useState(false);
  const [sound, setSound] = useState(soundOn);
  const goRef = useRef<HTMLButtonElement>(null);

  // Build the book and gather everything it shows from the design.
  useEffect(() => {
    const b = new Book(canvas.current!, { onSpread: setSpread, onAutoEnd: () => setAuto(false) });
    book.current = b;
    b.motion = useDesignStore.getState().motion;
    let dead = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 60));
      const s = useDesignStore.getState();
      const S = s.design,
        venue = VENUES[S.venue],
        pal = palOf(S.palette, S.customPalette);
      const photos = await takePhotos(S);
      if (dead) return;
      let cake: THREE.Object3D | null = null,
        champagne: THREE.Object3D | null = null;
      try {
        cake = itemGroup('cake', pal, 5, 'round');
        champagne = itemGroup('champagne', pal, 5, 'round');
      } catch {
        /* optional pop-ups */
      }
      content.current = {
        story: loadStory(),
        pal,
        venueName: venue?.name ?? 'Our venue',
        venueDesc: venue?.desc ?? '',
        sky: envFor(venue, S.time, S.wx).sky,
        photos,
        facts: facts(S),
        layoutAll: layoutClone(S, false),
        layoutNear: layoutClone(S, true),
        cake,
        champagne,
        // The Feast chapter prints the planned menu (canapés and late-night food aside).
        ...(S.music ? { firstDance: firstDanceSong(S.music) } : {}),
        ...(S.attire ? { attire: attirePhrase(S.attire) } : {}),
        ...(S.menu ? { feast: menuForCards({ ...S.menu, courses: S.menu.courses.filter((c) => !/canap|late/i.test(c.course)) }).map((m) => [m.course, m.dish, m.desc] as [string, string, string]) } : {}),
      };
      b.setContent(content.current);
      setLoading('');
      goRef.current?.focus();
    })();
    return () => {
      dead = true;
      musicStop();
      b.dispose();
      book.current = null;
    };
  }, []);

  useEffect(() => {
    if (book.current) book.current.motion = motion;
  }, [motion]);

  // The chapter title fades out and back in as the page turns.
  useEffect(() => {
    const id = setTimeout(() => setChapShown(spread), motion ? 220 : 0);
    return () => clearTimeout(id);
  }, [spread, motion]);

  const begin = () => {
    const b = book.current;
    if (!b || !b.intro || loading) return;
    const names = story.names.trim() || 'Olivia & James';
    const next = { names, date: story.date };
    try {
      localStorage.setItem(STORY_KEY, JSON.stringify(next));
    } catch {
      /* storage full */
    }
    if (content.current && (next.names !== content.current.story.names || next.date !== content.current.story.date)) {
      content.current.story = next;
      b.drawPages(content.current);
    }
    b.intro = false;
    setIntro(false);
    musicStart();
    setTimeout(() => b.turnTo(1), motion ? 450 : 0);
  };
  const go = (s: number) => {
    const b = book.current;
    if (!b) return;
    stopAuto();
    if (b.intro) {
      if (s > 0) begin();
      return;
    }
    b.turnTo(s);
  };
  const stopAuto = () => {
    book.current?.setAuto(false);
    setAuto(false);
  };
  const toggleAuto = () => {
    const b = book.current;
    if (!b) return;
    if (auto) return stopAuto();
    if (b.intro) begin();
    b.setAuto(true);
    setAuto(true);
  };

  // Keys: arrows turn pages, Space plays or pauses, Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') {
        if (e.key === 'Escape') close();
        return;
      }
      const b = book.current;
      if (!b) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(b.intro ? 1 : b.spread + 1);
      else if (e.key === 'ArrowLeft') go(b.spread - 1);
      else if (e.key === ' ') {
        e.preventDefault();
        toggleAuto();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="sb-root" role="dialog" aria-label="Storybook">
      <canvas ref={canvas} className="sb-canvas" />
      <div className="sb-top">
        <div className="sb-chap serif" style={{ opacity: chapShown === spread ? 1 : 0 }} aria-live="polite">
          {CHAPTERS[chapShown]}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn ${sound ? '' : 'on'}`}
            onClick={() => {
              const on = !sound;
              setSoundOn(on);
              setSound(on);
              if (on && !intro) musicStart();
              else musicStop();
            }}
          >
            {sound ? 'Sound on' : 'Sound off'}
          </button>
          <button type="button" className={`btn ${auto ? 'on' : ''}`} onClick={toggleAuto} disabled={!!loading}>
            {auto ? 'Pause' : 'Play story'}
          </button>
          <button type="button" className="fs-x sb-x" aria-label="Close the storybook" onClick={close}>
            ×
          </button>
        </div>
      </div>

      {intro && (
        <div className="sb-intro glass">
          <div className="lbl">A wedding storybook</div>
          <h2 className="serif">Your day, as a story</h2>
          <p>Nine chapters made from your design, with photographs from the studio and pop-ups of your layout and tables.</p>
          <label className="sb-field">
            <span>Your names</span>
            <input className="inp" value={story.names} maxLength={60} onChange={(e) => setStory({ ...story, names: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && begin()} />
          </label>
          <label className="sb-field">
            <span>The date</span>
            <input className="inp" type="date" value={story.date} onChange={(e) => setStory({ ...story, date: e.target.value })} />
          </label>
          <button ref={goRef} type="button" className="btn primary" disabled={!!loading} onClick={begin}>
            {loading ? loading : 'Begin'}
          </button>
        </div>
      )}

      <nav className="sb-nav" aria-label="Chapters">
        <button type="button" className="sb-arrow" aria-label="Previous page" disabled={intro || spread <= 0} onClick={() => go(spread - 1)}>
          ‹
        </button>
        <div className="sb-dots">
          {CHAPTERS.map((c, i) => (
            <button key={c} type="button" title={c} aria-label={c} aria-current={i === spread} className={i === spread ? 'on' : ''} onClick={() => !intro && go(i)} />
          ))}
        </div>
        <button type="button" className="sb-arrow" aria-label="Next page" disabled={!!loading || spread >= MAXS} onClick={() => go(intro ? 1 : spread + 1)}>
          ›
        </button>
      </nav>
    </div>
  );
}
