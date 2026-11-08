/**
 * Document « effectif » = document enregistré + brouillon fusionné
 * (spécification 5.5) : ce que l'utilisateur voit est ce qui est évalué.
 */
import type { Brouillon, Demande, Dossier, Expedition, ValeurBrouillon } from './types';

/** Un champ « vide » : absent, `null` (vidé dans le brouillon) ou chaîne vide. */
function estVide(v: unknown): boolean {
  return v === undefined || v === null || v === '';
}

function different(avant: unknown, apres: ValeurBrouillon | undefined): boolean {
  if (estVide(avant) && estVide(apres)) return false;
  return avant !== apres;
}

/** Un champ à `null` dans le brouillon est un champ vidé : il disparaît du résultat. */
export function fusionner<T extends object>(doc: T, brouillon: Brouillon): T {
  const resultat = { ...doc } as Record<string, unknown>;
  for (const [champ, valeur] of Object.entries(brouillon)) {
    if (valeur === null) delete resultat[champ];
    else resultat[champ] = valeur;
  }
  return resultat as T;
}

/** Noms des champs du brouillon réellement différents du document chargé. */
export function champsModifies(doc: object, brouillon: Brouillon): string[] {
  const source = doc as Record<string, unknown>;
  return Object.keys(brouillon).filter((champ) => different(source[champ], brouillon[champ]));
}

/**
 * Documents effectifs d'un dossier. Le brouillon d'un dossier est à plat (une
 * demande et son expédition partagent quelques noms, comme `email`) : on le
 * fusionne dans chacun, les champs étrangers à un document sont sans effet sur
 * les règles qui le lisent.
 */
export function documentsEffectifs(
  dossier: Dossier,
  brouillon: Brouillon,
): { demande?: Demande; expedition?: Expedition } {
  return {
    ...(dossier.demande ? { demande: fusionner(dossier.demande, brouillon) } : {}),
    ...(dossier.expedition ? { expedition: fusionner(dossier.expedition, brouillon) } : {}),
  };
}

/**
 * Champs du brouillon qui changent vraiment quelque chose dans le dossier.
 * Un champ défini dans un document est comparé à ce document ; un champ défini
 * nulle part est modifié s'il n'est pas vide.
 */
export function champsModifiesDossier(dossier: Dossier, brouillon: Brouillon): string[] {
  const docs = [dossier.demande, dossier.expedition].filter((d): d is Demande | Expedition => d !== undefined);
  return Object.keys(brouillon).filter((champ) => {
    const valeur = brouillon[champ];
    const definis = docs.filter((d) => !estVide((d as unknown as Record<string, unknown>)[champ]));
    if (definis.length === 0) return !estVide(valeur);
    return definis.some((d) => different((d as unknown as Record<string, unknown>)[champ], valeur));
  });
}
