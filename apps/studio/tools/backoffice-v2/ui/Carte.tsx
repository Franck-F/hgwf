/** @jsxRuntime automatic @jsxImportSource react */
/** Surface ivoire à bordure fine, titre facultatif. */
import type { ReactElement } from 'react';
import type { CarteProps } from './types';

export function Carte({ titre, children, classe }: CarteProps): ReactElement {
  return (
    <section className={`bo-carte${classe ? ` ${classe}` : ''}`}>
      {titre ? <h2 className="bo-carte-titre">{titre}</h2> : null}
      {children}
    </section>
  );
}
