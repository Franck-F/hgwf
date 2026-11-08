/** @jsxRuntime automatic @jsxImportSource react */
/** Un groupe de l'accueil « À faire » : titre + compteur, puis ses lignes. */
import type { ReactElement } from 'react';
import type { LigneAFaireProps } from '../../domaine/contrats';
import type { GroupeAFaire as GroupeAFaireDonnees } from '../../domaine/types';
import { LigneAFaire } from './LigneAFaire';

export interface GroupeAFaireProps {
  groupe: GroupeAFaireDonnees;
  /** Id du dossier de la toute première ligne de l'écran (porte le bouton plein). */
  premiereLigneId: string | null;
  onOuvrir: LigneAFaireProps['onOuvrir'];
  /** Ids des lignes à griser (sorties de la liste depuis moins de 2 s). */
  attenuees?: ReadonlySet<string>;
}

export function GroupeAFaire({ groupe, premiereLigneId, onOuvrir, attenuees }: GroupeAFaireProps): ReactElement {
  const idTitre = `bo-groupe-${groupe.id}`;
  // Le compteur ne compte pas les lignes grisées : elles sont déjà parties.
  const nb = groupe.lignes.filter((l) => !attenuees?.has(l.dossierId)).length;
  return (
    <section className="bo-groupe" aria-labelledby={idTitre}>
      <h2 className="bo-groupe-titre" id={idTitre}>
        {groupe.titre}
        <span className="bo-compteur" aria-label={`${nb} dossier${nb > 1 ? 's' : ''}`}>
          {nb}
        </span>
      </h2>
      <ul className="bo-pile">
        {groupe.lignes.map((ligne) => (
          <li key={ligne.dossierId}>
            <LigneAFaire
              ligne={ligne}
              principale={ligne.dossierId === premiereLigneId}
              onOuvrir={onOuvrir}
              attenuee={attenuees?.has(ligne.dossierId)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
