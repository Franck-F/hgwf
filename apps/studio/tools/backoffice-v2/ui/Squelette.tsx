/** @jsxRuntime automatic @jsxImportSource react */
/** Placeholders de chargement : jamais d'écran blanc. */
import type { ReactElement } from 'react';
import type { SqueletteProps } from './types';

export function Squelette({ lignes = 3, forme = 'ligne' }: SqueletteProps): ReactElement {
  const n = forme === 'ligne' ? lignes : 1;
  return (
    <div className="bo-squelette" role="status" aria-label="Chargement en cours" aria-busy="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={`bo-squelette-bloc bo-squelette-bloc--${forme}`} aria-hidden="true" />
      ))}
    </div>
  );
}
