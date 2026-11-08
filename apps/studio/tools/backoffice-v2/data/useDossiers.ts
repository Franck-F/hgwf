/** Tous les dossiers, assemblés une fois par changement des données du magasin (8.2). */
import { useMemo } from 'react';
import type { UseDossiers } from '../domaine/contrats';
import { construireDossiers } from './dossiers';
import { useMagasin } from './magasin';

export const useDossiers: UseDossiers = () => {
  const { donnees, chargement, erreur, recharger } = useMagasin();
  const dossiers = useMemo(() => construireDossiers(donnees), [donnees]);
  return { dossiers, chargement, erreur, recharger };
};
