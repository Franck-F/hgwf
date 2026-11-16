/**
 * Résumé en tête de la page « Priorités » : une phrase qui dit combien de
 * dossiers attendent, combien sont en retard et combien de réponses clients
 * ne sont pas lues, et le dossier par lequel commencer. Fonctions pures.
 */
import type { GroupeAFaire, LigneAFaire } from '../../domaine/types';

export interface ResumePriorites {
  nombre: number;
  enRetard: number;
  nonLus: number;
  /** Une ou deux phrases courtes, prêtes à afficher. */
  phrase: string;
  /** Premier dossier en retard dans l'ordre d'urgence, sinon le premier tout court. */
  plusUrgent: LigneAFaire | null;
}

const pluriel = (n: number, un: string, plusieurs: string): string => `${n} ${n > 1 ? plusieurs : un}`;

export function resumerPriorites(groupes: readonly GroupeAFaire[], fantomes: ReadonlySet<string> = new Set()): ResumePriorites {
  // Les lignes grisées viennent d'être traitées : elles ne comptent plus.
  const lignes = groupes.flatMap((g) => g.lignes).filter((l) => !fantomes.has(l.dossierId));
  const nombre = lignes.length;
  const enRetard = lignes.filter((l) => l.enRetard).length;
  const nonLus = lignes.reduce((n, l) => n + l.nbNonLus, 0);

  if (nombre === 0) {
    return { nombre, enRetard, nonLus, phrase: 'Aucun dossier n’attend d’action de votre part.', plusUrgent: null };
  }

  const attente = nombre > 1 ? 'attendent une action de votre part' : 'attend une action de votre part';
  const retard = enRetard > 0 ? `, dont ${enRetard} en retard` : '';
  const lus = nonLus > 0 ? ` ${pluriel(nonLus, 'réponse client non lue', 'réponses clients non lues')}.` : '';
  const phrase = `${pluriel(nombre, 'dossier', 'dossiers')} ${attente}${retard}.${lus}`;

  return { nombre, enRetard, nonLus, phrase, plusUrgent: lignes.find((l) => l.enRetard) ?? lignes[0] ?? null };
}

/** « lundi 16 novembre », avec une majuscule. */
export function dateDuJour(maintenant: Date): string {
  const texte = maintenant.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
