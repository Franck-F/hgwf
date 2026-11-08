/**
 * Contexte de la page Dossier (lot 10).
 *
 * `ProchaineEtape`, l'en-tête, les fenêtres de geste et les sections n'ont pas
 * à se repasser dix props : `DossierPage` fournit ce contexte, eux le lisent.
 * Il prolonge `ContexteDossier` de `domaine/contrats.ts` (ouvrirFenetre,
 * executerAction) avec ce qu'il faut aux gestes de secours.
 *
 * Fichier ajouté au lot 10 (absent de la liste de la spécification) pour
 * éviter une importation circulaire entre `DossierPage` et ses enfants.
 */
import { createContext, useContext } from 'react';
import type { ContexteDossier, GestesSecours, Resultat, ResultatGeste } from '../../domaine/contrats';
import type { Brouillon } from '../../domaine/types';

export type NomSection = 'demande' | 'echanges' | 'devis' | 'expedition' | 'facturation' | 'historique';

export interface ContexteVue extends ContexteDossier {
  /** Gestes de secours liés au brouillon courant (règle 5.5). */
  secours: GestesSecours;
  /** Brouillon courant : sert à évaluer les manques d'une fenêtre sur ce qui est à l'écran. */
  brouillon: Brouillon;
  /**
   * Exécute un geste : annonce le résultat (toast), vide le brouillon des
   * champs enregistrés, relit le dossier, signale un conflit. Renvoie le
   * résultat pour que l'appelant ferme sa fenêtre en cas de succès.
   */
  lancer: (geste: () => Promise<Resultat<ResultatGeste>>) => Promise<Resultat<ResultatGeste>>;
  /** Ouvre une section et fait défiler jusqu'à elle. */
  allerA: (section: NomSection) => void;
  /** Ouvre la fenêtre « Corriger l'étape du suivi » (menu, 4.5) : elle n'a pas de `FenetreDossier`. */
  ouvrirCorrection: () => void;
}

export const ContexteDossierReact = createContext<ContexteVue | null>(null);

/** Contexte obligatoire : lève une erreur claire si la page ne l'a pas fourni. */
export function useContexteDossier(): ContexteVue {
  const ctx = useContext(ContexteDossierReact);
  if (!ctx) throw new Error('useContexteDossier : à utiliser sous DossierPage.');
  return ctx;
}

/** Contexte facultatif : une section peut s'afficher seule (tests, aperçus). */
export function useContexteDossierOptionnel(): ContexteVue | null {
  return useContext(ContexteDossierReact);
}

/** Phrase d'échec lisible : le message, suivi de ce qui manque s'il y a lieu. */
export function texteEchec(r: { message: string; manques?: string[] }): string {
  return r.manques && r.manques.length > 0 ? `${r.message} Il manque : ${r.manques.join(', ')}.` : r.message;
}

/** Copie dans le presse-papiers ; `false` si le navigateur refuse (jamais d'exception). */
export async function copierTexte(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return false;
  }
}
