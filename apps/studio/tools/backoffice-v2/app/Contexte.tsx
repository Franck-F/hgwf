/**
 * Contexte d'application : `useRoute`, `useToasts`, `useCleApi`, `useRacine`
 * (signatures dans `domaine/contrats.ts`).
 *
 * Ce fichier ne contient que les contextes et les hooks, sans composant ni
 * import du kit : le kit (Modale) importe `useRacine` d'ici, et les
 * fournisseurs (FournisseurRoute, FournisseurToasts, FournisseurCle) importent
 * le kit. Cette séparation évite tout import circulaire.
 *
 * Valeurs de repli : sans fournisseur, les hooks restent inertes, pour que les
 * vues et le kit puissent se monter et se tester seuls.
 */
import { createContext, useContext } from 'react';
import { lireCle } from '../actions/cleApi';
import type {
  ResultatUseCleApi,
  ResultatUseRoute,
  ResultatUseToasts,
  UseCleApi,
  UseRacine,
  UseRoute,
  UseToasts,
} from '../domaine/contrats';

export const ContexteRoute = createContext<ResultatUseRoute>({
  chemin: '/afaire',
  naviguer: () => undefined,
  garde: { definir: () => undefined },
});

export const ContexteToasts = createContext<ResultatUseToasts>({
  succes: () => undefined,
  erreur: () => undefined,
});

/** `version` change à chaque écriture ou oubli de la clé : fait relire `presente`. */
export interface ContexteCle {
  version: number;
  demanderCle: ResultatUseCleApi['demanderCle'];
  oublier: ResultatUseCleApi['oublier'];
}

export const ContexteCleApi = createContext<ContexteCle>({
  version: 0,
  demanderCle: async () => false,
  oublier: () => undefined,
});

/** Élément `.bo-racine`, conteneur de défilement et hôte des fenêtres (2.2). */
export const ContexteRacine = createContext<HTMLElement | null>(null);

export const useRoute: UseRoute = () => useContext(ContexteRoute);

export const useToasts: UseToasts = () => useContext(ContexteToasts);

/**
 * `presente` est relu dans le stockage à chaque rendu : l'API purge la clé sur
 * une réponse 401 sans passer par ce contexte, et l'écran doit le refléter dès
 * son prochain rendu. Le stockage peut lever une exception (navigation privée) :
 * dans ce cas la clé est considérée absente.
 */
export const useCleApi: UseCleApi = () => {
  const { demanderCle, oublier } = useContext(ContexteCleApi);
  return { presente: cleEnregistree(), demanderCle, oublier };
};

export const useRacine: UseRacine = () => useContext(ContexteRacine) ?? document.body;

export function cleEnregistree(): boolean {
  try {
    return Boolean(lireCle());
  } catch {
    return false;
  }
}
