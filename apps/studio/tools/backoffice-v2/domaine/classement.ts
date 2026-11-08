/**
 * Classement d'un dossier dans « À faire » (spécification 4.1) : groupe, rang
 * dans le groupe, ou « En attente » avec sa raison. Séparé de `priorites.ts`
 * pour tenir la limite de 300 lignes par fichier.
 */
import { actionPrincipale } from './actionPrincipale';
import {
  ageJours,
  ageOuvreHeures,
  ageOuvreJours,
  debutDeJour,
  lireDate,
  SEUIL_ACCEPTE_J,
  SEUIL_CHIFFRAGE_RETARD_H,
  SEUIL_DEVIS_APPEL_J,
  SEUIL_NOUVELLE_ATTENTE_H,
  SEUIL_NOUVELLE_RETARD_H,
  SEUIL_ROUTE_J,
} from './echeances';
import { ilYa } from './format';
import { chiffrageAmorce, manquesDevis, manquesPriseEnCharge } from './manques';
import { estTermine, phaseDe } from './phases';
import type { Demande, Dossier, Expedition, IdGroupeAFaire, LigneAFaire, Phase } from './types';

export interface Candidat {
  groupe: IdGroupeAFaire;
  /** Rang dans le groupe (a, b, c… de la spécification) ; plus petit = plus haut. */
  rang: number;
  /** Date de référence : à rang égal, le plus ancien d'abord. */
  depuis: Date;
  ligne: LigneAFaire;
}

const nomDe = (d: Dossier) => d.demande?.clientNom?.trim() || d.expedition?.clientNom?.trim() || 'Client sans nom';
const refDe = (d: Dossier) => d.demande?.reference || d.expedition?.reference || '';

/** Première date lisible parmi les candidats, sinon `repli`. */
export function premiereDate(textes: (string | undefined)[], repli: Date): Date {
  for (const t of textes) {
    const d = lireDate(t);
    if (d) return d;
  }
  return repli;
}

function dateReception(d: Demande, maintenant: Date): Date {
  return premiereDate([d.recueLe, d._createdAt], maintenant);
}

function ligne(
  dossier: Dossier,
  phase: Phase,
  raison: string,
  depuis: Date,
  maintenant: Date,
  enRetard: boolean,
): LigneAFaire {
  return {
    dossierId: dossier.id,
    client: nomDe(dossier),
    reference: refDe(dossier),
    raison,
    ageJours: ageJours(depuis, maintenant),
    enRetard,
    actionLibelle: actionPrincipale(dossier, {}).libelle,
    phase,
  };
}

/** Marqueur interne : le dossier attend, avec la raison. */
export interface Attente {
  attente: string;
  ligne: LigneAFaire;
  depuis: Date;
}

export type Classement = { candidat: Candidat } | { attente: Attente } | null;

function classerDemande(dossier: Dossier, d: Demande, phase: Phase, maintenant: Date): Classement {
  const recue = dateReception(d, maintenant);

  switch (phase) {
    case 'nouvelle': {
      const h = ageOuvreHeures(recue, maintenant);
      const raison = `Reçue ${ilYa(recue, maintenant)}`;
      if (h < SEUIL_NOUVELLE_ATTENTE_H) {
        return { attente: { attente: raison, ligne: ligne(dossier, phase, raison, recue, maintenant, false), depuis: recue } };
      }
      const retard = h > SEUIL_NOUVELLE_RETARD_H;
      return {
        candidat: { groupe: 'aOuvrir', rang: 0, depuis: recue, ligne: ligne(dossier, phase, raison, recue, maintenant, retard) },
      };
    }
    case 'devisPartiStatutACorriger': {
      const envoi = premiereDate([d.devisEnvoyeLe], recue);
      const raison = 'Devis parti, statut à corriger';
      return { candidat: { groupe: 'devis', rang: 0, depuis: envoi, ligne: ligne(dossier, phase, raison, envoi, maintenant, true) } };
    }
    case 'reponseRecue': {
      const reponse = premiereDate([d.reponseClientLe], recue);
      const retard = ageOuvreHeures(reponse, maintenant) > SEUIL_CHIFFRAGE_RETARD_H;
      const raison = 'Réponse reçue, à chiffrer';
      return { candidat: { groupe: 'devis', rang: 1, depuis: reponse, ligne: ligne(dossier, phase, raison, reponse, maintenant, retard) } };
    }
    case 'aChiffrer': {
      if (d.complementDemandeLe && !d.reponseClientLe) {
        const demande = premiereDate([d.complementDemandeLe], recue);
        const raison = `Compléments demandés ${ilYa(demande, maintenant)}, sans réponse`;
        return { candidat: { groupe: 'devis', rang: 3, depuis: demande, ligne: ligne(dossier, phase, raison, demande, maintenant, false) } };
      }
      const retard = ageOuvreHeures(recue, maintenant) > SEUIL_CHIFFRAGE_RETARD_H;
      const pret = chiffrageAmorce(d) && manquesDevis(d).length === 0;
      const raison = pret ? 'Chiffré, prêt à envoyer' : chiffrageAmorce(d) ? 'Devis à compléter' : 'Montant à saisir';
      return { candidat: { groupe: 'devis', rang: 2, depuis: recue, ligne: ligne(dossier, phase, raison, recue, maintenant, retard) } };
    }
    case 'accepte': {
      const accepte = premiereDate([d.acceptationLe, d._updatedAt], recue);
      const retard = ageOuvreJours(accepte, maintenant) > SEUIL_ACCEPTE_J;
      const raison = `Accepté ${ilYa(accepte, maintenant)}, expédition à créer`;
      return { candidat: { groupe: 'devis', rang: 4, depuis: accepte, ligne: ligne(dossier, phase, raison, accepte, maintenant, retard) } };
    }
    case 'devisEnvoye':
    case 'devisHorsOutil': {
      const horsOutil = phase === 'devisHorsOutil';
      const envoi = lireDate(horsOutil ? d.devisEnvoyeHorsOutilLe : d.devisEnvoyeLe);
      if (!envoi) {
        // Date illisible ou absente (anciens documents) : jamais invisible.
        const raison = 'Devis envoyé, date inconnue : à appeler';
        return { candidat: { groupe: 'sansReponse', rang: 0, depuis: recue, ligne: ligne(dossier, phase, raison, recue, maintenant, false) } };
      }
      const jours = ageJours(envoi, maintenant);
      const quand = horsOutil ? `Envoyé hors outil ${ilYa(envoi, maintenant)}` : `Envoyé ${ilYa(envoi, maintenant)}`;
      if (jours < SEUIL_DEVIS_APPEL_J) {
        const raison = `Devis ${horsOutil ? 'envoyé hors outil' : 'envoyé'} ${ilYa(envoi, maintenant)}`;
        return { attente: { attente: raison, ligne: ligne(dossier, phase, raison, envoi, maintenant, false), depuis: envoi } };
      }
      const suffixe = !horsOutil && d.relanceEnvoyeeLe ? ', relancé automatiquement' : '';
      const raison = `${quand}${suffixe} : à appeler`;
      return { candidat: { groupe: 'sansReponse', rang: 0, depuis: envoi, ligne: ligne(dossier, phase, raison, envoi, maintenant, false) } };
    }
    default:
      return null;
  }
}

