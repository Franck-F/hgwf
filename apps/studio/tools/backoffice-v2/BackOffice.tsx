/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Point d'entrée du back-office V2. Le harnais d'aperçu exige ce fichier à la
 * racine du dossier, exportant `BackOffice`. Toute la logique est dans `app/`.
 *
 * `BackOffice` n'a volontairement aucune prop : le Studio lui passe `{ tool }`
 * et le harnais rien. Les essais qui veulent un routeur en mémoire montent
 * `BackOfficeAvecRouteur`.
 */
import type { ReactElement } from 'react';
import { Coque } from './app/Coque';
import { Fournisseurs } from './app/Fournisseurs';
import type { Routeur } from './app/routeur';

export function BackOfficeAvecRouteur({ routeur }: { routeur?: Routeur }): ReactElement {
  return (
    <Fournisseurs routeur={routeur}>
      <Coque />
    </Fournisseurs>
  );
}

export function BackOffice(): ReactElement {
  return <BackOfficeAvecRouteur />;
}
