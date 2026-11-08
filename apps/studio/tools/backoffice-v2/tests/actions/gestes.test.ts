/**
 * Règle unique du geste gardé (5.5) et gestes d'expédition : critères 6, 8,
 * 9ter et 9quater (les gestes de la demande sont dans `secours.test.ts`).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  annuler,
  autoriserDepart,
  avancerSuivi,
  declencherPriseEnCharge,
  marquerExpedie,
  marquerLivre,
  marquerReglement,
  reprendre,
  signalerIncident,
} from '../../actions/expedition';
import { creerContexte, creerFauxClient, demandeDoc, dossierDe, expeditionDoc, PEC_COMPLETE } from './fauxClient';

const X = 'expedition-dev-2610-014';

function expeditionSeule(extra = {}, demande = {}) {
  const client = creerFauxClient([demandeDoc({ statut: 4, expeditionRef: 'DEV-2610-014', ...demande }), expeditionDoc(extra)]);
  return { client, dossier: dossierDe(client, 'demande-1', X), ...creerContexte(client) };
}

describe('règle 5.5 : déclencher la prise en charge', () => {
  it('avec un brouillon qui lève les 7 manques : champs et statut dans UN seul patch', async () => {
    const { client, dossier, ctx } = expeditionSeule();
    const r = await declencherPriseEnCharge(ctx, dossier, PEC_COMPLETE);
    expect(r.ok).toBe(true);
    expect(client.journal).toHaveLength(1);
    const e = client.journal[0]!;
    expect(e).toMatchObject({ op: 'patch', id: X, ifRevisionId: 'r-exp-1' });
    expect(e.set).toMatchObject({ ...PEC_COMPLETE, statutPriseEnCharge: 1 });
    expect(e.set?.priseEnChargeLe).toBe('06/11/2026 à 09h00');
    expect(r.ok && r.patchs).toBe(1);
    expect(r.ok && r.champsEnregistres.sort()).toEqual(Object.keys(PEC_COMPLETE).sort());
  });

  it('refuse sans rien écrire quand un manque subsiste', async () => {
    const { client, dossier, ctx } = expeditionSeule();
    const r = await declencherPriseEnCharge(ctx, dossier, { ...PEC_COMPLETE, colisNature: null });
    expect(!r.ok && r.motif).toBe('manques');
    expect(!r.ok && r.manques).toContain('la nature de la marchandise');
    expect(client.journal).toHaveLength(0);
  });

  it('refuse quand le brouillon vide un champ requis alors que le document enregistré est complet', async () => {
    const { client, dossier, ctx } = expeditionSeule(PEC_COMPLETE);
    const r = await declencherPriseEnCharge(ctx, dossier, { destinataireNom: null });
    expect(!r.ok && r.motif).toBe('manques');
    expect(client.journal).toHaveLength(0);
  });

  it('un 409 conserve tout : rien d’écrit, aucun champ déclaré enregistré', async () => {
    const { client, dossier, ctx } = expeditionSeule();
    client.modifierAilleurs(X, { notesExploitation: 'ailleurs' });
    const r = await declencherPriseEnCharge(ctx, dossier, PEC_COMPLETE);
    expect(!r.ok && r.motif).toBe('conflit');
    expect(client.journal).toHaveLength(0);
    expect(client.docs.get(X)?.statutPriseEnCharge).toBe(0);
  });

  it('refuse si le dossier n’est plus à préparer (écran périmé)', async () => {
    const { dossier, ctx, client } = expeditionSeule({ ...PEC_COMPLETE, statutPriseEnCharge: 1 });
    const r = await declencherPriseEnCharge(ctx, dossier, {});
    expect(r.ok).toBe(false);
    expect(client.journal).toHaveLength(0);
  });
});

describe('marquer expédié et règlement', () => {
  it('refuse sans règlement ni dérogation motivée', async () => {
    const { client, dossier, ctx } = expeditionSeule({ ...PEC_COMPLETE, statutPriseEnCharge: 1 });
    const r = await marquerExpedie(ctx, dossier, {});
    expect(!r.ok && r.motif).toBe('manques');
    expect(client.journal).toHaveLength(0);
  });

  it('refuse une dérogation sans motif', async () => {
    const { dossier, ctx } = expeditionSeule({ ...PEC_COMPLETE, statutPriseEnCharge: 1, derogationDepart: true });
    const r = await marquerExpedie(ctx, dossier, {});
    expect(r.ok).toBe(false);
  });

  it('accepte avec le règlement saisi dans le brouillon (évalué sur ce qui est à l’écran)', async () => {
    const { client, dossier, ctx } = expeditionSeule({ ...PEC_COMPLETE, statutPriseEnCharge: 1 });
    const r = await marquerExpedie(ctx, dossier, { reglementRecu: true });
    expect(r.ok).toBe(true);
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]?.set).toMatchObject({ reglementRecu: true, statutPriseEnCharge: 2 });
  });

  it('« Règlement reçu » n’écrit que ses champs, avec la date, et laisse le brouillon à l’appelant', async () => {
    const { client, dossier, ctx } = expeditionSeule({ ...PEC_COMPLETE, statutPriseEnCharge: 1 });
    const r = await marquerReglement(ctx, dossier.expedition!, true);
    expect(r.ok).toBe(true);
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]?.set).toEqual({ reglementRecu: true, reglementRecuLe: '06/11/2026 à 09h00' });
    expect(client.journal[0]?.ifRevisionId).toBe('r-exp-1');
  });

  it('décocher le règlement efface sa date', async () => {
    const { client, dossier, ctx } = expeditionSeule({ reglementRecu: true, reglementRecuLe: '01/11/2026 à 10h00' });
    await marquerReglement(ctx, dossier.expedition!, false);
    expect(client.journal[0]?.set).toEqual({ reglementRecu: false });
    expect(client.journal[0]?.unset).toEqual(['reglementRecuLe']);
  });

  it('« Autoriser le départ » exige un motif et écrit date et auteur', async () => {
    const { client, dossier, ctx } = expeditionSeule();
    expect((await autoriserDepart(ctx, dossier.expedition!, '  ')).ok).toBe(false);
    expect(client.journal).toHaveLength(0);
    const r = await autoriserDepart(ctx, dossier.expedition!, 'Client de confiance');
    expect(r.ok).toBe(true);
    expect(client.journal[0]?.set).toEqual({
      derogationDepart: true,
      derogationMotif: 'Client de confiance',
      derogationLe: '06/11/2026 à 09h00',
      derogationPar: 'Marie',
    });
  });
});

describe('livraison : un seul chemin vers l’étape 4', () => {
  it('marquerLivre écrit l’étape 4 et la prise en charge 3 ensemble', async () => {
    const { client, dossier, ctx, api } = expeditionSeule({ statutPriseEnCharge: 2, etape: 3, derniereEtapeNotifiee: 3 });
    const r = await marquerLivre(ctx, dossier, {}, { notifier: false });
    expect(r.ok).toBe(true);
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]?.set).toMatchObject({ etape: 4, statutPriseEnCharge: 3 });
    expect(api.appels).toHaveLength(0);
  });

  it('avancer le suivi jusqu’à « Livré » passe par le même patch', async () => {
    const { client, dossier, ctx } = expeditionSeule({ statutPriseEnCharge: 2, etape: 2 });
    await avancerSuivi(ctx, dossier, {}, { etape: 4, notifier: false });
    expect(client.journal[0]?.set).toMatchObject({ etape: 4, statutPriseEnCharge: 3 });
  });

  it('avancer d’une étape ordinaire n’écrit que l’étape et l’ETA', async () => {
    const { client, dossier, ctx } = expeditionSeule({ statutPriseEnCharge: 2, etape: 0 });
    const r = await avancerSuivi(ctx, dossier, {}, { etape: 1, eta: '20/11/2026', notifier: false });
    expect(r.ok).toBe(true);
    expect(client.journal[0]?.set).toEqual({ etape: 1, eta: '20/11/2026' });
  });

  it('refuse de reculer par ce chemin', async () => {
    const { dossier, ctx } = expeditionSeule({ statutPriseEnCharge: 2, etape: 2 });
    expect((await avancerSuivi(ctx, dossier, {}, { etape: 1, notifier: false })).ok).toBe(false);
  });

  it('notifie le client après l’écriture ; l’API « ignore » devient dejaPrevenu', async () => {
    const { client, dossier, ctx, api } = expeditionSeule({ statutPriseEnCharge: 2, etape: 0 });
    const r = await avancerSuivi(ctx, dossier, {}, { etape: 1, notifier: true });
    expect(r.ok).toBe(true);
    expect(api.appels).toEqual([{ route: '/api/envoi-expedition', corps: { reference: 'DEV-2610-014' } }]);
    expect(client.journal).toHaveLength(1);
  });

  it('si l’e-mail échoue, l’étape reste avancée et le succès partiel est signalé (jamais rejoué)', async () => {
    const client = creerFauxClient([demandeDoc({ statut: 4 }), expeditionDoc({ statutPriseEnCharge: 2, etape: 0 })]);
    const { ctx } = creerContexte(client, {
      appels: [],
      appeler: async () => ({ ok: false, motif: 'reseau', message: 'hors ligne' }),
    });
    const r = await avancerSuivi(ctx, dossierDe(client, 'demande-1', X), {}, { etape: 1, notifier: true });
    // Un succès partiel, pas un échec : un échec 'cle' serait rejoué sur l'ancienne révision (faux conflit).
    expect(r.ok && r.notificationEchouee?.motif).toBe('reseau');
    expect(client.docs.get(X)?.etape).toBe(1);
  });

  it('sans clé d’envoi, rien n’est écrit : la clé est réclamée avant l’étape', async () => {
    const client = creerFauxClient([demandeDoc({ statut: 4 }), expeditionDoc({ statutPriseEnCharge: 2, etape: 0 })]);
    const { ctx } = creerContexte(client);
    const r = await avancerSuivi({ ...ctx, cleDisponible: () => false }, dossierDe(client, 'demande-1', X), {}, { etape: 1, notifier: true });
    expect(!r.ok && r.motif).toBe('cle');
    expect(client.journal).toHaveLength(0);
    expect(client.docs.get(X)?.etape).toBe(0);
  });

  it('aucun fichier d’actions n’écrit l’étape 4 en dur (grep de critère 9quater)', () => {
    const dossierActions = join(__dirname, '..', '..', 'actions');
    for (const f of readdirSync(dossierActions).filter((n) => n.endsWith('.ts'))) {
      const source = readFileSync(join(dossierActions, f), 'utf-8');
      expect(source, f).not.toMatch(/\betape(Suivi)?:\s*4\b/);
    }
  });
});

describe('incident, annulation, reprise (3.3)', () => {
  it('signalerIncident écrit statutAvantIncident dans le MÊME patch', async () => {
    const { client, dossier, ctx } = expeditionSeule({ statutPriseEnCharge: 1 });
    const r = await signalerIncident(ctx, dossier);
    expect(r.ok).toBe(true);
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]?.set).toEqual({ statutPriseEnCharge: 4, statutAvantIncident: 1 });
  });

  it('annuler fait de même avec le statut 5', async () => {
    const { client, dossier, ctx } = expeditionSeule({ statutPriseEnCharge: 2 });
    await annuler(ctx, dossier);
    expect(client.journal[0]?.set).toEqual({ statutPriseEnCharge: 5, statutAvantIncident: 2 });
  });

  it('un incident posé sur un statut déjà 4 ne réécrit pas statutAvantIncident', async () => {
    const { client, dossier, ctx } = expeditionSeule({ statutPriseEnCharge: 4, statutAvantIncident: 1 });
    await annuler(ctx, dossier);
    expect(client.journal[0]?.set).toEqual({ statutPriseEnCharge: 5 });
  });

  it('reprendre efface statutAvantIncident dans le même patch', async () => {
    const { client, dossier, ctx } = expeditionSeule({ ...PEC_COMPLETE, statutPriseEnCharge: 4, statutAvantIncident: 1 });
    const r = await reprendre(ctx, dossier, {}, 1);
    expect(r.ok).toBe(true);
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]?.set).toEqual({ statutPriseEnCharge: 1 });
    expect(client.journal[0]?.unset).toEqual(['statutAvantIncident']);
  });

  it('reprendre sans choix propose statutAvantIncident quand il existe', async () => {
    const { client, dossier, ctx } = expeditionSeule({ statutPriseEnCharge: 4, statutAvantIncident: 0 });
    const r = await reprendre(ctx, dossier, {}, null);
    expect(r.ok).toBe(true);
    expect(client.journal[0]?.set).toEqual({ statutPriseEnCharge: 0 });
  });

  it('reprendre sans choix sur un dossier sans statutAvantIncident est refusé', async () => {
    const { client, dossier, ctx } = expeditionSeule({ statutPriseEnCharge: 4 });
    const r = await reprendre(ctx, dossier, {}, null);
    expect(r.ok).toBe(false);
    expect(client.journal).toHaveLength(0);
  });

  it('les garde-fous du statut repris s’appliquent (« Prêt » exige les 7 manques levés)', async () => {
    const { client, dossier, ctx } = expeditionSeule({ statutPriseEnCharge: 4 });
    const r = await reprendre(ctx, dossier, {}, 1);
    expect(!r.ok && r.motif).toBe('manques');
    expect(client.journal).toHaveLength(0);
  });

  it('reprendre à « Expédié » exige règlement ou dérogation', async () => {
    const { dossier, ctx } = expeditionSeule({ statutPriseEnCharge: 4 });
    expect((await reprendre(ctx, dossier, {}, 2)).ok).toBe(false);
  });
});