function derniereMiseAJourRoute(x: Expedition, maintenant: Date): Date {
  return premiereDate([x.derniereNotificationLe, x.priseEnChargeLe, x._updatedAt, x._createdAt], maintenant);
}

function classerExpedition(dossier: Dossier, x: Expedition, phase: Phase, maintenant: Date): Classement {
  const depuis = premiereDate([x.priseEnChargeLe, x._createdAt], maintenant);
  switch (phase) {
    case 'incident': {
      const raison = 'Incident à traiter';
      return { candidat: { groupe: 'expeditions', rang: 0, depuis, ligne: ligne(dossier, phase, raison, depuis, maintenant, true) } };
    }
    case 'aPreparer': {
      const n = manquesPriseEnCharge(x).length;
      if (n > 0) {
        const raison = `À préparer : il manque ${n} information${n > 1 ? 's' : ''}`;
        return { candidat: { groupe: 'expeditions', rang: 1, depuis, ligne: ligne(dossier, phase, raison, depuis, maintenant, false) } };
      }
      const raison = 'À préparer : prête à être déclenchée';
      return { candidat: { groupe: 'expeditions', rang: 5, depuis, ligne: ligne(dossier, phase, raison, depuis, maintenant, false) } };
    }
    case 'pret': {
      const sansReglement = x.reglementRecu !== true && !(x.derogationDepart === true && (x.derogationMotif ?? '').trim());
      if (sansReglement) {
        const raison = 'Prête à partir, règlement non reçu';
        return { candidat: { groupe: 'expeditions', rang: 2, depuis, ligne: ligne(dossier, phase, raison, depuis, maintenant, false) } };
      }
      const raison = 'Prête à partir, à marquer expédiée';
      return { candidat: { groupe: 'expeditions', rang: 4, depuis, ligne: ligne(dossier, phase, raison, depuis, maintenant, false) } };
    }
    case 'enRoute': {
      const maj = derniereMiseAJourRoute(x, maintenant);
      const joursSansMaj = ageJours(maj, maintenant);
      const eta = lireDate(x.eta);
      const etaDepassee = eta !== null && eta.getTime() < debutDeJour(maintenant).getTime();
      if (etaDepassee || joursSansMaj >= SEUIL_ROUTE_J) {
        const raison = etaDepassee
          ? `Arrivée prévue dépassée, suivi mis à jour ${ilYa(maj, maintenant)}`
          : `En route, suivi non mis à jour ${ilYa(maj, maintenant)}`;
        return { candidat: { groupe: 'expeditions', rang: 3, depuis: maj, ligne: ligne(dossier, phase, raison, maj, maintenant, true) } };
      }
      const raison = `En route, suivi mis à jour ${ilYa(maj, maintenant)}`;
      return { attente: { attente: raison, ligne: ligne(dossier, phase, raison, maj, maintenant, false), depuis: maj } };
    }
    default:
      return null;
  }
}

export function classer(dossier: Dossier, maintenant: Date): Classement {
  const phase = phaseDe(dossier);
  if (estTermine(phase)) return null;
  const { demande, expedition } = dossier;
  if (phase === 'aPreparer' || phase === 'pret' || phase === 'enRoute' || phase === 'incident') {
    return classerExpedition(dossier, expedition ?? ({ _id: dossier.id, _rev: '', _type: 'expedition' } as Expedition), phase, maintenant);
  }
  return demande ? classerDemande(dossier, demande, phase, maintenant) : null;
}

export function comparer(a: Candidat, b: Candidat): number {
  if (a.rang !== b.rang) return a.rang - b.rang;
  return a.depuis.getTime() - b.depuis.getTime();
}
