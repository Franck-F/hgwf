/**
 * Envoi du devis et ses réparations (critères 9, 9bis, 9quinquies), aperçu,
 * compléments, suggestion et notification d'étape.
 */
import { describe, expect, it, vi } from 'vitest';
import { actionPrincipale } from '../../domaine/actionPrincipale';
import { phaseDe } from '../../domaine/phases';
import { apercuEnvoi, envoyerComplement, envoyerDevis, terminerEnvoi } from '../../actions/envoi';
import { notifierEtapeActuelle } from '../../actions/expedition';
import { clientAReponduAuxComplements } from '../../actions/demande';
import { suggererDescription } from '../../actions/suggestion';
import { useGestes } from '../../actions/gestes';
import { creerContexte, creerFauxClient, creerFausseApi, demandeDoc, dossierDe, expeditionDoc, repOk, Erreur409 } from './fauxClient';
import type { FauxClient, GestionnaireApi } from './fauxClient';

// jsPDF est lourd et inutile ici : le PDF n'est qu'une pièce jointe opaque.
vi.mock('../../pdf/devisPdf', () => ({
  construireDevisPdf: async () => ({ output: () => 'data:application/pdf;base64,QUJD' }),
}));

const SAISIE = { objet: 'Votre devis HGWF Cargo', message: 'Bonjour Martin,\n\nVoici votre devis.' };
const PRET = { montantHT: 1250, tauxTVA: 0, descriptionPrestation: 'Groupage Le Havre - Dakar' };

/** L'API d'envoi réelle écrit `devisEnvoyeLe` dans la demande : la `_rev` change sous nos pieds. */
function gestionnaireEcrivant(client: FauxClient, avecTrace = true): GestionnaireApi {
  return (route) => {
    if (route === '/api/envoi-devis') {
      if (avecTrace) client.modifierAilleurs('demande-1', { devisEnvoyeLe: '06/11/2026 a 09h00', devisEnvoyeA: 'martin@example.fr' });
      return repOk({ destinataire: 'martin@example.fr' });
    }
    if (route === '/api/envoi-complement') {
      client.modifierAilleurs('demande-1', { complementDemandeLe: '06/11/2026 a 09h00', statut: 1 });
      return repOk({ destinataire: 'martin@example.fr' });
    }
    return repOk({ destinataire: 'martin@example.fr' });
  };
}

const apiQuiEcrit = (client: FauxClient, avecTrace = true) => creerFausseApi(gestionnaireEcrivant(client, avecTrace));

function devisPret(extra = {}) {
  const client = creerFauxClient([demandeDoc({ ...PRET, ...extra })]);
  return { client, dossier: dossierDe(client, 'demande-1') };
}

describe('envoyerDevis', () => {
  it('enregistre le brouillon, envoie, puis pose le statut 2 sur la révision RELUE (9bis d)', async () => {
    const { client, dossier } = devisPret({ montantHT: undefined, tauxTVA: undefined });
    const { ctx, api } = creerContexte(client, apiQuiEcrit(client));
    const revAvant = dossier.demande!._rev;
    const r = await envoyerDevis(ctx, dossier, { montantHT: 1250, tauxTVA: 0 }, SAISIE);
    expect(r.ok).toBe(true);
    expect(r.ok && r.statutACorriger).toBeUndefined();
    expect(r.ok && r.message).toBe('Devis envoyé à martin@example.fr.');
    // Deux patchs : brouillon (rev du chargement), puis statut 2 (rev relue après l'API).
    const patchs = client.journal.filter((e) => e.op === 'patch');
    expect(patchs).toHaveLength(2);
    expect(patchs[0]).toMatchObject({ ifRevisionId: revAvant, set: { montantHT: 1250, tauxTVA: 0 } });
    expect(patchs[1]?.set).toEqual({ statut: 2 });
    expect(patchs[1]?.ifRevisionId).not.toBe(revAvant);
    expect(patchs[1]?.ifRevisionId).not.toBe(patchs[0]?.ifRevisionId);
    expect(client.docs.get('demande-1')?.statut).toBe(2);
    // Le corps de l'API ne contient pas de destinataire : l'API le relit dans Sanity.
    const corps = api.appels[0]!.corps;
    expect(api.appels[0]!.route).toBe('/api/envoi-devis');
    expect(Object.keys(corps).sort()).toEqual(['ficheId', 'objet', 'pdfBase64', 'reference', 'texte']);
    expect(corps).toMatchObject({ reference: 'DEV-2610-014', pdfBase64: 'QUJD', objet: SAISIE.objet, texte: SAISIE.message });
  });

  it('refuse si le devis est incomplet, sans rien écrire ni envoyer', async () => {
    const { client, dossier } = devisPret({ descriptionPrestation: '' });
    const { ctx, api } = creerContexte(client, apiQuiEcrit(client));
    const r = await envoyerDevis(ctx, dossier, {}, SAISIE);
    expect(!r.ok && r.motif).toBe('manques');
    expect(client.journal).toHaveLength(0);
    expect(api.appels).toHaveLength(0);
  });

  it('refuse un devis à 0 € (accepté en saisie, refusé à l’envoi)', async () => {
    const { client, dossier } = devisPret({ montantHT: 0, tauxTVA: 0 });
    const { ctx, api } = creerContexte(client, apiQuiEcrit(client));
    const r = await envoyerDevis(ctx, dossier, {}, SAISIE);
    expect(!r.ok && r.motif).toBe('manques');
    expect(api.appels).toHaveLength(0);
  });

  it('demandePerimee bloque l’envoi si la demande a changé ailleurs', async () => {
    const { client, dossier } = devisPret();
    const { ctx, api } = creerContexte(client, apiQuiEcrit(client));
    client.modifierAilleurs('demande-1', { montantHT: 9999 });
    // L'écran porte encore l'ancienne révision : l'enregistrement du brouillon vide échoue-t-il ? Non : rien à écrire.
    const r = await envoyerDevis(ctx, dossier, {}, SAISIE);
    expect(!r.ok && r.motif).toBe('perime');
    expect(api.appels).toHaveLength(0);
  });

  it('le brouillon est écrit avant l’envoi, un 409 l’arrête avant tout e-mail', async () => {
    const { client, dossier } = devisPret();
    const { ctx, api } = creerContexte(client, apiQuiEcrit(client));
    client.modifierAilleurs('demande-1', { notes: 'ailleurs' });
    const r = await envoyerDevis(ctx, dossier, { delaiEstime: '3 semaines' }, SAISIE);
    expect(!r.ok && r.motif).toBe('conflit');
    expect(api.appels).toHaveLength(0);
  });

  it('une clé refusée (401) est rendue telle quelle, rien n’est posé', async () => {
    const { client, dossier } = devisPret();
    const api = creerFausseApi(() => ({ ok: false, motif: 'cle', message: 'clé refusée' }));
    const { ctx } = creerContexte(client, api);
    const r = await envoyerDevis(ctx, dossier, {}, SAISIE);
    expect(!r.ok && r.motif).toBe('cle');
    expect(client.docs.get('demande-1')?.statut).toBe(1);
  });
});

