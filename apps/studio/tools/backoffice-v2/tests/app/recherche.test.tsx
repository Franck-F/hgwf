/** @jsxRuntime automatic @jsxImportSource react */
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRoute } from '../../app/Contexte';
import { Fournisseurs } from '../../app/Fournisseurs';
import { RechercheGlobale, slashDoitOuvrir } from '../../app/RechercheGlobale';
import { creerRouteurMemoire } from '../../app/routeur';
import type { RouteurMemoire } from '../../app/routeur';
import type { ResultatRecherche } from '../../domaine/types';

const etat = vi.hoisted(() => ({
  resultat: { dossiers: [], clients: [] } as ResultatRecherche,
  textes: [] as string[],
}));
vi.mock('../../data/useRecherche', () => ({
  useRecherche: (texte: string) => {
    etat.textes.push(texte);
    return texte.trim() === '' ? { dossiers: [], clients: [] } : etat.resultat;
  },
}));

function Page() {
  const { chemin } = useRoute();
  return (
    <>
      <RechercheGlobale />
      <button type="button">Un bouton de la page</button>
      <p data-testid="chemin">{chemin}</p>
    </>
  );
}

function monter(): RouteurMemoire {
  const routeur = creerRouteurMemoire('/afaire');
  render(
    <Fournisseurs routeur={routeur}>
      <Page />
    </Fournisseurs>,
  );
  return routeur;
}

const champ = (): HTMLInputElement => screen.getByRole('searchbox') as HTMLInputElement;
const taper = (texte: string): void => {
  fireEvent.change(champ(), { target: { value: texte } });
};

beforeEach(() => {
  etat.resultat = {
    dossiers: [
      { dossierId: 'dem-1', client: 'Dupont', reference: 'DEV-2610-014', detail: 'Groupage maritime · Dakar' },
      { dossierId: 'dem-2', client: 'Martin', reference: 'DEV-2610-012', detail: 'Conteneur · Abidjan' },
    ],
    clients: [{ clientId: 'client-dupont', nom: 'Dupont', detail: 'dupont@exemple.fr · 06 12 34 56 78' }],
  };
});
afterEach(() => cleanup());

