/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Fournisseur des notifications : `useToasts().succes / .erreur`. La pile est
 * rendue en dernier enfant de `.bo-racine` (elle y est collante, jamais `fixed`).
 * Une erreur reste à l'écran jusqu'à fermeture ; un succès se ferme seul (kit).
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { ResultatUseToasts } from '../domaine/contrats';
import { Toasts } from '../ui';
import type { ToastsProps } from '../ui';
import { ContexteToasts } from './Contexte';

/** Au-delà, les plus anciens messages sont retirés : la pile ne doit pas couvrir la page. */
const MAX_TOASTS = 5;

export function FournisseurToasts({ children }: { children?: ReactNode }): ReactElement {
  const [toasts, setToasts] = useState<ToastsProps['toasts']>([]);
  const compteur = useRef(0);

  const ajouter = useCallback((type: 'succes' | 'erreur', message: string): void => {
    compteur.current += 1;
    const id = `toast-${compteur.current}`;
    setToasts((liste) => [...liste, { id, type, message }].slice(-MAX_TOASTS));
  }, []);

  const fermer = useCallback((id: string): void => {
    setToasts((liste) => liste.filter((t) => t.id !== id));
  }, []);

  const valeur = useMemo<ResultatUseToasts>(
    () => ({ succes: (m) => ajouter('succes', m), erreur: (m) => ajouter('erreur', m) }),
    [ajouter],
  );
  return (
    <ContexteToasts.Provider value={valeur}>
      {children}
      <Toasts toasts={toasts} onFermer={fermer} />
    </ContexteToasts.Provider>
  );
}
