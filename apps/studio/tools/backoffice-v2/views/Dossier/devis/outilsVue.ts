/**
 * Petits outils partagés par les sections et fenêtres des lots 11 et 12
 * (devis/* et expedition/*) : lecture d'un champ « enregistré + brouillon » et
 * contexte d'écriture pour les fenêtres qui appellent un verbe de `actions/`
 * avec des paramètres que `executerAction(id)` ne porte pas (objet et message
 * d'un e-mail, étape visée, motif de reprise).
 *
 * Pourquoi un hook local : `useGestes` ne rend pas son contexte d'écriture, et
 * l'unique implémentation de la règle 5.5 reste dans `actions/gestes.ts`. Ce
 * hook ne fait que rassembler les mêmes ingrédients (client, utilisateur,
 * horloge, mémorisation des révisions, API).
 */
import { useCallback, useMemo } from 'react';
import { appelerApi } from '../../../actions/envoi';
import { useCleApi, useToasts } from '../../../app/Contexte';
import { useClientSanity, useUtilisateur } from '../../../data/client';
import { useMagasin } from '../../../data/magasin';
import type { ContexteEcriture, Resultat, ResultatGeste } from '../../../domaine/contrats';
import type { Brouillon } from '../../../domaine/types';
import { texteEchec, useContexteDossierOptionnel } from '../ContexteDossier';

/** Valeur d'un champ : le brouillon l'emporte, un `null` du brouillon = champ vidé. */
export function valeurChamp(doc: object | undefined, brouillon: Brouillon, champ: string): unknown {
  if (champ in brouillon) {
    const v = brouillon[champ];
    return v === null ? undefined : v;
  }
  return doc ? (doc as Record<string, unknown>)[champ] : undefined;
}

export function texteChamp(doc: object | undefined, brouillon: Brouillon, champ: string): string {
  const v = valeurChamp(doc, brouillon, champ);
  return typeof v === 'string' ? v : '';
}

/** `null` si absent ou illisible : le zéro est une vraie valeur. */
export function nombreChamp(doc: object | undefined, brouillon: Brouillon, champ: string): number | null {
  const v = valeurChamp(doc, brouillon, champ);
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Contexte d'écriture des fenêtres (voir l'en-tête du fichier). */
export function useContexteEcriture(): ContexteEcriture {
  const client = useClientSanity();
  const utilisateur = useUtilisateur();
  const { memoriserRevision } = useMagasin();
  const { id, nom } = utilisateur;
  // `useUtilisateur` rend un nouvel objet à chaque rendu : on mémorise sur ses valeurs.
  return useMemo(
    () => ({ client, utilisateur: { id, nom }, maintenant: () => new Date(), memoriserRevision, appelerApi }),
    [client, id, nom, memoriserRevision],
  );
}

/**
 * Appel d'API avec la clé d'envoi : si l'action répond « clé » (absente ou
 * refusée), on ouvre la fenêtre « Clé d'envoi » et on rejoue UNE fois.
 * Pourquoi : l'équipe ne doit pas avoir à relancer le geste à la main après
 * avoir saisi la clé (4.9), sans boucle possible si la clé reste mauvaise.
 */
export function useAvecCle(): <T extends object>(appel: () => Promise<Resultat<T>>) => Promise<Resultat<T>> {
  const { demanderCle } = useCleApi();
  return useCallback(
    async <T extends object>(appel: () => Promise<Resultat<T>>): Promise<Resultat<T>> => {
      const premier = await appel();
      // Jamais de rejeu si le geste a déjà écrit : il repartirait sur l'ancienne révision (faux conflit).
      if (premier.ok || premier.motif !== 'cle' || premier.ecritureFaite) return premier;
      return (await demanderCle()) ? appel() : premier;
    },
    [demanderCle],
  );
}

/**
 * Exécute un geste d'écriture. Sous `DossierPage`, on passe par `lancer` du
 * contexte (toast, brouillon vidé, relecture, conflit) ; hors page (test,
 * aperçu), on se contente d'annoncer le résultat. Ainsi la fenêtre n'a qu'à
 * fermer sur succès.
 */
export function useLanceur(): (geste: () => Promise<Resultat<ResultatGeste>>) => Promise<Resultat<ResultatGeste>> {
  const contexte = useContexteDossierOptionnel();
  const toasts = useToasts();
  const lancer = contexte?.lancer;
  return useCallback(
    async (geste) => {
      if (lancer) return lancer(geste);
      const r = await geste();
      if (r.ok) toasts.succes(r.message ?? 'Enregistré.');
      else toasts.erreur(texteEchec(r));
      return r;
    },
    [lancer, toasts],
  );
}
