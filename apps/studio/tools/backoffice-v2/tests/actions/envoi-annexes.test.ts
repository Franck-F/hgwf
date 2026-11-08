/**
 * Envois annexes : demande de compléments, aperçu de l'e-mail, notification
 * d'étape (critère 9quinquies), « le client a répondu », suggestion.
 */
import { describe, expect, it, vi } from 'vitest';
import { apercuEnvoi, envoyerComplement } from '../../actions/envoi';
import { notifierEtapeActuelle } from '../../actions/expedition';
import { clientAReponduAuxComplements } from '../../actions/demande';
import { suggererDescription } from '../../actions/suggestion';
import { useGestes } from '../../actions/gestes';
import { creerContexte, creerFauxClient, creerFausseApi, demandeDoc, dossierDe, expeditionDoc, repOk } from './fauxClient';
import type { FauxClient } from './fauxClient';

vi.mock('../../pdf/devisPdf', () => ({
  construireDevisPdf: async () => ({ output: () => 'data:application/pdf;base64,QUJD' }),
}));

const SAISIE = { objet: 'Votre devis HGWF Cargo', message: 'Bonjour Martin,\n\nVoici votre devis.' };
const PRET = { montantHT: 1250, tauxTVA: 0, descriptionPrestation: 'Groupage Le Havre - Dakar' };

/** L'API d'envoi réelle écrit sa trace dans la demande : la `_rev` change sous nos pieds. */
const apiQuiEcrit = (client: FauxClient) =>
  creerFausseApi((route) => {
    if (route === '/api/envoi-complement') {
      client.modifierAilleurs('demande-1', { complementDemandeLe: '06/11/2026 a 09h00', statut: 1 });
    }
    return repOk({ destinataire: 'martin@example.fr' });
  });

function devisPret(extra = {}) {
  const client = creerFauxClient([demandeDoc({ ...PRET, ...extra })]);
  return { client, dossier: dossierDe(client, 'demande-1') };
}

describe('demande de compléments', () => {
  it('envoie le devis provisoire sans poser le statut (l’API le fait)', async () => {
    const client = creerFauxClient([demandeDoc({ statut: 0 })]);
    const { ctx, api } = creerContexte(client, apiQuiEcrit(client));
    const r = await envoyerComplement(ctx, dossierDe(client, 'demande-1'), { notes: 'à rappeler' }, SAISIE);
    expect(r.ok).toBe(true);
    expect(api.appels[0]?.route).toBe('/api/envoi-complement');
    expect(Object.keys(api.appels[0]!.corps).sort()).toEqual(['objet', 'pdfBase64', 'reference', 'texte']);
    const patchs = client.journal.filter((e) => e.op === 'patch');
    expect(patchs).toHaveLength(1);
    expect(patchs[0]?.set).toEqual({ notes: 'à rappeler' });
  });

  it('refuse sans adresse e-mail', async () => {
    const client = creerFauxClient([demandeDoc({ email: undefined, contact: '06 12 34 56 78' })]);
    const { ctx, api } = creerContexte(client);
    const r = await envoyerComplement(ctx, dossierDe(client, 'demande-1'), {}, SAISIE);
    expect(!r.ok && r.motif).toBe('manques');
    expect(api.appels).toHaveLength(0);
  });

  it('rédige le message lui-même quand la fenêtre n’en fournit pas', async () => {
    const client = creerFauxClient([demandeDoc({ statut: 0 })]);
    const { ctx, api } = creerContexte(client, apiQuiEcrit(client));
    await envoyerComplement(ctx, dossierDe(client, 'demande-1'), {}, {} as never);
    expect(String(api.appels[0]?.corps.objet)).toContain('quelques précisions');
    expect(String(api.appels[0]?.corps.texte)).toContain('Bonjour Martin');
  });
});

describe('aperçu de l’e-mail', () => {
  it('devis : demande à l’API en mode aperçu, destinataire lu côté serveur', async () => {
    const { client, dossier } = devisPret();
    const api = creerFausseApi(() => repOk({ destinataire: 'martin@example.fr', objet: 'Votre devis — 1 250,00 € TTC', texte: 'Bonjour Martin,' }));
    const { ctx } = creerContexte(client, api);
    const r = await apercuEnvoi(ctx, dossier, 'devis');
    expect(r.ok && r.apercu).toMatchObject({
      a: 'martin@example.fr',
      pieceJointe: 'Devis-DEV-2610-014.pdf',
      objet: 'Votre devis — 1 250,00 € TTC',
      message: 'Bonjour Martin,',
    });
    expect(api.appels[0]?.corps).toMatchObject({ reference: 'DEV-2610-014', apercu: true });
    expect(client.journal).toHaveLength(0);
  });

  it('devis : refuse si l’écran porte des montants non enregistrés (le texte viendrait de l’ancienne valeur)', async () => {
    const { client, dossier } = devisPret();
    const { ctx, api } = creerContexte(client);
    const effectif = { ...dossier, demande: { ...dossier.demande!, montantHT: 2000 } };
    const r = await apercuEnvoi(ctx, effectif, 'devis');
    expect(!r.ok && r.motif).toBe('refus');
    expect(api.appels).toHaveLength(0);
  });

  it('devis : « perime » si la demande a changé ailleurs', async () => {
    const { client, dossier } = devisPret();
    const { ctx } = creerContexte(client);
    client.modifierAilleurs('demande-1', { montantHT: 4000 });
    const r = await apercuEnvoi(ctx, dossier, 'devis');
    expect(!r.ok && r.motif).toBe('perime');
  });

  it('compléments : texte rédigé localement, aucun appel d’API', async () => {
    const client = creerFauxClient([demandeDoc({ statut: 0 })]);
    const { ctx, api } = creerContexte(client);
    const r = await apercuEnvoi(ctx, dossierDe(client, 'demande-1'), 'complement');
    expect(r.ok && r.apercu.pieceJointe).toBe('Devis-provisoire-DEV-2610-014.pdf');
    expect(r.ok && r.apercu.message).toContain('Bonjour Martin');
    expect(api.appels).toHaveLength(0);
  });
});

