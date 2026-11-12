/** @jsxRuntime automatic @jsxImportSource react */
// @vitest-environment jsdom
/**
 * Tests d'interface du lot 13 : Outils (onglets, stock, rotations, fiches,
 * chiffres, export, connexion à l'envoi). Les hooks et verbes d'écriture sont
 * remplacés (voir doublures.tsx) : on vérifie ce que la vue demande d'écrire.
 */
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Dossier, Fiche } from '../../../domaine/types';
import { dossierDemande } from '../../domaine/fabrique';
import { boutonsPleins, conteneur, h, installerCycle, monter, rotation } from './doublures';

vi.mock('../../../app/Contexte', async () => (await import('./doublures')).contexte());
vi.mock('../../../data/client', async () => (await import('./doublures')).donneesSanity());
vi.mock('../../../data/magasin', async () => (await import('./doublures')).magasin());
vi.mock('../../../actions/envoi', async () => (await import('./doublures')).envoi());
vi.mock('../../../data/useOutils', async () => (await import('./doublures')).hookOutils());
vi.mock('../../../data/useClients', async () => (await import('./doublures')).hookClients());
vi.mock('../../../data/useDossiers', async () => (await import('./doublures')).hookDossiers());
vi.mock('../../../actions/referentiels', async () => (await import('./doublures')).actionsReferentiels());
vi.mock('../../../views/Outils/ExportDossiers', async () => (await import('./doublures')).exportDossiers());

import { ChiffresDuMois } from '../../../views/Outils/ChiffresDuMois';
import { ConnexionEnvoi } from '../../../views/Outils/ConnexionEnvoi';
import { FichesServices } from '../../../views/Outils/FichesServices';
import { Outils } from '../../../views/Outils/Outils';
import { PanneauExport } from '../../../views/Outils/PanneauExport';
import { Rotations } from '../../../views/Outils/Rotations';
import { StockConteneurs } from '../../../views/Outils/StockConteneurs';

installerCycle();

