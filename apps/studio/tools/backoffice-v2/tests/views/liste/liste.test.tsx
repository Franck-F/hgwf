/** @jsxRuntime automatic @jsxImportSource react */
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dossier, GroupeAFaire } from '../../../domaine/types';
import { dossierDemande, dossierExpedition, MAINTENANT } from '../../domaine/fabrique';

const naviguer = vi.fn();
const donnees = vi.hoisted(() => ({
  dossiers: [] as Dossier[],
  groupes: [] as GroupeAFaire[],
  attente: [] as unknown[],
  chargement: false,
  erreur: null as string | null,
}));

vi.mock('../../../app/Contexte', () => ({
  useRoute: () => ({ chemin: '/', naviguer, garde: { definir: () => undefined } }),
  useToasts: () => ({ succes: () => undefined, erreur: () => undefined }),
}));
vi.mock('../../../data/useDossiers', () => ({
  useDossiers: () => ({ dossiers: donnees.dossiers, chargement: donnees.chargement, erreur: donnees.erreur, recharger: async () => undefined }),
}));
vi.mock('../../../data/useAFaire', () => ({
  useAFaire: () => ({
    groupes: donnees.groupes,
    attente: donnees.attente,
    prochaineCloture: null,
    chargement: donnees.chargement,
    erreur: donnees.erreur,
  }),
}));

import { AFaire } from '../../../views/AFaire/AFaire';
import { fusionnerFantomes, useLignesFantomes } from '../../../views/AFaire/useLignesFantomes';
import { Dossiers } from '../../../views/Dossiers/Dossiers';
import { montantTTC } from '../../../views/Dossiers/LigneDossier';
import { compterParVue, estDansVue } from '../../../views/Dossiers/vues';

const ligne = (id: string, client: string) => ({
  dossierId: id,
  client,
  reference: `REF-${id}`,
  raison: 'Reçue il y a 2 jours',
  ageJours: 2,
  enRetard: false,
  actionLibelle: 'Prendre en charge',
  phase: 'nouvelle' as const,
  nbNonLus: 0,
});

const parc = (): Dossier[] => [
  dossierDemande({ statut: 0, clientNom: 'Alice' }, 'd1'),
  dossierDemande({ statut: 2, clientNom: 'Bruno', montantHT: 1000, tauxTVA: 20, devisEnvoyeLe: '29/10/2026 a 10h00' }, 'd2'),
  dossierExpedition({ statutPriseEnCharge: 1, clientNom: 'Chloé' }),
  dossierDemande({ statut: 5, clientNom: 'Denis' }, 'd4'),
];

beforeEach(() => {
  donnees.dossiers = [];
  donnees.groupes = [];
  donnees.attente = [];
  donnees.chargement = false;
  donnees.erreur = null;
  naviguer.mockReset();
});
afterEach(() => cleanup());

describe('vues de la liste des dossiers', () => {
  it('range chaque dossier dans les bonnes vues et compte', () => {
    const d = parc();
    const c = compterParVue(d);
    expect(c).toEqual({ enCours: 3, devis: 2, expeditions: 1, termines: 1 });
    expect(estDansVue(d[3]!, 'termines')).toBe(true);
    expect(estDansVue(d[3]!, 'enCours')).toBe(false);
  });
  it('affiche un montant TTC calculé et l’ancien montant texte tel quel', () => {
    expect(montantTTC(parc()[1]!.demande)).toMatch(/1\s?200,00/);
    expect(montantTTC({ ...parc()[0]!.demande!, montantDevis: '900 euros' })).toBe('900 euros');
    expect(montantTTC(parc()[0]!.demande)).toBe('');
  });
});

