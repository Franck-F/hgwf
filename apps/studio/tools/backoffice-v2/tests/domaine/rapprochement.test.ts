import { describe, expect, it } from 'vitest';
import {
  dossiersDuClient,
  extraireContact,
  lienTel,
  lienWhatsApp,
  memeTelephone,
  normaliserNom,
  normaliserTelephone,
  retrouverDossiersParReferenceOuClient,
  retrouverFichesClientParNomOuEmail,
} from '../../domaine/rapprochement';
import type { ClientFiche } from '../../domaine/types';
import { dossierDemande } from './fabrique';

describe('normaliserTelephone (8.1)', () => {
  it('les écritures d’un même numéro se retrouvent', () => {
    const variantes = ['06 12 34 56 78', '+33 6 12 34 56 78', '0033612345678', '33612345678', '+33 (0)6 12 34 56 78'];
    for (const v of variantes) expect(normaliserTelephone(v)).toBe('612345678');
    for (const a of variantes) for (const b of variantes) expect(memeTelephone(a, b)).toBe(true);
  });
  it('deux numéros différents ne se confondent pas', () => {
    expect(memeTelephone('01 00 00 00 01', '06 00 00 00 01')).toBe(false);
  });
  it('vide et « — » ne correspondent à rien', () => {
    expect(normaliserTelephone('')).toBe('');
    expect(normaliserTelephone('—')).toBe('');
    expect(memeTelephone('', '')).toBe(false);
    expect(memeTelephone('—', '—')).toBe(false);
    expect(memeTelephone('06 12', '06 12')).toBe(false);
  });
});

describe('contact et noms', () => {
  it('extrait e-mail et téléphone de « mail · tél »', () => {
    expect(extraireContact('martin@example.fr · 06 12 34 56 78')).toEqual({
      email: 'martin@example.fr',
      telephone: '06 12 34 56 78',
    });
    expect(extraireContact('06 12 34 56 78')).toEqual({ email: '', telephone: '06 12 34 56 78' });
    expect(extraireContact('')).toEqual({ email: '', telephone: '' });
    expect(extraireContact(undefined)).toEqual({ email: '', telephone: '' });
  });
  it('normalise les noms', () => {
    expect(normaliserNom('  ÉLODIE  Müller ')).toBe('elodie muller');
  });
});

describe('dossiersDuClient (4.6)', () => {
  const client = (extra: Partial<ClientFiche>): ClientFiche => ({ _id: 'c', _rev: 'r', _type: 'clientFiche', ...extra });
  const dossiers = [
    dossierDemande({ clientNom: 'Dupont', email: 'Martin@Example.fr' }, 'a'),
    dossierDemande({ clientNom: 'Dupont Autre', email: 'autre@example.fr' }, 'b'),
    dossierDemande({ clientNom: 'Élodie Durand', email: undefined }, 'c'),
    dossierDemande({ clientNom: 'Dupont', email: 'homonyme@example.fr' }, 'd'),
  ];
  it('par e-mail, sans casse', () => {
    const r = dossiersDuClient(client({ nom: 'Dupont', contact: 'martin@example.fr · 06 12 34 56 78' }), dossiers);
    expect(r.map((x) => x.id)).toEqual(['a']);
  });
  it('par nom normalisé quand l’un des deux n’a pas d’e-mail', () => {
    const r = dossiersDuClient(client({ nom: 'elodie durand' }), dossiers);
    expect(r.map((x) => x.id)).toEqual(['c']);
  });
  it('jamais par « contient »', () => {
    const r = dossiersDuClient(client({ nom: 'Dupont' }), [dossiers[1]!]);
    expect(r).toEqual([]);
  });
});

describe('retrouverDossiersParReferenceOuClient', () => {
  const dossiers = [
    dossierDemande({ reference: 'DEV-2611-001', clientNom: 'Élodie Durand', email: 'elodie@example.fr' }, 'd1'),
    dossierDemande({ reference: 'DEV-2611-002', clientNom: 'Martin Dupont', email: 'martin@example.fr' }, 'd2'),
  ];

  it('retrouve un dossier par numéro de devis ou par nom client normalisé', () => {
    expect(retrouverDossiersParReferenceOuClient('DEV-2611-001', dossiers).map((d) => d.id)).toEqual(['d1']);
    expect(retrouverDossiersParReferenceOuClient('elodie durand', dossiers).map((d) => d.id)).toEqual(['d1']);
  });
});

describe('retrouverFichesClientParNomOuEmail', () => {
  const fiches = [
    { _id: 'c1', _rev: 'r', _type: 'clientFiche' as const, nom: 'Élodie Durand', contact: 'elodie@example.fr · 06 12 34 56 78' },
    { _id: 'c2', _rev: 'r', _type: 'clientFiche' as const, nom: 'Martin Dupont', contact: 'martin@example.fr' },
  ];

  it('retrouve une fiche client depuis le nom ou l’e-mail', () => {
    expect(retrouverFichesClientParNomOuEmail('DEV-2611-001', fiches)).toHaveLength(0);
    expect(retrouverFichesClientParNomOuEmail('elodie durand', fiches).map((c) => c._id)).toEqual(['c1']);
    expect(retrouverFichesClientParNomOuEmail('martin@example.fr', fiches).map((c) => c._id)).toEqual(['c2']);
  });
});

describe('liens', () => {
  it('tel et WhatsApp', () => {
    expect(lienTel('06 12 34 56 78')).toBe('tel:+33612345678');
    expect(lienTel('+221 77 123 45 67')).toBe('tel:+221771234567');
    expect(lienWhatsApp('06 12 34 56 78', 'Bonjour à vous')).toBe(
      'https://wa.me/33612345678?text=Bonjour%20%C3%A0%20vous',
    );
  });
});