describe('Outils', () => {
  it('propose les six onglets et navigue vers l’itinéraire de l’onglet choisi', () => {
    monter(<Outils section="rotations" />);
    const onglets = screen.getAllByRole('tab').map((o) => o.textContent);
    expect(onglets).toEqual([
      'Stock de conteneurs',
      'Rotations',
      'Fiches services',
      'Chiffres du mois',
      'Export',
      'Connexion à l’envoi',
    ]);
    expect(screen.getByRole('tab', { name: 'Rotations' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Export' }));
    expect(h.naviguer).toHaveBeenCalledWith('/outils/export');
  });

  it('n’a qu’un seul bouton plein par onglet', () => {
    for (const section of ['conteneurs', 'rotations', 'fiches', 'export', 'connexion'] as const) {
      cleanup();
      monter(<Outils section={section} />);
      expect(boutonsPleins(), section).toHaveLength(1);
    }
    cleanup();
    monter(<Outils section="chiffres" />);
    expect(boutonsPleins()).toHaveLength(0);
  });
});

describe('Stock de conteneurs', () => {
  it('liste les conteneurs et signale un stock vide', () => {
    monter(<StockConteneurs />);
    expect(screen.getByText('Aucun conteneur en stock')).toBeTruthy();
    cleanup();
    h.outils.conteneurs = [conteneur(), conteneur({ _id: 'k2', reference: 'CTN-40-210', statut: 1 })];
    monter(<StockConteneurs />);
    expect(screen.getByText('CTN-20-130')).toBeTruthy();
    expect(screen.getByText('CTN-40-210')).toBeTruthy();
  });

  it('change le statut par un sélecteur, sans bouton cyclique', async () => {
    h.outils.conteneurs = [conteneur()];
    monter(<StockConteneurs />);
    const choix = screen.getByLabelText('Statut du conteneur CTN-20-130') as HTMLSelectElement;
    expect(choix.value).toBe('0');
    fireEvent.change(choix, { target: { value: '2' } });
    await waitFor(() => expect(h.enregistrerConteneur).toHaveBeenCalledTimes(1));
    expect((h.enregistrerConteneur.mock.calls[0] as unknown[])[1]).toMatchObject({ _id: 'k1', _rev: 'rk1', statut: 2 });
    await waitFor(() => expect(h.recharger).toHaveBeenCalled());
    expect(h.succes).toHaveBeenCalledWith('Conteneur CTN-20-130 : vendu');
  });

  it('garde l’erreur à l’écran si le changement de statut échoue', async () => {
    h.outils.conteneurs = [conteneur()];
    h.enregistrerConteneur.mockResolvedValueOnce({ ok: false, motif: 'conflit', message: 'Modifié par quelqu’un d’autre.' } as never);
    monter(<StockConteneurs />);
    fireEvent.change(screen.getByLabelText('Statut du conteneur CTN-20-130'), { target: { value: '1' } });
    await waitFor(() => expect(h.erreur).toHaveBeenCalledWith('Modifié par quelqu’un d’autre.'));
    expect(h.recharger).not.toHaveBeenCalled();
  });

  it('refuse d’ajouter sans référence puis enregistre', async () => {
    monter(<StockConteneurs />);
    fireEvent.click(screen.getByRole('button', { name: /Ajouter un conteneur/ }));
    const fenetre = screen.getByRole('dialog');
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Enregistrer' }));
    expect(within(fenetre).getByText(/Indiquez la référence/)).toBeTruthy();
    expect(h.enregistrerConteneur).not.toHaveBeenCalled();

    fireEvent.change(within(fenetre).getByLabelText(/Référence/), { target: { value: ' CTN-20-999 ' } });
    fireEvent.change(within(fenetre).getByLabelText('Prix affiché'), { target: { value: '1 200 €' } });
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(h.enregistrerConteneur).toHaveBeenCalledTimes(1));
    expect((h.enregistrerConteneur.mock.calls[0] as unknown[])[1]).toMatchObject({
      reference: 'CTN-20-999',
      taille: '20 pieds',
      etat: 'A',
      prix: '1 200 €',
      statut: 0,
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(h.recharger).toHaveBeenCalled();
  });

  it('demande une confirmation nommée avant de supprimer', async () => {
    h.outils.conteneurs = [conteneur()];
    monter(<StockConteneurs />);
    fireEvent.click(screen.getByRole('button', { name: 'Autres actions pour CTN-20-130' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Supprimer' }));
    const fenetre = screen.getByRole('dialog');
    expect(within(fenetre).getByText('Supprimer le conteneur CTN-20-130 ?')).toBeTruthy();
    expect(h.supprimerConteneur).not.toHaveBeenCalled();
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(h.supprimerConteneur).toHaveBeenCalledTimes(1));
    expect((h.supprimerConteneur.mock.calls[0] as unknown[])[1]).toMatchObject({ _id: 'k1' });
  });
});

describe('Rotations', () => {
  it('range les rotations à venir par date lue et replie les terminées', () => {
    h.outils.rotations = [
      rotation({ _id: 'a', nom: 'Rotation tardive', cloture: '05/12', depart: '09/12' }),
      rotation({ _id: 'b', nom: 'Rotation proche', cloture: '14/11', depart: '18/11' }),
      rotation({ _id: 'c', nom: 'Rotation partie', cloture: '01/01', depart: '05/01' }),
    ];
    monter(<Rotations />);
    const aVenir = within(screen.getByRole('list', { name: 'Rotations à venir' })).getAllByRole('listitem');
    expect(aVenir.length).toBeGreaterThanOrEqual(2);
    const noms = aVenir.map((l) => l.textContent ?? '');
    expect(noms.findIndex((t) => t.includes('Rotation proche'))).toBeLessThan(noms.findIndex((t) => t.includes('Rotation tardive')));
  });

  it('enregistre les dates choisies au format JJ/MM, sans année', async () => {
    monter(<Rotations />);
    fireEvent.click(screen.getByRole('button', { name: /Ajouter une rotation/ }));
    const fenetre = screen.getByRole('dialog');
    fireEvent.change(within(fenetre).getByLabelText(/Nom de la rotation/), { target: { value: 'Le Havre → Abidjan' } });
    fireEvent.change(within(fenetre).getByLabelText(/Clôture/), { target: { value: '2026-11-21' } });
    fireEvent.change(within(fenetre).getByLabelText(/Départ/), { target: { value: '2026-11-25' } });
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(h.enregistrerRotation).toHaveBeenCalledTimes(1));
    expect((h.enregistrerRotation.mock.calls[0] as unknown[])[1]).toMatchObject({
      nom: 'Le Havre → Abidjan',
      cloture: '21/11',
      depart: '25/11',
      remplissage: 0,
    });
  });

  it('refuse un départ avant la clôture sans rien écrire', () => {
    monter(<Rotations />);
    fireEvent.click(screen.getByRole('button', { name: /Ajouter une rotation/ }));
    const fenetre = screen.getByRole('dialog');
    fireEvent.change(within(fenetre).getByLabelText(/Nom de la rotation/), { target: { value: 'Test' } });
    fireEvent.change(within(fenetre).getByLabelText(/Clôture/), { target: { value: '2026-11-21' } });
    fireEvent.change(within(fenetre).getByLabelText(/Départ/), { target: { value: '2026-11-10' } });
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Enregistrer' }));
    expect(within(fenetre).getByText('Le départ doit être après la clôture.')).toBeTruthy();
    expect(h.enregistrerRotation).not.toHaveBeenCalled();
  });

  it('pré-sélectionne la date lue en modification', () => {
    h.outils.rotations = [rotation()];
    monter(<Rotations />);
    fireEvent.click(screen.getByRole('button', { name: 'Autres actions pour Le Havre → Dakar' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Modifier' }));
    const fenetre = screen.getByRole('dialog');
    expect((within(fenetre).getByLabelText(/Clôture/) as HTMLInputElement).value).toMatch(/^\d{4}-11-14$/);
    expect((within(fenetre).getByLabelText(/Départ/) as HTMLInputElement).value).toMatch(/^\d{4}-11-18$/);
  });
});

describe('Fiches services', () => {
  it('s’édite directement (plus de renvoi au Studio) et propose une nouvelle fiche', () => {
    const fiche = (extra: Partial<Fiche>): Fiche => ({ _id: 'f', _rev: 'r', _type: 'ficheService', ...extra });
    h.outils.fiches = [
      fiche({ _id: 'f1', titre: 'Groupage maritime', ordre: 1, grille: [{ designation: 'm³', prixHT: 400 }] }),
      fiche({ _id: 'f2', titre: 'Conteneur complet', ordre: 2, grille: [{ designation: '20 pieds' }, { designation: '40 pieds' }] }),
      fiche({ _id: 'f3', titre: 'Fret aérien', ordre: 3 }),
    ];
    monter(<FichesServices />);
    expect(screen.getByText('Grille renseignée')).toBeTruthy();
    expect(screen.getByText('2 prix manquants')).toBeTruthy();
    expect(screen.getByText('Pas de grille de prix')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Studio/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Nouvelle fiche/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Groupage maritime/ }));
    expect((screen.getByLabelText('Nom du service') as HTMLInputElement).value).toBe('Groupage maritime');
  });
});

describe('Chiffres du mois', () => {
  it('affiche des chiffres calculés, sans aucun champ à remplir', () => {
    h.dossiers.dossiers = [
      dossierDemande({ _id: 'a', recueLe: '03/11/2026', statut: 2, devisEnvoyeLe: '04/11/2026' }, 'a'),
      dossierDemande({ _id: 'b', recueLe: '04/11/2026', statut: 3 }, 'b'),
    ] as Dossier[];
    monter(<ChiffresDuMois />);
    expect(screen.getByText('Demandes reçues')).toBeTruthy();
    expect(screen.getByText('Taux d’acceptation')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Mois' })).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});

describe('Export', () => {
  it('exporte tous les dossiers, sans choix de période', async () => {
    h.dossiers.dossiers = [dossierDemande({}, 'a'), dossierDemande({ _id: 'b' }, 'b')] as Dossier[];
    monter(<PanneauExport />);
    expect(screen.getByText(/2 dossiers seront exportés/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Exporter les dossiers (Excel)' }));
    await waitFor(() => expect(h.exporterDossiers).toHaveBeenCalledTimes(1));
    expect((h.exporterDossiers.mock.calls[0] as unknown[])[0]).toHaveLength(2);
    await waitFor(() => expect(h.succes).toHaveBeenCalled());
  });

  it('explique pourquoi le bouton est inactif quand il n’y a aucun dossier', () => {
    monter(<PanneauExport />);
    const bouton = screen.getByRole('button', { name: 'Exporter les dossiers (Excel)' }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    expect(bouton.getAttribute('aria-describedby')).toBe('export-etat');
    expect(document.getElementById('export-etat')?.textContent).toMatch(/aucun dossier/);
  });

  it('garde l’erreur durable si l’export échoue', async () => {
    h.dossiers.dossiers = [dossierDemande({}, 'a')] as Dossier[];
    h.exporterDossiers.mockRejectedValueOnce(new Error('boom'));
    monter(<PanneauExport />);
    fireEvent.click(screen.getByRole('button', { name: 'Exporter les dossiers (Excel)' }));
    await waitFor(() => expect(h.erreur).toHaveBeenCalled());
  });
});

describe('Connexion à l’envoi', () => {
  it('dit clairement que la clé manque, sans jamais l’afficher', async () => {
    monter(<ConnexionEnvoi />);
    expect(screen.getByText('Clé manquante')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Oublier la clé' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Saisir la clé' }));
    await waitFor(() => expect(h.demanderCle).toHaveBeenCalled());
    await waitFor(() => expect(h.succes).toHaveBeenCalled());
  });

  it('propose d’oublier la clé quand elle est enregistrée', () => {
    h.cle.presente = true;
    monter(<ConnexionEnvoi />);
    expect(screen.getByText('Clé enregistrée sur cet ordinateur')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Oublier la clé' }));
    expect(h.oublier).toHaveBeenCalledTimes(1);
  });
});

