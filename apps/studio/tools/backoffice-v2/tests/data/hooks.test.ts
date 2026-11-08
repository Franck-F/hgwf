// @vitest-environment jsdom
/**
 * Hooks de la couche données : brouillon (diff, annulation, garde de sortie),
 * dossier ouvert (conflit réel ou propre écriture, critère 9octies), accueil
 * « À faire » et recherche branchés sur le magasin.
 */
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientLike } from '../../domaine/contrats';
import { creerFauxClient, demandeDoc, expeditionDoc, type FauxClient } from '../actions/fauxClient';

let clientCourant: FauxClient;

// `sanity` n'est importé que par data/client.ts : on le remplace par le faux client du test.
vi.mock('../../data/client', () => ({
  useClientSanity: () => clientCourant as unknown as ClientLike,
  useUtilisateur: () => ({ id: 'u1', nom: 'Marie' }),
}));

import { magasinGlobal } from '../../data/magasin';
import { brouillonUtile, normaliserValeur, useBrouillon } from '../../data/useBrouillon';
import { useAFaire } from '../../data/useAFaire';
import { useDossier } from '../../data/useDossier';
import { useRecherche } from '../../data/useRecherche';
import { useDossiers } from '../../data/useDossiers';
import type { Dossier } from '../../domaine/types';

const dossierDe = (extra = {}): Dossier => ({ id: 'demande-1', demande: demandeDoc({ notes: 'ancienne', ...extra }) });

afterEach(() => {
  cleanup();
});

describe('useBrouillon', () => {
  it('ne retient que les champs réellement différents du document', () => {
    const d = dossierDe();
    expect(brouillonUtile(d, { notes: 'ancienne', delaiEstime: '3 semaines' })).toEqual({ delaiEstime: '3 semaines' });
    expect(brouillonUtile(null, { notes: 'x' })).toEqual({});
  });

  it('une chaîne vide est un champ vidé (null), un zéro reste un zéro', () => {
    expect(normaliserValeur('')).toBeNull();
    expect(normaliserValeur(0)).toBe(0);
    expect(normaliserValeur(false)).toBe(false);
  });

  it('compte les modifications, annule, vide les champs enregistrés', () => {
    const d = dossierDe();
    const { result } = renderHook(() => useBrouillon(d));
    expect(result.current.nbModifications).toBe(0);
    act(() => result.current.modifier('delaiEstime', '3 semaines'));
    act(() => result.current.modifier('notes', ''));
    expect(result.current.brouillon).toEqual({ delaiEstime: '3 semaines', notes: null });
    expect(result.current.nbModifications).toBe(2);
    // Remettre l'ancienne valeur annule la modification.
    act(() => result.current.modifier('notes', 'ancienne'));
    expect(result.current.nbModifications).toBe(1);
    act(() => result.current.vider(['delaiEstime']));
    expect(result.current.nbModifications).toBe(0);
    act(() => result.current.modifier('montantHT', 10));
    act(() => result.current.annuler());
    expect(result.current.brouillon).toEqual({});
  });

  it('change de dossier : repart d’un brouillon vide', () => {
    let d = dossierDe();
    const { result, rerender } = renderHook(() => useBrouillon(d));
    act(() => result.current.modifier('delaiEstime', 'x'));
    d = { id: 'autre', demande: demandeDoc({ _id: 'autre' }) };
    rerender();
    expect(result.current.nbModifications).toBe(0);
  });

  it('avertit avant de fermer l’onglet avec des saisies, et plus ensuite', () => {
    const d = dossierDe();
    const { result } = renderHook(() => useBrouillon(d));
    const evt = () => {
      const e = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(evt()).toBe(false);
    act(() => result.current.modifier('delaiEstime', 'x'));
    expect(evt()).toBe(true);
    act(() => result.current.annuler());
    expect(evt()).toBe(false);
  });
});

describe('hooks branchés sur le magasin', () => {
  beforeEach(() => {
    clientCourant = creerFauxClient([
      demandeDoc({ _id: 'demande-1', statut: 4, expeditionRef: 'EXP-2610-001' }),
      expeditionDoc({ _id: 'expedition-1', reference: 'EXP-2610-001', statutPriseEnCharge: 2, etape: 1 }),
      demandeDoc({ _id: 'demande-2', reference: 'DEV-2611-001', clientNom: 'Awa Diop', statut: 0, recueLe: '04/11/2026 à 09h00' }),
    ]);
  });

  it('useDossier lit le détail complet, expédition liée comprise', async () => {
    const { result } = renderHook(() => useDossier('demande-1'));
    await waitFor(() => expect(result.current.dossier).not.toBeNull());
    expect(result.current.dossier?.expedition?._id).toBe('expedition-1');
    expect(result.current.chargement).toBe(false);
    expect(result.current.conflit).toBe(false);
  });

  it('useDossier : dossier inconnu = null sans chargement infini', async () => {
    const { result } = renderHook(() => useDossier('nexiste-pas'));
    await waitFor(() => expect(result.current.chargement).toBe(false));
    expect(result.current.dossier).toBeNull();
  });

  it('9octies : notre propre écriture, relue, ne déclenche PAS le bandeau de conflit', async () => {
    const { result } = renderHook(() => useDossier('demande-1'));
    await waitFor(() => expect(result.current.dossier).not.toBeNull());
    const rev = (await clientCourant.patch('demande-1').ifRevisionId(result.current.dossier!.demande!._rev).set({ notes: 'ici' }).commit())._rev;
    magasinGlobal.instantane().memoriserRevision(rev);
    await act(async () => {
      await magasinGlobal.recharger();
    });
    await waitFor(() => expect(result.current.dossier?.demande?._rev).toBe(rev));
    expect(result.current.conflit).toBe(false);
  });

  it('9octies : une révision inconnue (autre poste) déclenche le bandeau, sans écraser l’écran', async () => {
    const { result } = renderHook(() => useDossier('demande-1'));
    await waitFor(() => expect(result.current.dossier).not.toBeNull());
    const revAvant = result.current.dossier!.demande!._rev;
    clientCourant.modifierAilleurs('demande-1', { notes: 'quelqu’un d’autre' });
    await act(async () => {
      await magasinGlobal.recharger();
    });
    await waitFor(() => expect(result.current.conflit).toBe(true));
    // Le dossier affiché n'a pas bougé : les saisies en cours ne sont jamais écrasées.
    expect(result.current.dossier?.demande?._rev).toBe(revAvant);
    // « Recharger » adopte la version distante et efface le bandeau.
    await act(async () => {
      await result.current.recharger();
    });
    await waitFor(() => expect(result.current.conflit).toBe(false));
    expect(result.current.dossier?.demande?.notes).toBe('quelqu’un d’autre');
  });

  it('useDossiers et useRecherche partagent la même lecture', async () => {
    const { result } = renderHook(() => ({ d: useDossiers(), r: useRecherche('awa') }));
    await waitFor(() => expect(result.current.d.dossiers.length).toBe(2));
    expect(result.current.r.dossiers.map((x) => x.dossierId)).toEqual(['demande-2']);
  });

  it('useAFaire classe la nouvelle demande dans « Demandes à ouvrir »', async () => {
    const { result } = renderHook(() => useAFaire());
    await waitFor(() => expect(result.current.chargement).toBe(false));
    const aOuvrir = result.current.groupes.find((g) => g.id === 'aOuvrir');
    expect(aOuvrir?.lignes.map((l) => l.dossierId)).toEqual(['demande-2']);
    expect(result.current.erreur).toBeNull();
  });
});
