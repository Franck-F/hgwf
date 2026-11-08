/**
 * Règles d'écriture (critères 6 et 7) : `ifRevisionId` partout, 409 vers
 * `conflit`, jamais de NaN, montant et taux ensemble, champs vidés effacés.
 */
import { describe, expect, it } from 'vitest';
import { ecrireDossier, ecrirePatch, identifiantInterdit, preparerEcriture } from '../../actions/ecriture';
import { creerContexte, creerFauxClient, demandeDoc, dossierDe, expeditionDoc, Erreur409 } from './fauxClient';

function monde() {
  const client = creerFauxClient([demandeDoc({ montantHT: 1000, tauxTVA: 20, notes: 'a effacer' }), expeditionDoc()]);
  return { client, ...creerContexte(client) };
}

describe('preparerEcriture', () => {
  it('range les champs vidés dans unset, jamais set({x: undefined})', () => {
    const p = preparerEcriture({ notes: null, delaiEstime: '' , clientNom: 'Dupont' });
    expect(p.ok && p.set).toEqual({ clientNom: 'Dupont' });
    expect(p.ok && p.unset.sort()).toEqual(['delaiEstime', 'notes']);
  });

  it('refuse un NaN, même caché dans un supplément', () => {
    expect(preparerEcriture({ colisPoids: Number.NaN }).ok).toBe(false);
    expect(preparerEcriture({}, { montantHT: Number.POSITIVE_INFINITY }).ok).toBe(false);
  });

  it('accepte 0 € et 0 % de TVA (le zéro est une vraie valeur)', () => {
    const p = preparerEcriture({ montantHT: 0, tauxTVA: 0 });
    expect(p.ok && p.set).toEqual({ montantHT: 0, tauxTVA: 0 });
  });

  it('refuse un montant sans taux, et un taux sans montant', () => {
    expect(preparerEcriture({ montantHT: 500 }, {}, { _id: 'x' }).ok).toBe(false);
    expect(preparerEcriture({ tauxTVA: 20 }, {}, { _id: 'x' }).ok).toBe(false);
    // L'autre moitié est déjà dans le document : le couple est complet.
    expect(preparerEcriture({ montantHT: 500 }, {}, { tauxTVA: 20 }).ok).toBe(true);
  });

  it('refuse d’effacer le taux en gardant le montant', () => {
    expect(preparerEcriture({ tauxTVA: null }, {}, { montantHT: 100, tauxTVA: 20 }).ok).toBe(false);
  });

  it('ignore SIRET et TVA intracom si le client n’est pas professionnel', () => {
    const p = preparerEcriture(
      { facturationSiret: '123', facturationTvaIntracom: 'FR1', facturationNom: 'X' },
      {},
      { facturationType: 'particulier' },
    );
    expect(p.ok && p.set).toEqual({ facturationNom: 'X' });
  });

  it('refuse un champ système', () => {
    expect(preparerEcriture({ _rev: 'x' }).ok).toBe(false);
  });
});

describe('ecrirePatch', () => {
  it('porte ifRevisionId et n’écrit que les champs modifiés', async () => {
    const { client, ctx, revisions } = monde();
    const d = dossierDe(client, 'demande-1');
    const r = await ecrirePatch(ctx, 'demande-1', d.demande!._rev, { delaiEstime: '3 semaines', notes: null }, {}, d.demande);
    expect(r.ok).toBe(true);
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]).toMatchObject({
      op: 'patch',
      id: 'demande-1',
      ifRevisionId: 'r-demande-1',
      set: { delaiEstime: '3 semaines' },
      unset: ['notes'],
    });
    // La nouvelle révision est mémorisée : une relecture ne sera pas prise pour un conflit.
    expect(revisions).toHaveLength(1);
    expect(client.docs.get('demande-1')?.notes).toBeUndefined();
  });

  it('porte aussi ifRevisionId pour une expédition', async () => {
    const { client, ctx } = monde();
    await ecrirePatch(ctx, 'expedition-dev-2610-014', 'r-exp-1', { colisNature: 'Vêtements' });
    expect(client.journal[0]?.ifRevisionId).toBe('r-exp-1');
  });

  it('traduit un 409 en conflit, sans rien présenter comme enregistré', async () => {
    const { client, ctx, revisions } = monde();
    client.modifierAilleurs('demande-1', { notes: 'quelqu’un d’autre' });
    const r = await ecrirePatch(ctx, 'demande-1', 'r-demande-1', { delaiEstime: '2 semaines' });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.motif).toBe('conflit');
    expect(client.journal).toHaveLength(0);
    expect(revisions).toHaveLength(0);
    expect(client.docs.get('demande-1')?.delaiEstime).toBeUndefined();
  });

  it('traduit une panne réseau et garde un message exploitable', async () => {
    const { client, ctx } = monde();
    client.echouerProchaine(new Error('Failed to fetch'));
    const r = await ecrirePatch(ctx, 'demande-1', 'r-demande-1', { delaiEstime: '2 semaines' });
    expect(!r.ok && r.motif).toBe('reseau');
  });

  it('refuse d’écrire sur system.* ou drafts.*', async () => {
    const { ctx, client } = monde();
    expect(identifiantInterdit('system.retention')).toBe(true);
    expect(identifiantInterdit('drafts.demande-1')).toBe(true);
    const r = await ecrirePatch(ctx, 'drafts.demande-1', 'x', { notes: 'a' });
    expect(r.ok).toBe(false);
    expect(client.journal).toHaveLength(0);
  });

  it('n’écrit rien quand il n’y a rien à écrire', async () => {
    const { client, ctx } = monde();
    const r = await ecrirePatch(ctx, 'demande-1', 'r-demande-1', {});
    expect(r.ok).toBe(true);
    expect(client.journal).toHaveLength(0);
  });

  it('un second clic pendant l’écriture est refusé (verrou)', async () => {
    const { client, ctx } = monde();
    const [a, b] = await Promise.all([
      ecrirePatch(ctx, 'demande-1', 'r-demande-1', { delaiEstime: 'A' }),
      ecrirePatch(ctx, 'demande-1', 'r-demande-1', { delaiEstime: 'B' }),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect(client.journal).toHaveLength(1);
  });
});

describe('ecrireDossier', () => {
  it('écrit en une transaction quand le brouillon touche la demande ET l’expédition', async () => {
    const { client, ctx } = monde();
    const dossier = dossierDe(client, 'demande-1', 'expedition-dev-2610-014');
    const r = await ecrireDossier(ctx, dossier, { notes: 'note', colisNature: 'Vélos' }, 'expedition', { statutPriseEnCharge: 1 });
    expect(r.ok).toBe(true);
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]?.op).toBe('transaction');
    expect(client.journal[0]?.ops).toHaveLength(2);
  });

  it('annule tout si l’un des deux documents a changé (atomique)', async () => {
    const { client, ctx } = monde();
    const dossier = dossierDe(client, 'demande-1', 'expedition-dev-2610-014');
    client.modifierAilleurs('demande-1', { notes: 'ailleurs' });
    const r = await ecrireDossier(ctx, dossier, { notes: 'note', colisNature: 'Vélos' }, 'expedition', { statutPriseEnCharge: 1 });
    expect(!r.ok && r.motif).toBe('conflit');
    expect(client.docs.get('expedition-dev-2610-014')?.colisNature).toBeUndefined();
    expect(Erreur409).toBeDefined();
  });
});
