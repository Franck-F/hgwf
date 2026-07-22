// Le champ `ligneLegale` du CMS a été collé depuis une source qui y a laissé un
// millier de caractères de largeur nulle. On nettoie au rendu pour que le
// problème ne réapparaisse pas au prochain copier-coller.
const INVISIBLES = /[​-‏⁠-⁯﻿]/g;

export function nettoyerInvisibles(texte: string): string {
  return texte.replace(INVISIBLES, '');
}
