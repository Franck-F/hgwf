/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Outils (4.7) : onglets internes. L'onglet courant vient de l'itinéraire
 * (`#/outils/<section>`), donc « Précédent » et le rechargement le conservent.
 * Chaque onglet n'a qu'un seul bouton plein.
 */
import type { ReactElement } from 'react';
import { useRoute } from '../../app/Contexte';
import type { OutilsProps, SectionOutils } from '../../domaine/contrats';
import { Segments } from '../../ui';
import { ChiffresDuMois } from './ChiffresDuMois';
import { ConnexionEnvoi } from './ConnexionEnvoi';
import { FichesServices } from './FichesServices';
import { PanneauExport } from './PanneauExport';
import { Rotations } from './Rotations';
import { StockConteneurs } from './StockConteneurs';

export const ONGLETS: { id: SectionOutils; libelle: string }[] = [
  { id: 'conteneurs', libelle: 'Stock de conteneurs' },
  { id: 'rotations', libelle: 'Rotations' },
  { id: 'fiches', libelle: 'Fiches services' },
  { id: 'chiffres', libelle: 'Chiffres du mois' },
  { id: 'export', libelle: 'Export' },
  { id: 'connexion', libelle: 'Connexion à l’envoi' },
];

function Contenu({ section }: { section: SectionOutils }): ReactElement {
  switch (section) {
    case 'rotations':
      return <Rotations />;
    case 'fiches':
      return <FichesServices />;
    case 'chiffres':
      return <ChiffresDuMois />;
    case 'export':
      return <PanneauExport />;
    case 'connexion':
      return <ConnexionEnvoi />;
    default:
      return <StockConteneurs />;
  }
}

export function Outils({ section }: OutilsProps): ReactElement {
  const { naviguer } = useRoute();
  return (
    <div className="bo-page">
      <div className="bo-page-entete">
        <h1 className="bo-titre-page">Outils</h1>
      </div>
      <Segments
        libelle="Sections des outils"
        courant={section}
        onChoisir={(id) => naviguer(`/outils/${id}`)}
        valeurs={ONGLETS}
      />
      <Contenu section={section} />
    </div>
  );
}
