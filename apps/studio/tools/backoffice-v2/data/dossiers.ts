/**
 * Assemblage des dossiers (spécification 3.1) : fonctions pures, sans React.
 *
 * Un dossier = une demande + son éventuelle expédition. La jointure se fait par
 * `demande.expeditionRef` (référence de l'expédition), JAMAIS par l'égalité des
 * références : dans les données du harnais la demande est `DEV-2610-012` et
 * l'expédition `EXP-2610-001`. Repli pour les anciens documents sans
 * `expeditionRef` : `expedition.demandeRef` égale à la référence de la demande.
 */
import type { Demande, DonneesMagasin, Dossier, Expedition } from '../domaine/types';

function trouverExpedition(demande: Demande, expeditions: Expedition[], prises: Set<string>): Expedition | undefined {
  const libre = (x: Expedition) => !prises.has(x._id);
  if (demande.expeditionRef) {
    const parRef = expeditions.find((x) => libre(x) && x.reference === demande.expeditionRef);
    if (parRef) return parRef;
  }
  if (demande.reference) {
    return expeditions.find((x) => libre(x) && x.demandeRef === demande.reference);
  }
  return undefined;
}

/**
 * Tous les dossiers : d'abord ceux qui ont une demande (ordre de la lecture),
 * puis les expéditions seules (créées à la main dans le Studio), dont
 * l'identifiant de dossier est celui de l'expédition.
 */
export function construireDossiers(donnees: Pick<DonneesMagasin, 'demandes' | 'expeditions'>): Dossier[] {
  const prises = new Set<string>();
  const dossiers: Dossier[] = [];
  for (const demande of donnees.demandes) {
    const expedition = trouverExpedition(demande, donnees.expeditions, prises);
    if (expedition) prises.add(expedition._id);
    dossiers.push({ id: demande._id, demande, ...(expedition ? { expedition } : {}) });
  }
  for (const expedition of donnees.expeditions) {
    if (!prises.has(expedition._id)) dossiers.push({ id: expedition._id, expedition });
  }
  return dossiers;
}

/**
 * Retrouve un dossier par son identifiant. On accepte aussi l'`_id` de
 * l'expédition liée : un lien ou une recherche ne doit jamais mener à un
 * « dossier introuvable » parce qu'on a désigné le même dossier par sa moitié.
 */
export function trouverDossier(
  donnees: Pick<DonneesMagasin, 'demandes' | 'expeditions'>,
  id: string,
): Dossier | null {
  const dossiers = construireDossiers(donnees);
  return (
    dossiers.find((d) => d.id === id) ??
    dossiers.find((d) => d.demande?._id === id || d.expedition?._id === id) ??
    null
  );
}

/** Révisions d'un dossier, par identifiant de document : sert à détecter un changement distant. */
export function revisionsDuDossier(dossier: Dossier): Record<string, string> {
  const revs: Record<string, string> = {};
  if (dossier.demande) revs[dossier.demande._id] = dossier.demande._rev;
  if (dossier.expedition) revs[dossier.expedition._id] = dossier.expedition._rev;
  return revs;
}
