import { describe, expect, it } from 'vitest';
import { analyserChemin, cheminDe, entreeActive } from '../../app/routes';
import type { Route } from '../../app/routes';
import { normaliserChemin } from '../../app/FournisseurRoute';

describe('analyserChemin', () => {
  it('un chemin vide ou « /afaire » mène à l’accueil', () => {
    expect(analyserChemin('')).toEqual({ nom: 'afaire' });
    expect(analyserChemin('/afaire')).toEqual({ nom: 'afaire' });
    expect(analyserChemin('#/afaire')).toEqual({ nom: 'afaire' });
  });

  it('lit la vue des dossiers et retombe sur « En cours » si elle est inconnue', () => {
    expect(analyserChemin('/dossiers')).toEqual({ nom: 'dossiers', vue: 'enCours' });
    expect(analyserChemin('/dossiers?vue=termines')).toEqual({ nom: 'dossiers', vue: 'termines' });
    expect(analyserChemin('/dossiers?vue=n-importe-quoi')).toEqual({ nom: 'dossiers', vue: 'enCours' });
  });

  it('lit les identifiants de dossier et de client, y compris « nouveau »', () => {
    expect(analyserChemin('/dossier/dem-2610-014')).toEqual({ nom: 'dossier', id: 'dem-2610-014' });
    expect(analyserChemin('/dossier/nouveau')).toEqual({ nom: 'dossier', id: 'nouveau' });
    expect(analyserChemin('/client/client-dupont')).toEqual({ nom: 'client', id: 'client-dupont' });
  });

  it('décode un identifiant et ne lève jamais d’exception sur un « % » isolé', () => {
    expect(analyserChemin('/dossier/a%20b')).toEqual({ nom: 'dossier', id: 'a b' });
    expect(analyserChemin('/dossier/100%')).toEqual({ nom: 'dossier', id: '100%' });
  });

  it('ouvre Outils sur le stock par défaut et reconnaît chaque section', () => {
    expect(analyserChemin('/outils')).toEqual({ nom: 'outils', section: 'conteneurs' });
    expect(analyserChemin('/outils/connexion')).toEqual({ nom: 'outils', section: 'connexion' });
    expect(analyserChemin('/outils/inconnue')).toEqual({ nom: 'introuvable' });
  });

  it('refuse les chemins inconnus ou trop longs', () => {
    expect(analyserChemin('/nimporte')).toEqual({ nom: 'introuvable' });
    expect(analyserChemin('/dossier')).toEqual({ nom: 'introuvable' });
    expect(analyserChemin('/dossier/a/b')).toEqual({ nom: 'introuvable' });
    expect(analyserChemin('/clients/x')).toEqual({ nom: 'introuvable' });
  });
});

describe('cheminDe', () => {
  const routes: Route[] = [
    { nom: 'afaire' },
    { nom: 'dossiers', vue: 'enCours' },
    { nom: 'dossiers', vue: 'devis' },
    { nom: 'dossier', id: 'dem-1' },
    { nom: 'dossier', id: 'a b/c' },
    { nom: 'clients' },
    { nom: 'client', id: 'client-x' },
    { nom: 'outils', section: 'rotations' },
  ];

  it.each(routes)('est l’inverse de analyserChemin pour %j', (route) => {
    expect(analyserChemin(cheminDe(route))).toEqual(route);
  });

  it('renvoie à l’accueil pour une page introuvable', () => {
    expect(cheminDe({ nom: 'introuvable' })).toBe('/afaire');
  });
});

describe('entreeActive', () => {
  it('rattache chaque page à son entrée de menu', () => {
    expect(entreeActive({ nom: 'dossier', id: 'x' })).toBe('dossiers');
    expect(entreeActive({ nom: 'client', id: 'x' })).toBe('clients');
    expect(entreeActive({ nom: 'outils', section: 'export' })).toBe('outils');
    expect(entreeActive({ nom: 'introuvable' })).toBeNull();
  });
});

describe('normaliserChemin', () => {
  it('complète un chemin vide ou sans barre initiale', () => {
    expect(normaliserChemin('')).toBe('/afaire');
    expect(normaliserChemin('clients')).toBe('/clients');
    expect(normaliserChemin('/clients')).toBe('/clients');
  });
});
