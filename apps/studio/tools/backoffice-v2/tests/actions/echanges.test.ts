/**
 * « Marquer comme lu » : n'écrit que `lu = true`, sur les échanges non lus,
 * en une écriture (patch, ou transaction pour plusieurs).
 */
import { describe, expect, it } from 'vitest';
import { marquerEchangesLus } from '../../actions/echanges';
import type { Echange } from '../../domaine/types';
import { creerContexte, creerFauxClient, type Doc } from './fauxClient';

const doc = (id: string, extra: Partial<Echange> = {}): Echange => ({
  _id: id,
  _rev: `r-${id}`,
  _type: 'echange',
  reference: 'DEV-2610-014',
  de: 'Martin <martin@example.fr>',
  lu: false,
  ...extra,
});

describe('marquerEchangesLus', () => {
  it('une réponse : un patch qui ne pose que lu = true', async () => {
    const client = creerFauxClient([doc('echange-a') as unknown as Doc]);
    const { ctx, revisions } = creerContexte(client);
    const r = await marquerEchangesLus(ctx, [doc('echange-a')]);
    expect(r.ok).toBe(true);
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]).toMatchObject({ op: 'patch', id: 'echange-a', set: { lu: true }, unset: [] });
    expect(client.docs.get('echange-a')?.lu).toBe(true);
    expect(revisions).toHaveLength(1);
  });

  it('plusieurs réponses : une seule transaction, les réponses déjà lues sont ignorées', async () => {
    const client = creerFauxClient([doc('a'), doc('b'), doc('c', { lu: true })] as unknown as Doc[]);
    const { ctx } = creerContexte(client);
    const r = await marquerEchangesLus(ctx, [doc('a'), doc('b'), doc('c', { lu: true })]);
    expect(r.ok && r.message).toBe('2 réponses marquées comme lues.');
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]?.op).toBe('transaction');
    expect(client.journal[0]?.ops?.map((o) => o.id)).toEqual(['a', 'b']);
    expect(client.docs.get('a')?.lu).toBe(true);
    expect(client.docs.get('b')?.lu).toBe(true);
  });

  it('tout est déjà lu : aucune écriture', async () => {
    const client = creerFauxClient([doc('a', { lu: true }) as unknown as Doc]);
    const { ctx } = creerContexte(client);
    const r = await marquerEchangesLus(ctx, [doc('a', { lu: true })]);
    expect(r).toMatchObject({ ok: true, patchs: 0 });
    expect(client.journal).toHaveLength(0);
  });

  it('un échec d’écriture est annoncé, jamais présenté comme enregistré', async () => {
    const client = creerFauxClient([doc('a') as unknown as Doc]);
    client.echouerProchaine(new Error('hors ligne'));
    const { ctx } = creerContexte(client);
    const r = await marquerEchangesLus(ctx, [doc('a')]);
    expect(r).toMatchObject({ ok: false, motif: 'reseau' });
    expect(client.docs.get('a')?.lu).toBe(false);
  });

  it('refuse un document système', async () => {
    const client = creerFauxClient([]);
    const { ctx } = creerContexte(client);
    const r = await marquerEchangesLus(ctx, [doc('drafts.echange-a')]);
    expect(r).toMatchObject({ ok: false, motif: 'refus' });
  });
});
