/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Section « Historique » (4.3) : frise chronologique construite à partir des
 * champs de trace existants (`construireHistorique`). Pas de journal séparé.
 * Dates au format « 28/10/2026 à 14h02 », jamais en ISO.
 */
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import type { SectionDossierProps } from '../../domaine/contrats';
import { construireHistorique } from '../../domaine/historique';
import { Section } from '../../ui';

export function SectionHistorique({ dossier, ouverte, onBasculer }: SectionDossierProps): ReactElement {
  const evenements = useMemo(() => construireHistorique(dossier), [dossier]);
  const dernier = evenements[0];
  const resume = dernier ? `${dernier.libelle}, ${dernier.dateTexte}` : 'Aucun événement';
  return (
    <Section titre="Historique" resume={resume} ouverte={ouverte} onBasculer={onBasculer}>
      {evenements.length === 0 ? (
        <p className="bo-secondaire">Rien n’a encore été enregistré sur ce dossier.</p>
      ) : (
        <ol className="bo-pile">
          {evenements.map((e, i) => (
            <li key={`${e.libelle}-${i}`}>
              <span className="bo-fort">{e.dateTexte}</span>
              {' : '}
              {e.libelle}
              {e.auteur ? <span className="bo-secondaire"> (par {e.auteur})</span> : null}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
