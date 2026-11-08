/**
 * Contexte d'écriture des composants du lot 10 (enregistrement du brouillon,
 * création d'un dossier). `useGestes` ne rend pas le sien et ne doit pas : la
 * règle 5.5 reste dans `actions/gestes.ts`. Ce hook rassemble les mêmes
 * ingrédients (client, utilisateur, horloge, mémorisation des révisions, API).
 *
 * Fichier ajouté au lot 10.
 */
import { useMemo } from 'react';
import { appelerApi } from '../../actions/envoi';
import { useClientSanity, useUtilisateur } from '../../data/client';
import { useMagasin } from '../../data/magasin';
import type { ContexteEcriture } from '../../domaine/contrats';

export function useContexteEcritureDossier(): ContexteEcriture {
  const client = useClientSanity();
  const { id, nom } = useUtilisateur();
  const { memoriserRevision } = useMagasin();
  // `useUtilisateur` rend un nouvel objet à chaque rendu : on mémorise sur ses valeurs.
  return useMemo(
    () => ({ client, utilisateur: { id, nom }, maintenant: () => new Date(), memoriserRevision, appelerApi }),
    [client, id, nom, memoriserRevision],
  );
}
