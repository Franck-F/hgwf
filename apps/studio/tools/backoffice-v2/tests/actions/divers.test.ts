/** Fiches clients, conteneurs, rotations : `ifRevisionId`, suppression gardée, rien d'inventé. */
import { describe, expect, it } from 'vitest';
import { creerClient, modifierClient, supprimerClient } from '../../actions/clients';
import { enregistrerConteneur, enregistrerRotation, supprimerConteneur, supprimerRotation } from '../../actions/referentiels';
import type { ClientFiche, Conteneur, Rotation } from '../../domaine/types';
import { creerContexte, creerFauxClient, type Doc } from './fauxClient';

const FICHE: Doc = { _id: 'c1', _type: 'clientFiche', _rev: 'rc1', nom: 'Dupont', contact: 'a@b.fr · 06 12 34 56 78', destination: 'Dakar' };
const fiche = FICHE as unknown as ClientFiche;

describe('clients', () => {
  it('modifierClient n’écrit que les champs changés, sous ifRevisionId', async () => {
    const client = creerFauxClient([FICHE]);
    const { ctx } = creerContexte(client);
    const r = await modifierClient(ctx, fiche, { nom: 'Dupont', contact: 'a@b.fr · 06 12 34 56 78', destination: 'Abidjan' });
    expect(r.ok).toBe(true);
    expect(client.journal[0]).toMatchObject({ op: 'patch', id: 'c1', ifRevisionId: 'rc1', set: { destination: 'Abidjan' } });
  });

  it('modifierClient efface un champ vidé et refuse un nom vide', async () => {
    const client = creerFauxClient([FICHE]);
    const { ctx } = creerContexte(client);
    expect((await modifierClient(ctx, fiche, { nom: ' ' })).ok).toBe(false);
    await modifierClient(ctx, fiche, { destination: '' });
    expect(client.journal[0]?.unset).toEqual(['destination']);
  });

  it('modifierClient sans changement n’écrit rien', async () => {
    const client = creerFauxClient([FICHE]);
    const { ctx } = creerContexte(client);
    const r = await modifierClient(ctx, fiche, { nom: 'Dupont' });
    expect(r.ok && r.rev).toBe('rc1');
    expect(client.journal).toHaveLength(0);
  });

  it('un 409 sur une fiche devient conflit', async () => {
    const client = creerFauxClient([FICHE]);
    const { ctx } = creerContexte(client);
    client.modifierAilleurs('c1', { destination: 'Lomé' });
    const r = await modifierClient(ctx, fiche, { destination: 'Abidjan' });
    expect(!r.ok && r.motif).toBe('conflit');
  });

  it('creerClient exige un nom et rend l’identifiant', async () => {
    const client = creerFauxClient([]);
    const { ctx, revisions } = creerContexte(client);
    expect((await creerClient(ctx, { nom: '  ' })).ok).toBe(false);
    const r = await creerClient(ctx, { nom: ' Awa Diop ', contact: 'awa@x.fr', destination: '' });
    expect(r.ok && client.docs.has(r.clientId)).toBe(true);
    expect(client.journal[0]?.doc).toMatchObject({ _type: 'clientFiche', nom: 'Awa Diop', contact: 'awa@x.fr' });
    expect(client.journal[0]?.doc).not.toHaveProperty('destination');
    expect(revisions).toHaveLength(1);
  });

  it('supprimerClient refuse si la fiche a changé depuis l’écran', async () => {
    const client = creerFauxClient([FICHE]);
    const { ctx } = creerContexte(client);
    client.modifierAilleurs('c1', { destination: 'Lomé' });
    const r = await supprimerClient(ctx, fiche);
    expect(!r.ok && r.motif).toBe('conflit');
    expect(client.docs.has('c1')).toBe(true);
  });

  it('supprimerClient supprime la fiche à jour, et un second appel réussit encore', async () => {
    const client = creerFauxClient([FICHE]);
    const { ctx } = creerContexte(client);
    expect((await supprimerClient(ctx, fiche)).ok).toBe(true);
    expect(client.docs.has('c1')).toBe(false);
    expect((await supprimerClient(ctx, fiche)).ok).toBe(true);
  });
});

describe('conteneurs et rotations', () => {
  it('crée un conteneur sans écrire de champ vide', async () => {
    const client = creerFauxClient([]);
    const { ctx } = creerContexte(client);
    const r = await enregistrerConteneur(ctx, { _type: 'conteneurOccasion', reference: 'CTN-20-130', taille: '20', lieu: '', statut: 0 });
    expect(r.ok).toBe(true);
    expect(client.journal[0]?.doc).toEqual({ _type: 'conteneurOccasion', reference: 'CTN-20-130', taille: '20', statut: 0 });
  });

  it('modifie un conteneur sous ifRevisionId (le statut 0 est une vraie valeur)', async () => {
    const client = creerFauxClient([{ _id: 'k1', _type: 'conteneurOccasion', _rev: 'rk1', reference: 'A', statut: 2 }]);
    const { ctx } = creerContexte(client);
    const r = await enregistrerConteneur(ctx, { _id: 'k1', _rev: 'rk1', _type: 'conteneurOccasion', statut: 0 });
    expect(r.ok).toBe(true);
    expect(client.journal[0]).toMatchObject({ id: 'k1', ifRevisionId: 'rk1', set: { statut: 0 } });
  });

  it('refuse de modifier sans révision connue', async () => {
    const client = creerFauxClient([{ _id: 'k1', _type: 'conteneurOccasion', _rev: 'rk1' }]);
    const { ctx } = creerContexte(client);
    expect((await enregistrerConteneur(ctx, { _id: 'k1', reference: 'B' })).ok).toBe(false);
    expect(client.journal).toHaveLength(0);
  });

  it('une rotation ne reçoit jamais de NaN, et un remplissage non touché reste intact', async () => {
    const client = creerFauxClient([{ _id: 'r1', _type: 'rotation', _rev: 'rr1', nom: 'Dakar', remplissage: 60 }]);
    const { ctx } = creerContexte(client);
    expect((await enregistrerRotation(ctx, { _id: 'r1', _rev: 'rr1', remplissage: Number.NaN })).ok).toBe(false);
    const r = await enregistrerRotation(ctx, { _id: 'r1', _rev: 'rr1', nom: 'Dakar 2', remplissage: undefined });
    expect(r.ok).toBe(true);
    expect(client.journal[0]?.set).toEqual({ nom: 'Dakar 2' });
  });

  it('supprime un conteneur et une rotation à jour', async () => {
    const client = creerFauxClient([
      { _id: 'k1', _type: 'conteneurOccasion', _rev: 'rk1' },
      { _id: 'r1', _type: 'rotation', _rev: 'rr1' },
    ]);
    const { ctx } = creerContexte(client);
    expect((await supprimerConteneur(ctx, { _id: 'k1', _rev: 'rk1' } as Conteneur)).ok).toBe(true);
    expect((await supprimerRotation(ctx, { _id: 'r1', _rev: 'rr1' } as Rotation)).ok).toBe(true);
    expect(client.journal.map((e) => e.op)).toEqual(['delete', 'delete']);
  });
});
