// @vitest-environment jsdom
/**
 * Gabarit d'appel à l'API : clé, en-têtes, 401 vers purge de la clé (critère 9),
 * erreurs normalisées. Le `localStorage` peut aussi être inaccessible.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appelerApi } from '../../actions/api';
import { ecrireCle, lireCle, NOM_CLE_API, purgerCle } from '../../actions/cleApi';

const reponse = (statut: number, corps: unknown) =>
  Promise.resolve({ status: statut, ok: statut >= 200 && statut < 300, json: () => Promise.resolve(corps) } as Response);

beforeEach(() => {
  window.localStorage.clear();
  process.env.SANITY_STUDIO_HGWF_API_URL = 'https://api.exemple.test';
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.SANITY_STUDIO_HGWF_API_URL;
});

describe('appelerApi', () => {
  it('sans clé : motif « cle », aucun appel réseau', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const r = await appelerApi('/api/envoi-devis', { reference: 'X' });
    expect(!r.ok && r.motif).toBe('cle');
    expect(f).not.toHaveBeenCalled();
  });

  it('envoie la clé dans x-hgwf-cle et renvoie le corps', async () => {
    ecrireCle('  secret  ');
    const f = vi.fn(() => reponse(200, { ok: true, destinataire: 'a@b.fr' }));
    vi.stubGlobal('fetch', f);
    const r = await appelerApi('/api/envoi-devis', { reference: 'X' });
    expect(r.ok && r.reponse.corps.destinataire).toBe('a@b.fr');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.exemple.test/api/envoi-devis');
    expect(init.headers).toMatchObject({ 'x-hgwf-cle': 'secret' });
  });

  it('un 401 efface la clé enregistrée (hgwf-cle-api) et redemande', async () => {
    ecrireCle('mauvaise');
    expect(window.localStorage.getItem(NOM_CLE_API)).toBe('mauvaise');
    vi.stubGlobal('fetch', () => reponse(401, { ok: false, erreur: 'clé invalide' }));
    const r = await appelerApi('/api/envoi-devis', {});
    expect(!r.ok && r.motif).toBe('cle');
    expect(window.localStorage.getItem(NOM_CLE_API)).toBeNull();
    expect(lireCle()).toBeNull();
  });

  it('une erreur 4xx de l’API garde son message ; une 5xx est une panne', async () => {
    ecrireCle('k');
    vi.stubGlobal('fetch', () => reponse(422, { ok: false, erreur: 'un devis à 0 € ne peut pas partir' }));
    const a = await appelerApi('/x', {});
    expect(!a.ok && a.motif).toBe('refus');
    expect(!a.ok && a.message).toBe('un devis à 0 € ne peut pas partir');
    vi.stubGlobal('fetch', () => reponse(502, { ok: false, erreur: 'envoi impossible' }));
    const b = await appelerApi('/x', {});
    expect(!b.ok && b.motif).toBe('reseau');
  });

  it('une coupure réseau donne motif « reseau »', async () => {
    ecrireCle('k');
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    const r = await appelerApi('/x', {});
    expect(!r.ok && r.motif).toBe('reseau');
  });

  it('sans adresse d’API configurée : message clair', async () => {
    ecrireCle('k');
    delete process.env.SANITY_STUDIO_HGWF_API_URL;
    const r = await appelerApi('/x', {});
    expect(!r.ok && r.message).toContain('adresse');
  });
});

describe('cleApi', () => {
  it('ne plante pas quand le stockage est inaccessible (navigation privée)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(lireCle()).toBeNull();
    expect(ecrireCle('k')).toBe(false);
    expect(() => purgerCle()).not.toThrow();
  });

  it('refuse une clé vide', () => {
    expect(ecrireCle('   ')).toBe(false);
  });
});
