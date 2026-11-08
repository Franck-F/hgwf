/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Accueil « À faire » (4.1) : « qu'est-ce que je dois faire maintenant, et sur
 * quel dossier ? ». Quatre groupes rangés par urgence, un groupe vide est
 * masqué, « En attente » est replié avec la raison de l'attente.
 *
 * Aucune écriture ici : cliquer une ligne ouvre le dossier. Le seul bouton
 * plein de l'écran est le libellé d'action de la première ligne.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useRoute } from '../../app/Contexte';
import { useAFaire } from '../../data/useAFaire';
import { useDossiers } from '../../data/useDossiers';
import { formaterJourMois } from '../../domaine/format';
import { Bouton, EtatVide, Section, Squelette } from '../../ui';
import { GroupeAFaire } from './GroupeAFaire';
import { LigneAFaire } from './LigneAFaire';
import { useLignesFantomes } from './useLignesFantomes';

export function AFaire(): ReactElement {
  const { naviguer } = useRoute();
  const { groupes, attente, prochaineCloture, chargement, erreur } = useAFaire();
  const { recharger } = useDossiers();
  const [attenteOuverte, setAttenteOuverte] = useState(false);
  const liste = useLignesFantomes(groupes);

  const ouvrir = (dossierId: string): void => naviguer(`/dossier/${dossierId}`);

  // Le bouton plein va à la première ligne qui est encore une vraie ligne.
  const premiereLigneId =
    liste.groupes.flatMap((g) => g.lignes).find((l) => !liste.fantomes.has(l.dossierId))?.dossierId ?? null;

  return (
    <div className="bo-page">
      <div className="bo-page-entete">
        <h1 className="bo-titre-page">À faire</h1>
        <span className="bo-espace" />
        <Bouton variante="discret" onClick={() => naviguer('/dossier/nouveau')}>
          Nouveau dossier
        </Bouton>
      </div>

      {erreur ? (
        <div className="bo-bandeau bo-bandeau--urgent" role="alert">
          <span>Impossible de charger les dossiers</span>
          <span className="bo-espace" />
          <Bouton variante="secondaire" onClick={() => void recharger()}>
            Réessayer
          </Bouton>
        </div>
      ) : chargement ? (
        <Squelette lignes={4} />
      ) : (
        <>
          {liste.groupes.length === 0 ? (
            <EtatVide
              titre="Rien d'urgent"
              phrase="Tous les dossiers sont à jour."
              action={{ libelle: 'Voir les dossiers en cours', onClick: () => naviguer('/dossiers?vue=enCours') }}
            />
          ) : (
            liste.groupes.map((g) => (
              <GroupeAFaire
                key={g.id}
                groupe={g}
                premiereLigneId={premiereLigneId}
                onOuvrir={ouvrir}
                attenuees={liste.fantomes}
              />
            ))
          )}

          {attente.length > 0 ? (
            <Section
              titre={`En attente (${attente.length})`}
              resume="Rien à faire pour l'instant, avec la raison de l'attente"
              ouverte={attenteOuverte}
              onBasculer={() => setAttenteOuverte((o) => !o)}
            >
              <ul className="bo-pile">
                {attente.map((l) => (
                  <li key={l.dossierId}>
                    <LigneAFaire ligne={{ ...l, raison: l.attente }} principale={false} onOuvrir={ouvrir} />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {prochaineCloture ? (
            <p className="bo-secondaire">
              Prochaine clôture : {prochaineCloture.nom}, {formaterJourMois(prochaineCloture.cloture)}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
