/**
 * Conversions entre le sélecteur de date de l'interface (« AAAA-MM-JJ », jamais
 * montré tel quel) et le format stocké pour les rotations (« JJ/MM », sans
 * année, 4.7). La lecture inverse passe par `lireDatesRotation` (domaine).
 */

const deux = (n: number): string => String(n).padStart(2, '0');

/** Valeur du sélecteur pour une date lue ; chaîne vide si la date est inconnue. */
export function versChampDate(date: Date | null): string {
  if (!date) return '';
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}`;
}

/** « 2026-11-14 » vers « 14/11 » ; chaîne vide si la valeur n'est pas une date. */
export function versJourMois(champ: string): string {
  const m = champ.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}/${m[2]}`;
}

/** Date locale d'une valeur de sélecteur (midi évite tout décalage d'heure d'été). */
export function lireChampDate(champ: string): Date | null {
  const m = champ.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

export interface SaisieRotation {
  nom: string;
  cloture: string;
  depart: string;
  /** Texte saisi, vide accepté (enregistré comme 0, comme dans le schéma). */
  remplissage: string;
}

export type ErreursRotation = Partial<Record<keyof SaisieRotation, string>>;

/**
 * Contrôles du formulaire de rotation. Le départ est lu « à partir de la
 * clôture » : un départ antérieur à la clôture serait relu l'année suivante, il
 * est donc refusé ici plutôt que stocké de travers.
 */
export function erreursRotation(s: SaisieRotation): ErreursRotation {
  const erreurs: ErreursRotation = {};
  if (!s.nom.trim()) erreurs.nom = 'Indiquez le nom de la rotation.';
  if (!s.cloture) erreurs.cloture = 'Choisissez la date de clôture.';
  if (s.cloture && s.depart && s.depart < s.cloture) erreurs.depart = 'Le départ doit être après la clôture.';
  const texte = s.remplissage.trim();
  if (texte) {
    const n = Number(texte.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > 100) erreurs.remplissage = 'Indiquez un pourcentage entre 0 et 100.';
  }
  return erreurs;
}

/** Remplissage saisi vers nombre (vide = 0). À n'appeler qu'après `erreursRotation`. */
export function lireRemplissage(texte: string): number {
  const t = texte.trim();
  return t ? Math.round(Number(t.replace(',', '.'))) : 0;
}
