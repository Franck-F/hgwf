/** Recherche globale (4.8) : tous les dossiers, terminés compris, et les clients. */
import { useMemo } from 'react';
import type { UseRecherche } from '../domaine/contrats';
import { construireDossiers } from './dossiers';
import { useMagasin } from './magasin';
import { rechercher } from './recherche';

export const useRecherche: UseRecherche = (texte) => {
  const { donnees } = useMagasin();
  const dossiers = useMemo(() => construireDossiers(donnees), [donnees]);
  return useMemo(() => rechercher(texte, dossiers, donnees.clients), [texte, dossiers, donnees.clients]);
};
