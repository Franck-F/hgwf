// Palette et typographies HGWF, identiques à celles du back-office fret.
// L'outil est indépendant techniquement, pas visuellement : un utilisateur doit
// reconnaître la maison en passant de l'un à l'autre.
export const MARINE = '#12395B';
export const CREME = '#FBF4E6';
export const IVOIRE = '#FFFDF8';
export const CIEL = '#4EA8DE';
export const CORAIL = '#FF6F5E';
export const OR = '#FFB23E';
export const ENCRE = '#29638D';
export const ROUGE = '#C24435';
export const VERT = '#2E7D5B';

export const SANS = "'Space Grotesk', system-ui, sans-serif";
export const MONO = "'Space Mono', monospace";

/** Centimes vers euros affichables. Jamais l'inverse sans arrondi explicite. */
export function euros(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—';
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

/** Euros saisis au clavier vers centimes entiers. Accepte « 89 », « 89,50 », « 89.50 ». */
export function versCentimes(saisie: string): number | null {
  const nettoye = saisie.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(nettoye)) return null;
  return Math.round(parseFloat(nettoye) * 100);
}

export function dateFr(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
