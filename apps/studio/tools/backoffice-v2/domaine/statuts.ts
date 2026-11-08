/**
 * Constantes d'index : source unique, importées des schémas Sanity.
 *
 * Les index sont stockés en base : ne jamais réordonner les tableaux d'origine.
 * Le test `tests/domaine/statuts.test.ts` fige leur contenu pour qu'une
 * réécriture accidentelle d'un schéma casse la construction, pas les données.
 */
import {
  STATUTS_DEMANDE,
} from '../../../schemaTypes/backoffice/demandeDevis';
import {
  ETAPES_EXPEDITION,
  MODES_ENVOI,
  STATUTS_PRISE_EN_CHARGE,
} from '../../../schemaTypes/backoffice/expedition';
import { STATUTS_CONTENEUR } from '../../../schemaTypes/backoffice/conteneurOccasion';

export { STATUTS_DEMANDE, ETAPES_EXPEDITION, MODES_ENVOI, STATUTS_PRISE_EN_CHARGE, STATUTS_CONTENEUR };

/** Index nommés, pour ne jamais écrire un nombre magique dans le code. */
export const DEMANDE = {
  nouvelle: 0,
  enCours: 1,
  devisEnvoye: 2,
  acceptee: 3,
  convertie: 4,
  sansSuite: 5,
} as const;

export const PRISE_EN_CHARGE = {
  aPreparer: 0,
  pret: 1,
  expedie: 2,
  livre: 3,
  incident: 4,
  annule: 5,
} as const;

export const ETAPE = {
  priseEnCharge: 0,
  portDuHavre: 1,
  enMer: 2,
  portArrivee: 3,
  livre: 4,
} as const;
