/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Rangée des sous-dossiers de la page Dossier : une carte en forme d'onglet de
 * dossier par sujet, avec ce qu'elle contient en une ligne. Cliquer une carte
 * l'ouvre (une seule à la fois) ; flèches gauche/droite, Début et Fin
 * passent d'une carte à l'autre au clavier (onglets ARIA).
 */
import { useRef } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { Icone } from '../../ui';
import type { IdSousDossier, SousDossier } from './rangement';

export const idOnglet = (id: IdSousDossier): string => `bo-onglet-${id}`;
export const idPanneau = (id: IdSousDossier): string => `bo-panneau-${id}`;

export interface SousDossiersProps {
  liste: readonly SousDossier[];
  choisi: IdSousDossier;
  onChoisir: (id: IdSousDossier) => void;
}

export function SousDossiers({ liste, choisi, onChoisir }: SousDossiersProps): ReactElement {
  const boutons = useRef<(HTMLButtonElement | null)[]>([]);

  function clavier(e: KeyboardEvent<HTMLButtonElement>, i: number): void {
    const n = liste.length;
    const cible =
      e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    const s = liste[cible];
    if (!s) return;
    e.preventDefault();
    onChoisir(s.id);
    boutons.current[cible]?.focus();
  }

  return (
    <section className="bo-pile" aria-labelledby="bo-sous-dossiers-titre">
      <h2 className="bo-acces-titre" id="bo-sous-dossiers-titre">
        Dans ce dossier
      </h2>
      <div className="bo-sous-dossiers" role="tablist" aria-labelledby="bo-sous-dossiers-titre">
        {liste.map((s, i) => {
          const actif = s.id === choisi;
          return (
            <button
              key={s.id}
              ref={(el) => {
                boutons.current[i] = el;
              }}
              type="button"
              role="tab"
              id={idOnglet(s.id)}
              aria-selected={actif}
              aria-controls={idPanneau(s.id)}
              tabIndex={actif ? 0 : -1}
              className={`bo-sous-dossier${actif ? ' bo-sous-dossier--actif' : ''}`}
              onClick={() => onChoisir(s.id)}
              onKeyDown={(e) => clavier(e, i)}
            >
              <span className="bo-sous-dossier-haut">
                <Icone nom={s.icone} taille={20} />
                {s.signal ? <span className="bo-sous-dossier-signal">{s.signal}</span> : null}
              </span>
              <span className="bo-sous-dossier-nom">{s.titre}</span>
              <span className="bo-sous-dossier-detail">{s.detail}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
