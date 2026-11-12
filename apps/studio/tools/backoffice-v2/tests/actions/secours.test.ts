/**
 * Gestes de la demande, verrou du dossier, conversion en expédition et nouveau
 * dossier saisi à la main (critères 6, 8, 9sexies).
 */
import { describe, expect, it } from 'vitest';
import { accepter, accepterSansDevis, creerDossierManuel, complementHorsOutil, devisHorsOutil, genererReference, prendreEnCharge } from '../../actions/demande';
import { convertirEnExpedition } from '../../actions/conversion';
import { appliquerGeste } from '../../actions/gestes';
import { creerContexte, creerFauxClient, demandeDoc, dossierDe } from './fauxClient';

describe('gestes de la demande', () => {
  it('prendre en charge : statut 1, brouillon enregistré dans le même patch', async () => {
    const client = creerFauxClient([demandeDoc({ statut: 0 })]);
    const { ctx } = creerContexte(client);
    const r = await prendreEnCharge(ctx, dossierDe(client, 'demande-1'), { notes: 'rappeler' });
    expect(r.ok).toBe(true);
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]?.set).toEqual({ notes: 'rappeler', statut: 1 });
  });

  it('accepter écrit acceptationLe et acceptationPar', async () => {
    const client = creerFauxClient([demandeDoc({ statut: 2, devisEnvoyeLe: '29/10/2026 a 10h00', montantHT: 100, tauxTVA: 0 })]);
    const { ctx } = creerContexte(client);
    await accepter(ctx, dossierDe(client, 'demande-1'), {});
    expect(client.journal[0]?.set).toEqual({ statut: 3, acceptationLe: '06/11/2026 à 09h00', acceptationPar: 'Marie' });
  });

  it('devisHorsOutil écrit ses champs et statut 2 en un patch, jamais devisEnvoyeLe', async () => {
    const client = creerFauxClient([demandeDoc({ montantHT: 1250, tauxTVA: 0, descriptionPrestation: 'Groupage' })]);
    const { ctx } = creerContexte(client);
    const r = await devisHorsOutil(ctx, dossierDe(client, 'demande-1'), {}, { date: '05/11/2026', moyen: 'whatsapp' });
    expect(r.ok).toBe(true);
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]?.set).toEqual({
      statut: 2,
      devisEnvoyeHorsOutilLe: '05/11/2026',
      devisEnvoyeHorsOutilPar: 'Marie',
      devisEnvoyeHorsOutilMoyen: 'whatsapp',
    });
    expect(client.journal[0]?.set).not.toHaveProperty('devisEnvoyeLe');
  });

  it('devisHorsOutil exige un montant mais pas d’e-mail', async () => {
    const client = creerFauxClient([demandeDoc({ email: undefined, descriptionPrestation: 'x' })]);
    const { ctx } = creerContexte(client);
    const r = await devisHorsOutil(ctx, dossierDe(client, 'demande-1'), {}, { date: '05/11/2026', moyen: 'autre' });
    expect(!r.ok && r.manques).toEqual(['le montant HT', 'le taux de TVA']);
  });

  it('devisHorsOutil refuse une date future ou illisible', async () => {
    const client = creerFauxClient([demandeDoc({ montantHT: 10, tauxTVA: 0, descriptionPrestation: 'x' })]);
    const { ctx } = creerContexte(client);
    const d = dossierDe(client, 'demande-1');
    expect((await devisHorsOutil(ctx, d, {}, { date: '20/12/2026', moyen: 'autre' })).ok).toBe(false);
    expect((await devisHorsOutil(ctx, d, {}, { date: 'hier', moyen: 'autre' })).ok).toBe(false);
  });

  it('complementHorsOutil écrit date, moyen, auteur et passe le statut de 0 à 1', async () => {
    const client = creerFauxClient([demandeDoc({ statut: 0 })]);
    const { ctx } = creerContexte(client);
    const r = await complementHorsOutil(ctx, dossierDe(client, 'demande-1'), {}, { date: '05/11/2026', moyen: 'email' });
    expect(r.ok).toBe(true);
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]?.set).toEqual({
      statut: 1,
      complementDemandeLe: '05/11/2026',
      complementDemandeHorsOutil: 'email',
      complementDemandePar: 'Marie',
    });
  });

  it('complementHorsOutil ne touche pas au statut d’une demande déjà en cours', async () => {
    const client = creerFauxClient([demandeDoc({ statut: 1 })]);
    const { ctx } = creerContexte(client);
    await complementHorsOutil(ctx, dossierDe(client, 'demande-1'), {}, { date: '05/11/2026', moyen: 'whatsapp' });
    expect(client.journal[0]?.set).not.toHaveProperty('statut');
  });

  it('complementHorsOutil refuse une date future ou illisible', async () => {
    const client = creerFauxClient([demandeDoc({ statut: 1 })]);
    const { ctx } = creerContexte(client);
    const d = dossierDe(client, 'demande-1');
    expect((await complementHorsOutil(ctx, d, {}, { date: '20/12/2026', moyen: 'email' })).ok).toBe(false);
    expect((await complementHorsOutil(ctx, d, {}, { date: 'hier', moyen: 'email' })).ok).toBe(false);
    expect(client.journal).toHaveLength(0);
  });

  it('accepterSansDevis exige un montant', async () => {
    const client = creerFauxClient([demandeDoc()]);
    const { ctx } = creerContexte(client);
    const sans = await accepterSansDevis(ctx, dossierDe(client, 'demande-1'), {});
    expect(!sans.ok && sans.motif).toBe('manques');
    const avec = await accepterSansDevis(ctx, dossierDe(client, 'demande-1'), { montantHT: 900, tauxTVA: 0 });
    expect(avec.ok).toBe(true);
    expect(client.journal[0]?.set).toMatchObject({ statut: 3, montantHT: 900, tauxTVA: 0, acceptationPar: 'Marie' });
  });

  it('refuse un montant à 0 € pour l’acceptation orale', async () => {
    const client = creerFauxClient([demandeDoc({ montantHT: 0, tauxTVA: 0 })]);
    const { ctx } = creerContexte(client);
    expect((await accepterSansDevis(ctx, dossierDe(client, 'demande-1'), {})).ok).toBe(false);
  });
});

