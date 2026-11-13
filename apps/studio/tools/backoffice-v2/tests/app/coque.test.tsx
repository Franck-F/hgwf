/** @jsxRuntime automatic @jsxImportSource react */
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackOfficeAvecRouteur } from '../../BackOffice';
import { cleDePage } from '../../app/Coque';
import { creerRouteurMemoire } from '../../app/routeur';
import type { RouteurMemoire } from '../../app/routeur';

const etat = vi.hoisted(() => ({ nbUrgents: 3 }));

// Les vues appartiennent à d'autres lots : on ne teste ici que ce que la coque leur passe.
vi.mock('../../views/AFaire/AFaire', async () => {
  const { createElement } = await import('react');
  return { AFaire: () => createElement('p', null, 'Vue À faire') };
});
vi.mock('../../views/Dossiers/Dossiers', async () => {
  const { createElement } = await import('react');
  return { Dossiers: ({ vue }: { vue: string }) => createElement('p', null, `Vue Dossiers : ${vue}`) };
});
vi.mock('../../views/Dossier/DossierPage', async () => {
  const { createElement, useState } = await import('react');
  return {
    DossierPage: ({ id }: { id: string }) => {
      // Un état local, pour vérifier qu'il repart de zéro d'un dossier à l'autre.
      const [saisie, setSaisie] = useState('');
      return createElement(
        'div',
        null,
        createElement('p', null, `Vue Dossier : ${id}`),
        createElement('input', { 'aria-label': 'Saisie locale', value: saisie, onChange: (e: { target: { value: string } }) => setSaisie(e.target.value) }),
      );
    },
  };
});
vi.mock('../../views/Clients/Clients', async () => {
  const { createElement } = await import('react');
  return { Clients: () => createElement('p', null, 'Vue Clients') };
});
vi.mock('../../views/Clients/FicheClient', async () => {
  const { createElement } = await import('react');
  return { FicheClient: ({ id }: { id: string }) => createElement('p', null, `Vue Fiche client : ${id}`) };
});
vi.mock('../../views/Outils/Outils', async () => {
  const { createElement } = await import('react');
  return { Outils: ({ section }: { section: string }) => createElement('p', null, `Vue Outils : ${section}`) };
});
vi.mock('../../data/useAFaire', () => ({
  useAFaire: () => ({ groupes: [], attente: [], prochaineCloture: null, chargement: false, erreur: null, nbUrgents: etat.nbUrgents }),
}));
vi.mock('../../data/useRecherche', () => ({ useRecherche: () => ({ dossiers: [], clients: [] }) }));
vi.mock('../../actions/cleApi', () => ({ NOM_CLE_API: 'x', lireCle: () => null, ecrireCle: () => true, purgerCle: () => undefined }));

function monter(depart = '/afaire'): RouteurMemoire {
  const routeur = creerRouteurMemoire(depart);
  render(<BackOfficeAvecRouteur routeur={routeur} />);
  return routeur;
}

const nav = (): HTMLElement => screen.getByRole('navigation', { name: 'Navigation principale' });
const entree = (nom: string): HTMLElement => Array.from(nav().querySelectorAll('button')).find((b) => b.textContent?.startsWith(nom)) as HTMLElement;

beforeEach(() => {
  etat.nbUrgents = 3;
});
afterEach(() => cleanup());

