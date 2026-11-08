/** @jsxRuntime automatic @jsxImportSource react */
/**
 * ETA d'une expédition : date saisie en JJ/MM/AAAA ou « À planifier » (4.3). Le
 * format stocké ne change pas (« JJ/MM/AAAA » ou « À PLANIFIER », comme à la
 * conversion). Un champ texte plutôt que le sélecteur natif, dont l'affichage
 * suit la langue du navigateur (« 11/10/2026 » ambigu pour une équipe française).
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Bouton, Saisie } from '../../../ui';

export const ETA_A_PLANIFIER = 'À PLANIFIER';

const DATE_STOCKEE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** « 14/11/2026 » devient « 2026-11-14 » pour le sélecteur ; vide si illisible. */
export function etaVersIso(eta: string): string {
  const m = DATE_STOCKEE.exec(eta.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

/** « 2026-11-14 » devient « 14/11/2026 » (format stocké). */
export function isoVersEta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ETA_A_PLANIFIER;
}

export const estAPlanifier = (eta: string): boolean => eta.trim() === '' || /planifier/i.test(eta);

export interface ChampEtaProps {
  /** Valeur stockée (enregistrée + brouillon). */
  valeur: string;
  onChange: (valeur: string) => void;
  lectureSeule?: boolean;
  etiquette?: string;
}

/** Vrai pour un « JJ/MM/AAAA » qui existe vraiment (pas de 31/02). */
export function dateEtaValide(texte: string): boolean {
  const m = DATE_STOCKEE.exec(texte.trim());
  if (!m) return false;
  const [j, mo, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(a, mo - 1, j);
  return d.getFullYear() === a && d.getMonth() === mo - 1 && d.getDate() === j;
}

/** Texte montré dans le champ : vide quand l'ETA est « à planifier ». */
const texteDe = (valeur: string): string => (estAPlanifier(valeur) ? '' : valeur);

export function ChampEta({ valeur, onChange, lectureSeule, etiquette = 'ETA (arrivée estimée)' }: ChampEtaProps): ReactElement {
  const planifier = estAPlanifier(valeur);
  const [texte, setTexte] = useState(texteDe(valeur));
  const [quitte, setQuitte] = useState(false);
  // Dernière valeur envoyée au parent : sert à ne resynchroniser le texte que sur un changement extérieur.
  const emise = useRef(valeur);

  useEffect(() => {
    if (valeur !== emise.current) {
      emise.current = valeur;
      setTexte(texteDe(valeur));
      setQuitte(false);
    }
  }, [valeur]);

  function emettre(v: string): void {
    emise.current = v;
    onChange(v);
  }

  function surSaisie(brut: string): void {
    // Huit chiffres collés (« 14112026 ») sont remis en forme.
    const chiffres = /^\d{8}$/.test(brut.trim()) ? `${brut.slice(0, 2)}/${brut.slice(2, 4)}/${brut.slice(4)}` : brut;
    setTexte(chiffres);
    if (chiffres.trim() === '') emettre(ETA_A_PLANIFIER);
    else if (dateEtaValide(chiffres)) emettre(chiffres.trim());
  }

  // Un ancien texte libre (« mi-novembre ») reste lisible et n'est écrasé que par une vraie date.
  const illisible = quitte && texte.trim() !== '' && !dateEtaValide(texte) && texte !== valeur;
  return (
    <div className="bo-pile">
      <Saisie
        etiquette={etiquette}
        valeur={texte}
        onChange={surSaisie}
        placeholder="JJ/MM/AAAA"
        lectureSeule={lectureSeule}
        erreur={illisible ? 'Saisissez la date sous la forme 14/11/2026.' : undefined}
      />
      <div className="bo-rangee" onBlur={() => setQuitte(true)}>
        {planifier ? (
          <span className="bo-secondaire">À planifier : la date n’est pas encore connue.</span>
        ) : !lectureSeule ? (
          <Bouton
            variante="secondaire"
            taille="s"
            onClick={() => {
              setTexte('');
              emettre(ETA_A_PLANIFIER);
            }}
          >
            À planifier
          </Bouton>
        ) : null}
      </div>
    </div>
  );
}
