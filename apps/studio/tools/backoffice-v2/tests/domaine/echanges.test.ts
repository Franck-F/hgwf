/**
 * Réponses des clients : adresse de réponse, rattachement au dossier, tri,
 * signal « Réponse reçue » (phase, groupe d'« À faire », extinction à la lecture).
 */
import { describe, expect, it } from 'vitest';
import { classer } from '../../domaine/classement';
import {
  adresseReponse,
  echangesDe,
  explicationErreurEchange,
  formaterTaille,
  nbNonLus,
  reponseATraiter,
  trierEchanges,
} from '../../domaine/echanges';
import { phaseDe } from '../../domaine/phases';
import { calculerAFaire } from '../../domaine/priorites';
import type { Dossier, Echange } from '../../domaine/types';
import { MAINTENANT, demande, dossierDemande, dossierExpedition } from './fabrique';

export const echange = (extra: Partial<Echange> = {}): Echange => ({
  _id: 'echange-1',
  _rev: 'e1',
  _type: 'echange',
  reference: 'DEV-2611-001',
  sens: 'recu',
  de: 'Martin Dupont <martin@example.fr>',
  objet: 'Re : Votre devis',
  texte: 'Bonjour, voici les dimensions.',
  recuLe: '2026-11-05T14:00:00.000Z',
  lu: false,
  ...extra,
});

const avec = (d: Dossier, echanges: Echange[]): Dossier => ({ ...d, echanges });

describe('adresseReponse', () => {
  it('compose dossier-<RÉFÉRENCE>@domaine, avec le domaine par défaut ou celui qu’on passe', () => {
    expect(adresseReponse('HGWF-2026-1234')).toBe('dossier-HGWF-2026-1234@reponses.hgwf-cargo.fr');
    expect(adresseReponse(' DEV-1 ', 'rep.exemple.fr')).toBe('dossier-DEV-1@rep.exemple.fr');
  });
});

describe('echangesDe', () => {
  const tous = [
    echange({ _id: 'a', reference: 'dev-2611-001' }),
    echange({ _id: 'b', reference: 'AUTRE', demandeId: 'demande-1' }),
    echange({ _id: 'c', reference: 'AUTRE' }),
  ];
  it('rattache par référence (sans tenir compte de la casse) ou par demande liée', () => {
    const ids = echangesDe(demande(), undefined, tous).map((e) => e._id);
    expect(ids).toEqual(['a', 'b']);
  });
  it('une expédition seule se rattache par sa référence, ou par celle de sa demande', () => {
    const seule = echangesDe(undefined, dossierExpedition({ reference: 'AUTRE' }, null).expedition, tous);
    expect(seule.map((e) => e._id)).toEqual(['b', 'c']);
    const liee = echangesDe(undefined, dossierExpedition({ demandeRef: 'DEV-2611-001' }, null).expedition, tous);
    expect(liee.map((e) => e._id)).toEqual(['a']);
  });
  it('ne rattache rien sans demande ni référence', () => {
    expect(echangesDe(undefined, undefined, tous)).toEqual([]);
  });
});

describe('trierEchanges et nbNonLus', () => {
  it('du plus récent au plus ancien, sans modifier la liste d’origine', () => {
    const liste = [echange({ _id: 'vieux', recuLe: '2026-11-01T10:00:00Z' }), echange({ _id: 'neuf', recuLe: '2026-11-05T10:00:00Z' })];
    expect(trierEchanges(liste).map((e) => e._id)).toEqual(['neuf', 'vieux']);
    expect(liste[0]?._id).toBe('vieux');
  });
  it('compte les non lus (lu absent = non lu)', () => {
    const d = avec(dossierDemande(), [echange({ lu: true }), echange({ _id: 'x', lu: undefined }), echange({ _id: 'y' })]);
    expect(nbNonLus(d)).toBe(2);
    expect(nbNonLus(dossierDemande())).toBe(0);
  });
});

