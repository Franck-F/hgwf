/** Stock de conteneurs, rotations et fiches services (onglets d'« Outils »). */
import type { UseOutils } from '../domaine/contrats';
import { useMagasin } from './magasin';

export const useOutils: UseOutils = () => {
  const { donnees, chargement, erreur, recharger } = useMagasin();
  return {
    conteneurs: donnees.conteneurs,
    rotations: donnees.rotations,
    fiches: donnees.fiches,
    chargement,
    erreur,
    recharger,
  };
};
