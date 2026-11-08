/** @jsxRuntime automatic @jsxImportSource react */
/** Ligne de liste entière cliquable : un vrai `<button>` pleine largeur. */
import type { ReactElement } from 'react';
import type { LigneCliquableProps } from './types';

export function LigneCliquable({
  onClick,
  children,
  'aria-label': ariaLabel,
  attenuee,
}: LigneCliquableProps): ReactElement {
  return (
    <button
      type="button"
      className={`bo-ligne${attenuee ? ' bo-ligne--attenuee' : ''}`}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
