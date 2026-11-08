// @vitest-environment jsdom
/**
 * Magasin unique (8.2) : chargement, erreur sans perte des données, relecture
 * au focus, écoute en direct facultative, mémoire des révisions locales.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { creerMagasin, normaliserDonnees } from '../../data/magasin';
import { REQUETE_MAGASIN } from '../../data/requetes';
import type { ClientLike } from '../../domaine/contrats';
import { creerFauxClient, demandeDoc, expeditionDoc } from '../actions/fauxClient';

afterEach(() => {
  vi.useRealTimers();
});

const attendre = () => new Promise((r) => setTimeout(r, 0));

describe('requête agrégée', () => {
  it('une seule requête, clés nommées entre guillemets (contrat du harnais)', () => {
    for (const cle of ['demandes', 'expeditions', 'clients', 'conteneurs', 'rotations', 'fiches', 'echanges']) {
      expect(REQUETE_MAGASIN).toContain(`"${cle}":`);
    }
    // Plus de limite de 180 jours : tout est chargé.
    expect(REQUETE_MAGASIN).not.toMatch(/180|dateTime|now\(\)/);
    // Pas de statsMensuelles : plus lue.
    expect(REQUETE_MAGASIN).not.toContain('statsMensuelles');
  });
});

describe('normaliserDonnees', () => {
  it('une réponse partielle ne casse jamais l’écran', () => {
    expect(normaliserDonnees(null).demandes).toEqual([]);
    expect(normaliserDonnees({ demandes: [demandeDoc()] }).expeditions).toEqual([]);
    expect(normaliserDonnees({ demandes: 'oups' as never }).demandes).toEqual([]);
  });
});

describe('creerMagasin', () => {
  it('charge à la première inscription et expose les données', async () => {
    const client = creerFauxClient([demandeDoc(), expeditionDoc()]);
    const magasin = creerMagasin();
    magasin.definirClient(client);
    expect(magasin.instantane().chargement).toBe(true);
    const arret = magasin.abonner(() => undefined);
    await magasin.recharger();
    const m = magasin.instantane();
    expect(m.chargement).toBe(false);
    expect(m.erreur).toBeNull();
    expect(m.donnees.demandes).toHaveLength(1);
    expect(m.donnees.expeditions).toHaveLength(1);
    arret();
  });

  it('une panne de lecture garde les données déjà lues et signale l’erreur', async () => {
    const client = creerFauxClient([demandeDoc()]);
    const magasin = creerMagasin();
    magasin.definirClient(client);
    const arret = magasin.abonner(() => undefined);
    await magasin.recharger();
    client.fetch = (() => Promise.reject(new Error('hors ligne'))) as ClientLike['fetch'];
    await magasin.recharger();
    expect(magasin.instantane().erreur).toBe('hors ligne');
    expect(magasin.instantane().donnees.demandes).toHaveLength(1);
    arret();
  });

  it('la première lecture en échec rend une erreur et fin du chargement', async () => {
    const client = creerFauxClient([]);
    client.fetch = (() => Promise.reject(new Error('401'))) as ClientLike['fetch'];
    const magasin = creerMagasin();
    magasin.definirClient(client);
    const arret = magasin.abonner(() => undefined);
    await magasin.recharger();
    expect(magasin.instantane()).toMatchObject({ chargement: false, erreur: '401' });
    arret();
  });

  it('mémorise les révisions écrites ici, bornées', () => {
    const magasin = creerMagasin();
    const { memoriserRevision, revisionsLocales } = magasin.instantane();
    for (let i = 0; i < 400; i += 1) memoriserRevision(`rev-${i}`);
    memoriserRevision('');
    expect(revisionsLocales.size).toBe(300);
    expect(revisionsLocales.has('rev-399')).toBe(true);
    expect(revisionsLocales.has('rev-0')).toBe(false);
    // Le même ensemble sert de mémoire à tout l'outil.
    expect(magasin.instantane().revisionsLocales).toBe(revisionsLocales);
  });

  it('relit au retour de focus de l’onglet', async () => {
    const client = creerFauxClient([demandeDoc()]);
    const lecture = vi.spyOn(client, 'fetch');
    const magasin = creerMagasin();
    magasin.definirClient(client);
    const arret = magasin.abonner(() => undefined);
    await magasin.recharger();
    const avant = lecture.mock.calls.length;
    window.dispatchEvent(new Event('focus'));
    await attendre();
    await attendre();
    expect(lecture.mock.calls.length).toBeGreaterThan(avant);
    arret();
  });

  it('relit toutes les 60 s', async () => {
    vi.useFakeTimers();
    const client = creerFauxClient([demandeDoc()]);
    const lecture = vi.spyOn(client, 'fetch');
    const magasin = creerMagasin();
    magasin.definirClient(client);
    const arret = magasin.abonner(() => undefined);
    await vi.advanceTimersByTimeAsync(0);
    const avant = lecture.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(lecture.mock.calls.length).toBeGreaterThan(avant);
    arret();
  });

  it('sans listen (faux client) : aucune erreur ; avec listen : un événement relit', async () => {
    vi.useFakeTimers();
    const client = creerFauxClient([demandeDoc()]);
    let emettre: (e: unknown) => void = () => undefined;
    const desinscrire = vi.fn();
    (client as ClientLike).listen = () => ({
      subscribe: (obs: unknown) => {
        emettre = (obs as { next: (e: unknown) => void }).next;
        return { unsubscribe: desinscrire };
      },
    });
    const lecture = vi.spyOn(client, 'fetch');
    const magasin = creerMagasin();
    magasin.definirClient(client);
    const arret = magasin.abonner(() => undefined);
    await vi.advanceTimersByTimeAsync(0);
    const avant = lecture.mock.calls.length;
    emettre({ type: 'welcome' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(lecture.mock.calls.length).toBe(avant);
    emettre({ type: 'mutation' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(lecture.mock.calls.length).toBeGreaterThan(avant);
    arret();
    expect(desinscrire).toHaveBeenCalled();
  });

  it('un listen qui plante ne casse pas le chargement', async () => {
    const client = creerFauxClient([demandeDoc()]);
    (client as ClientLike).listen = () => {
      throw new Error('SSE refusé');
    };
    const magasin = creerMagasin();
    magasin.definirClient(client);
    const arret = magasin.abonner(() => undefined);
    await magasin.recharger();
    expect(magasin.instantane().donnees.demandes).toHaveLength(1);
    arret();
  });

  it('une relecture demandée pendant une lecture en vol est refaite juste après', async () => {
    const client = creerFauxClient([demandeDoc()]);
    const lecture = vi.spyOn(client, 'fetch');
    const magasin = creerMagasin();
    magasin.definirClient(client);
    const arret = magasin.abonner(() => undefined);
    const a = magasin.recharger();
    const b = magasin.recharger();
    await Promise.all([a, b]);
    expect(lecture.mock.calls.length).toBeGreaterThanOrEqual(2);
    arret();
  });

  it('prévient ses abonnés à chaque lecture et cesse après désinscription', async () => {
    const client = creerFauxClient([demandeDoc()]);
    const magasin = creerMagasin();
    magasin.definirClient(client);
    const ecouteur = vi.fn();
    const arret = magasin.abonner(ecouteur);
    await magasin.recharger();
    expect(ecouteur).toHaveBeenCalled();
    arret();
    ecouteur.mockClear();
    await magasin.recharger();
    expect(ecouteur).not.toHaveBeenCalled();
  });
});
