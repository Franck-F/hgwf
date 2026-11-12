/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Fenêtre modale unique du back-office.
 *
 * - `role="dialog"`, piège de focus (Tab/Maj+Tab), Échap, focus rendu à
 *   l'élément qui l'avait avant l'ouverture.
 * - Rendue DANS `.bo-racine` (portail vers l'élément du contexte, jamais
 *   `document.body`) pour garder les variables `--bo-*`.
 * - Le défilement de `.bo-racine` est verrouillé ; comme le voile est en
 *   `position: absolute` dans un conteneur qui défile, on le cale sur la zone
 *   visible (valeurs dynamiques lues sur la racine) au lieu de `fixed`.
 * - Plusieurs fenêtres empilées (Confirmation sur une fenêtre) : seule la
 *   dernière ouverte réagit à Échap et au Tab.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useRacine } from '../app/Contexte';
import { Icone } from './icones';
import type { ModaleProps } from './types';

const FOCALISABLES =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Pile des fenêtres ouvertes (la dernière est celle qui a la main). */
const pile: symbol[] = [];

export function Modale({ titre, onFermer, empecherFermeture, pied, large, children }: ModaleProps): ReactElement {
  const racine = useRacine();
  const idTitre = useId();
  const voile = useRef<HTMLDivElement>(null);
  const dialogue = useRef<HTMLDivElement>(null);
  const corps = useRef<HTMLDivElement>(null);
  const piedRef = useRef<HTMLElement>(null);
  const fermeture = useRef(onFermer);
  fermeture.current = onFermer;
  const [zone, setZone] = useState<CSSProperties>({});

  // Cale le voile sur la zone visible de la racine et verrouille son défilement.
  useLayoutEffect(() => {
    const ancienDefilement = racine.style.overflow;
    const caler = (): void =>
      setZone({ top: racine.scrollTop, height: racine.clientHeight, width: racine.clientWidth });
    caler();
    racine.style.overflow = 'hidden';
    window.addEventListener('resize', caler);
    return () => {
      racine.style.overflow = ancienDefilement;
      window.removeEventListener('resize', caler);
    };
  }, [racine]);

  // Focus initial, retour du focus, Échap et piège de Tab (une seule fois par fenêtre).
  useEffect(() => {
    const moi = Symbol('modale');
    pile.push(moi);
    const avant = document.activeElement as HTMLElement | null;
    const cible =
      corps.current?.querySelector<HTMLElement>(FOCALISABLES) ??
      piedRef.current?.querySelector<HTMLElement>(FOCALISABLES) ??
      dialogue.current;
    cible?.focus();

    const surTouche = (e: globalThis.KeyboardEvent): void => {
      if (pile[pile.length - 1] !== moi) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        fermeture.current();
      } else if (e.key === 'Tab' && dialogue.current) {
        const liste = Array.from(dialogue.current.querySelectorAll<HTMLElement>(FOCALISABLES));
        if (liste.length === 0) return;
        const premier = liste[0] as HTMLElement;
        const dernier = liste[liste.length - 1] as HTMLElement;
        const actif = document.activeElement;
        if (!dialogue.current.contains(actif)) {
          e.preventDefault();
          premier.focus();
        } else if (e.shiftKey && actif === premier) {
          e.preventDefault();
          dernier.focus();
        } else if (!e.shiftKey && actif === dernier) {
          e.preventDefault();
          premier.focus();
        }
      }
    };
    // En capture : le panneau arrête la remontée des touches (surTouchePanneau), donc un
    // écouteur en phase de bulle sur le document ne verrait jamais Échap ni Tab
    // tapés dans la fenêtre (piège de focus et Échap seraient morts dans un vrai navigateur).
    document.addEventListener('keydown', surTouche, true);
    return () => {
      document.removeEventListener('keydown', surTouche, true);
      pile.splice(pile.indexOf(moi), 1);
      if (avant && document.contains(avant)) avant.focus();
    };
  }, []);

  // Clic sur le voile (et non sur la fenêtre) : ferme, sauf s'il y a une saisie.
  function surClicVoile(e: MouseEvent<HTMLDivElement>): void {
    if (e.target === voile.current && !empecherFermeture) onFermer();
  }

  function surTouchePanneau(e: KeyboardEvent<HTMLDivElement>): void {
    // Les touches saisies dans la fenêtre ne remontent pas jusqu'au Studio.
    e.stopPropagation();
  }

  const contenu = (
    <div className="bo-voile" ref={voile} style={zone} onMouseDown={surClicVoile}>
      <div
        className={`bo-modale${large ? ' bo-modale--large' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        tabIndex={-1}
        ref={dialogue}
        onKeyDown={surTouchePanneau}
      >
        <header className="bo-modale-entete">
          <h2 className="bo-modale-titre" id={idTitre}>
            {titre}
          </h2>
          <button type="button" className="bo-modale-fermer" aria-label="Fermer la fenêtre" onClick={onFermer}>
            <Icone nom="croix" />
          </button>
        </header>
        <div className="bo-modale-corps" ref={corps}>
          {children}
        </div>
        {pied ? <footer className="bo-modale-pied" ref={piedRef}>{pied}</footer> : null}
      </div>
    </div>
  );

  return createPortal(contenu, racine);
}
