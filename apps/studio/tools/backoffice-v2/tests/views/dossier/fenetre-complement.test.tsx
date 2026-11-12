/** @jsxRuntime automatic @jsxImportSource react */
// @vitest-environment jsdom
// Fenêtre « Compléments demandés hors outil » : date du jour et e-mail par défaut, envoi du geste.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContexteVue } from '../../../views/Dossier/ContexteDossier';

vi.mock('../../../app/Contexte', () => ({
  useRacine: () => document.body,
  useToasts: () => ({ succes: () => undefined, erreur: () => undefined }),
  useRoute: () => ({ chemin: '', naviguer: () => undefined, garde: { definir: () => undefined } }),
}));

import { ContexteDossierReact } from '../../../views/Dossier/ContexteDossier';
import { FenetreGeste, isoVersJourMoisAnnee } from '../../../views/Dossier/FenetreGeste';
import { dossierDemande } from '../../domaine/fabrique';

afterEach(cleanup);

describe('FenetreGeste : compléments hors outil', () => {
  it('propose aujourd’hui et E-mail (Outlook), puis envoie le geste', async () => {
    const complementHorsOutil = vi.fn(async () => ({ ok: true }));
    const onTermine = vi.fn();
    const ctx = {
      secours: { complementHorsOutil },
      lancer: async (f: () => Promise<{ ok: boolean }>) => f(),
    } as unknown as ContexteVue;
    render(
      <ContexteDossierReact.Provider value={ctx}>
        <FenetreGeste dossier={dossierDemande({ statut: 0 })} fenetre="complementHorsOutil" onFermer={() => undefined} onTermine={onTermine} />
      </ContexteDossierReact.Provider>,
    );
    expect(screen.getByText(/Compléments demandés à Martin Dupont hors outil/)).toBeTruthy();
    expect(screen.getByRole('option', { name: 'E-mail (Outlook)' })).toBeTruthy();
    const bouton = screen.getAllByRole('button').find((b) => /noter la demande/i.test(b.textContent ?? ''));
    expect(bouton).toBeTruthy();
    fireEvent.click(bouton!);
    const aujourdhui = new Date();
    const iso = `${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth() + 1).padStart(2, '0')}-${String(aujourdhui.getDate()).padStart(2, '0')}`;
    await waitFor(() => expect(complementHorsOutil).toHaveBeenCalledWith({ date: isoVersJourMoisAnnee(iso), moyen: 'email' }));
    expect(onTermine).toHaveBeenCalled();
  });
});
