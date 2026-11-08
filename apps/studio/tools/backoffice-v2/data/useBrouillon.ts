/**
 * Brouillon d'un dossier (8.2) : champs modifiés à l'écran, pas encore écrits.
 *
 * Les saisies sont gardées telles quelles ; le brouillon EXPOSÉ n'en retient
 * que ce qui diffère réellement du document chargé (`champsModifiesDossier`) :
 * remettre l'ancienne valeur annule la modification, et une relecture qui
 * apporte la même valeur la fait disparaître. C'est ce brouillon-là que
 * `ecrirePatch` écrit, donc seuls les champs modifiés partent en base.
 *
 * Un champ vidé est représenté par `null` (le patch fait un `unset`) ; une
 * chaîne vide est ramenée à `null` pour qu'il n'existe qu'une seule façon de
 * dire « vide ».
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UseBrouillon } from '../domaine/contrats';
import { champsModifiesDossier } from '../domaine/fusion';
import type { Brouillon, Dossier, ValeurBrouillon } from '../domaine/types';

/** Ne garde du brouillon que les champs qui changent vraiment quelque chose dans le dossier. */
export function brouillonUtile(dossier: Dossier | null, saisies: Brouillon): Brouillon {
  if (!dossier) return {};
  const utiles = new Set(champsModifiesDossier(dossier, saisies));
  const resultat: Brouillon = {};
  for (const [champ, valeur] of Object.entries(saisies)) {
    if (utiles.has(champ)) resultat[champ] = valeur;
  }
  return resultat;
}

export function normaliserValeur(valeur: ValeurBrouillon): ValeurBrouillon {
  return typeof valeur === 'string' && valeur === '' ? null : valeur;
}

export const useBrouillon: UseBrouillon = (dossier) => {
  const id = dossier?.id ?? null;
  // Les saisies sont rattachées à un dossier : en changer repart d'un brouillon vide.
  const [etat, setEtat] = useState<{ id: string | null; saisies: Brouillon }>({ id, saisies: {} });
  const saisies = etat.id === id ? etat.saisies : {};

  const brouillon = useMemo(() => brouillonUtile(dossier, saisies), [dossier, saisies]);
  const nbModifications = Object.keys(brouillon).length;

  const modifier = useCallback(
    (champ: string, valeur: ValeurBrouillon) => {
      setEtat((prec) => {
        const base = prec.id === id ? prec.saisies : {};
        return { id, saisies: { ...base, [champ]: normaliserValeur(valeur) } };
      });
    },
    [id],
  );

  const annuler = useCallback(() => setEtat({ id, saisies: {} }), [id]);

  const vider = useCallback(
    (champs: string[]) => {
      setEtat((prec) => {
        if (prec.id !== id) return prec;
        const reste = { ...prec.saisies };
        for (const c of champs) delete reste[c];
        return { id, saisies: reste };
      });
    },
    [id],
  );

  // Fermer l'onglet avec des saisies non enregistrées : le navigateur demande confirmation.
  // (Le changement de page dans l'outil est gardé par `useRoute().garde`, lot 8.)
  useEffect(() => {
    if (nbModifications === 0) return undefined;
    const avertir = (e: BeforeUnloadEvent): void => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', avertir);
    return () => window.removeEventListener('beforeunload', avertir);
  }, [nbModifications]);

  return { brouillon, modifier, nbModifications, annuler, vider };
};
