/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Liste des dossiers (4.2) : 4 vues à compteurs, tri par urgence puis activité
 * récente. Dans une vue, des filtres resserrent la liste : l'étape précise
 * (boutons avec leur nombre), le type d'envoi et un texte libre. Page de
 * navigation : aucun bouton plein.
 */
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useRoute, useToasts } from '../../app/Contexte';
import { useDossiers } from '../../data/useDossiers';
import type { DossiersProps } from '../../domaine/contrats';
import { trierParUrgence } from '../../domaine/priorites';
import { Bouton, EtatVide, Liste, MenuActions, Saisie, Segments, Squelette } from '../../ui';
import { exporterDossiers } from '../Outils/ExportDossiers';
import { FILTRES_VIDES, TOUS, TOUTES, etapesPresentes, filtrer, filtrerSansEtape, filtresActifs, typesEnvoiPresents } from './filtres';
import type { Filtres } from './filtres';
import { LigneDossier } from './LigneDossier';
import { VUES, compterParVue, estDansVue } from './vues';

export function Dossiers({ vue }: DossiersProps): ReactElement {
  const { naviguer } = useRoute();
  const toasts = useToasts();
  const { dossiers, chargement, erreur, recharger } = useDossiers();
  const [export_, setExport] = useState(false);
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_VIDES);

  const compteurs = useMemo(() => compterParVue(dossiers), [dossiers]);
  const dansVue = useMemo(() => dossiers.filter((d) => estDansVue(d, vue)), [dossiers, vue]);
  const types = useMemo(() => typesEnvoiPresents(dansVue), [dansVue]);
  const etapes = useMemo(() => etapesPresentes(filtrerSansEtape(dansVue, filtres)), [dansVue, filtres]);
  // Une étape absente de cette vue (on vient de changer de vue) ne filtre plus rien.
  const effectifs: Filtres = etapes.some((e) => e.id === filtres.etape) ? filtres : { ...filtres, etape: TOUTES };
  const lignes = useMemo(() => trierParUrgence(filtrer(dansVue, effectifs), new Date()), [dansVue, effectifs]);
  const definition = VUES.find((v) => v.id === vue) ?? VUES[0]!;
  const actifs = filtresActifs(effectifs);
  const changer = (f: Partial<Filtres>): void => setFiltres((c) => ({ ...c, ...f }));
  const totalSansEtape = etapes.reduce((n, e) => n + e.nombre, 0);

  async function exporter(): Promise<void> {
    if (export_) return;
    setExport(true);
    try {
      await exporterDossiers(dossiers);
      toasts.succes('Export Excel prêt.');
    } catch {
      toasts.erreur("L'export n'a pas pu être créé. Réessayez.");
    } finally {
      setExport(false);
    }
  }

  return (
    <div className="bo-page">
      <div className="bo-page-entete">
        <h1 className="bo-titre-page">Dossiers</h1>
        <span className="bo-espace" />
        <Bouton variante="secondaire" onClick={() => naviguer('/dossier/nouveau')}>
          Nouveau dossier
        </Bouton>
        <MenuActions
          libelle="Autres actions"
          elements={[
            { id: 'exporter', libelle: 'Exporter en Excel', desactive: chargement || export_, onChoisir: () => void exporter() },
          ]}
        />
      </div>

      <Segments
        libelle="Vues des dossiers"
        courant={vue}
        onChoisir={(id) => naviguer(`/dossiers?vue=${id}`)}
        valeurs={VUES.map((v) => ({ id: v.id, libelle: v.libelle, compteur: chargement ? undefined : compteurs[v.id] }))}
      />

      {!chargement && !erreur && dansVue.length > 0 ? (
        <section className="bo-filtres" aria-label="Filtrer la liste">
          <div className="bo-filtres-ligne">
            <Saisie
              etiquette="Rechercher dans la liste"
              placeholder="Client, référence, destination, téléphone…"
              valeur={filtres.texte}
              onChange={(texte) => changer({ texte })}
            />
            {types.length > 1 ? (
              <Liste
                etiquette="Type d’envoi"
                valeur={filtres.typeEnvoi}
                vide="Tous les types"
                options={types.map((t) => ({ valeur: t.valeur, libelle: `${t.valeur} (${t.nombre})` }))}
                onChange={(typeEnvoi) => changer({ typeEnvoi: typeEnvoi || TOUS })}
              />
            ) : null}
            {actifs ? (
              <Bouton variante="discret" onClick={() => setFiltres(FILTRES_VIDES)}>
                Effacer les filtres
              </Bouton>
            ) : null}
          </div>
          {etapes.length > 1 ? (
            <div className="bo-puces" role="group" aria-label="Étape du dossier">
              {[{ id: TOUTES, libelle: 'Toutes les étapes', nombre: totalSansEtape }, ...etapes].map((e) => {
                const choisi = effectifs.etape === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={`bo-puce bo-puce--filtre${choisi ? ' bo-puce--actif' : ''}`}
                    aria-pressed={choisi}
                    onClick={() => changer({ etape: choisi ? TOUTES : (e.id as Filtres['etape']) })}
                  >
                    {e.libelle}
                    <span className="bo-puce-nombre">{e.nombre}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {actifs ? (
            <p className="bo-secondaire" role="status">
              {lignes.length} dossier{lignes.length > 1 ? 's' : ''} sur {dansVue.length}
            </p>
          ) : null}
        </section>
      ) : null}

      {erreur ? (
        <div className="bo-bandeau bo-bandeau--urgent" role="alert">
          <span>Impossible de charger les dossiers</span>
          <span className="bo-espace" />
          <Bouton variante="secondaire" onClick={() => void recharger()}>
            Réessayer
          </Bouton>
        </div>
      ) : chargement ? (
        <Squelette lignes={5} />
      ) : lignes.length === 0 ? (
        actifs ? (
          <EtatVide
            titre="Aucun dossier ne correspond"
            phrase="Essayez un autre mot, ou effacez les filtres."
            action={{ libelle: 'Effacer les filtres', onClick: () => setFiltres(FILTRES_VIDES) }}
          />
        ) : (
          <EtatVide titre={definition.vide.titre} phrase={definition.vide.phrase} />
        )
      ) : (
        <div className="bo-tableau-boite"><table className="bo-tableau">
          <thead>
            <tr>
              <th scope="col">Client</th>
              <th scope="col">Phase</th>
              <th scope="col">Montant TTC</th>
              <th scope="col">Dernière activité</th>
              <th scope="col">Prochaine action</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((d) => (
              <LigneDossier key={d.id} dossier={d} onOuvrir={(id) => naviguer(`/dossier/${id}`)} />
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
