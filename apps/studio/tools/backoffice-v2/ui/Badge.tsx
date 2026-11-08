/** @jsxRuntime automatic @jsxImportSource react */
/** Badge de phase ou d'alerte : toujours un mot, et une icône si fournie (jamais la couleur seule). */
import type { ReactElement } from 'react';
import { Icone } from './icones';
import type { BadgeProps } from './types';

export function Badge({ ton, icone, children }: BadgeProps): ReactElement {
  return (
    <span className={`bo-badge bo-badge--${ton}`}>
      {icone ? <Icone nom={icone} taille={14} /> : null}
      {children}
    </span>
  );
}