describe('échec ambigu de l’API et clé absente (revue)', () => {
  it('coupure APRÈS le départ du message : la demande relue le prouve, le statut est posé, pas de double envoi', async () => {
    const { client, dossier } = devisPret();
    const api = creerFausseApi(() => {
      client.modifierAilleurs('demande-1', { devisEnvoyeLe: '06/11/2026 a 09h00', devisEnvoyeA: 'martin@example.fr' });
      return { ok: false, motif: 'reseau', message: 'délai dépassé' };
    });
    const { ctx } = creerContexte(client, api);
    const r = await envoyerDevis(ctx, dossier, {}, SAISIE);
    expect(r.ok).toBe(true);
    expect(client.docs.get('demande-1')?.statut).toBe(2);
    expect(api.appels).toHaveLength(1);
  });

  it('coupure sans trace d’envoi : l’échec dit que le message est peut-être parti et signale l’écriture déjà faite', async () => {
    const { client, dossier } = devisPret({ montantHT: undefined, tauxTVA: undefined });
    const api = creerFausseApi(() => ({ ok: false, motif: 'reseau', message: 'hors ligne' }));
    const { ctx } = creerContexte(client, api);
    const r = await envoyerDevis(ctx, dossier, { montantHT: 1250, tauxTVA: 0 }, SAISIE);
    expect(!r.ok && r.motif).toBe('reseau');
    // Le brouillon est enregistré : l'écran doit relire le dossier et vider ce brouillon.
    expect(!r.ok && r.ecritureFaite).toBe(true);
    expect(!r.ok && r.champsEnregistres).toEqual(expect.arrayContaining(['montantHT']));
    expect(client.docs.get('demande-1')?.statut).toBe(1);
  });

  it('sans clé : la clé est réclamée avant d’écrire le brouillon (aucun rejeu sur une révision périmée)', async () => {
    const { client, dossier } = devisPret({ montantHT: undefined, tauxTVA: undefined });
    const { ctx, api } = creerContexte(client, apiQuiEcrit(client));
    const r = await envoyerDevis({ ...ctx, cleDisponible: () => false }, dossier, { montantHT: 1250, tauxTVA: 0 }, SAISIE);
    expect(!r.ok && r.motif).toBe('cle');
    expect(!r.ok && r.ecritureFaite).toBeUndefined();
    expect(client.journal).toHaveLength(0);
    expect(api.appels).toHaveLength(0);
  });
});

