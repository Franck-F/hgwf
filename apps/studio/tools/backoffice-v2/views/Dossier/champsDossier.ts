/**
 * Champs d'un dossier : à quel document appartient chaque champ du brouillon,
 * et comment l'appeler à l'écran.
 *
 * Pourquoi : le brouillon d'un dossier est à plat (4.3, barre d'enregistrement
 * unique) mais une demande et son expédition sont deux documents Sanity. Un
 * champ propre à l'expédition part vers l'expédition, tout le reste vers la
 * demande (ou vers l'expédition quand le dossier n'a pas de demande).
 *
 * Fichier ajouté au lot 10 (absent de la liste de la spécification).
 */
import { champsModifies } from '../../domaine/fusion';
import type { Brouillon, Dossier } from '../../domaine/types';

/** Champs qui n'existent que sur l'expédition (le brouillon ne porte pas les gestes immédiats). */
export const CHAMPS_EXPEDITION: ReadonlySet<string> = new Set([
  'trajet',
  'eta',
  'mode',
  'expediteurNom',
  'expediteurAdresse',
  'expediteurTel',
  'destinataireNom',
  'destinataireAdresse',
  'destinataireTel',
  'colisNombre',
  'colisPoids',
  'colisVolume',
  'colisNature',
  'valeurDeclaree',
  'numeroReservation',
  'numeroConteneur',
  'notesExploitation',
]);

/** Noms lisibles des champs, pour la liste « vos modifications » d'un conflit. */
export const LIBELLES_CHAMPS: Record<string, string> = {
  descriptionPrestation: 'description de la prestation',
  montantHT: 'montant HT',
  tauxTVA: 'TVA',
  delaiEstime: 'délai estimé',
  ficheService: 'fiche service',
  notes: 'notes internes',
  facturationType: 'type de client',
  facturationNom: 'nom de facturation',
  facturationAdresse: 'adresse de facturation',
  facturationCodePostal: 'code postal',
  facturationVille: 'ville',
  facturationPays: 'pays',
  facturationSiret: 'SIRET',
  facturationTvaIntracom: 'TVA intracommunautaire',
  numeroFacture: 'numéro de facture',
  trajet: 'trajet',
  eta: 'date d’arrivée estimée',
  mode: 'mode de transport',
  expediteurNom: 'nom de l’expéditeur',
  expediteurAdresse: 'adresse de l’expéditeur',
  expediteurTel: 'téléphone de l’expéditeur',
  destinataireNom: 'nom du destinataire',
  destinataireAdresse: 'adresse du destinataire',
  destinataireTel: 'téléphone du destinataire',
  colisNombre: 'nombre de colis',
  colisPoids: 'poids',
  colisVolume: 'volume',
  colisNature: 'nature de la marchandise',
  valeurDeclaree: 'valeur déclarée',
  numeroReservation: 'numéro de réservation',
  numeroConteneur: 'numéro de conteneur',
  notesExploitation: 'notes d’exploitation',
};

export const libelleChamp = (champ: string): string => LIBELLES_CHAMPS[champ] ?? champ;

export interface BrouillonRepartiParDocument {
  demande: Brouillon;
  expedition: Brouillon;
}

/**
 * Répartit le brouillon entre la demande et l'expédition, en ne gardant que
 * les champs réellement différents du document enregistré (« écriture limitée
 * aux champs modifiés »).
 */
export function repartirBrouillon(dossier: Dossier, brouillon: Brouillon): BrouillonRepartiParDocument {
  const demande: Brouillon = {};
  const expedition: Brouillon = {};
  for (const [champ, valeur] of Object.entries(brouillon)) {
    // Un champ d'expédition sans expédition est ignoré plus bas : il ne doit
    // jamais atterrir sur la demande.
    const versExpedition = CHAMPS_EXPEDITION.has(champ) || dossier.demande === undefined;
    if (versExpedition) expedition[champ] = valeur;
    else demande[champ] = valeur;
  }
  return {
    demande: dossier.demande ? pick(demande, champsModifies(dossier.demande, demande)) : {},
    expedition: dossier.expedition ? pick(expedition, champsModifies(dossier.expedition, expedition)) : {},
  };
}

function pick(brouillon: Brouillon, champs: string[]): Brouillon {
  const r: Brouillon = {};
  for (const c of champs) r[c] = brouillon[c] as Brouillon[string];
  return r;
}
