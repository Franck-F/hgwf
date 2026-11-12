/**
 * La règle unique du geste gardé (spécification 5.5), implémentée UNE fois.
 *
 * Un geste gardé change le statut d'une demande ou la prise en charge d'une
 * expédition. Pour chacun :
 *   1. les manques et garde-fous sont évalués sur le document EFFECTIF
 *      (enregistré + brouillon fusionné) : le bouton et l'écriture voient la
 *      même chose ;
 *   2. si tout passe, UN SEUL appel écrit les champs du brouillon, le statut
 *      et les traces (sous `ifRevisionId`) ;
 *   3. si un manque subsiste, rien n'est écrit, même si le document enregistré
 *      serait complet ;
 *   4. après un échec, le brouillon est intact (l'appelant ne le vide que sur
 *      `champsEnregistres` d'un succès).
 * Exceptions : les gestes qui passent par l'API (envoi du devis, notifications)
 * enregistrent d'abord le brouillon puis posent le statut en second patch
 * (`envoiExecution.ts`).
 *
 * Un verrou par dossier interdit deux gestes simultanés (double clic).
 */
import { useCallback, useMemo } from 'react';
import { avecVerrou } from '../data/activite';
import { useClientSanity, useUtilisateur } from '../data/client';
import { useMagasin } from '../data/magasin';
import { actionPrincipale } from '../domaine/actionPrincipale';
import type {
  ActionPrincipale,
  AppliquerGeste,
  ContexteEcriture,
  Geste,
  GestesSecours,
  IdAction,
  Resultat,
  ResultatGeste,
  UseGestes,
} from '../domaine/contrats';
import { documentsEffectifs } from '../domaine/fusion';
import type { Brouillon, Dossier } from '../domaine/types';
import { appelerApi } from './api';
import { executerConversion } from './conversionExecution';
import { lireCle, MESSAGE_CLE_ABSENTE } from './cleApi';
import { echec, ecrireDossier, MESSAGE_OCCUPE } from './ecriture';
import { executerEnvoi, executerTerminerEnvoi } from './envoiExecution';
import { executerClientARepondu, executerNotification, notifierClient } from './notifications';
import { planifier } from './regles';

/** Gestes d'écriture simple : plan (regles.ts), garde-fous, un seul patch, puis e-mail éventuel. */
async function gesteSimple(
  ctx: ContexteEcriture,
  dossier: Dossier,
  brouillon: Brouillon,
  geste: Geste,
): Promise<Resultat<ResultatGeste>> {
  const plan = planifier(geste, dossier, documentsEffectifs(dossier, brouillon), ctx);
  if ('ok' in plan) return plan;
  if (plan.manques.length > 0) {
    return echec('manques', `Il manque : ${plan.manques.join(', ')}.`, plan.manques);
  }
  // Sans clé, l'e-mail ne partira pas : on la réclame avant d'écrire l'étape (voir `cleDisponible`).
  if (plan.notifier && dossier.expedition && ctx.cleDisponible && !ctx.cleDisponible()) return echec('cle', MESSAGE_CLE_ABSENTE);
  const ecrit = await ecrireDossier(ctx, dossier, brouillon, plan.cible, plan.supplements);
  if (!ecrit.ok) return ecrit;
  const base = { patchs: ecrit.patchs, rev: ecrit.rev, champsEnregistres: ecrit.champsEnregistres };
  if (!plan.notifier || !dossier.expedition) return { ok: true, ...base, message: plan.message };

  // Le suivi a avancé : le client en est prévenu, d'après l'étape ENREGISTRÉE.
  const prevenu = await notifierClient(ctx, dossier.expedition);
  if (!prevenu.ok) {
    // L'étape est écrite et le reste : seul l'e-mail est à refaire. Un SUCCÈS partiel (jamais un échec) :
    // un échec 'cle' serait rejoué par `useAvecCle` sur l'ancienne révision, d'où un faux conflit.
    return {
      ok: true,
      ...base,
      message: `${plan.message} Mais le client n’a pas été prévenu : ${prevenu.message}`,
      notificationEchouee: { motif: prevenu.motif, message: prevenu.message },
    };
  }
  if (prevenu.dejaPrevenu) return { ok: true, ...base, message: plan.message, dejaPrevenu: true };
  return { ok: true, ...base, message: `${plan.message} Client prévenu.` };
}

