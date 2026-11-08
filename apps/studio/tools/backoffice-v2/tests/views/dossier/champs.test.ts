import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContexteEcriture } from '../../../domaine/contrats';
import { dossierDemande, dossierExpedition } from '../../domaine/fabrique';

const ecrireDossier = vi.hoisted(() => vi.fn());
vi.mock('../../../actions/ecriture', () => ({ ecrireDossier }));

import { repartirBrouillon } from '../../../views/Dossier/champsDossier';
import { enregistrerBrouillon } from '../../../views/Dossier/enregistrement';
import { autresDossiers, ficheDuDossier } from '../../../views/Dossier/autresDossiers';

const ctx = {} as ContexteEcriture;

beforeEach(() => ecrireDossier.mockReset());

describe('repartirBrouillon', () => {
  it('envoie les champs d’expédition à l’expédition et le reste à la demande', () => {
    const dossier = dossierExpedition({ expediteurNom: 'Ancien' }, { statut: 4 });
    const r = repartirBrouillon(dossier, { expediteurNom: 'Nouveau', notes: 'à rappeler', numeroFacture: 'F-1' });
    expect(r.expedition).toEqual({ expediteurNom: 'Nouveau' });
    expect(r.demande).toEqual({ notes: 'à rappeler', numeroFacture: 'F-1' });
  });

  it('ne garde que les champs réellement modifiés', () => {
    const dossier = dossierDemande({ notes: 'déjà là', montantHT: 100 });
    const r = repartirBrouillon(dossier, { notes: 'déjà là', montantHT: 200 });
    expect(r.demande).toEqual({ montantHT: 200 });
  });

  it('un champ vidé (null) d’un document qui l’avait reste dans le patch', () => {
    const dossier = dossierDemande({ notes: 'à effacer' });
    expect(repartirBrouillon(dossier, { notes: null }).demande).toEqual({ notes: null });
  });

  it('une expédition seule reçoit tous les champs', () => {
    const dossier = dossierExpedition({}, null);
    const r = repartirBrouillon(dossier, { notesExploitation: 'x', trajet: 'Le Havre → Dakar' });
    expect(r.expedition).toEqual({ notesExploitation: 'x', trajet: 'Le Havre → Dakar' });
    expect(r.demande).toEqual({});
  });

  it('un champ d’expédition sans expédition n’atterrit jamais sur la demande', () => {
    const dossier = dossierDemande({});
    const r = repartirBrouillon(dossier, { expediteurNom: 'Perdu' });
    expect(r.demande).toEqual({});
    expect(r.expedition).toEqual({});
  });
});

describe('enregistrerBrouillon', () => {
  it('écrit les deux documents en UNE transaction (ecrireDossier), tout ou rien', async () => {
    ecrireDossier.mockResolvedValue({ ok: true, rev: 'r2', patchs: 1, champsEnregistres: ['notes', 'colisNature'] });
    const dossier = dossierExpedition({}, { statut: 4 });
    const r = await enregistrerBrouillon(ctx, dossier, { notes: 'n', colisNature: 'meubles' });
    expect(ecrireDossier).toHaveBeenCalledTimes(1);
    expect(ecrireDossier).toHaveBeenCalledWith(ctx, dossier, { notes: 'n', colisNature: 'meubles' }, 'demande', {});
    expect(r).toEqual({ ok: true, champsEnregistres: ['notes', 'colisNature'] });
  });

  it('rend l’échec tel quel (brouillon conservé par l’appelant)', async () => {
    ecrireDossier.mockResolvedValueOnce({ ok: false, motif: 'conflit', message: 'Modifié par quelqu’un d’autre.' });
    const dossier = dossierExpedition({}, { statut: 4 });
    const r = await enregistrerBrouillon(ctx, dossier, { notes: 'n', colisNature: 'meubles' });
    expect(ecrireDossier).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ ok: false, motif: 'conflit' });
  });

  it('n’écrit rien quand rien ne diffère', async () => {
    const dossier = dossierDemande({ notes: 'a' });
    const r = await enregistrerBrouillon(ctx, dossier, { notes: 'a' });
    expect(ecrireDossier).not.toHaveBeenCalled();
    expect(r).toEqual({ ok: true, champsEnregistres: [] });
  });
});
