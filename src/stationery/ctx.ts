import { palOf } from '../engine/studio';
import { VENUES } from '../engine/venues.gen';
import { menuChoices, menuForCards } from '../menu/model';
import type { Design } from '../types';
import type { DrawCtx } from './draw';
import type { Suite } from './model';

/** Everything the stationery draws from: the suite, the palette, the venue and the Menu & Bar plan. */
export function drawCtxFor(S: Design, suite: Suite): DrawCtx {
  const plan = S.menu;
  return {
    suite,
    pal: palOf(S.palette, S.customPalette),
    venueName: VENUES[S.venue]?.name ?? '',
    tables: S.tables.length,
    ...(plan
      ? {
          menu: menuForCards(plan),
          choices: menuChoices(plan),
          bar: { welcome: plan.bar.welcome, signatures: plan.bar.signatures, wine: plan.bar.wine },
        }
      : {}),
  };
}