describe('signal « Réponse reçue »', () => {
  const repondu = { statut: 1, complementDemandeLe: '02/11/2026 à 10h00', reponseClientLe: '05/11/2026 à 15h00' } as const;

  it('reponseATraiter : sans échange la trace seule fait foi, sinon il faut un non lu', () => {
    expect(reponseATraiter(dossierDemande(repondu))).toBe(true);
    expect(reponseATraiter(avec(dossierDemande(repondu), [echange()]))).toBe(true);
    expect(reponseATraiter(avec(dossierDemande(repondu), [echange({ lu: true })]))).toBe(false);
  });

  it('un dossier à chiffrer avec réponse non lue : phase « Réponse reçue », dans « À faire »', () => {
    const d = avec(dossierDemande(repondu), [echange()]);
    expect(phaseDe(d)).toBe('reponseRecue');
    const groupes = calculerAFaire([d], [], MAINTENANT).groupes;
    expect(groupes[0]?.lignes[0]).toMatchObject({ phase: 'reponseRecue', raison: 'Réponse reçue, à chiffrer', nbNonLus: 1 });
  });

  it('une réponse reçue par e-mail sans reponseClientLe ne reste pas comptée comme « compléments demandés »', () => {
    const d = avec(
      dossierDemande({ statut: 1, complementDemandeLe: '02/11/2026 à 10h00' }),
      [echange({ recuLe: '2026-11-05T09:00:00.000Z', lu: false })],
    );
    expect(phaseDe(d)).toBe('reponseRecue');
    expect(calculerAFaire([d], [], MAINTENANT).groupes[0]?.lignes[0]?.raison).toBe('Réponse reçue, à chiffrer');

    const lu = avec(d, [echange({ recuLe: '2026-11-05T09:00:00.000Z', lu: true })]);
    expect(phaseDe(lu)).toBe('aChiffrer');
    expect(calculerAFaire([lu], [], MAINTENANT).groupes[0]?.lignes[0]?.raison).toBe('Montant à saisir');
  });

  it('le signal disparaît quand tout est lu, mais le dossier reste dans « À faire »', () => {
    const d = avec(dossierDemande(repondu), [echange({ lu: true })]);
    expect(phaseDe(d)).toBe('aChiffrer');
    const ligne = calculerAFaire([d], [], MAINTENANT).groupes[0]?.lignes[0];
    expect(ligne?.phase).toBe('aChiffrer');
    expect(ligne?.nbNonLus).toBe(0);
  });

  it('une réponse reste non lue si le dossier avance : le badge suit, le signal de phase non', () => {
    const d = avec(
      dossierDemande({ statut: 3, acceptationLe: '05/11/2026 à 16h00', reponseClientLe: '05/11/2026 à 15h00' }),
      [echange()],
    );
    expect(phaseDe(d)).toBe('accepte');
    const c = classer(d, MAINTENANT);
    expect(c && 'candidat' in c && c.candidat.ligne.nbNonLus).toBe(1);
  });

  it('devis envoyé et réponse non lue : « Réponse reçue au devis », à traiter sans attendre 7 jours', () => {
    const devis = dossierDemande({ statut: 2, devisEnvoyeLe: '05/11/2026 à 10h00' });
    // Sans réponse, le dossier attend.
    expect(classer(devis, MAINTENANT)).toHaveProperty('attente');
    const c = classer(avec(devis, [echange()]), MAINTENANT);
    expect(c && 'candidat' in c && c.candidat).toMatchObject({
      groupe: 'devis',
      rang: 1,
      ligne: { phase: 'devisEnvoye', raison: 'Réponse reçue au devis, à traiter', nbNonLus: 1 },
    });
    // Une fois lue, il retourne en attente.
    expect(classer(avec(devis, [echange({ lu: true })]), MAINTENANT)).toHaveProperty('attente');
  });

  it('devis envoyé hors outil : même signal', () => {
    const horsOutil = dossierDemande({ statut: 2, devisEnvoyeHorsOutilLe: '05/11/2026 à 10h00' });
    const c = classer(avec(horsOutil, [echange()]), MAINTENANT);
    expect(c && 'candidat' in c && c.candidat.ligne.raison).toBe('Réponse reçue au devis, à traiter');
  });
});

describe('textes', () => {
  it('explique l’erreur d’un échange avec le détail technique à la suite', () => {
    expect(explicationErreurEchange('pièce jointe introuvable')).toMatch(/pièce jointe n’a pas pu être récupérée/);
    expect(explicationErreurEchange('copie à contact@ refusée')).toMatch(/copie pour l’équipe/);
    expect(explicationErreurEchange('boum')).toBe('Un incident est survenu au traitement de ce message. (Détail : boum)');
  });
  it('formate une taille en octets, Ko ou Mo', () => {
    expect(formaterTaille(512)).toBe('512 o');
    expect(formaterTaille(340_000)).toBe('340 Ko');
    expect(formaterTaille(1_250_000)).toBe('1,3 Mo');
    expect(formaterTaille(undefined)).toBe('');
  });
});
