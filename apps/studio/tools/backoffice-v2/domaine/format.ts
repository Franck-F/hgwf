/**
 * Mise en forme des dates, téléphones et volumes, et lecture des rotations
 * (JJ/MM sans année, spécification 4.7).
 */
import type { Rotation } from './types';
import { ageJours, debutDeJour } from './echeances';

const MS_JOUR = 86_400_000;
/** Une rotation passée depuis moins de 30 jours est lue dans l'année qui la rend récente. */
const JOURS_RECENTE = 30;

const deuxChiffres = (n: number) => String(n).padStart(2, '0');

function occurrence(jour: number, mois: number, annee: number): Date | null {
  const d = new Date(annee, mois - 1, jour);
  // 29/02 n'existe pas toutes les années : l'année est alors sautée.
  return d.getMonth() === mois - 1 && d.getDate() === jour ? d : null;
}

function lireJourMois(texte: string | null | undefined): { jour: number; mois: number } | null {
  if (typeof texte !== 'string') return null;
  const m = texte.trim().match(/^(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*\d{2,4})?$/);
  if (!m) return null;
  const jour = Number(m[1]);
  const mois = Number(m[2]);
  if (jour < 1 || jour > 31 || mois < 1 || mois > 12) return null;
  return { jour, mois };
}

/**
 * Les rotations stockent « JJ/MM » sans année. La date lue est la prochaine
 * occurrence de JJ/MM à partir d'aujourd'hui, sauf qu'une date passée depuis
 * moins de 30 jours est lue telle quelle (rotation récemment partie, encore
 * affichée). Avec `apresLe` (la clôture déjà lue), on lit la première
 * occurrence à partir de cette date : c'est ainsi que se lit le départ.
 *
 * Cas figés par les tests : 28/12 lu le 02/01 (année précédente), 10/01 lu le
 * 05/11 (janvier prochain), 20/10 lu le 06/11 (passée de 17 jours).
 */
export function lireDateRotation(
  texte: string | null | undefined,
  aujourdhui: Date,
  apresLe?: Date,
): Date | null {
  const jm = lireJourMois(texte);
  if (!jm) return null;
  const base = debutDeJour(apresLe ?? aujourdhui);
  const an = base.getFullYear();

  if (apresLe) {
    for (let a = an; a <= an + 8; a += 1) {
      const c = occurrence(jm.jour, jm.mois, a);
      if (c && c.getTime() >= base.getTime()) return c;
    }
    return null;
  }

  // Année précédente, courante, suivante : on garde la plus récente des dates
  // passées de moins de 30 jours, sinon la première à venir.
  const candidates: Date[] = [];
  for (let a = an - 1; a <= an + 8; a += 1) {
    const c = occurrence(jm.jour, jm.mois, a);
    if (c) candidates.push(c);
  }
  const recente = candidates
    .filter((c) => c.getTime() < base.getTime() && base.getTime() - c.getTime() <= JOURS_RECENTE * MS_JOUR)
    .sort((x, y) => y.getTime() - x.getTime())[0];
  if (recente) return recente;
  return candidates.find((c) => c.getTime() >= base.getTime()) ?? null;
}

/** Clôture et départ d'une rotation, lus comme en 4.7. */
export function lireDatesRotation(
  rotation: Pick<Rotation, 'cloture' | 'depart'>,
  aujourdhui: Date,
): { cloture: Date | null; depart: Date | null } {
  const cloture = lireDateRotation(rotation.cloture, aujourdhui);
  const depart = lireDateRotation(rotation.depart, aujourdhui, cloture ?? undefined);
  return { cloture, depart };
}

/**
 * Rotation « terminée » : son départ (à défaut sa clôture) est passé. Limite
 * connue : la date n'ayant pas d'année, une rotation partie depuis plus de 30
 * jours est relue comme celle de l'an prochain ; seule une rotation partie
 * depuis moins de 30 jours est donc reconnue ici (Q18, champ date réel).
 */
export function rotationTerminee(rotation: Pick<Rotation, 'cloture' | 'depart'>, aujourdhui: Date): boolean {
  const { cloture, depart } = lireDatesRotation(rotation, aujourdhui);
  const fin = depart ?? cloture;
  return fin !== null && fin.getTime() < debutDeJour(aujourdhui).getTime();
}

/** « 28/10/2026 ». */
export function formaterDate(date: Date): string {
  return `${deuxChiffres(date.getDate())}/${deuxChiffres(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** « 14/11 » (rotations : jour et mois seulement). */
export function formaterJourMois(date: Date): string {
  return `${deuxChiffres(date.getDate())}/${deuxChiffres(date.getMonth() + 1)}`;
}

/** « 28/10/2026 à 14h02 ». */
export function formaterDateHeure(date: Date): string {
  return `${formaterDate(date)} à ${deuxChiffres(date.getHours())}h${deuxChiffres(date.getMinutes())}`;
}

/** « il y a 3 jours », « hier », « aujourd'hui ». */
export function ilYa(date: Date, maintenant: Date): string {
  const j = ageJours(date, maintenant);
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return 'hier';
  return `il y a ${j} jours`;
}

/** « 06 12 34 56 78 » (groupes de deux chiffres). Un numéro étranger est rendu tel quel. */
export function formaterTelephone(numero: string | null | undefined): string {
  if (typeof numero !== 'string') return '';
  const brut = numero.trim();
  const chiffres = brut.replace(/\D/g, '');
  if (!chiffres) return '';
  let national: string | null = null;
  if (/^0\d{9}$/.test(chiffres)) national = chiffres;
  else if (/^0033\d{9}$/.test(chiffres)) national = `0${chiffres.slice(4)}`;
  else if (/^33\d{9}$/.test(chiffres)) national = `0${chiffres.slice(2)}`;
  else if (/^330\d{9}$/.test(chiffres)) national = chiffres.slice(2);
  if (!national) return brut;
  return national.replace(/(\d{2})(?=\d)/g, '$1 ');
}

/**
 * Volume en m³ lu dans le texte libre de la demande, `null` si illisible ou
 * ambigu (une fourchette « 5 à 8 m³ », ou plusieurs volumes) : un montant
 * proposé à partir d'un volume deviné serait un prix inventé.
 */
export function lireVolume(texte: string | null | undefined): number | null {
  if (typeof texte !== 'string') return null;
  const t = texte.replace(/ | /g, ' ').trim();
  if (!t) return null;
  const nombre = '(\\d+(?:[.,]\\d+)?)';
  const unite = '(?:m\\s?[³3]|m\\^3|m\\s?cubes?|mètres?\\s+cubes?|metres?\\s+cubes?)';
  if (new RegExp(`${nombre}\\s*(?:à|a|-|–|et|ou)\\s*${nombre}\\s*${unite}`, 'i').test(t)) return null;
  const trouves = [...t.matchAll(new RegExp(`${nombre}\\s*${unite}`, 'gi'))];
  if (trouves.length === 1) return versNombre(trouves[0]?.[1]);
  if (trouves.length > 1) return null;
  // Un nombre seul (« 8 ») est lu comme des m³ : c'est l'unité du champ.
  const seul = t.match(new RegExp(`^${nombre}$`));
  return seul ? versNombre(seul[1]) : null;
}

function versNombre(s: string | undefined): number | null {
  if (!s) return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}
