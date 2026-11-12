/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Barre haute de la coque : logo (retour à « À faire »), recherche globale,
 * nom de l'utilisateur et pastille d'initiale. Aucun bouton sans effet : la
 * maquette en avait trois (alertes, aide, réglages) que nous n'avons pas.
 */
import type { ReactElement } from 'react';
import { useUtilisateur } from '../data/client';
import { useRoute } from './Contexte';
import { RechercheGlobale } from './RechercheGlobale';

/** Le dossier `static/` du Studio est servi à la racine, comme l'emblème. */
export const URL_LOGO = '/static/logo-hgwf-cargo.png';

export function EnteteCoque(): ReactElement {
  const { naviguer } = useRoute();
  const utilisateur = useUtilisateur();
  const nom = utilisateur.nom?.trim() ?? '';
  const initiale = nom ? [...nom][0]!.toLocaleUpperCase('fr-FR') : '?';
  return (
    <header className="bo-haut">
      <button type="button" className="bo-logo-bouton" aria-label="HGWF Cargo, retour à la page « À faire »" onClick={() => naviguer('/afaire')}>
        <img className="bo-logo" src={URL_LOGO} alt="" />
      </button>
      <RechercheGlobale />
      <div className="bo-utilisateur">
        <span className="bo-utilisateur-nom">{utilisateur.nom}</span>
        <span className="bo-pastille-utilisateur" aria-hidden="true">
          {initiale}
        </span>
      </div>
    </header>
  );
}
