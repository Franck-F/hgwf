/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Carte repliable. Fermée, elle montre un résumé d'une ligne ; le contenu reste
 * monté (attribut `hidden`) pour ne pas perdre les saisies en cours.
 */
import { useId } from 'react';
import type { ReactElement } from 'react';
import { Icone } from './icones';
import type { SectionProps } from './types';

export function Section({ titre, resume, ouverte, onBasculer, children }: SectionProps): ReactElement {
  const idCorps = useId();
  return (
    <section className={`bo-section${ouverte ? ' bo-section--ouverte' : ''}`}>
      <h2 className="bo-section-titre">
        <button
          type="button"
          className="bo-section-bouton"
          aria-expanded={ouverte}
          aria-controls={idCorps}
          onClick={onBasculer}
        >
          <span className="bo-section-nom">{titre}</span>
          {!ouverte && resume ? <span className="bo-section-resume">{resume}</span> : null}
          <span className="bo-section-chevron">
            <Icone nom="chevron" />
          </span>
        </button>
      </h2>
      <div className="bo-section-corps" id={idCorps} hidden={!ouverte}>
        {children}
      </div>
    </section>
  );
}
