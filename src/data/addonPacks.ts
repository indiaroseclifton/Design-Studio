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
];
