/**
 * Écritures en cours : verrou anti double clic et drapeau « une écriture est
 * en train de se faire » (spécification 9, dernière ligne du tableau).
 *
 * Pourquoi dans `data/` : la couche données doit savoir qu'une écriture est en
 * cours pour ne pas relire (et donc ne pas signaler « modifié par quelqu'un
 * d'autre ») au milieu d'un geste qui écrit en deux temps (envoi du devis :
 * l'API change la révision, puis l'outil pose le statut). La couche actions,
 * elle, s'en sert pour refuser le second clic. Un seul module pour les deux.
 */

const verrous = new Set<string>();
let ecrituresEnCours = 0;

/** Vrai tant qu'au moins une écriture de cet ordinateur n'est pas terminée. */
export function ecritureEnCours(): boolean {
  return ecrituresEnCours > 0;
}

/**
 * Exécute `travail` sous le verrou `cle` (en pratique l'identifiant du
 * dossier). Si le verrou est déjà pris, `quandOccupe` rend le résultat de
 * refus sans rien écrire : le second clic ne lance donc jamais un second geste.
 */
export async function avecVerrou<T>(cle: string, travail: () => Promise<T>, quandOccupe: () => T): Promise<T> {
  if (verrous.has(cle)) return quandOccupe();
  verrous.add(cle);
  ecrituresEnCours += 1;
  try {
    return await travail();
  } finally {
    verrous.delete(cle);
    ecrituresEnCours -= 1;
  }
}

/** Pour les tests : remet les compteurs à zéro. */
export function reinitialiserActivite(): void {
  verrous.clear();
  ecrituresEnCours = 0;
}
