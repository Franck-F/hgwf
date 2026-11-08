/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Barre d'enregistrement unique (4.3) : collante en bas de `.bo-racine`
 * (`position: sticky`, jamais `fixed`), visible dès qu'un champ est modifié.
 * C'est alors le seul bouton plein de la page (la carte « Prochaine étape »
 * passe en secondaire).
 */
import type { ReactElement } from 'react';
import { Bouton } from '../../ui';

export interface BarreEnregistrementProps {
  nbModifications: number;
  enregistrement: boolean;
  onAnnuler: () => void;
  onEnregistrer: () => void;
}

export function BarreEnregistrement({
  nbModifications,
  enregistrement,
  onAnnuler,
  onEnregistrer,
}: BarreEnregistrementProps): ReactElement | null {
  if (nbModifications <= 0) return null;
  const texte =
    nbModifications === 1 ? '1 modification non enregistrée' : `${nbModifications} modifications non enregistrées`;
  return (
    <div className="bo-barre-collante" role="region" aria-label="Enregistrement du dossier">
      <span className="bo-fort" role="status">
        {texte}
      </span>
      <span className="bo-espace" />
      <Bouton variante="discret" onClick={onAnnuler} desactive={enregistrement}>
        Annuler
      </Bouton>
      <Bouton variante="primaire" onClick={onEnregistrer} chargement={enregistrement}>
        Enregistrer
      </Bouton>
    </div>
  );
}
