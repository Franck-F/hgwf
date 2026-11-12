/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Tableau de lignes modifiables d'une fiche (grille de prix, frais annexes,
 * délais) : chaque ligne est une rangée de champs texte avec son bouton
 * « Supprimer », et « Ajouter une ligne » en dessous.
 */
import type { ReactElement } from 'react';
import { Bouton } from '../../ui';
import { ligneVide, type Colonne, type Ligne } from './fichesEdition';

interface Props {
  titre: string;
  colonnes: Colonne[];
  lignes: Ligne[];
  onChange: (lignes: Ligne[]) => void;
  erreur?: string;
}

const STYLE_CHAMP = { flex: '1 1 140px', minWidth: 0 } as const;

export function LignesEditables({ titre, colonnes, lignes, onChange, erreur }: Props): ReactElement {
  const changer = (cle: string, colonne: string, valeur: string): void =>
    onChange(lignes.map((l) => (l._key === cle ? { ...l, [colonne]: valeur } : l)));

  return (
    <div className="bo-pile" role="group" aria-label={titre}>
      <span className="bo-etiquette">{titre}</span>
      {lignes.length === 0 ? <p className="bo-secondaire">Aucune ligne pour l’instant.</p> : null}
      {lignes.map((ligne, i) => (
        <div key={ligne._key} className="bo-rangee">
          {colonnes.map((c) => (
            <input
              key={c.cle}
              className="bo-saisie"
              style={STYLE_CHAMP}
              type="text"
              inputMode={c.nombre ? 'decimal' : undefined}
              value={ligne[c.cle] ?? ''}
              placeholder={c.libelle}
              aria-label={`${titre}, ligne ${i + 1} : ${c.libelle}`}
              onChange={(e) => changer(ligne._key, c.cle, e.target.value)}
            />
          ))}
          <Bouton
            variante="discret"
            taille="s"
            aria-label={`Supprimer la ligne ${i + 1} de ${titre}`}
            onClick={() => onChange(lignes.filter((l) => l._key !== ligne._key))}
          >
            Supprimer
          </Bouton>
        </div>
      ))}
      {erreur ? (
        <p className="bo-erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      <div className="bo-rangee">
        <Bouton variante="secondaire" taille="s" onClick={() => onChange([...lignes, ligneVide(colonnes)])}>
          Ajouter une ligne
        </Bouton>
      </div>
    </div>
  );
}
