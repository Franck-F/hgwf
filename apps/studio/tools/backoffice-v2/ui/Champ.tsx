/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Champs de formulaire de base : `Champ` (enveloppe étiquette + erreur + aide),
 * `Saisie`, `Liste`, `ZoneTexte`. Les champs spéciaux (`Montant`, `DateChamp`,
 * `ChoixTVA`) sont dans `ChampsSpeciaux.tsx` et réutilisent `EnveloppeChamp`.
 *
 * Règles communes : étiquette liée au champ, mot « requis » écrit (pas
 * d'astérisque), erreur en ligne reliée par `aria-describedby`, aide
 * ponctuelle sous forme d'infobulle accessible (jamais une phrase permanente).
 */
import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Icone } from './icones';
import type { ChampProps, ListeProps, SaisieProps, ZoneTexteProps } from './types';

interface EnveloppeProps {
  /** Id du contrôle étiqueté (absent pour un groupe). */
  idChamp?: string;
  idEtiquette: string;
  etiquette: string;
  requis?: boolean;
  erreur?: string;
  aide?: string;
  idErreur: string;
  idAide: string;
  children?: ReactNode;
}

/** Aide : bouton « ? » focalisable, texte révélé au survol/focus et lu par `aria-describedby`. */
function Aide({ id, texte }: { id: string; texte: string }): ReactElement {
  return (
    <span className="bo-aide">
      <button type="button" className="bo-aide-bouton" aria-label="Afficher l'aide" aria-describedby={id}>
        ?
      </button>
      <span className="bo-infobulle" role="tooltip" id={id}>
        {texte}
      </span>
    </span>
  );
}

/** Gabarit commun : étiquette (+ « requis » + aide), contrôle, erreur. */
export function EnveloppeChamp({
  idChamp,
  idEtiquette,
  etiquette,
  requis,
  erreur,
  aide,
  idErreur,
  idAide,
  children,
}: EnveloppeProps): ReactElement {
  return (
    <div className={`bo-champ${erreur ? ' bo-champ--erreur' : ''}`}>
      <div className="bo-champ-entete">
        {idChamp ? (
          <label className="bo-etiquette" id={idEtiquette} htmlFor={idChamp}>
            {etiquette}
          </label>
        ) : (
          <span className="bo-etiquette" id={idEtiquette}>
            {etiquette}
          </span>
        )}
        {requis ? <span className="bo-requis">requis</span> : null}
        {aide ? <Aide id={idAide} texte={aide} /> : null}
      </div>
      {children}
      {erreur ? (
        <p className="bo-erreur" id={idErreur}>
          <Icone nom="alerte" taille={14} />
          {erreur}
        </p>
      ) : null}
    </div>
  );
}

/** Identifiants dérivés d'un champ, et attributs ARIA communs à son contrôle. */
export function useChamp(erreur?: string, requis?: boolean) {
  const base = useId();
  const ids = { idChamp: `${base}-c`, idEtiquette: `${base}-e`, idErreur: `${base}-r`, idAide: `${base}-a` };
  const aria = {
    'aria-invalid': erreur ? true : undefined,
    'aria-required': requis ? true : undefined,
    'aria-describedby': erreur ? ids.idErreur : undefined,
  };
  return { ids, aria };
}

/** Enveloppe générique pour un contrôle fourni par l'appelant (groupe étiqueté). */
export function Champ({ etiquette, requis, erreur, aide, children }: ChampProps): ReactElement {
  const { ids } = useChamp(erreur, requis);
  return (
    <div role="group" aria-labelledby={ids.idEtiquette}>
      <EnveloppeChamp {...ids} idChamp={undefined} etiquette={etiquette} requis={requis} erreur={erreur} aide={aide}>
        {children}
      </EnveloppeChamp>
    </div>
  );
}

export function Saisie({
  etiquette,
  valeur,
  onChange,
  requis,
  erreur,
  aide,
  lectureSeule,
  placeholder,
  type = 'text',
}: SaisieProps): ReactElement {
  const { ids, aria } = useChamp(erreur, requis);
  return (
    <EnveloppeChamp {...ids} etiquette={etiquette} requis={requis} erreur={erreur} aide={aide}>
      <input
        id={ids.idChamp}
        className="bo-saisie"
        type={type}
        value={valeur}
        readOnly={lectureSeule}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        {...aria}
      />
    </EnveloppeChamp>
  );
}

export function Liste({
  etiquette,
  valeur,
  options,
  onChange,
  requis,
  erreur,
  aide,
  lectureSeule,
  vide,
}: ListeProps): ReactElement {
  const { ids, aria } = useChamp(erreur, requis);
  const libelleCourant = options.find((o) => o.valeur === valeur)?.libelle ?? '';
  return (
    <EnveloppeChamp {...ids} etiquette={etiquette} requis={requis} erreur={erreur} aide={aide}>
      {lectureSeule ? (
        <input id={ids.idChamp} className="bo-saisie" value={libelleCourant} readOnly />
      ) : (
        <select
          id={ids.idChamp}
          className="bo-saisie bo-liste"
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          {...aria}
        >
          {vide !== undefined ? <option value="">{vide}</option> : null}
          {options.map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.libelle}
            </option>
          ))}
        </select>
      )}
    </EnveloppeChamp>
  );
}

export function ZoneTexte({
  etiquette,
  valeur,
  onChange,
  requis,
  erreur,
  aide,
  lectureSeule,
  lignes = 4,
}: ZoneTexteProps): ReactElement {
  const { ids, aria } = useChamp(erreur, requis);
  return (
    <EnveloppeChamp {...ids} etiquette={etiquette} requis={requis} erreur={erreur} aide={aide}>
      <textarea
        id={ids.idChamp}
        className="bo-saisie bo-zone"
        rows={lignes}
        value={valeur}
        readOnly={lectureSeule}
        onChange={(e) => onChange(e.target.value)}
        {...aria}
      />
    </EnveloppeChamp>
  );
}
