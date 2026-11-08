/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Fiches services (4.7) : liste en lecture seule (service, grille renseignée ou
 * non, nombre de prix manquants). Pas d'éditeur dans V2 : « Modifier dans le
 * Studio » ouvre la liste des fiches du Studio dans un nouvel onglet, ce qui
 * laisse cet outil (et ses saisies) ouvert.
 */
import type { ReactElement } from 'react';
import { useOutils } from '../../data/useOutils';
import { prixManquants } from '../../domaine/fiches';
import type { Fiche } from '../../domaine/types';
import { Badge, EtatVide, Icone, Squelette } from '../../ui';
import { BandeauErreur } from './BandeauErreur';

/** Chemin du Studio (espace de travail « operations ») vers la liste des fiches. */
export const LIEN_FICHES_STUDIO = '/operations/structure/fichesServices';

function etatGrille(f: Fiche): { ton: 'ok' | 'attention' | 'neutre'; texte: string } {
  const lignes = (f.grille ?? []).filter((l) => l.designation);
  if (lignes.length === 0) return { ton: 'neutre', texte: 'Pas de grille de prix' };
  const manquants = prixManquants(f);
  if (manquants === 0) return { ton: 'ok', texte: 'Grille renseignée' };
  return { ton: 'attention', texte: `${manquants} ${manquants > 1 ? 'prix manquants' : 'prix manquant'}` };
}

export function FichesServices(): ReactElement {
  const { fiches, chargement, erreur, recharger } = useOutils();
  const triees = [...fiches].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999));

  return (
    <div className="bo-pile">
      <div className="bo-rangee">
        <h2 className="bo-groupe-titre">Fiches services</h2>
        <span className="bo-espace">
          <a className="bo-bouton bo-bouton--primaire" href={LIEN_FICHES_STUDIO} target="_blank" rel="noopener noreferrer">
            Modifier dans le Studio <Icone nom="lienExterne" />
          </a>
        </span>
      </div>

      {erreur ? (
        <BandeauErreur message="Impossible de charger les fiches services" onReessayer={() => void recharger()} />
      ) : chargement ? (
        <Squelette lignes={3} />
      ) : triees.length === 0 ? (
        <EtatVide titre="Aucune fiche service" phrase="Les fiches se créent dans le Studio." />
      ) : (
        <ul className="bo-pile" aria-label="Fiches services">
          {triees.map((f) => {
            const etat = etatGrille(f);
            return (
              <li key={f._id} className="bo-ligne">
                <span className="bo-fort">{f.titre || 'Fiche sans titre'}</span>
                {f.actif === false ? <Badge ton="neutre">Désactivée</Badge> : null}
                <span className="bo-espace">
                  <Badge ton={etat.ton} icone={etat.ton === 'ok' ? 'coche' : etat.ton === 'attention' ? 'alerte' : undefined}>
                    {etat.texte}
                  </Badge>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
