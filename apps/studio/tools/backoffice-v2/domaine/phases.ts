/**
 * Phase unique calculée à partir des index existants (spécification 3.2).
 * Les index Sanity ne sont JAMAIS réordonnés : la phase se déduit, elle ne se
 * stocke pas.
 *
 * Règles de `statutAvantIncident` (3.3), tenues par `actions/expedition.ts` :
 * - Signaler un incident ou annuler écrit `statutPriseEnCharge` ∈ {4, 5} ET
 *   `statutAvantIncident` (valeur précédente 0 à 3) dans le MÊME patch. Si la
 *   valeur précédente est déjà 4 ou 5, `statutAvantIncident` n'est pas réécrit.
 * - Ici, la frise d'un incident ou d'un dossier annulé reprend la position de
 *   `statutAvantIncident` ; s'il est absent (données d'avant la V2), AUCUNE
 *   position n'est marquée : on n'invente pas d'état.
 * - Reprendre propose `statutAvantIncident` s'il est présent, sinon aucun
 *   choix (jamais de défaut deviné) ; la reprise l'efface dans le même patch.
 */
import type { EtapeFrise, TonBadge } from '../ui/types';
import { reponseApresComplement } from './complements';
import { reponseATraiter } from './echanges';
import { DEMANDE, ETAPE, PRISE_EN_CHARGE } from './statuts';
import type { Dossier, Phase } from './types';

export const LIBELLES_PHASE: Record<Phase, string> = {
  nouvelle: 'Nouvelle demande',
  aChiffrer: 'À chiffrer',
  reponseRecue: 'Réponse reçue, à chiffrer',
  devisPartiStatutACorriger: 'Devis parti, statut à corriger',
  devisEnvoye: 'Devis envoyé',
  devisHorsOutil: 'Devis envoyé',
  accepte: 'Accepté, à lancer',
  aPreparer: 'À préparer',
  pret: 'Prêt à partir',
  enRoute: 'En route',
  livre: 'Livré',
  incident: 'Incident',
  annule: 'Annulé',
  sansSuite: 'Sans suite',
};

export const TON_PHASE: Record<Phase, TonBadge> = {
  nouvelle: 'info',
  aChiffrer: 'attention',
  reponseRecue: 'attention',
  devisPartiStatutACorriger: 'urgent',
  devisEnvoye: 'info',
  devisHorsOutil: 'info',
  accepte: 'attention',
  aPreparer: 'attention',
  pret: 'info',
  enRoute: 'info',
  livre: 'ok',
  incident: 'urgent',
  annule: 'neutre',
  sansSuite: 'neutre',
};

/** Les 6 étapes de la frise de phase : Demande, Devis, Accord, Préparation, Transport, Livré. */
export const ETAPES_FRISE: EtapeFrise[] = [
  { id: 'demande', libelle: 'Demande' },
  { id: 'devis', libelle: 'Devis' },
  { id: 'accord', libelle: 'Accord' },
  { id: 'preparation', libelle: 'Préparation' },
  { id: 'transport', libelle: 'Transport' },
  { id: 'livre', libelle: 'Livré' },
];

/** Phases d'un dossier clos (aucune action, lecture seule, « Terminés »). */
export const PHASES_TERMINEES: readonly Phase[] = ['livre', 'annule', 'sansSuite'];
/** Phases de la vue « Devis » (de Nouvelle à Accepté). */
export const PHASES_DEVIS: readonly Phase[] = [
  'nouvelle',
  'aChiffrer',
  'reponseRecue',
  'devisPartiStatutACorriger',
  'devisEnvoye',
  'devisHorsOutil',
  'accepte',
];
/** Phases de la vue « Expéditions » (de À préparer à Incident). */
export const PHASES_EXPEDITION: readonly Phase[] = ['aPreparer', 'pret', 'enRoute', 'incident'];

