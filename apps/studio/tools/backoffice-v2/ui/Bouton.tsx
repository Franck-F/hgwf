/** @jsxRuntime automatic @jsxImportSource react */
/** Bouton du kit. Implémente exactement `BoutonProps` de `ui/types.ts`. */
import type { ReactElement } from 'react';
import type { BoutonProps } from './types';

export function Bouton({
  variante = 'secondaire',
  taille = 'm',
  chargement = false,
  desactive = false,
  type = 'button',
  onClick,
  children,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
}: BoutonProps): ReactElement {
  const inactif = desactive || chargement;
  return (
    <button
      type={type}
      className={`bo-bouton bo-bouton--${variante} bo-bouton--${taille}`}
      // Un bouton en cours d'action est désactivé : c'est le verrou anti double clic.
      disabled={inactif}
      aria-busy={chargement || undefined}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      onClick={inactif ? undefined : onClick}
    >
      {chargement ? <span className="bo-rond" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