describe('verrou du dossier', () => {
  it('un second geste pendant le premier est refusé', async () => {
    const client = creerFauxClient([demandeDoc({ statut: 0 })]);
    const { ctx } = creerContexte(client);
    const d = dossierDe(client, 'demande-1');
    const [a, b] = await Promise.all([
      appliquerGeste(ctx, d, {}, { type: 'prendreEnCharge' }),
      appliquerGeste(ctx, d, {}, { type: 'prendreEnCharge' }),
    ]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect(client.journal).toHaveLength(1);
  });
});

describe('conversion en expédition (5.2)', () => {
  const accepte = () =>
    creerFauxClient([
      demandeDoc({ statut: 3, destination: 'Dakar', message: 'Départ : Fos / Marseille', contact: 'martin@example.fr · 06 12 34 56 78' }),
    ]);

  it('une seule transaction : expédition, demande, fiche client', async () => {
    const client = accepte();
    const { ctx, revisions } = creerContexte(client);
    const r = await convertirEnExpedition(ctx, dossierDe(client, 'demande-1'), {});
    expect(r.ok).toBe(true);
    expect(client.journal).toHaveLength(1);
    const tx = client.journal[0]!;
    expect(tx.op).toBe('transaction');
    expect(tx.ops?.map((o) => o.op)).toEqual(['createIfNotExists', 'patch', 'create']);
    expect(client.journal.filter((e) => e.op === 'patch')).toHaveLength(0);
    const exp = client.docs.get('expedition-dev-2610-014')!;
    expect(exp).toMatchObject({ trajet: 'Fos / Marseille → Dakar', etape: 0, eta: 'À PLANIFIER', demandeRef: 'DEV-2610-014' });
    expect(client.docs.get('demande-1')).toMatchObject({ statut: 4, expeditionRef: 'DEV-2610-014' });
    expect([...client.docs.values()].filter((d) => d._type === 'clientFiche')).toHaveLength(1);
    // Les révisions de la demande ET de l'expédition sont mémorisées (pas de faux conflit).
    expect(revisions).toContain(client.docs.get('demande-1')?._rev);
    expect(revisions).toContain(exp._rev);
  });

  it('rejouée : une seule expédition, envois incrémenté une seule fois', async () => {
    const client = creerFauxClient([
      demandeDoc({ statut: 3, destination: 'Dakar' }),
      { _id: 'client-1', _type: 'clientFiche', nom: 'Martin Dupont', contact: 'martin@example.fr', envois: 2 },
    ]);
    const { ctx } = creerContexte(client);
    const periode = dossierDe(client, 'demande-1');
    expect((await convertirEnExpedition(ctx, periode, {})).ok).toBe(true);
    // Rejeu avec l'écran périmé : 409, rien n'est écrit une seconde fois.
    const rejeu = await convertirEnExpedition(ctx, periode, {});
    expect(!rejeu.ok && rejeu.motif).toBe('conflit');
    // Rejeu avec un écran à jour : rien à faire.
    const frais = await convertirEnExpedition(ctx, dossierDe(client, 'demande-1'), {});
    expect(frais.ok && frais.patchs).toBe(0);
    expect([...client.docs.values()].filter((d) => d._type === 'expedition')).toHaveLength(1);
    expect(client.docs.get('client-1')?.envois).toBe(3);
    expect(client.journal.filter((e) => e.op === 'transaction')).toHaveLength(1);
  });

  it('retrouve la fiche par e-mail normalisé, sinon par nom, jamais par « contient »', async () => {
    const client = creerFauxClient([
      demandeDoc({ statut: 3, email: 'MARTIN@Example.fr' }),
      { _id: 'c-autre', _type: 'clientFiche', nom: 'Martin', contact: 'autre@example.fr' },
      { _id: 'c-bon', _type: 'clientFiche', nom: 'Quelqu’un', contact: 'martin@example.fr · 06 00' },
    ]);
    const { ctx } = creerContexte(client);
    await convertirEnExpedition(ctx, dossierDe(client, 'demande-1'), {});
    expect(client.docs.get('c-bon')?.envois).toBe(1);
    expect(client.docs.get('c-autre')?.envois).toBeUndefined();
  });

  it('refuse une demande qui n’est pas acceptée', async () => {
    const client = creerFauxClient([demandeDoc({ statut: 2 })]);
    const { ctx } = creerContexte(client);
    const r = await convertirEnExpedition(ctx, dossierDe(client, 'demande-1'), {});
    expect(!r.ok && r.motif).toBe('manques');
    expect(client.journal).toHaveLength(0);
  });

  it('une panne au milieu n’écrit rien (atomique)', async () => {
    const client = accepte();
    const { ctx } = creerContexte(client);
    client.echouerProchaine(new Error('coupure'));
    const r = await convertirEnExpedition(ctx, dossierDe(client, 'demande-1'), {});
    expect(r.ok).toBe(false);
    expect(client.docs.has('expedition-dev-2610-014')).toBe(false);
    expect(client.docs.get('demande-1')?.statut).toBe(3);
  });
});

describe('nouveau dossier saisi à la main', () => {
  it('crée une demande de statut 1, source téléphone, sans appel d’API', async () => {
    const client = creerFauxClient([demandeDoc({ reference: 'DEV-2611-001' }), demandeDoc({ _id: 'd2', reference: 'DEV-2611-007' })]);
    const { ctx, api } = creerContexte(client);
    const r = await creerDossierManuel(ctx, {
      clientNom: 'Awa Diop',
      telephone: '06 12 34 56 78',
      typeEnvoi: 'Groupage maritime',
      destination: 'Dakar',
      volume: '8 m³',
    });
    expect(r.ok && r.dossierId).toBe('demande-dev-2611-008');
    const doc = client.docs.get('demande-dev-2611-008')!;
    expect(doc).toMatchObject({ statut: 1, sourceDemande: 'telephone', reference: 'DEV-2611-008', recueLe: '06/11/2026 à 09h00' });
    expect(client.journal).toHaveLength(1);
    expect(client.journal[0]?.op).toBe('createIfNotExists');
    expect(api.appels).toHaveLength(0);
  });

  it('est idempotent : rejouer avec le même identifiant ne crée pas un second dossier', async () => {
    const client = creerFauxClient([]);
    const { ctx } = creerContexte(client);
    const saisie = { clientNom: 'Awa', email: 'awa@example.fr', typeEnvoi: 'Colis', destination: 'Dakar' };
    const a = await creerDossierManuel(ctx, saisie);
    expect(a.ok && a.dossierId).toBe('demande-dev-2611-001');
    // Le même identifiant, rejoué, ne duplique pas.
    await client.createIfNotExists({ _id: 'demande-dev-2611-001', _type: 'demandeDevis' });
    expect([...client.docs.values()].filter((d) => d._type === 'demandeDevis')).toHaveLength(1);
  });

  it('collision de référence : la seconde personne ne reçoit pas le dossier de la première', async () => {
    const client = creerFauxClient([]);
    const { ctx } = creerContexte(client);
    // Une autre personne a créé DEV-2611-001 entre notre lecture des références et notre écriture.
    await client.createIfNotExists({
      _id: 'demande-dev-2611-001', _type: 'demandeDevis', reference: 'DEV-2611-001', clientNom: 'Premier Client', contact: 'a@x.fr',
      email: 'a@x.fr', typeEnvoi: 'Colis', destination: 'Abidjan',
    });
    // Notre lecture (périmée) ne voit encore aucune référence.
    const lire = client.fetch.bind(client);
    let premiereLecture = true;
    client.fetch = (async (...a: Parameters<typeof lire>) => {
      if (premiereLecture) {
        premiereLecture = false;
        return { demandes: [] } as never;
      }
      return lire(...a);
    }) as typeof client.fetch;
    const r = await creerDossierManuel(ctx, { clientNom: 'Second Client', email: 'b@x.fr', typeEnvoi: 'Colis', destination: 'Dakar' });
    expect(r.ok && r.dossierId).toBe('demande-dev-2611-002');
    expect(client.docs.get('demande-dev-2611-001')?.clientNom).toBe('Premier Client');
    expect(client.docs.get('demande-dev-2611-002')).toMatchObject({ clientNom: 'Second Client', reference: 'DEV-2611-002' });
  });

  it('refuse une saisie incomplète', async () => {
    const client = creerFauxClient([]);
    const { ctx } = creerContexte(client);
    const r = await creerDossierManuel(ctx, { clientNom: '', typeEnvoi: '', destination: '' });
    expect(!r.ok && r.manques).toEqual(['le nom du client', 'un téléphone ou une adresse e-mail', "le type d'envoi", 'la destination']);
    expect(client.journal).toHaveLength(0);
  });

  it('genererReference continue la séquence du mois et ignore les autres formats', () => {
    const ref = genererReference(['DEV-2611-004', 'HGWF-2026-0042', 'DEV-2610-099', undefined], new Date(2026, 10, 6));
    expect(ref).toBe('DEV-2611-005');
    expect(genererReference([], new Date(2027, 0, 3))).toBe('DEV-2701-001');
  });
});
