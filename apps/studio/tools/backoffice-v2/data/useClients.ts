/** Fiches clients (les compteurs de dossiers sont calculés par les vues, via `rapprochement.ts`). */
import type { UseClients } from '../domaine/contrats';
import { useMagasin } from './magasin';

export const useClients: UseClients = () => {
  const { donnees, chargement, erreur, recharger } = useMagasin();
  return { clients: donnees.clients, chargement, erreur, recharger };
};
