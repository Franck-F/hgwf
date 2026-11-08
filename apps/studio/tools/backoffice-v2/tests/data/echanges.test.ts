/**
 * Couche données des réponses clients : requêtes, rattachement aux dossiers,
 * lecture du détail (texte et pièces) avec repli sur la version légère.
 */
import { describe, expect, it } from 'vitest';
import { construireDossiers, empreinteEchanges } from '../../data/dossiers';
import { normaliserDonnees } from '../../data/magasin';
import { REQUETE_ECHANGES_DOSSIER, REQUETE_ECOUTE, REQUETE_MAGASIN } from '../../data/requetes';
import { lireDetailDossier } from '../../data/useDossier';
import type { ClientLike } from '../../domaine/contrats';
import type { Echange } from '../../domaine/types';
import { creerFauxClient, demandeDoc, type Doc } from '../actions/fauxClient';

const echangeDoc = (id: string, extra: Record<string, unknown> = {}): Doc =>
  ({
    _id: id,
    _type: 'echange',
    _rev: `r-${id}`,
    reference: 'DEV-2610-014',
    demande: { _type: 'reference', _ref: 'demande-1', _weak: true },
    sens: 'recu',
    de: 'Martin Dupont <martin@example.fr>',
    objet: 'Re : Votre devis',
    texte: 'Voici les dimensions.',
    recuLe: '2026-11-05T14:00:00.000Z',
    lu: false,
    pieces: [{ _key: 'p1', nom: 'photo.jpg', typeMime: 'image/jpeg', taille: 120000, url: 'https://cdn.exemple.invalid/photo.jpg' }],
    ...extra,
  }) as Doc;

describe('requêtes', () => {
  it('la lecture agrégée porte les échanges en version légère (ni texte ni pièces)', () => {
    expect(REQUETE_MAGASIN).toContain('"echanges":');
    const partie = REQUETE_MAGASIN.slice(REQUETE_MAGASIN.indexOf('"echanges":'));
    expect(partie).not.toMatch(/texte|pieces/);
  });
  it('le détail lit le texte, les pièces et leur adresse, sans tenir compte de la casse de la référence', () => {
    expect(REQUETE_ECHANGES_DOSSIER).toContain('lower(reference) in $references');
    expect(REQUETE_ECHANGES_DOSSIER).toContain('fichier.asset->url');
  });
  it('une nouvelle réponse déclenche la relecture (écoute en direct)', () => {
    expect(REQUETE_ECOUTE).toContain('"echange"');
  });
  it('normaliserDonnees tolère une réponse sans échanges', () => {
    expect(normaliserDonnees({}).echanges).toEqual([]);
  });
});

describe('construireDossiers', () => {
  const demande = demandeDoc();
  const legers = [
    { ...echangeDoc('echange-a'), demandeId: 'demande-1' },
    { ...echangeDoc('echange-b', { reference: 'dev-2610-014' }), demandeId: undefined },
    { ...echangeDoc('echange-z', { reference: 'AUTRE' }), demandeId: 'ailleurs' },
  ] as unknown as Echange[];

  it('rattache les réponses à leur dossier, par demande liée ou par référence', () => {
    const [d] = construireDossiers({ demandes: [demande], expeditions: [], echanges: legers });
    expect(d?.echanges?.map((e) => e._id)).toEqual(['echange-a', 'echange-b']);
  });
  it('un dossier sans réponse garde exactement sa forme d’avant', () => {
    const [d] = construireDossiers({ demandes: [demande], expeditions: [], echanges: [] });
    expect(d).toEqual({ id: 'demande-1', demande });
    expect('echanges' in (d ?? {})).toBe(false);
  });
  it('l’empreinte change quand une réponse est lue (révision nouvelle)', () => {
    const avant = construireDossiers({ demandes: [demande], expeditions: [], echanges: legers })[0]!;
    const lues = legers.map((e) => ({ ...e, _rev: `${e._rev}-lu`, lu: true }));
    const apres = construireDossiers({ demandes: [demande], expeditions: [], echanges: lues })[0]!;
    expect(empreinteEchanges(avant)).not.toBe(empreinteEchanges(apres));
  });
});

describe('lireDetailDossier', () => {
  it('ajoute les réponses complètes, pièces jointes comprises', async () => {
    const client = creerFauxClient([demandeDoc(), echangeDoc('echange-a')]);
    const donnees = normaliserDonnees({ demandes: [demandeDoc()] });
    const dossier = await lireDetailDossier(client, donnees, 'demande-1');
    expect(dossier?.echanges).toHaveLength(1);
    expect(dossier?.echanges?.[0]).toMatchObject({ texte: 'Voici les dimensions.', pieces: [{ nom: 'photo.jpg' }] });
  });
  it('sans réponse, le dossier n’a pas de clé echanges', async () => {
    const client = creerFauxClient([demandeDoc()]);
    const dossier = await lireDetailDossier(client, normaliserDonnees({ demandes: [demandeDoc()] }), 'demande-1');
    expect(dossier && 'echanges' in dossier).toBe(false);
  });
  it('si la lecture des réponses échoue, le dossier s’ouvre avec la version légère du magasin', async () => {
    const client = creerFauxClient([demandeDoc()]);
    const base = client.fetch.bind(client);
    client.fetch = (async (q: string, p?: Record<string, unknown>) => {
      if (q.includes('_type == "echange"')) throw new Error('hors ligne');
      return base(q, p);
    }) as ClientLike['fetch'];
    const legers = [{ ...echangeDoc('echange-a'), demandeId: 'demande-1', texte: undefined, pieces: undefined }] as unknown as Echange[];
    const donnees = normaliserDonnees({ demandes: [demandeDoc()], echanges: legers });
    const dossier = await lireDetailDossier(client, donnees, 'demande-1');
    expect(dossier?.echanges?.map((e) => e._id)).toEqual(['echange-a']);
  });
});