export const estTermine = (p: Phase): boolean => PHASES_TERMINEES.includes(p);

/** Phase d'une expédition seule, ou d'une demande convertie. */
function phaseExpedition(dossier: Dossier): Phase {
  const x = dossier.expedition;
  const pec = x?.statutPriseEnCharge ?? PRISE_EN_CHARGE.aPreparer;
  // Incident et annulation sont des surcouches : elles passent avant le reste.
  if (pec === PRISE_EN_CHARGE.annule) return 'annule';
  if (pec === PRISE_EN_CHARGE.incident) return 'incident';
  if (pec === PRISE_EN_CHARGE.livre || x?.etape === ETAPE.livre) return 'livre';
  if (pec === PRISE_EN_CHARGE.expedie) return 'enRoute';
  if (pec === PRISE_EN_CHARGE.pret) return 'pret';
  return 'aPreparer';
}

export function phaseDe(dossier: Dossier): Phase {
  const d = dossier.demande;
  if (dossier.expedition && (!d || d.statut === undefined || d.statut >= DEMANDE.convertie)) {
    // Si la demande est sans suite (5) alors qu'une expédition existe, la
    // prise en charge fait foi : l'expédition est l'objet vivant.
    return phaseExpedition(dossier);
  }
  if (!d) return phaseExpedition(dossier);

  switch (d.statut ?? DEMANDE.nouvelle) {
    case DEMANDE.nouvelle:
      return 'nouvelle';
    case DEMANDE.enCours:
      // L'API a envoyé l'e-mail mais le second patch (statut 2) n'est pas passé.
      if (d.devisEnvoyeLe) return 'devisPartiStatutACorriger';
      // Le signal s'éteint quand l'équipe a lu toutes les réponses reçues (fil « Échanges »).
      return reponseApresComplement(dossier) && reponseATraiter(dossier) ? 'reponseRecue' : 'aChiffrer';
    case DEMANDE.devisEnvoye:
      return d.devisEnvoyeHorsOutilLe && !d.devisEnvoyeLe ? 'devisHorsOutil' : 'devisEnvoye';
    case DEMANDE.acceptee:
      return 'accepte';
    case DEMANDE.convertie:
      // Convertie sans expédition chargée : on ne perd pas le dossier.
      return 'aPreparer';
    case DEMANDE.sansSuite:
      return 'sansSuite';
    default:
      return 'nouvelle';
  }
}

/** Ton de la frise : rouge pour un incident, gris pour sans suite ou annulé. */
export function tonFrise(phase: Phase): 'normal' | 'urgent' | 'neutre' {
  if (phase === 'incident') return 'urgent';
  if (phase === 'annule' || phase === 'sansSuite') return 'neutre';
  return 'normal';
}

function etapeDepuisPriseEnCharge(pec: number | undefined): string | null {
  if (pec === undefined) return null;
  if (pec <= PRISE_EN_CHARGE.pret) return 'preparation';
  if (pec === PRISE_EN_CHARGE.expedie) return 'transport';
  if (pec === PRISE_EN_CHARGE.livre) return 'livre';
  return null;
}

/** Id de l'étape de la frise à marquer, ou `null` (aucune position inventée). */
export function positionFrise(dossier: Dossier): string | null {
  const phase = phaseDe(dossier);
  switch (phase) {
    case 'nouvelle':
    case 'aChiffrer':
    case 'reponseRecue':
      return 'demande';
    case 'devisPartiStatutACorriger':
    case 'devisEnvoye':
    case 'devisHorsOutil':
      return 'devis';
    case 'accepte':
      return 'accord';
    case 'aPreparer':
    case 'pret':
      return 'preparation';
    case 'enRoute':
      return 'transport';
    case 'livre':
      return 'livre';
    case 'incident':
    case 'annule':
      return etapeDepuisPriseEnCharge(dossier.expedition?.statutAvantIncident);
    default:
      return null;
  }
}
