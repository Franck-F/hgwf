/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Injecte la feuille de style du back-office UNE seule fois dans `<head>`,
 * quel que soit le nombre de montages (compteur de références), ainsi que le
 * lien des polices. Ne rend rien.
 */
import { useLayoutEffect } from 'react';
import { FEUILLE_DE_STYLE } from './styles';
import { insererPolices } from './polices';

const ID_STYLE = 'bo-feuille-de-style';
let references = 0;

export function GlobalStyle(): null {
  useLayoutEffect(() => {
    insererPolices();
    let style = document.getElementById(ID_STYLE);
    if (!style) {
      style = document.createElement('style');
      style.id = ID_STYLE;
      style.textContent = FEUILLE_DE_STYLE;
      document.head.appendChild(style);
    }
    references += 1;
    return () => {
      references -= 1;
      // On ne retire la feuille que lorsque plus aucune coque ne l'utilise.
      if (references === 0) document.getElementById(ID_STYLE)?.remove();
    };
  }, []);
  return null;
}
