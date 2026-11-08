/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Champs spéciaux : `Montant` (piège du zéro), `DateChamp`, `ChoixTVA`.
 */
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { EnveloppeChamp, useChamp } from './Champ';
import type { ChoixTVAProps, DateChampProps, MontantProps } from './types';

/**
 * Lit un montant saisi : accepte la virgule et les espaces (y compris
 * insécables). Retourne `null` si vide, `undefined` si illisible. Jamais NaN.
 */
export function lireMontant(texte: string): number | null | undefined {
  // Le symbole € collé au montant (« 1 250 € ») est toléré : l'unité est déjà affichée à côté.
  const propre = texte.replace(/[\s  €]/g, '').replace(',', '.');
  if (propre === '') return null;
  if (!/^\d+(\.\d{0,2})?$/.test(propre)) return undefined;
  const n = Number(propre);
  return Number.isFinite(n) ? n : undefined;
}

/** Montant affiché dans le champ : virgule française, sans zéros inutiles. */
export function formaterMontant(valeur: number | null): string {
  return valeur === null ? '' : String(valeur).replace('.', ',');
}

/** Affichage avec séparateur de milliers (« 14 500 », « 1 250,5 »), lisible d'un coup d'œil. */
export function formaterMontantLisible(valeur: number | null): string {
  if (valeur === null) return '';
  const [entier, decimales] = String(valeur).split('.');
  const groupes = (entier ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  return decimales ? `${groupes},${decimales}` : groupes;
}

export function Montant({
  etiquette,
  valeur,
  onChange,
  requis,
  erreur,
  aide,
  lectureSeule,
  unite = '€',
}: MontantProps): ReactElement {
  const [texte, setTexte] = useState(formaterMontantLisible(valeur));
  const [illisible, setIllisible] = useState(false);

  // Resynchronise le texte quand la valeur change de l'extérieur (annuler, rechargement),
  // sans écraser une saisie en cours qui donne déjà cette valeur.
  useEffect(() => {
    // `?? null` : un texte illisible vaut « pas de valeur » (null), comme ce que nous avons
    // envoyé au parent. Sans cela, le retour de null effaçait la saisie en cours.
    if ((lireMontant(texte) ?? null) !== valeur) {
      setTexte(formaterMontantLisible(valeur));
      setIllisible(false);
    }
    // `texte` volontairement absent : on ne réagit qu'à la valeur reçue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valeur]);

  const message = erreur ?? (illisible ? 'Saisissez un montant, par exemple 1250,50' : undefined);
  const { ids, aria } = useChamp(message, requis);

  function surSaisie(brut: string): void {
    setTexte(brut);
    const lu = lireMontant(brut);
    setIllisible(lu === undefined);
    // Un texte illisible vide le montant : on n'écrit jamais NaN ni une valeur devinée.
    onChange(lu === undefined ? null : lu);
  }

  return (
    <EnveloppeChamp {...ids} etiquette={etiquette} requis={requis} erreur={message} aide={aide}>
      <div className="bo-montant">
        <input
          id={ids.idChamp}
          className="bo-saisie bo-montant-saisie"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={texte}
          readOnly={lectureSeule}
          onChange={(e) => surSaisie(e.target.value)}
          onBlur={() => {
            // Au départ du champ, un nombre lisible est remis en forme (milliers) ; un texte illisible reste.
            const lu = lireMontant(texte);
            if (typeof lu === 'number') setTexte(formaterMontantLisible(lu));
          }}
          {...aria}
        />
        <span className="bo-montant-unite">{unite}</span>
      </div>
    </EnveloppeChamp>
  );
}

/** « 2026-11-06 » devient « 06/11/2026 » (affichage en lecture seule). */
function dateLisible(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export function DateChamp({
  etiquette,
  valeur,
  onChange,
  requis,
  erreur,
  aide,
  lectureSeule,
}: DateChampProps): ReactElement {
  const { ids, aria } = useChamp(erreur, requis);
  return (
    <EnveloppeChamp {...ids} etiquette={etiquette} requis={requis} erreur={erreur} aide={aide}>
      {lectureSeule ? (
        <input id={ids.idChamp} className="bo-saisie" value={dateLisible(valeur)} readOnly />
      ) : (
        <input
          id={ids.idChamp}
          className="bo-saisie bo-date"
          type="date"
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          {...aria}
        />
      )}
    </EnveloppeChamp>
  );
}

const OPTIONS_TVA: { valeur: 0 | 20; libelle: string; infobulle: string }[] = [
  { valeur: 0, libelle: '0 % export', infobulle: 'TVA non applicable : transport international lié à une exportation.' },
  { valeur: 20, libelle: '20 %', infobulle: 'TVA française au taux normal de 20 %.' },
];

export function ChoixTVA({ valeur, onChange, erreur, lectureSeule }: ChoixTVAProps): ReactElement {
  const { ids } = useChamp(erreur, true);
  const nom = ids.idChamp;
  return (
    <fieldset
      className={`bo-champ bo-tva${erreur ? ' bo-champ--erreur' : ''}`}
      aria-describedby={erreur ? ids.idErreur : undefined}
    >
      <legend className="bo-etiquette">TVA</legend>
      <div className="bo-tva-options" role="radiogroup" aria-label="TVA">
        {OPTIONS_TVA.map((o) => (
          <label key={o.valeur} className="bo-tva-option" title={o.infobulle}>
            <input
              type="radio"
              name={nom}
              value={o.valeur}
              checked={valeur === o.valeur}
              disabled={lectureSeule && valeur !== o.valeur}
              onChange={() => {
                if (!lectureSeule) onChange(o.valeur);
              }}
            />
            <span>{o.libelle}</span>
          </label>
        ))}
      </div>
      {erreur ? (
        <p className="bo-erreur" id={ids.idErreur}>
          {erreur}
        </p>
      ) : null}
    </fieldset>
  );
}
