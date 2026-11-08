/** Quel document d'un dossier possède quel champ (demande ou expédition). */
import type { Dossier } from '../domaine/types';

/** Champs qui n'existent que sur l'expédition. Tout le reste va à la demande. */
export const CHAMPS_EXPEDITION: ReadonlySet<string> = new Set([
  'trajet',
  'eta',
  'etape',
  'mode',
  'statutPriseEnCharge',
  'statutAvantIncident',
  'priseEnChargeLe',
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
  'reglementRecu',
  'reglementRecuLe',
  'derogationDepart',
  'derogationMotif',
  'derogationLe',
  'derogationPar',
  'numeroReservation',
  'numeroConteneur',
  'notesExploitation',
  'derniereEtapeNotifiee',
  'derniereNotificationLe',
]);

export type CibleDocument = 'demande' | 'expedition';

/** Un champ propre à l'expédition part vers l'expédition, tout le reste vers la demande (ou l'expédition seule). */
export function proprietaire(champ: string, dossier: Dossier): CibleDocument {
  if (CHAMPS_EXPEDITION.has(champ)) return 'expedition';
  return dossier.demande ? 'demande' : 'expedition';
}
