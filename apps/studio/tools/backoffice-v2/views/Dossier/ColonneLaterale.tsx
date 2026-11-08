/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Colonne latérale (4.3) : le client (fiche, ses autres dossiers), les notes
 * internes (toujours visibles : c'est ce que l'on consulte au téléphone) et
 * les trois derniers événements.
 */
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { useRoute } from '../../app/Contexte';
import { useClients } from '../../data/useClients';
import { useDossiers } from '../../data/useDossiers';
import { fusionner } from '../../domaine/fusion';
import { construireHistorique } from '../../domaine/historique';
import { LIBELLES_PHASE, phaseDe } from '../../domaine/phases';
import type { Brouillon, Dossier, ValeurBrouillon } from '../../domaine/types';
import { Bouton, Carte, ZoneTexte } from '../../ui';
import { autresDossiers, ficheDuDossier } from './autresDossiers';

export interface ColonneLateraleProps {
  dossier: Dossier;
  brouillon: Brouillon;
  modifier: (champ: string, valeur: ValeurBrouillon) => void;
}

export function ColonneLaterale({ dossier, brouillon, modifier }: ColonneLateraleProps): ReactElement {
  const { naviguer } = useRoute();
  const { clients } = useClients();
  const { dossiers } = useDossiers();

  const fiche = useMemo(() => ficheDuDossier(dossier, clients), [dossier, clients]);
  const autres = useMemo(() => autresDossiers(dossier, dossiers), [dossier, dossiers]);
  const derniers = useMemo(() => construireHistorique(dossier).slice(0, 3), [dossier]);

  // Notes internes : celles de la demande ; une expédition seule garde les siennes.
  const champNotes = dossier.demande ? 'notes' : 'notesExploitation';
  const document = dossier.demande ?? dossier.expedition;
  const notes = document ? ((fusionner(document, brouillon) as unknown as Record<string, unknown>)[champNotes] ?? '') : '';
  const nom = dossier.demande?.clientNom || dossier.expedition?.clientNom || 'Client sans nom';

  return (
    <aside className="bo-pile">
      <Carte titre="Client">
        <p className="bo-fort">{nom}</p>
        {fiche ? (
          <div>
            <Bouton variante="secondaire" taille="s" onClick={() => naviguer(`/client/${fiche._id}`)}>
              Ouvrir la fiche client
            </Bouton>
          </div>
        ) : null}
        {autres.length > 0 ? (
          <div className="bo-pile">
            <h3 className="bo-secondaire">Ses autres dossiers</h3>
            <ul className="bo-pile">
              {autres.map((d) => (
                <li key={d.id}>
                  <button type="button" className="bo-lien" onClick={() => naviguer(`/dossier/${d.id}`)}>
                    {d.demande?.reference ?? d.expedition?.reference ?? d.id}
                    {' · '}
                    {LIBELLES_PHASE[phaseDe(d)]}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Carte>

      <Carte titre="Notes internes">
        <ZoneTexte
          etiquette="Notes internes"
          valeur={typeof notes === 'string' ? notes : ''}
          lignes={5}
          onChange={(v) => modifier(champNotes, v === '' ? null : v)}
        />
      </Carte>

      {derniers.length > 0 ? (
        <Carte titre="Derniers événements">
          <ul className="bo-pile">
            {derniers.map((e, i) => (
              <li key={`${e.libelle}-${i}`}>
                <span className="bo-secondaire">{e.dateTexte}</span>
                <br />
                {e.libelle}
              </li>
            ))}
          </ul>
        </Carte>
      ) : null}
    </aside>
  );
}
