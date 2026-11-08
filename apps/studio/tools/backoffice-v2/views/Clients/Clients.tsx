/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Liste des clients (4.6) : nom, e-mail, téléphone, nombre de dossiers et date
 * du dernier (calculés). Recherche locale, un seul bouton plein « Nouveau
 * client ». Pas de crayon ni de croix en liste : tout passe par la fiche.
 */
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useRoute } from '../../app/Contexte';
import { useClients } from '../../data/useClients';
import { useDossiers } from '../../data/useDossiers';
import { formaterDate, formaterTelephone } from '../../domaine/format';
import { Bouton, EtatVide, Icone, LigneCliquable, Saisie, Squelette } from '../../ui';
import { filtrer, synthese, trierParNom } from './contactClient';
import { NouveauClient } from './NouveauClient';

export function Clients(): ReactElement {
  const { clients, chargement, erreur, recharger } = useClients();
  const { dossiers, chargement: chargementDossiers } = useDossiers();
  const { naviguer } = useRoute();
  const [texte, setTexte] = useState('');
  const [creation, setCreation] = useState(false);

  const lignes = useMemo(
    () => trierParNom(clients.map((c) => synthese(c, dossiers))),
    [clients, dossiers],
  );
  const visibles = useMemo(() => filtrer(lignes, texte), [lignes, texte]);

  return (
    <div className="bo-page">
      <div className="bo-page-entete">
        <h1 className="bo-titre-page">Clients</h1>
        <span className="bo-espace">
          <Bouton variante="primaire" onClick={() => setCreation(true)}>
            <Icone nom="plus" /> Nouveau client
          </Bouton>
        </span>
      </div>

      {erreur ? (
        <div className="bo-bandeau bo-bandeau--urgent" role="alert">
          <Icone nom="alerte" />
          <span>Impossible de charger les clients</span>
          <span className="bo-espace">
            <Bouton variante="secondaire" onClick={() => void recharger()}>
              Réessayer
            </Bouton>
          </span>
        </div>
      ) : chargement ? (
        <Squelette lignes={4} />
      ) : clients.length === 0 ? (
        <EtatVide
          titre="Aucune fiche client"
          phrase="Les fiches se créent toutes seules quand un devis accepté devient expédition."
        />
      ) : (
        <>
          <Saisie etiquette="Rechercher un client" valeur={texte} onChange={setTexte} />
          {visibles.length === 0 ? (
            <EtatVide titre={`Aucun client pour « ${texte.trim()} »`} />
          ) : (
            <div className="bo-pile">
              {visibles.map((s) => (
                <LigneCliquable
                  key={s.client._id}
                  onClick={() => naviguer(`/client/${s.client._id}`)}
                  aria-label={`Ouvrir la fiche de ${s.nom}`}
                >
                  <span className="bo-fort">{s.nom}</span>
                  <span className="bo-secondaire">{s.email || 'Pas d’e-mail'}</span>
                  <span className="bo-secondaire">{s.telephone ? formaterTelephone(s.telephone) : 'Pas de téléphone'}</span>
                  <span className="bo-espace bo-secondaire">
                    {chargementDossiers
                      ? '…'
                      : s.dossiers.length === 0
                        ? 'Aucun dossier'
                        : `${s.dossiers.length} ${s.dossiers.length > 1 ? 'dossiers' : 'dossier'}${
                            s.dernier ? `, dernier le ${formaterDate(s.dernier)}` : ''
                          }`}
                  </span>
                </LigneCliquable>
              ))}
            </div>
          )}
        </>
      )}

      {creation ? <NouveauClient onFermer={() => setCreation(false)} onCree={recharger} /> : null}
    </div>
  );
}
