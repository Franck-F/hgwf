/**
 * Planification des gestes gardés qui n'appellent pas l'API (spécification
 * 5.5) : pour chaque geste, sur quel document il écrit, quels garde-fous
 * s'appliquent, et quels champs il pose (statut et traces).
 *
 * Fonction pure : elle reçoit le dossier ET les documents « effectifs »
 * (enregistré + brouillon fusionné) et ne lit ni n'écrit rien. Les manques sont
 * évalués sur le document effectif, jamais sur le document enregistré seul :
 * ce que l'utilisateur voit à l'écran est ce qui est évalué.
 *
 * `etape` vaut 4 à UN seul endroit de tout le code (`planLivre`), toujours avec
 * la prise en charge 3 : aucun chemin n'écrit l'étape « Livré » sans elle.
 */
import type { ContexteEcriture, Geste } from '../domaine/contrats';
import { complementEnAttente } from '../domaine/complements';
import { formaterDate, formaterDateHeure } from '../domaine/format';
import { lireDate, debutDeJour } from '../domaine/echeances';
import { manquesDepart, manquesMontant, manquesPriseEnCharge, manquesDevis } from '../domaine/manques';
import { phaseDe } from '../domaine/phases';
import { DEMANDE, ETAPE, PRISE_EN_CHARGE } from '../domaine/statuts';
import type { Demande, Dossier, Expedition } from '../domaine/types';
import { echec, type CibleDocument, type Echec } from './ecriture';

export interface Plan {
  cible: CibleDocument;
  /** Manques bloquants : si la liste n'est pas vide, aucune écriture. */
  manques: string[];
  /** Champs posés par le geste (statut, traces). `null` = champ à retirer. */
  supplements: Record<string, unknown>;
  /** Message du toast de succès. */
  message: string;
  /** Il faut prévenir le client par e-mail après l'écriture. */
  notifier?: boolean;
}

export interface Documents {
  demande?: Demande;
  expedition?: Expedition;
}

const MANQUE_EMAIL = "l'adresse e-mail du client";

const nomDe = (d: Dossier): string => d.demande?.clientNom?.trim() || d.expedition?.clientNom?.trim() || 'le client';

const refuser = (message: string): Echec => echec('refus', message);

function pecDe(x: Expedition | undefined): number {
  return x?.statutPriseEnCharge ?? PRISE_EN_CHARGE.aPreparer;
}

/** Cible : la demande, sinon le dossier est refusé. */
function surDemande(dossier: Dossier): Demande | Echec {
  return dossier.demande ?? refuser('Ce dossier n’a pas de demande de devis.');
}

function surExpedition(dossier: Dossier): Expedition | Echec {
  return dossier.expedition ?? refuser('Ce dossier n’a pas encore d’expédition.');
}

const estEchec = (v: unknown): v is Echec => typeof v === 'object' && v !== null && 'ok' in v;

/** Écrit « étape 4 + prise en charge 3 » : l'UNIQUE chemin vers l'étape « Livré ». */
function planLivre(dossier: Dossier, x: Expedition, notifier: boolean, eta?: string): Plan | Echec {
  const pec = pecDe(x);
  if (pec > PRISE_EN_CHARGE.expedie) return refuser('Ce dossier ne peut plus être marqué livré dans son état actuel.');
  const supplements: Record<string, unknown> = { etape: ETAPE.livre, statutPriseEnCharge: PRISE_EN_CHARGE.livre };
  if (eta && eta.trim()) supplements.eta = eta.trim();
  return { cible: 'expedition', manques: [], supplements, message: `Dossier de ${nomDe(dossier)} marqué livré.`, notifier };
}

/** Incident et annulation : le statut précédent est mémorisé dans le MÊME patch (3.3). */
function planSurcouche(dossier: Dossier, x: Expedition, nouveau: 4 | 5): Plan {
  const avant = pecDe(x);
  const supplements: Record<string, unknown> = { statutPriseEnCharge: nouveau };
  // Déjà en incident ou annulé : on ne réécrit pas, l'état d'avant est déjà là.
  if (avant !== PRISE_EN_CHARGE.incident && avant !== PRISE_EN_CHARGE.annule) supplements.statutAvantIncident = avant;
  return {
    cible: 'expedition',
    manques: [],
    supplements,
    message: nouveau === 4 ? 'Incident signalé.' : `Dossier de ${nomDe(dossier)} annulé.`,
  };
}

