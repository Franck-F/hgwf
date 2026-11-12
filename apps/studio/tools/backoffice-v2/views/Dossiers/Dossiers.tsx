/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Liste des dossiers (4.2) : 4 vues à compteurs, tri par urgence puis activité
 * récente. Page de navigation : aucun bouton plein, pas de recherche locale
 * (la recherche globale est le seul moyen de retrouver un dossier par texte).
 */
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useRoute, useToasts } from '../../app/Contexte';
import { useDossiers } from '../../data/useDossiers';
import type { DossiersProps } from '../../domaine/contrats';
import { trierParUrgence } from '../../domaine/priorites';
import { Bouton, EtatVide, MenuActions, Segments, Squelette } from '../../ui';
import { exporterDossiers } from '../Outils/ExportDossiers';
import { LigneDossier } from './LigneDossier';
import { VUES, compterParVue, estDansVue } from './vues';

export function Dossiers({ vue }: DossiersProps): ReactElement {
  const { naviguer } = useRoute();
  const toasts = useToasts();
  const { dossiers, chargement, erreur, recharger } = useDossiers();
  const [export_, setExport] = useState(false);

  const compteurs = useMemo(() => compterParVue(dossiers), [dossiers]);
  const lignes = useMemo(
    () => trierParUrgence(dossiers.filter((d) => estDansVue(d, vue)), new Date()),
    [dossiers, vue],
  );
  const definition = VUES.find((v) => v.id === vue) ?? VUES[0]!;

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
        <EtatVide titre={definition.vide.titre} phrase={definition.vide.phrase} />
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