describe('résultats', () => {
  it('ne montre rien tant que le champ est vide', () => {
    monter();
    expect(document.querySelector('.bo-resultats')).toBeNull();
  });

  it('groupe les résultats en Dossiers et Clients', () => {
    monter();
    taper('dup');
    const liste = document.querySelector('.bo-resultats') as HTMLElement;
    expect(liste.textContent).toContain('Dossiers');
    expect(liste.textContent).toContain('Clients');
    expect(liste.textContent).toContain('DEV-2610-014');
    expect(liste.textContent).toContain('dupont@exemple.fr');
  });

  it('cinq résultats au plus par groupe', () => {
    etat.resultat = {
      dossiers: Array.from({ length: 9 }, (_, i) => ({
        dossierId: `d${i}`,
        client: `Client ${i}`,
        reference: `REF-${i}`,
        detail: '',
      })),
      clients: [],
    };
    monter();
    taper('c');
    expect(document.querySelectorAll('.bo-resultats button')).toHaveLength(5);
  });

  it('dit clairement quand il n’y a aucun résultat', () => {
    etat.resultat = { dossiers: [], clients: [] };
    monter();
    taper('zzz');
    expect(screen.getByText('Aucun résultat pour « zzz »')).toBeTruthy();
  });

  it('un clic ouvre le dossier, vide le champ et ferme la liste', () => {
    monter();
    taper('dup');
    fireEvent.click(screen.getByText('DEV-2610-012').closest('button') as HTMLButtonElement);
    expect(screen.getByTestId('chemin').textContent).toBe('/dossier/dem-2');
    expect(champ().value).toBe('');
    expect(document.querySelector('.bo-resultats')).toBeNull();
  });

  it('un clic sur un client ouvre sa fiche', () => {
    monter();
    taper('dup');
    fireEvent.click(screen.getByText('dupont@exemple.fr · 06 12 34 56 78').closest('button') as HTMLButtonElement);
    expect(screen.getByTestId('chemin').textContent).toBe('/client/client-dupont');
  });

  it('Entrée ouvre le premier résultat (un dossier avant un client)', () => {
    monter();
    taper('dup');
    fireEvent.keyDown(champ(), { key: 'Enter' });
    expect(screen.getByTestId('chemin').textContent).toBe('/dossier/dem-1');
  });

  it('Entrée ouvre le client quand il n’y a aucun dossier', () => {
    etat.resultat = { dossiers: [], clients: etat.resultat.clients };
    monter();
    taper('dup');
    fireEvent.keyDown(champ(), { key: 'Enter' });
    expect(screen.getByTestId('chemin').textContent).toBe('/client/client-dupont');
  });

  it('flèche bas descend dans la liste, flèche haut puis Échap reviennent au champ', () => {
    monter();
    taper('dup');
    fireEvent.keyDown(champ(), { key: 'ArrowDown' });
    const boutons = Array.from(document.querySelectorAll<HTMLButtonElement>('.bo-resultats button'));
    expect(document.activeElement).toBe(boutons[0]);
    fireEvent.keyDown(boutons[0] as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(boutons[1]);
    fireEvent.keyDown(boutons[1] as HTMLElement, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(boutons[0]);
    fireEvent.keyDown(boutons[0] as HTMLElement, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(champ());
  });

  it('Échap referme la liste puis vide le champ', () => {
    monter();
    taper('dup');
    fireEvent.keyDown(champ(), { key: 'Escape' });
    expect(document.querySelector('.bo-resultats')).toBeNull();
    expect(champ().value).toBe('dup');
    fireEvent.keyDown(champ(), { key: 'Escape' });
    expect(champ().value).toBe('');
  });

  it('un clic en dehors referme la liste', () => {
    monter();
    taper('dup');
    fireEvent.mouseDown(document.body);
    expect(document.querySelector('.bo-resultats')).toBeNull();
  });
});

describe('touche « / »', () => {
  it('met le focus dans la recherche depuis un élément de la page', () => {
    monter();
    const bouton = screen.getByRole('button', { name: 'Un bouton de la page' });
    bouton.focus();
    const ev = fireEvent.keyDown(bouton, { key: '/' });
    expect(document.activeElement).toBe(champ());
    // L'événement est annulé : le « / » ne s'écrit nulle part.
    expect(ev).toBe(false);
  });

  it('ne capture rien quand le focus est dans un champ de saisie', () => {
    monter();
    champ().focus();
    const ev = fireEvent.keyDown(champ(), { key: '/' });
    expect(ev).toBe(true);
  });

  it('ignore la touche en dehors de .bo-racine (le reste du Studio)', () => {
    monter();
    const dehors = document.createElement('button');
    document.body.appendChild(dehors);
    const ev = fireEvent.keyDown(dehors, { key: '/' });
    expect(ev).toBe(true);
    expect(document.activeElement).not.toBe(champ());
    dehors.remove();
  });

  it('ignore la touche avec une touche modificatrice', () => {
    monter();
    const bouton = screen.getByRole('button', { name: 'Un bouton de la page' });
    for (const mod of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
      expect(fireEvent.keyDown(bouton, { key: '/', ...mod })).toBe(true);
    }
    expect(document.activeElement).not.toBe(champ());
  });

  it('ignore la touche quand une fenêtre est ouverte', () => {
    monter();
    const racine = document.querySelector('.bo-racine') as HTMLElement;
    const fenetre = document.createElement('div');
    fenetre.setAttribute('role', 'dialog');
    racine.appendChild(fenetre);
    const bouton = screen.getByRole('button', { name: 'Un bouton de la page' });
    expect(fireEvent.keyDown(bouton, { key: '/' })).toBe(true);
    fenetre.remove();
  });

  it('slashDoitOuvrir : reconnaît aussi les zones contenteditable', () => {
    const racine = document.createElement('div');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    racine.appendChild(editable);
    const base = { key: '/', ctrlKey: false, metaKey: false, altKey: false, defaultPrevented: false };
    expect(slashDoitOuvrir({ ...base, target: editable }, racine)).toBe(false);
    expect(slashDoitOuvrir({ ...base, target: racine }, racine)).toBe(true);
    act(() => undefined);
  });
});
