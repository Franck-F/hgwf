/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Barre haute de la coque : logo (retour à « À faire ») et recherche globale.
 * Ni nom d'utilisateur ni boutons sans effet (alertes, aide, réglages de la
 * maquette) : l'équipe a demandé qu'on les retire.
 */
import type { ReactElement } from 'react';
import { useRoute } from './Contexte';
import { RechercheGlobale } from './RechercheGlobale';

/** Le dossier `static/` du Studio est servi à la racine, comme l'emblème. */
export const URL_LOGO = '/static/logo-hgwf-cargo.png';

export function EnteteCoque(): ReactElement {
  const { naviguer } = useRoute();
  return (
    <header className="bo-haut">
      <button type="button" className="bo-logo-bouton" aria-label="HGWF Cargo, retour à la page « À faire »" onClick={() => naviguer('/afaire')}>
        <img className="bo-logo" src={URL_LOGO} alt="" />
      </button>
      <RechercheGlobale />
    </header>
  );
}
