/**
 * Seuils d'« À faire » (spécification 4.1) et calculs d'âge.
 *
 * Les constantes sont les valeurs par défaut de la spécification (modifiables
 * par la question Q1). L'âge « ouvré » sert à décider d'un retard ; l'âge
 * affiché à l'écran reste en jours calendaires.
 */

export const SEUIL_NOUVELLE_RETARD_H = 24;
export const SEUIL_CHIFFRAGE_RETARD_H = 24;
export const SEUIL_ACCEPTE_J = 2;
export const SEUIL_DEVIS_APPEL_J = 7;
export const SEUIL_ROUTE_J = 7;
/** Compléments demandés sans réponse depuis 5 jours ouvrés : le client est à relancer. */
export const SEUIL_COMPLEMENT_RELANCE_J = 5;
/** Une nouvelle demande de moins de 4 h ouvrées reste dans « En attente ». */
export const SEUIL_NOUVELLE_ATTENTE_H = 4;

const MS_HEURE = 3_600_000;
const MS_JOUR = 24 * MS_HEURE;

function dateValide(annee: number, mois: number, jour: number, h = 0, min = 0): Date | null {
  const d = new Date(annee, mois - 1, jour, h, min, 0, 0);
  // `new Date(2026, 1, 31)` déborde sur mars : on refuse plutôt que de décaler.
  if (d.getFullYear() !== annee || d.getMonth() !== mois - 1 || d.getDate() !== jour) return null;
  return d;
}

/**
 * Lit « JJ/MM/AAAA » et « JJ/MM/AAAA à HHhMM » (formats écrits par l'API et par
 * l'outil), une seule fonction pour tout l'outil. Les dates ISO (`_createdAt`,
 * `_updatedAt`) sont acceptées aussi : un document ancien peut n'avoir que
 * celles-là. Renvoie `null` si le texte est absent ou illisible (par exemple
 * « À PLANIFIER »).
 */
export function lireDate(texte: string | null | undefined): Date | null {
  if (typeof texte !== 'string') return null;
  const t = texte.trim();
  if (!t) return null;
  const fr = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*(?:à|a|,)?\s*(\d{1,2})\s*[h:]\s*(\d{2}))?$/i);
  if (fr) {
    return dateValide(Number(fr[3]), Number(fr[2]), Number(fr[1]), Number(fr[4] ?? 0), Number(fr[5] ?? 0));
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    // Une date ISO sans heure est lue à minuit local (pas à minuit UTC, qui
    // glisserait au jour précédent à l'ouest de Greenwich).
    const seule = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (seule) return dateValide(Number(seule[1]), Number(seule[2]), Number(seule[3]));
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Vrai si le texte porte aussi une heure (pour choisir le format d'affichage). */
export function texteAUneHeure(texte: string | null | undefined): boolean {
  if (typeof texte !== 'string') return false;
  return /\d\s*[h:]\s*\d{2}/i.test(texte) || /^\d{4}-\d{2}-\d{2}T/.test(texte.trim());
}

/** Début de journée locale. */
export function debutDeJour(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Durée (en ms) de l'intervalle [debut, fin] qui tombe un samedi ou un
 * dimanche. On parcourt les samedis qui touchent l'intervalle.
 */
function dureeWeekEnds(debut: Date, fin: Date): number {
  let total = 0;
  // Premier samedi (00h00) dont le week-end ne finit pas avant `debut`.
  const jour = debutDeJour(debut);
  const decalage = (jour.getDay() + 1) % 7; // jours depuis le dernier samedi
  const samedi = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate() - decalage);
  for (let s = samedi; s.getTime() < fin.getTime(); s = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7)) {
    const lundi = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 2);
    const de = Math.max(s.getTime(), debut.getTime());
    const a = Math.min(lundi.getTime(), fin.getTime());
    if (a > de) total += a - de;
  }
  return total;
}

/**
 * Heures écoulées, moins le temps passé pendant les week-ends (samedi +
 * dimanche). Les jours fériés ne sont pas retirés : pas de calendrier à
 * maintenir. Une demande reçue le vendredi à 18h a 14 h d'âge ouvré le lundi à
 * 8h : jamais rouge à tort.
 *
 * Écart assumé avec la lettre de la spécification (« 48 h par week-end
 * entièrement traversé ») : on retire aussi la part d'un week-end traversé en
 * partie, sinon une demande du samedi midi serait rouge dès le lundi 8h
 * (44 h) alors que 8 h ouvrées seulement se sont écoulées. Pour un week-end
 * entièrement traversé le résultat est identique (-48 h).
 */
export function ageOuvreHeures(depuis: Date, maintenant: Date): number {
  const brut = maintenant.getTime() - depuis.getTime();
  if (brut <= 0) return 0;
  const ouvre = brut - dureeWeekEnds(depuis, maintenant);
  return Math.max(0, ouvre / MS_HEURE);
}

/** Jours ouvrés écoulés (entiers), même principe. */
export function ageOuvreJours(depuis: Date, maintenant: Date): number {
  return Math.floor(ageOuvreHeures(depuis, maintenant) / 24);
}

/**
 * Âge affiché à l'écran, en jours calendaires (écart entre les dates du jour, pas
 * entre les heures) : envoyé le 29/10 à 11h, il a 8 jours le 06/11 à 9h. Un seul
 * calcul pour tous les écrans, sinon deux écrans donnent deux âges au même dossier.
 */
export function ageJours(depuis: Date, maintenant: Date): number {
  return Math.max(0, Math.round((debutDeJour(maintenant).getTime() - debutDeJour(depuis).getTime()) / MS_JOUR));
}
