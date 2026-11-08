/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Pile des fournisseurs de l'application, montée une seule fois par
 * `BackOffice`. Elle rend l'élément `.bo-racine` lui-même : c'est son propre
 * conteneur de défilement et l'hôte des fenêtres (2.2), que les composants
 * retrouvent par `useRacine`.
 *
 * Ordre (du dehors vers le dedans) : racine, route, notifications, clé
 * d'envoi. Le magasin de données est un objet de module (data/magasin.ts) :
 * il n'a pas de fournisseur à monter. Les notifications sont rendues en dernier
 * enfant de la racine (pile collante).
 */
import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { GlobalStyle } from '../theme/GlobalStyle';
import { ContexteRacine } from './Contexte';
import { FournisseurCle } from './FournisseurCle';
import { FournisseurRoute } from './FournisseurRoute';
import { FournisseurToasts } from './FournisseurToasts';
import { creerRouteurHash } from './routeur';
import type { Routeur } from './routeur';

export function Fournisseurs({
  routeur,
  children,
}: {
  /** Routeur à utiliser ; par défaut le routeur à fragment (`location.hash`). */
  routeur?: Routeur;
  children?: ReactNode;
}): ReactElement {
  const [racine, setRacine] = useState<HTMLElement | null>(null);
  const [routeurActif] = useState<Routeur>(() => routeur ?? creerRouteurHash());

  return (
    <>
      <GlobalStyle />
      <div className="bo-racine" ref={setRacine}>
        {racine ? (
          <ContexteRacine.Provider value={racine}>
            <FournisseurRoute routeur={routeurActif}>
              <FournisseurToasts>
                <FournisseurCle>{children}</FournisseurCle>
              </FournisseurToasts>
            </FournisseurRoute>
          </ContexteRacine.Provider>
        ) : null}
      </div>
    </>
  );
}
