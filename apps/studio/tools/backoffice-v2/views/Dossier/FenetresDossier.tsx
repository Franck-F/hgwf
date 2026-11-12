/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Montage des fenêtres de la page Dossier : une seule est ouverte à la fois.
 * Les fenêtres d'envoi (lot 11), de suivi et de reprise (lot 12) sont montées
 * ici avec les props de `domaine/contrats.ts` ; les gestes de secours et la
 * correction d'étape sont du lot 10.
 */
import type { ReactElement } from 'react';
import type { FenetreDossier } from '../../domaine/contrats';
import type { Brouillon, Dossier } from '../../domaine/types';
import { FenetreEnvoi } from './devis/FenetreEnvoi';
import { FenetreSuivi } from './expedition/FenetreSuivi';
import { ReprisePanel } from './expedition/ReprisePanel';
import { FenetreCorrection } from './FenetreCorrection';
import { FenetreGeste } from './FenetreGeste';

export interface FenetresDossierProps {
  dossier: Dossier;
  brouillon: Brouillon;
  fenetre: FenetreDossier | null;
  /** Mode de la fenêtre de suivi quand `fenetre === 'suivi'` : « livrer » si l'action est « Marquer livré ». */
  modeSuivi: 'avancer' | 'livrer';
  correction: boolean;
  onFermer: () => void;
  /** Un geste a réussi : la page ferme la fenêtre et relit le dossier. */
  onTermine: () => void;
}

export function FenetresDossier({
  dossier,
  brouillon,
  fenetre,
  modeSuivi,
  correction,
  onFermer,
  onTermine,
}: FenetresDossierProps): ReactElement | null {
  if (correction) return <FenetreCorrection dossier={dossier} onFermer={onFermer} onTermine={onTermine} />;
  switch (fenetre) {
    case 'envoi':
      return <FenetreEnvoi dossier={dossier} brouillon={brouillon} mode="devis" onFermer={onFermer} onTermine={onTermine} />;
    case 'complement':
      return <FenetreEnvoi dossier={dossier} brouillon={brouillon} mode="complement" onFermer={onFermer} onTermine={onTermine} />;
    case 'suivi':
      return <FenetreSuivi dossier={dossier} brouillon={brouillon} mode={modeSuivi} onFermer={onFermer} onTermine={onTermine} />;
    case 'notifier':
      return <FenetreSuivi dossier={dossier} brouillon={brouillon} mode="notifier" onFermer={onFermer} onTermine={onTermine} />;
    case 'reprise':
      return <ReprisePanel dossier={dossier} brouillon={brouillon} onFermer={onFermer} onTermine={onTermine} />;
    case 'refus':
    case 'horsOutil':
    case 'complementHorsOutil':
      return <FenetreGeste dossier={dossier} fenetre={fenetre} onFermer={onFermer} onTermine={onTermine} />;
    default:
      return null;
  }
}
