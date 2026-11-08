/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Recherche globale (4.8) : un seul champ en haut de toutes les pages, qui
 * trouve dossiers et clients (nom, référence, e-mail, téléphone, destination,
 * n° de conteneur : la logique est dans `useRecherche`).
 *
 * Touche « / » : met le focus dans le champ, uniquement si le focus n'est dans
 * aucun champ de saisie, sans touche modificatrice, et si l'événement a lieu
 * dans `.bo-racine` (jamais sur le reste du Studio). Pas de Ctrl+K : il
 * pourrait entrer en conflit avec la recherche du Studio.
 */
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { useRecherche } from '../data/useRecherche';
import { useRacine, useRoute } from './Contexte';
import { cheminDe } from './routes';

/** Nombre maximal de résultats affichés par groupe. */
export const MAX_PAR_GROUPE = 5;

const CHAMPS_DE_SAISIE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

/** Vrai si la touche « / » doit ouvrir la recherche (testé seul). */
export function slashDoitOuvrir(e: Pick<globalThis.KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'defaultPrevented' | 'target'>, racine: HTMLElement): boolean {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return false;
  const cible = e.target instanceof Element ? e.target : null;
  if (cible?.closest(CHAMPS_DE_SAISIE)) return false;
  // Une fenêtre ouverte garde le focus : on ne cherche pas derrière elle.
  return !racine.querySelector('[role=dialog]');
}

export function RechercheGlobale(): ReactElement {
  const racine = useRacine();
  const { naviguer } = useRoute();
  const [texte, setTexte] = useState('');
  const [ouvert, setOuvert] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const resultats = useRecherche(texte);

  // « / » : focus dans la recherche.
  useEffect(() => {
    const surTouche = (e: globalThis.KeyboardEvent): void => {
      if (!slashDoitOuvrir(e, racine)) return;
      e.preventDefault();
      champ.current?.focus();
      champ.current?.select();
    };
    racine.addEventListener('keydown', surTouche);
    return () => racine.removeEventListener('keydown', surTouche);
  }, [racine]);

  // Un clic en dehors referme la liste.
  useEffect(() => {
    if (!ouvert) return undefined;
    const surClic = (e: MouseEvent): void => {
      if (zone.current && e.target instanceof Node && !zone.current.contains(e.target)) setOuvert(false);
    };
    document.addEventListener('mousedown', surClic);
    return () => document.removeEventListener('mousedown', surClic);
  }, [ouvert]);

  const saisie = texte.trim();
  const dossiers = resultats.dossiers.slice(0, MAX_PAR_GROUPE);
  const clients = resultats.clients.slice(0, MAX_PAR_GROUPE);
  const vide = dossiers.length === 0 && clients.length === 0;

  function ouvrir(chemin: string): void {
    setTexte('');
    setOuvert(false);
    champ.current?.blur();
    naviguer(chemin);
  }

  function premierChemin(): string | null {
    const d = dossiers[0];
    if (d) return cheminDe({ nom: 'dossier', id: d.dossierId });
    const c = clients[0];
    return c ? cheminDe({ nom: 'client', id: c.clientId }) : null;
  }

  function boutonsResultats(): HTMLButtonElement[] {
    return Array.from(zone.current?.querySelectorAll<HTMLButtonElement>('.bo-resultats button') ?? []);
  }

  function surToucheChamp(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      const chemin = premierChemin();
      if (chemin) {
        e.preventDefault();
        ouvrir(chemin);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      boutonsResultats()[0]?.focus();
    } else if (e.key === 'Escape') {
      // Premier appui : referme la liste. Second appui : vide le champ.
      if (ouvert && saisie !== '') setOuvert(false);
      else setTexte('');
    }
  }

  function surToucheResultat(e: KeyboardEvent<HTMLDivElement>): void {
    const liste = boutonsResultats();
    const position = liste.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      liste[Math.min(position + 1, liste.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (position <= 0) champ.current?.focus();
      else liste[position - 1]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOuvert(false);
      champ.current?.focus();
    }
  }

  return (
    <div className="bo-recherche" ref={zone}>
      <input
        ref={champ}
        className="bo-saisie"
        type="search"
        autoComplete="off"
        aria-label="Rechercher un dossier ou un client"
        placeholder="Rechercher un dossier ou un client"
        value={texte}
        onChange={(e) => {
          setTexte(e.target.value);
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        onKeyDown={surToucheChamp}
      />
      {ouvert && saisie !== '' ? (
        <div className="bo-resultats" aria-label="Résultats de la recherche" onKeyDown={surToucheResultat}>
          {vide ? <p className="bo-secondaire" role="status">{`Aucun résultat pour « ${saisie} »`}</p> : null}
          {dossiers.length > 0 ? (
            <>
              <p className="bo-secondaire bo-fort">Dossiers</p>
              {dossiers.map((d) => (
                <button
                  key={d.dossierId}
                  type="button"
                  className="bo-menu-item"
                  onClick={() => ouvrir(cheminDe({ nom: 'dossier', id: d.dossierId }))}
                >
                  <span className="bo-fort">{d.client}</span> <span className="bo-secondaire">{d.reference}</span>
                  <br />
                  <span className="bo-secondaire">{d.detail}</span>
                </button>
              ))}
            </>
          ) : null}
          {clients.length > 0 ? (
            <>
              <p className="bo-secondaire bo-fort">Clients</p>
              {clients.map((c) => (
                <button
                  key={c.clientId}
                  type="button"
                  className="bo-menu-item"
                  onClick={() => ouvrir(cheminDe({ nom: 'client', id: c.clientId }))}
                >
                  <span className="bo-fort">{c.nom}</span>
                  <br />
                  <span className="bo-secondaire">{c.detail}</span>
                </button>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
