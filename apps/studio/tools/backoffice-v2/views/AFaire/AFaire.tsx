/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Accueil « À faire » (4.1) : « qu'est-ce que je dois faire maintenant, et sur
 * quel dossier ? ». Quatre groupes rangés par urgence, un groupe vide est
 * masqué, « En attente » est replié avec la raison de l'attente.
 *
 * Un tableau par groupe (au-delà de 8 lignes, le reste est replié). Les cartes
 * « accès rapide » donnent la vue d'ensemble et filtrent les tableaux.
 * Aucune écriture ici : cliquer une ligne ou son action ouvre le dossier.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useRoute } from '../../app/Contexte';
import { useAFaire } from '../../data/useAFaire';
import { useDossiers } from '../../data/useDossiers';
import { formaterJourMois } from '../../domaine/format';
import { Bouton, EtatVide, Icone, Squelette } from '../../ui';
import { AccesRapide, ID_ATTENTE, ID_TOUT, cartesAcces } from './AccesRapide';
import { GroupeAFaire } from './GroupeAFaire';
import { useLignesFantomes } from './useLignesFantomes';

export function AFaire(): ReactElement {
  const { naviguer } = useRoute();
  const { groupes, attente, prochaineCloture, chargement, erreur } = useAFaire();
  const { recharger } = useDossiers();
  const [choix, setChoix] = useState<string>(ID_TOUT);
  const [deplies, setDeplies] = useState<ReadonlySet<string>>(new Set());
  const liste = useLignesFantomes(groupes);

  const ouvrir = (dossierId: string): void => naviguer(`/dossier/${dossierId}`);
  const basculer = (id: string): void =>
    setDeplies((avant) => {
      const apres = new Set(avant);
      if (!apres.delete(id)) apres.add(id);
      return apres;
    });

  const cartes = cartesAcces(liste.groupes, attente.length, liste.fantomes);
  // Un filtre dont le groupe a disparu (dossiers traités) retombe sur « Tout ».
  const filtre = cartes.some((c) => c.id === choix) ? choix : ID_TOUT;
  const groupesVisibles = filtre === ID_TOUT ? liste.groupes : liste.groupes.filter((g) => g.id === filtre);

  return (
    <div className="bo-page">
      <div className="bo-page-entete">
        <div className="bo-titres">
          <div className="bo-rangee">
            <h1 className="bo-titre-page">À faire</h1>
            <button type="button" className="bo-carre" aria-label="Nouveau dossier" title="Nouveau dossier" onClick={() => naviguer('/dossier/nouveau')}>
              <Icone nom="dossierPlus" taille={24} />
            </button>
          </div>
          <p className="bo-sous-titre">Les dossiers qui attendent une action de votre part, du plus urgent au moins urgent. Cliquez une ligne pour l’ouvrir.</p>
        </div>
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
          <AccesRapide cartes={cartes} choisi={filtre} onChoisir={setChoix} />

          {liste.groupes.length === 0 && filtre !== ID_ATTENTE ? (
            <EtatVide
              titre="Rien d'urgent"
              phrase="Tous les dossiers sont à jour."
              action={{ libelle: 'Voir les dossiers en cours', onClick: () => naviguer('/dossiers?vue=enCours') }}
            />
          ) : (
            groupesVisibles.map((g) => (
              <GroupeAFaire
                key={g.id}
                id={g.id}
                titre={g.titre}
                lignes={g.lignes}
                onOuvrir={ouvrir}
                attenuees={liste.fantomes}
                deplie={deplies.has(g.id)}
                onBasculer={() => basculer(g.id)}
              />
            ))
          )}

          {filtre === ID_ATTENTE ? (
            <GroupeAFaire
              id={ID_ATTENTE}
              titre="En attente"
              lignes={attente.map((l) => ({ ...l, raison: l.attente }))}
              onOuvrir={ouvrir}
              deplie={deplies.has(ID_ATTENTE)}
              onBasculer={() => basculer(ID_ATTENTE)}
            />
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
