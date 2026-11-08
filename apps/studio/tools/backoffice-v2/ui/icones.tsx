/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Jeu d'icônes SVG maison, limité aux 14 icônes réellement utilisées
 * (plafond de la spécification, section 6 : pas d'icône « au cas où »).
 *
 * Dessin sur une grille de 24 px, trait de 2 px, `currentColor` : la couleur
 * vient du texte voisin, et l'icône ne porte jamais seule une information
 * (elle est décorative, `aria-hidden`, le sens est dans le mot à côté).
 */
import type { ReactElement } from 'react';
import type { IconeNom } from './types';

const TRACES: Record<IconeNom, string> = {
  alerte: 'M12 3 2.5 20h19L12 3Zm0 6v5m0 3v.01',
  horloge: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2',
  enveloppe: 'M3 6h18v12H3V6Zm0 0 9 7 9-7',
  telephone:
    'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z',
  copier: 'M9 9h11v11H9V9Zm-5 6V4h11',
  telecharger: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
  plus: 'M12 5v14M5 12h14',
  menu: 'M5 12h.01M12 12h.01M19 12h.01',
  fleche: 'M4 12h16m0 0-6-6m6 6-6 6',
  coche: 'm5 12.5 4.5 4.5L19 7.5',
  croix: 'M6 6l12 12M18 6 6 18',
  chevron: 'm6 9 6 6 6-6',
  recherche: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5',
  lienExterne: 'M14 4h6v6m0-6-9 9M18 14v6H4V6h6',
};

/** Les points de « menu » doivent être pleins et épais pour rester lisibles. */
const TRAIT_EPAIS: IconeNom[] = ['menu'];

export const NOMS_ICONES = Object.keys(TRACES) as IconeNom[];

export function Icone({ nom, taille = 18 }: { nom: IconeNom; taille?: number }): ReactElement {
  return (
    <svg
      className={`bo-icone bo-icone--${nom}`}
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={TRAIT_EPAIS.includes(nom) ? 4 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={TRACES[nom]} />
    </svg>
  );
}
