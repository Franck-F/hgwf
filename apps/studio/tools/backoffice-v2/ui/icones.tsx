/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Jeu d'icônes SVG maison, limité aux icônes réellement utilisées (pas d'icône
 * « au cas où »).
 *
 * Dessin sur une grille de 24 px, trait de 2 px par défaut (1,8 px dans la
 * navigation, comme la maquette), `currentColor` : la couleur
 * vient du texte voisin, et l'icône ne porte jamais seule une information
 * (elle est décorative, `aria-hidden`, le sens est dans le mot à côté).
 */
import type { ReactElement } from 'react';
import type { IconeNom } from './types';

const TRACES: Record<IconeNom, string> = {
  afaire: 'M9 4h6v3H9V4Zm-2 1.5H5a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-2M8.5 13l2.5 2.5 4.5-5',
  dossiers: 'M21 18.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V6a1.5 1.5 0 0 1 1.5-1.5h4.8l2 2.5h8.2A1.5 1.5 0 0 1 21 8.5v10Z',
  dossierPlus: 'M21 18.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V6a1.5 1.5 0 0 1 1.5-1.5h4.8l2 2.5h8.2A1.5 1.5 0 0 1 21 8.5v10ZM12 10.5v6m-3-3h6',
  clients: 'M17 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-7A3.5 3.5 0 0 0 3 18.5V20m18 0v-1.5a3.5 3.5 0 0 0-2.5-3.35M16 4.2a3.5 3.5 0 0 1 0 6.6M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  outils: 'M14.7 6.3a4 4 0 0 0 5 5L10 21l-3-3 9.7-9.7ZM14.7 6.3l-3-3-1.4 1.4 3 3',
  chevronDroite: 'm9 6 6 6-6 6',
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
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6m0-9v.01',
  euro: 'M17.5 7A6.5 6.5 0 1 0 17.5 17M4 10.5h9M4 13.5h9',
  camion:
    'M3 6h11v10H3V6Zm11 4h4l3 3v3h-7v-6ZM7.5 19.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Zm10 0a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z',
  facture: 'M6 3h9l3 3v15H6V3Zm3 6h6m-6 4h6m-6 4h4',
};

/** Les points de « menu » doivent être pleins et épais pour rester lisibles. */
const TRAIT_EPAIS: IconeNom[] = ['menu'];

export const NOMS_ICONES = Object.keys(TRACES) as IconeNom[];

export function Icone({ nom, taille = 18, trait }: { nom: IconeNom; taille?: number; trait?: number }): ReactElement {
  return (
    <svg
      className={`bo-icone bo-icone--${nom}`}
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={TRAIT_EPAIS.includes(nom) ? 4 : (trait ?? 2)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={TRACES[nom]} />
    </svg>
  );
}
