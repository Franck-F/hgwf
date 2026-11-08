/** @jsxRuntime automatic @jsxImportSource react */
// @vitest-environment jsdom
/**
 * Tests d'interface du lot 13 : Clients (liste, nouvelle fiche, fiche client).
 * Les hooks et verbes d'écriture sont remplacés (voir doublures.tsx).
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dossier } from '../../../domaine/types';
import { dossierDemande } from '../../domaine/fabrique';
import { boutonsPleins, client, h, installerCycle, monter } from './doublures';

vi.mock('../../../app/Contexte', async () => (await import('./doublures')).contexte());
vi.mock('../../../data/client', async () => (await import('./doublures')).donneesSanity());
vi.mock('../../../data/magasin', async () => (await import('./doublures')).magasin());
vi.mock('../../../actions/envoi', async () => (await import('./doublures')).envoi());
vi.mock('../../../data/useClients', async () => (await import('./doublures')).hookClients());
vi.mock('../../../data/useDossiers', async () => (await import('./doublures')).hookDossiers());
vi.mock('../../../actions/clients', async () => (await import('./doublures')).actionsClients());

import { Clients } from '../../../views/Clients/Clients';
import { FicheClient } from '../../../views/Clients/FicheClient';

installerCycle();

describe('Clients', () => {
  beforeEach(() => {
    h.clients.clients = [client(), client({ _id: 'c2', nom: 'Durand', contact: 'durand@example.fr' })];
    h.dossiers.dossiers = [dossierDemande({ _id: 'd1', clientNom: 'Dupont', email: 'dupont@example.fr', recueLe: '01/11/2026' }, 'd1')];
  });

  it('liste les clients sans crayon ni croix, avec un seul bouton plein', () => {
    monter(<Clients />);
    expect(screen.getByRole('button', { name: 'Ouvrir la fiche de Dupont' })).toBeTruthy();
    expect(screen.getByText(/1 dossier, dernier le/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Supprimer|Modifier/ })).toBeNull();
    expect(boutonsPleins()).toHaveLength(1);
    expect(boutonsPleins()[0]!.textContent).toMatch(/Nouveau client/);
    expect(document.body.textContent).not.toMatch(/[✎✕]/);
  });

  it('ouvre la fiche au clic et filtre par téléphone quelle que soit sa forme', () => {
    monter(<Clients />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la fiche de Durand' }));
    expect(h.naviguer).toHaveBeenCalledWith('/client/c2');
    fireEvent.change(screen.getByLabelText('Rechercher un client'), { target: { value: '+33 6 12 34 56 78' } });
    expect(screen.queryByRole('button', { name: 'Ouvrir la fiche de Durand' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ouvrir la fiche de Dupont' })).toBeTruthy();
  });

  it('crée une fiche et ouvre sa page', async () => {
    monter(<Clients />);
    fireEvent.click(screen.getByRole('button', { name: /Nouveau client/ }));
    const fenetre = screen.getByRole('dialog');
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Créer la fiche' }));
    expect(within(fenetre).getByText('Indiquez le nom du client.')).toBeTruthy();
    expect(h.creerClient).not.toHaveBeenCalled();
    fireEvent.change(within(fenetre).getByLabelText(/Nom/), { target: { value: ' Martin ' } });
    fireEvent.change(within(fenetre).getByLabelText('E-mail'), { target: { value: 'martin@example.fr' } });
    fireEvent.change(within(fenetre).getByLabelText('Téléphone'), { target: { value: '06 00 00 00 01' } });
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Créer la fiche' }));
    await waitFor(() => expect(h.creerClient).toHaveBeenCalledTimes(1));
    expect((h.creerClient.mock.calls[0] as unknown[])[1]).toEqual({
      nom: 'Martin',
      contact: 'martin@example.fr · 06 00 00 00 01',
      destination: '',
    });
    await waitFor(() => expect(h.naviguer).toHaveBeenCalledWith('/client/nouveau-client'));
  });

  it('affiche l’état vide avec la phrase de Marie', () => {
    h.clients.clients = [];
    monter(<Clients />);
    expect(screen.getByText(/Les fiches se créent toutes seules/)).toBeTruthy();
  });
});

describe('Fiche client', () => {
  beforeEach(() => {
    h.clients.clients = [client()];
    h.dossiers.dossiers = [dossierDemande({ _id: 'd1', clientNom: 'Dupont', email: 'dupont@example.fr', recueLe: '01/11/2026' }, 'd1')];
  });

  it('montre ses dossiers cliquables, sans bouton plein tant que rien n’a changé', () => {
    monter(<FicheClient id="c1" />);
    expect(boutonsPleins()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le dossier DEV-2611-001' }));
    expect(h.naviguer).toHaveBeenCalledWith('/dossier/d1');
  });

  it('enregistre la modification, en reconstruisant « mail · tél », et garde les saisies sur échec', async () => {
    monter(<FicheClient id="c1" />);
    fireEvent.change(screen.getByLabelText('Téléphone'), { target: { value: '06 99 99 99 99' } });
    expect(boutonsPleins()).toHaveLength(1);
    expect(h.garde.definir).toHaveBeenLastCalledWith(expect.any(Function));

    h.modifierClient.mockResolvedValueOnce({ ok: false, motif: 'conflit', message: 'Fiche modifiée ailleurs.' } as never);
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(h.erreur).toHaveBeenCalledWith('Fiche modifiée ailleurs.'));
    expect((screen.getByLabelText('Téléphone') as HTMLInputElement).value).toBe('06 99 99 99 99');

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(h.modifierClient).toHaveBeenCalledTimes(2));
    expect((h.modifierClient.mock.calls[1] as unknown[])[2]).toEqual({
      nom: 'Dupont',
      contact: 'dupont@example.fr · 06 99 99 99 99',
      destination: 'Dakar',
    });
    await waitFor(() => expect(h.succes).toHaveBeenCalledWith('Fiche enregistrée'));
  });

  it('supprime la fiche seulement après une confirmation nommée', async () => {
    monter(<FicheClient id="c1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Autres actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Supprimer la fiche' }));
    const fenetre = screen.getByRole('dialog');
    expect(within(fenetre).getByText('Supprimer la fiche de Dupont ?')).toBeTruthy();
    expect(within(fenetre).getByText('Ses dossiers ne sont pas supprimés.')).toBeTruthy();
    expect(h.supprimerClient).not.toHaveBeenCalled();
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Supprimer la fiche' }));
    await waitFor(() => expect(h.supprimerClient).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(h.naviguer).toHaveBeenCalledWith('/clients'));
  });

  it('dit que la fiche n’existe plus quand elle a disparu', () => {
    monter(<FicheClient id="inconnu" />);
    expect(screen.getByText('Cette fiche n’existe plus')).toBeTruthy();
  });
});
