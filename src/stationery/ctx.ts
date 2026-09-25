import { palOf } from '../engine/studio';
import { VENUES } from '../engine/venues.gen';
import { menuChoices, menuForCards } from '../menu/model';
import { ceremonyMusic } from '../music/model';
import type { Design } from '../types';
import type { DrawCtx } from './draw';
import type { Suite } from './model';

/** Everything the stationery draws from: the suite, the palette, the venue and the Menu & Bar plan. */
export function drawCtxFor(S: Design, suite: Suite): DrawCtx {
  const plan = S.menu;
  const cm = S.music ? ceremonyMusic(S.music) : null;
  return {
    suite,
    pal: palOf(S.palette, S.customPalette),
    venueName: VENUES[S.venue]?.name ?? '',
    tables: S.tables.length,
    ...(cm ? { ceremony: Object.fromEntries(Object.entries(cm).map(([k, v]) => [k, v.map((t) => `“${t.title}” · ${t.artist}`)])) } : {}),
    ...(plan
      ? {
          menu: menuForCards(plan),
          choices: menuChoices(plan),
          bar: { welcome: plan.bar.welcome, signatures: plan.bar.signatures, wine: plan.bar.wine },
        }
      : {}),
  };
}
