/**
 * Fiches services retirées des choix (`actif == false`) : le magasin ne les
 * porte pas (il ne garde que les fiches proposées), mais l'onglet Fiches
 * services doit les montrer pour pouvoir les réactiver. Relue à chaque
 * changement des fiches actives (retirer ou réactiver une fiche les déplace de
 * l'une à l'autre, et l'écoute du magasin signale toute modification).
 */
import { useCallback, useEffect, useState } from 'react';
import type { Fiche } from '../domaine/types';
import { useClientSanity } from './client';
import { useMagasin } from './magasin';
import { REQUETE_FICHES_RETIREES } from './requetes';

export function useFichesRetirees(): { retirees: Fiche[]; relireRetirees: () => Promise<void> } {
  const client = useClientSanity();
  const { donnees } = useMagasin();
  const [retirees, setRetirees] = useState<Fiche[]>([]);

  const relireRetirees = useCallback(async (): Promise<void> => {
    try {
      if (typeof client?.fetch !== 'function') return;
      const brut = await client.fetch<Fiche[] | null>(REQUETE_FICHES_RETIREES);
      setRetirees(Array.isArray(brut) ? brut : []);
    } catch {
      // Les fiches retirées sont un confort : une panne ne casse pas l'onglet.
    }
  }, [client]);

  // `donnees` change à chaque relecture du magasin : c'est le signal de relire aussi les retirées.
  useEffect(() => {
    void relireRetirees();
  }, [relireRetirees, donnees]);

  return { retirees, relireRetirees };
}