function executer(
  ctx: ContexteEcriture,
  dossier: Dossier,
  brouillon: Brouillon,
  geste: Geste,
): Promise<Resultat<ResultatGeste>> {
  switch (geste.type) {
    case 'envoyerDevis':
      return executerEnvoi(ctx, dossier, brouillon, 'devis', geste);
    case 'envoyerComplement':
      return executerEnvoi(ctx, dossier, brouillon, 'complement', geste);
    case 'terminerEnvoi':
      return executerTerminerEnvoi(ctx, dossier);
    case 'creerExpedition':
      return executerConversion(ctx, dossier, brouillon);
    case 'notifierEtapeActuelle':
      return executerNotification(ctx, dossier, geste.eta);
    default:
      return gesteSimple(ctx, dossier, brouillon, geste);
  }
}

export const appliquerGeste: AppliquerGeste = (ctx, dossier, brouillon, geste) =>
  avecVerrou(
    dossier.id,
    () => executer(ctx, dossier, brouillon, geste),
    () => echec('refus', MESSAGE_OCCUPE),
  );

// ── Hook ────────────────────────────────────────────────────────────────────

const AUCUNE_ACTION: ActionPrincipale = { id: 'aucune', libelle: '', manques: [] };

const REFUS_FENETRE: Resultat<ResultatGeste> = {
  ok: false,
  motif: 'refus',
  message: 'Cette action passe par une fenêtre : ouvrez-la depuis le bouton du dossier.',
};

/** Geste correspondant à une action principale sans fenêtre ; `null` si l'action passe par une fenêtre. */
function gestePourAction(id: IdAction): Geste | null {
  switch (id) {
    case 'prendreEnCharge':
    case 'terminerEnvoi':
    case 'accepter':
    case 'creerExpedition':
    case 'declencherPEC':
    case 'marquerExpedie':
    case 'rouvrir':
      return { type: id };
    default:
      return null;
  }
}

/**
 * Contexte d'écriture de l'application : client Sanity, utilisateur du Studio
 * (auteur des gestes tracés), horloge, mémorisation des révisions écrites ici.
 */
export function useContexteEcriture(): ContexteEcriture {
  const client = useClientSanity();
  const { id, nom } = useUtilisateur();
  const { memoriserRevision } = useMagasin();
  // `useUtilisateur` rend un nouvel objet à chaque rendu : on mémorise sur ses valeurs.
  return useMemo(
    () => ({ client, utilisateur: { id, nom }, maintenant: () => new Date(), memoriserRevision, appelerApi, cleDisponible: () => lireCle() !== null }),
    [client, id, nom, memoriserRevision],
  );
}

export const useGestes: UseGestes = (dossier, brouillon) => {
  const ctx = useContexteEcriture();
  const action = useMemo(() => (dossier ? actionPrincipale(dossier, brouillon) : AUCUNE_ACTION), [dossier, brouillon]);

  const appliquer = useCallback(
    (geste: Geste): Promise<Resultat<ResultatGeste>> =>
      dossier
        ? appliquerGeste(ctx, dossier, brouillon, geste)
        : Promise.resolve(echec('refus', 'Aucun dossier n’est ouvert.')),
    [ctx, dossier, brouillon],
  );

  const executerAction = useCallback(
    async (id: IdAction): Promise<Resultat<ResultatGeste>> => {
      // Le bouton affiché est celui du registre : une action périmée (écran pas à jour) est refusée.
      if (id !== action.id) return echec('refus', 'Le dossier a changé : rechargez-le puis recommencez.');
      const geste = gestePourAction(id);
      return geste ? appliquer(geste) : REFUS_FENETRE;
    },
    [action.id, appliquer],
  );

  const secours = useMemo<GestesSecours>(
    () => ({
      devisHorsOutil: (saisie) => appliquer({ type: 'devisHorsOutil', ...saisie }),
      complementHorsOutil: (saisie) => appliquer({ type: 'complementHorsOutil', ...saisie }),
      accepterSansDevis: () => appliquer({ type: 'accepterSansDevis' }),
      refuser: (motif) => appliquer({ type: 'refuser', motif }),
      signalerIncident: () => appliquer({ type: 'signalerIncident' }),
      annuler: () => appliquer({ type: 'annuler' }),
      corrigerEtape: (etape) => appliquer({ type: 'corrigerEtape', etape }),
      // Pas de statut : un patch simple sur la demande, sous le même verrou.
      clientARepondu: async () =>
        dossier?.demande
          ? executerClientARepondu(ctx, dossier.demande)
          : echec('refus', 'Aucune demande dans ce dossier.'),
    }),
    [appliquer, ctx, dossier],
  );

  return { executerAction, actionPrincipale: action, secours };
};
