/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Un groupe de l'accueil « À faire » : intertitre + compteur, puis son tableau.
 * Au-delà de 8 lignes, le reste est replié (« Voir les N autres »).
 */
import type { ReactElement } from 'react';
import type { LigneAFaireProps } from '../../domaine/contrats';
import type { LigneAFaire as LigneDonnees } from '../../domaine/types';
import { Icone } from '../../ui';
import { LigneAFaire } from './LigneAFaire';

/** Nombre de lignes montrées avant le repli. */
export const LIGNES_VISIBLES = 8;

export interface GroupeAFaireProps {
  id: string;
  titre: string;
  lignes: LigneDonnees[];
  onOuvrir: LigneAFaireProps['onOuvrir'];
  /** Ids des lignes à griser (sorties de la liste depuis moins de 2 s). */
  attenuees?: ReadonlySet<string>;
  deplie: boolean;
  onBasculer: () => void;
}

export function GroupeAFaire({ id, titre, lignes, onOuvrir, attenuees, deplie, onBasculer }: GroupeAFaireProps): ReactElement {
  const idTitre = `bo-groupe-${id}`;
  // Le compteur ne compte pas les lignes grisées : elles sont déjà parties.
  const nb = lignes.filter((l) => !attenuees?.has(l.dossierId)).length;
  const repliable = lignes.length > LIGNES_VISIBLES;
  const visibles = repliable && !deplie ? lignes.slice(0, LIGNES_VISIBLES) : lignes;
  const reste = lignes.length - LIGNES_VISIBLES;
  return (
    <section className="bo-groupe" aria-labelledby={idTitre}>
      <h2 className="bo-groupe-titre" id={idTitre}>
        {titre}
        <span className="bo-compteur" aria-label={`${nb} dossier${nb > 1 ? 's' : ''}`}>
          {nb}
        </span>
      </h2>
      <div className="bo-tableau-boite">
        <table className="bo-tableau bo-tableau--afaire">
          <thead>
            <tr>
              <th scope="col">Client</th>
              <th scope="col">Référence</th>
              <th scope="col">Où en est le dossier</th>
              <th scope="col">Depuis</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((ligne) => (
              <LigneAFaire
                key={ligne.dossierId}
                ligne={ligne}
                principale={false}
                onOuvrir={onOuvrir}
                attenuee={attenuees?.has(ligne.dossierId)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {repliable ? (
        <button type="button" className="bo-voir-plus" aria-expanded={deplie} onClick={onBasculer}>
          {deplie ? 'Réduire la liste' : `Voir les ${reste} autres`}
          <span className={deplie ? 'bo-voir-plus-haut' : undefined}>
            <Icone nom="chevron" taille={16} />
          </span>
        </button>
      ) : null}
    </section>
  );
}
