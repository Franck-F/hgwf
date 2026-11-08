/**
 * Contexte d'écriture local aux vues Clients et Outils (lot 13).
 *
 * Le socle ne livre pas de hook public pour construire un `ContexteEcriture`
 * (seul `useGestes` en construit un, et il est réservé aux gestes d'un
 * dossier). Les fiches clients, les conteneurs et les rotations n'ont pas
 * besoin de gestes gardés : ils ont seulement besoin du client Sanity, de
 * l'utilisateur, de l'horloge et de la mémorisation des `_rev` écrites ici
 * (pour que nos propres écritures ne déclenchent jamais « modifié par
 * quelqu'un d'autre »). Ce petit hook les assemble.
 */
import { useMemo } from 'react';
import { appelerApi } from '../../actions/envoi';
import type { ContexteEcriture } from '../../domaine/contrats';
import { useClientSanity, useUtilisateur } from '../../data/client';
import { useMagasin } from '../../data/magasin';

export function useContexteEcriture(): ContexteEcriture {
  const client = useClientSanity();
  const utilisateur = useUtilisateur();
  const { memoriserRevision } = useMagasin();
  return useMemo(
    () => ({
      client,
      utilisateur,
      maintenant: () => new Date(),
      memoriserRevision,
      appelerApi,
    }),
    [client, utilisateur, memoriserRevision],
  );
}