describe('Devis parti, statut à corriger (9bis a, b, c)', () => {
  function secondPatchEnEchec() {
    const { client, dossier } = devisPret();
    const ecrivant = gestionnaireEcrivant(client);
    // Le 409 tombe sur le second patch (statut 2), pas sur le brouillon : il est armé pendant l'appel d'API.
    const api = creerFausseApi((route, corps) => {
      const rep = ecrivant(route, corps);
      client.echouerProchaine(new Erreur409('conflit simulé'));
      return rep;
    });
    return { client, dossier, ...creerContexte(client, api) };
  }

  it('(a) si le second patch échoue : état devisPartiStatutACorriger, action « terminerEnvoi », jamais « envoyerDevis »', async () => {
    const { client, dossier, ctx } = secondPatchEnEchec();
    const r = await envoyerDevis(ctx, dossier, {}, SAISIE);
    expect(r.ok && r.statutACorriger).toBe(true);
    const apres = dossierDe(client, 'demande-1');
    expect(apres.demande?.statut).toBe(1);
    expect(apres.demande?.devisEnvoyeLe).toBeTruthy();
    expect(phaseDe(apres)).toBe('devisPartiStatutACorriger');
    const action = actionPrincipale(apres, {});
    expect(action.id).toBe('terminerEnvoi');
    expect(action.id).not.toBe('envoyerDevis');
    expect(action.ouvre).toBeUndefined();
  });

  it('(b) terminerEnvoi n’appelle aucune route d’e-mail, relit la _rev et écrit statut 2 sous ifRevisionId', async () => {
    const { client, dossier, ctx, api } = secondPatchEnEchec();
    await envoyerDevis(ctx, dossier, {}, SAISIE);
    const appelsAvant = api.appels.length;
    const revAvant = client.docs.get('demande-1')?._rev;
    const r = await terminerEnvoi(ctx, dossierDe(client, 'demande-1'));
    expect(r.ok).toBe(true);
    expect(api.appels).toHaveLength(appelsAvant);
    const dernier = client.journal.at(-1)!;
    expect(dernier).toMatchObject({ op: 'patch', ifRevisionId: revAvant, set: { statut: 2 } });
    expect(client.docs.get('demande-1')?.statut).toBe(2);
  });

  it('(b) même avec un écran périmé, terminerEnvoi relit la révision actuelle', async () => {
    const { client, dossier, ctx } = secondPatchEnEchec();
    await envoyerDevis(ctx, dossier, {}, SAISIE);
    const ecranPerime = dossierDe(client, 'demande-1');
    client.modifierAilleurs('demande-1', { notes: 'ajoutée entre-temps' });
    const r = await terminerEnvoi(ctx, ecranPerime);
    expect(r.ok).toBe(true);
    expect(client.docs.get('demande-1')?.statut).toBe(2);
  });

  it('(b) un 409 sur le statut est rejoué une fois après relecture', async () => {
    const { client, dossier, ctx } = secondPatchEnEchec();
    await envoyerDevis(ctx, dossier, {}, SAISIE);
    client.echouerProchaine(new Erreur409('encore'));
    const unEchec = await terminerEnvoi(ctx, dossierDe(client, 'demande-1'));
    expect(unEchec.ok).toBe(true);
  });

  it('(c) rejoué : un seul patch effectif', async () => {
    const { client, dossier, ctx } = secondPatchEnEchec();
    await envoyerDevis(ctx, dossier, {}, SAISIE);
    const avant = client.journal.length;
    expect((await terminerEnvoi(ctx, dossierDe(client, 'demande-1'))).ok).toBe(true);
    const rejeu = await terminerEnvoi(ctx, dossierDe(client, 'demande-1'));
    expect(rejeu.ok && rejeu.patchs).toBe(0);
    expect(client.journal.length - avant).toBe(1);
  });

  it('terminerEnvoi refuse un dossier qui n’a jamais envoyé de devis', async () => {
    const { client, dossier } = devisPret();
    const { ctx } = creerContexte(client);
    const r = await terminerEnvoi(ctx, dossier);
    expect(r.ok).toBe(false);
    expect(client.journal).toHaveLength(0);
  });

  it('si l’API n’a pas écrit sa trace, l’outil pose devisEnvoyeLe avec le statut', async () => {
    const { client, dossier } = devisPret();
    const { ctx } = creerContexte(client, apiQuiEcrit(client, false));
    const r = await envoyerDevis(ctx, dossier, {}, SAISIE);
    expect(r.ok).toBe(true);
    expect(client.docs.get('demande-1')).toMatchObject({ statut: 2, devisEnvoyeLe: '06/11/2026 à 09h00', devisEnvoyeA: 'martin@example.fr' });
  });

  it('renvoyer un devis déjà enregistré ne réécrit pas le statut', async () => {
    const { client } = devisPret({ statut: 2, devisEnvoyeLe: '29/10/2026 a 10h00' });
    const { ctx } = creerContexte(client, apiQuiEcrit(client, false));
    const r = await envoyerDevis(ctx, dossierDe(client, 'demande-1'), {}, SAISIE);
    expect(r.ok && r.patchs).toBe(0);
    expect(client.journal).toHaveLength(0);
  });
});
