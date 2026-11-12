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
import { Bouton, EtatVide, Icone, Saisie, Squelette } from '../../ui';
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
        <div className="bo-titres">
          <h1 className="bo-titre-page">Clients</h1>
          <p className="bo-sous-titre">Cliquez un client pour voir sa fiche et ses dossiers.</p>
        </div>
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
            <div className="bo-tableau-boite">
              <table className="bo-tableau bo-tableau--clients">
                <thead>
                  <tr>
                    <th scope="col">Client</th>
                    <th scope="col">E-mail</th>
                    <th scope="col">Téléphone</th>
                    <th scope="col">Dossiers</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((s) => (
                    <tr key={s.client._id} className="bo-ligne-dossier" onClick={() => naviguer(`/client/${s.client._id}`)}>
                      <td>
                        <span className="bo-nom-cellule">
                          <span className="bo-pastille bo-pastille--info" aria-hidden="true">
                            <Icone nom="clients" taille={13} trait={2.2} />
                          </span>
                          <button
                            type="button"
                            className="bo-nom-lien"
                            aria-label={`Ouvrir la fiche de ${s.nom}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              naviguer(`/client/${s.client._id}`);
                            }}
                          >
                            {s.nom}
                          </button>
                        </span>
                      </td>
                      <td data-etiquette="E-mail" className="bo-secondaire">{s.email || 'Pas d’e-mail'}</td>
                      <td data-etiquette="Téléphone" className="bo-secondaire">{s.telephone ? formaterTelephone(s.telephone) : 'Pas de téléphone'}</td>
                      <td data-etiquette="Dossiers">
                        {chargementDossiers
                          ? '…'
                          : s.dossiers.length === 0
                            ? 'Aucun dossier'
                            : `${s.dossiers.length} ${s.dossiers.length > 1 ? 'dossiers' : 'dossier'}${
                                s.dernier ? `, dernier le ${formaterDate(s.dernier)}` : ''
                              }`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {creation ? <NouveauClient onFermer={() => setCreation(false)} onCree={recharger} /> : null}
    </div>
  );
}
