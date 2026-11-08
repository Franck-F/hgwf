/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Page Dossier (4.3). `#/dossier/nouveau` est le mode création (demande reçue
 * au téléphone) ; tout autre identifiant est un dossier existant. Le corps est
 * monté avec l'identifiant pour clé : changer de dossier repart d'un état neuf
 * (brouillon, fenêtres, sections).
 */
import type { ReactElement } from 'react';
import type { DossierPageProps } from '../../domaine/contrats';
import { DossierCorps } from './DossierCorps';
import { PageNouveauDossier } from './PageNouveauDossier';

export function DossierPage({ id }: DossierPageProps): ReactElement {
  return id === 'nouveau' ? <PageNouveauDossier /> : <DossierCorps key={id} id={id} />;
}
