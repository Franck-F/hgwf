/** @jsxRuntime automatic @jsxImportSource react */
// @vitest-environment jsdom
/**
 * Éditeur de fiche service : enregistrement automatique (minuteurs factices),
 * indicateur, ajout et suppression d'une ligne de tarif, erreur avec « Réessayer ».
 * Les écritures passent par le vrai module actions/fiches, sur un faux client.
 */
import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Fiche } from '../../../domaine/types';
import { creerFauxClient, type Doc } from '../../actions/fauxClient';
import { creerContexte } from '../../actions/outils';
import { installerCycle, monter } from './doublures';

const etat = vi.hoisted(() => ({ ctx: null as unknown }));

vi.mock('../../../app/Contexte', async () => (await import('./doublures')).contexte());
vi.mock('../../../views/Outils/contexte', () => ({ useContexteEcriture: () => etat.ctx }));

import { EditeurFiche } from '../../../views/Outils/EditeurFiche';

installerCycle();

const DOC: Doc = {
  _id: 'f1',
  _type: 'ficheService',
  _rev: 'rf1',
  titre: 'Groupage maritime',
  actif: true,
  inclus: ['Chargement'],
  grille: [{ _key: 'g1', _type: 'ligneTarif', designation: 'm³', prixHT: 400 }],
};

function preparer() {
  const client = creerFauxClient([DOC]);
  etat.ctx = creerContexte(client).ctx;
  const recharger = vi.fn(async () => undefined);
  const fiche = { ...DOC } as unknown as Fiche;
  monter(<EditeurFiche fiche={fiche} recharger={recharger} onSupprimee={vi.fn()} />);
  return { client, recharger };
}

const avancer = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

describe('EditeurFiche', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('enregistre après 800 ms de pause et indique l’état', async () => {
    const { client } = preparer();
    fireEvent.change(screen.getByLabelText('En une phrase'), { target: { value: 'Départ chaque mois' } });
    expect(screen.getByText('Enregistrement…')).toBeTruthy();
    await avancer(700);
    expect(client.journal).toHaveLength(0);
    await avancer(200);
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]).toMatchObject({ op: 'patch', id: 'f1', ifRevisionId: 'rf1', set: { resume: 'Départ chaque mois' } });
    expect(screen.getByText(/^Enregistré à \d{2}h\d{2}$/)).toBeTruthy();
  });

  it('enregistre tout de suite au départ du champ', async () => {
    const { client } = preparer();
    const champ = screen.getByLabelText('En une phrase');
    fireEvent.change(champ, { target: { value: 'Rapide' } });
    fireEvent.blur(champ);
    await avancer(0);
    expect(client.journal).toHaveLength(1);
  });

  it('une liste « un élément par ligne » devient un tableau de chaînes', async () => {
    const { client } = preparer();
    fireEvent.change(screen.getByLabelText(/Compris dans la prestation/), { target: { value: 'Chargement\nTransport\n\n' } });
    await avancer(900);
    expect(client.journal[0]?.set).toMatchObject({ inclus: ['Chargement', 'Transport'] });
  });

  it('ajoute puis supprime une ligne de la grille', async () => {
    const { client } = preparer();
    fireEvent.click(screen.getAllByRole('button', { name: 'Ajouter une ligne' })[0]!);
    expect(screen.getByLabelText('Grille tarifaire, ligne 2 : Désignation')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Grille tarifaire, ligne 2 : Désignation'), { target: { value: 'Palette' } });
    await avancer(900);
    const grille = client.journal[0]?.set?.grille as { designation: string }[];
    expect(grille.map((l) => l.designation)).toEqual(['m³', 'Palette']);

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer la ligne 1 de Grille tarifaire' }));
    await avancer(900);
    const apres = client.journal[1]?.set?.grille as { designation: string }[];
    expect(apres.map((l) => l.designation)).toEqual(['Palette']);
  });

  it('affiche l’erreur avec « Réessayer » puis réussit', async () => {
    const { client } = preparer();
    client.echouerProchaine(new Error('réseau coupé'));
    fireEvent.change(screen.getByLabelText('En une phrase'), { target: { value: 'Essai' } });
    await avancer(900);
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await avancer(0);
    expect(client.journal).toHaveLength(1);
    expect(screen.getByText(/^Enregistré à/)).toBeTruthy();
  });

  it('sur un conflit, recharge la fiche, prévient et rejoue l’écriture', async () => {
    const { client } = preparer();
    client.modifierAilleurs('f1', { vigilance: ['Froid'] });
    fireEvent.change(screen.getByLabelText('En une phrase'), { target: { value: 'Après conflit' } });
    await avancer(900);
    expect(screen.getByText(/vient d’être modifiée par quelqu’un d’autre/)).toBeTruthy();
    expect(client.journal).toHaveLength(1);
    expect(client.docs.get('f1')?.resume).toBe('Après conflit');
  });
});
