export interface AddonPack {
  id: string;
  name: string;
  desc: string;
  categoryId: string;
  categoryLabel: string;
}

export const ADDON_PACKS: AddonPack[] = [
  {
    id: 'lounge-plus',
    name: 'Lounge & rooms',
    desc: 'Extra soft-seating pieces for a cocktail hour or after-party corner — ottomans, a coffee table and a bar cart.',
    categoryId: 'lounge',
    categoryLabel: 'Lounge & rooms',
  },
  {
    id: 'signage-plus',
    name: 'Signage & displays',
    desc: 'A neon sign and an escort-card display wall for guest arrival and wayfinding moments.',
    categoryId: 'signage',
    categoryLabel: 'Signage & displays',
  },
  {
    id: 'tabletop-plus',
    name: 'Tabletop shapes',
    desc: 'Extra table shapes for special moments — a sweetheart table, a cocktail high-top and a long head table.',
    categoryId: 'tabletop',
    categoryLabel: 'Tabletop shapes',
  },
  {
    id: 'lighting-plus',
    name: 'Event lighting',
    desc: 'A string-light curtain, a gobo pattern light and a spotlight for staging key moments.',
    categoryId: 'lighting-plus',
    categoryLabel: 'Event lighting',
  },
  {
    id: 'av-plus',
    name: 'Stage & AV',
    desc: 'A DJ booth, a speaker stack and a moving-head light for the dance floor.',
    categoryId: 'av',
    categoryLabel: 'Stage & AV',
  },
];
