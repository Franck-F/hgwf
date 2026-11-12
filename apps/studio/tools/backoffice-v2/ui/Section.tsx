/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Carte repliable. Fermée, elle montre un résumé d'une ligne ; le contenu reste
 * monté (attribut `hidden`) pour ne pas perdre les saisies en cours.
 *
 * Sous `SectionsFixes` (page Dossier rangée en sous-dossiers), la carte n'est
 * plus repliable : c'est le sous-dossier choisi qui décide de ce qui s'affiche.
 * Les cartes imbriquées dedans restent repliables.
 */
import { createContext, useContext, useId } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Icone } from './icones';
import type { SectionProps } from './types';

const Fixe = createContext(false);

export function SectionsFixes({ children }: { children?: ReactNode }): ReactElement {
  return <Fixe.Provider value>{children}</Fixe.Provider>;
}

export function Section({ titre, resume, ouverte, onBasculer, children }: SectionProps): ReactElement {
  const idCorps = useId();
  const fixe = useContext(Fixe);
  if (fixe) {
    return (
      <section className="bo-section bo-section--fixe" aria-labelledby={idCorps}>
        <h2 className="bo-section-titre bo-section-entete" id={idCorps}>
          {titre}
        </h2>
        <div className="bo-section-corps">
          <Fixe.Provider value={false}>{children}</Fixe.Provider>
        </div>
      </section>
    );
  }
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
