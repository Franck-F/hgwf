/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Coque de l'application (2.3, 3) : navigation, barre haute (recherche globale
 * et nom de l'utilisateur), zone de contenu. Elle choisit la vue d'après la
 * route et ne contient aucune logique métier.
 *
 * Les pages sont remontées à chaque changement de dossier, de client ou de
 * section (clé), pour qu'aucun état local d'un dossier ne survive dans le
 * suivant.
 */
import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { useAFaire } from '../data/useAFaire';
import { useUtilisateur } from '../data/client';
import { EtatVide } from '../ui';
import { AFaire } from '../views/AFaire/AFaire';
import { Clients } from '../views/Clients/Clients';
import { FicheClient } from '../views/Clients/FicheClient';
import { DossierPage } from '../views/Dossier/DossierPage';
import { Dossiers } from '../views/Dossiers/Dossiers';
import { Outils } from '../views/Outils/Outils';
import { useRacine, useRoute } from './Contexte';
import { Navigation } from './Navigation';
import { RechercheGlobale } from './RechercheGlobale';
import { analyserChemin, cheminDe, entreeActive } from './routes';
import type { EntreeNavigation, Route } from './routes';

/** Chemin d'accueil de chaque entrée de la navigation. */
const CHEMIN_ENTREE: Record<EntreeNavigation, string> = {
  afaire: '/afaire',
  dossiers: '/dossiers',
  clients: '/clients',
  outils: '/outils/conteneurs',
};

/** Identité de la page : change quand une vue doit repartir de zéro. */
export function cleDePage(route: Route): string {
  switch (route.nom) {
    case 'dossier':
    case 'client':
      return `${route.nom}:${route.id}`;
    case 'dossiers':
      return `dossiers:${route.vue}`;
    case 'outils':
      return `outils:${route.section}`;
    default:
      return route.nom;
  }
}

function Page({ route, retour }: { route: Route; retour: () => void }): ReactElement {
  switch (route.nom) {
    case 'afaire':
      return <AFaire />;
    case 'dossiers':
      return <Dossiers vue={route.vue} />;
    case 'dossier':
      // `nouveau` = mode création, géré par DossierPage (lot 10).
      return <DossierPage id={route.id} />;
    case 'clients':
      return <Clients />;
    case 'client':
      return <FicheClient id={route.id} />;
    case 'outils':
      return <Outils section={route.section} />;
    case 'introuvable':
      return (
        <div className="bo-page">
          <EtatVide
            titre="Cette page n'existe pas"
            phrase="L'adresse est peut-être ancienne."
            action={{ libelle: 'Retour à « À faire »', onClick: retour }}
          />
        </div>
      );
  }
}

export function Coque(): ReactElement {
  const { chemin, naviguer } = useRoute();
  const racine = useRacine();
  const utilisateur = useUtilisateur();
  const { nbUrgents } = useAFaire();
  const route = analyserChemin(chemin);
  const cle = cleDePage(route);

  // Nouvelle page : on repart du haut (le conteneur de défilement est la racine).
  useEffect(() => {
    racine.scrollTop = 0;
  }, [racine, cle]);

  return (
    <div className="bo-coque">
      <Navigation
        active={entreeActive(route)}
        nbUrgents={nbUrgents}
        onChoisir={(entree) => naviguer(CHEMIN_ENTREE[entree])}
      />
      <div className="bo-contenu">
        <header className="bo-haut">
          <RechercheGlobale />
          <span className="bo-espace bo-secondaire">{utilisateur.nom}</span>
        </header>
        <main>
          <Page key={cle} route={route} retour={() => naviguer(cheminDe({ nom: 'afaire' }))} />
        </main>
      </div>
    </div>
  );
}
