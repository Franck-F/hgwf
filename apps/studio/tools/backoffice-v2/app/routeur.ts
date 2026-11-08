/**
 * Adaptateur de routage unique : seul fichier qui lit `location` (et, si on
 * l'adopte un jour, seul à importer `sanity/router`).
 *
 * Pourquoi le fragment (`#`) : le Studio route sur le chemin (`/operations/…`),
 * jamais sur le fragment, donc aucune collision, et « Précédent » du
 * navigateur fonctionne. Si le test dans un vrai Studio (critère 18) montre un
 * conflit, seul ce fichier change.
 */
export interface Routeur {
  /** Chemin courant sans le « # ». */
  chemin(): string;
  naviguer(chemin: string, options?: { remplacer?: boolean }): void;
  /** Renvoie la fonction de désabonnement. */
  ecouter(fn: () => void): () => void;
}

/** Implémentation par défaut : `location.hash`. `cible` permet de l'essayer sur une autre fenêtre. */
export function creerRouteurHash(cible: Window = window): Routeur {
  return {
    chemin() {
      return cible.location.hash.replace(/^#/, '');
    },
    naviguer(chemin, options) {
      if (options?.remplacer) {
        // `replace` ne laisse pas d'entrée dans l'historique : « Précédent » saute la page remplacée.
        cible.location.replace(`#${chemin}`);
      } else {
        cible.location.hash = chemin;
      }
    },
    ecouter(fn) {
      cible.addEventListener('hashchange', fn);
      return () => cible.removeEventListener('hashchange', fn);
    },
  };
}

/**
 * Routeur en mémoire : sert aux tests et à un montage hors navigateur. Il
 * garde un historique pour que « retour » soit simulable avec `retour()`.
 */
export interface RouteurMemoire extends Routeur {
  retour(): void;
}

export function creerRouteurMemoire(depart = '/afaire'): RouteurMemoire {
  const historique = [depart];
  let position = 0;
  const abonnes = new Set<() => void>();
  const prevenir = (): void => abonnes.forEach((fn) => fn());
  return {
    chemin: () => historique[position] ?? '',
    naviguer(chemin, options) {
      if (options?.remplacer) {
        historique[position] = chemin;
      } else {
        historique.splice(position + 1, historique.length, chemin);
        position += 1;
      }
      prevenir();
    },
    ecouter(fn) {
      abonnes.add(fn);
      return () => abonnes.delete(fn);
    },
    retour() {
      if (position === 0) return;
      position -= 1;
      prevenir();
    },
  };
}