describe('notification d’étape (9quinquies)', () => {
  const enRoute = (extra = {}) => {
    const client = creerFauxClient([demandeDoc({ statut: 4 }), expeditionDoc({ statutPriseEnCharge: 2, etape: 2, eta: 'À PLANIFIER', ...extra })]);
    return { client, dossier: dossierDe(client, 'demande-1', 'expedition-dev-2610-014') };
  };

  it('n’écrit aucun champ de statut', async () => {
    const { client, dossier } = enRoute();
    const { ctx, api } = creerContexte(client);
    const r = await notifierEtapeActuelle(ctx, dossier);
    expect(r.ok && r.dejaPrevenu).toBeUndefined();
    expect(api.appels).toEqual([{ route: '/api/envoi-expedition', corps: { reference: 'DEV-2610-014' } }]);
    expect(client.journal).toHaveLength(0);
  });

  it('seule l’ETA est écrite si elle change, jamais le statut ni l’étape', async () => {
    const { client, dossier } = enRoute();
    const { ctx } = creerContexte(client);
    await notifierEtapeActuelle(ctx, dossier, '25/11/2026');
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]?.set).toEqual({ eta: '25/11/2026' });
  });

  it('rend « déjà prévenu » quand l’API répond ignore', async () => {
    const { client, dossier } = enRoute({ derniereEtapeNotifiee: 2 });
    const api = creerFausseApi(() => repOk({ ignore: true, raison: 'étape déjà notifiée' }));
    const { ctx } = creerContexte(client, api);
    const r = await notifierEtapeActuelle(ctx, dossier);
    expect(r.ok && r.dejaPrevenu).toBe(true);
    expect(client.journal).toHaveLength(0);
  });

  it('une panne d’envoi est un échec, sans toucher au dossier', async () => {
    const { client, dossier } = enRoute();
    const api = creerFausseApi(() => ({ ok: false, motif: 'reseau', message: 'hors ligne' }));
    const { ctx } = creerContexte(client, api);
    const r = await notifierEtapeActuelle(ctx, dossier);
    expect(!r.ok && r.motif).toBe('reseau');
    expect(client.journal).toHaveLength(0);
  });
});

describe('autres envois', () => {
  it('« Le client a répondu » ne pose que reponseClientLe', async () => {
    const client = creerFauxClient([demandeDoc({ complementDemandeLe: '02/11/2026 a 10h00' })]);
    const { ctx } = creerContexte(client);
    const r = await clientAReponduAuxComplements(ctx, dossierDe(client, 'demande-1').demande!);
    expect(r.ok).toBe(true);
    expect(client.journal[0]?.set).toEqual({ reponseClientLe: '06/11/2026 à 09h00' });
    expect(client.journal[0]?.ifRevisionId).toBe('r-demande-1');
  });

  it('« Le client a répondu » refuse sans demande de compléments', async () => {
    const client = creerFauxClient([demandeDoc()]);
    const { ctx } = creerContexte(client);
    expect((await clientAReponduAuxComplements(ctx, dossierDe(client, 'demande-1').demande!)).ok).toBe(false);
  });

  it('la suggestion ne demande que la description et ne renvoie que du texte', async () => {
    const client = creerFauxClient([demandeDoc()]);
    const api = creerFausseApi(() => repOk({ suggestion: { texte: 'Transport maritime en groupage.', montantHT: 9999 } }));
    const { ctx } = creerContexte(client, api);
    const r = await suggererDescription(ctx, dossierDe(client, 'demande-1'), {});
    expect(r).toEqual({ ok: true, description: 'Transport maritime en groupage.' });
    expect(api.appels[0]?.corps).toMatchObject({ reference: 'DEV-2610-014', champ: 'descriptionPrestation' });
    expect(client.journal).toHaveLength(0);
  });

  it('useGestes est exporté (hook) ; l’exécution passe par appliquerGeste', () => {
    expect(typeof useGestes).toBe('function');
  });
});