function planReprise(dossier: Dossier, x: Expedition, eff: Expedition, choix: 0 | 1 | 2 | null): Plan | Echec {
  const pec = pecDe(x);
  if (pec !== PRISE_EN_CHARGE.incident && pec !== PRISE_EN_CHARGE.annule) {
    return refuser('Ce dossier n’est ni en incident ni annulé.');
  }
  // L'état d'avant l'incident est PROPOSÉ ; s'il est inconnu (données d'avant la V2), on n'invente rien.
  const avant = x.statutAvantIncident;
  const retenu = choix ?? (avant === 0 || avant === 1 || avant === 2 ? avant : null);
  if (retenu === null) {
    return refuser('Choisissez l’état dans lequel reprendre le dossier : à préparer, prêt ou expédié.');
  }
  // Les garde-fous du statut repris s'appliquent comme s'il était posé normalement.
  const manques =
    retenu === PRISE_EN_CHARGE.pret
      ? manquesPriseEnCharge(eff)
      : retenu === PRISE_EN_CHARGE.expedie
        ? manquesDepart(eff)
        : [];
  return {
    cible: 'expedition',
    manques,
    supplements: { statutPriseEnCharge: retenu, statutAvantIncident: null },
    message: `Dossier de ${nomDe(dossier)} repris.`,
  };
}

/**
 * Plan d'un geste, ou le refus qui l'arrête avant toute écriture.
 * Les gestes qui passent par l'API ou par une transaction (envoi, compléments,
 * création d'expédition, notification) sont traités ailleurs.
 */
