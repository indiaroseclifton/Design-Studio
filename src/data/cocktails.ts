export interface CocktailDef {
  id: string;
  name: string;
  desc: string;
  kind: 'cocktail' | 'mocktail';
}

export const COCKTAILS: CocktailDef[] = [
  { id: 'old_fashioned', name: 'Old Fashioned', desc: 'Bourbon, demerara, orange bitters', kind: 'cocktail' },
  { id: 'aperol_spritz', name: 'Aperol Spritz', desc: 'Aperol, prosecco, soda, orange', kind: 'cocktail' },
  { id: 'french_75', name: 'French 75', desc: 'Gin, lemon, sugar, champagne', kind: 'cocktail' },
  { id: 'moscow_mule', name: 'Moscow Mule', desc: 'Vodka, ginger beer, lime', kind: 'cocktail' },
  { id: 'espresso_martini', name: 'Espresso Martini', desc: 'Vodka, coffee liqueur, espresso', kind: 'cocktail' },
  { id: 'whiskey_sour', name: 'Whiskey Sour', desc: 'Bourbon, lemon, sugar, egg white', kind: 'cocktail' },
  { id: 'paloma', name: 'Paloma', desc: 'Tequila, grapefruit soda, lime', kind: 'cocktail' },
  { id: 'negroni', name: 'Negroni', desc: 'Gin, Campari, sweet vermouth', kind: 'cocktail' },
  { id: 'margarita', name: 'Margarita', desc: 'Tequila, triple sec, lime', kind: 'cocktail' },
  { id: 'garden_spritz', name: 'Garden Spritz', desc: 'Elderflower, soda, cucumber, mint', kind: 'mocktail' },
  { id: 'sparkling_berry', name: 'Sparkling Berry Lemonade', desc: 'Muddled berries, lemon, soda', kind: 'mocktail' },
  { id: 'ginger_fizz', name: 'Ginger Fizz', desc: 'Ginger, lime, honey, soda', kind: 'mocktail' },
];
