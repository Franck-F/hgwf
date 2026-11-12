/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Barre latérale bleue (≥ 900 px) : bouton « Nouveau dossier », navigation,
 * puis le bloc « Détails » (compteurs réels de la page « À faire » et prochaine
 * clôture de rotation). Sous 900 px, seule la navigation reste, en barre
 * d'onglets collée en bas ; le reste est masqué par la feuille de style.
 */
import type { ReactElement } from 'react';
import { useAFaire } from '../data/useAFaire';
import { formaterJourMois } from '../domaine/format';
import { Icone } from '../ui';
import { Navigation } from './Navigation';
import type { EntreeNavigation } from './routes';

export interface BarreLateraleProps {
  active: EntreeNavigation | null;
  onChoisir: (entree: EntreeNavigation) => void;
  onNouveauDossier: () => void;
}

export function BarreLaterale({ active, onChoisir, onNouveauDossier }: BarreLateraleProps): ReactElement {
  const { groupes, prochaineCloture, nbUrgents, chargement } = useAFaire();
  const lignes = (groupes ?? []).flatMap((g) => g.lignes);
  const total = lignes.length;
  const nonLus = lignes.filter((l) => l.nbNonLus > 0).length;
  const pret = !chargement;

  return (
    <aside className="bo-lateral">
      <button type="button" className="bo-nouveau" onClick={onNouveauDossier}>
        <Icone nom="plus" taille={18} trait={2.2} /> Nouveau dossier
      </button>
      <Navigation active={active} nbUrgents={nbUrgents} onChoisir={onChoisir} />
      {pret ? (
        <section className="bo-details" aria-label="Détails">
          <h2 className="bo-details-titre">Détails</h2>
          <div className="bo-detail">
            <div className="bo-detail-ligne">
              <Icone nom="alerte" taille={20} trait={1.8} /> Urgents
            </div>
            <progress className="bo-barre" max={Math.max(total, 1)} value={Math.min(nbUrgents, Math.max(total, 1))} aria-label="Part des dossiers urgents" />
            <p className="bo-detail-texte">
              {total === 0 ? 'Rien à traiter' : `${nbUrgents} sur ${total} à traiter`}
            </p>
          </div>
          <div className="bo-detail">
            <div className="bo-detail-ligne">
              <Icone nom="enveloppe" taille={20} trait={1.8} /> Réponses non lues
            </div>
            <progress className="bo-barre" max={Math.max(total, 1)} value={Math.min(nonLus, Math.max(total, 1))} aria-label="Part des dossiers avec une réponse non lue" />
            <p className="bo-detail-texte">{nonLus === 0 ? 'Aucune réponse en attente' : `${nonLus} dossier${nonLus > 1 ? 's' : ''}`}</p>
          </div>
          {prochaineCloture ? (
            <div className="bo-detail">
              <div className="bo-detail-ligne">
                <Icone nom="horloge" taille={20} trait={1.8} /> Prochaine clôture
              </div>
              <p className="bo-detail-texte">
                {prochaineCloture.nom}, {formaterJourMois(prochaineCloture.cloture)}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