describe('coque', () => {
  it('monte une seule racine .bo-racine, avec la navigation et la recherche, sans nom d’utilisateur', () => {
    monter();
    expect(document.querySelectorAll('.bo-racine')).toHaveLength(1);
    expect(nav().closest('.bo-racine')).not.toBeNull();
    expect(screen.getByRole('searchbox')).toBeTruthy();
    expect(screen.queryByText('Utilisateur de test')).toBeNull();
  });

  it('propose exactement quatre entrées, dont une seule est la page courante', () => {
    monter();
    const boutons = Array.from(nav().querySelectorAll('button'));
    expect(boutons.map((b) => b.textContent?.replace(/\d.*$/, ''))).toEqual(['À faire', 'Dossiers', 'Clients', 'Outils']);
    expect(boutons.filter((b) => b.getAttribute('aria-current') === 'page')).toHaveLength(1);
    expect(entree('À faire').getAttribute('aria-current')).toBe('page');
  });

  it('affiche la pastille d’urgences sur « À faire », et la masque à zéro', () => {
    monter();
    expect(entree('À faire').textContent).toContain('3');
    expect(entree('À faire').textContent).toContain('urgents');
    cleanup();
    etat.nbUrgents = 0;
    monter();
    expect(entree('À faire').querySelector('.bo-nav-pastille')).toBeNull();
  });

  it('un dossier se lit comme « 1 urgent » au singulier', () => {
    etat.nbUrgents = 1;
    monter();
    expect(entree('À faire').textContent).toContain('1 urgent');
    expect(entree('À faire').textContent).not.toContain('urgents');
  });

  it('navigue entre les quatre entrées', () => {
    const routeur = monter();
    expect(screen.getByText('Vue À faire')).toBeTruthy();
    fireEvent.click(entree('Dossiers'));
    expect(screen.getByText('Vue Dossiers : enCours')).toBeTruthy();
    expect(entree('Dossiers').getAttribute('aria-current')).toBe('page');
    fireEvent.click(entree('Clients'));
    expect(screen.getByText('Vue Clients')).toBeTruthy();
    fireEvent.click(entree('Outils'));
    expect(screen.getByText('Vue Outils : conteneurs')).toBeTruthy();
    expect(routeur.chemin()).toBe('/outils/conteneurs');
  });

  it('« Précédent » du navigateur revient à la page d’avant', () => {
    const routeur = monter();
    fireEvent.click(entree('Clients'));
    fireEvent.click(entree('Dossiers'));
    act(() => routeur.retour());
    expect(screen.getByText('Vue Clients')).toBeTruthy();
  });

  it('garde l’entrée « Dossiers » active sur la page d’un dossier', () => {
    monter('/dossier/dem-2610-014');
    expect(screen.getByText('Vue Dossier : dem-2610-014')).toBeTruthy();
    expect(entree('Dossiers').getAttribute('aria-current')).toBe('page');
  });

  it('passe l’identifiant « nouveau » à la page Dossier (mode création)', () => {
    monter('/dossier/nouveau');
    expect(screen.getByText('Vue Dossier : nouveau')).toBeTruthy();
  });

  it('lit la vue et la section dans l’adresse', () => {
    monter('/dossiers?vue=termines');
    expect(screen.getByText('Vue Dossiers : termines')).toBeTruthy();
    cleanup();
    monter('/outils/rotations');
    expect(screen.getByText('Vue Outils : rotations')).toBeTruthy();
    cleanup();
    monter('/client/client-x');
    expect(screen.getByText('Vue Fiche client : client-x')).toBeTruthy();
  });

  it('repart de zéro quand on change de dossier (état local non conservé)', () => {
    const routeur = monter('/dossier/a');
    fireEvent.change(screen.getByLabelText('Saisie locale'), { target: { value: 'brouillon' } });
    expect((screen.getByLabelText('Saisie locale') as HTMLInputElement).value).toBe('brouillon');
    fireEvent.click(entree('Dossiers'));
    act(() => routeur.naviguer('/dossier/b'));
    expect(screen.getByText('Vue Dossier : b')).toBeTruthy();
    expect((screen.getByLabelText('Saisie locale') as HTMLInputElement).value).toBe('');
  });

  it('affiche une page « introuvable » avec un retour vers « À faire »', () => {
    const routeur = monter('/nimporte-quoi');
    expect(screen.getByText("Cette page n'existe pas")).toBeTruthy();
    expect(Array.from(nav().querySelectorAll('[aria-current]'))).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Retour à « À faire »' }));
    expect(routeur.chemin()).toBe('/afaire');
    expect(screen.getByText('Vue À faire')).toBeTruthy();
  });

  it('place la navigation et la barre haute sans aucun style en ligne', () => {
    monter();
    const racine = document.querySelector('.bo-racine') as HTMLElement;
    expect(racine.querySelectorAll('[style]')).toHaveLength(0);
    expect(racine.querySelector('header.bo-haut')).not.toBeNull();
    expect(racine.querySelector('main')).not.toBeNull();
  });
});

describe('cleDePage', () => {
  it('distingue deux dossiers, deux vues et deux sections', () => {
    expect(cleDePage({ nom: 'dossier', id: 'a' })).not.toBe(cleDePage({ nom: 'dossier', id: 'b' }));
    expect(cleDePage({ nom: 'dossiers', vue: 'devis' })).not.toBe(cleDePage({ nom: 'dossiers', vue: 'termines' }));
    expect(cleDePage({ nom: 'outils', section: 'export' })).not.toBe(cleDePage({ nom: 'outils', section: 'rotations' }));
    expect(cleDePage({ nom: 'afaire' })).toBe('afaire');
  });
});
