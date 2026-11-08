/** @jsxRuntime automatic @jsxImportSource react */
/** Onglet Export (4.7) : un seul bouton plein, tous les dossiers, sans choix de période. */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useToasts } from '../../app/Contexte';
import { useDossiers } from '../../data/useDossiers';
import { Bouton, Carte, Squelette } from '../../ui';
import { BandeauErreur } from './BandeauErreur';
import { exporterDossiers } from './ExportDossiers';

export function PanneauExport(): ReactElement {
  const { dossiers, chargement, erreur, recharger } = useDossiers();
  const toasts = useToasts();
  const [enCours, setEnCours] = useState(false);

  async function exporter(): Promise<void> {
    if (enCours) return;
    setEnCours(true);
    try {
      await exporterDossiers(dossiers);
      toasts.succes('Export Excel prêt.');
    } catch {
      toasts.erreur('L’export n’a pas pu être créé. Réessayez.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="bo-pile">
      <h2 className="bo-groupe-titre">Export</h2>
      {erreur ? (
        <BandeauErreur message="Impossible de charger les dossiers" onReessayer={() => void recharger()} />
      ) : chargement ? (
        <Squelette lignes={2} />
      ) : (
        <Carte titre="Tous les dossiers">
          <div className="bo-pile">
            <p id="export-etat">
              {dossiers.length === 0
                ? 'Il n’y a encore aucun dossier à exporter.'
                : `${dossiers.length} ${dossiers.length > 1 ? 'dossiers seront exportés' : 'dossier sera exporté'}, terminés compris.`}
            </p>
            <div className="bo-rangee">
              <Bouton variante="primaire" chargement={enCours} desactive={dossiers.length === 0} aria-describedby="export-etat" onClick={() => void exporter()}>
                Exporter les dossiers (Excel)
              </Bouton>
            </div>
          </div>
        </Carte>
      )}
    </div>
  );
}
