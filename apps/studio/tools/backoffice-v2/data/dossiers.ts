/**
 * Assemblage des dossiers (spécification 3.1) : fonctions pures, sans React.
 *
 * Un dossier = une demande + son éventuelle expédition. La jointure se fait par
 * `demande.expeditionRef` (référence de l'expédition), JAMAIS par l'égalité des
 * références : dans les données du harnais la demande est `DEV-2610-012` et
 * l'expédition `EXP-2610-001`. Repli pour les anciens documents sans
 * `expeditionRef` : `expedition.demandeRef` égale à la référence de la demande.
 */
import { echangesDe } from '../domaine/echanges';
import { retrouverDossiersParReferenceOuClient } from '../domaine/rapprochement';
import type { Demande, DonneesMagasin, Dossier, Echange, Expedition } from '../domaine/types';

type DonneesDossiers = Pick<DonneesMagasin, 'demandes' | 'expeditions'> & { echanges?: Echange[] };

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
export function construireDossiers(donnees: DonneesDossiers): Dossier[] {
  const tous = donnees.echanges ?? [];
  // Les échanges ne sont posés que s'il y en a : un dossier sans réponse garde sa forme d'avant.
  const avecEchanges = (d: Dossier): Dossier => {
    const echanges = tous.length > 0 ? echangesDe(d.demande, d.expedition, tous) : [];
    return echanges.length > 0 ? { ...d, echanges } : d;
  };
  const prises = new Set<string>();
  const dossiers: Dossier[] = [];
  for (const demande of donnees.demandes) {
    const expedition = trouverExpedition(demande, donnees.expeditions, prises);
    if (expedition) prises.add(expedition._id);
    dossiers.push(avecEchanges({ id: demande._id, demande, ...(expedition ? { expedition } : {}) }));
  }
  for (const expedition of donnees.expeditions) {
    if (!prises.has(expedition._id)) dossiers.push(avecEchanges({ id: expedition._id, expedition }));
  }
  return dossiers;
}

/**
/** Retrouve un dossier par son identifiant, ou par un libellé métier :
 * référence de devis, nom client ou e-mail. Cela sert à rattacher une réponse
 * Outlook déjà reçue à la bonne fiche sans passer par un `_id` technique.
 */
export function trouverDossierParReferenceOuClient(donnees: DonneesDossiers, texte: string): Dossier | null {
  const dossiers = construireDossiers(donnees);
  return retrouverDossiersParReferenceOuClient(texte, dossiers)[0] ?? null;
}

/** Retrouve un dossier par son identifiant. On accepte aussi l'`_id` de
 * l'expédition liée : un lien ou une recherche ne doit jamais mener à un
 * « dossier introuvable » parce qu'on a désigné le même dossier par sa moitié.
 */
export function trouverDossier(
  donnees: DonneesDossiers,
  id: string,
): Dossier | null {
  const dossiers = construireDossiers(donnees);
  return (
    dossiers.find((d) => d.id === id) ??
    dossiers.find((d) => d.demande?._id === id || d.expedition?._id === id) ??
    trouverDossierParReferenceOuClient(donnees, id)
  );
}

/** Révisions d'un dossier, par identifiant de document : sert à détecter un changement distant. */
export function revisionsDuDossier(dossier: Dossier): Record<string, string> {
  const revs: Record<string, string> = {};
  if (dossier.demande) revs[dossier.demande._id] = dossier.demande._rev;
  if (dossier.expedition) revs[dossier.expedition._id] = dossier.expedition._rev;
  return revs;
}

/** Empreinte des échanges d'un dossier (identité, révision) : détecte une réponse arrivée ou lue ailleurs. */
export function empreinteEchanges(dossier: Dossier): string {
  return (dossier.echanges ?? [])
    .map((e) => `${e._id}:${e._rev}`)
    .sort()
    .join('|');
}
