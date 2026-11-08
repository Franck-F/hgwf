/**
 * SQUELETTE (lot 1) : propriété du lot 6 (Données).
 * SEUL fichier de V2 autorisé à importer `sanity` (compatible avec le faux
 * module du harnais).
 */
import { useClient, useCurrentUser } from 'sanity';
import type { ClientLike } from '../domaine/contrats';
import type { Utilisateur } from '../domaine/types';

export const VERSION_API = '2024-10-01';

export function useClientSanity(): ClientLike {
  return useClient({ apiVersion: VERSION_API }) as unknown as ClientLike;
}

export function useUtilisateur(): Utilisateur {
  const u = useCurrentUser();
  return { id: u?.id ?? 'inconnu', nom: u?.name ?? 'Utilisateur inconnu' };
}
