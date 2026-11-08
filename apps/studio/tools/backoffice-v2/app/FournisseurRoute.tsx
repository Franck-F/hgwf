/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Fournisseur de route : met le routeur (`app/routeur.ts`) à disposition de
 * `useRoute` et applique la garde de navigation (« Quitter sans enregistrer ? »).
 *
 * La garde est posée par la vue qui a des saisies non enregistrées
 * (`garde.definir`). Elle est consultée :
 *  - par `naviguer`, avant tout changement de page ;
 *  - par le bouton « Précédent » du navigateur : le changement a déjà eu lieu
 *    dans la barre d'adresse, on garde donc l'ancienne page affichée le temps
 *    de la réponse, puis on remet l'adresse d'origine si l'utilisateur refuse.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { ResultatUseRoute } from '../domaine/contrats';
import { ContexteRoute } from './Contexte';
import type { Routeur } from './routeur';

type Verification = () => boolean | Promise<boolean>;

/** Un chemin vide mène à l'accueil ; un chemin sans « / » initial en reçoit un. */
export function normaliserChemin(brut: string): string {
  if (brut === '') return '/afaire';
  return brut.startsWith('/') ? brut : `/${brut}`;
}

export function FournisseurRoute({
  routeur,
  children,
}: {
  routeur: Routeur;
  children?: ReactNode;
}): ReactElement {
  const [chemin, setChemin] = useState(() => normaliserChemin(routeur.chemin()));
  const courant = useRef(chemin);
  courant.current = chemin;
  const garde = useRef<Verification | null>(null);
  /** Vrai entre un `naviguer` accepté et l'événement du routeur qui en découle. */
  const dejaAutorise = useRef(false);
  const enCours = useRef(false);

  useEffect(
    () =>
      routeur.ecouter(() => {
        const nouveau = normaliserChemin(routeur.chemin());
        const autorise = dejaAutorise.current;
        dejaAutorise.current = false;
        if (nouveau === courant.current) return;
        const verifier = garde.current;
        if (autorise || !verifier) {
          setChemin(nouveau);
          return;
        }
        if (enCours.current) return;
        enCours.current = true;
        void Promise.resolve(verifier())
          .then((accepte) => {
            if (accepte) {
              setChemin(nouveau);
            } else {
              // L'utilisateur reste : on remet l'adresse de la page affichée.
              dejaAutorise.current = true;
              routeur.naviguer(courant.current, { remplacer: true });
            }
          })
          // Une garde qui échoue ne doit jamais bloquer la navigation pour de bon.
          .catch(() => undefined)
          .finally(() => {
            enCours.current = false;
          });
      }),
    [routeur],
  );

  const naviguer = useCallback<ResultatUseRoute['naviguer']>(
    (cible, options) => {
      const destination = normaliserChemin(cible);
      if (destination === courant.current || enCours.current) return;
      const verifier = garde.current;
      const aller = (): void => {
        dejaAutorise.current = true;
        routeur.naviguer(destination, options);
      };
      if (!verifier) {
        aller();
        return;
      }
      enCours.current = true;
      void Promise.resolve(verifier())
        .then((accepte) => {
          if (accepte) aller();
        })
        .catch(() => undefined)
        .finally(() => {
          enCours.current = false;
        });
    },
    [routeur],
  );

  const definir = useCallback((verifier: Verification | null) => {
    garde.current = verifier;
  }, []);

  const valeur = useMemo<ResultatUseRoute>(
    () => ({ chemin, naviguer, garde: { definir } }),
    [chemin, naviguer, definir],
  );
  return <ContexteRoute.Provider value={valeur}>{children}</ContexteRoute.Provider>;
}
