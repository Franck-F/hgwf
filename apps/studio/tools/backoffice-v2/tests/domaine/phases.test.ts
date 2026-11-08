import { describe, expect, it } from 'vitest';
import { phaseDe, positionFrise, tonFrise } from '../../domaine/phases';
import type { Phase } from '../../domaine/types';
import { dossierDemande, dossierExpedition } from './fabrique';

describe('phaseDe : tableau de vérité (3.2)', () => {
  const cas: [string, ReturnType<typeof dossierDemande>, Phase][] = [
    ['statut 0', dossierDemande({ statut: 0 }), 'nouvelle'],
    ['statut absent', dossierDemande({ statut: undefined }), 'nouvelle'],
    ['statut 1 sans devis', dossierDemande({ statut: 1 }), 'aChiffrer'],
    [
      'statut 1, compléments demandés sans réponse',
      dossierDemande({ statut: 1, complementDemandeLe: '02/11/2026 à 10h00' }),
      'aChiffrer',
    ],
    [
      'statut 1, réponse après compléments',
      dossierDemande({ statut: 1, complementDemandeLe: '02/11/2026 à 10h00', reponseClientLe: '05/11/2026 à 09h00' }),
      'reponseRecue',
    ],
    [
      'statut 1, réponse AVANT les compléments (relance du client sans suite)',
      dossierDemande({ statut: 1, complementDemandeLe: '05/11/2026 à 10h00', reponseClientLe: '02/11/2026 à 09h00' }),
      'aChiffrer',
    ],
    [
      'statut 1 + devisEnvoyeLe : e-mail parti, statut à corriger',
      dossierDemande({ statut: 1, devisEnvoyeLe: '05/11/2026 à 14h02' }),
      'devisPartiStatutACorriger',
    ],
    ['statut 2', dossierDemande({ statut: 2, devisEnvoyeLe: '29/10/2026 à 10h00' }), 'devisEnvoye'],
    [
      'statut 2 hors outil',
      dossierDemande({ statut: 2, devisEnvoyeHorsOutilLe: '05/11/2026' }),
      'devisHorsOutil',
    ],
    ['statut 3', dossierDemande({ statut: 3 }), 'accepte'],
    ['statut 5', dossierDemande({ statut: 5 }), 'sansSuite'],
  ];
  it.each(cas)('%s', (_nom, dossier, attendue) => {
    expect(phaseDe(dossier)).toBe(attendue);
  });

  const exp: [string, Parameters<typeof dossierExpedition>[0], Phase][] = [
    ['prise en charge 0', { statutPriseEnCharge: 0 }, 'aPreparer'],
    ['prise en charge 1', { statutPriseEnCharge: 1 }, 'pret'],
    ['prise en charge 2, étape 0', { statutPriseEnCharge: 2, etape: 0 }, 'enRoute'],
    ['prise en charge 2, étape 3', { statutPriseEnCharge: 2, etape: 3 }, 'enRoute'],
    ['prise en charge 3', { statutPriseEnCharge: 3 }, 'livre'],
    ['étape client 4 (même si prise en charge 2)', { statutPriseEnCharge: 2, etape: 4 }, 'livre'],
    ['prise en charge 4', { statutPriseEnCharge: 4 }, 'incident'],
    ['prise en charge 5', { statutPriseEnCharge: 5 }, 'annule'],
    ['incident prime sur étape 4', { statutPriseEnCharge: 4, etape: 4 }, 'incident'],
  ];
  it.each(exp)('expédition : %s', (_nom, extra, attendue) => {
    expect(phaseDe(dossierExpedition(extra))).toBe(attendue);
  });

  it('expédition seule (sans demande)', () => {
    expect(phaseDe(dossierExpedition({ statutPriseEnCharge: 1 }, null))).toBe('pret');
  });

  it('demande convertie dont l’expédition n’est pas chargée : le dossier n’est pas perdu', () => {
    expect(phaseDe(dossierDemande({ statut: 4 }))).toBe('aPreparer');
  });
});

describe('positionFrise et statutAvantIncident (3.3)', () => {
  it('suit la phase courante', () => {
    expect(positionFrise(dossierDemande({ statut: 0 }))).toBe('demande');
    expect(positionFrise(dossierDemande({ statut: 2 }))).toBe('devis');
    expect(positionFrise(dossierDemande({ statut: 3 }))).toBe('accord');
    expect(positionFrise(dossierExpedition({ statutPriseEnCharge: 1 }))).toBe('preparation');
    expect(positionFrise(dossierExpedition({ statutPriseEnCharge: 2 }))).toBe('transport');
    expect(positionFrise(dossierExpedition({ statutPriseEnCharge: 3 }))).toBe('livre');
  });

  it('incident : reprend la position de statutAvantIncident quand il est présent', () => {
    expect(positionFrise(dossierExpedition({ statutPriseEnCharge: 4, statutAvantIncident: 0 }))).toBe('preparation');
    expect(positionFrise(dossierExpedition({ statutPriseEnCharge: 4, statutAvantIncident: 1 }))).toBe('preparation');
    expect(positionFrise(dossierExpedition({ statutPriseEnCharge: 4, statutAvantIncident: 2 }))).toBe('transport');
    expect(positionFrise(dossierExpedition({ statutPriseEnCharge: 5, statutAvantIncident: 3 }))).toBe('livre');
  });

  it('incident ou annulé sans statutAvantIncident : aucune position inventée', () => {
    expect(positionFrise(dossierExpedition({ statutPriseEnCharge: 4 }))).toBeNull();
    expect(positionFrise(dossierExpedition({ statutPriseEnCharge: 5 }))).toBeNull();
  });

  it('sans suite : aucune position', () => {
    expect(positionFrise(dossierDemande({ statut: 5 }))).toBeNull();
  });

  it('tonFrise', () => {
    expect(tonFrise('incident')).toBe('urgent');
    expect(tonFrise('annule')).toBe('neutre');
    expect(tonFrise('sansSuite')).toBe('neutre');
    expect(tonFrise('enRoute')).toBe('normal');
  });
});
