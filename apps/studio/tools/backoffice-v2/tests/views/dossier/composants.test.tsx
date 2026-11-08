/** @jsxRuntime automatic @jsxImportSource react */
// @vitest-environment jsdom
// Tests du lot 10 : carte « Prochaine étape », barre d'enregistrement, création d'un dossier.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActionPrincipale } from '../../../domaine/contrats';
import type { ContexteVue } from '../../../views/Dossier/ContexteDossier';

const m = vi.hoisted(() => ({
  naviguer: vi.fn(),
  creerDossierManuel: vi.fn(),
}));

vi.mock('../../../app/Contexte', () => ({
  useRacine: () => document.body,
  useToasts: () => ({ succes: () => undefined, erreur: () => undefined }),
  useRoute: () => ({ chemin: '', naviguer: m.naviguer, garde: { definir: () => undefined } }),
}));
vi.mock('../../../data/magasin', () => ({ useMagasin: () => ({ recharger: async () => undefined }) }));
vi.mock('../../../actions/demande', () => ({ creerDossierManuel: m.creerDossierManuel }));
vi.mock('../../../views/Dossier/contexteEcriture', () => ({ useContexteEcritureDossier: () => ({}) }));

import { BarreEnregistrement } from '../../../views/Dossier/BarreEnregistrement';
import { ContexteDossierReact } from '../../../views/Dossier/ContexteDossier';
import { PageNouveauDossier } from '../../../views/Dossier/PageNouveauDossier';
import { ProchaineEtape } from '../../../views/Dossier/ProchaineEtape';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function monter(action: ActionPrincipale, modifications = false) {
  const ouvrirFenetre = vi.fn();
  const executerAction = vi.fn(async () => undefined);
  const ctx = { ouvrirFenetre, executerAction } as unknown as ContexteVue;
  render(
    <ContexteDossierReact.Provider value={ctx}>
      <ProchaineEtape action={action} modifications={modifications} />
    </ContexteDossierReact.Provider>,
  );
  return { ouvrirFenetre, executerAction };
}

const base: ActionPrincipale = { id: 'prendreEnCharge', libelle: 'Prendre en charge', manques: [] };

describe('ProchaineEtape', () => {
  it('sans manque et sans fenêtre ni confirmation : exécute directement', async () => {
    const { executerAction } = monter(base);
    fireEvent.click(screen.getByRole('button', { name: 'Prendre en charge' }));
    await waitFor(() => expect(executerAction).toHaveBeenCalledWith('prendreEnCharge'));
  });

  it('avec un manque : bouton inactif, manque écrit, rien n’est exécuté', () => {
    const { executerAction } = monter({ ...base, id: 'envoyerDevis', libelle: 'Envoyer le devis', manques: ['le montant HT'] });
    const bouton = screen.getByRole('button', { name: 'Envoyer le devis' }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    expect(screen.getByText(/le montant HT/)).toBeTruthy();
    fireEvent.click(bouton);
    expect(executerAction).not.toHaveBeenCalled();
  });

  it('avec `ouvre` : ouvre la fenêtre sans exécuter', () => {
    const { ouvrirFenetre, executerAction } = monter({ ...base, id: 'envoyerDevis', libelle: 'Envoyer le devis', ouvre: 'envoi' });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le devis' }));
    expect(ouvrirFenetre).toHaveBeenCalledWith('envoi');
    expect(executerAction).not.toHaveBeenCalled();
  });

  it('avec confirmation : n’exécute qu’après le verbe de la fenêtre', async () => {
    const { executerAction } = monter({
      ...base,
      id: 'creerExpedition',
      libelle: 'Créer l’expédition',
      confirmation: { titre: 'Créer l’expédition ?', consequence: 'Le suivi devient public.', verbe: 'Créer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Créer l’expédition' }));
    expect(executerAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(() => expect(executerAction).toHaveBeenCalledWith('creerExpedition'));
  });

  it('avec des modifications en attente : le bouton n’est plus plein', () => {
    monter(base, true);
    expect(document.querySelectorAll('.bo-bouton--primaire').length).toBe(0);
  });

  it('action « aucune » : pas de bouton', () => {
    monter({ id: 'aucune', libelle: 'Dossier terminé', manques: [] });
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('BarreEnregistrement', () => {
  it('est absente sans modification', () => {
    const { container } = render(
      <BarreEnregistrement nbModifications={0} enregistrement={false} onAnnuler={() => undefined} onEnregistrer={() => undefined} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('compte au pluriel et déclenche Annuler / Enregistrer', () => {
    const onAnnuler = vi.fn();
    const onEnregistrer = vi.fn();
    render(<BarreEnregistrement nbModifications={3} enregistrement={false} onAnnuler={onAnnuler} onEnregistrer={onEnregistrer} />);
    expect(screen.getByText('3 modifications non enregistrées')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onAnnuler).toHaveBeenCalled();
    expect(onEnregistrer).toHaveBeenCalled();
  });
});

describe('PageNouveauDossier', () => {
  it('refuse un formulaire vide sans rien écrire', () => {
    render(<PageNouveauDossier />);
    const creer = screen.getAllByRole('button').find((b) => /créer/i.test(b.textContent ?? ''));
    expect(creer).toBeTruthy();
    fireEvent.click(creer as HTMLElement);
    expect(m.creerDossierManuel).not.toHaveBeenCalled();
    expect(screen.getByText('Indiquez le nom du client.')).toBeTruthy();
  });
});