export function planifier(geste: Geste, dossier: Dossier, eff: Documents, ctx: ContexteEcriture): Plan | Echec {
  const maintenant = ctx.maintenant();
  const horodatage = formaterDateHeure(maintenant);
  const auteur = ctx.utilisateur.nom;
  const phase = phaseDe(dossier);

  switch (geste.type) {
    case 'prendreEnCharge': {
      const d = surDemande(dossier);
      if (estEchec(d)) return d;
      if ((d.statut ?? DEMANDE.nouvelle) !== DEMANDE.nouvelle) return refuser('Cette demande est déjà prise en charge.');
      return { cible: 'demande', manques: [], supplements: { statut: DEMANDE.enCours }, message: `Demande de ${nomDe(dossier)} prise en charge.` };
    }
    case 'accepter': {
      const d = surDemande(dossier);
      if (estEchec(d)) return d;
      if (phase !== 'devisEnvoye' && phase !== 'devisHorsOutil') return refuser('Le devis n’est pas à l’état « envoyé » : rechargez le dossier.');
      return {
        cible: 'demande',
        manques: [],
        supplements: { statut: DEMANDE.acceptee, acceptationLe: horodatage, acceptationPar: auteur },
        message: `Devis accepté par ${nomDe(dossier)}.`,
      };
    }
    case 'accepterSansDevis': {
      const d = surDemande(dossier);
      if (estEchec(d)) return d;
      if (phase !== 'aChiffrer' && phase !== 'reponseRecue') return refuser('L’acceptation orale se note sur une demande à chiffrer.');
      return {
        cible: 'demande',
        // Pas de devis, mais le chiffrage doit exister : l'expédition en dépend.
        manques: eff.demande ? manquesMontant(eff.demande) : [],
        supplements: { statut: DEMANDE.acceptee, acceptationLe: horodatage, acceptationPar: auteur },
        message: `Acceptation de ${nomDe(dossier)} enregistrée.`,
      };
    }
    case 'devisHorsOutil': {
      const d = surDemande(dossier);
      if (estEchec(d)) return d;
      if (phase !== 'aChiffrer' && phase !== 'reponseRecue') return refuser('Un devis hors outil se note sur une demande à chiffrer.');
      const date = lireDate(geste.date);
      if (!date) return refuser('La date d’envoi est illisible.');
      if (date.getTime() > debutDeJour(maintenant).getTime() + 86_400_000 - 1) return refuser('La date d’envoi ne peut pas être dans le futur.');
      return {
        cible: 'demande',
        // Comme pour un envoi, sans l'adresse e-mail : le devis est parti par un autre moyen.
        manques: eff.demande ? manquesDevis(eff.demande).filter((m) => m !== MANQUE_EMAIL) : [],
        // Volontairement PAS `devisEnvoyeLe` : l'API de relance ne doit pas s'appliquer à ce devis.
        supplements: {
          statut: DEMANDE.devisEnvoye,
          devisEnvoyeHorsOutilLe: formaterDate(date),
          devisEnvoyeHorsOutilPar: auteur,
          devisEnvoyeHorsOutilMoyen: geste.moyen,
        },
        message: 'Devis envoyé hors outil enregistré.',
      };
    }
    case 'complementHorsOutil': {
      const d = surDemande(dossier);
      if (estEchec(d)) return d;
      if (phase !== 'nouvelle' && phase !== 'aChiffrer' && phase !== 'reponseRecue') {
        return refuser('Des compléments hors outil se notent sur une demande nouvelle ou à chiffrer.');
      }
      if (complementEnAttente(dossier)) return refuser('Des compléments sont déjà demandés : le client doit répondre.');
      const date = lireDate(geste.date);
      if (!date) return refuser('La date de la demande est illisible.');
      if (date.getTime() > debutDeJour(maintenant).getTime() + 86_400_000 - 1) return refuser('La date de la demande ne peut pas être dans le futur.');
      // Statut 0 vers 1 si la demande était nouvelle ; sinon on ne touche pas au statut.
      const supplements: Record<string, unknown> = {
        complementDemandeLe: formaterDate(date),
        complementDemandeHorsOutil: geste.moyen,
        complementDemandePar: auteur,
      };
      if ((d.statut ?? DEMANDE.nouvelle) === DEMANDE.nouvelle) supplements.statut = DEMANDE.enCours;
      return { cible: 'demande', manques: [], supplements, message: 'Compléments demandés hors outil enregistrés.' };
    }
    case 'refuser': {
      const d = surDemande(dossier);
      if (estEchec(d)) return d;
      if (dossier.expedition || (d.statut ?? 0) > DEMANDE.acceptee) return refuser('Cette demande ne peut plus être classée sans suite.');
      return { cible: 'demande', manques: [], supplements: { statut: DEMANDE.sansSuite, motifRefus: geste.motif }, message: 'Dossier classé sans suite.' };
    }
    case 'declencherPEC': {
      const x = surExpedition(dossier);
      if (estEchec(x)) return x;
      if (pecDe(x) !== PRISE_EN_CHARGE.aPreparer) return refuser('La prise en charge est déjà déclenchée : rechargez le dossier.');
      return {
        cible: 'expedition',
        manques: eff.expedition ? manquesPriseEnCharge(eff.expedition) : [],
        supplements: { statutPriseEnCharge: PRISE_EN_CHARGE.pret, priseEnChargeLe: horodatage },
        message: 'Prise en charge déclenchée : le dossier est prêt à partir.',
      };
    }
    case 'marquerExpedie': {
      const x = surExpedition(dossier);
      if (estEchec(x)) return x;
      if (pecDe(x) !== PRISE_EN_CHARGE.pret) return refuser('Le dossier n’est pas « prêt à partir » : rechargez-le.');
      return {
        cible: 'expedition',
        manques: eff.expedition ? manquesDepart(eff.expedition) : [],
        supplements: { statutPriseEnCharge: PRISE_EN_CHARGE.expedie },
        message: 'Expédition marquée comme partie.',
      };
    }
    case 'avancerSuivi': {
      const x = surExpedition(dossier);
      if (estEchec(x)) return x;
      if (pecDe(x) > PRISE_EN_CHARGE.expedie) return refuser('Le suivi ne peut pas avancer dans l’état actuel du dossier.');
      if (!Number.isInteger(geste.etape) || geste.etape < ETAPE.priseEnCharge || geste.etape > ETAPE.livre) {
        return refuser('Cette étape du suivi n’existe pas.');
      }
      // « Livré » n'a qu'un seul chemin d'écriture.
      if (geste.etape === ETAPE.livre) return planLivre(dossier, x, geste.notifier, geste.eta);
      if (geste.etape <= (x.etape ?? ETAPE.priseEnCharge)) {
        return refuser('Pour revenir en arrière, utilisez « Corriger l’étape du suivi ».');
      }
      const supplements: Record<string, unknown> = { etape: geste.etape };
      if (geste.eta && geste.eta.trim()) supplements.eta = geste.eta.trim();
      return { cible: 'expedition', manques: [], supplements, message: 'Suivi avancé.', notifier: geste.notifier };
    }
    case 'marquerLivre': {
      const x = surExpedition(dossier);
      if (estEchec(x)) return x;
      return planLivre(dossier, x, geste.notifier);
    }
    case 'corrigerEtape': {
      const x = surExpedition(dossier);
      if (estEchec(x)) return x;
      if (pecDe(x) > PRISE_EN_CHARGE.expedie) return refuser('Le suivi ne peut pas être corrigé dans l’état actuel du dossier.');
      if (!Number.isInteger(geste.etape) || geste.etape < ETAPE.priseEnCharge || geste.etape >= ETAPE.livre) {
        return refuser('Pour livrer le dossier, utilisez « Marquer livré ».');
      }
      if (geste.etape === (x.etape ?? ETAPE.priseEnCharge)) return refuser('Le suivi est déjà à cette étape.');
      // Correction : le client n'est pas prévenu (il verrait le recul sur la page de suivi).
      return { cible: 'expedition', manques: [], supplements: { etape: geste.etape }, message: 'Étape du suivi corrigée.' };
    }
    case 'signalerIncident':
    case 'annuler': {
      const x = surExpedition(dossier);
      if (estEchec(x)) return x;
      return planSurcouche(dossier, x, geste.type === 'signalerIncident' ? 4 : 5);
    }
    case 'reprendre': {
      const x = surExpedition(dossier);
      if (estEchec(x)) return x;
      return planReprise(dossier, x, eff.expedition ?? x, geste.choix);
    }
    case 'rouvrir': {
      if (phase === 'sansSuite') {
        return { cible: 'demande', manques: [], supplements: { statut: DEMANDE.enCours, motifRefus: null }, message: 'Dossier rouvert.' };
      }
      const x = dossier.expedition;
      if (phase === 'annule' && x) return planReprise(dossier, x, eff.expedition ?? x, null);
      return refuser('Ce dossier n’est pas à rouvrir.');
    }
    default:
      return refuser('Ce geste n’est pas pris en charge.');
  }
}
