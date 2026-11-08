/** @jsxRuntime automatic @jsxImportSource react */
/** État vide : un titre, une phrase utile, une action secondaire facultative. */
import type { ReactElement } from 'react';
import { Bouton } from './Bouton';
import type { EtatVideProps } from './types';

export function EtatVide({ titre, phrase, action }: EtatVideProps): ReactElement {
  return (
    <div className="bo-etat-vide">
      <h3 className="bo-etat-vide-titre">{titre}</h3>
      {phrase ? <p className="bo-etat-vide-phrase">{phrase}</p> : null}
      {action ? (
        <Bouton variante="secondaire" onClick={action.onClick}>
          {action.libelle}
        </Bouton>
      ) : null}
    </div>
  );
}
