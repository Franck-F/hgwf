/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Confirmation : une `Modale` à deux boutons, « Annuler » et le verbe de
 * l'action. Remplace tous les `window.confirm`.
 *
 * Le verbe est toujours le bouton plein (critère 10 : exactement un bouton
 * plein par fenêtre) ; `danger` ne change que l'icône d'alerte en tête.
 */
import type { ReactElement } from 'react';
import { Bouton } from './Bouton';
import { Icone } from './icones';
import { Modale } from './Modale';
import type { ConfirmationProps } from './types';

export function Confirmation({
  titre,
  consequence,
  verbe,
  onConfirmer,
  onAnnuler,
  danger,
  chargement,
}: ConfirmationProps): ReactElement {
  return (
    <Modale
      titre={titre}
      onFermer={onAnnuler}
      pied={
        <>
          <Bouton variante="discret" onClick={onAnnuler}>
            Annuler
          </Bouton>
          <Bouton variante="primaire" onClick={onConfirmer} chargement={chargement}>
            {verbe}
          </Bouton>
        </>
      }
    >
      <p className={`bo-confirmation${danger ? ' bo-confirmation--danger' : ''}`}>
        {danger ? <Icone nom="alerte" /> : null}
        <span>{consequence}</span>
      </p>
    </Modale>
  );
}
