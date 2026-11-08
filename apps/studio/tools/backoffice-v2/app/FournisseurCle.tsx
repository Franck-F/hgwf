/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Fournisseur de la clé d'envoi : expose `demanderCle` / `oublier` à
 * `useCleApi` et monte la fenêtre `FenetreCle` à la demande.
 *
 * Deux demandes simultanées (deux envois en même temps) partagent la même
 * fenêtre et la même réponse : jamais deux fenêtres l'une sur l'autre.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { purgerCle } from '../actions/cleApi';
import { ContexteCleApi } from './Contexte';
import type { ContexteCle } from './Contexte';
import { FenetreCle } from './FenetreCle';

export function FournisseurCle({ children }: { children?: ReactNode }): ReactElement {
  const [version, setVersion] = useState(0);
  const [ouverte, setOuverte] = useState(false);
  const attente = useRef<Promise<boolean> | null>(null);
  const terminer = useRef<((enregistree: boolean) => void) | null>(null);

  const demanderCle = useCallback((): Promise<boolean> => {
    if (attente.current) return attente.current;
    attente.current = new Promise<boolean>((resoudre) => {
      terminer.current = resoudre;
    });
    setOuverte(true);
    return attente.current;
  }, []);

  const fermer = useCallback((enregistree: boolean): void => {
    setOuverte(false);
    if (enregistree) setVersion((v) => v + 1);
    terminer.current?.(enregistree);
    terminer.current = null;
    attente.current = null;
  }, []);

  const oublier = useCallback((): void => {
    try {
      purgerCle();
    } catch {
      /* stockage bloqué : rien à oublier */
    }
    setVersion((v) => v + 1);
  }, []);

  const valeur = useMemo<ContexteCle>(() => ({ version, demanderCle, oublier }), [version, demanderCle, oublier]);
  return (
    <ContexteCleApi.Provider value={valeur}>
      {children}
      {ouverte ? <FenetreCle onTermine={fermer} /> : null}
    </ContexteCleApi.Provider>
  );
}
