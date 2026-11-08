/** @jsxRuntime automatic @jsxImportSource react */
/** Commutateur de vues avec compteurs (`role="tablist"`, flèches gauche/droite). */
import { useRef } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import type { SegmentsProps } from './types';

export function Segments({ valeurs, courant, onChoisir, libelle }: SegmentsProps): ReactElement {
  const liste = useRef<HTMLDivElement>(null);

  function surTouche(e: KeyboardEvent<HTMLDivElement>): void {
    const pas = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (pas === 0) return;
    e.preventDefault();
    const i = valeurs.findIndex((v) => v.id === courant);
    const suivant = valeurs[(i + pas + valeurs.length) % valeurs.length];
    if (!suivant) return;
    onChoisir(suivant.id);
    // Le focus suit la sélection (tabindex itinérant).
    requestAnimationFrame(() =>
      liste.current?.querySelector<HTMLButtonElement>(`[data-segment="${suivant.id}"]`)?.focus(),
    );
  }

  return (
    <div className="bo-segments" role="tablist" aria-label={libelle} ref={liste} onKeyDown={surTouche}>
      {valeurs.map((v) => {
        const actif = v.id === courant;
        return (
          <button
            key={v.id}
            type="button"
            role="tab"
            data-segment={v.id}
            className={`bo-segment${actif ? ' bo-segment--actif' : ''}`}
            aria-selected={actif}
            tabIndex={actif ? 0 : -1}
            onClick={() => onChoisir(v.id)}
          >
            {v.libelle}
            {v.compteur !== undefined ? <span className="bo-segment-compteur">{v.compteur}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
