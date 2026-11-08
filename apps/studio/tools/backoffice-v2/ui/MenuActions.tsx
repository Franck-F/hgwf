/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Menu « Autres actions » : bouton « … », liste à clavier (flèches, Début, Fin,
 * Échap), fermeture au clic extérieur. Regroupe tout le secondaire.
 */
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { Icone } from './icones';
import type { MenuActionsProps } from './types';

export function MenuActions({ elements, libelle = 'Autres actions' }: MenuActionsProps): ReactElement {
  const [ouvert, setOuvert] = useState(false);
  const racine = useRef<HTMLDivElement>(null);
  const declencheur = useRef<HTMLButtonElement>(null);
  const idMenu = useId();

  const items = (): HTMLButtonElement[] =>
    Array.from(racine.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? []);

  function fermer(rendreLeFocus: boolean): void {
    setOuvert(false);
    if (rendreLeFocus) declencheur.current?.focus();
  }

  // À l'ouverture, le focus va au premier choix possible.
  useEffect(() => {
    if (ouvert) items()[0]?.focus();
  }, [ouvert]);

  // Clic ou focus en dehors du menu : il se referme sans voler le focus.
  useEffect(() => {
    if (!ouvert) return undefined;
    const dehors = (e: Event): void => {
      if (racine.current && !racine.current.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener('mousedown', dehors);
    document.addEventListener('focusin', dehors);
    return () => {
      document.removeEventListener('mousedown', dehors);
      document.removeEventListener('focusin', dehors);
    };
  }, [ouvert]);

  function surTouche(e: KeyboardEvent<HTMLDivElement>): void {
    if (!ouvert) return;
    const liste = items();
    const i = liste.indexOf(document.activeElement as HTMLButtonElement);
    const aller = (n: number): void => {
      e.preventDefault();
      liste[(n + liste.length) % liste.length]?.focus();
    };
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      fermer(true);
    } else if (e.key === 'ArrowDown') aller(i + 1);
    else if (e.key === 'ArrowUp') aller(i < 0 ? -1 : i - 1);
    else if (e.key === 'Home') aller(0);
    else if (e.key === 'End') aller(-1);
    else if (e.key === 'Tab') setOuvert(false);
  }

  return (
    <div className="bo-menu" ref={racine} onKeyDown={surTouche}>
      <button
        type="button"
        ref={declencheur}
        className="bo-bouton bo-bouton--secondaire bo-bouton--m bo-menu-declencheur"
        aria-label={libelle}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-controls={ouvert ? idMenu : undefined}
        onClick={() => setOuvert((o) => !o)}
      >
        <Icone nom="menu" />
      </button>
      {ouvert ? (
        <div className="bo-menu-liste" role="menu" id={idMenu} aria-label={libelle}>
          {elements.map((el) => (
            <button
              key={el.id}
              type="button"
              role="menuitem"
              className={`bo-menu-item${el.danger ? ' bo-menu-item--danger' : ''}`}
              disabled={el.desactive}
              onClick={() => {
                fermer(true);
                el.onChoisir();
              }}
            >
              {el.libelle}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
