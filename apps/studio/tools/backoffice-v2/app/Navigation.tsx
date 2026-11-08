/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Navigation principale (3, 2.3) : quatre entrées. Barre latérale marine à
 * partir de 900 px, barre d'onglets collante en bas de `.bo-racine` en dessous
 * (la mise en page est dans la feuille de style, ce composant ne change pas).
 *
 * La pastille de « À faire » est le nombre d'éléments urgents ; elle est lue
 * « N urgents » par les lecteurs d'écran.
 */
import type { ReactElement } from 'react';
import type { EntreeNavigation } from './routes';

export interface NavigationProps {
  /** Entrée à marquer comme active (`null` : page inconnue). */
  active: EntreeNavigation | null;
  /** Nombre d'éléments urgents ; la pastille est masquée à 0. */
  nbUrgents: number;
  onChoisir: (entree: EntreeNavigation) => void;
}

export const ENTREES: readonly { id: EntreeNavigation; libelle: string }[] = [
  { id: 'afaire', libelle: 'À faire' },
  { id: 'dossiers', libelle: 'Dossiers' },
  { id: 'clients', libelle: 'Clients' },
  { id: 'outils', libelle: 'Outils' },
];

export function Navigation({ active, nbUrgents, onChoisir }: NavigationProps): ReactElement {
  return (
    <nav className="bo-nav" aria-label="Navigation principale">
      <div className="bo-nav-interne">
        {ENTREES.map((e) => (
          <button
            key={e.id}
            type="button"
            className={`bo-nav-lien${active === e.id ? ' bo-nav-lien--actif' : ''}`}
            aria-current={active === e.id ? 'page' : undefined}
            onClick={() => onChoisir(e.id)}
          >
            {e.libelle}
            {e.id === 'afaire' && nbUrgents > 0 ? (
              <span className="bo-nav-pastille">
                {nbUrgents}
                <span className="bo-sr"> {nbUrgents > 1 ? 'urgents' : 'urgent'}</span>
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </nav>
  );
}
