/**
 * Registre unique de l'action principale par phase (spécification 4.3).
 *
 * Fonction pure : les composants ne connaissent que `id`, `ouvre` et
 * `confirmation` et ne décident jamais de la logique. Les manques sont évalués
 * sur le document EFFECTIF (enregistré + brouillon) : le bouton reflète ce que
 * l'utilisateur voit (5.5).
 */
import type { ActionPrincipale, CalculerActionPrincipale, IdAction } from './contrats';
import { complementARelancer, complementEnAttente, dateComplement, libelleMoyen } from './complements';
import { champsModifiesDossier, documentsEffectifs } from './fusion';
import { formaterDate } from './format';
import { lireDate } from './echeances';
import {
  chiffrageAmorce,
  manquesConversion,
  manquesDepart,
  manquesEnvoiComplement,
  manquesMontant,
  manquesDevis,
  manquesPriseEnCharge,
} from './manques';
import { phaseDe } from './phases';
import { appelClient } from './messages';
import { ETAPES_EXPEDITION, ETAPE } from './statuts';
import type { Demande, Dossier, Expedition } from './types';

/** Verbe à l'infinitif après « Enregistrer et », pour les actions qui enregistrent. */
const VERBE_ENREGISTRER: Partial<Record<IdAction, string>> = {
  prendreEnCharge: 'prendre en charge',
  envoyerDevis: 'envoyer le devis',
  demanderComplements: 'demander des compléments',
  accepter: 'marquer le devis accepté',
  creerExpedition: "créer l'expédition",
  declencherPEC: 'déclencher la prise en charge',
  marquerExpedie: 'marquer expédié',
  avancerSuivi: 'avancer le suivi',
  marquerLivre: 'marquer livré',
  reprendre: 'reprendre le dossier',
  rouvrir: 'rouvrir le dossier',
};

const nomClient = (d: Dossier) => d.demande?.clientNom?.trim() || d.expedition?.clientNom?.trim() || 'le client';

function aucune(phrase: string): ActionPrincipale {
  return { id: 'aucune', libelle: 'Dossier terminé', manques: [], phrase };
}

/** Action de la phase « à chiffrer » : envoyer le devis, ou demander des compléments. */
function actionChiffrage(dossier: Dossier, demande: Demande, apresReponse: boolean, maintenant: Date): ActionPrincipale {
  const prenom = appelClient(demande.clientNom, demande.facturationType) || 'le client';
  if (chiffrageAmorce(demande)) {
    const manques = manquesDevis(demande);
    return {
      id: 'envoyerDevis',
      libelle: 'Envoyer le devis',
      ouvre: 'envoi',
      manques,
      phrase: manques.length
        ? 'Complétez le devis pour pouvoir l’envoyer.'
        : `Le devis est prêt. Relisez-le puis envoyez-le à ${prenom}.`,
    };
  }
  const manquesMontantDevis = manquesMontant(demande);
  if (complementEnAttente(dossier)) {
    // Compléments déjà demandés : on attend le client, la phrase le dit clairement.
    const date = dateComplement(demande);
    const quand = date ? `le ${formaterDate(date)}` : '(date inconnue)';
    const moyen = libelleMoyen(demande.complementDemandeHorsOutil) || 'E-mail';
    return {
      id: 'demanderComplements',
      libelle: complementARelancer(dossier, maintenant) ? 'Relancer le client' : 'Demander des compléments',
      ouvre: 'complement',
      manques: manquesEnvoiComplement(demande),
      phrase: `Compléments demandés ${quand} (${moyen}). En attente de la réponse de ${prenom}.`,
    };
  }
  const debut = apresReponse ? `${prenom} a répondu à vos questions. ` : '';
  return {
    id: 'demanderComplements',
    libelle: 'Demander des compléments',
    ouvre: 'complement',
    // Le bouton ne dépend que de l'adresse e-mail : on peut demander des
    // compléments sans montant (c'est précisément pour pouvoir chiffrer).
    manques: manquesEnvoiComplement(demande),
    phrase: `${debut}Il manque encore ${manquesMontantDevis.join(' et ')} pour envoyer un devis. Saisissez-les, ou demandez des compléments à ${prenom}.`,
  };
}