describe('Dossiers', () => {
  it('affiche 4 vues avec compteurs, les colonnes et aucun bouton plein', () => {
    donnees.dossiers = parc();
    const { container } = render(<Dossiers vue="enCours" />);
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: /En cours/ }).textContent).toContain('3');
    for (const t of ['Client', 'Phase', 'Montant TTC', 'Dernière activité', 'Prochaine action']) {
      expect(screen.getByRole('columnheader', { name: t })).toBeTruthy();
    }
    expect(container.querySelector('.bo-bouton--primaire')).toBeNull();
    // Recherche dans la liste et filtre par étape (demandés par l'équipe le 12/11/2026).
    expect(screen.getByLabelText('Rechercher dans la liste')).toBeTruthy();
    expect(screen.queryByText('Denis')).toBeNull();
  });
  it('filtre par texte, puis efface les filtres', () => {
    donnees.dossiers = parc();
    render(<Dossiers vue="enCours" />);
    fireEvent.change(screen.getByLabelText('Rechercher dans la liste'), { target: { value: 'alice' } });
    expect(screen.getByRole('button', { name: /Alice/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Bruno/ })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Effacer les filtres' })[0] as HTMLElement);
    expect(screen.getByRole('button', { name: /Bruno/ })).toBeTruthy();
  });
  it('ouvre un dossier au clic sur la ligne et change de vue', () => {
    donnees.dossiers = parc();
    render(<Dossiers vue="enCours" />);
    fireEvent.click(screen.getByRole('button', { name: /Alice/ }));
    expect(naviguer).toHaveBeenCalledWith('/dossier/d1');
    fireEvent.click(screen.getByRole('tab', { name: /Terminés/ }));
    expect(naviguer).toHaveBeenCalledWith('/dossiers?vue=termines');
  });
  it('vue vide avec message utile, et erreur avec un seul bouton Réessayer', () => {
    render(<Dossiers vue="devis" />);
    expect(screen.getByText('Aucun devis en attente')).toBeTruthy();
    cleanup();
    donnees.erreur = 'x';
    render(<Dossiers vue="devis" />);
    expect(screen.getAllByRole('button', { name: 'Réessayer' })).toHaveLength(1);
  });
});

describe('À faire', () => {
  it('un tableau, une action par ligne, aucun bouton plein ; aucune écriture au clic', () => {
    donnees.groupes = [
      { id: 'aOuvrir', titre: 'Demandes à ouvrir', lignes: [ligne('a', 'Alice'), ligne('b', 'Bruno')] },
    ];
    const { container } = render(<AFaire />);
    expect(container.querySelectorAll('.bo-bouton--primaire')).toHaveLength(0);
    expect(screen.getByRole('columnheader', { name: 'Où en est le dossier' })).toBeTruthy();
    expect(container.querySelectorAll('[data-action="ligne"]')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /Bruno/ }));
    expect(naviguer).toHaveBeenCalledWith('/dossier/b');
  });
  it('replie les groupes de plus de 8 lignes et filtre au clic sur une carte', () => {
    const beaucoup = Array.from({ length: 11 }, (_, i) => ligne(`x${i}`, `Client ${i}`));
    donnees.groupes = [
      { id: 'aOuvrir', titre: 'Demandes à ouvrir', lignes: beaucoup },
      { id: 'devis', titre: 'Devis à chiffrer', lignes: [ligne('d', 'Denis')] },
    ];
    const { container } = render(<AFaire />);
    expect(container.querySelectorAll('[data-action="ligne"]')).toHaveLength(9);
    fireEvent.click(screen.getByRole('button', { name: 'Voir les 3 autres' }));
    expect(container.querySelectorAll('[data-action="ligne"]')).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: /Devis à chiffrer : 1 dossier/ }));
    expect(container.querySelectorAll('[data-action="ligne"]')).toHaveLength(1);
  });
  it('état vide : « Rien d’urgent » avec accès aux dossiers en cours', () => {
    render(<AFaire />);
    expect(screen.getByText("Rien d'urgent")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Voir les dossiers en cours' }));
    expect(naviguer).toHaveBeenCalledWith('/dossiers?vue=enCours');
  });
  it('« Nouveau dossier » ne fait que naviguer', () => {
    render(<AFaire />);
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau dossier' }));
    expect(naviguer).toHaveBeenCalledWith('/dossier/nouveau');
  });
});

describe('lignes fantômes', () => {
  it('réinsère une ligne disparue puis la retire après le délai', () => {
    vi.useFakeTimers();
    const avant: GroupeAFaire[] = [{ id: 'aOuvrir', titre: 'T', lignes: [ligne('a', 'A'), ligne('b', 'B')] }];
    const apres: GroupeAFaire[] = [{ id: 'aOuvrir', titre: 'T', lignes: [ligne('b', 'B')] }];
    const { result, rerender } = renderHook(({ g }) => useLignesFantomes(g, 2000), { initialProps: { g: avant } });
    rerender({ g: apres });
    expect(result.current.fantomes.has('a')).toBe(true);
    expect(result.current.groupes[0]!.lignes.map((l) => l.dossierId)).toEqual(['a', 'b']);
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(result.current.fantomes.size).toBe(0);
    expect(result.current.groupes[0]!.lignes).toHaveLength(1);
    vi.useRealTimers();
  });
  it('sans fantôme, renvoie les groupes tels quels', () => {
    const g: GroupeAFaire[] = [{ id: 'aOuvrir', titre: 'T', lignes: [] }];
    expect(fusionnerFantomes(g, new Map())).toBe(g);
    expect(MAINTENANT).toBeInstanceOf(Date);
  });
});
