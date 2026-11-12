/** @jsxRuntime automatic @jsxImportSource react */
/** Ligne de liste entière cliquable : un vrai `<button>` pleine largeur. */
import type { ReactElement } from 'react';
import type { LigneCliquableProps } from './types';

export function LigneCliquable({
  onClick,
  children,
  'aria-label': ariaLabel,
  attenuee,
  vive,
  classe,
}: LigneCliquableProps): ReactElement {
  return (
    <button
      type="button"
      className={`bo-ligne${vive ? ' bo-ligne--vif' : ''}${attenuee ? ' bo-ligne--attenuee' : ''}${classe ? ` ${classe}` : ''}`}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