function actionExpedition(dossier: Dossier, expedition: Expedition | undefined): ActionPrincipale {
  const phase = phaseDe(dossier);
  const x = expedition ?? ({ _id: '', _rev: '', _type: 'expedition' } as Expedition);
  const client = nomClient(dossier);
  switch (phase) {
    case 'aPreparer': {
      const manques = manquesPriseEnCharge(x);
      return {
        id: 'declencherPEC',
        libelle: 'Déclencher la prise en charge',
        confirmation: {
          titre: 'Déclencher la prise en charge ?',
          consequence: `Le dossier de ${client} passe à « Prêt à partir ».`,
          verbe: 'Déclencher',
        },
        manques,
        phrase: manques.length
          ? 'Renseignez ce qui manque pour déclarer l’expédition prête.'
          : 'Tout est renseigné. Vous pouvez déclarer l’expédition prête à partir.',
      };
    }
    case 'pret': {
      const manques = manquesDepart(x);
      return {
        id: 'marquerExpedie',
        libelle: 'Marquer expédié',
        confirmation: {
          titre: 'Marquer l’expédition comme expédiée ?',
          consequence: `Le dossier de ${client} passe « En route » et le suivi devient actif pour le client.`,
          verbe: 'Marquer expédié',
        },
        manques,
        phrase: manques.length ? 'Le départ n’est pas encore autorisé.' : 'Le conteneur est parti ? Marquez l’expédition.',
      };
    }
    case 'enRoute': {
      const etape = x.etape ?? ETAPE.priseEnCharge;
      if (etape >= ETAPE.portArrivee) {
        return {
          id: 'marquerLivre',
          libelle: 'Marquer livré',
          ouvre: 'suivi',
          manques: [],
          phrase: 'La marchandise est arrivée. Marquez le dossier livré et prévenez le client.',
        };
      }
      const suivante = ETAPES_EXPEDITION[etape + 1] ?? '';
      return {
        id: 'avancerSuivi',
        libelle: `Étape suivante : ${suivante}`,
        ouvre: 'suivi',
        manques: [],
        phrase: `Faites avancer le suivi de ${client} et prévenez-le.`,
      };
    }
    case 'incident':
      return {
        id: 'reprendre',
        libelle: 'Reprendre le dossier',
        ouvre: 'reprise',
        manques: [],
        phrase: 'Un incident est signalé. Reprenez le dossier quand il est résolu.',
      };
    case 'annule':
      return {
        id: 'rouvrir',
        libelle: 'Rouvrir le dossier',
        ouvre: 'reprise',
        manques: [],
        phrase: 'Ce dossier est annulé. Vous pouvez le rouvrir.',
      };
    default:
      return aucune('Ce dossier est terminé.');
  }
}

/** Dernière date lisible : sert à écrire « parti le 05/11/2026 ». */
function dateEnvoi(d: Demande): string {
  const date = lireDate(d.devisEnvoyeLe);
  return date ? formaterDate(date) : 'récemment';
}

function avecEnregistrement(action: ActionPrincipale, nbModifications: number): ActionPrincipale {
  const verbe = VERBE_ENREGISTRER[action.id];
  if (nbModifications === 0 || !verbe) return action;
  return { ...action, libelle: `Enregistrer et ${verbe}` };
}

export const actionPrincipale: CalculerActionPrincipale = (dossier, brouillon, maintenant = new Date()) => {
  const phase = phaseDe(dossier);
  const { demande, expedition } = documentsEffectifs(dossier, brouillon);
  const modifications = champsModifiesDossier(dossier, brouillon).length;
  const client = nomClient(dossier);

  let action: ActionPrincipale;
  switch (phase) {
    case 'nouvelle':
      action = {
        id: 'prendreEnCharge',
        libelle: 'Prendre en charge',
        manques: [],
        phrase: `Nouvelle demande de ${client}. Prenez-la en charge pour commencer le chiffrage.`,
      };
      break;
    case 'aChiffrer':
    case 'reponseRecue':
      action = demande
        ? actionChiffrage(dossier, demande, phase === 'reponseRecue', maintenant)
        : aucune('Demande introuvable.');
      break;
    case 'devisPartiStatutACorriger':
      // Aucun e-mail : l'e-mail est déjà parti. « Envoyer le devis » n'est
      // volontairement pas proposé (renvoi : menu « Autres actions »).
      action = {
        id: 'terminerEnvoi',
        libelle: "Terminer l'enregistrement de l'envoi",
        manques: [],
        phrase: demande
          ? `Le devis est parti chez ${client} le ${dateEnvoi(demande)}, mais le dossier n’a pas été mis à jour. Aucun e-mail ne sera renvoyé.`
          : 'Le devis est parti, mais le dossier n’a pas été mis à jour.',
      };
      break;
    case 'devisEnvoye':
    case 'devisHorsOutil':
      action = {
        id: 'accepter',
        libelle: 'Le client a accepté',
        manques: [],
        phrase: `Le devis est chez ${client}. Dès qu’il accepte, notez-le ici.`,
      };
      break;
    case 'accepte':
      action = {
        id: 'creerExpedition',
        libelle: "Créer l'expédition",
        confirmation: {
          titre: "Créer l'expédition ?",
          consequence: `Le suivi de ${client} devient visible par le client.`,
          verbe: "Créer l'expédition",
        },
        manques: demande ? manquesConversion(demande) : [],
        phrase: `${client} a accepté le devis. Créez l’expédition pour lancer la préparation.`,
      };
      break;
    case 'sansSuite':
      action = {
        id: 'rouvrir',
        libelle: 'Rouvrir le dossier',
        manques: [],
        phrase: 'Cette demande est classée sans suite. Vous pouvez la rouvrir.',
      };
      break;
    case 'livre':
      action = aucune('La marchandise est livrée. Rien à faire.');
      break;
    default:
      action = actionExpedition(dossier, expedition);
  }
  return avecEnregistrement(action, modifications);
};
