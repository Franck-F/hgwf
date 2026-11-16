/** @jsxRuntime automatic @jsxImportSource react */
/**
 * « Accès rapide » de l'accueil : une carte en forme d'onglet de dossier pour
 * « Tout » puis une par groupe (nombre de dossiers, dont en retard) et
 * « En attente ». Cliquer une carte filtre le tableau ; cliquer la carte
 * « Tout » (ou la carte déjà choisie) affiche tout. Aucune écriture.
 * La carte choisie est pleine (bleu), les autres grises, comme la maquette.
 */
import type { ReactElement } from 'react';
import type { GroupeAFaire } from '../../domaine/types';

export const ID_TOUT = 'tout';
export const ID_ATTENTE = 'attente';

export interface CarteAcces {
  id: string;
  titre: string;
  nombre: number;
  enRetard: number;
}

/** Une carte « Tout », une par groupe, puis « En attente » ; les lignes grisées (déjà parties) ne comptent pas. */
export function cartesAcces(
  groupes: readonly GroupeAFaire[],
  nbAttente: number,
  fantomes: ReadonlySet<string>,
): CarteAcces[] {
  const cartes: CarteAcces[] = groupes.map((g) => {
    const lignes = g.lignes.filter((l) => !fantomes.has(l.dossierId));
    return { id: g.id, titre: g.titre, nombre: lignes.length, enRetard: lignes.filter((l) => l.enRetard).length };
  });
  const tout: CarteAcces = {
    id: ID_TOUT,
    titre: 'Tous les dossiers à traiter',
    nombre: cartes.reduce((n, c) => n + c.nombre, 0),
    enRetard: cartes.reduce((n, c) => n + c.enRetard, 0),
  };
  const suite = nbAttente > 0 ? [{ id: ID_ATTENTE, titre: 'En attente', nombre: nbAttente, enRetard: 0 }] : [];
  return [tout, ...cartes, ...suite];
}

function pluriel(n: number): string {
  return `${n} dossier${n > 1 ? 's' : ''}`;
}

/**
 * Le surtitre dit l'état de l'étape d'un coup d'œil : « Urgent » s'il y a du
 * retard, « Dans les délais » sinon (au lieu d'un « À traiter » répété sur
 * chaque carte, qui n'apprenait rien).
 */
export function etiquette(carte: CarteAcces): string {
  if (carte.id === ID_ATTENTE) return 'Rien à faire';
  if (carte.id === ID_TOUT) return 'Vue d’ensemble';
  return carte.enRetard > 0 ? 'Urgent' : 'Dans les délais';
}

export interface AccesRapideProps {
  cartes: CarteAcces[];
  choisi: string;
  onChoisir: (id: string) => void;
}

export function AccesRapide({ cartes, choisi, onChoisir }: AccesRapideProps): ReactElement | null {
  if (cartes.length <= 1) return null;
  return (
    <section className="bo-pile" aria-labelledby="bo-acces-titre">
      <h2 className="bo-acces-titre" id="bo-acces-titre">
        Par étape
      </h2>
      <div className="bo-acces-liste">
        {cartes.map((c) => {
          const actif = c.id === choisi;
          const urgent = c.id !== ID_TOUT && c.id !== ID_ATTENTE && c.enRetard > 0;
          return (
            <button
              key={c.id}
              type="button"
              className={`bo-acces${actif ? ' bo-acces--plein' : ''}${urgent ? ' bo-acces--urgent' : ''}`}
              aria-pressed={actif}
              aria-label={`${c.titre} : ${pluriel(c.nombre)}`}
              onClick={() => onChoisir(actif ? ID_TOUT : c.id)}
            >
              <span className="bo-acces-etiquette">{etiquette(c)}</span>
              <span className="bo-acces-nombre">{c.nombre}</span>
              <span className="bo-acces-nom">{c.titre}</span>
              <span className="bo-acces-retard">
                {c.id === ID_ATTENTE ? 'avec la raison de l’attente' : c.enRetard > 0 ? `dont ${c.enRetard} en retard` : 'aucun en retard'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
