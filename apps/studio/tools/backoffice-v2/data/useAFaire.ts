/**
 * Accueil « À faire » (4.1) : les règles vivent dans `domaine/priorites.ts`,
 * ce hook ne fait que les appliquer aux dossiers du magasin. La liste est
 * recalculée à chaque relecture des données et chaque minute : un seuil
 * d'heures ouvrées peut être franchi sans qu'aucune donnée n'ait changé.
 */
import { useEffect, useMemo, useState } from 'react';
import type { UseAFaire } from '../domaine/contrats';
import { calculerAFaire } from '../domaine/priorites';
import { construireDossiers } from './dossiers';
import { useMagasin } from './magasin';

const UNE_MINUTE_MS = 60_000;

export const useAFaire: UseAFaire = () => {
  const { donnees, chargement, erreur } = useMagasin();
  const [maintenant, setMaintenant] = useState(() => new Date());

  useEffect(() => {
    const minuteur = setInterval(() => setMaintenant(new Date()), UNE_MINUTE_MS);
    return () => clearInterval(minuteur);
  }, []);

  const calcul = useMemo(
    () => calculerAFaire(construireDossiers(donnees), donnees.rotations, maintenant),
    [donnees, maintenant],
  );
  return { ...calcul, chargement, erreur };
};
